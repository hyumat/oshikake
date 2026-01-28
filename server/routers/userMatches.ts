import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
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
import { userMatches as userMatchesTable } from '../../drizzle/schema';
import { FREE_PLAN_LIMIT, getCurrentSeasonYear, canCreateAttendance, calculatePlanStatus, getPlanLimit } from '../../shared/billing';
import { invalidateStatsCache } from './stats';

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

        invalidateStatsCache(ctx.user.id);

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

        invalidateStatsCache(ctx.user.id);

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

        invalidateStatsCache(ctx.user.id);

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

        const totalCost = input.expenses.transport + input.expenses.ticket + 
                          input.expenses.food + input.expenses.other;
        
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

        await logEvent('attendance_create', ctx.user.id, {
          matchId: input.matchId,
          totalCost,
        }, seasonYear);

        invalidateStatsCache(ctx.user.id);

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

        invalidateStatsCache(ctx.user.id);

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
});
