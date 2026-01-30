/**
 * Issue #79: 遠征傾向集約 (travel_intents) tRPC Router
 *
 * - upsert: ユーザー×試合ごとの遠征意向を登録/更新
 * - trends: 試合ごとの集約データを返す（k-匿名性・5%丸め・少数カテゴリ統合）
 */

import { z } from 'zod';
import { eq, and, sql, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { travelIntents } from '../../drizzle/schema';

/** k-匿名性の閾値: totalCount がこの値未満の場合は集約データを返さない */
const K_ANONYMITY_THRESHOLD = 20;

/** 割合を5%刻みに丸める */
function roundToStep(pct: number, step = 5): number {
  return Math.round(pct / step) * step;
}

/**
 * カテゴリ別の割合を算出し、5%丸め＋少数カテゴリを "other" に統合する。
 * @param rows  DB から取得した { value, count } の配列
 * @param total 全レコード数
 * @param minPct この割合(%)未満のカテゴリは "other" にまとめる (default 5)
 */
function buildBreakdown(
  rows: { value: string; count: number }[],
  total: number,
  minPct = 5,
): Record<string, number> {
  if (total === 0) return {};

  const breakdown: Record<string, number> = {};
  let otherPct = 0;

  for (const row of rows) {
    const raw = (row.count / total) * 100;
    const rounded = roundToStep(raw);
    if (rounded < minPct) {
      otherPct += rounded;
    } else {
      breakdown[row.value] = rounded;
    }
  }

  if (otherPct > 0) {
    breakdown['other'] = roundToStep(otherPct);
  }

  return breakdown;
}

// Zod schemas matching the DB enums
const lodgingSchema = z.enum(['day_trip', 'hotel', 'friend', 'night_bus', 'other']);
const transportSchema = z.enum(['shinkansen', 'car', 'bus', 'airplane', 'local_train', 'other']);
const budgetSchema = z.enum(['under_5k', '5k_10k', '10k_20k', '20k_30k', '30k_50k', 'over_50k']);

export const travelIntentsRouter = router({
  /**
   * Upsert: ユーザー×試合ごとの遠征意向を登録/更新
   * user×match の一意制約に基づき、既存レコードがあれば更新する
   */
  upsert: protectedProcedure
    .input(
      z.object({
        matchId: z.number(),
        lodging: lodgingSchema,
        transport: transportSchema,
        budget: budgetSchema,
        arrivalTime: z.string().max(32).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const userId = ctx.user.id;

      // Check if a record already exists for this user×match
      const existing = await db
        .select({ id: travelIntents.id })
        .from(travelIntents)
        .where(
          and(
            eq(travelIntents.userId, userId),
            eq(travelIntents.matchId, input.matchId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(travelIntents)
          .set({
            lodging: input.lodging,
            transport: input.transport,
            budget: input.budget,
            arrivalTime: input.arrivalTime ?? null,
            updatedAt: new Date(),
          })
          .where(eq(travelIntents.id, existing[0].id));

        return { success: true, id: existing[0].id, action: 'updated' as const };
      }

      // Insert new record
      const [inserted] = await db
        .insert(travelIntents)
        .values({
          userId,
          matchId: input.matchId,
          lodging: input.lodging,
          transport: input.transport,
          budget: input.budget,
          arrivalTime: input.arrivalTime ?? null,
        })
        .returning({ id: travelIntents.id });

      return { success: true, id: inserted.id, action: 'created' as const };
    }),

  /**
   * 自分の意向を取得（特定試合）
   */
  mine: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return { success: true, intent: null };
      }

      const results = await db
        .select()
        .from(travelIntents)
        .where(
          and(
            eq(travelIntents.userId, ctx.user.id),
            eq(travelIntents.matchId, input.matchId),
          ),
        )
        .limit(1);

      return {
        success: true,
        intent: results.length > 0 ? results[0] : null,
      };
    }),

  /**
   * Trends: 試合ごとの遠征傾向集約
   *
   * プライバシー保護:
   * - k-匿名性: totalCount < K の場合はデータを返さない
   * - 5%刻みで丸め
   * - 少数カテゴリは "other" に統合
   */
  trends: publicProcedure
    .input(
      z.object({
        matchId: z.number(),
        /** フィルタ: 宿泊形態で絞り込み */
        lodging: lodgingSchema.optional(),
        /** フィルタ: 交通手段で絞り込み */
        transport: transportSchema.optional(),
        /** フィルタ: 予算帯で絞り込み */
        budget: budgetSchema.optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          success: true,
          available: false,
          reason: 'database_unavailable',
          totalCount: 0,
          lodgingBreakdown: {},
          transportBreakdown: {},
          budgetBreakdown: {},
        };
      }

      // Build WHERE conditions
      const conditions = [eq(travelIntents.matchId, input.matchId)];
      if (input.lodging) conditions.push(eq(travelIntents.lodging, input.lodging));
      if (input.transport) conditions.push(eq(travelIntents.transport, input.transport));
      if (input.budget) conditions.push(eq(travelIntents.budget, input.budget));

      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

      // Get total count
      const [{ totalCount }] = await db
        .select({ totalCount: count() })
        .from(travelIntents)
        .where(whereClause);

      // k-anonymity check
      if (totalCount < K_ANONYMITY_THRESHOLD) {
        return {
          success: true,
          available: false,
          reason: 'insufficient_data',
          totalCount,
          lodgingBreakdown: {},
          transportBreakdown: {},
          budgetBreakdown: {},
        };
      }

      // Aggregate breakdowns in parallel
      const [lodgingRows, transportRows, budgetRows] = await Promise.all([
        db
          .select({
            value: travelIntents.lodging,
            count: count(),
          })
          .from(travelIntents)
          .where(whereClause)
          .groupBy(travelIntents.lodging),

        db
          .select({
            value: travelIntents.transport,
            count: count(),
          })
          .from(travelIntents)
          .where(whereClause)
          .groupBy(travelIntents.transport),

        db
          .select({
            value: travelIntents.budget,
            count: count(),
          })
          .from(travelIntents)
          .where(whereClause)
          .groupBy(travelIntents.budget),
      ]);

      return {
        success: true,
        available: true,
        totalCount,
        lodgingBreakdown: buildBreakdown(lodgingRows, totalCount),
        transportBreakdown: buildBreakdown(transportRows, totalCount),
        budgetBreakdown: buildBreakdown(budgetRows, totalCount),
      };
    }),

  /**
   * 自分の意向を削除
   */
  delete: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      await db
        .delete(travelIntents)
        .where(
          and(
            eq(travelIntents.userId, ctx.user.id),
            eq(travelIntents.matchId, input.matchId),
          ),
        );

      return { success: true };
    }),
});
