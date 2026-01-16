/**
 * Google Sheets + GAS API Integration
 * Issue #145: データソースをGoogle Sheetsに統一
 */

import axios from 'axios';
import { db } from './db';
import { matches, syncLogs, type InsertMatch, type InsertSyncLog } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Google Sheets の行データ構造
 */
export interface SheetMatchRow {
  match_id: string;
  date: string;
  opponent: string;
  home_score?: number | string;
  away_score?: number | string;
  stadium: string;
  kickoff: string;
  competition: string;
  ticket_sales_start?: string;
  notes?: string;
}

/**
 * 同期結果
 */
export interface SyncResult {
  success: boolean;
  matchesCount: number;
  newMatches: number;
  updatedMatches: number;
  skippedMatches: number;
  duration: number;
  error?: string;
}

const GAS_API_URL = process.env.GAS_API_URL || '';
const GAS_API_TOKEN = process.env.GAS_API_TOKEN || '';

/**
 * 指数バックオフでリトライ実行
 * ネットワークエラーや一時的な障害に対して自動リトライを実行
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // 指数バックオフで待機時間を計算 (1s, 2s, 4s...)
        const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);

        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        console.log(`[sheets-sync] Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Google Sheets から試合データを取得（リトライ付き）
 * GAS API 経由でデータを取得
 *
 * エラー時は最大3回まで自動リトライ（指数バックオフ）
 */
export async function fetchFromGoogleSheets(): Promise<SheetMatchRow[]> {
  if (!GAS_API_URL || !GAS_API_TOKEN) {
    throw new Error('GAS_API_URL or GAS_API_TOKEN is not configured');
  }

  console.log('[sheets-sync] Fetching from Google Sheets via GAS API...');

  try {
    // リトライ付きでGAS APIを呼び出し
    const matches = await retryWithBackoff(
      async () => {
        const response = await axios.post(
          GAS_API_URL,
          { action: 'getMatches' },
          {
            headers: {
              'Authorization': `Bearer ${GAS_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        if (!response.data) {
          throw new Error('Empty response from GAS API');
        }

        if (!response.data.success) {
          throw new Error(response.data.error || 'GAS API returned error');
        }

        return response.data.data as SheetMatchRow[];
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        onRetry: (attempt, error) => {
          const errorMsg = axios.isAxiosError(error)
            ? `${error.code}: ${error.message}`
            : String(error);
          console.warn(`[sheets-sync] Request failed (${errorMsg}), retrying...`);
        },
      }
    );

    console.log(`[sheets-sync] Fetched ${matches.length} matches from Sheets`);
    return matches;
  } catch (error) {
    console.error('[sheets-sync] Failed to fetch from Google Sheets:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`GAS API error: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('GAS API request timeout or network error');
      }
    }
    
    throw error;
  }
}

/**
 * Sheets データを DB スキーマにマッピング
 */
/**
 * Sheets データを DB スキーマにマッピング
 * Issue #146: 新しいスキーマに対応
 */
function mapSheetsToDb(sheetMatches: SheetMatchRow[]): InsertMatch[] {
  return sheetMatches.map(sheet => {
    // スコアの型変換（文字列 → 数値）
    const homeScore = sheet.home_score !== undefined && sheet.home_score !== '' 
      ? Number(sheet.home_score) 
      : null;
    const awayScore = sheet.away_score !== undefined && sheet.away_score !== '' 
      ? Number(sheet.away_score) 
      : null;

    // 試合結果があるかどうか
    const hasResult = homeScore !== null && awayScore !== null;

    return {
      // === Sheets列に対応 ===
      matchId: sheet.match_id,
      date: sheet.date,
      opponent: sheet.opponent,
      homeScore: homeScore,
      awayScore: awayScore,
      stadium: sheet.stadium || null,
      kickoff: sheet.kickoff || null,
      competition: sheet.competition || null,
      ticketSalesStart: sheet.ticket_sales_start || null,
      notes: sheet.notes || null,
      
      // === メタデータ ===
      source: 'sheets',
      sourceKey: sheet.match_id, // sourceKey = matchId
      status: hasResult ? 'Finished' : 'Scheduled',
      isResult: hasResult ? 1 : 0,
      marinosSide: 'home' as const, // Sheets では基本的にホーム試合を記録
      homeTeam: 'マリノス',
      awayTeam: sheet.opponent,
      roundLabel: null,
      roundNumber: null,
      matchUrl: null,
    };
  });
}

/**
 * Google Sheets から DB に同期
 * Issue #145: メイン同期関数
 */
export async function syncFromGoogleSheets(options?: {
  overwriteArchived?: boolean;
}): Promise<SyncResult> {
  const startTime = Date.now();
  const overwriteArchived = options?.overwriteArchived ?? false;

  try {
    console.log('[sheets-sync] Starting sync from Google Sheets...');

    // 1. Sheets からデータ取得
    const sheetMatches = await fetchFromGoogleSheets();

    if (sheetMatches.length === 0) {
      console.warn('[sheets-sync] No matches found in Sheets');
      return {
        success: true,
        matchesCount: 0,
        newMatches: 0,
        updatedMatches: 0,
        skippedMatches: 0,
        duration: Date.now() - startTime,
      };
    }

    // 2. DB スキーマにマッピング
    const dbMatches = mapSheetsToDb(sheetMatches);

    // 3. DB に保存（上書き制御あり）
    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const match of dbMatches) {
      // Issue #146: matchId ベースで検索
      const existing = await db.query.matches.findFirst({
        where: eq(matches.matchId, match.matchId),
      });

      if (existing) {
        // 既存レコード
        
        // Issue #147: 過去試合（isResult=1）は上書きしない
        if (existing.isResult === 1 && !overwriteArchived) {
          console.log(`[sheets-sync] Skipping archived match: ${match.matchId}`);
          skippedCount++;
          continue;
        }

        // 更新可能
        await db
          .update(matches)
          .set({
            ...match,
            updatedAt: new Date(),
          })
          .where(eq(matches.matchId, match.matchId));
        
        updatedCount++;
        console.log(`[sheets-sync] Updated match: ${match.matchId}`);
      } else {
        // 新規レコード
        await db.insert(matches).values(match);
        newCount++;
        console.log(`[sheets-sync] Inserted new match: ${match.matchId}`);
      }
    }

    const duration = Date.now() - startTime;

    // 4. syncLog に記録
    await recordSyncLog({
      source: 'sheets',
      status: 'success',
      matchesCount: sheetMatches.length,
      resultsCount: dbMatches.filter(m => m.isResult === 1).length,
      upcomingCount: dbMatches.filter(m => m.isResult === 0).length,
      durationMs: duration,
    });

    console.log(`[sheets-sync] Sync completed: ${newCount} new, ${updatedCount} updated, ${skippedCount} skipped`);

    return {
      success: true,
      matchesCount: sheetMatches.length,
      newMatches: newCount,
      updatedMatches: updatedCount,
      skippedMatches: skippedCount,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('[sheets-sync] Sync failed:', errorMessage);

    // エラーログ記録
    await recordSyncLog({
      source: 'sheets',
      status: 'failed',
      matchesCount: 0,
      errorMessage,
      durationMs: duration,
    });

    return {
      success: false,
      matchesCount: 0,
      newMatches: 0,
      updatedMatches: 0,
      skippedMatches: 0,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * syncLog に記録
 */
async function recordSyncLog(data: {
  source: string;
  status: 'success' | 'failed';
  matchesCount: number;
  resultsCount?: number;
  upcomingCount?: number;
  errorMessage?: string;
  durationMs: number;
}): Promise<void> {
  try {
    const logEntry: InsertSyncLog = {
      source: data.source,
      status: data.status,
      matchesCount: data.matchesCount,
      resultsCount: data.resultsCount ?? 0,
      upcomingCount: data.upcomingCount ?? 0,
      detailFetched: 0,
      detailFailed: 0,
      errorMessage: data.errorMessage ?? null,
      failedUrls: null,
      durationMs: data.durationMs,
    };

    await db.insert(syncLogs).values(logEntry);
    console.log('[sheets-sync] Sync log recorded');
  } catch (error) {
    console.error('[sheets-sync] Failed to record sync log:', error);
  }
}

/**
 * 最新の同期ログを取得
 */
export async function getRecentSyncLogs(limit: number = 10) {
  return await db.query.syncLogs.findMany({
    where: eq(syncLogs.source, 'sheets'),
    limit,
    orderBy: (syncLogs, { desc }) => [desc(syncLogs.syncedAt)],
  });
}
