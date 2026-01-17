# Issue #130: 課金実装シーケンス分析

**作成日**: 2026-01-17
**ステータス**: ✅ バックエンド実装完了 / 🚧 フロントエンド未実装

---

## 📊 現状分析

### ✅ 実装済み（バックエンド・インフラ）

#### 1. データベーススキーマ
- **ファイル**: `drizzle/schema.ts`
- **実装内容**:
  - `users.plan`: ENUM('free', 'plus', 'pro') DEFAULT 'free'
  - `users.planExpiresAt`: TIMESTAMP NULL
  - `users.stripeCustomerId`: VARCHAR(255)
  - `users.stripeSubscriptionId`: VARCHAR(255)

#### 2. Stripe統合
- **ファイル**: `server/stripeClient.ts`
- **実装内容**:
  - Stripeクライアント初期化（Replit Connectors経由）
  - 価格設定取得（getPriceConfigs）
  - Webhook署名検証用シークレット取得
  - 開発/本番環境の自動切り替え

#### 3. Webhook処理
- **ファイル**: `server/webhookHandler.ts`
- **実装内容**:
  - ✅ `checkout.session.completed`: 新規契約処理
  - ✅ `customer.subscription.created/updated`: プラン更新
  - ✅ `customer.subscription.deleted`: 解約処理（Free復帰）
  - ✅ `invoice.payment_succeeded`: 支払い成功時のプラン延長
  - ✅ `invoice.payment_failed`: 支払い失敗ログ記録
  - ⚠️ **未実装**: Idempotency対応（Issue #116）

#### 4. 課金API
- **ファイル**: `server/routers/billing.ts`
- **エンドポイント**:
  - ✅ `createCheckoutSession`: Stripe Checkoutセッション作成
  - ✅ `createPortalSession`: Customer Portalセッション作成
  - ✅ `getPrices`: 料金プラン一覧取得
  - ✅ `getSubscriptionStatus`: サブスクリプション状態取得

#### 5. プラン判定ロジック
- **ファイル**: `shared/billing.ts`, `shared/planHelpers.ts`
- **実装内容**:
  - ✅ `getEffectivePlan()`: 期限切れ判定含むプラン取得
  - ✅ `canCreateAttendance()`: 観戦記録作成可否判定
  - ✅ `getPlanLimit()`: プラン別件数制限取得（Free: 10件、Plus/Pro: 無制限）
  - ✅ `canShowAds()`: 広告表示判定（Free: 表示、Plus/Pro: 非表示）
  - ✅ `calculatePlanStatus()`: プラン状態の総合計算

#### 6. 観戦記録の制限チェック
- **ファイル**: `server/routers/userMatches.ts:134-148`
- **実装内容**:
  - ✅ `status='attended'`の追加時に制限チェック
  - ✅ 上限到達時に`FORBIDDEN`エラー（`LIMIT_REACHED`）を返却
  - ✅ `getPlanStatus`エンドポイントで制限状況を取得可能

#### 7. 広告コンポーネント
- **ファイル**: `client/src/components/AdBanner.tsx`
- **実装内容**:
  - ✅ Freeプランのみ広告表示
  - ✅ Plus/Proでは`null`を返す（DOMに出さない）

---

## 🚧 未実装（フロントエンド・UI）

### 1. 料金プランページ（/pricing）
**優先度**: 🔴 最高
**目的**: ユーザーがプランを比較・選択できるページ

**必要な実装**:
- [ ] `client/src/pages/Pricing.tsx`作成
- [ ] プラン比較テーブル（Free/Plus/Pro）
- [ ] 各プランの機能一覧
- [ ] 「今すぐアップグレード」ボタン → `billing.createCheckoutSession`呼び出し
- [ ] Stripe Checkoutへのリダイレクト処理

### 2. アカウント設定ページ（/account）
**優先度**: 🔴 最高
**目的**: 現在のプラン・サブスクリプション状態の表示と管理

**必要な実装**:
- [ ] `client/src/pages/Account.tsx`作成
- [ ] 現在のプラン表示（`billing.getSubscriptionStatus`から取得）
- [ ] 有効期限表示（`planExpiresAt`）
- [ ] 「サブスクリプション管理」ボタン → Stripe Customer Portalへ遷移
- [ ] Checkout成功時のサンキューメッセージ（`?success=true`パラメータ処理）

### 3. 制限到達モーダル
**優先度**: 🔴 高
**目的**: Free プラン上限到達時にアップグレードを促す

**必要な実装**:
- [ ] `client/src/components/LimitReachedModal.tsx`作成
- [ ] `LIMIT_REACHED`エラー捕捉時に自動表示
- [ ] 現在の記録件数と上限の表示（例: 10/10件）
- [ ] 「料金プランを見る」ボタン → `/pricing`へ遷移

### 4. 残り件数表示
**優先度**: 🟡 中
**目的**: Freeユーザーに残り件数を常時表示

**必要な実装**:
- [ ] ヘッダーまたは観戦記録一覧に残り件数バッジを追加
- [ ] `userMatches.getPlanStatus`から残り件数取得
- [ ] 例: `5/10 件`（残り5件）

### 5. アップグレード導線
**優先度**: 🟡 中
**目的**: 各機能からのアップグレード誘導

**必要な実装**:
- [ ] データエクスポートボタンにPlus/Pro限定バッジ
- [ ] 高度な統計ページにPro限定バッジ
- [ ] 制限機能クリック時にアップグレードモーダル表示

---

## 📋 推奨実装順序

### Phase 1: 基本課金フロー（1-2日）
**目標**: ユーザーがプラン購入〜サブスク管理できる最小限のUI

1. **料金プランページ作成**（/pricing）
   - Free/Plus/Proの比較テーブル
   - 「今すぐアップグレード」→ Stripe Checkout遷移
   - 所要: 4-6時間

2. **アカウント設定ページ作成**（/account）
   - 現在のプラン・有効期限表示
   - Customer Portal遷移ボタン
   - Checkout成功時のメッセージ表示
   - 所要: 3-4時間

3. **ルーティング追加**
   - `client/src/App.tsx`に`/pricing`, `/account`ルート追加
   - ヘッダーに「料金プラン」「アカウント」リンク追加
   - 所要: 1時間

### Phase 2: 制限UI実装（半日）
**目標**: Freeプラン制限の可視化とアップグレード導線

4. **制限到達モーダル作成**
   - `LimitReachedModal.tsx`作成
   - `userMatches.add`のエラーハンドリング実装
   - 所要: 2-3時間

5. **残り件数表示追加**
   - ヘッダーまたは一覧ページにバッジ表示
   - 所要: 1-2時間

### Phase 3: Webhook信頼性向上（1日）
**目標**: Issue #116（Webhook idempotency）対応

6. **Idempotency実装**
   - `eventLogs`テーブルにユニーク制約追加
   - Webhook処理前に重複チェック
   - 詳細: Issue #116参照

### Phase 4: テストとドキュメント（半日）
**目標**: 本番デプロイ前の品質保証

7. **E2Eテスト**（オプション）
   - Stripe Test Modeでの購入フローテスト
   - Webhook処理の検証

8. **ドキュメント整備**
   - 本番Stripe設定手順
   - Price ID設定方法
   - Webhook URL登録手順

---

## 🎯 最優先タスク（今すぐ着手可能）

### ✅ 次のステップ

1. **料金プランページ（/pricing）作成** ← 最優先
2. **アカウント設定ページ（/account）作成**
3. **制限到達モーダル作成**

すべてのバックエンドAPIが揃っているため、フロントエンド実装のみで課金機能が完成します。

---

## 📌 技術的補足

### Stripe価格設定の確認方法

現在の価格設定は`getPriceConfigs()`で自動取得されます。Stripeダッシュボードで以下を確認：

- Plus（月額）: ¥490 → Product metadata: `plan=plus`, interval: `month`
- Plus（年額）: ¥4,900 → Product metadata: `plan=plus`, interval: `year`
- Pro（月額）: ¥980 → Product metadata: `plan=pro`, interval: `month`
- Pro（年額）: ¥9,800 → Product metadata: `plan=pro`, interval: `year`

### Webhook設定確認

Stripe Webhookエンドポイント: `https://<your-domain>/api/stripe/webhook`

監視すべきイベント:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## 🔗 関連Issue

- **Issue #106**: Plan differentiation (Free/Plus/Pro) - フロントエンド実装必要
- **Issue #116**: Stripe Webhook idempotency - Phase 3で対応
- **Issue #78**: Free plan limits - 制限UIで対応
- **Issue #130**: 本Issue - 実装シーケンスガイド

---

## ✅ まとめ

**結論**: バックエンド実装は完了済み。残りはフロントエンドUI（2-3日）のみ。

**推奨アクション**: Phase 1（料金プランページ + アカウントページ）から着手し、最速で課金機能をリリース可能にする。
