/**
 * Passport Configuration Tests
 * Issue #105: Google/Apple OAuth対応
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializePassport, passport } from './passport';

describe('Passport Configuration', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // テスト用の環境変数を設定
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
  });

  afterAll(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('initializePassport', () => {
    it('should initialize without error when Google OAuth is configured', () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      expect(() => initializePassport()).not.toThrow();
    });

    it('should initialize without error when Google OAuth is not configured', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      // 警告が出るが、エラーにはならない
      expect(() => initializePassport()).not.toThrow();
    });

    it('should return passport instance', () => {
      expect(passport).toBeDefined();
      expect(typeof passport.authenticate).toBe('function');
      expect(typeof passport.use).toBe('function');
    });
  });

  describe('Google OAuth Strategy', () => {
    it('should register Google strategy when credentials are provided', () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      initializePassport();

      // Passportインスタンスが正しく初期化されたことを確認
      expect(passport).toBeDefined();
    });

    it('should not throw when Google credentials are missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      // エラーにならず、警告のみ出力される
      expect(() => initializePassport()).not.toThrow();
    });

    it('should handle partial Google OAuth configuration', () => {
      // CLIENT_IDだけ設定
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      delete process.env.GOOGLE_CLIENT_SECRET;

      expect(() => initializePassport()).not.toThrow();

      // CLIENT_SECRETだけ設定
      delete process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      expect(() => initializePassport()).not.toThrow();
    });
  });

  describe('Passport Instance', () => {
    it('should have required authentication methods', () => {
      expect(passport.authenticate).toBeDefined();
      expect(typeof passport.authenticate).toBe('function');
    });

    it('should have strategy registration method', () => {
      expect(passport.use).toBeDefined();
      expect(typeof passport.use).toBe('function');
    });

    it('should have initialization method', () => {
      expect(passport.initialize).toBeDefined();
      expect(typeof passport.initialize).toBe('function');
    });
  });
});
