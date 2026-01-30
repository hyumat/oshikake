# ✅ セットアップチェックリスト

このチェックリストは、オシカケ (Oshikake) のセットアップが正しく完了しているかを確認するためのものです。

---

## 🎯 Phase 1: 環境セットアップ（必須）

### 前提条件の確認

- [ ] Node.js 18.0以上がインストールされている
  ```bash
  node --version
  ```
- [ ] pnpm 10.0以上がインストールされている
  ```bash
  pnpm --version
  ```
- [ ] MySQL 8.0以上がインストールされている
  ```bash
  mysql --version
  ```

### リポジトリのセットアップ

- [ ] リポジトリをクローンした
  ```bash
  git clone <repository-url>
  cd marinos_log_oshikake
  ```
- [ ] 依存関係をインストールした
  ```bash
  pnpm install
  ```

### 環境変数の設定

- [ ] `.env`ファイルを作成した
  ```bash
  cp .env.example .env
  ```
- [ ] 以下の必須環境変数を設定した：
  - [ ] `DATABASE_URL` - MySQLデータベース接続URL
  - [ ] `JWT_SECRET` - JWT署名用シークレット（32文字以上推奨）
  - [ ] `OAUTH_SERVER_URL` - OAuth認証サーバーURL
  - [ ] `VITE_APP_ID` - Manus App ID

- [ ] JWT_SECRETを生成した
  ```bash
  openssl rand -base64 32
  ```

- [ ] 環境変数検証スクリプトを実行し、エラーがないことを確認した
  ```bash
  pnpm tsx scripts/validate-env.ts
  ```
  **期待される結果**: `✓ 必須の環境変数は全て設定されています`

### データベースのセットアップ

- [ ] MySQLデータベースを作成した
  ```sql
  CREATE DATABASE marinos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
- [ ] MySQLユーザーを作成し、権限を付与した
  ```sql
  CREATE USER 'marinos_user'@'localhost' IDENTIFIED BY 'your_password';
  GRANT ALL PRIVILEGES ON marinos_db.* TO 'marinos_user'@'localhost';
  FLUSH PRIVILEGES;
  ```
- [ ] `.env`の`DATABASE_URL`を正しく設定した
  ```env
  DATABASE_URL=mysql://marinos_user:your_password@localhost:3306/marinos_db
  ```
- [ ] マイグレーションを実行した
  ```bash
  pnpm db:push
  ```
  **期待される結果**: エラーなく完了し、以下のテーブルが作成される
  - `users`
  - `matches`
  - `userMatches`
  - `matchExpenses`
  - `savings_rules`
  - `savings_history`
  - `syncLogs`
  - `auditLogs`
  - `eventLogs`

### 動作確認

- [ ] 開発サーバーを起動できた
  ```bash
  pnpm dev
  ```
- [ ] ブラウザで `http://localhost:5000` にアクセスできた
- [ ] アプリケーションのホーム画面が表示された
- [ ] エラーログが表示されていない

---

## 🔄 Phase 2: Google Sheets連携（オプション）

Google Sheetsから試合データを取得する場合のみ必要です。

### Google Sheetsの準備

- [ ] 新しいGoogle Spreadsheetsを作成した
- [ ] シート名を `matches` に設定した
- [ ] ヘッダー行を追加した
  ```
  match_id | date | opponent | home_score | away_score | stadium | kickoff | competition | ticket_sales_start | notes
  ```
- [ ] テストデータを数行追加した

### Google Apps Scriptのデプロイ

- [ ] Google Sheetsで「拡張機能」→「Apps Script」を開いた
- [ ] `gas/sync.gs` の内容を貼り付けた
- [ ] スクリプトプロパティに`GAS_API_TOKEN`を設定した
  1. 「プロジェクトの設定」→「スクリプト プロパティ」
  2. プロパティを追加: `GAS_API_TOKEN` = `your_secret_token`
- [ ] ウェブアプリとしてデプロイした
  1. 「デプロイ」→「新しいデプロイ」
  2. 種類: ウェブアプリ
  3. アクセス: 全員
  4. デプロイURLをコピー

### 環境変数の設定

- [ ] `.env`に以下を設定した
  ```env
  GAS_API_URL=https://script.google.com/macros/s/XXXXX/exec
  GAS_API_TOKEN=your_secret_token
  ```
- [ ] 環境変数検証スクリプトを再実行し、警告が消えたことを確認した
  ```bash
  pnpm tsx scripts/validate-env.ts
  ```

### 動作確認

- [ ] Google Sheets同期を実行した（管理画面から）
- [ ] 試合データが正しく同期された
- [ ] 同期ログが記録された

---

## 💳 Phase 3: Stripe決済連携（オプション）

Plus/Proプランの決済機能を使用する場合のみ必要です。

### Stripeアカウントの準備

- [ ] [Stripe Dashboard](https://dashboard.stripe.com/)にログインした
- [ ] テスト環境に切り替えた（本番環境は後で設定）

### API Keysの取得

- [ ] 「開発者」→「APIキー」からキーを取得した
  - [ ] Publishable key (`pk_test_...`)
  - [ ] Secret key (`sk_test_...`)

### 環境変数の設定

- [ ] `.env`に以下を設定した
  ```env
  STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
  STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
  ```

### Webhookの設定

- [ ] Stripe Dashboardで「開発者」→「Webhooks」を開いた
- [ ] エンドポイントを追加した
  - URL: `https://yourdomain.com/api/webhook/stripe`（または`http://localhost:5000/api/webhook/stripe`）
  - イベント:
    - [ ] `customer.subscription.created`
    - [ ] `customer.subscription.updated`
    - [ ] `customer.subscription.deleted`
    - [ ] `invoice.payment_succeeded`
    - [ ] `invoice.payment_failed`
- [ ] Webhook署名シークレットをコピーし、`.env`に設定した
  ```env
  STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
  ```

### 動作確認

- [ ] テスト決済を実行した
- [ ] Webhookが正しく受信された
- [ ] サブスクリプションステータスが正しく更新された

---

## 🧪 Phase 4: テスト実行（推奨）

### テストの実行

- [ ] 全てのテストを実行した
  ```bash
  pnpm test
  ```
  **期待される結果**: 全てのテストがパス（一部のモジュール解決エラーは既知の問題）

- [ ] 型チェックを実行した
  ```bash
  pnpm check
  ```
  **期待される結果**: エラーなし

### ビルドの確認

- [ ] 本番ビルドを実行した
  ```bash
  pnpm build
  ```
  **期待される結果**: エラーなくビルド完了

- [ ] 本番サーバーを起動した
  ```bash
  pnpm start
  ```
- [ ] ブラウザで動作確認した

---

## 📱 Phase 5: 機能テスト

### 基本機能の確認

- [ ] ユーザー登録/ログインができる
- [ ] 試合一覧が表示される
- [ ] 試合詳細が表示される
- [ ] 観戦記録を追加できる
- [ ] 観戦記録を編集できる
- [ ] 観戦記録を削除できる
- [ ] 集計ページで観戦数/勝敗/費用が表示される

### モバイル対応の確認

- [ ] モバイル幅でレイアウトが崩れない
  - [ ] `/matches` (試合一覧)
  - [ ] `/matches/:id` (試合詳細)
  - [ ] `/stats` (集計)

### エラーハンドリングの確認

- [ ] データベース接続エラー時に適切なエラーメッセージが表示される
- [ ] API失敗時に再試行ボタンが表示される
- [ ] 不正な入力を送信するとバリデーションエラーが表示される

---

## 🎯 完了条件

以下の全てをクリアしていればセットアップ完了です：

### 必須 (Phase 1)
- [ ] 環境変数が全て設定されている
- [ ] データベースマイグレーションが完了している
- [ ] 開発サーバーが起動する
- [ ] アプリケーションが動作する
- [ ] 基本機能（試合一覧/観戦記録/集計）が動作する

### 推奨 (Phase 4)
- [ ] テストが全てパスする
- [ ] 型チェックでエラーがない
- [ ] 本番ビルドが成功する

### オプション (Phase 2, 3)
- [ ] Google Sheets連携が動作する（使用する場合）
- [ ] Stripe決済が動作する（使用する場合）

---

## 🐛 トラブルシューティング

チェックリストで問題が発生した場合：

1. **[QUICKSTART.md](./QUICKSTART.md)** のトラブルシューティングセクションを確認
2. **[SETUP.md](./SETUP.md)** の詳細なガイドを参照
3. `pnpm tsx scripts/validate-env.ts` を実行して環境変数を検証
4. [GitHub Issues](https://github.com/yourusername/marinos_log_oshikake/issues)で既存の問題を検索

---

## 📝 メモ

セットアップ中に気づいた点や問題をメモしておきましょう：

```
日付: _______________

問題: _______________________________________________

解決方法: ___________________________________________

所要時間: ___________________________________________
```

---

**セットアップお疲れ様でした！ ⚽️**
