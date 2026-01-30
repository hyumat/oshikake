/**
 * Shared Authentication Types
 * Issue #105: Google/Apple OAuth
 *
 * クライアント・サーバー間で共有する認証関連の型定義
 */

/**
 * 認証プロバイダー
 */
export type AuthProvider = 'google' | 'apple' | 'dev';

/**
 * セッションペイロード
 * JWTに含まれるユーザー情報
 */
export interface SessionPayload {
  /** ユーザーID (users.openId) */
  userId: string;
  /** メールアドレス */
  email: string;
  /** 表示名 */
  name: string;
  /** 認証プロバイダー */
  provider: AuthProvider;
}

/**
 * 認証エラーの種類
 */
export type AuthErrorType =
  | 'auth_failed'
  | 'oauth_not_configured'
  | 'session_creation_failed'
  | 'session_expired'
  | 'invalid_token';

/**
 * 認証エラー
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
}

/**
 * 認証コンテキスト（ログイン or 登録）
 */
export type AuthContext = 'login' | 'signup';

/**
 * エラータイプに対応するエラーメッセージを取得
 * @param errorType エラータイプ
 * @param context 認証コンテキスト（ログイン or 登録）
 */
export function getAuthErrorMessage(errorType: AuthErrorType, context: AuthContext = 'login'): string {
  switch (errorType) {
    case 'auth_failed':
      return context === 'login'
        ? 'ログインに失敗しました。もう一度お試しください。'
        : '登録に失敗しました。もう一度お試しください。';
    case 'oauth_not_configured':
      return 'OAuth設定が完了していません。管理者にお問い合わせください。';
    case 'session_creation_failed':
      return 'セッション作成に失敗しました。もう一度お試しください。';
    case 'session_expired':
      return context === 'login'
        ? 'セッションが期限切れです。もう一度ログインしてください。'
        : 'セッションが期限切れです。もう一度お試しください。';
    case 'invalid_token':
      return context === 'login'
        ? 'セッショントークンが無効です。もう一度ログインしてください。'
        : 'セッショントークンが無効です。もう一度お試しください。';
  }
}

/**
 * 有効な認証エラータイプのリスト
 */
export const AUTH_ERROR_TYPES: AuthErrorType[] = [
  'auth_failed',
  'oauth_not_configured',
  'session_creation_failed',
  'session_expired',
  'invalid_token',
];
