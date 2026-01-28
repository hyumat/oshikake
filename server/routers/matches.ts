/**
 * tRPC router for match-related operations
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { upsertMatches, getMatches, createSyncLog, getRecentSyncLogs } from '../db';
import { getSampleMatches } from '../test-data';
import { scrapeAllMatches, generateMatchKey, normalizeMatchUrl } from '../unified-scraper';
import { syncFromGoogleSheets, getRecentSyncLogs as getSheetsSyncLogs } from '../sheets-sync';
import { TRPCError } from '@trpc/server';
import { triggerSavingsForMatch } from '../savings-trigger';
import { getDb } from '../db';
import { matches as matchesTable } from '../../drizzle/schema';
import { inArray, eq } from 'drizzle-orm';

// In-memory cache for scraped matches (when DB unavailable)
let cachedMatches: any[] | null = null;



export const matchesRouter = router({
  /**
   * Fetch official matches from multiple sources and save to database
   */
  fetchOfficial: protectedProcedure
    .input(
      z.object({
        force: z.boolean().default(false).optional(),
        year: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      let syncStatus: 'success' | 'partial' | 'failed' = 'success';
      let errorMessage: string | undefined;
      let savingsTriggered = 0;
      
      try {
        console.log('[Matches Router] Starting official match fetch...');
        
        // Get current match results before sync (for auto-trigger comparison)
        const db = await getDb();
        const beforeResults = new Map<string, { id: number; isResult: number }>();
        if (db) {
          try {
            const existingMatches = await db.select({
              id: matchesTable.id,
              sourceKey: matchesTable.sourceKey,
              isResult: matchesTable.isResult,
            }).from(matchesTable);
            existingMatches.forEach(m => beforeResults.set(m.sourceKey, { id: m.id, isResult: m.isResult }));
          } catch (e) {
            console.log('[Matches Router] Could not get existing matches for auto-trigger');
          }
        }
        
        // Fetch from unified scraper (Jリーグ公式 + Phew)
        const { fixtures, results, upcoming, counts } = await scrapeAllMatches();
        const durationMs = Date.now() - startTime;
        
        console.log(`[Matches Router] Got ${fixtures.length} total matches in ${durationMs}ms`);
        
        if (fixtures.length > 0) {
          // Convert to database format with stable unique keys
          const dbMatches = fixtures.map((f, idx) => ({
            id: idx + 1,
            sourceKey: generateMatchKey(f),
            date: f.date,
            kickoff: f.kickoff,
            competition: f.competition,
            roundLabel: f.roundLabel,
            homeTeam: f.home,
            awayTeam: f.away,
            opponent: f.opponent || (f.marinosSide === 'home' ? f.away : f.home),
            stadium: f.stadium,
            marinosSide: f.marinosSide,
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            isResult: f.isResult ? 1 : 0,
            matchUrl: normalizeMatchUrl(f.matchUrl) || f.matchUrl,
          }));
          
          // Store in memory cache for fast retrieval
          cachedMatches = dbMatches;
          console.log(`[Matches Router] Cached ${dbMatches.length} matches in memory`);
          
          // Try to save to database (don't fail if DB is unavailable)
          try {
            await upsertMatches(dbMatches);
            console.log(`[Matches Router] Saved ${dbMatches.length} matches to database`);
            
            // Auto-trigger savings for newly confirmed results
            if (db) {
              try {
                const updatedMatches = await db.select({
                  id: matchesTable.id,
                  sourceKey: matchesTable.sourceKey,
                  isResult: matchesTable.isResult,
                  homeScore: matchesTable.homeScore,
                  awayScore: matchesTable.awayScore,
                  marinosSide: matchesTable.marinosSide,
                }).from(matchesTable);
                
                for (const match of updatedMatches) {
                  const before = beforeResults.get(match.sourceKey);
                  const wasResult = before?.isResult === 1;
                  const isNowResult = match.isResult === 1;
                  
                  if (!wasResult && isNowResult) {
                    console.log(`[Matches Router] New result confirmed for match ${match.id}, triggering savings...`);
                    const triggerResults = await triggerSavingsForMatch(match.id, {
                      homeScore: match.homeScore,
                      awayScore: match.awayScore,
                      marinosSide: match.marinosSide,
                    });
                    savingsTriggered += triggerResults.filter(r => r.triggered).length;
                  }
                }
                
                if (savingsTriggered > 0) {
                  console.log(`[Matches Router] Triggered savings for ${savingsTriggered} users`);
                }
              } catch (triggerError) {
                console.warn('[Matches Router] Error in auto-trigger savings:', triggerError);
              }
            }
          } catch (dbError) {
            console.log('[Matches Router] DB unavailable, data cached in memory only');
            syncStatus = 'partial';
            errorMessage = 'DB unavailable, data cached in memory only';
          }
        }
        
        // Log sync operation to database
        await createSyncLog({
          source: 'unified',
          status: syncStatus,
          matchesCount: fixtures.length,
          resultsCount: results.length,
          upcomingCount: upcoming.length,
          errorMessage,
          durationMs: Date.now() - startTime,
        });
        
        return {
          success: true,
          matches: fixtures.length,
          results: results.length,
          upcoming: upcoming.length,
          stats: counts,
          savingsTriggered,
        };
        
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('[Matches Router] Error fetching official matches:', errMsg);
        
        // Log failed sync operation
        await createSyncLog({
          source: 'unified',
          status: 'failed',
          matchesCount: 0,
          resultsCount: 0,
          upcomingCount: 0,
          errorMessage: errMsg,
          durationMs,
        });
        
        // Return empty success instead of throwing
        return {
          success: false,
          matches: 0,
          results: 0,
          upcoming: 0,
          stats: { total: 0, results: 0, upcoming: 0 },
        };
      }
    }),

  /**
   * Get all official matches from database (fast, no scraping)
   * Use fetchOfficial to update data from web sources
   */
  listOfficial: publicProcedure
    .input(
      z.object({
        year: z.number().optional(),
        competition: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        // First try to get from database
        const dbMatches = await getMatches({
          year: input.year,
          competition: input.competition,
        });
        
        // If database has matches, return them
        if (dbMatches.length > 0) {
          return {
            success: true,
            matches: dbMatches,
            count: dbMatches.length,
          };
        }
        
        // Check in-memory cache (populated by fetchOfficial)
        if (cachedMatches && cachedMatches.length > 0) {
          console.log(`[Matches Router] Returning ${cachedMatches.length} cached matches`);
          return {
            success: true,
            matches: cachedMatches,
            count: cachedMatches.length,
          };
        }
        
        // No database/cache - return test data for fast initial load
        // User should click "公式から取得" to fetch real data
        console.log('[Matches Router] No matches available, returning test data');
        const testMatches = getSampleMatches();
        return {
          success: true,
          matches: testMatches as any,
          count: testMatches.length,
        };
        
      } catch (error) {
        console.error('[Matches Router] Error listing matches:', error);
        // Return test data as fallback
        const testMatches = getSampleMatches();
        return {
          success: true,
          matches: testMatches as any,
          count: testMatches.length,
        };
      }
    }),

  /**
   * Get a single match by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        // TODO: Implement when we have the database query
        return {
          success: false,
          message: 'Not implemented yet',
        };
      } catch (error) {
        throw new Error('Failed to get match');
      }
    }),

  /**
   * Issue #145: Sync from Google Sheets
   * 管理者のみ実行可能
   */
  syncFromSheets: protectedProcedure
    .input(
      z.object({
        overwriteArchived: z.boolean().default(false).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 管理者のみ実行可能
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ 
          code: 'FORBIDDEN',
          message: 'Only admins can sync from Google Sheets'
        });
      }

      try {
        console.log('[Matches Router] Starting Google Sheets sync...');
        
        const result = await syncFromGoogleSheets({
          overwriteArchived: input.overwriteArchived,
        });

        if (result.success) {
          return {
            success: true,
            message: `同期完了: ${result.newMatches}件新規追加、${result.updatedMatches}件更新、${result.skippedMatches}件スキップ`,
            data: result,
          };
        } else {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `同期失敗: ${result.error}`,
          });
        }
      } catch (error) {
        console.error('[Matches Router] Sheets sync error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),

  /**
   * Issue #145: Get recent sync logs from Google Sheets
   * 管理者のみ実行可能
   */
  getSheetsSyncLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ 
          code: 'FORBIDDEN',
          message: 'Only admins can view sync logs'
        });
      }

      try {
        const logs = await getSheetsSyncLogs(input.limit);
        return {
          success: true,
          logs,
        };
      } catch (error) {
        console.error('[Matches Router] Error fetching sync logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch sync logs',
        });
      }
    }),
});
