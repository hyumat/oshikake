import cron, { ScheduledTask } from 'node-cron';
import { syncFromGoogleSheets } from './sheets-sync';

let syncJob: ScheduledTask | null = null;

export function startScheduledJobs() {
  const gasApiUrl = process.env.GAS_API_URL;
  const gasApiToken = process.env.GAS_API_TOKEN;

  if (!gasApiUrl || !gasApiToken) {
    console.log('[Scheduler] GAS API credentials not configured. Scheduled sync disabled.');
    return;
  }

  syncJob = cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Starting scheduled sync at', new Date().toISOString());
    try {
      const result = await syncFromGoogleSheets();
      if (result.success) {
        console.log(`[Scheduler] Sync completed: ${result.newMatches} new, ${result.updatedMatches} updated, ${result.skippedMatches} skipped`);
      } else {
        console.error('[Scheduler] Sync failed:', result.error);
      }
    } catch (error) {
      console.error('[Scheduler] Sync error:', error);
    }
  }, {
    timezone: 'Asia/Tokyo',
  });

  console.log('[Scheduler] Daily sync job scheduled at 00:00 JST');
}

export function stopScheduledJobs() {
  if (syncJob) {
    syncJob.stop();
    syncJob = null;
    console.log('[Scheduler] Scheduled jobs stopped');
  }
}

export async function runSyncNow() {
  console.log('[Scheduler] Manual sync triggered at', new Date().toISOString());
  try {
    const result = await syncFromGoogleSheets();
    return result;
  } catch (error) {
    console.error('[Scheduler] Manual sync error:', error);
    throw error;
  }
}
