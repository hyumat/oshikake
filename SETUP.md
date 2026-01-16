# セットアップガイド

このガイドでは、オシカケ (Oshikake) をローカル環境またはReplit環境でセットアップする手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [クイックスタート](#クイックスタート)
3. [環境変数の設定](#環境変数の設定)
4. [データベースのセットアップ](#データベースのセットアップ)
5. [Google Sheets連携の設定（オプション）](#google-sheets連携の設定オプション)
6. [Stripe決済の設定（オプション）](#stripe決済の設定オプション)
7. [開発サーバーの起動](#開発サーバーの起動)
8. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

開発を始める前に、以下のツールがインストールされていることを確認してください：

- **Node.js** 18.0以上
- **pnpm** 10.0以上（推奨）
- **MySQL** 8.0以上

### pnpmのインストール

```bash
npm install -g pnpm
```

---

## クイックスタート

最小限の手順でアプリケーションを起動する場合：

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd marinos_log_oshikake

# 2. 依存関係をインストール
pnpm install

# 3. 環境変数を設定
cp .env.example .env
# .envファイルを編集して、少なくともDATABASE_URLを設定

# 4. データベースマイグレーションを実行
pnpm db:push

# 5. 開発サーバーを起動
pnpm dev
```

ブラウザで `http://localhost:5000` を開いてアプリケーションにアクセスします。

---

## 環境変数の設定

### ステップ1: .envファイルの作成

```bash
cp .env.example .env
```

### ステップ2: 必須の環境変数を設定

`.env`ファイルを開き、以下の必須項目を設定してください：

#### 🔴 必須項目

```env
# データベース接続URL
DATABASE_URL=mysql://user:password@localhost:3306/marinos_db

# JWT署名用シークレット（ランダムな文字列を生成）
# 生成コマンド: openssl rand -base64 32
JWT_SECRET=your_generated_jwt_secret_here

# OAuth Server URL
OAUTH_SERVER_URL=https://oauth.repl.page

# Manus App ID (Replitの場合は自動設定)
VITE_APP_ID=your_app_id_here
```

#### JWT_SECRETの生成方法

```bash
# Linux/macOS
openssl rand -base64 32

# または、以下のNode.jsコマンド
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 🟡 オプション項目

Google Sheets連携やStripe決済を使用する場合は、後述のセクションを参照してください。

---

## データベースのセットアップ

### ステップ1: MySQLデータベースの作成

MySQLサーバーに接続し、データベースを作成します：

```bash
mysql -u root -p
```

```sql
CREATE DATABASE marinos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'marinos_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON marinos_db.* TO 'marinos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### ステップ2: DATABASE_URLの設定

`.env`ファイルの`DATABASE_URL`を更新します：

```env
DATABASE_URL=mysql://marinos_user:your_password@localhost:3306/marinos_db
```

### ステップ3: マイグレーションの実行

```bash
pnpm db:push
```

このコマンドは以下を実行します：
1. `drizzle-kit generate`: スキーマからマイグレーションファイルを生成
2. `drizzle-kit migrate`: 生成されたマイグレーションをデータベースに適用

#### 作成されるテーブル

- `users`: ユーザー情報
- `matches`: 公式試合データ
- `userMatches`: ユーザーの観戦記録
- `matchExpenses`: 観戦費用の詳細
- `savings_rules`: 貯金ルール（マリノス貯金機能）
- `savings_history`: 貯金履歴
- `syncLogs`: データ同期ログ
- `auditLogs`: 監査ログ
- `eventLogs`: イベントログ

---

## Google Sheets連携の設定（オプション）

Google Sheetsから試合データを取得する場合は、以下の手順でGoogle Apps Script（GAS）を設定します。

詳細は **[P0_INTEGRATION_TEST.md](./P0_INTEGRATION_TEST.md)** を参照してください。

### 概要

1. **Google Sheetsを準備**
   - 新しいスプレッドシートを作成
   - シート名を `matches` に設定
   - ヘッダー行を追加: `match_id | date | opponent | home_score | away_score | stadium | kickoff | competition | ticket_sales_start | notes`

2. **Google Apps Scriptをデプロイ**
   - Google Sheetsで「拡張機能」→「Apps Script」を開く
   - `gas/sync.gs` の内容を貼り付け
   - スクリプトプロパティに `GAS_API_TOKEN` を設定
   - ウェブアプリとしてデプロイ

3. **環境変数を設定**

```env
GAS_API_URL=https://script.google.com/macros/s/XXXXX/exec
GAS_API_TOKEN=your_secret_token_here
```

---

## Stripe決済の設定（オプション）

Stripe決済機能を使用する場合は、以下を設定します。

### Replit環境の場合

Replitの場合、Stripe Connectorが自動的に環境変数を設定するため、手動設定は不要です。

### ローカル環境の場合

1. [Stripe Dashboard](https://dashboard.stripe.com/)にアクセス
2. API Keysを取得
3. `.env`ファイルに設定

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Webhookの設定

1. Stripe Dashboardで「開発者」→「Webhooks」を開く
2. エンドポイントを追加: `https://yourdomain.com/api/webhook/stripe`
3. 以下のイベントを選択:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Webhook署名シークレットをコピーして`STRIPE_WEBHOOK_SECRET`に設定

---

## 開発サーバーの起動

すべての設定が完了したら、開発サーバーを起動します：

```bash
pnpm dev
```

アプリケーションは以下のURLで利用できます：
- **フロントエンド**: http://localhost:5000
- **バックエンドAPI**: http://localhost:5000/api

### その他のコマンド

```bash
# ビルド（本番環境用）
pnpm build

# 本番サーバーの起動
pnpm start

# テストの実行
pnpm test

# 型チェック
pnpm check

# コードフォーマット
pnpm format
```

---

## トラブルシューティング

### データベース接続エラー

**エラー**: `Error: DATABASE_URL is required to run drizzle commands`

**解決方法**:
1. `.env`ファイルが存在し、`DATABASE_URL`が設定されているか確認
2. MySQLサーバーが起動しているか確認: `sudo systemctl status mysql`
3. データベースとユーザーが作成されているか確認

### pnpm install でエラーが発生

**エラー**: `ERR_PNPM_NO_MATCHING_VERSION`

**解決方法**:
```bash
# pnpmのキャッシュをクリア
pnpm store prune

# 再度インストール
pnpm install
```

### マイグレーションエラー

**エラー**: `Migration failed`

**解決方法**:
```bash
# マイグレーションファイルを削除して再生成
rm -rf drizzle/meta
rm drizzle/*.sql
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### ポートが既に使用されている

**エラー**: `Error: listen EADDRINUSE: address already in use :::5000`

**解決方法**:
```bash
# 使用中のプロセスを確認
lsof -i :5000

# プロセスを終了
kill -9 <PID>

# または、別のポートを使用
PORT=3000 pnpm dev
```

### Google Sheets連携が動作しない

**症状**: `GAS_API_URL or GAS_API_TOKEN is not configured`

**解決方法**:
1. `.env`ファイルに`GAS_API_URL`と`GAS_API_TOKEN`が設定されているか確認
2. GASが正しくデプロイされているか確認
3. GASのアクセス権限が「全員」に設定されているか確認

---

## 次のステップ

セットアップが完了したら、以下のドキュメントを参照してください：

- **[MVP.md](./MVP.md)**: MVPの定義とDoD
- **[P0_INTEGRATION_TEST.md](./P0_INTEGRATION_TEST.md)**: Google Sheets連携の詳細
- **[docs/product-principles.md](./docs/product-principles.md)**: プロダクト原則

---

## サポート

問題が解決しない場合は、以下を試してください：

1. [GitHub Issues](https://github.com/yourusername/marinos_log_oshikake/issues)で既存の問題を検索
2. 新しいIssueを作成して質問する
3. ドキュメントフォルダ内の関連ファイルを確認

---

**Happy Coding! ⚽️**
