/**
 * Session Management Module
 * Issue #105: Google/Apple OAuth対応
 *
 * Manus OAuth依存を削除し、独立したJWTセッション管理を提供
 */

import { SignJWT, jwtVerify } from 'jose';
import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';
import type { SessionPayload, AuthProvider } from '@shared/auth';

/**
 * セッション管理クラス
 * JWTの署名・検証を担当
 */
export class SessionManager {
  /**
   * JWT署名用の秘密鍵を取得
   */
  private getSecretKey(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    return new TextEncoder().encode(secret);
  }

  /**
   * セッショントークンを作成
   *
   * @param payload - セッションペイロード
   * @param expiresInMs - 有効期限（ミリ秒、デフォルト: 1年）
   * @returns JWT文字列
   *
   * @example
   * const token = await sessionManager.createSession({
   *   userId: 'google_123456',
   *   email: 'user@example.com',
   *   name: 'John Doe',
   *   provider: 'google'
   * });
   */
  async createSession(
    payload: SessionPayload,
    expiresInMs: number = ONE_YEAR_MS
  ): Promise<string> {
    const issuedAt = Date.now();
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSecretKey();

    return new SignJWT({
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      provider: payload.provider,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * セッショントークンを検証
   *
   * @param token - JWT文字列
   * @returns セッションペイロード（検証失敗時はnull）
   *
   * @example
   * const session = await sessionManager.verifySession(cookieValue);
   * if (session) {
   *   console.log('User:', session.userId);
   * }
   */
  async verifySession(token: string | null | undefined): Promise<SessionPayload | null> {
    if (!token) {
      return null;
    }

    try {
      const secretKey = this.getSecretKey();
      const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
      });

      // ペイロードの型検証
      const { userId, email, name, provider } = payload as Record<string, unknown>;

      const validProviders: AuthProvider[] = ['google', 'apple', 'dev'];

      if (
        typeof userId !== 'string' || userId.length === 0 ||
        typeof email !== 'string' ||
        typeof name !== 'string' ||
        typeof provider !== 'string' || !validProviders.includes(provider as AuthProvider)
      ) {
        console.warn('[Session] Invalid session payload structure');
        return null;
      }

      return {
        userId,
        email,
        name,
        provider: provider as AuthProvider,
      };
    } catch (error) {
      // JWT検証エラー（期限切れ、署名不正など）
      console.warn('[Session] Verification failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * セッションを無効化（実際にはクライアント側でCookieを削除）
   * サーバー側ではブラックリスト機能なし（ステートレス設計）
   */
  async invalidateSession(_token: string): Promise<void> {
    // ステートレスJWTのため、サーバー側での無効化処理なし
    // クライアント側でCookieを削除することで対応
    return;
  }
}

/**
 * シングルトンインスタンス
 */
export const sessionManager = new SessionManager();
