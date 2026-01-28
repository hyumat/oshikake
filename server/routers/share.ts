import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { getDb, getUserMatches, getExpensesByUserMatch } from '../db';
import { shareTokens, users } from '../../drizzle/schema';
import { randomBytes } from 'crypto';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export const shareRouter = router({
  create: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const token = generateToken();
      
      const [result] = await db.insert(shareTokens).values({
        userId: ctx.user.id,
        token,
        year: input?.year ?? null,
        enabled: true,
      }).returning();

      return {
        success: true,
        token: result.token,
        id: result.id,
      };
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const tokens = await db.select()
        .from(shareTokens)
        .where(eq(shareTokens.userId, ctx.user.id))
        .orderBy(shareTokens.createdAt);

      return tokens;
    }),

  toggle: protectedProcedure
    .input(z.object({
      id: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [existing] = await db.select()
        .from(shareTokens)
        .where(and(
          eq(shareTokens.id, input.id),
          eq(shareTokens.userId, ctx.user.id)
        ));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share token not found',
        });
      }

      await db.update(shareTokens)
        .set({ enabled: input.enabled })
        .where(eq(shareTokens.id, input.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [existing] = await db.select()
        .from(shareTokens)
        .where(and(
          eq(shareTokens.id, input.id),
          eq(shareTokens.userId, ctx.user.id)
        ));

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share token not found',
        });
      }

      await db.delete(shareTokens)
        .where(eq(shareTokens.id, input.id));

      return { success: true };
    }),

  getPublicSummary: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const [shareToken] = await db.select()
        .from(shareTokens)
        .where(eq(shareTokens.token, input.token));

      if (!shareToken) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Share link not found',
        });
      }

      if (!shareToken.enabled) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This share link has been disabled',
        });
      }

      if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This share link has expired',
        });
      }

      const [user] = await db.select({
        id: users.id,
        name: users.name,
      }).from(users).where(eq(users.id, shareToken.userId));

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const matches = await getUserMatches(user.id, { status: 'attended' });
      
      let filteredMatches = matches;
      if (shareToken.year) {
        filteredMatches = matches.filter((m: { match?: { date?: string } }) => {
          if (!m.match?.date) return false;
          const matchYear = new Date(m.match.date).getFullYear();
          return matchYear === shareToken.year;
        });
      }

      const record = { win: 0, draw: 0, loss: 0 };
      let totalCost = 0;

      for (const m of filteredMatches) {
        const match = m as { id: number; match?: { resultWdl?: string } };
        if (match.match?.resultWdl === 'W') record.win++;
        else if (match.match?.resultWdl === 'D') record.draw++;
        else if (match.match?.resultWdl === 'L') record.loss++;
        
        const expenses = await getExpensesByUserMatch(match.id, user.id);
        totalCost += expenses.reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
      }

      const watchCount = filteredMatches.length;
      const averageCost = watchCount > 0 ? Math.round(totalCost / watchCount) : 0;

      return {
        userName: user.name ?? 'サポーター',
        year: shareToken.year,
        stats: {
          watchCount,
          record,
          cost: {
            total: totalCost,
            averagePerMatch: averageCost,
          },
        },
      };
    }),
});
