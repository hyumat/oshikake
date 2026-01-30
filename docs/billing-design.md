# 課金設計ドキュメント

## 概要

オシカケの3プラン（Free/Plus/Pro）設計と課金方式の方針を定義します。

## プラン差別化の軸（原体験に沿う）

| 軸 | Free | Plus | Pro |
|---|---|---|---|
| 記録可能試合 | 7件まで | 無制限 | 無制限 |
| 価値の中心 | 体験お試し | 継続価値（制限解除） | 体験の深さ（振り返りの価値最大化） |
| 主要機能 | 基本記録＋基本集計 | 基本記録＋基本集計＋エクスポート | 複数シーズン＋エクスポート＋高度集計 |

参照: [プロダクト原則](./product-principles.md) | [実装ロードマップ](./roadmap.md)

## プラン定義

### Free

| 項目 | 制限 |
|------|------|
| 記録可能試合 | 7件まで（累計、リセットなし） |
| 既存記録の閲覧 | 無制限 |
| 既存記録の編集 | 可能 |
| 試合予定/結果閲覧 | 無制限 |
| 基本集計 | 可能 |
| データエクスポート | 不可 |

### Plus

| 項目 | 内容 |
|------|------|
| 記録可能試合 | 無制限（= "続けられる"価値） |
| 既存記録の閲覧/編集 | 無制限 |
| 試合予定/結果閲覧 | 無制限 |
| 基本集計 | 可能 |
| 今のシーズンをしっかり残せる | 可能 |
| データエクスポート | CSV対応 |
| 月額 | ¥490 |
| 年額 | ¥4,900（2ヶ月分お得） |

### Pro（原体験の"最高"に近づける）

| 項目 | 内容 |
|------|------|
| 記録可能試合 | 無制限 |
| 既存記録の閲覧/編集 | 無制限 |
| 複数シーズン管理（過去含む） | 可能 |
| 高度集計（カテゴリ内訳/月別推移） | 可能 |
| データエクスポート | CSV対応 |
| 画像添付、移動/宿の詳細記録 | 段階導入 |
| 優先サポート | 可能 |
| 月額 | ¥980 |
| 年額 | ¥9,800（2ヶ月分お得） |

## データベース設計

### usersテーブル拡張

```sql
plan ENUM('free', 'plus', 'pro') DEFAULT 'free'
planExpiresAt TIMESTAMP NULL
stripeCustomerId VARCHAR(255) NULL
stripeSubscriptionId VARCHAR(255) NULL
```

### 判定ロジック

```typescript
function getEffectivePlan(plan: Plan, planExpiresAt: Date | null): Plan {
  if (plan === 'free') return 'free';
  if (planExpiresAt && planExpiresAt < new Date()) return 'free';
  return plan;
}

function getPlanLimit(plan: Plan, planExpiresAt: Date | null): number {
  const effective = getEffectivePlan(plan, planExpiresAt);
  if (effective === 'pro') return Infinity;
  if (effective === 'plus') return Infinity;
  return 7;
}

function canCreateAttendance(plan: Plan, planExpiresAt: Date | null, currentCount: number): boolean {
  const limit = getPlanLimit(plan, planExpiresAt);
  return currentCount < limit;
}
```

## 課金方式の検討

### オプション1: Web課金（Stripe）

**メリット**
- 手数料が低い（約3%）
- 実装がシンプル
- Web/Nativeで統一可能

**デメリット**
- ストア規約との整合性確認が必要
- 決済画面がWebに遷移する

### オプション2: ストア課金（IAP）

**メリット**
- ストア審査でスムーズ
- ユーザーにとって馴染みがある

**デメリット**
- 手数料が高い（15-30%）
- iOS/Androidで別々の実装が必要
- レシート検証が必要

### 推奨方針

**Phase 1（MVP）**: Web課金（Stripe）で開始
- Webアプリが主軸のため、Stripeで統一
- ネイティブアプリからもWebの課金ページへ遷移

**Phase 2（ストア配信後）**: 必要に応じてIAP追加
- ストア規約で求められる場合のみ

## アップセル導線

### 制限到達時のモーダル

```
┌─────────────────────────────────────┐
│ 記録上限に達しました                   │
│                                     │
│ Freeプランでは、記録可能試合は7件まで   │
│ です。Plus/Proプランにアップグレード   │
│ すると、より多くの試合を記録できます。  │
│                                     │
│  [料金プランを見る]  [閉じる]          │
└─────────────────────────────────────┘
```

### 残り件数の表示

- ヘッダーまたは観戦記録一覧に表示
- 例: `5/7 件`

## API設計

### 件数チェック

```typescript
// GET /api/attendance/count?seasonYear=2026
{
  seasonYear: 2026,
  count: 7,
  limit: 7,
  isPro: false
}
```

### 作成時バリデーション

```typescript
// POST /api/attendance
// 403 Forbidden if limit reached
{
  error: 'LIMIT_REACHED',
  message: '無料プランの上限に達しました',
  limit: 7,
  upgradeUrl: '/upgrade'
}
```

## ページ構成

- `/upgrade` - Proプラン紹介ページ
- `/pricing` - 料金ページ（将来）
- `/account/subscription` - サブスク管理（将来）

## 更新履歴

- 2026-01-02: Plus/Pro両方を無制限に統一（Issue #69）
- 2026-01-02: 3プラン対応（Free/Plus/Pro）、シーズン制限撤廃
- 2026-01-01: 初版作成
