/**
 * Authentication Routes
 * Issue #105/#113: Google/Apple OAuth実装
 *
 * OAuth認証エンドポイントの登録
 */

import type { Express, Request, Response } from 'express';
import { passport } from './passport';
import { sessionManager } from './session';
import { getSessionCookieOptions } from './cookies';
import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';
import type { User } from '../../drizzle/schema';

/**
 * 認証ルートを Express アプリに登録
 *
 * @param app - Express アプリケーション
 *
 * エンドポイント:
 * - GET  /api/auth/google            - Google OAuth開始
 * - GET  /api/auth/google/callback   - Google OAuth コールバック
 * - POST /api/auth/logout            - ログアウト
 */
export function registerAuthRoutes(app: Express) {
  console.log('[Auth] Registering authentication routes');

  // ==================== Google OAuth ====================

  /**
   * Google OAuth開始エンドポイント
   * フロントエンドから window.location.href = '/api/auth/google' で呼び出し
   */
  app.get(
    '/api/auth/google',
    (req, res, next) => {
      // OAuth設定がない場合はエラーページへリダイレクト
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('[Auth] Google OAuth not configured');
        res.redirect('/login?error=oauth_not_configured');
        return;
      }
      next();
    },
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false, // JWTセッション使用のため、Passportセッションは無効化
    })
  );

  /**
   * Google OAuth コールバックエンドポイント
   * Googleからリダイレクトされる
   */
  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=auth_failed' }),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as User | undefined;

        if (!user) {
          console.error('[Auth] No user in request after Google OAuth');
          res.redirect('/login?error=auth_failed');
          return;
        }

        console.log('[Auth] Google OAuth successful:', user.openId);

        // JWTセッショントークン作成
        const sessionToken = await sessionManager.createSession({
          userId: user.openId,
          email: user.email || '',
          name: user.name || '',
          provider: 'google',
        });

        // Cookie設定
        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        // ダッシュボードにリダイレクト
        res.redirect('/app');
      } catch (error) {
        console.error('[Auth] Error in Google callback:', error);
        res.redirect('/login?error=session_creation_failed');
      }
    }
  );

  // ==================== Apple OAuth ====================
  // TODO: Apple OAuth実装
  // OAuth設定が整ってから追加

  // ==================== ログアウト ====================

  /**
   * ログアウトエンドポイント
   * セッションCookieを削除
   */
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    console.log('[Auth] User logged out');

    // Cookieクリア
    res.clearCookie(COOKIE_NAME, getSessionCookieOptions(req));

    res.json({ success: true });
  });

  // ==================== デバッグ用エンドポイント ====================

  /**
   * セッション確認エンドポイント（開発用）
   * 現在のセッション情報を返す
   */
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/auth/session', async (req: Request, res: Response) => {
      try {
        const cookies = req.headers.cookie || '';
        const sessionToken = cookies
          .split(';')
          .map(c => c.trim())
          .find(c => c.startsWith(`${COOKIE_NAME}=`))
          ?.split('=')[1];

        if (!sessionToken) {
          res.json({ authenticated: false, session: null });
          return;
        }

        const session = await sessionManager.verifySession(sessionToken);

        res.json({
          authenticated: !!session,
          session,
        });
      } catch (error) {
        res.status(500).json({ error: 'Session check failed' });
      }
    });
  }

  console.log('[Auth] Authentication routes registered');
}
