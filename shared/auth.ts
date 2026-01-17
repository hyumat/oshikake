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
