import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { eventLogs, matches } from '../../drizzle/schema';
import { desc, sql, eq, like, or } from 'drizzle-orm';

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

  // === Match Management CRUD ===

  getMatches: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50).optional(),
        offset: z.number().default(0).optional(),
        search: z.string().optional(),
        year: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can manage matches',
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
          .from(matches)
          .orderBy(desc(matches.date))
          .limit(input.limit || 50)
          .offset(input.offset || 0);

        // Apply filters
        const conditions = [];
        if (input.search) {
          conditions.push(
            or(
              like(matches.opponent, `%${input.search}%`),
              like(matches.stadium, `%${input.search}%`),
              like(matches.competition, `%${input.search}%`)
            )
          );
        }
        if (input.year) {
          conditions.push(like(matches.date, `${input.year}-%`));
        }

        if (conditions.length > 0) {
          query = query.where(sql`${conditions[0]}${conditions.slice(1).map(c => sql` AND ${c}`)}`) as any;
        }

        const matchList = await query;

        // Get total count with same filters
        let countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(matches);
        
        if (conditions.length > 0) {
          countQuery = countQuery.where(sql`${conditions[0]}${conditions.slice(1).map(c => sql` AND ${c}`)}`) as any;
        }
        
        const countResult = await countQuery;
        const total = Number(countResult[0]?.count || 0);

        return {
          success: true,
          matches: matchList,
          total,
          hasMore: (input.offset || 0) + matchList.length < total,
        };
      } catch (error) {
        console.error('[Admin Router] Error fetching matches:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch matches',
        });
      }
    }),

  getMatch: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can manage matches',
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
        const [match] = await db
          .select()
          .from(matches)
          .where(eq(matches.id, input.id))
          .limit(1);

        if (!match) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found',
          });
        }

        return { success: true, match };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error fetching match:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch match',
        });
      }
    }),

  createMatch: protectedProcedure
    .input(
      z.object({
        matchId: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        opponent: z.string().min(1),
        homeScore: z.number().nullable().optional(),
        awayScore: z.number().nullable().optional(),
        stadium: z.string().optional(),
        kickoff: z.string().optional(),
        competition: z.string().optional(),
        ticketSalesStart: z.string().optional(),
        notes: z.string().optional(),
        marinosSide: z.enum(['home', 'away']),
        homeTeam: z.string().min(1),
        awayTeam: z.string().min(1),
        status: z.string().optional(),
        roundLabel: z.string().optional(),
        roundNumber: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can manage matches',
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
        const sourceKey = `admin-${input.matchId}`;
        const isResult = input.homeScore !== null && input.awayScore !== null ? 1 : 0;

        const [newMatch] = await db
          .insert(matches)
          .values({
            matchId: input.matchId,
            date: input.date,
            opponent: input.opponent,
            homeScore: input.homeScore ?? null,
            awayScore: input.awayScore ?? null,
            stadium: input.stadium || null,
            kickoff: input.kickoff || null,
            competition: input.competition || null,
            ticketSalesStart: input.ticketSalesStart || null,
            notes: input.notes || null,
            marinosSide: input.marinosSide,
            homeTeam: input.homeTeam,
            awayTeam: input.awayTeam,
            status: input.status || 'Scheduled',
            isResult,
            source: 'admin',
            sourceKey,
            roundLabel: input.roundLabel || null,
            roundNumber: input.roundNumber || null,
          })
          .returning();

        console.log(`[Admin] Match created: ${input.matchId} by user ${ctx.user.id}`);

        return { success: true, match: newMatch };
      } catch (error: any) {
        console.error('[Admin Router] Error creating match:', error);
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Match ID already exists',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create match',
        });
      }
    }),

  updateMatch: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        matchId: z.string().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        opponent: z.string().optional(),
        homeScore: z.number().nullable().optional(),
        awayScore: z.number().nullable().optional(),
        stadium: z.string().nullable().optional(),
        kickoff: z.string().nullable().optional(),
        competition: z.string().nullable().optional(),
        ticketSalesStart: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        marinosSide: z.enum(['home', 'away']).optional(),
        homeTeam: z.string().optional(),
        awayTeam: z.string().optional(),
        status: z.string().nullable().optional(),
        roundLabel: z.string().nullable().optional(),
        roundNumber: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can manage matches',
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
        const { id, ...updateData } = input;

        // Calculate isResult if scores are provided
        const updates: any = { ...updateData, updatedAt: new Date() };
        if ('homeScore' in updateData && 'awayScore' in updateData) {
          updates.isResult = updateData.homeScore !== null && updateData.awayScore !== null ? 1 : 0;
        }

        const [updatedMatch] = await db
          .update(matches)
          .set(updates)
          .where(eq(matches.id, id))
          .returning();

        if (!updatedMatch) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found',
          });
        }

        console.log(`[Admin] Match updated: ${updatedMatch.matchId} by user ${ctx.user.id}`);

        return { success: true, match: updatedMatch };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error updating match:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update match',
        });
      }
    }),

  deleteMatch: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can manage matches',
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
        const [deletedMatch] = await db
          .delete(matches)
          .where(eq(matches.id, input.id))
          .returning();

        if (!deletedMatch) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found',
          });
        }

        console.log(`[Admin] Match deleted: ${deletedMatch.matchId} by user ${ctx.user.id}`);

        return { success: true, matchId: deletedMatch.matchId };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error deleting match:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete match',
        });
      }
    }),
});
