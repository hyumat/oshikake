# Google/Apple OAuth実装計画

**作成日**: 2026-01-17
**対象Issue**: #105, #113
**目的**: Manus OAuth依存を削除し、Google/Apple OAuthに移行

---

## 📊 現状分析

### Manus OAuth依存箇所

#### バックエンド
1. **server/_core/sdk.ts** (304行)
   - `OAuthService`: Manus OAuth Serverとの通信
   - `exchangeCodeForToken()`: 認可コード→トークン交換
   - `getUserInfo()`: ユーザー情報取得
   - `createSessionToken()`: JWT セッショントークン作成
   - `authenticateRequest()`: リクエスト認証

2. **server/_core/oauth.ts** (54行)
   - `/api/oauth/callback`: OAuth コールバックエンドポイント
   - Manus特有のフロー処理

3. **server/_core/context.ts** (86行)
   - `sdk.authenticateRequest()` 呼び出し
   - 開発モード用のdev userフォールバック

4. **server/_core/env.ts**
   - `OAUTH_SERVER_URL`: Manus OAuth Server URL
   - `VITE_APP_ID`: Manus App ID

#### フロントエンド
1. **client/src/const.ts** (30行)
   - `buildAuthUrl()`: Manus OAuth Portal URLを構築
   - `VITE_OAUTH_PORTAL_URL`環境変数依存

2. **client/src/pages/Login.tsx**
   - `getLoginUrl()`, `getSignUpUrl()` 使用

3. **client/src/components/PublicHeader.tsx**
   - ログイン/サインアップリンク

---

## 🎯 実装方針

### 技術スタック

**Passport.js** を使用（最も広く使われているNode.js認証ライブラリ）

- **passport-google-oauth20**: Google OAuth 2.0
- **@nicokaiser/passport-apple**: Apple Sign In

### セッション管理

**既存のJWTセッション管理を維持**
- JWT署名/検証ロジックは`sdk.ts`から抽出
- Cookie-based セッション
- `jose`ライブラリ継続使用

---

## 📋 実装タスク

### Phase 1: バックエンド - セッション管理の独立化（1時間）

#### 1. セッション管理モジュール作成
**ファイル**: `server/_core/session.ts`

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';

export type SessionPayload = {
  userId: string;      // users.openId
  email: string;
  name: string;
  provider: 'google' | 'apple';
};

export class SessionManager {
  private getSecretKey() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    return new TextEncoder().encode(secret);
  }

  async createSession(payload: SessionPayload): Promise<string> {
    const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setExpirationTime(expiresAt)
      .sign(this.getSecretKey());
  }

  async verifySession(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.getSecretKey());
      return payload as SessionPayload;
    } catch {
      return null;
    }
  }
}

export const sessionManager = new SessionManager();
```

### Phase 2: バックエンド - OAuth実装（2-3時間）

#### 2. Passport.js セットアップ
**ファイル**: `server/_core/passport.ts`

```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// @ts-ignore
import AppleStrategy from '@nicokaiser/passport-apple';
import * as db from '../db';

// Google OAuth設定
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = `google_${profile.id}`;

        await db.upsertUser({
          openId: googleId,
          email,
          name,
          loginMethod: 'google',
          lastSignedIn: new Date(),
        });

        const user = await db.getUserByOpenId(googleId);
        done(null, user);
      } catch (error) {
        done(error, undefined);
      }
    }
  )
);

// Apple OAuth設定
passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID!,
      teamID: process.env.APPLE_TEAM_ID!,
      keyID: process.env.APPLE_KEY_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!,
      callbackURL: '/api/auth/apple/callback',
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const email = profile.email;
        const name = profile.name?.firstName + ' ' + profile.name?.lastName || '';
        const appleId = `apple_${profile.id}`;

        await db.upsertUser({
          openId: appleId,
          email,
          name,
          loginMethod: 'apple',
          lastSignedIn: new Date(),
        });

        const user = await db.getUserByOpenId(appleId);
        done(null, user);
      } catch (error) {
        done(error, undefined);
      }
    }
  )
);

export { passport };
```

#### 3. 認証エンドポイント作成
**ファイル**: `server/_core/auth.ts`

```typescript
import type { Express, Request, Response } from 'express';
import { passport } from './passport';
import { sessionManager } from './session';
import { getSessionCookieOptions } from './cookies';
import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';

export function registerAuthRoutes(app: Express) {
  // Google OAuth開始
  app.get('/api/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }));

  // Google OAuth コールバック
  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { session: false }),
    async (req: Request, res: Response) => {
      const user = req.user as any;
      if (!user) {
        res.redirect('/login?error=auth_failed');
        return;
      }

      const sessionToken = await sessionManager.createSession({
        userId: user.openId,
        email: user.email,
        name: user.name,
        provider: 'google',
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect('/app');
    }
  );

  // Apple OAuth開始
  app.post('/api/auth/apple', passport.authenticate('apple', {
    session: false,
  }));

  // Apple OAuth コールバック
  app.post(
    '/api/auth/apple/callback',
    passport.authenticate('apple', { session: false }),
    async (req: Request, res: Response) => {
      const user = req.user as any;
      if (!user) {
        res.redirect('/login?error=auth_failed');
        return;
      }

      const sessionToken = await sessionManager.createSession({
        userId: user.openId,
        email: user.email,
        name: user.name,
        provider: 'apple',
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect('/app');
    }
  );

  // ログアウト
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });
}
```

#### 4. Context更新
**ファイル**: `server/_core/context.ts` (修正)

```typescript
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sessionManager } from "./session";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from 'cookie';
import * as db from "../db";
import { ENV } from "./env";

// ... (既存のdev user関連コードは維持)

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Cookie からセッショントークン取得
    const cookies = parseCookieHeader(opts.req.headers.cookie || '');
    const sessionToken = cookies[COOKIE_NAME];

    if (sessionToken) {
      const session = await sessionManager.verifySession(sessionToken);

      if (session) {
        user = await db.getUserByOpenId(session.userId);

        if (user) {
          // 最終ログイン時刻更新
          await db.upsertUser({
            openId: user.openId,
            lastSignedIn: new Date(),
          });
        }
      }
    }
  } catch (error) {
    console.error('[Auth] Authentication failed:', error);

    // 開発モードフォールバック
    if (!ENV.isProduction) {
      try {
        user = await getOrCreateDevUser();
        console.log("[Auth] Using dev fallback user:", user.name);
      } catch (devError) {
        console.error("[Auth] Failed to create dev user:", devError);
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
```

### Phase 3: バックエンド - 既存コード削除（30分）

#### 5. 削除ファイル
- ❌ `server/_core/sdk.ts` (Manus OAuth Service全体を削除)
- ❌ `server/_core/oauth.ts` (Manus callbackエンドポイント削除)
- ❌ `server/_core/types/manusTypes.ts` (Manus型定義削除)

#### 6. 環境変数更新
**.env.example** / **.env**

```bash
# 削除
# OAUTH_SERVER_URL=
# VITE_APP_ID=
# VITE_OAUTH_PORTAL_URL=

# 追加
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Phase 4: フロントエンド実装（2-3時間）

#### 7. ログイン/サインアップページ作成
**ファイル**: `client/src/pages/Login.tsx` (完全書き換え)

```typescript
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app");
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <p className="text-slate-600">読み込み中...</p>
      </div>
    );
  }

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleAppleLogin = () => {
    window.location.href = '/api/auth/apple';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img
                src="/logo.png"
                alt="オシカケ"
                className="h-12 w-12 rounded-xl shadow-sm"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">オシカケ</h1>
            <p className="mt-2 text-sm text-slate-600">
              観戦と費用を、ひとつに。
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 py-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium">Googleでログイン</span>
            </Button>

            <Button
              onClick={handleAppleLogin}
              variant="outline"
              className="w-full flex items-center justify-center gap-3 py-6 bg-black text-white hover:bg-gray-900 hover:text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="font-medium">Appleでログイン</span>
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            ログインすることで、<a href="/terms" className="text-blue-600 hover:underline">利用規約</a>と<a href="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</a>に同意したものとみなされます。
          </p>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
            トップページへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### 8. フロントエンド - 不要コード削除
**ファイル**: `client/src/const.ts` (修正)

```typescript
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 削除: buildAuthUrl, getLoginUrl, getSignUpUrl関連のコード
// ログインは直接 /login ページへのリンクに変更
```

**Landing.tsx, PublicHeader.tsx** などを更新:
- `getLoginUrl()` → `"/login"`
- `getSignUpUrl()` → `"/login"`

### Phase 5: パッケージ追加（5分）

```bash
pnpm add passport passport-google-oauth20 @nicokaiser/passport-apple
pnpm add -D @types/passport @types/passport-google-oauth20
```

### Phase 6: サーバー起動設定（10分）

**ファイル**: `server/_core/index.ts` (修正)

```typescript
import express from 'express';
import { passport } from './passport';
import { registerAuthRoutes } from './auth';

const app = express();

// Passport初期化
app.use(passport.initialize());

// 認証ルート登録
registerAuthRoutes(app);

// ... (既存のtRPC設定など)
```

---

## 🔐 OAuth設定手順

### Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新規プロジェクト作成
3. 「API とサービス」→「認証情報」
4. 「OAuth 2.0 クライアント ID」を作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのリダイレクト URI: `https://yourdomain.com/api/auth/google/callback`
5. クライアントIDとシークレットをコピー

### Apple Developer

1. [Apple Developer](https://developer.apple.com/) にアクセス
2. 「Certificates, Identifiers & Profiles」
3. 「Identifiers」→ 新規App ID作成
4. 「Sign In with Apple」を有効化
5. 「Keys」→ 新規キー作成
   - 「Sign In with Apple」を選択
6. キーファイル(.p8)をダウンロード
7. Team ID, Key ID, Client IDを記録

---

## ✅ テスト計画

### 単体テスト
- [ ] `SessionManager.createSession()` のテスト
- [ ] `SessionManager.verifySession()` のテスト
- [ ] Passport strategy のモックテスト

### 統合テスト
- [ ] Google OAuth フロー（手動）
- [ ] Apple OAuth フロー（手動）
- [ ] ログイン→リダイレクト→セッション確認
- [ ] ログアウト機能

### E2Eテスト
- [ ] ログインページ表示
- [ ] Googleボタンクリック→認証フロー
- [ ] Appleボタンクリック→認証フロー
- [ ] ログイン後のダッシュボード表示

---

## 📊 実装スケジュール

| Phase | タスク | 所要時間 | 累計 |
|-------|--------|----------|------|
| 1 | セッション管理独立化 | 1時間 | 1時間 |
| 2 | OAuth実装 | 2-3時間 | 3-4時間 |
| 3 | 既存コード削除 | 30分 | 3.5-4.5時間 |
| 4 | フロントエンド実装 | 2-3時間 | 5.5-7.5時間 |
| 5 | パッケージ追加 | 5分 | 5.5-7.5時間 |
| 6 | サーバー設定 | 10分 | 5.75-7.75時間 |
| 7 | OAuth設定 | 30分 | 6.25-8.25時間 |
| 8 | テスト | 1時間 | 7.25-9.25時間 |

**合計**: 約7-9時間（1-2日）

---

## ⚠️ リスクと注意事項

### 1. データ移行
- **問題**: 既存ユーザーの`openId`がManus形式（例: `manus_12345`）
- **解決**: 新規ログイン時に自動マイグレーション不可。ユーザーは新規登録扱い。
- **対策**: 事前に全ユーザーにメール通知が必要

### 2. セッション互換性
- **問題**: 既存セッションが無効化される
- **解決**: 全ユーザーが再ログイン必要
- **対策**: メンテナンス告知

### 3. Apple OAuth特有の課題
- **問題**: Apple Sign Inは初回のみメールアドレスを提供
- **解決**: 初回ログイン時に確実にDB保存
- **注意**: テスト時は毎回Apple IDの連携を解除する必要がある

### 4. 開発環境
- **問題**: localhost でのOAuthテストが困難
- **解決**: ngrok などのトンネリングツール使用

---

## 🎯 次のステップ

実装を開始する前に確認事項：

1. **ユーザー通知**: 既存ユーザーへの影響は許容できますか？
2. **OAuth設定**: Google Cloud/Apple Developerアカウントはありますか？
3. **ドメイン**: 本番環境のドメインは確定していますか？
4. **開発環境**: ngrokなどのツールは利用可能ですか？

上記が問題なければ、Phase 1から順次実装を開始します。
