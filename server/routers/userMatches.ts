import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import {
  getUserMatches,
  getUserMatchById,
  createUserMatch,
  updateUserMatch,
  deleteUserMatch,
  getMatchById,
  getDb,
  createExpense,
  deleteExpensesByUserMatch,
  getExpensesByUserMatch,
  logEvent,
  getTotalAttendanceCount,
  getUserPlan,
} from '../db';
import { userMatches as userMatchesTable, matchExpenses as matchExpensesTable } from '../../drizzle/schema';
import { FREE_PLAN_LIMIT, getCurrentSeasonYear, canCreateAttendance, calculatePlanStatus, getPlanLimit } from '../../shared/billing';

export const userMatchesRouter = router({
  /**
   * Get user's plan status and attendance limits
   */
  getPlanStatus: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const seasonYear = getCurrentSeasonYear();
        const { plan, planExpiresAt } = await getUserPlan(ctx.user.id);
        const attendanceCount = await getTotalAttendanceCount(ctx.user.id);
        
        const status = calculatePlanStatus(plan, planExpiresAt, attendanceCount);
        
        return {
          success: true,
          ...status,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting plan status:', error);
        return {
          success: true,
          plan: 'free' as const,
          effectivePlan: 'free' as const,
          isPro: false,
          isPlus: false,
          seasonYear: getCurrentSeasonYear(),
          attendanceCount: 0,
          limit: FREE_PLAN_LIMIT,
          remaining: FREE_PLAN_LIMIT,
          canCreate: true,
        };
      }
    }),

  /**
   * Get all user matches (attended and planned)
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['planned', 'attended']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const matches = await getUserMatches(ctx.user.id, {
          status: input.status,
        });
        return {
          success: true,
          matches,
          count: matches.length,
        };
      } catch (error) {
        console.error('[User Matches Router] Error listing matches:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to list user matches'
        });
      }
    }),

  /**
   * Get a single user match by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const userMatch = await getUserMatchById(input.id, ctx.user.id);
        if (!userMatch) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User match not found'
          });
        }
        return {
          success: true,
          match: userMatch,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting match:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get user match'
        });
      }
    }),

  /**
   * Add a match to user's log
   */
  add: protectedProcedure
    .input(
      z.object({
        matchId: z.number().optional(),
        date: z.string(),
        opponent: z.string(),
        kickoff: z.string().optional(),
        competition: z.string().optional(),
        stadium: z.string().optional(),
        marinosSide: z.enum(['home', 'away']).optional(),
        status: z.enum(['planned', 'attended']).default('planned'),
        resultWdl: z.enum(['W', 'D', 'L']).optional(),
        marinosGoals: z.number().optional(),
        opponentGoals: z.number().optional(),
        costYen: z.number().default(0),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.status === 'attended') {
          const { plan, planExpiresAt } = await getUserPlan(ctx.user.id);
          const currentCount = await getTotalAttendanceCount(ctx.user.id);
          
          if (!canCreateAttendance(plan, planExpiresAt, currentCount)) {
            const limit = getPlanLimit(plan, planExpiresAt);
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'LIMIT_REACHED',
              cause: { type: 'LIMIT_REACHED', currentCount, limit }
            });
          }
        }

        const result = await createUserMatch(ctx.user.id, {
          matchId: input.matchId,
          date: input.date,
          opponent: input.opponent,
          kickoff: input.kickoff,
          competition: input.competition,
          stadium: input.stadium,
          marinosSide: input.marinosSide,
          status: input.status,
          resultWdl: input.resultWdl,
          marinosGoals: input.marinosGoals,
          opponentGoals: input.opponentGoals,
          costYen: input.costYen,
          note: input.note,
        });

        return {
          success: true,
          message: 'Match added successfully',
          result,
        };
      } catch (error) {
        console.error('[User Matches Router] Error adding match:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to add match'
        });
      }
    }),

  /**
   * Update a user match
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(['planned', 'attended']).optional(),
        resultWdl: z.enum(['W', 'D', 'L']).optional(),
        marinosGoals: z.number().optional(),
        opponentGoals: z.number().optional(),
        costYen: z.number().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.status === 'attended') {
          const existingMatch = await getUserMatchById(input.id, ctx.user.id);
          const isNewAttendance = !existingMatch || existingMatch.status !== 'attended';
          
          if (isNewAttendance) {
            const { plan, planExpiresAt } = await getUserPlan(ctx.user.id);
            const currentCount = await getTotalAttendanceCount(ctx.user.id);
            
            if (!canCreateAttendance(plan, planExpiresAt, currentCount)) {
              const limit = getPlanLimit(plan, planExpiresAt);
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'LIMIT_REACHED',
                cause: { type: 'LIMIT_REACHED', currentCount, limit }
              });
            }
          }
        }

        const { id, ...updateData } = input;
        const result = await updateUserMatch(id, ctx.user.id, updateData);

        return {
          success: true,
          message: 'Match updated successfully',
          result,
        };
      } catch (error) {
        console.error('[User Matches Router] Error updating match:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update match'
        });
      }
    }),

  /**
   * Delete a user match
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await deleteUserMatch(input.id, ctx.user.id);

        return {
          success: true,
          message: 'Match deleted successfully',
          result,
        };
      } catch (error) {
        console.error('[User Matches Router] Error deleting match:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete match'
        });
      }
    }),

  /**
   * Get match details (official match data)
   */
  getMatchDetails: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ input }) => {
      try {
        const match = await getMatchById(input.matchId);
        if (!match) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found'
          });
        }
        return {
          success: true,
          match,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting match details:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get match details'
        });
      }
    }),

  /**
   * Get user match by official match ID (for expenses flow)
   */
  getByMatchId: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: true, userMatch: null, expenses: [] };
        }
        
        const results = await db.select()
          .from(userMatchesTable)
          .where(and(
            eq(userMatchesTable.userId, ctx.user.id),
            eq(userMatchesTable.matchId, input.matchId)
          ))
          .limit(1);
        
        const userMatch = results.length > 0 ? results[0] : null;
        
        let expenses: Array<{
          id: number;
          category: 'transport' | 'ticket' | 'food' | 'other';
          amount: number;
          note: string | null;
        }> = [];
        
        if (userMatch) {
          expenses = await getExpensesByUserMatch(userMatch.id, ctx.user.id);
        }
        
        return {
          success: true,
          userMatch,
          expenses,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting by matchId:', error);
        return { success: true, userMatch: null, expenses: [] };
      }
    }),

  /**
   * Get latest attendance record for quick input
   * Issue #169: 爆速入力 - Returns the most recent attendance expenses
   */
  getLatestAttendance: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: true, expenses: [] };
        }

        // Get the most recent attended match
        const results = await db.select()
          .from(userMatchesTable)
          .where(and(
            eq(userMatchesTable.userId, ctx.user.id),
            eq(userMatchesTable.status, 'attended')
          ))
          .orderBy(desc(userMatchesTable.date))
          .limit(1);

        if (results.length === 0) {
          return { success: true, expenses: [] };
        }

        const latestMatch = results[0];
        const expenses = await getExpensesByUserMatch(latestMatch.id, ctx.user.id);

        return {
          success: true,
          expenses,
          matchDate: latestMatch.date,
          opponent: latestMatch.opponent,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting latest attendance:', error);
        return { success: true, expenses: [] };
      }
    }),

  /**
   * Save attendance and expenses for a match
   */
  saveAttendance: protectedProcedure
    .input(z.object({
      matchId: z.number(),
      date: z.string(),
      opponent: z.string(),
      kickoff: z.string().optional(),
      competition: z.string().optional(),
      stadium: z.string().optional(),
      marinosSide: z.enum(['home', 'away']).optional(),
      note: z.string().optional(),
      expenses: z.object({
        transport: z.number().min(0).default(0),
        ticket: z.number().min(0).default(0),
        food: z.number().min(0).default(0),
        other: z.number().min(0).default(0),
      }),
      // Issue #109 Part 2: Custom category expenses
      customExpenses: z.array(z.object({
        categoryId: z.number(),
        amount: z.number().min(0),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database not available'
          });
        }

        // Issue #109 Part 2: Include custom category expenses in total cost
        const customTotal = input.customExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        const totalCost = input.expenses.transport + input.expenses.ticket +
                          input.expenses.food + input.expenses.other + customTotal;
        
        const seasonYear = input.date ? parseInt(input.date.substring(0, 4)) : new Date().getFullYear();
        
        const existingResults = await db.select()
          .from(userMatchesTable)
          .where(and(
            eq(userMatchesTable.userId, ctx.user.id),
            eq(userMatchesTable.matchId, input.matchId)
          ))
          .limit(1);

        const isNewAttendance = existingResults.length === 0 || existingResults[0].status !== 'attended';
        
        if (isNewAttendance) {
          const { plan, planExpiresAt } = await getUserPlan(ctx.user.id);
          const currentCount = await getTotalAttendanceCount(ctx.user.id);
          
          if (!canCreateAttendance(plan, planExpiresAt, currentCount)) {
            const limit = getPlanLimit(plan, planExpiresAt);
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'LIMIT_REACHED',
              cause: { type: 'LIMIT_REACHED', currentCount, limit }
            });
          }
        }

        let userMatchId: number;

        if (existingResults.length > 0) {
          userMatchId = existingResults[0].id;
          await db.update(userMatchesTable)
            .set({
              status: 'attended',
              costYen: totalCost,
              note: input.note ?? null,
              seasonYear,
              updatedAt: new Date(),
            })
            .where(eq(userMatchesTable.id, userMatchId));

          await deleteExpensesByUserMatch(userMatchId, ctx.user.id);
        } else {
          const result = await createUserMatch(ctx.user.id, {
            matchId: input.matchId,
            date: input.date,
            opponent: input.opponent,
            kickoff: input.kickoff,
            competition: input.competition,
            stadium: input.stadium,
            marinosSide: input.marinosSide,
            status: 'attended',
            costYen: totalCost,
            note: input.note,
            seasonYear,
          });
          
          const newResults = await db.select()
            .from(userMatchesTable)
            .where(and(
              eq(userMatchesTable.userId, ctx.user.id),
              eq(userMatchesTable.matchId, input.matchId)
            ))
            .limit(1);
          
          userMatchId = newResults[0]?.id ?? 0;
        }

        const expenseCategories: Array<{ category: 'transport' | 'ticket' | 'food' | 'other'; amount: number }> = [
          { category: 'transport', amount: input.expenses.transport },
          { category: 'ticket', amount: input.expenses.ticket },
          { category: 'food', amount: input.expenses.food },
          { category: 'other', amount: input.expenses.other },
        ];

        for (const exp of expenseCategories) {
          if (exp.amount > 0) {
            await createExpense(ctx.user.id, {
              userMatchId,
              category: exp.category,
              amount: exp.amount,
            });
          }
        }

        // Issue #109 Part 2: Save custom category expenses
        if (input.customExpenses && input.customExpenses.length > 0) {
          for (const customExp of input.customExpenses) {
            if (customExp.amount > 0) {
              await createExpense(ctx.user.id, {
                userMatchId,
                category: 'other', // Use 'other' as base category for custom categories
                amount: customExp.amount,
                customCategoryId: customExp.categoryId,
              });
            }
          }
        }

        await logEvent('attendance_create', ctx.user.id, {
          matchId: input.matchId,
          totalCost,
        }, seasonYear);

        return {
          success: true,
          userMatchId,
          totalCost,
        };
      } catch (error) {
        console.error('[User Matches Router] Error saving attendance:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to save attendance'
        });
      }
    }),

  /**
   * Delete attendance record by official match ID
   */
  deleteByMatchId: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database not available'
          });
        }

        const results = await db.select()
          .from(userMatchesTable)
          .where(and(
            eq(userMatchesTable.userId, ctx.user.id),
            eq(userMatchesTable.matchId, input.matchId)
          ))
          .limit(1);

        if (results.length === 0) {
          return { success: true, message: 'No record found' };
        }

        const userMatchId = results[0].id;
        
        await deleteExpensesByUserMatch(userMatchId, ctx.user.id);
        await deleteUserMatch(userMatchId, ctx.user.id);

        await logEvent('attendance_delete', ctx.user.id, {
          matchId: input.matchId,
        });

        return { success: true, message: 'Deleted successfully' };
      } catch (error) {
        console.error('[User Matches Router] Error deleting by matchId:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to delete attendance'
        });
      }
    }),

  /**
   * Issue #80: Get aggregated trend analysis for other users' plans
   * Returns aggregated expense data for a specific match (k-anonymity compliant)
   */
  getTrendAnalysis: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            message: 'データベースが利用できません',
            hasData: false,
          };
        }

        // Get all planned userMatches for this match (excluding current user)
        const plannedMatches = await db.select()
          .from(userMatchesTable)
          .where(and(
            eq(userMatchesTable.matchId, input.matchId),
            eq(userMatchesTable.status, 'planned'),
            sql`${userMatchesTable.userId} != ${ctx.user.id}`
          ));

        // k-anonymity: Require minimum 5 records
        const MIN_RECORDS = 5;
        if (plannedMatches.length < MIN_RECORDS) {
          return {
            success: true,
            hasData: false,
            message: `プライバシー保護のため、${MIN_RECORDS}人以上のデータが必要です（現在: ${plannedMatches.length}人）`,
            recordCount: plannedMatches.length,
            requiredCount: MIN_RECORDS,
          };
        }

        // Get all expenses for these userMatches
        const userMatchIds = plannedMatches.map(m => m.id);
        const expenses = await db.select()
          .from(matchExpensesTable)
          .where(sql`${matchExpensesTable.userMatchId} IN (${sql.raw(userMatchIds.join(','))})`);

        // Aggregate by category
        type CategoryStats = {
          count: number;
          total: number;
          average: number;
          min: number;
          max: number;
        };

        const categories: Record<string, CategoryStats> = {
          transport: { count: 0, total: 0, average: 0, min: Infinity, max: 0 },
          ticket: { count: 0, total: 0, average: 0, min: Infinity, max: 0 },
          food: { count: 0, total: 0, average: 0, min: Infinity, max: 0 },
          other: { count: 0, total: 0, average: 0, min: Infinity, max: 0 },
        };

        for (const expense of expenses) {
          const cat = categories[expense.category];
          if (cat) {
            cat.count++;
            cat.total += expense.amount;
            cat.min = Math.min(cat.min, expense.amount);
            cat.max = Math.max(cat.max, expense.amount);
          }
        }

        // Calculate averages and fix Infinity values
        for (const cat of Object.values(categories)) {
          if (cat.count > 0) {
            cat.average = Math.round(cat.total / cat.count);
            if (cat.min === Infinity) cat.min = 0;
          } else {
            cat.min = 0;
          }
        }

        // Calculate budget distribution (by total cost per person)
        const budgetRanges = {
          '0-5000': 0,
          '5000-10000': 0,
          '10000-15000': 0,
          '15000+': 0,
        };

        for (const match of plannedMatches) {
          const total = match.costYen || 0;
          if (total === 0) continue;
          if (total < 5000) budgetRanges['0-5000']++;
          else if (total < 10000) budgetRanges['5000-10000']++;
          else if (total < 15000) budgetRanges['10000-15000']++;
          else budgetRanges['15000+']++;
        }

        return {
          success: true,
          hasData: true,
          recordCount: plannedMatches.length,
          categories: {
            transport: {
              average: categories.transport.average,
              min: categories.transport.min,
              max: categories.transport.max,
              userCount: categories.transport.count,
            },
            ticket: {
              average: categories.ticket.average,
              min: categories.ticket.min,
              max: categories.ticket.max,
              userCount: categories.ticket.count,
            },
            food: {
              average: categories.food.average,
              min: categories.food.min,
              max: categories.food.max,
              userCount: categories.food.count,
            },
            other: {
              average: categories.other.average,
              min: categories.other.min,
              max: categories.other.max,
              userCount: categories.other.count,
            },
          },
          budgetDistribution: budgetRanges,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting trend analysis:', error);
        return {
          success: false,
          message: 'データの取得に失敗しました',
          hasData: false,
        };
      }
    }),
});
