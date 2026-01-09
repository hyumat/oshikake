# Stripe課金運用ガイド

## 概要

オシカケの有料プラン（Plus/Pro）の課金をStripeで処理するための運用ドキュメント。

## プラン構成

| プラン | 月額 | 年額 | Price ID (本番) | Price ID (テスト) |
|--------|------|------|-----------------|-------------------|
| Free | ¥0 | - | - | - |
| Plus | ¥490 | ¥4,900 | 要設定 | 要設定 |
| Pro | ¥980 | ¥9,800 | 要設定 | 要設定 |

## 環境変数

```bash
STRIPE_SECRET_KEY=sk_live_xxx     # 本番キー
STRIPE_WEBHOOK_SECRET=whsec_xxx   # Webhookシグネチャ検証用
STRIPE_PLUS_MONTHLY_PRICE_ID=price_xxx
STRIPE_PLUS_YEARLY_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
```

## Webhookイベント

### 必須対応イベント

| イベント | 処理内容 |
|----------|----------|
| `checkout.session.completed` | 新規契約: users.plan更新、planExpiresAt設定 |
| `customer.subscription.updated` | プラン変更/更新: planExpiresAt延長 |
| `customer.subscription.deleted` | 解約: plan='free'に戻す |
| `invoice.payment_failed` | 支払い失敗: 通知メール送信（将来） |

### Webhook処理フロー

```typescript
// POST /api/stripe/webhook
1. Stripeシグネチャ検証
2. イベントタイプで分岐
3. subscription.metadataからuserIdを取得
4. users.plan / planExpiresAt を更新
5. eventLogsに記録
```

## Checkout Session作成

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{
    price: priceId,
    quantity: 1,
  }],
  success_url: `${baseUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
  subscription_data: {
    metadata: {
      userId: user.id.toString(),
      plan: 'plus' | 'pro',
    },
  },
  customer_email: user.email,
});
```

## Customer Portal

解約・プラン変更はStripe Customer Portalで対応:

```typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${baseUrl}/account`,
});
```

## データベース設計

### usersテーブル

```sql
plan ENUM('free', 'plus', 'pro') DEFAULT 'free'
planExpiresAt TIMESTAMP NULL
stripeCustomerId VARCHAR(255) NULL
stripeSubscriptionId VARCHAR(255) NULL
```

### 判定ロジック

```typescript
function getEffectivePlan(user: User): 'free' | 'plus' | 'pro' {
  if (user.plan === 'free') return 'free';
  if (user.planExpiresAt && user.planExpiresAt < new Date()) return 'free';
  return user.plan;
}
```

## テスト環境

1. Stripe CLIでローカルWebhook転送:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```

2. テストカード番号: `4242 4242 4242 4242`

3. テストクーポン: Stripeダッシュボードで作成

## 運用チェックリスト

### リリース前
- [ ] 本番Price IDを環境変数に設定
- [ ] Webhookエンドポイントを登録（Stripeダッシュボード）
- [ ] Webhook署名シークレットを環境変数に設定
- [ ] Customer Portal設定（解約/プラン変更の許可）
- [ ] 特定商取引法表示ページ確認

### 月次運用
- [ ] 支払い失敗アカウントの確認
- [ ] 解約率のモニタリング
- [ ] Stripeダッシュボードでの売上確認

## トラブルシューティング

### Webhook受信失敗
1. `STRIPE_WEBHOOK_SECRET`が正しいか確認
2. エンドポイントURLがStripeに正しく登録されているか確認
3. サーバーログでエラーを確認

### 課金後にプランが反映されない
1. Webhookが正常に処理されているか確認
2. `eventLogs`テーブルで処理履歴を確認
3. `subscription.metadata.userId`が正しいか確認

## 更新履歴

- 2026-01-02: 初版作成（3プラン対応）
