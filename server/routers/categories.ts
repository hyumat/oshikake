import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb, getUserPlan } from '../db';
import { customCategories as customCategoriesTable } from '../../drizzle/schema';

/**
 * Issue #109: Custom Categories Router (Pro-only feature)
 * Allows Pro users to create and manage custom expense categories
 */
export const categoriesRouter = router({
  /**
   * List all custom categories for the current user
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: true, categories: [] };
        }

        const categories = await db.select()
          .from(customCategoriesTable)
          .where(eq(customCategoriesTable.userId, ctx.user.id))
          .orderBy(asc(customCategoriesTable.displayOrder));

        return {
          success: true,
          categories,
        };
      } catch (error) {
        console.error('[Categories Router] Error listing categories:', error);
        return { success: true, categories: [] };
      }
    }),

  /**
   * Create a new custom category (Pro-only)
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(64),
      icon: z.string().max(64).optional(),
      color: z.string().max(32).optional(),
      displayOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user has Pro plan
        const { plan, planExpiresAt } = await getUserPlan(ctx.user.id);
        const isPro = plan === 'pro' && (!planExpiresAt || planExpiresAt > new Date());

        if (!isPro) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Pro限定機能です。プランをアップグレードしてください。',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'データベースが利用できません',
          });
        }

        const result = await db.insert(customCategoriesTable).values({
          userId: ctx.user.id,
          name: input.name,
          icon: input.icon,
          color: input.color,
          displayOrder: input.displayOrder,
        });

        return {
          success: true,
          message: 'カテゴリを作成しました',
          categoryId: Number(result[0].insertId),
        };
      } catch (error) {
        console.error('[Categories Router] Error creating category:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'カテゴリの作成に失敗しました',
        });
      }
    }),

  /**
   * Update an existing custom category
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(64).optional(),
      icon: z.string().max(64).optional(),
      color: z.string().max(32).optional(),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'データベースが利用できません',
          });
        }

        // Verify ownership
        const existing = await db.select()
          .from(customCategoriesTable)
          .where(and(
            eq(customCategoriesTable.id, input.id),
            eq(customCategoriesTable.userId, ctx.user.id)
          ))
          .limit(1);

        if (existing.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'カテゴリが見つかりません',
          });
        }

        const { id, ...updateData } = input;
        await db.update(customCategoriesTable)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(customCategoriesTable.id, id));

        return {
          success: true,
          message: 'カテゴリを更新しました',
        };
      } catch (error) {
        console.error('[Categories Router] Error updating category:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'カテゴリの更新に失敗しました',
        });
      }
    }),

  /**
   * Delete a custom category
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'データベースが利用できません',
          });
        }

        // Verify ownership
        const existing = await db.select()
          .from(customCategoriesTable)
          .where(and(
            eq(customCategoriesTable.id, input.id),
            eq(customCategoriesTable.userId, ctx.user.id)
          ))
          .limit(1);

        if (existing.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'カテゴリが見つかりません',
          });
        }

        await db.delete(customCategoriesTable)
          .where(eq(customCategoriesTable.id, input.id));

        return {
          success: true,
          message: 'カテゴリを削除しました',
        };
      } catch (error) {
        console.error('[Categories Router] Error deleting category:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'カテゴリの削除に失敗しました',
        });
      }
    }),

  /**
   * Reorder categories
   */
  reorder: protectedProcedure
    .input(z.object({
      categoryIds: z.array(z.number()),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'データベースが利用できません',
          });
        }

        // Update display order for each category
        for (let i = 0; i < input.categoryIds.length; i++) {
          await db.update(customCategoriesTable)
            .set({ displayOrder: i })
            .where(and(
              eq(customCategoriesTable.id, input.categoryIds[i]),
              eq(customCategoriesTable.userId, ctx.user.id)
            ));
        }

        return {
          success: true,
          message: 'カテゴリの順序を更新しました',
        };
      } catch (error) {
        console.error('[Categories Router] Error reordering categories:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'カテゴリの並び替えに失敗しました',
        });
      }
    }),
});
