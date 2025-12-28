import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  getUserMatches,
  getUserMatchById,
  createUserMatch,
  updateUserMatch,
  deleteUserMatch,
  getMatchById,
} from '../db';

export const userMatchesRouter = router({
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
        throw new Error(
          error instanceof Error ? error.message : 'Failed to list user matches'
        );
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
          throw new Error('User match not found');
        }
        return {
          success: true,
          match: userMatch,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting match:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get user match'
        );
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
        throw new Error(
          error instanceof Error ? error.message : 'Failed to add match'
        );
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
        const { id, ...updateData } = input;
        const result = await updateUserMatch(id, ctx.user.id, updateData);

        return {
          success: true,
          message: 'Match updated successfully',
          result,
        };
      } catch (error) {
        console.error('[User Matches Router] Error updating match:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to update match'
        );
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
        throw new Error(
          error instanceof Error ? error.message : 'Failed to delete match'
        );
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
          throw new Error('Match not found');
        }
        return {
          success: true,
          match,
        };
      } catch (error) {
        console.error('[User Matches Router] Error getting match details:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get match details'
        );
      }
    }),
});
