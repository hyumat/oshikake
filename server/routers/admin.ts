import { router, protectedProcedure, getApiPerformanceStats, getApiMetrics } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { eventLogs, matches, users, syncLogs, announcements, userMatches } from '../../drizzle/schema';
import { desc, sql, eq, like, or, and, gte, lte, count } from 'drizzle-orm';

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

  // === System Status ===

  getSystemStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view system status',
      });
    }

    const db = await getDb();
    if (!db) {
      return {
        success: false,
        status: {
          database: 'disconnected',
          userCount: 0,
          matchCount: 0,
          attendanceCount: 0,
          lastSync: null,
          lastSyncStatus: null,
          recentErrors: 0,
        },
      };
    }

    try {
      const [userCountResult] = await db.select({ count: count() }).from(users);
      const [matchCountResult] = await db.select({ count: count() }).from(matches);
      const [attendanceCountResult] = await db.select({ count: count() }).from(userMatches);
      
      const [lastSyncResult] = await db
        .select()
        .from(syncLogs)
        .orderBy(desc(syncLogs.syncedAt))
        .limit(1);

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentErrorsResult] = await db
        .select({ count: count() })
        .from(eventLogs)
        .where(
          and(
            like(eventLogs.eventName, '%failed%'),
            gte(eventLogs.createdAt, oneDayAgo)
          )
        );

      return {
        success: true,
        status: {
          database: 'connected',
          userCount: userCountResult?.count || 0,
          matchCount: matchCountResult?.count || 0,
          attendanceCount: attendanceCountResult?.count || 0,
          lastSync: lastSyncResult?.syncedAt || null,
          lastSyncStatus: lastSyncResult?.status || null,
          recentErrors: recentErrorsResult?.count || 0,
        },
      };
    } catch (error) {
      console.error('[Admin Router] Error fetching system status:', error);
      return {
        success: false,
        status: {
          database: 'error',
          userCount: 0,
          matchCount: 0,
          attendanceCount: 0,
          lastSync: null,
          lastSyncStatus: null,
          recentErrors: 0,
        },
      };
    }
  }),

  // === User Management ===

  getUsers: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50).optional(),
        offset: z.number().default(0).optional(),
        search: z.string().optional(),
        plan: z.enum(['free', 'plus', 'pro']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can view users',
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
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            plan: users.plan,
            planExpiresAt: users.planExpiresAt,
            stripeCustomerId: users.stripeCustomerId,
            stripeSubscriptionId: users.stripeSubscriptionId,
            createdAt: users.createdAt,
            lastSignedIn: users.lastSignedIn,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(input.limit || 50)
          .offset(input.offset || 0);

        const conditions = [];
        if (input.search) {
          conditions.push(
            or(
              like(users.name, `%${input.search}%`),
              like(users.email, `%${input.search}%`)
            )
          );
        }
        if (input.plan) {
          conditions.push(eq(users.plan, input.plan));
        }

        if (conditions.length === 1) {
          query = query.where(conditions[0]) as any;
        } else if (conditions.length > 1) {
          query = query.where(and(...conditions)) as any;
        }

        const userList = await query;

        const [countResult] = await db.select({ count: count() }).from(users);
        const total = countResult?.count || 0;

        return {
          success: true,
          users: userList,
          total,
          hasMore: (input.offset || 0) + userList.length < total,
        };
      } catch (error) {
        console.error('[Admin Router] Error fetching users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
        });
      }
    }),

  updateUserPlan: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        plan: z.enum(['free', 'plus', 'pro']),
        planExpiresAt: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update user plans',
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
        const [updatedUser] = await db
          .update(users)
          .set({
            plan: input.plan,
            planExpiresAt: input.planExpiresAt ? new Date(input.planExpiresAt) : null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, input.userId))
          .returning();

        if (!updatedUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        console.log(`[Admin] User ${input.userId} plan updated to ${input.plan} by admin ${ctx.user.id}`);

        return { success: true, user: updatedUser };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error updating user plan:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user plan',
        });
      }
    }),

  // === Announcements ===

  getAnnouncements: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().default(false).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can view all announcements',
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
          .from(announcements)
          .orderBy(desc(announcements.createdAt));

        if (!input.includeInactive) {
          query = query.where(eq(announcements.isActive, true)) as any;
        }

        const announcementList = await query;

        return { success: true, announcements: announcementList };
      } catch (error) {
        console.error('[Admin Router] Error fetching announcements:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch announcements',
        });
      }
    }),

  createAnnouncement: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        type: z.enum(['info', 'warning', 'success', 'error']).default('info'),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create announcements',
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
        const [newAnnouncement] = await db
          .insert(announcements)
          .values({
            title: input.title,
            content: input.content,
            type: input.type,
            startsAt: input.startsAt ? new Date(input.startsAt) : null,
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
            createdBy: ctx.user.id,
          })
          .returning();

        console.log(`[Admin] Announcement created: ${input.title} by admin ${ctx.user.id}`);

        return { success: true, announcement: newAnnouncement };
      } catch (error) {
        console.error('[Admin Router] Error creating announcement:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create announcement',
        });
      }
    }),

  updateAnnouncement: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        type: z.enum(['info', 'warning', 'success', 'error']).optional(),
        isActive: z.boolean().optional(),
        startsAt: z.string().nullable().optional(),
        endsAt: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update announcements',
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
        const updates: any = { ...updateData, updatedAt: new Date() };
        
        if ('startsAt' in updateData) {
          updates.startsAt = updateData.startsAt ? new Date(updateData.startsAt) : null;
        }
        if ('endsAt' in updateData) {
          updates.endsAt = updateData.endsAt ? new Date(updateData.endsAt) : null;
        }

        const [updated] = await db
          .update(announcements)
          .set(updates)
          .where(eq(announcements.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Announcement not found',
          });
        }

        return { success: true, announcement: updated };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error updating announcement:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update announcement',
        });
      }
    }),

  deleteAnnouncement: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can delete announcements',
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
        const [deleted] = await db
          .delete(announcements)
          .where(eq(announcements.id, input.id))
          .returning();

        if (!deleted) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Announcement not found',
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error deleting announcement:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete announcement',
        });
      }
    }),

  // === API Performance ===

  getApiPerformance: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view API performance',
      });
    }

    const stats = getApiPerformanceStats();
    const recentMetrics = getApiMetrics(50);

    return {
      success: true,
      stats,
      recentMetrics: recentMetrics.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      })),
    };
  }),
});
