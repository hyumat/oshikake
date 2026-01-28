import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const planEnum = pgEnum("plan", ["free", "plus", "pro"]);
export const marinosSideEnum = pgEnum("marinosSide", ["home", "away"]);
export const userMatchStatusEnum = pgEnum("userMatchStatus", ["planned", "attended"]);
export const resultWdlEnum = pgEnum("resultWdl", ["W", "D", "L"]);
export const syncStatusEnum = pgEnum("syncStatus", ["success", "partial", "failed"]);
export const expenseCategoryEnum = pgEnum("expenseCategory", ["transport", "ticket", "food", "other"]);
export const auditActionEnum = pgEnum("auditAction", [
  "attendance_create",
  "attendance_update",
  "attendance_delete",
  "expense_add",
  "expense_update",
  "expense_delete",
  "auth_login",
  "auth_logout",
]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  /** User plan: free, plus, or pro */
  plan: planEnum("plan").default("free").notNull(),
  /** Pro plan expiration date (null = no expiration / lifetime) */
  planExpiresAt: timestamp("planExpiresAt"),
  /** Stripe customer ID */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  /** Stripe subscription ID */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Issue #144: マリノス貯金機能 - 貯金ルール
 * 
 * ユーザーが設定した貯金ルールを保存
 * 例: 「勝利したら500円」「エジガルが得点したら300円」
 */
export const savingsRules = pgTable("savings_rules", {
  id: serial("id").primaryKey(),
  /** ユーザーID (users.openIdを参照) */
  userId: varchar("userId", { length: 64 }).notNull().references(() => users.openId),
  /** 条件 (例: "勝利", "エジガル得点", "引き分け") */
  condition: varchar("condition", { length: 256 }).notNull(),
  /** 貯金額 (円) */
  amount: integer("amount").notNull(),
  /** 有効/無効 */
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SavingsRule = typeof savingsRules.$inferSelect;
export type InsertSavingsRule = typeof savingsRules.$inferInsert;

/**
 * Issue #144: マリノス貯金機能 - 貯金履歴
 * 
 * 試合結果に基づいてトリガーされた貯金履歴を記録
 */
export const savingsHistory = pgTable("savings_history", {
  id: serial("id").primaryKey(),
  /** ユーザーID (users.openIdを参照) */
  userId: varchar("userId", { length: 64 }).notNull().references(() => users.openId),
  /** ルーID (savingsRules.idを参照) */
  ruleId: integer("ruleId").references(() => savingsRules.id),
  /** 試合ID (matches.idを参照) */
  matchId: integer("matchId").references(() => matches.id),
  /** 条件 (ルールからコピー) */
  condition: varchar("condition", { length: 256 }).notNull(),
  /** 貯金額 (円) */
  amount: integer("amount").notNull(),
  /** トリガーされた日時 */
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
});

export type SavingsHistory = typeof savingsHistory.$inferSelect;
export type InsertSavingsHistory = typeof savingsHistory.$inferInsert;

/**
 * Official match data from J.League (scraped)
 * This table stores all Marinos matches from the official source
 */
/**
 * Issue #146: DBスキーマ統一 - Google Sheets 列定義に合わせた設計
 * 
 * Sheets列定義:
 * - match_id: 固定ID（ユニーク）
 * - date: 試合日 (YYYY-MM-DD)
 * - opponent: 対戦相手
 * - home_score: ホームスコア
 * - away_score: アウェイスコア
 * - stadium: スタジアム
 * - kickoff: キックオフ時刻 (HH:MM)
 * - competition: 大会名
 * - ticket_sales_start: チケット販売開始日
 * - notes: 備考
 */
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  
  // === Sheets列に対応 ===
  /** match_id: 固定ID (Sheetsのmatch_id列) */
  matchId: varchar("matchId", { length: 32 }).notNull().unique(),
  /** date: 試合日 (YYYY-MM-DD) */
  date: varchar("date", { length: 10 }).notNull(),
  /** opponent: 対戦相手 */
  opponent: varchar("opponent", { length: 128 }).notNull(),
  /** home_score: ホームスコア */
  homeScore: integer("homeScore"),
  /** away_score: アウェイスコア */
  awayScore: integer("awayScore"),
  /** stadium: スタジアム */
  stadium: varchar("stadium", { length: 256 }),
  /** kickoff: キックオフ時刻 (HH:MM) */
  kickoff: varchar("kickoff", { length: 5 }),
  /** competition: 大会名 */
  competition: varchar("competition", { length: 128 }),
  /** ticket_sales_start: チケット販売開始日 */
  ticketSalesStart: varchar("ticketSalesStart", { length: 10 }),
  /** notes: 備考 */
  notes: text("notes"),
  
  // === メタデータ (内部管理用) ===
  /** データソース ("sheets", "jleague", "phew") */
  source: varchar("source", { length: 32 }).default("sheets").notNull(),
  /** 以前のsourceKeyとの互換性維持 */
  sourceKey: varchar("sourceKey", { length: 128 }).notNull().unique(),
  /** 試合ステータス ("Finished", "Scheduled") */
  status: varchar("status", { length: 64 }),
  /** 試合結果があるか (0=未実施, 1=実施済み) */
  isResult: integer("isResult").default(0).notNull(),
  /** マリノスのホーム/アウェイ */
  marinosSide: marinosSideEnum("marinosSide"),
  /** ホームチーム名 (内部管理用) */
  homeTeam: varchar("homeTeam", { length: 128 }).notNull(),
  /** アウェイチーム名 (内部管理用) */
  awayTeam: varchar("awayTeam", { length: 128 }).notNull(),
  /** 節ラベル (以前の互換性維持) */
  roundLabel: varchar("roundLabel", { length: 64 }),
  /** 節番号 (以前の互換性維持) */
  roundNumber: integer("roundNumber"),
  /** 試合詳細URL (以前の互換性維持) */
  matchUrl: text("matchUrl"),
  
  // === タイムスタンプ ===
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("matches_date_idx").on(table.date),
  index("matches_marinosSide_idx").on(table.marinosSide),
  index("matches_competition_idx").on(table.competition),
  index("matches_isResult_idx").on(table.isResult),
  index("matches_date_marinosSide_idx").on(table.date, table.marinosSide),
]);

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * User's match attendance log
 * Tracks which matches the user has attended or plans to attend
 */
export const userMatches = pgTable("userMatches", {
  id: serial("id").primaryKey(),
  /** Reference to user */
  userId: integer("userId").notNull(),
  /** Reference to official match (nullable for manual entries) */
  matchId: integer("matchId"),
  /** Season year for easy filtering (e.g., 2024, 2025) */
  seasonYear: integer("seasonYear"),
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
  marinosSide: marinosSideEnum("marinosSide"),
  /** Status: "planned" or "attended" */
  status: userMatchStatusEnum("status").default("planned").notNull(),
  /** Match result: W/D/L */
  resultWdl: resultWdlEnum("resultWdl"),
  /** Marinos goals */
  marinosGoals: integer("marinosGoals"),
  /** Opponent goals */
  opponentGoals: integer("opponentGoals"),
  /** Cost in JPY */
  costYen: integer("costYen").default(0).notNull(),
  /** Personal notes */
  note: text("note"),
  /** Created timestamp */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Updated timestamp */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("userMatches_userId_idx").on(table.userId),
  index("userMatches_matchId_idx").on(table.matchId),
  index("userMatches_seasonYear_idx").on(table.seasonYear),
  index("userMatches_date_idx").on(table.date),
  index("userMatches_userId_seasonYear_idx").on(table.userId, table.seasonYear),
]);

export type UserMatch = typeof userMatches.$inferSelect;
export type InsertUserMatch = typeof userMatches.$inferInsert;

/**
 * Sync log for tracking scraping operations
 */
export const syncLogs = pgTable("syncLogs", {
  id: serial("id").primaryKey(),
  /** Source (e.g., "jleague", "phew", "f-marinos") */
  source: varchar("source", { length: 32 }).notNull(),
  /** Status: "success", "partial", or "failed" */
  status: syncStatusEnum("status").notNull(),
  /** Number of matches fetched */
  matchesCount: integer("matchesCount").default(0).notNull(),
  /** Number of matches with results (scores) */
  resultsCount: integer("resultsCount").default(0),
  /** Number of upcoming matches */
  upcomingCount: integer("upcomingCount").default(0),
  /** Number of detail fetches attempted */
  detailFetched: integer("detailFetched").default(0),
  /** Number of detail fetches failed */
  detailFailed: integer("detailFailed").default(0),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  /** URLs that failed (JSON array) */
  failedUrls: text("failedUrls"),
  /** Duration in milliseconds */
  durationMs: integer("durationMs"),
  /** Sync timestamp */
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
}, (table) => [
  index("syncLogs_source_idx").on(table.source),
  index("syncLogs_syncedAt_idx").on(table.syncedAt),
  index("syncLogs_status_idx").on(table.status),
]);

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

/**
 * Match expenses - detailed expense tracking per user match
 * Categories: transport, ticket, food, other
 */
export const matchExpenses = pgTable("matchExpenses", {
  id: serial("id").primaryKey(),
  userMatchId: integer("userMatchId").notNull(),
  userId: integer("userId").notNull(),
  category: expenseCategoryEnum("category").notNull(),
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [
  index("matchExpenses_userMatchId_idx").on(table.userMatchId),
  index("matchExpenses_userId_idx").on(table.userId),
]);

export type MatchExpense = typeof matchExpenses.$inferSelect;
export type InsertMatchExpense = typeof matchExpenses.$inferInsert;

/**
 * Audit log - tracks important user actions for security and compliance
 */
export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  action: auditActionEnum("action").notNull(),
  targetId: integer("targetId"),
  targetType: varchar("targetType", { length: 32 }),
  metadata: text("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("auditLogs_userId_idx").on(table.userId),
  index("auditLogs_createdAt_idx").on(table.createdAt),
  index("auditLogs_action_idx").on(table.action),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Event log - product analytics events for feature usage tracking
 */
export const eventLogs = pgTable("eventLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  eventName: varchar("eventName", { length: 64 }).notNull(),
  eventData: text("eventData"),
  seasonYear: integer("seasonYear"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("eventLogs_userId_idx").on(table.userId),
  index("eventLogs_eventName_idx").on(table.eventName),
  index("eventLogs_createdAt_idx").on(table.createdAt),
]);

export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = typeof eventLogs.$inferInsert;

/**
 * Announcements - system announcements for users
 * Issue #205: 管理運用コンソール
 */
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 32 }).default("info").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

/**
 * Issue #18: 共有URL機能
 * 
 * ユーザーの観戦サマリーを共有するためのトークンを管理
 */
export const shareTokens = pgTable("share_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  year: integer("year"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
}, (table) => [
  index("share_tokens_user_id_idx").on(table.userId),
  index("share_tokens_token_idx").on(table.token),
]);

export type ShareToken = typeof shareTokens.$inferSelect;
export type InsertShareToken = typeof shareTokens.$inferInsert;
