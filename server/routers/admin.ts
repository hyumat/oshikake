import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { eventLogs } from '../../drizzle/schema';
import { desc, sql } from 'drizzle-orm';

export const adminRouter = router({
  getEventLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20).optional(),
        eventName: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can view event logs',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        let query = db
          .select()
          .from(eventLogs)
          .orderBy(desc(eventLogs.createdAt))
          .limit(input.limit || 20);

        if (input.eventName) {
          query = query.where(sql`${eventLogs.eventName} = ${input.eventName}`) as any;
        }

        const logs = await query;

        return {
          success: true,
          logs: logs.map((log) => ({
            id: log.id,
            userId: log.userId,
            eventName: log.eventName,
            eventData: log.eventData ? JSON.parse(log.eventData) : null,
            createdAt: log.createdAt,
          })),
        };
      } catch (error) {
        console.error('[Admin Router] Error fetching event logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch event logs',
        });
      }
    }),

  getBillingEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can view billing events',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        const logs = await db
          .select()
          .from(eventLogs)
          .where(
            sql`${eventLogs.eventName} IN ('payment_succeeded', 'payment_failed', 'subscription_created', 'subscription_updated', 'subscription_deleted')`
          )
          .orderBy(desc(eventLogs.createdAt))
          .limit(input.limit || 10);

        const failedCount = logs.filter((l) => l.eventName === 'payment_failed').length;

        return {
          success: true,
          logs: logs.map((log) => ({
            id: log.id,
            userId: log.userId,
            eventName: log.eventName,
            eventData: log.eventData ? JSON.parse(log.eventData) : null,
            createdAt: log.createdAt,
          })),
          summary: {
            total: logs.length,
            failed: failedCount,
            hasRecentFailures: failedCount > 0,
          },
        };
      } catch (error) {
        console.error('[Admin Router] Error fetching billing events:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch billing events',
        });
      }
    }),
});
