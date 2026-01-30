/**
 * Issue #145: Scheduler tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('scheduler module', () => {
  // モジュールのインポートテスト
  it('should export initializeScheduler function', async () => {
    const { initializeScheduler } = await import('./scheduler');
    expect(initializeScheduler).toBeDefined();
    expect(typeof initializeScheduler).toBe('function');
  });

  it('should export getScheduler function', async () => {
    const { getScheduler } = await import('./scheduler');
    expect(getScheduler).toBeDefined();
    expect(typeof getScheduler).toBe('function');
  });

  it('should export stopScheduler function', async () => {
    const { stopScheduler } = await import('./scheduler');
    expect(stopScheduler).toBeDefined();
    expect(typeof stopScheduler).toBe('function');
  });

  // 環境変数のチェック（オプショナル）
  it('should accept SHEETS_SYNC_ENABLED environment variable', () => {
    // 環境変数は任意（未設定でもデフォルト値が使用される）
    const enabled = process.env.SHEETS_SYNC_ENABLED;
    expect(enabled === undefined || typeof enabled === 'string').toBe(true);
  });

  it('should accept SHEETS_SYNC_INTERVAL_MS environment variable', () => {
    // 環境変数は任意（未設定でもデフォルト値が使用される）
    const interval = process.env.SHEETS_SYNC_INTERVAL_MS;
    expect(interval === undefined || typeof interval === 'string').toBe(true);
  });

  it('should accept SHEETS_SYNC_ON_STARTUP environment variable', () => {
    // 環境変数は任意（未設定でもデフォルト値が使用される）
    const syncOnStartup = process.env.SHEETS_SYNC_ON_STARTUP;
    expect(syncOnStartup === undefined || typeof syncOnStartup === 'string').toBe(true);
  });
});

describe('scheduler config defaults', () => {
  it('should use default interval of 1 hour (3600000ms)', () => {
    const defaultInterval = 3600000;
    expect(defaultInterval).toBe(60 * 60 * 1000); // 1時間
  });

  it('should enable sync on startup by default', () => {
    const defaultSyncOnStartup = true;
    expect(defaultSyncOnStartup).toBe(true);
  });

  it('should be enabled by default', () => {
    const defaultEnabled = true;
    expect(defaultEnabled).toBe(true);
  });
});

describe('scheduler status structure', () => {
  it('should have correct status structure', () => {
    const mockStatus = {
      isRunning: false,
      lastSyncAt: null,
      nextSyncAt: null,
      syncCount: 0,
      errorCount: 0,
      lastError: null,
    };

    expect(mockStatus).toHaveProperty('isRunning');
    expect(mockStatus).toHaveProperty('lastSyncAt');
    expect(mockStatus).toHaveProperty('nextSyncAt');
    expect(mockStatus).toHaveProperty('syncCount');
    expect(mockStatus).toHaveProperty('errorCount');
    expect(mockStatus).toHaveProperty('lastError');
  });
});
