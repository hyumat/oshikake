import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb, getUserPlan } from '../db';
import { userMatches, matches, matchExpenses } from '../../drizzle/schema';
import { eq, and, sql, type SQL, desc, gte, lte } from 'drizzle-orm';
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

  /**
   * Issue #173: Get monthly report data for a specific month
   * Returns detailed report including: watch count, cost breakdown, HOME/AWAY split,
   * top 3 categories, and rule-based commentary
   */
  getMonthlyReport: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number().min(1).max(12) }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            data: null,
          };
        }

        const userId = ctx.user.id;
        const { year, month } = input;

        // Get matches for the specified month
        const attendedMatches = await db
          .select({
            userMatchId: userMatches.id,
            costYen: userMatches.costYen,
            matchId: userMatches.matchId,
            date: userMatches.date,
            homeScore: matches.homeScore,
            awayScore: matches.awayScore,
            marinosSide: matches.marinosSide,
            opponent: matches.opponent,
            stadium: matches.stadium,
          })
          .from(userMatches)
          .leftJoin(matches, eq(userMatches.matchId, matches.id))
          .where(
            and(
              eq(userMatches.userId, userId),
              eq(userMatches.status, 'attended'),
              sql`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${year}`,
              sql`MONTH(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${month}`
            )
          );

        // Calculate basic stats
        const watchCount = attendedMatches.length;
        let totalCost = 0;
        let homeCount = 0;
        let awayCount = 0;
        let win = 0;
        let draw = 0;
        let loss = 0;

        for (const match of attendedMatches) {
          totalCost += match.costYen ?? 0;
          if (match.marinosSide === 'home') homeCount++;
          if (match.marinosSide === 'away') awayCount++;

          const result = calculateResult(match.homeScore, match.awayScore, match.marinosSide);
          if (result === 'win') win++;
          else if (result === 'draw') draw++;
          else if (result === 'loss') loss++;
        }

        const averagePerMatch = watchCount > 0 ? Math.round(totalCost / watchCount) : 0;

        // Get category breakdown for the month
        const categoryResults = await db
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
              sql`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${year}`,
              sql`MONTH(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${month}`
            )
          )
          .groupBy(matchExpenses.category)
          .orderBy(sql`SUM(${matchExpenses.amount}) DESC`);

        // Get top 3 categories
        const topCategories = categoryResults.slice(0, 3).map((cat) => ({
          category: cat.category,
          amount: cat.totalAmount || 0,
          count: cat.count || 0,
          percentage: totalCost > 0 ? Math.round(((cat.totalAmount || 0) / totalCost) * 100) : 0,
        }));

        // Generate rule-based commentary
        const commentary: string[] = [];
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        const monthName = monthNames[month - 1];

        if (watchCount === 0) {
          commentary.push(`${year}年${monthName}は観戦記録がありませんでした。`);
        } else {
          // Basic summary
          commentary.push(`${year}年${monthName}は${watchCount}試合を観戦し、${win}勝${draw}分${loss}敗でした。`);

          // Cost comment
          if (totalCost > 0) {
            commentary.push(`総費用は¥${totalCost.toLocaleString()}、1試合あたり平均¥${averagePerMatch.toLocaleString()}でした。`);
          }

          // HOME/AWAY comment
          if (homeCount > 0 || awayCount > 0) {
            const homeAwayText = homeCount > awayCount
              ? `ホーム観戦が中心（ホーム${homeCount}試合、アウェイ${awayCount}試合）でした。`
              : awayCount > homeCount
                ? `アウェイ遠征が多め（ホーム${homeCount}試合、アウェイ${awayCount}試合）でした。`
                : `ホーム・アウェイ均等（各${homeCount}試合）でした。`;
            commentary.push(homeAwayText);
          }

          // Top category comment
          if (topCategories.length > 0) {
            const labels: Record<string, string> = {
              transport: '交通費',
              ticket: 'チケット代',
              food: '飲食費',
              other: 'その他',
            };
            const topCat = topCategories[0];
            commentary.push(`最も費用がかかったのは${labels[topCat.category] || topCat.category}（¥${topCat.amount.toLocaleString()}、${topCat.percentage}%）でした。`);
          }
        }

        return {
          success: true,
          data: {
            year,
            month,
            monthName: monthNames[month - 1],
            watchCount,
            record: { win, draw, loss },
            cost: {
              total: totalCost,
              averagePerMatch,
            },
            homeAwayBreakdown: {
              home: homeCount,
              away: awayCount,
            },
            topCategories,
            commentary,
            matches: attendedMatches.map((m) => ({
              date: m.date,
              opponent: m.opponent,
              stadium: m.stadium,
              cost: m.costYen,
              result: calculateResult(m.homeScore, m.awayScore, m.marinosSide),
            })),
          },
        };
      } catch (error) {
        console.error('[Stats Router] Error getting monthly report:', error);
        return { success: false, data: null };
      }
    }),

  /**
   * Issue #173: Get available months with data for a given year
   */
  getAvailableMonths: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: true, months: [] };
        }

        const userId = ctx.user.id;
        const results = await db
          .selectDistinct({
            month: sql<number>`MONTH(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d'))`,
          })
          .from(userMatches)
          .where(
            and(
              eq(userMatches.userId, userId),
              eq(userMatches.status, 'attended'),
              sql`YEAR(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) = ${input.year}`
            )
          )
          .orderBy(sql`MONTH(STR_TO_DATE(${userMatches.date}, '%Y-%m-%d')) DESC`);

        const months = results.map((r) => r.month).filter((m): m is number => m !== null);
        return { success: true, months };
      } catch (error) {
        console.error('[Stats Router] Error getting available months:', error);
        return { success: false, months: [] };
      }
    }),

  // Issue #169: Get expense history with filters
  getExpenseHistory: protectedProcedure
    .input(
      z.object({
        category: z.enum(['transport', 'ticket', 'food', 'other']).optional(),
        minAmount: z.number().optional(),
        maxAmount: z.number().optional(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            expenses: [],
          };
        }

        const userId = ctx.user.id;
        const conditions: SQL[] = [eq(matchExpenses.userId, userId)];

        // Category filter
        if (input.category) {
          conditions.push(eq(matchExpenses.category, input.category));
        }

        // Amount range filters
        if (input.minAmount !== undefined) {
          conditions.push(gte(matchExpenses.amount, input.minAmount));
        }
        if (input.maxAmount !== undefined) {
          conditions.push(lte(matchExpenses.amount, input.maxAmount));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db
          .select({
            id: matchExpenses.id,
            category: matchExpenses.category,
            amount: matchExpenses.amount,
            note: matchExpenses.note,
            createdAt: matchExpenses.createdAt,
            matchId: userMatches.matchId,
            matchDate: userMatches.date,
            opponent: matches.opponent,
          })
          .from(matchExpenses)
          .leftJoin(userMatches, eq(matchExpenses.userMatchId, userMatches.id))
          .leftJoin(matches, eq(userMatches.matchId, matches.id))
          .where(whereClause)
          .orderBy(desc(matchExpenses.createdAt))
          .limit(input.limit);

        return {
          success: true,
          expenses: results,
        };
      } catch (error) {
        console.error('[Stats Router] Error getting expense history:', error);
        return {
          success: false,
          expenses: [],
        };
      }
    }),
});

export { calculateResult };
