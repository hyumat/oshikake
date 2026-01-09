# セキュリティ設計ドキュメント

## 概要
本ドキュメントはオシカケのセキュリティ設計方針を記載します。

## 認証・セッション管理

### セッションCookie設定
- `HttpOnly: true` - JavaScript からのアクセスを防止（XSS対策）
- `Secure: true` - HTTPS接続時のみ送信
- `SameSite: none` - Cross-origin リクエストを許可（iframe対応）
- `Path: /` - 全パスで有効

### トークン管理
- セッショントークンはJWT形式でCookieに保存
- 有効期限: 1年（ONE_YEAR_MS）
- リフレッシュトークンは保持しない（シンプルな設計を優先）

## 認可（Authorization）

### ユーザーデータの保護
- すべてのAPI操作で `userId` による所有者チェックを実施
- 他ユーザーのデータへのアクセスは拒否
- フロントエンド任せにせず、サーバー側で必ず検証

### 実装例
```typescript
// userMatchesの更新時
if (existing[0].userId !== userId) {
  throw new Error('User match not found or unauthorized');
}
```

## 秘密情報管理

### 環境変数で管理する情報
- `JWT_SECRET` - セッショントークンの署名キー
- `DATABASE_URL` - データベース接続文字列
- `OAUTH_SERVER_URL` - OAuthサーバーURL
- `OWNER_OPEN_ID` - 管理者ユーザーID

### 禁止事項
- リポジトリへの秘密情報のコミット禁止
- ログへの秘密情報出力禁止
- フロントエンドへの秘密情報露出禁止

## PII（個人識別情報）の取り扱い

### 保持する情報（最小限）
- `openId` - OAuth識別子（必須）
- `name` - ユーザー表示名（任意）
- `email` - メールアドレス（任意、Appleは初回のみ）
- `loginMethod` - 認証プロバイダ

### 保持しない情報
- パスワード（OAuth認証のため不要）
- クレジットカード情報
- 住所・電話番号

## 監査ログ

### 記録する操作
- `attendance_create` - 観戦記録の作成
- `attendance_update` - 観戦記録の更新
- `attendance_delete` - 観戦記録の削除
- `expense_add` - 費用の追加
- `expense_update` - 費用の更新
- `expense_delete` - 費用の削除
- `auth_login` - ログイン
- `auth_logout` - ログアウト

### 記録内容
- userId: 操作ユーザー
- action: 操作種別
- targetId: 対象レコードID
- targetType: 対象テーブル
- metadata: 追加情報（JSON）
- ipAddress: IPアドレス
- userAgent: ブラウザ情報
- createdAt: 操作日時

## 開発環境と本番環境の分離

### 開発環境
- `NODE_ENV !== 'production'` で判定
- テストユーザーによる自動ログイン有効
- デバッグログ出力

### 本番環境
- テストユーザー無効
- エラー詳細の非公開
- 監査ログの完全記録
