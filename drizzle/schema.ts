import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Official match data from J.League (scraped)
 * This table stores all Marinos matches from the official source
 */
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  /** Unique key from official source (e.g., jleague_2025_001) */
  sourceKey: varchar("sourceKey", { length: 128 }).notNull().unique(),
  /** Source of data: "jleague" */
  source: varchar("source", { length: 32 }).default("jleague").notNull(),
  /** Match date in ISO format (YYYY-MM-DD) */
  date: varchar("date", { length: 10 }).notNull(),
  /** Kickoff time (HH:MM) */
  kickoff: varchar("kickoff", { length: 5 }),
  /** Competition name (e.g., "J1", "ACL") */
  competition: varchar("competition", { length: 128 }),
  /** Round label (e.g., "第1節", "MD1") */
  roundLabel: varchar("roundLabel", { length: 64 }),
  /** Round number */
  roundNumber: int("roundNumber"),
  /** Home team name */
  homeTeam: varchar("homeTeam", { length: 128 }).notNull(),
  /** Away team name */
  awayTeam: varchar("awayTeam", { length: 128 }).notNull(),
  /** Opponent team name (derived from home/away) */
  opponent: varchar("opponent", { length: 128 }).notNull(),
  /** Stadium name */
  stadium: varchar("stadium", { length: 256 }),
  /** Whether Marinos is home ("home") or away ("away") */
  marinosSide: mysqlEnum("marinosSide", ["home", "away"]),
  /** Home team score */
  homeScore: int("homeScore"),
  /** Away team score */
  awayScore: int("awayScore"),
  /** Match status (e.g., "Finished", "Scheduled") */
  status: varchar("status", { length: 64 }),
  /** Whether the match has been played */
  isResult: int("isResult").default(0).notNull(), // 0 = false, 1 = true
  /** URL to match details */
  matchUrl: text("matchUrl"),
  /** Last updated timestamp */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * User's match attendance log
 * Tracks which matches the user has attended or plans to attend
 */
export const userMatches = mysqlTable("userMatches", {
  id: int("id").autoincrement().primaryKey(),
  /** Reference to user */
  userId: int("userId").notNull(),
  /** Reference to official match (nullable for manual entries) */
  matchId: int("matchId"),
  /** Season year for easy filtering (e.g., 2024, 2025) */
  seasonYear: int("seasonYear"),
  /** Match date (ISO format) */
  date: varchar("date", { length: 10 }).notNull(),
  /** Kickoff time */
  kickoff: varchar("kickoff", { length: 5 }),
  /** Competition name */
  competition: varchar("competition", { length: 128 }),
  /** Opponent name */
  opponent: varchar("opponent", { length: 128 }).notNull(),
  /** Stadium name */
  stadium: varchar("stadium", { length: 256 }),
  /** Home or Away */
  marinosSide: mysqlEnum("marinosSide", ["home", "away"]),
  /** Status: "planned" or "attended" */
  status: mysqlEnum("status", ["planned", "attended"]).default("planned").notNull(),
  /** Match result: W/D/L */
  resultWdl: mysqlEnum("resultWdl", ["W", "D", "L"]),
  /** Marinos goals */
  marinosGoals: int("marinosGoals"),
  /** Opponent goals */
  opponentGoals: int("opponentGoals"),
  /** Cost in JPY */
  costYen: int("costYen").default(0).notNull(),
  /** Personal notes */
  note: text("note"),
  /** Created timestamp */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Updated timestamp */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserMatch = typeof userMatches.$inferSelect;
export type InsertUserMatch = typeof userMatches.$inferInsert;

/**
 * Sync log for tracking scraping operations
 */
export const syncLogs = mysqlTable("syncLogs", {
  id: int("id").autoincrement().primaryKey(),
  /** Source (e.g., "jleague", "phew", "f-marinos") */
  source: varchar("source", { length: 32 }).notNull(),
  /** Status: "success", "partial", or "failed" */
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(),
  /** Number of matches fetched */
  matchesCount: int("matchesCount").default(0).notNull(),
  /** Number of matches with results (scores) */
  resultsCount: int("resultsCount").default(0),
  /** Number of upcoming matches */
  upcomingCount: int("upcomingCount").default(0),
  /** Number of detail fetches attempted */
  detailFetched: int("detailFetched").default(0),
  /** Number of detail fetches failed */
  detailFailed: int("detailFailed").default(0),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  /** URLs that failed (JSON array) */
  failedUrls: text("failedUrls"),
  /** Duration in milliseconds */
  durationMs: int("durationMs"),
  /** Sync timestamp */
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

/**
 * Match expenses - detailed expense tracking per user match
 * Categories: transport, ticket, food, other
 */
export const matchExpenses = mysqlTable("matchExpenses", {
  id: int("id").autoincrement().primaryKey(),
  userMatchId: int("userMatchId").notNull(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["transport", "ticket", "food", "other"]).notNull(),
  amount: int("amount").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchExpense = typeof matchExpenses.$inferSelect;
export type InsertMatchExpense = typeof matchExpenses.$inferInsert;

/**
 * Audit log - tracks important user actions for security and compliance
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: mysqlEnum("action", [
    "attendance_create",
    "attendance_update",
    "attendance_delete",
    "expense_add",
    "expense_update",
    "expense_delete",
    "auth_login",
    "auth_logout",
  ]).notNull(),
  targetId: int("targetId"),
  targetType: varchar("targetType", { length: 32 }),
  metadata: text("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Event log - product analytics events for feature usage tracking
 */
export const eventLogs = mysqlTable("eventLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  eventName: varchar("eventName", { length: 64 }).notNull(),
  eventData: text("eventData"),
  seasonYear: int("seasonYear"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = typeof eventLogs.$inferInsert;