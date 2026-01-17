/**
 * Issue #123: Admin router for perform_id ticket mapping
 * Semi-automatic mapping of matches to J.LEAGUE ticket system perform_ids
 */

import { z } from 'zod';
import { adminProcedure, router } from '../_core/trpc';
import { db } from '../db';
import { matches } from '../../drizzle/schema';
import { eq, and, or, isNull, gte } from 'drizzle-orm';

export const adminRouter = router({
  /**
   * Get matches that need perform_id mapping
   * Returns future matches without performId or with status="suggested"
   */
  getMatchesForMapping: adminProcedure.query(async () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get future matches without performId or with suggested status
    const matchesNeedingMapping = await db.query.matches.findMany({
      where: and(
        gte(matches.date, today), // Future matches only
        or(
          isNull(matches.performId), // No performId
          eq(matches.performIdStatus, 'suggested') // Or suggested status
        )
      ),
      orderBy: (matches, { asc }) => [asc(matches.date)],
      limit: 100,
    });

    return {
      matches: matchesNeedingMapping,
      count: matchesNeedingMapping.length,
    };
  }),

  /**
   * Get all approved perform_id mappings
   * For reviewing and editing existing mappings
   */
  getApprovedMappings: adminProcedure.query(async () => {
    const approvedMappings = await db.query.matches.findMany({
      where: eq(matches.performIdStatus, 'approved'),
      orderBy: (matches, { desc }) => [desc(matches.date)],
      limit: 200,
    });

    return {
      mappings: approvedMappings,
      count: approvedMappings.length,
    };
  }),

  /**
   * Save perform_id mapping (suggested or approved)
   * Updates match with performId and status
   */
  savePerformIdMapping: adminProcedure
    .input(
      z.object({
        matchId: z.string(), // matches.matchId (not id)
        performId: z.string().min(1, 'perform_id is required'),
        status: z.enum(['suggested', 'approved']),
      })
    )
    .mutation(async ({ input }) => {
      // Update match with performId and status
      await db
        .update(matches)
        .set({
          performId: input.performId,
          performIdStatus: input.status,
          updatedAt: new Date(),
        })
        .where(eq(matches.matchId, input.matchId));

      console.log(`[Admin] Saved performId mapping: ${input.matchId} -> ${input.performId} (${input.status})`);

      return {
        success: true,
        matchId: input.matchId,
        performId: input.performId,
        status: input.status,
      };
    }),

  /**
   * Delete perform_id mapping
   * Removes performId and status from match
   */
  deletePerformIdMapping: adminProcedure
    .input(
      z.object({
        matchId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Clear performId and status
      await db
        .update(matches)
        .set({
          performId: null,
          performIdStatus: null,
          updatedAt: new Date(),
        })
        .where(eq(matches.matchId, input.matchId));

      console.log(`[Admin] Deleted performId mapping: ${input.matchId}`);

      return {
        success: true,
        matchId: input.matchId,
      };
    }),

  /**
   * Bulk approve suggested mappings
   * Approves multiple suggested mappings at once
   */
  bulkApproveMappings: adminProcedure
    .input(
      z.object({
        matchIds: z.array(z.string()).min(1, 'At least one matchId required'),
      })
    )
    .mutation(async ({ input }) => {
      let approvedCount = 0;

      // Update each match to approved status
      for (const matchId of input.matchIds) {
        const match = await db.query.matches.findFirst({
          where: and(
            eq(matches.matchId, matchId),
            eq(matches.performIdStatus, 'suggested')
          ),
        });

        if (match && match.performId) {
          await db
            .update(matches)
            .set({
              performIdStatus: 'approved',
              updatedAt: new Date(),
            })
            .where(eq(matches.matchId, matchId));

          approvedCount++;
        }
      }

      console.log(`[Admin] Bulk approved ${approvedCount} performId mappings`);

      return {
        success: true,
        approvedCount,
        totalRequested: input.matchIds.length,
      };
    }),
});
