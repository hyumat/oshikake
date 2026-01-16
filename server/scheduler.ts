/**
 * Issue #145: Periodic Sync Scheduler
 *
 * Google Sheetsからの定期同期ジョブを管理
 */

import { syncFromGoogleSheets } from './sheets-sync';

interface SchedulerConfig {
  /** 同期間隔（ミリ秒） デフォルト: 1時間 */
  syncIntervalMs: number;
  /** 起動時に即座に同期するか デフォルト: true */
  syncOnStartup: boolean;
  /** スケジューラーを有効にするか デフォルト: true */
  enabled: boolean;
}

interface SchedulerStatus {
  isRunning: boolean;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  syncCount: number;
  errorCount: number;
  lastError: string | null;
}

class SheetsScheduler {
  private config: SchedulerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private status: SchedulerStatus = {
    isRunning: false,
    lastSyncAt: null,
    nextSyncAt: null,
    syncCount: 0,
    errorCount: 0,
    lastError: null,
  };

  constructor(config?: Partial<SchedulerConfig>) {
    // デフォルト設定
    this.config = {
      syncIntervalMs: parseInt(process.env.SHEETS_SYNC_INTERVAL_MS || '3600000'), // 1時間
      syncOnStartup: process.env.SHEETS_SYNC_ON_STARTUP !== 'false', // デフォルトtrue
      enabled: process.env.SHEETS_SYNC_ENABLED !== 'false', // デフォルトtrue
      ...config,
    };

    // 環境変数でスケジューラーが無効化されている場合
    if (!this.config.enabled) {
      console.log('[Scheduler] Disabled by configuration');
      return;
    }

    // GAS API設定が存在しない場合は警告のみ（エラーにしない）
    const hasGasConfig = process.env.GAS_API_URL && process.env.GAS_API_TOKEN;
    if (!hasGasConfig) {
      console.warn('[Scheduler] GAS_API_URL or GAS_API_TOKEN not configured. Scheduler disabled.');
      this.config.enabled = false;
      return;
    }
  }

  /**
   * スケジューラーを開始
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[Scheduler] Not starting (disabled)');
      return;
    }

    if (this.intervalId) {
      console.warn('[Scheduler] Already running');
      return;
    }

    this.status.isRunning = true;

    console.log(`[Scheduler] Starting with interval: ${this.formatInterval(this.config.syncIntervalMs)}`);

    // 起動時に同期
    if (this.config.syncOnStartup) {
      console.log('[Scheduler] Running initial sync...');
      this.runSync().catch(error => {
        console.error('[Scheduler] Initial sync failed:', error);
      });
    }

    // 定期同期を設定
    this.intervalId = setInterval(() => {
      this.runSync().catch(error => {
        console.error('[Scheduler] Periodic sync failed:', error);
      });
    }, this.config.syncIntervalMs);

    // 次回同期時刻を計算
    this.updateNextSyncTime();
  }

  /**
   * スケジューラーを停止
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.status.isRunning = false;
      this.status.nextSyncAt = null;
      console.log('[Scheduler] Stopped');
    }
  }

  /**
   * 同期を実行
   */
  private async runSync(): Promise<void> {
    const startTime = Date.now();
    console.log('[Scheduler] Running sync...');

    try {
      const result = await syncFromGoogleSheets({
        overwriteArchived: false, // スケジューラーは過去試合を上書きしない
      });

      this.status.lastSyncAt = new Date();
      this.status.syncCount++;
      this.status.lastError = null;
      this.updateNextSyncTime();

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(
          `[Scheduler] Sync completed in ${duration}ms: ${result.newMatches} new, ${result.updatedMatches} updated, ${result.skippedMatches} skipped`
        );
      } else {
        this.status.errorCount++;
        this.status.lastError = result.error || 'Unknown error';
        console.error(`[Scheduler] Sync failed: ${result.error}`);
      }
    } catch (error) {
      this.status.errorCount++;
      this.status.lastError = error instanceof Error ? error.message : String(error);
      console.error('[Scheduler] Sync error:', error);
    }
  }

  /**
   * 次回同期時刻を更新
   */
  private updateNextSyncTime(): void {
    if (this.status.isRunning) {
      this.status.nextSyncAt = new Date(Date.now() + this.config.syncIntervalMs);
    }
  }

  /**
   * 間隔を人間が読める形式にフォーマット
   */
  private formatInterval(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日`;
    if (hours > 0) return `${hours}時間`;
    if (minutes > 0) return `${minutes}分`;
    return `${seconds}秒`;
  }

  /**
   * スケジューラーのステータスを取得
   */
  getStatus(): SchedulerStatus {
    return { ...this.status };
  }

  /**
   * 設定を取得
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * 手動で即座に同期を実行
   * スケジューラーの次回実行時刻はリセットされない
   */
  async triggerManualSync(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Scheduler is disabled');
    }
    console.log('[Scheduler] Manual sync triggered');
    await this.runSync();
  }
}

// シングルトンインスタンス
let schedulerInstance: SheetsScheduler | null = null;

/**
 * スケジューラーを初期化
 * サーバー起動時に一度だけ呼ばれる
 */
export function initializeScheduler(config?: Partial<SchedulerConfig>): SheetsScheduler {
  if (schedulerInstance) {
    console.warn('[Scheduler] Already initialized');
    return schedulerInstance;
  }

  schedulerInstance = new SheetsScheduler(config);
  schedulerInstance.start();

  return schedulerInstance;
}

/**
 * スケジューラーインスタンスを取得
 */
export function getScheduler(): SheetsScheduler | null {
  return schedulerInstance;
}

/**
 * スケジューラーを停止
 * 主にテストやグレースフルシャットダウンで使用
 */
export function stopScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
