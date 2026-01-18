import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  matches as matchesTable,
  userMatches as userMatchesTable,
  syncLogs as syncLogsTable,
  matchExpenses as matchExpensesTable,
  auditLogs as auditLogsTable,
  eventLogs as eventLogsTable,
  webhookEvents as webhookEventsTable,
  entitlements as entitlementsTable,
  InsertUserMatch, UserMatch, InsertSyncLog,
  InsertMatchExpense, MatchExpense,
  InsertAuditLog, InsertEventLog,
  InsertWebhookEvent, WebhookEvent,
  InsertEntitlement, Entitlement
} from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { ENV } from './_core/env';
import { Plan } from '../shared/billing';
import type { MySql2Database } from 'drizzle-orm/mysql2';

type DrizzleDB = MySql2Database<typeof schema>;

let _db: DrizzleDB | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb(): Promise<DrizzleDB | null> {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema }) as DrizzleDB;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Synchronous db instance for newer routers (Issue #123, #144)
// Initialize eagerly if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  try {
    _db = drizzle(process.env.DATABASE_URL, { schema }) as DrizzleDB;
  } catch (error) {
    console.warn("[Database] Failed to initialize db:", error);
  }
}

// Export db instance - will throw if accessed before initialization
export const db = new Proxy({} as DrizzleDB, {
  get(target, prop) {
    if (!_db) {
      throw new Error('[Database] Database not initialized. Set DATABASE_URL environment variable.');
    }
    return (_db as any)[prop];
  }
});

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== Match Operations ==========

export async function upsertMatches(matchesData: any[]) {
  if (!matchesData || matchesData.length === 0) return [];
  
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot upsert matches: database not available');
    return [];
  }
  
  try {
    const results = [];
    for (const match of matchesData) {
      const result = await db.insert(matchesTable).values({
        matchId: match.matchId || match.sourceKey, // Use matchId if available, otherwise sourceKey
        sourceKey: match.sourceKey,
        source: 'jleague',
        date: match.date,
        kickoff: match.kickoff,
        competition: match.competition,
        roundLabel: match.roundLabel,
        roundNumber: match.roundNumber,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        opponent: match.opponent,
        stadium: match.stadium,
        marinosSide: match.marinosSide,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        isResult: match.isResult ? 1 : 0,
        matchUrl: match.matchUrl,
      }).onDuplicateKeyUpdate({
        set: {
          kickoff: match.kickoff,
          stadium: match.stadium,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status,
          isResult: match.isResult ? 1 : 0,
          updatedAt: new Date(),
        },
      });
      results.push(result);
    }
    return results;
  } catch (error) {
    console.error('[Database] Failed to upsert matches:', error);
    throw error;
  }
}

export async function getMatches(filters?: { year?: number; competition?: string }): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[Database] Cannot get matches: database not available');
      return [];
    }
    
    let query: any = db.select().from(matchesTable);
    
    if (filters?.year) {
      query = query.where(sql`YEAR(${matchesTable.date}) = ${filters.year}`);
    }
    if (filters?.competition) {
      query = query.where(eq(matchesTable.competition, filters.competition));
    }
    
    const result = await query;
    return result || [];
  } catch (error) {
    console.warn('[Database] Failed to get matches, returning empty array:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

export async function getMatchById(matchId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get match: database not available');
    return undefined;
  }
  
  try {
    const result = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[Database] Failed to get match by id:', error);
    return undefined;
  }
}

// ========== User Match Operations ==========

export async function getUserMatches(userId: number, filters?: { status?: string }) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user matches: database not available');
    return [];
  }
  
  try {
    let query: any = db.select().from(userMatchesTable).where(eq(userMatchesTable.userId, userId));
    
    if (filters?.status) {
      query = query.where(eq(userMatchesTable.status, filters.status as any));
    }
    
    const results = await query;
    return results;
  } catch (error) {
    console.error('[Database] Failed to get user matches:', error);
    return [];
  }
}

export async function getUserMatchById(userMatchId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user match: database not available');
    return undefined;
  }
  
  try {
    const result = await db.select()
      .from(userMatchesTable)
      .where(eq(userMatchesTable.id, userMatchId))
      .limit(1);
    
    if (result.length === 0) return undefined;
    if (result[0].userId !== userId) return undefined;
    
    return result[0];
  } catch (error) {
    console.error('[Database] Failed to get user match by id:', error);
    return undefined;
  }
}

export async function createUserMatch(userId: number, data: Omit<InsertUserMatch, 'userId'>) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot create user match: database not available');
    return undefined;
  }
  
  try {
    const result = await db.insert(userMatchesTable).values({
      ...data,
      userId,
    });
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to create user match:', error);
    throw error;
  }
}

export async function updateUserMatch(userMatchId: number, userId: number, data: Partial<Omit<UserMatch, 'id' | 'userId' | 'createdAt'>>) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot update user match: database not available');
    return undefined;
  }
  
  try {
    const existing = await db.select()
      .from(userMatchesTable)
      .where(eq(userMatchesTable.id, userMatchId))
      .limit(1);
    
    if (existing.length === 0 || existing[0].userId !== userId) {
      throw new Error('User match not found or unauthorized');
    }
    
    const result = await db.update(userMatchesTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userMatchesTable.id, userMatchId));
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to update user match:', error);
    throw error;
  }
}

export async function deleteUserMatch(userMatchId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot delete user match: database not available');
    return undefined;
  }
  
  try {
    const existing = await db.select()
      .from(userMatchesTable)
      .where(eq(userMatchesTable.id, userMatchId))
      .limit(1);
    
    if (existing.length === 0 || existing[0].userId !== userId) {
      throw new Error('User match not found or unauthorized');
    }
    
    const result = await db.delete(userMatchesTable)
      .where(eq(userMatchesTable.id, userMatchId));
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to delete user match:', error);
    throw error;
  }
}

// ========== Sync Log Operations ==========

export async function createSyncLog(data: InsertSyncLog) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot create sync log: database not available');
    return undefined;
  }
  
  try {
    const result = await db.insert(syncLogsTable).values(data);
    return result;
  } catch (error) {
    console.error('[Database] Failed to create sync log:', error);
    return undefined;
  }
}

export async function getRecentSyncLogs(limit: number = 10) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get sync logs: database not available');
    return [];
  }
  
  try {
    const result = await db.select()
      .from(syncLogsTable)
      .orderBy(sql`${syncLogsTable.syncedAt} DESC`)
      .limit(limit);
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to get sync logs:', error);
    return [];
  }
}

// ========== Plan & Attendance Count Operations ==========

export async function getAttendanceCountForSeason(userId: number, seasonYear: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get attendance count: database not available');
    return 0;
  }
  
  try {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(userMatchesTable)
      .where(sql`${userMatchesTable.userId} = ${userId} AND ${userMatchesTable.seasonYear} = ${seasonYear} AND ${userMatchesTable.status} = 'attended'`);
    
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error('[Database] Failed to get attendance count:', error);
    return 0;
  }
}

export async function getTotalAttendanceCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get total attendance count: database not available');
    return 0;
  }
  
  try {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(userMatchesTable)
      .where(sql`${userMatchesTable.userId} = ${userId} AND ${userMatchesTable.status} = 'attended'`);
    
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error('[Database] Failed to get total attendance count:', error);
    return 0;
  }
}

export async function getUserPlan(userId: number): Promise<{ plan: Plan; planExpiresAt: Date | null }> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user plan: database not available');
    return { plan: 'free', planExpiresAt: null };
  }
  
  try {
    const result = await db.select({
      plan: users.plan,
      planExpiresAt: users.planExpiresAt,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (result.length === 0) {
      return { plan: 'free', planExpiresAt: null };
    }
    
    return {
      plan: result[0].plan as Plan,
      planExpiresAt: result[0].planExpiresAt,
    };
  } catch (error) {
    console.error('[Database] Failed to get user plan:', error);
    return { plan: 'free', planExpiresAt: null };
  }
}

// ========== Match Expense Operations ==========

export async function getExpensesByUserMatch(userMatchId: number, userId: number): Promise<MatchExpense[]> {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get expenses: database not available');
    return [];
  }
  
  try {
    const result = await db.select()
      .from(matchExpensesTable)
      .where(eq(matchExpensesTable.userMatchId, userMatchId));
    
    if (result.length > 0 && result[0].userId !== userId) {
      return [];
    }
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to get expenses:', error);
    return [];
  }
}

export async function createExpense(userId: number, data: Omit<InsertMatchExpense, 'userId'>) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot create expense: database not available');
    return undefined;
  }
  
  try {
    const result = await db.insert(matchExpensesTable).values({
      ...data,
      userId,
    });
    return result;
  } catch (error) {
    console.error('[Database] Failed to create expense:', error);
    throw error;
  }
}

export async function updateExpense(expenseId: number, userId: number, data: Partial<Omit<MatchExpense, 'id' | 'userId' | 'createdAt'>>) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot update expense: database not available');
    return undefined;
  }
  
  try {
    const existing = await db.select()
      .from(matchExpensesTable)
      .where(eq(matchExpensesTable.id, expenseId))
      .limit(1);
    
    if (existing.length === 0 || existing[0].userId !== userId) {
      throw new Error('Expense not found or unauthorized');
    }
    
    const result = await db.update(matchExpensesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(matchExpensesTable.id, expenseId));
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to update expense:', error);
    throw error;
  }
}

export async function deleteExpense(expenseId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot delete expense: database not available');
    return undefined;
  }
  
  try {
    const existing = await db.select()
      .from(matchExpensesTable)
      .where(eq(matchExpensesTable.id, expenseId))
      .limit(1);
    
    if (existing.length === 0 || existing[0].userId !== userId) {
      throw new Error('Expense not found or unauthorized');
    }
    
    const result = await db.delete(matchExpensesTable)
      .where(eq(matchExpensesTable.id, expenseId));
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to delete expense:', error);
    throw error;
  }
}

export async function deleteExpensesByUserMatch(userMatchId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot delete expenses: database not available');
    return undefined;
  }
  
  try {
    const result = await db.delete(matchExpensesTable)
      .where(sql`${matchExpensesTable.userMatchId} = ${userMatchId} AND ${matchExpensesTable.userId} = ${userId}`);
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to delete expenses:', error);
    throw error;
  }
}

// ========== Audit Log Operations ==========

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot create audit log: database not available');
    return undefined;
  }
  
  try {
    const result = await db.insert(auditLogsTable).values(data);
    return result;
  } catch (error) {
    console.error('[Database] Failed to create audit log:', error);
    return undefined;
  }
}

// ========== Event Log Operations ==========

export async function createEventLog(data: InsertEventLog) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot create event log: database not available');
    return undefined;
  }
  
  try {
    const result = await db.insert(eventLogsTable).values(data);
    return result;
  } catch (error) {
    console.error('[Database] Failed to create event log:', error);
    return undefined;
  }
}

export async function logEvent(eventName: string, userId?: number, eventData?: Record<string, unknown>, seasonYear?: number) {
  return createEventLog({
    eventName,
    userId: userId ?? null,
    eventData: eventData ? JSON.stringify(eventData) : null,
    seasonYear: seasonYear ?? null,
  });
}

// ========== Stripe Operations ==========

export async function updateUserStripeInfo(userId: number, data: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  plan?: Plan;
  planExpiresAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot update user stripe info: database not available');
    return undefined;
  }
  
  try {
    const updateData: Record<string, unknown> = {};
    if (data.stripeCustomerId !== undefined) updateData.stripeCustomerId = data.stripeCustomerId;
    if (data.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = data.stripeSubscriptionId;
    if (data.plan !== undefined) updateData.plan = data.plan;
    if (data.planExpiresAt !== undefined) updateData.planExpiresAt = data.planExpiresAt;
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));
    
    return result;
  } catch (error) {
    console.error('[Database] Failed to update user stripe info:', error);
    throw error;
  }
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user by stripe customer id: database not available');
    return undefined;
  }
  
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[Database] Failed to get user by stripe customer id:', error);
    return undefined;
  }
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get user by id: database not available');
    return undefined;
  }

  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[Database] Failed to get user by id:', error);
    return undefined;
  }
}

// ==================== Issue #116: Webhook Idempotency ====================

/**
 * Webhookイベントが既に処理済みか確認
 */
export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.select()
      .from(webhookEventsTable)
      .where(eq(webhookEventsTable.eventId, eventId))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('[Database] Failed to check webhook processed:', error);
    return false;
  }
}

/**
 * Webhookイベントを記録
 */
export async function recordWebhookEvent(data: InsertWebhookEvent): Promise<WebhookEvent | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(webhookEventsTable).values(data);
    const insertedId = Number(result[0].insertId);

    const inserted = await db.select()
      .from(webhookEventsTable)
      .where(eq(webhookEventsTable.id, insertedId))
      .limit(1);

    return inserted[0] || null;
  } catch (error) {
    console.error('[Database] Failed to record webhook event:', error);
    return null;
  }
}

/**
 * Webhookイベントの処理状態を更新
 */
export async function updateWebhookEventStatus(
  eventId: string,
  status: 'success' | 'failed',
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(webhookEventsTable)
      .set({ status, errorMessage: errorMessage || null })
      .where(eq(webhookEventsTable.eventId, eventId));
  } catch (error) {
    console.error('[Database] Failed to update webhook event status:', error);
  }
}

// ==================== Issue #116: Entitlements ====================

/**
 * ユーザーのentitlementを取得（唯一の真実）
 */
export async function getUserEntitlement(userId: string): Promise<Entitlement | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.select()
      .from(entitlementsTable)
      .where(eq(entitlementsTable.userId, userId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('[Database] Failed to get user entitlement:', error);
    return null;
  }
}

/**
 * ユーザーのentitlementを作成または更新（upsert）
 */
export async function upsertEntitlement(
  userId: string,
  data: Partial<Omit<Entitlement, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<Entitlement | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // 既存のentitlementを確認
    const existing = await getUserEntitlement(userId);

    if (existing) {
      // 更新
      await db.update(entitlementsTable)
        .set(data)
        .where(eq(entitlementsTable.userId, userId));

      // 更新後のデータを取得
      return await getUserEntitlement(userId);
    } else {
      // 新規作成
      const insertData: InsertEntitlement = {
        userId,
        plan: data.plan || 'free',
        planExpiresAt: data.planExpiresAt || null,
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        status: data.status || 'active',
      };

      const result = await db.insert(entitlementsTable).values(insertData);
      const insertedId = Number(result[0].insertId);

      const inserted = await db.select()
        .from(entitlementsTable)
        .where(eq(entitlementsTable.id, insertedId))
        .limit(1);

      return inserted[0] || null;
    }
  } catch (error) {
    console.error('[Database] Failed to upsert entitlement:', error);
    return null;
  }
}

/**
 * Entitlementからusersテーブルを同期（後方互換性）
 */
export async function syncEntitlementToUser(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const entitlement = await getUserEntitlement(userId);
    if (!entitlement) return;

    // usersテーブルのplan/planExpiresAtを更新
    await db.update(users)
      .set({
        plan: entitlement.plan,
        planExpiresAt: entitlement.planExpiresAt,
        stripeSubscriptionId: entitlement.stripeSubscriptionId,
      })
      .where(eq(users.openId, userId));
  } catch (error) {
    console.error('[Database] Failed to sync entitlement to user:', error);
  }
}
