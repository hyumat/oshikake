import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, matches as matchesTable, userMatches as userMatchesTable, InsertUserMatch, UserMatch } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

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

export async function getMatches(filters?: { year?: number; competition?: string }) {
  const db = await getDb();
  if (!db) {
    console.warn('[Database] Cannot get matches: database not available');
    return [];
  }
  
  try {
    let query: any = db.select().from(matchesTable);
    
    if (filters?.year) {
      query = query.where(sql`YEAR(${matchesTable.date}) = ${filters.year}`);
    }
    if (filters?.competition) {
      query = query.where(eq(matchesTable.competition, filters.competition));
    }
    
    return await query;
  } catch (error) {
    console.error('[Database] Failed to get matches:', error);
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
