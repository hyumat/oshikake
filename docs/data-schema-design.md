# データスキーマ設計

## 概要

Oshikaのデータ粒度と型を固定し、将来の集計・分析が壊れないようにする設計ドキュメントです。

## 基本原則

1. **金額は整数（JPY）**: 小数点は使用しない
2. **費用カテゴリはenumで固定**: 追加はOK、削除/改名は慎重に
3. **seasonYearを必ず持たせる**: logs/matchesに必須
4. **日付はISO形式**: timezoneはJST基準

## 費用カテゴリ定義

### 現行カテゴリ（MVP）

| カテゴリ | 英語名 | 説明 |
|----------|--------|------|
| 交通費 | transport | 電車、バス、車、駐車場等 |
| チケット代 | ticket | 入場券、シーズンチケット等 |
| 飲食代 | food | スタジアム飲食、外食等 |
| その他 | other | グッズ、宿泊等 |

### 将来拡張予定

| カテゴリ | 英語名 | 説明 |
|----------|--------|------|
| 宿泊費 | accommodation | ホテル、民泊等 |
| グッズ | merchandise | ユニフォーム、タオル等 |

### カテゴリ変更ルール

- **追加**: 新カテゴリは自由に追加可能
- **改名**: 既存データの移行が必要（マイグレーション必須）
- **削除**: 原則禁止（非表示化で対応）

## seasonYear定義

### シーズン判定ロジック

Jリーグは2月開幕〜12月閉幕のため、暦年でシーズンを管理。

```typescript
function getCurrentSeasonYear(): number {
  return new Date().getFullYear();
}

function getSeasonYearFromDate(date: string): number {
  // ISO形式: "2026-03-15"
  return parseInt(date.substring(0, 4), 10);
}
```

### seasonYearの適用箇所

| テーブル | フィールド | 用途 |
|----------|------------|------|
| matches | seasonYear | 試合のシーズン |
| userMatches | seasonYear | 観戦記録のシーズン |
| eventLogs | seasonYear | イベントのシーズン |

## 日付・時刻形式

### 日付（date）

- 形式: `YYYY-MM-DD`
- 例: `2026-03-15`
- タイムゾーン: JST基準（UTC+9）

### 時刻（kickoff）

- 形式: `HH:MM`
- 例: `19:00`
- タイムゾーン: JST基準

### タイムスタンプ（createdAt, updatedAt）

- 形式: ISO 8601
- 例: `2026-03-15T10:00:00Z`
- 保存時: UTC
- 表示時: JSTに変換

## 金額フィールド

### 型

- **データベース**: INT（整数）
- **API**: number（JavaScript Number）
- **表示**: `¥1,234` 形式

### バリデーション

```typescript
const expenseSchema = z.object({
  transport: z.number().int().min(0).default(0),
  ticket: z.number().int().min(0).default(0),
  food: z.number().int().min(0).default(0),
  other: z.number().int().min(0).default(0),
});
```

## 試合ステータス

### ステータス定義

| ステータス | 英語名 | 説明 | 集計に含む |
|------------|--------|------|------------|
| 予定 | scheduled | 開催予定 | - |
| 終了 | finished | 試合終了 | はい |
| 延期 | postponed | 開催延期 | いいえ |
| 中止 | cancelled | 開催中止 | いいえ |

### 集計ルール

- **観戦数**: status = 'finished' のみカウント
- **費用**: status = 'postponed' / 'cancelled' でも記録は残す

## マイグレーション方針

### 既存データがある場合

1. 新フィールド追加時はNULL許可またはデフォルト値設定
2. バッチ処理で既存データを更新
3. NOT NULL制約は更新完了後に追加

### 例: seasonYear追加

```sql
-- Step 1: カラム追加（NULL許可）
ALTER TABLE userMatches ADD COLUMN seasonYear INT NULL;

-- Step 2: 既存データ更新
UPDATE userMatches SET seasonYear = YEAR(date) WHERE seasonYear IS NULL;

-- Step 3: NOT NULL制約追加
ALTER TABLE userMatches MODIFY COLUMN seasonYear INT NOT NULL;
```

## 更新履歴

- 2026-01-01: 初版作成
