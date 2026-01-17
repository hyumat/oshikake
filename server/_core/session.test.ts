/**
 * Session Management Tests
 * Issue #105: Google/Apple OAuth対応
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { SessionManager } from './session';
import type { SessionPayload } from '@shared/auth';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeAll(() => {
    // JWT_SECRETを設定
    process.env.JWT_SECRET = 'test-secret-key-for-unit-testing';
    sessionManager = new SessionManager();
  });

  describe('createSession', () => {
    it('should create a valid JWT token', async () => {
      const payload: SessionPayload = {
        userId: 'google_123456',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      };

      const token = await sessionManager.createSession(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT形式: header.payload.signature
    });

    it('should create token with custom expiration', async () => {
      const payload: SessionPayload = {
        userId: 'apple_789',
        email: 'apple@example.com',
        name: 'Apple User',
        provider: 'apple',
      };

      const oneHourMs = 60 * 60 * 1000;
      const token = await sessionManager.createSession(payload, oneHourMs);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create token with dev provider', async () => {
      const payload: SessionPayload = {
        userId: 'dev_user',
        email: 'dev@example.com',
        name: 'Dev User',
        provider: 'dev',
      };

      const token = await sessionManager.createSession(payload);
      expect(token).toBeDefined();
    });

    it('should throw error when JWT_SECRET is not set', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const tempManager = new SessionManager();
      const payload: SessionPayload = {
        userId: 'test',
        email: 'test@example.com',
        name: 'Test',
        provider: 'google',
      };

      await expect(tempManager.createSession(payload)).rejects.toThrow(
        'JWT_SECRET environment variable is not configured'
      );

      // 復元
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifySession', () => {
    it('should verify a valid token', async () => {
      const payload: SessionPayload = {
        userId: 'google_123456',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      };

      const token = await sessionManager.createSession(payload);
      const verified = await sessionManager.verifySession(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.email).toBe(payload.email);
      expect(verified?.name).toBe(payload.name);
      expect(verified?.provider).toBe(payload.provider);
    });

    it('should return null for null token', async () => {
      const verified = await sessionManager.verifySession(null);
      expect(verified).toBeNull();
    });

    it('should return null for undefined token', async () => {
      const verified = await sessionManager.verifySession(undefined);
      expect(verified).toBeNull();
    });

    it('should return null for empty string token', async () => {
      const verified = await sessionManager.verifySession('');
      expect(verified).toBeNull();
    });

    it('should return null for malformed token', async () => {
      const verified = await sessionManager.verifySession('invalid.token.here');
      expect(verified).toBeNull();
    });

    it('should return null for expired token', async () => {
      const payload: SessionPayload = {
        userId: 'google_123456',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      };

      // 過去の有効期限で作成（-1ミリ秒 = 既に期限切れ）
      const expiredToken = await sessionManager.createSession(payload, -1000);

      // 少し待ってから検証（確実に期限切れにする）
      await new Promise(resolve => setTimeout(resolve, 100));

      const verified = await sessionManager.verifySession(expiredToken);
      expect(verified).toBeNull();
    });

    it('should return null for token with invalid provider', async () => {
      // 不正なプロバイダーでトークンを作成
      const payload = {
        userId: 'test_123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'invalid_provider', // 不正なプロバイダー
      };

      // 直接JWTを作成（型チェックをバイパス）
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const token = await new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

      const verified = await sessionManager.verifySession(token);
      expect(verified).toBeNull();
    });

    it('should return null for token with missing fields', async () => {
      // 必須フィールドが欠けたトークンを作成
      const invalidPayload = {
        userId: 'test_123',
        email: 'test@example.com',
        // nameとproviderが欠けている
      };

      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const token = await new SignJWT(invalidPayload as any)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

      const verified = await sessionManager.verifySession(token);
      expect(verified).toBeNull();
    });

    it('should return null for token with empty userId', async () => {
      const invalidPayload = {
        userId: '', // 空のuserId
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      };

      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const token = await new SignJWT(invalidPayload as any)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

      const verified = await sessionManager.verifySession(token);
      expect(verified).toBeNull();
    });

    it('should verify token created with different providers', async () => {
      const providers: Array<SessionPayload['provider']> = ['google', 'apple', 'dev'];

      for (const provider of providers) {
        const payload: SessionPayload = {
          userId: `${provider}_user`,
          email: `${provider}@example.com`,
          name: `${provider} User`,
          provider,
        };

        const token = await sessionManager.createSession(payload);
        const verified = await sessionManager.verifySession(token);

        expect(verified).not.toBeNull();
        expect(verified?.provider).toBe(provider);
      }
    });
  });

  describe('invalidateSession', () => {
    it('should complete without error (stateless design)', async () => {
      const token = 'dummy-token';
      await expect(sessionManager.invalidateSession(token)).resolves.toBeUndefined();
    });

    it('should not prevent token verification (stateless)', async () => {
      const payload: SessionPayload = {
        userId: 'google_123456',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      };

      const token = await sessionManager.createSession(payload);

      // invalidateを呼び出す
      await sessionManager.invalidateSession(token);

      // ステートレス設計なので、無効化後も検証できることを確認
      const verified = await sessionManager.verifySession(token);
      expect(verified).not.toBeNull();
    });
  });

  describe('Security', () => {
    it('should not verify token signed with different secret', async () => {
      // 別のシークレットでトークンを作成
      const payload: SessionPayload = {
        userId: 'google_123456',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      };

      const { SignJWT } = await import('jose');
      const wrongSecret = new TextEncoder().encode('wrong-secret-key');
      const token = await new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(wrongSecret);

      // 正しいシークレットで検証すると失敗する
      const verified = await sessionManager.verifySession(token);
      expect(verified).toBeNull();
    });

    it('should not allow algorithm confusion', async () => {
      // HS256以外のアルゴリズムで署名されたトークンは拒否される
      const payload: SessionPayload = {
        userId: 'google_123456',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
      };

      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);

      // HS512で署名（HS256が要求される）
      const token = await new SignJWT(payload as any)
        .setProtectedHeader({ alg: 'HS512', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

      const verified = await sessionManager.verifySession(token);
      expect(verified).toBeNull();
    });
  });
});
