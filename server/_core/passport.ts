/**
 * Passport.js Configuration
 * Issue #105/#113: Google/Apple OAuth実装
 *
 * OAuth認証ストラテジーの設定
 */

import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from 'passport-google-oauth20';
import * as db from '../db';

/**
 * Passport.js初期化
 *
 * 環境変数が設定されている場合のみ各ストラテジーを有効化
 * OAuth設定未完了時でもエラーにならないよう設計
 */
export function initializePassport() {
  // Google OAuth設定
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('[Passport] Initializing Google OAuth strategy');

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile: GoogleProfile, done) => {
          try {
            console.log('[Google OAuth] User authenticated:', profile.id);

            // メールアドレス取得
            const email = profile.emails?.[0]?.value || '';
            const name = profile.displayName || '';
            const googleId = `google_${profile.id}`;

            // ユーザーをDB に upsert
            await db.upsertUser({
              openId: googleId,
              email,
              name,
              loginMethod: 'google',
              lastSignedIn: new Date(),
            });

            // ユーザー情報を取得
            const user = await db.getUserByOpenId(googleId);

            if (!user) {
              console.error('[Google OAuth] Failed to retrieve user after upsert');
              done(new Error('Failed to create user'), undefined);
              return;
            }

            done(null, user);
          } catch (error) {
            console.error('[Google OAuth] Authentication error:', error);
            done(error instanceof Error ? error : new Error(String(error)), undefined);
          }
        }
      )
    );
  } else {
    console.warn('[Passport] Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing)');
  }

  // Apple OAuth設定
  // Note: Apple Sign Inは実装が複雑なため、まずはGoogle優先
  // OAuth設定が整ってから追加実装
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    console.log('[Passport] Apple OAuth configuration detected, but strategy not yet implemented');
    // TODO: Apple Strategyの実装
    // import AppleStrategy from '@nicokaiser/passport-apple';
    //
    // passport.use(
    //   new AppleStrategy(
    //     {
    //       clientID: process.env.APPLE_CLIENT_ID,
    //       teamID: process.env.APPLE_TEAM_ID,
    //       keyID: process.env.APPLE_KEY_ID,
    //       privateKey: process.env.APPLE_PRIVATE_KEY,
    //       callbackURL: '/api/auth/apple/callback',
    //     },
    //     async (accessToken, refreshToken, idToken, profile, done) => {
    //       try {
    //         const email = profile.email || '';
    //         const name = `${profile.name?.firstName || ''} ${profile.name?.lastName || ''}`.trim();
    //         const appleId = `apple_${profile.id}`;
    //
    //         await db.upsertUser({
    //           openId: appleId,
    //           email,
    //           name,
    //           loginMethod: 'apple',
    //           lastSignedIn: new Date(),
    //         });
    //
    //         const user = await db.getUserByOpenId(appleId);
    //         done(null, user);
    //       } catch (error) {
    //         done(error instanceof Error ? error : new Error(String(error)), undefined);
    //       }
    //     }
    //   )
    // );
  } else {
    console.warn('[Passport] Apple OAuth not configured');
  }

  console.log('[Passport] Initialization complete');
}

export { passport };
