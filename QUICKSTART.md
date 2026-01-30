# 🚀 クイックスタートガイド

このガイドでは、最短5分でオシカケ (Oshikake) を起動する手順を説明します。

---

## ⏱️ 所要時間: 5-10分

---

## 📋 前提条件

以下がインストールされていることを確認してください：

- **Node.js** 18.0以上
- **pnpm** 10.0以上
- **MySQL** 8.0以上

```bash
# バージョン確認
node --version  # v18.0.0以上
pnpm --version  # 10.0.0以上
mysql --version # 8.0以上
```

---

## 🎯 ステップ1: リポジトリのクローン

```bash
git clone <repository-url>
cd marinos_log_oshikake
```

---

## 📦 ステップ2: 依存関係のインストール

```bash
pnpm install
```

---

## 🔧 ステップ3: 環境変数の設定

### 3-1. .envファイルを作成

```bash
cp .env.example .env
```

### 3-2. .envファイルを編集

`.env`ファイルを開き、以下の**必須項目**を設定してください：

```env
# データベース接続URL（後で設定します）
DATABASE_URL=mysql://marinos_user:your_password@localhost:3306/marinos_db

# JWT署名用シークレット（以下のコマンドで生成）
JWT_SECRET=<ここに生成した値を貼り付け>

# OAuth Server URL（このまま使用）
OAUTH_SERVER_URL=https://oauth.repl.page

# Manus App ID（Replitの場合は自動設定されます）
VITE_APP_ID=your_app_id_here
```

### 3-3. JWT_SECRETを生成

```bash
# このコマンドを実行してJWT_SECRETを生成
openssl rand -base64 32
```

出力された値を`.env`の`JWT_SECRET`にコピーしてください。

### 3-4. 環境変数を検証（オプション）

```bash
pnpm tsx scripts/validate-env.ts
```

✓ 全て緑色のチェックマークが表示されればOKです。

---

## 🗄️ ステップ4: データベースのセットアップ

### 4-1. MySQLにログイン

```bash
mysql -u root -p
```

### 4-2. データベースとユーザーを作成

```sql
CREATE DATABASE marinos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'marinos_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON marinos_db.* TO 'marinos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**重要**: `your_password` は任意のパスワードに変更してください。

### 4-3. DATABASE_URLを更新

`.env`ファイルの`DATABASE_URL`を更新します：

```env
DATABASE_URL=mysql://marinos_user:your_password@localhost:3306/marinos_db
```

（`your_password` は4-2で設定したパスワードに置き換えてください）

### 4-4. マイグレーションを実行

```bash
pnpm db:push
```

✓ `Migration completed` と表示されればOKです。

---

## 🚀 ステップ5: 開発サーバーを起動

```bash
pnpm dev
```

---

## 🎉 完了！

ブラウザで以下のURLを開いてください：

**http://localhost:5000**

アプリケーションが表示されれば成功です！

---

## 🛠️ よく使うコマンド

```bash
# 開発サーバー起動
pnpm dev

# テスト実行
pnpm test

# 型チェック
pnpm check

# ビルド（本番環境用）
pnpm build

# 環境変数検証
pnpm tsx scripts/validate-env.ts
```

---

## ⚠️ トラブルシューティング

### データベース接続エラー

```
Error: DATABASE_URL is required to run drizzle commands
```

**解決方法**:
1. `.env`ファイルに`DATABASE_URL`が設定されているか確認
2. MySQLサーバーが起動しているか確認: `sudo systemctl status mysql`

### ポートが既に使用されている

```
Error: listen EADDRINUSE: address already in use :::5000
```

**解決方法**:
```bash
# 別のポートを使用
PORT=3000 pnpm dev
```

### pnpm install でエラー

```bash
# キャッシュをクリアして再実行
pnpm store prune
pnpm install
```

---

## 📚 次のステップ

基本的なセットアップが完了したら、以下のドキュメントを参照してください：

- **[SETUP.md](./SETUP.md)**: 詳細なセットアップガイド
- **[SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)**: セットアップチェックリスト
- **[MVP.md](./MVP.md)**: MVPの定義とDoD
- **[P0_INTEGRATION_TEST.md](./P0_INTEGRATION_TEST.md)**: Google Sheets連携の設定

---

## 🆘 サポート

問題が解決しない場合は：

1. [GitHub Issues](https://github.com/yourusername/marinos_log_oshikake/issues)で既存の問題を検索
2. [SETUP.md](./SETUP.md)のトラブルシューティングセクションを確認
3. 新しいIssueを作成

---

**Happy Coding! ⚽️**
