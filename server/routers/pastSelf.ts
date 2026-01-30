/**
 * Issue #110: 過去の自分 (Past Self) tRPC Router
 *
 * Plus以上のユーザーに対し、同一スタジアムまたは同一対戦相手の
 * 過去の観戦記録（最大3件）を返す。
 */

import { z } from 'zod';
import { eq, and, or, ne, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb, getUserPlan } from '../db';
import { userMatches as userMatchesTable } from '../../drizzle/schema';
import { canUseFeature } from '../../shared/billing';

const MAX_PAST_RECORDS = 3;

export const pastSelfRouter = router({
  /**
   * 過去の自分を取得
   *
   * 指定した試合と同じスタジアムまたは同じ対戦相手の
   * 過去の観戦済み記録を最大3件返す。
   * Plus/Pro プランのみ利用可能。
   */
  get: protectedProcedure
    .input(
      z.object({
        /** 現在の試合ID（この試合自体は除外する） */
        matchId: z.number(),
        /** 対戦相手 */
        opponent: z.string(),
        /** スタジアム */
        stadium: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Plan gate
      const { plan, planExpiresAt } = await getUserPlan(ctx.user.id);
      if (!canUseFeature(plan, planExpiresAt, 'pastSelf')) {
        return {
          success: true,
          available: false,
          reason: 'plan_required' as const,
          records: [],
        };
      }

      const db = await getDb();
      if (!db) {
        return {
          success: true,
          available: false,
          reason: 'database_unavailable' as const,
          records: [],
        };
      }

      // 同一対戦相手 OR 同一スタジアムで、観戦済みの過去記録を取得
      const conditions = [
        eq(userMatchesTable.userId, ctx.user.id),
        eq(userMatchesTable.status, 'attended'),
      ];

      // matchId が設定されている場合は現在の試合を除外
      const matchFilter = input.matchId
        ? ne(userMatchesTable.matchId, input.matchId)
        : undefined;

      const similarityConditions = [
        eq(userMatchesTable.opponent, input.opponent),
      ];
      if (input.stadium) {
        similarityConditions.push(eq(userMatchesTable.stadium, input.stadium));
      }

      const allConditions = matchFilter
        ? [...conditions, matchFilter, or(...similarityConditions)!]
        : [...conditions, or(...similarityConditions)!];

      const records = await db
        .select({
          id: userMatchesTable.id,
          matchId: userMatchesTable.matchId,
          date: userMatchesTable.date,
          opponent: userMatchesTable.opponent,
          stadium: userMatchesTable.stadium,
          marinosSide: userMatchesTable.marinosSide,
          resultWdl: userMatchesTable.resultWdl,
          marinosGoals: userMatchesTable.marinosGoals,
          opponentGoals: userMatchesTable.opponentGoals,
          costYen: userMatchesTable.costYen,
          note: userMatchesTable.note,
          competition: userMatchesTable.competition,
        })
        .from(userMatchesTable)
        .where(and(...allConditions))
        .orderBy(desc(userMatchesTable.date))
        .limit(MAX_PAST_RECORDS);

      return {
        success: true,
        available: true,
        records,
      };
    }),
});
