import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { userMatches, matches } from '../../drizzle/schema';
import { eq, and, sql, type SQL } from 'drizzle-orm';

type MatchResult = 'win' | 'draw' | 'loss' | 'unknown';

function calculateResult(
  homeScore: number | null,
  awayScore: number | null,
  marinosSide: 'home' | 'away' | null
): MatchResult {
  if (homeScore === null || awayScore === null || !marinosSide) {
    return 'unknown';
  }
  
  const marinosScore = marinosSide === 'home' ? homeScore : awayScore;
  const opponentScore = marinosSide === 'home' ? awayScore : homeScore;
  
  if (marinosScore > opponentScore) return 'win';
  if (marinosScore < opponentScore) return 'loss';
  return 'draw';
}

interface StatsSummary {
  period: { year?: number; from?: string; to?: string };
  watchCount: number;
  record: { win: number; draw: number; loss: number; unknown: number };
  cost: { total: number; averagePerMatch: number };
}

interface CacheEntry {
  data: StatsSummary;
  expiresAt: number;
}

const statsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

function getCacheKey(userId: number, input: { year?: number; from?: string; to?: string }): string {
  return `stats:${userId}:${input.year ?? ''}:${input.from ?? ''}:${input.to ?? ''}`;
}

export function invalidateStatsCache(userId: number): void {
  const keys = Array.from(statsCache.keys());
  for (const key of keys) {
    if (key.startsWith(`stats:${userId}:`)) {
      statsCache.delete(key);
    }
  }
}

export const statsRouter = router({
  getSummary: protectedProcedure
    .input(
      z.object({
        year: z.number().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const emptyResult: StatsSummary = {
        period: {
          year: input.year,
          from: input.from,
          to: input.to,
        },
        watchCount: 0,
        record: { win: 0, draw: 0, loss: 0, unknown: 0 },
        cost: { total: 0, averagePerMatch: 0 },
      };

      try {
        const db = await getDb();
        if (!db) {
          return emptyResult;
        }

        const userId = ctx.user.id;
        
        const cacheKey = getCacheKey(userId, input);
        const cached = statsCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return cached.data;
        }

        const conditions: SQL[] = [
          eq(userMatches.userId, userId),
          eq(userMatches.status, 'attended'),
        ];

        if (input.year) {
          conditions.push(
            sql`EXTRACT(YEAR FROM ${userMatches.date}::date) = ${input.year}`
          );
        } else if (input.from && input.to) {
          conditions.push(
            sql`${userMatches.date} >= ${input.from}`,
            sql`${userMatches.date} <= ${input.to}`
          );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [aggregateResult] = await db
          .select({
            watchCount: sql<number>`COUNT(*)::int`,
            totalCost: sql<number>`COALESCE(SUM(${userMatches.costYen}), 0)::int`,
            wins: sql<number>`COUNT(CASE 
              WHEN ${matches.marinosSide} = 'home' AND ${matches.homeScore} > ${matches.awayScore} THEN 1
              WHEN ${matches.marinosSide} = 'away' AND ${matches.awayScore} > ${matches.homeScore} THEN 1
            END)::int`,
            draws: sql<number>`COUNT(CASE 
              WHEN ${matches.homeScore} = ${matches.awayScore} AND ${matches.homeScore} IS NOT NULL THEN 1
            END)::int`,
            losses: sql<number>`COUNT(CASE 
              WHEN ${matches.marinosSide} = 'home' AND ${matches.homeScore} < ${matches.awayScore} THEN 1
              WHEN ${matches.marinosSide} = 'away' AND ${matches.awayScore} < ${matches.homeScore} THEN 1
            END)::int`,
            unknowns: sql<number>`COUNT(CASE 
              WHEN ${matches.homeScore} IS NULL OR ${matches.awayScore} IS NULL OR ${matches.marinosSide} IS NULL THEN 1
            END)::int`,
          })
          .from(userMatches)
          .leftJoin(matches, eq(userMatches.matchId, matches.id))
          .where(whereClause);

        const watchCount = aggregateResult?.watchCount ?? 0;
        const total = aggregateResult?.totalCost ?? 0;
        const win = aggregateResult?.wins ?? 0;
        const draw = aggregateResult?.draws ?? 0;
        const loss = aggregateResult?.losses ?? 0;
        const unknown = aggregateResult?.unknowns ?? 0;

        const averagePerMatch = watchCount > 0 
          ? Math.round((total / watchCount) * 100) / 100 
          : 0;

        const result: StatsSummary = {
          period: {
            year: input.year,
            from: input.from,
            to: input.to,
          },
          watchCount,
          record: { win, draw, loss, unknown },
          cost: { total, averagePerMatch },
        };

        statsCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return result;
      } catch (error) {
        console.error('[Stats Router] Error getting summary:', error);
        const isDbConnectionError = 
          error instanceof Error && 
          (error.message.includes('ECONNREFUSED') || 
           error.message.includes('connect') ||
           (error as any).cause?.code === 'ECONNREFUSED');
        
        if (isDbConnectionError) {
          return emptyResult;
        }
        throw error;
      }
    }),

  getAvailableYears: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        return {
          success: true,
          years: [],
        };
      }

      const userId = ctx.user.id;
      const results = await db
        .selectDistinct({
          year: sql<number>`EXTRACT(YEAR FROM ${userMatches.date}::date)::int`,
        })
        .from(userMatches)
        .where(
          and(
            eq(userMatches.userId, userId),
            eq(userMatches.status, 'attended')
          )
        )
        .orderBy(sql`EXTRACT(YEAR FROM ${userMatches.date}::date) DESC`);

      const years = results.map((r) => r.year).filter((y): y is number => y !== null);

      return {
        success: true,
        years,
      };
    } catch (error) {
      console.error('[Stats Router] Error getting available years:', error);
      const isDbConnectionError = 
        error instanceof Error && 
        (error.message.includes('ECONNREFUSED') || 
         error.message.includes('connect') ||
         (error as any).cause?.code === 'ECONNREFUSED');
      
      if (isDbConnectionError) {
        return {
          success: true,
          years: [],
        };
      }
      throw error;
    }
  }),
});

export { calculateResult };
