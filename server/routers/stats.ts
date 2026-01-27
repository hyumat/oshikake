import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb, getUserPlan } from '../db';
import { userMatches, matches, matchExpenses } from '../../drizzle/schema';
import { eq, and, sql, type SQL } from 'drizzle-orm';
import { getStatsDateLimit } from '../../shared/billing';

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
      const emptyResult = {
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
        const conditions: SQL[] = [
          eq(userMatches.userId, userId),
          eq(userMatches.status, 'attended'),
        ];

        // Issue #78: Freeプランの場合、過去365日の制限を適用
        const { plan, planExpiresAt } = await getUserPlan(userId);
        const statsDateLimit = getStatsDateLimit(plan, planExpiresAt);

        if (statsDateLimit) {
          // Freeプラン: 過去365日のみ
          const limitDateStr = statsDateLimit.toISOString().split('T')[0];
          conditions.push(sql`${userMatches.date} >= ${limitDateStr}`);
        }

        if (input.year) {
          conditions.push(
            sql`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${input.year}`
          );
        } else if (input.from && input.to) {
          conditions.push(
            sql`${userMatches.date} >= ${input.from}`,
            sql`${userMatches.date} <= ${input.to}`
          );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db
          .select({
            userMatchId: userMatches.id,
            costYen: userMatches.costYen,
            matchId: userMatches.matchId,
            homeScore: matches.homeScore,
            awayScore: matches.awayScore,
            marinosSide: matches.marinosSide,
          })
          .from(userMatches)
          .leftJoin(matches, eq(userMatches.matchId, matches.id))
          .where(whereClause);

        const watchCount = results.length;
        let win = 0;
        let draw = 0;
        let loss = 0;
        let unknown = 0;
        let total = 0;

        for (const row of results) {
          const result = calculateResult(
            row.homeScore,
            row.awayScore,
            row.marinosSide
          );
          
          switch (result) {
            case 'win':
              win++;
              break;
            case 'draw':
              draw++;
              break;
            case 'loss':
              loss++;
              break;
            default:
              unknown++;
          }
          
          total += row.costYen ?? 0;
        }

        const averagePerMatch = watchCount > 0 
          ? Math.round((total / watchCount) * 100) / 100 
          : 0;

        return {
          period: {
            year: input.year,
            from: input.from,
            to: input.to,
          },
          watchCount,
          record: { win, draw, loss, unknown },
          cost: { total, averagePerMatch },
        };
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
          year: sql<number>`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d'))`,
        })
        .from(userMatches)
        .where(
          and(
            eq(userMatches.userId, userId),
            eq(userMatches.status, 'attended')
          )
        )
        .orderBy(sql`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) DESC`);

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

  /**
   * Issue #168: Get monthly trend data (watch count and cost per month)
   */
  getMonthlyTrend: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: true, data: [] };
        }

        const userId = ctx.user.id;
        const results = await db
          .select({
            month: sql<number>`MONTH(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d'))`,
            watchCount: sql<number>`COUNT(*)`,
            totalCost: sql<number>`SUM(${userMatches.costYen})`,
          })
          .from(userMatches)
          .where(
            and(
              eq(userMatches.userId, userId),
              eq(userMatches.status, 'attended'),
              sql`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${input.year}`
            )
          )
          .groupBy(sql`MONTH(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d'))`)
          .orderBy(sql`MONTH(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d'))`);

        // Fill in missing months with zero values
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          watchCount: 0,
          totalCost: 0,
        }));

        results.forEach((row) => {
          if (row.month && row.month >= 1 && row.month <= 12) {
            monthlyData[row.month - 1] = {
              month: row.month,
              watchCount: row.watchCount || 0,
              totalCost: row.totalCost || 0,
            };
          }
        });

        return { success: true, data: monthlyData };
      } catch (error) {
        console.error('[Stats Router] Error getting monthly trend:', error);
        return { success: false, data: [] };
      }
    }),

  /**
   * Issue #168: Get category breakdown (expenses by category)
   */
  getCategoryBreakdown: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: true, data: [] };
        }

        const userId = ctx.user.id;

        // Get expenses for attended matches in the specified year
        const results = await db
          .select({
            category: matchExpenses.category,
            totalAmount: sql<number>`SUM(${matchExpenses.amount})`,
            count: sql<number>`COUNT(*)`,
          })
          .from(matchExpenses)
          .innerJoin(userMatches, eq(matchExpenses.userMatchId, userMatches.id))
          .where(
            and(
              eq(matchExpenses.userId, userId),
              eq(userMatches.status, 'attended'),
              sql`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${input.year}`
            )
          )
          .groupBy(matchExpenses.category);

        const categoryData = results.map((row) => ({
          category: row.category,
          amount: row.totalAmount || 0,
          count: row.count || 0,
        }));

        return { success: true, data: categoryData };
      } catch (error) {
        console.error('[Stats Router] Error getting category breakdown:', error);
        return { success: false, data: [] };
      }
    }),
});

export { calculateResult };
