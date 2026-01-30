# Stripe Webhook 状態遷移ドキュメント

**Issue #116: Webhook冪等性とentitlements正規化**

このドキュメントは、Stripe Webhookイベント処理における状態遷移とデータフローを説明します。

## 概要

### アーキテクチャの原則

1. **entitlementsテーブルが唯一の真実 (Single Source of Truth)**
   - ユーザーのプラン・サブスクリプション状態は`entitlements`テーブルで一元管理
   - `users`テーブルの`plan`/`planExpiresAt`は後方互換性のため同期される

2. **Webhook冪等性**
   - 全てのWebhookイベントは`webhook_events`テーブルに記録
   - `eventId`（Stripe提供）で重複処理を防止
   - 処理成功/失敗の状態を記録

3. **状態追跡**
   - サブスクリプションの詳細な状態管理（active, trialing, past_due, canceled, inactive）
   - 全ての状態変更を`event_logs`テーブルに記録

## サブスクリプション状態マシン

### Entitlement Status (entitlements.status)

```
┌─────────────────────────────────────────────────────────┐
│                   Subscription Lifecycle                 │
└─────────────────────────────────────────────────────────┘

    [初期状態: free]
           │
           │ checkout.session.completed
           │ (trial_periodあり)
           ↓
    [trialing] ────────────────┐
           │                   │
           │ trial期間終了      │ subscription.deleted
           │ + 初回決済成功      │
           ↓                   │
    [active] ──────────────────┤
           │                   │
           │ payment_failed    │
           ↓                   │
    [past_due] ────────────────┤
           │                   │
           │ 決済リトライ失敗    │
           │ または            │
           │ subscription.     │
           │ deleted          │
           ↓                   ↓
    [canceled] ←───────── [inactive]
           │                   │
           └───────────────────┘
                   │
                   ↓
              [free]
```

### Stripe Status → Entitlement Status マッピング

| Stripe Status | Entitlement Status | 説明 |
|--------------|-------------------|------|
| `active` | `active` | サブスクリプション有効、決済成功 |
| `trialing` | `trialing` | トライアル期間中 |
| `past_due` | `past_due` | 決済失敗、リトライ中 |
| `canceled` | `canceled` | サブスクリプション解約済み |
| `unpaid` | `canceled` | 未払いでキャンセル |
| `incomplete` | `inactive` | 初回決済未完了 |
| `incomplete_expired` | `inactive` | 初回決済期限切れ |
| `paused` | `inactive` | 一時停止中 |

## Webhookイベント処理フロー

### 1. checkout.session.completed

**発生タイミング**: Checkout画面で決済完了時

**処理内容**:
1. Stripe Customer IDからユーザーを特定
2. Subscriptionを取得（product metadataからプラン判定）
3. Entitlementを作成/更新:
   - `plan`: plus/pro（product.metadata.planから）
   - `planExpiresAt`: current_period_end
   - `stripeSubscriptionId`: subscription.id
   - `status`: subscription.statusをマッピング
4. usersテーブルに同期
5. `subscription_created`イベントをログ

**状態遷移**:
```
free → (trialing または active)
```

### 2. customer.subscription.created / customer.subscription.updated

**発生タイミング**:
- サブスクリプション作成時
- プラン変更時
- ステータス変更時（トライアル終了、決済成功など）

**処理内容**:
1. Stripe Customer IDからユーザーを特定
2. Subscription情報を解析
3. ステータスに応じてEntitlementを更新:
   - `active`または`trialing`: プラン情報を保持
   - その他: planを`free`にダウングレード
4. usersテーブルに同期
5. `subscription_updated`イベントをログ

**状態遷移**:
```
trialing → active    (トライアル終了、初回決済成功)
active → past_due    (決済失敗)
past_due → active    (決済リトライ成功)
active → canceled    (ユーザーがキャンセル)
```

### 3. customer.subscription.deleted

**発生タイミング**:
- ユーザーがサブスクリプションをキャンセル
- 決済リトライ失敗で自動キャンセル

**処理内容**:
1. Stripe Customer IDからユーザーを特定
2. Entitlementをfreeプランに戻す:
   - `plan`: free
   - `planExpiresAt`: null
   - `stripeSubscriptionId`: null
   - `status`: canceled
3. usersテーブルに同期
4. `subscription_deleted`イベントをログ

**状態遷移**:
```
any → canceled → (plan: free)
```

### 4. invoice.payment_succeeded

**発生タイミング**: 定期課金の決済成功時

**処理内容**:
1. Stripe Customer IDからユーザーを特定
2. Subscriptionを取得
3. Entitlementを更新:
   - `plan`: 現在のプラン
   - `planExpiresAt`: 次回更新日（current_period_end）
   - `status`: subscription.statusをマッピング
4. usersテーブルに同期
5. `payment_succeeded`イベントをログ

**状態遷移**:
```
past_due → active  (リトライ成功)
active → active    (次回期間の延長)
```

### 5. invoice.payment_failed

**発生タイミング**: 定期課金の決済失敗時

**処理内容**:
1. Stripe Customer IDからユーザーを特定
2. Entitlementのstatusを`past_due`に更新
3. usersテーブルに同期
4. `payment_failed`イベントをログ（attempt_countを記録）

**状態遷移**:
```
active → past_due
```

**備考**: Stripeの設定により、数回リトライ後にsubscription.deletedが発火

## データベーステーブル

### webhook_events

Webhook処理の冪等性を保証するための記録テーブル。

| カラム | 型 | 説明 |
|-------|---|------|
| id | int | Primary Key |
| eventId | varchar(255) | Stripe Event ID（unique） |
| eventType | varchar(100) | イベントタイプ（例: checkout.session.completed） |
| processedAt | timestamp | 処理日時 |
| payload | text | イベント全体のJSON（デバッグ用） |
| status | enum | success/failed |
| errorMessage | text | エラーメッセージ（失敗時） |

### entitlements

ユーザーのプラン・サブスクリプション状態の唯一の真実。

| カラム | 型 | 説明 |
|-------|---|------|
| id | int | Primary Key |
| userId | varchar(64) | users.openIdを参照 |
| plan | enum | free/plus/pro |
| planExpiresAt | timestamp | プラン有効期限 |
| stripeSubscriptionId | varchar(255) | Stripe Subscription ID |
| status | enum | active/inactive/canceled/past_due/trialing |
| createdAt | timestamp | 作成日時 |
| updatedAt | timestamp | 更新日時 |

### users（後方互換性）

`plan`, `planExpiresAt`, `stripeSubscriptionId`はentitlementsから同期される。

## エラーハンドリング

### Webhook処理失敗時

1. `webhook_events.status`を`failed`に設定
2. `webhook_events.errorMessage`にエラー内容を記録
3. エラーをthrowしてStripeに500を返す（Stripeが自動リトライ）

### リトライ戦略

- Stripeは失敗したWebhookを自動的にリトライ（最大3日間）
- `webhook_events`の冪等性チェックにより、リトライ時も安全に処理

## ログ仕様

全てのログに`[Webhook][${eventId}]`プレフィックスを付与し、トレーサビリティを確保。

**例**:
```
[Webhook] Received event: checkout.session.completed (ID: evt_1234567890)
[Webhook][evt_1234567890] Checkout completed for user usr_abc123: plan=plus, status=active
[Webhook][evt_1234567890] User usr_abc123 subscribed to plus (status: active)
[Webhook][evt_1234567890] Event evt_1234567890 processed successfully
```

## テストシナリオ

### 1. 正常フロー
- 新規ユーザーがPlusプランを購入 → active
- トライアル付きProプラン購入 → trialing → active
- 定期課金成功 → planExpiresAt更新

### 2. 異常フロー
- 決済失敗 → past_due → リトライ成功 → active
- 決済失敗 → past_due → リトライ失敗 → canceled
- ユーザーによるキャンセル → canceled

### 3. 冪等性
- 同じeventIdのWebhookを2回受信 → 2回目はスキップ
- 処理失敗後のリトライ → 成功するまで再処理

## 参考リンク

- [Stripe Webhook Events](https://stripe.com/docs/api/events/types)
- [Stripe Subscription Lifecycle](https://stripe.com/docs/billing/subscriptions/overview)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
