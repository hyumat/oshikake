# 解析・分析設計ドキュメント

## 概要
本ドキュメントは「おしかけログ」のデータ分析設計方針を記載します。

## データモデル設計

### テーブル構成
1. `users` - ユーザー基本情報
2. `matches` - 公式試合データ
3. `userMatches` - 観戦記録（ユーザー×試合）
4. `matchExpenses` - 費用詳細（カテゴリ別）
5. `auditLogs` - 監査ログ
6. `eventLogs` - イベント計測
7. `syncLogs` - 同期ログ

### 集計しやすい設計ルール

#### seasonYear
- `userMatches.seasonYear` で年度フィルタリング可能
- 試合日から自動計算（1月〜12月 = 該当年）
- WHERE句で簡単に絞り込み

#### 金額
- 整数（円）で保持（小数・文字列を避ける）
- `matchExpenses.amount` は常に正の整数
- 合計は SUM() で計算

#### カテゴリ
- 固定enum: `transport`, `ticket`, `food`, `other`
- 集計ブレを防止
- 将来の拡張も可能

#### 日付
- ISO形式（YYYY-MM-DD）で統一
- `userMatches.date`, `matches.date`
- タイムゾーン: JST前提

## イベント計測

### 計測対象イベント

| イベント名 | 説明 | データ |
|-----------|------|--------|
| `auth_login_success` | ログイン成功 | provider |
| `attendance_create` | 観戦記録作成 | matchId, seasonYear |
| `attendance_update` | 観戦記録更新 | matchId |
| `attendance_delete` | 観戦記録削除 | matchId |
| `expense_add` | 費用追加 | category, amount |
| `expense_update` | 費用更新 | category, amount |
| `expense_delete` | 費用削除 | category |
| `paywall_shown` | 制限モーダル表示 | matchCount |
| `upgrade_click` | Pro導線クリック | source |
| `season_switch_attempt` | シーズン切替試行 | fromYear, toYear |

### イベントログ構造
```sql
eventLogs (
  id INT PRIMARY KEY,
  userId INT,
  eventName VARCHAR(64),
  eventData TEXT, -- JSON
  seasonYear INT,
  createdAt TIMESTAMP
)
```

## 分析クエリ例

### 月別観戦数
```sql
SELECT 
  DATE_FORMAT(date, '%Y-%m') as month,
  COUNT(*) as count
FROM userMatches
WHERE userId = ? AND seasonYear = ?
GROUP BY month
ORDER BY month;
```

### カテゴリ別費用
```sql
SELECT 
  category,
  SUM(amount) as total
FROM matchExpenses
WHERE userId = ? AND userMatchId IN (
  SELECT id FROM userMatches WHERE seasonYear = ?
)
GROUP BY category;
```

### ユーザー継続率（将来用）
```sql
SELECT 
  COUNT(DISTINCT userId) as active_users
FROM eventLogs
WHERE eventName = 'attendance_create'
  AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## 課金分析（将来用）

### 無料プラン制限
- 今季10試合まで記録可能
- 制限到達時に `paywall_shown` イベント発火
- `upgrade_click` で導線効果を計測

### 計測指標
- 制限到達率: 10試合到達ユーザー / 全ユーザー
- 転換率: Pro購入 / 制限到達ユーザー
- 離脱率: 制限後30日未ログイン / 制限到達ユーザー
