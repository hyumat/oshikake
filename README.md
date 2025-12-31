# おしかけログ (Oshikake Log)

横浜F・マリノスサポーター向け観戦記録サービス。**公式試合データ**を取り込み、ユーザーが「観戦した試合の記録」と「費用（交通費・チケット代など）」を蓄積できるアプリです。  
観戦した試合の**結果（勝敗など）**と**費用（合計・平均）**を集計・可視化します。

> このリポジトリは `web-db-user` スキャフォールド（Vite + Express + tRPC + Drizzle）をベースにしています。

---

## Features

### できること（現状）
- 公式試合データの同期（複数ソース対応: Jリーグ公式、マリノス公式）
- 公式試合一覧の表示（`/matches`）
- 試合詳細ページ（観戦ログの追加・編集・削除）
- 観戦費用記録（交通費/チケット代/飲食代/その他）- LocalStorage永続化
- フィルタリング（期間/対戦相手/Home-Away）
- **観戦試合の戦績集計**（勝・分・敗・未確定）
- **費用集計**（合計、1試合あたり平均、年別フィルタ）
- **Statsページ**（`/stats`）- 観戦数/勝分敗/費用の集計画面
- **syncLog永続化** - 同期履歴をDBに記録（URL/status/exception/duration/counts）
- **matchUrl正規化・重複防止** - `generateMatchKey()`による安定したユニークキー生成

### これからやること（Post-MVP）
- 費用カテゴリ内訳の可視化
- グラフ/チャート（勝率推移、月別支出など）
- 共有/エクスポート機能

---

## Tech Stack

- **Frontend**: React 19 + Vite 7 + TailwindCSS 4（`client/`）
- **UI**: shadcn/ui コンポーネント
- **Routing**: wouter
- **Backend**: Express + tRPC（`server/`）
- **DB**: MySQL + Drizzle ORM（`drizzle/`）
- **Testing**: Vitest（104テスト）

---

## Design

- **カラースキーム**: マリノストリコロール（青 #0022AA、白、赤 #C8102E）を控えめに使用
- **モバイルファースト設計**
- **PWA対応予定**

---

## Project Structure

```
client/          # UI (Vite + React)
  src/
    pages/       # ページコンポーネント (Home, Matches, MatchDetail, Stats, Landing)
    components/  # UIコンポーネント (shadcn/ui)
    lib/         # ユーティリティ、tRPCクライアント
server/          # Express + tRPC + scraping
  _core/         # サーバーインフラ (auth, Vite middleware)
  routers/       # tRPC routers (matches, stats, userMatches)
  unified-scraper.ts  # 統合スクレイパー
  scraper.ts     # Jリーグ公式スクレイパー
  db.ts          # DB操作
drizzle/         # Drizzle schema & migrations
shared/          # 共有型定義
todo.md          # プロジェクト計画
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm
- MySQL（ローカル or マネージド）

### 1) Install
```bash
pnpm install
```

### 2) Configure environment variables
ルートに `.env` を作成します。

**必須:**
- `DATABASE_URL`：MySQL接続文字列（Drizzle用）

**任意（認証を使う場合）:**
- `SESSION_SECRET`：セッション用シークレット
- `OAUTH_SERVER_URL`：OAuth認証サーバー（未設定の場合はゲストモードで動作）

**任意（アナリティクス）:**
- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`

例:
```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB_NAME"
SESSION_SECRET="your-secret-key"
NODE_ENV="development"
```

### 3) Apply DB migrations
```bash
pnpm db:push
```

### 4) Run dev server
```bash
pnpm dev
```

起動後、`http://localhost:5000/` を開いてください。

> **Replit環境**: ポート5000で自動的にバインドされます。OAuth未設定でもゲストモードで動作します。

---

## Useful Commands

```bash
pnpm dev      # dev server (Express + Vite) - port 5000
pnpm build    # build (client + server bundle)
pnpm start    # run production build
pnpm test     # run tests (vitest) - 104 tests
pnpm check    # typecheck
pnpm format   # prettier
pnpm db:push  # drizzle generate + migrate
```

---

## Data Sync / Scraping

### エンドポイント
- 同期: `matches.fetchOfficial`
- DB参照: `matches.listOfficial`

### スクレイパー実装
- `server/unified-scraper.ts` - 統合スクレイパー（複数ソース対応）
- `server/scraper.ts` - Jリーグ公式スクレイパー
- `server/marinos-scraper.ts` - マリノス公式スクレイパー

### 基本方針
1. **JSON-LD優先** - 公式サイトの構造変化に強い
2. **HTMLセレクタのフォールバック** - JSON-LDが取れない場合
3. **matchUrl正規化** - `normalizeMatchUrl()`でサブパス・クエリパラメータを除去
4. **安定したキー生成** - `generateMatchKey()`でmatchUrlベースまたはdate+opponent+kickoffで一意キー
5. **syncLog追跡** - 同期履歴をDBに永続化（success/partial/failed状態、処理時間、件数）

---

## Testing

```bash
pnpm test
```

**テスト構成（104件）:**
- `scraper.test.ts` - スクレイパーユーティリティ（19件）
- `marinos-scraper.test.ts` - マリノス公式スクレイパー（19件）
- `jleague-scraper.test.ts` - Jリーグ公式スクレイパー（11件）
- `unified-scraper.test.ts` - 統合スクレイパー（9件）
- `stats.test.ts` - Stats API（23件）
- `userMatches.test.ts` - ユーザーマッチAPI（22件）
- `auth.logout.test.ts` - 認証（1件）

---

## Troubleshooting

### Port already in use
開発中に `EADDRINUSE` が出る場合は、既存プロセスを停止してから再起動してください。

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep node
kill <PID>
```

### DB connection
`DATABASE_URL` が未設定だと `db:push` が失敗します。  
MySQL の接続先・権限・DB名を確認してください。

### OAuth未設定
`OAUTH_SERVER_URL` が未設定の場合、アプリはゲストモードで動作します。  
認証機能は無効になりますが、基本機能は問題なく利用できます。

---

## Completed GitHub Issues

- Issue #1: Stats集計バックエンド実装
- Issue #2: StatsページUI実装
- Issue #6: Stats年別フィルタ・Empty表示
- Issue #9: 試合一覧フィルタリング（期間/対戦相手/Home-Away）
- Issue #10: syncLog永続化（URL/status/exception/duration/counts）
- Issue #11: matchUrl正規化・重複防止（generateMatchKey()関数）

---

## License
MIT（`package.json` の `license` を参照）
