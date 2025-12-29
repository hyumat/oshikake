import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { userMatches } from '../../drizzle/schema';
import { eq, and, sql, type SQL } from 'drizzle-orm';

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
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: true,
            watchCount: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            unknown: 0,
            costTotal: 0,
            costAverage: 0,
          };
        }

        const userId = ctx.user.id;
        const conditions: SQL[] = [
          eq(userMatches.userId, userId),
          eq(userMatches.status, 'attended'),
        ];

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
            id: userMatches.id,
            resultWdl: userMatches.resultWdl,
            costYen: userMatches.costYen,
          })
          .from(userMatches)
          .where(whereClause);

        const watchCount = results.length;
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let unknown = 0;
        let costTotal = 0;

        for (const match of results) {
          switch (match.resultWdl) {
            case 'W':
              wins++;
              break;
            case 'D':
              draws++;
              break;
            case 'L':
              losses++;
              break;
            default:
              unknown++;
          }
          costTotal += match.costYen ?? 0;
        }

        const costAverage = watchCount > 0 ? Math.round(costTotal / watchCount) : 0;

        return {
          success: true,
          watchCount,
          wins,
          draws,
          losses,
          unknown,
          costTotal,
          costAverage,
        };
      } catch (error) {
        console.error('[Stats Router] Error getting summary:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get stats summary'
        );
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
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get available years'
      );
    }
  }),
});
