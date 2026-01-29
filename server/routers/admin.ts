import { router, protectedProcedure, getApiPerformanceStats, getApiMetrics } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { eventLogs, matches, users, syncLogs, announcements, userMatches, teams, seasons } from '../../drizzle/schema';
import { desc, sql, eq, like, or, and, gte, lte, lt, count, asc, isNull, not } from 'drizzle-orm';

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

  // === Team Management (Issue #211) ===

  getTeams: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view teams',
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
      const teamList = await db.select().from(teams).orderBy(asc(teams.name));
      return { success: true, teams: teamList };
    } catch (error) {
      console.error('[Admin Router] Error fetching teams:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch teams',
      });
    }
  }),

  createTeam: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
        aliases: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create teams',
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
        const [newTeam] = await db
          .insert(teams)
          .values({
            name: input.name,
            slug: input.slug,
            aliases: input.aliases || null,
          })
          .returning();

        console.log(`[Admin] Team created: ${input.slug} by user ${ctx.user.id}`);
        return { success: true, team: newTeam };
      } catch (error: any) {
        console.error('[Admin Router] Error creating team:', error);
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Team slug already exists',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create team',
        });
      }
    }),

  updateTeam: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
        aliases: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update teams',
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
        const [updatedTeam] = await db
          .update(teams)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(teams.id, id))
          .returning();

        if (!updatedTeam) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        console.log(`[Admin] Team updated: ${updatedTeam.slug} by user ${ctx.user.id}`);
        return { success: true, team: updatedTeam };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error updating team:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update team',
        });
      }
    }),

  // === Season Management (Issue #211) ===

  getSeasons: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view seasons',
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
      const seasonList = await db.select().from(seasons).orderBy(desc(seasons.year));
      return { success: true, seasons: seasonList };
    } catch (error) {
      console.error('[Admin Router] Error fetching seasons:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch seasons',
      });
    }
  }),

  createSeason: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2020).max(2100),
        label: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create seasons',
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
        const [newSeason] = await db
          .insert(seasons)
          .values({
            year: input.year,
            label: input.label || `${input.year}シーズン`,
            startDate: input.startDate || null,
            endDate: input.endDate || null,
          })
          .returning();

        console.log(`[Admin] Season created: ${input.year} by user ${ctx.user.id}`);
        return { success: true, season: newSeason };
      } catch (error: any) {
        console.error('[Admin Router] Error creating season:', error);
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Season year already exists',
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create season',
        });
      }
    }),

  updateSeason: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        year: z.number().min(2020).max(2100).optional(),
        label: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update seasons',
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
        const [updatedSeason] = await db
          .update(seasons)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(seasons.id, id))
          .returning();

        if (!updatedSeason) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Season not found',
          });
        }

        console.log(`[Admin] Season updated: ${updatedSeason.year} by user ${ctx.user.id}`);
        return { success: true, season: updatedSeason };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error updating season:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update season',
        });
      }
    }),

  deleteTeam: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can delete teams',
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
        const matchCount = await db
          .select({ count: count() })
          .from(matches)
          .where(eq(matches.teamId, input.id));

        if (matchCount[0].count > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `このチームには ${matchCount[0].count} 件の試合データが紐づいているため削除できません`,
          });
        }

        const [deletedTeam] = await db
          .delete(teams)
          .where(eq(teams.id, input.id))
          .returning();

        if (!deletedTeam) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found',
          });
        }

        console.log(`[Admin] Team deleted: ${deletedTeam.slug} by user ${ctx.user.id}`);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Admin Router] Error deleting team:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete team',
        });
      }
    }),

  importJLeagueTeams: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can import J.League teams',
      });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not available',
      });
    }

    const jleagueTeams = [
      { name: '鹿島アントラーズ', slug: 'kashima', aliases: 'アントラーズ,鹿島', league: 'J1' },
      { name: '浦和レッズ', slug: 'urawa', aliases: 'レッズ,浦和', league: 'J1' },
      { name: '柏レイソル', slug: 'kashiwa', aliases: 'レイソル,柏', league: 'J1' },
      { name: '東京ヴェルディ', slug: 'tokyov', aliases: 'ヴェルディ,東京V', league: 'J1' },
      { name: 'ＦＣ東京', slug: 'ftokyo', aliases: 'FC東京,東京', league: 'J1' },
      { name: 'ＦＣ町田ゼルビア', slug: 'machida', aliases: 'ゼルビア,町田', league: 'J1' },
      { name: '川崎フロンターレ', slug: 'kawasakif', aliases: 'フロンターレ,川崎F', league: 'J1' },
      { name: '横浜Ｆ・マリノス', slug: 'yokohamafm', aliases: 'マリノス,横浜FM', league: 'J1' },
      { name: '清水エスパルス', slug: 'shimizu', aliases: 'エスパルス,清水', league: 'J1' },
      { name: '名古屋グランパス', slug: 'nagoya', aliases: 'グランパス,名古屋', league: 'J1' },
      { name: '京都サンガF.C.', slug: 'kyoto', aliases: 'サンガ,京都', league: 'J1' },
      { name: 'ガンバ大阪', slug: 'gosaka', aliases: 'ガンバ,G大阪', league: 'J1' },
      { name: 'セレッソ大阪', slug: 'cosaka', aliases: 'セレッソ,C大阪', league: 'J1' },
      { name: 'ヴィッセル神戸', slug: 'kobe', aliases: 'ヴィッセル,神戸', league: 'J1' },
      { name: 'サンフレッチェ広島', slug: 'hiroshima', aliases: 'サンフレッチェ,広島', league: 'J1' },
      { name: 'ファジアーノ岡山', slug: 'okayama', aliases: 'ファジアーノ,岡山', league: 'J1' },
      { name: 'アビスパ福岡', slug: 'fukuoka', aliases: 'アビスパ,福岡', league: 'J1' },
      { name: 'Ｖ・ファーレン長崎', slug: 'nagasaki', aliases: 'Vファーレン,長崎', league: 'J1' },
      { name: '水戸ホーリーホック', slug: 'mito', aliases: 'ホーリーホック,水戸', league: 'J1' },
      { name: 'ジェフユナイテッド千葉', slug: 'chiba', aliases: 'ジェフ,千葉', league: 'J1' },
      { name: '北海道コンサドーレ札幌', slug: 'sapporo', aliases: 'コンサドーレ,札幌', league: 'J2' },
      { name: 'ベガルタ仙台', slug: 'sendai', aliases: 'ベガルタ,仙台', league: 'J2' },
      { name: 'モンテディオ山形', slug: 'yamagata', aliases: 'モンテディオ,山形', league: 'J2' },
      { name: 'いわきFC', slug: 'iwaki', aliases: 'いわき', league: 'J2' },
      { name: '栃木SC', slug: 'tochigi', aliases: '栃木', league: 'J2' },
      { name: 'ザスパ群馬', slug: 'gunma', aliases: 'ザスパ,群馬', league: 'J2' },
      { name: '大宮アルディージャ', slug: 'omiya', aliases: 'アルディージャ,大宮', league: 'J2' },
      { name: '横浜ＦＣ', slug: 'yokohamafc', aliases: '横浜FC', league: 'J2' },
      { name: 'ヴァンフォーレ甲府', slug: 'kofu', aliases: 'ヴァンフォーレ,甲府', league: 'J2' },
      { name: 'カターレ富山', slug: 'toyama', aliases: 'カターレ,富山', league: 'J2' },
      { name: 'ツエーゲン金沢', slug: 'kanazawa', aliases: 'ツエーゲン,金沢', league: 'J2' },
      { name: '藤枝ＭＹＦＣ', slug: 'fujieda', aliases: '藤枝', league: 'J2' },
      { name: 'ジュビロ磐田', slug: 'iwata', aliases: 'ジュビロ,磐田', league: 'J2' },
      { name: 'ＦＣ岐阜', slug: 'gifu', aliases: 'FC岐阜,岐阜', league: 'J2' },
      { name: '徳島ヴォルティス', slug: 'tokushima', aliases: 'ヴォルティス,徳島', league: 'J2' },
      { name: '愛媛ＦＣ', slug: 'ehime', aliases: '愛媛FC,愛媛', league: 'J2' },
      { name: 'レノファ山口ＦＣ', slug: 'yamaguchi', aliases: 'レノファ,山口', league: 'J2' },
      { name: 'ＦＣ今治', slug: 'imabari', aliases: 'FC今治,今治', league: 'J2' },
      { name: 'ロアッソ熊本', slug: 'kumamoto', aliases: 'ロアッソ,熊本', league: 'J2' },
      { name: '大分トリニータ', slug: 'oita', aliases: 'トリニータ,大分', league: 'J2' },
      { name: '鹿児島ユナイテッドＦＣ', slug: 'kagoshima', aliases: '鹿児島', league: 'J2' },
    ];

    try {
      const existingTeams = await db.select({ slug: teams.slug }).from(teams);
      const existingSlugs = new Set(existingTeams.map(t => t.slug));

      let inserted = 0;
      let updated = 0;

      for (const team of jleagueTeams) {
        if (existingSlugs.has(team.slug)) {
          await db
            .update(teams)
            .set({
              name: team.name,
              aliases: team.aliases,
              updatedAt: new Date(),
            })
            .where(eq(teams.slug, team.slug));
          updated++;
        } else {
          await db.insert(teams).values({
            name: team.name,
            slug: team.slug,
            aliases: team.aliases,
          });
          inserted++;
        }
      }

      console.log(`[Admin] J.League teams imported: ${inserted} inserted, ${updated} updated by user ${ctx.user.id}`);
      return {
        success: true,
        inserted,
        updated,
        total: jleagueTeams.length,
      };
    } catch (error) {
      console.error('[Admin Router] Error importing J.League teams:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to import J.League teams',
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
        teamId: z.number().optional(),
        seasonId: z.number().optional(),
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
        if (input.teamId) {
          conditions.push(eq(matches.teamId, input.teamId));
        }
        if (input.seasonId) {
          conditions.push(eq(matches.seasonId, input.seasonId));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        const matchList = await query;

        // Get total count with same filters
        let countQuery = db
          .select({ count: sql<number>`count(*)` })
          .from(matches);
        
        if (conditions.length > 0) {
          countQuery = countQuery.where(and(...conditions)) as any;
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

  exportMatchesCsv: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        seasonId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can export matches',
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
        const matchList = await db
          .select()
          .from(matches)
          .where(
            and(
              eq(matches.teamId, input.teamId),
              eq(matches.seasonId, input.seasonId)
            )
          )
          .orderBy(asc(matches.date));

        const formatDateTime = (dt: Date | null) => {
          if (!dt) return '';
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          const h = String(dt.getHours()).padStart(2, '0');
          const min = String(dt.getMinutes()).padStart(2, '0');
          return `${y}-${m}-${d} ${h}:${min}`;
        };

        const outcomeMap: Record<string, string> = {
          win: '勝',
          draw: '分',
          loss: '負',
        };

        const csvRows = matchList.map((m) => ({
          match_id: m.matchId,
          大会名: m.competition || '',
          節: m.roundLabel || '',
          'HOME/AWAY': m.marinosSide === 'home' ? 'HOME' : m.marinosSide === 'away' ? 'AWAY' : '',
          試合日付: m.date,
          キックオフ: m.kickoff || '',
          対戦相手: m.opponent,
          会場: m.stadium || '',
          一次販売開始: formatDateTime(m.ticketSales1),
          二次販売開始: formatDateTime(m.ticketSales2),
          三次販売開始: formatDateTime(m.ticketSales3),
          一般販売開始: formatDateTime(m.ticketSalesGeneral),
          試合結果: m.resultScore || '',
          勝敗: m.resultOutcome ? outcomeMap[m.resultOutcome] || '' : '',
          観客数: m.attendance != null ? String(m.attendance) : '',
        }));

        return {
          success: true,
          rows: csvRows,
          count: csvRows.length,
        };
      } catch (error) {
        console.error('[Admin Router] Error exporting matches:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export matches',
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
        teamId: z.number().optional(),
        seasonId: z.number().optional(),
        ticketSales1: z.string().optional(),
        ticketSales2: z.string().optional(),
        ticketSales3: z.string().optional(),
        ticketSalesGeneral: z.string().optional(),
        resultScore: z.string().optional(),
        resultOutcome: z.enum(['win', 'draw', 'loss']).optional(),
        attendance: z.number().nullable().optional(),
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
            teamId: input.teamId || null,
            seasonId: input.seasonId || null,
            ticketSales1: input.ticketSales1 ? new Date(input.ticketSales1) : null,
            ticketSales2: input.ticketSales2 ? new Date(input.ticketSales2) : null,
            ticketSales3: input.ticketSales3 ? new Date(input.ticketSales3) : null,
            ticketSalesGeneral: input.ticketSalesGeneral ? new Date(input.ticketSalesGeneral) : null,
            resultScore: input.resultScore || null,
            resultOutcome: input.resultOutcome || null,
            attendance: input.attendance ?? null,
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
        teamId: z.number().nullable().optional(),
        seasonId: z.number().nullable().optional(),
        ticketSales1: z.string().nullable().optional(),
        ticketSales2: z.string().nullable().optional(),
        ticketSales3: z.string().nullable().optional(),
        ticketSalesGeneral: z.string().nullable().optional(),
        resultScore: z.string().nullable().optional(),
        resultOutcome: z.enum(['win', 'draw', 'loss']).nullable().optional(),
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
        const { id, ticketSales1, ticketSales2, ticketSales3, ticketSalesGeneral, ...updateData } = input;

        // Calculate isResult if scores are provided
        const updates: any = { ...updateData, updatedAt: new Date() };
        if ('homeScore' in updateData && 'awayScore' in updateData) {
          updates.isResult = updateData.homeScore !== null && updateData.awayScore !== null ? 1 : 0;
        }
        
        // Handle timestamp fields
        if (ticketSales1 !== undefined) {
          updates.ticketSales1 = ticketSales1 ? new Date(ticketSales1) : null;
        }
        if (ticketSales2 !== undefined) {
          updates.ticketSales2 = ticketSales2 ? new Date(ticketSales2) : null;
        }
        if (ticketSales3 !== undefined) {
          updates.ticketSales3 = ticketSales3 ? new Date(ticketSales3) : null;
        }
        if (ticketSalesGeneral !== undefined) {
          updates.ticketSalesGeneral = ticketSalesGeneral ? new Date(ticketSalesGeneral) : null;
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

  getDataQuality: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view data quality',
      });
    }

    const db = await getDb();
    if (!db) {
      return {
        success: false,
        quality: {
          missingKickoff: 0,
          missingStadium: 0,
          missingTicketSales: 0,
          missingResults: 0,
          inconsistencies: 0,
          lastUpdate: null,
          lastCsvImport: null,
        },
      };
    }

    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);

      const [missingKickoffResult] = await db
        .select({ count: count() })
        .from(matches)
        .where(
          and(
            gte(matches.date, today),
            or(isNull(matches.kickoff), eq(matches.kickoff, ''))
          )
        );

      const [missingStadiumResult] = await db
        .select({ count: count() })
        .from(matches)
        .where(
          and(
            gte(matches.date, today),
            or(isNull(matches.stadium), eq(matches.stadium, ''))
          )
        );

      const [missingTicketSalesResult] = await db
        .select({ count: count() })
        .from(matches)
        .where(
          and(
            gte(matches.date, today),
            isNull(matches.ticketSales1),
            isNull(matches.ticketSalesGeneral)
          )
        );

      const [missingResultsResult] = await db
        .select({ count: count() })
        .from(matches)
        .where(
          and(
            lt(matches.date, today),
            isNull(matches.resultOutcome)
          )
        );

      const [inconsistenciesResult] = await db
        .select({ count: count() })
        .from(matches)
        .where(
          and(
            not(isNull(matches.ticketSalesGeneral)),
            sql`${matches.ticketSalesGeneral}::date > ${matches.date}::date`
          )
        );

      const [lastUpdateResult] = await db
        .select({ updatedAt: matches.updatedAt })
        .from(matches)
        .orderBy(desc(matches.updatedAt))
        .limit(1);

      const [lastCsvImportResult] = await db
        .select()
        .from(eventLogs)
        .where(like(eventLogs.eventName, '%CSV Import%'))
        .orderBy(desc(eventLogs.createdAt))
        .limit(1);

      return {
        success: true,
        quality: {
          missingKickoff: missingKickoffResult?.count || 0,
          missingStadium: missingStadiumResult?.count || 0,
          missingTicketSales: missingTicketSalesResult?.count || 0,
          missingResults: missingResultsResult?.count || 0,
          inconsistencies: inconsistenciesResult?.count || 0,
          lastUpdate: lastUpdateResult?.updatedAt || null,
          lastCsvImport: lastCsvImportResult?.createdAt || null,
        },
      };
    } catch (error) {
      console.error('[Admin Router] Error fetching data quality:', error);
      return {
        success: false,
        quality: {
          missingKickoff: 0,
          missingStadium: 0,
          missingTicketSales: 0,
          missingResults: 0,
          inconsistencies: 0,
          lastUpdate: null,
          lastCsvImport: null,
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

  // === CSV Import (Issue #212) ===

  importMatchesCsv: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        seasonId: z.number(),
        mode: z.enum(['insert', 'upsert']),
        dryRun: z.boolean().default(false),
        csvData: z.array(z.object({
          competition: z.string().optional(),
          roundLabel: z.string().optional(),
          marinosSide: z.string().optional(),
          date: z.string(),
          kickoff: z.string().optional(),
          opponent: z.string(),
          stadium: z.string(),
          ticketSales1: z.string().optional(),
          ticketSales2: z.string().optional(),
          ticketSales3: z.string().optional(),
          ticketSalesGeneral: z.string().optional(),
          resultScore: z.string().optional(),
          resultOutcome: z.string().optional(),
          attendance: z.string().optional(),
          matchId: z.number().optional(),
        })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can import matches',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      const results = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [] as { rowNumber: number; message: string; rawRow: any }[],
        preview: [] as { rowNumber: number; action: string; data: any }[],
      };

      const normalizeHomeAway = (val: string | undefined): 'home' | 'away' | null => {
        if (!val) return null;
        const v = val.trim().toUpperCase();
        if (v === 'HOME' || v === 'H' || v === 'ホーム') return 'home';
        if (v === 'AWAY' || v === 'A' || v === 'アウェイ') return 'away';
        return null;
      };

      const normalizeOutcome = (val: string | undefined): 'win' | 'draw' | 'loss' | null => {
        if (!val) return null;
        const v = val.trim().toUpperCase();
        if (v === '勝' || v === 'W' || v === 'WIN') return 'win';
        if (v === '分' || v === 'D' || v === 'DRAW') return 'draw';
        if (v === '負' || v === 'L' || v === 'LOSS') return 'loss';
        return null;
      };

      const parseDate = (val: string): string | null => {
        if (!val) return null;
        const normalized = val.replace(/\//g, '-');
        const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
        return null;
      };

      const parseDateTime = (val: string | undefined): Date | null => {
        if (!val) return null;
        // Skip non-date text values (e.g., "販売概要発表：試合日の5～7週間前...")
        if (val.includes('販売') || val.includes('概要') || val.includes('週間')) {
          return null;
        }
        const normalized = val.replace(/\//g, '-');
        const dateTimeMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
        if (dateTimeMatch) {
          const [, y, m, d, h, min] = dateTimeMatch;
          return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min}:00`);
        }
        const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (dateOnlyMatch) {
          const [, y, m, d] = dateOnlyMatch;
          return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`);
        }
        return null;
      };

      const parseScore = (val: string | undefined): { home: number; away: number } | null => {
        if (!val) return null;
        const match = val.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (match) {
          return { home: parseInt(match[1]), away: parseInt(match[2]) };
        }
        return null;
      };

      try {
        for (let i = 0; i < input.csvData.length; i++) {
          const row = input.csvData[i];
          const rowNumber = i + 2;

          const requiredErrors: string[] = [];
          if (!row.date) requiredErrors.push('試合日付');
          if (!row.opponent) requiredErrors.push('対戦相手');
          if (!row.stadium) requiredErrors.push('会場');

          if (requiredErrors.length > 0) {
            results.failed++;
            results.errors.push({
              rowNumber,
              message: `必須項目が不足: ${requiredErrors.join(', ')}`,
              rawRow: row,
            });
            continue;
          }

          const parsedDate = parseDate(row.date);
          if (!parsedDate) {
            results.failed++;
            results.errors.push({
              rowNumber,
              message: `日付のパースに失敗: ${row.date}`,
              rawRow: row,
            });
            continue;
          }

          const marinosSide = normalizeHomeAway(row.marinosSide);
          const resultOutcome = normalizeOutcome(row.resultOutcome);
          const score = parseScore(row.resultScore);

          const attendance = row.attendance ? parseInt(row.attendance.replace(/,/g, ''), 10) : null;

          // Treat "未定" as null for optional fields
          const normalizeUndefined = (val: string | undefined): string | null => {
            if (!val) return null;
            const trimmed = val.trim();
            if (trimmed === '未定' || trimmed === '') return null;
            return trimmed;
          };

          const normalizedStadium = normalizeUndefined(row.stadium);

          const matchData = {
            teamId: input.teamId,
            seasonId: input.seasonId,
            date: parsedDate,
            kickoff: normalizeUndefined(row.kickoff),
            opponent: row.opponent.trim(),
            stadium: normalizedStadium,
            marinosSide,
            competition: row.competition?.trim() || null,
            roundLabel: row.roundLabel?.trim() || null,
            ticketSales1: parseDateTime(row.ticketSales1),
            ticketSales2: parseDateTime(row.ticketSales2),
            ticketSales3: parseDateTime(row.ticketSales3),
            ticketSalesGeneral: parseDateTime(row.ticketSalesGeneral),
            homeScore: score?.home ?? null,
            awayScore: score?.away ?? null,
            resultOutcome,
            attendance: isNaN(attendance as number) ? null : attendance,
            status: 'Scheduled' as const,
          };

          let existingMatch = null;
          if (row.matchId) {
            const [found] = await db
              .select()
              .from(matches)
              .where(eq(matches.id, row.matchId))
              .limit(1);
            existingMatch = found;
          }

          if (!existingMatch) {
            // Build WHERE conditions (stadium may be null for "未定")
            const whereConditions = [
              eq(matches.teamId, input.teamId),
              eq(matches.seasonId, input.seasonId),
              eq(matches.date, parsedDate),
              eq(matches.opponent, matchData.opponent),
            ];
            if (matchData.stadium) {
              whereConditions.push(eq(matches.stadium, matchData.stadium));
            } else {
              whereConditions.push(isNull(matches.stadium));
            }

            const found = await db
              .select()
              .from(matches)
              .where(and(...whereConditions))
              .limit(2);
            
            if (found.length === 1) {
              existingMatch = found[0];
            } else if (found.length > 1) {
              results.failed++;
              results.errors.push({
                rowNumber,
                message: '複数の既存レコードがマッチしました（突合キーが曖昧）',
                rawRow: row,
              });
              continue;
            }
          }

          if (input.dryRun) {
            results.preview.push({
              rowNumber,
              action: existingMatch ? 'update' : 'insert',
              data: matchData,
            });
            if (existingMatch) {
              results.updated++;
            } else {
              results.inserted++;
            }
            continue;
          }

          if (existingMatch) {
            if (input.mode === 'insert') {
              results.skipped++;
              continue;
            }

            await db
              .update(matches)
              .set({ ...matchData, updatedAt: new Date() })
              .where(eq(matches.id, existingMatch.id));
            results.updated++;
          } else {
            const matchIdStr = `csv-${Date.now()}-${i}`;
            const sourceKey = `csv-import-${input.teamId}-${parsedDate}-${matchData.opponent}`;
            const homeTeamName = marinosSide === 'home' ? '横浜F・マリノス' : matchData.opponent;
            const awayTeamName = marinosSide === 'away' ? '横浜F・マリノス' : matchData.opponent;

            await db.insert(matches).values({
              ...matchData,
              matchId: matchIdStr,
              sourceKey,
              source: 'admin',
              homeTeam: homeTeamName,
              awayTeam: awayTeamName,
              isResult: score ? 1 : 0,
            });
            results.inserted++;
          }
        }

        console.log(`[Admin] CSV Import completed by user ${ctx.user.id}: inserted=${results.inserted}, updated=${results.updated}, skipped=${results.skipped}, failed=${results.failed}`);

        return {
          success: true,
          summary: {
            inserted: results.inserted,
            updated: results.updated,
            skipped: results.skipped,
            failed: results.failed,
            total: input.csvData.length,
          },
          errors: results.errors,
          preview: input.dryRun ? results.preview : undefined,
        };
      } catch (error) {
        console.error('[Admin Router] Error importing CSV:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'CSVインポートに失敗しました',
        });
      }
    }),
});
