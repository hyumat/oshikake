import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  /** User plan: free, plus, or pro */
  plan: mysqlEnum("plan", ["free", "plus", "pro"]).default("free").notNull(),
  /** Pro plan expiration date (null = no expiration / lifetime) */
  planExpiresAt: timestamp("planExpiresAt"),
  /** Stripe customer ID */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  /** Stripe subscription ID */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const savingsRules = mysqlTable("savings_rules", {
  id: int("id").autoincrement().primaryKey(),
  /** ユーザーID (users.openIdを参照) */
  userId: varchar("userId", { length: 64 }).notNull().references(() => users.openId),
  /** 条件 (例: "勝利", "エジガル得点", "引き分け") */
  condition: varchar("condition", { length: 256 }).notNull(),
  /** 貯金額 (円) */
  amount: int("amount").notNull(),
  /** 有効/無効 */
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavingsRule = typeof savingsRules.$inferSelect;
export type InsertSavingsRule = typeof savingsRules.$inferInsert;

/**
 * Issue #144: マリノス貯金機能 - 貯金履歴
 * 
 * 試合結果に基づいてトリガーされた貯金履歴を記録
 */
export const savingsHistory = mysqlTable("savings_history", {
  id: int("id").autoincrement().primaryKey(),
  /** ユーザーID (users.openIdを参照) */
  userId: varchar("userId", { length: 64 }).notNull().references(() => users.openId),
  /** ルーID (savingsRules.idを参照) */
  ruleId: int("ruleId").references(() => savingsRules.id),
  /** 試合ID (matches.idを参照) */
  matchId: int("matchId").references(() => matches.id),
  /** 条件 (ルールからコピー) */
  condition: varchar("condition", { length: 256 }).notNull(),
  /** 貯金額 (円) */
  amount: int("amount").notNull(),
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
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  
  // === Sheets列に対応 ===
  /** match_id: 固定ID (Sheetsのmatch_id列) */
  matchId: varchar("matchId", { length: 32 }).notNull().unique(),
  /** date: 試合日 (YYYY-MM-DD) */
  date: varchar("date", { length: 10 }).notNull(),
  /** opponent: 対戦相手 */
  opponent: varchar("opponent", { length: 128 }).notNull(),
  /** home_score: ホームスコア */
  homeScore: int("homeScore"),
  /** away_score: アウェイスコア */
  awayScore: int("awayScore"),
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

  // === Issue #123: perform_id マッピング (J.LEAGUE チケットシステム連携) ===
  /** J.LEAGUE ticket system perform_id (for future automation) */
  performId: varchar("performId", { length: 64 }),
  /** perform_id mapping status: null=未設定, "suggested"=候補, "approved"=承認済み */
  performIdStatus: mysqlEnum("performIdStatus", ["suggested", "approved"]),

  // === メタデータ (内部管理用) ===
  /** データソース ("sheets", "jleague", "phew") */
  source: varchar("source", { length: 32 }).default("sheets").notNull(),
  /** 以前のsourceKeyとの互換性維持 */
  sourceKey: varchar("sourceKey", { length: 128 }).notNull().unique(),
  /** 試合ステータス ("Finished", "Scheduled") */
  status: varchar("status", { length: 64 }),
  /** 試合結果があるか (0=未実施, 1=実施済み) */
  isResult: int("isResult").default(0).notNull(),
  /** マリノスのホーム/アウェイ */
  marinosSide: mysqlEnum("marinosSide", ["home", "away"]),
  /** ホームチーム名 (内部管理用) */
  homeTeam: varchar("homeTeam", { length: 128 }).notNull(),
  /** アウェイチーム名 (内部管理用) */
  awayTeam: varchar("awayTeam", { length: 128 }).notNull(),
  /** 節ラベル (以前の互換性維持) */
  roundLabel: varchar("roundLabel", { length: 64 }),
  /** 節番号 (以前の互換性維持) */
  roundNumber: int("roundNumber"),
  /** 試合詳細URL (以前の互換性維持) */
  matchUrl: text("matchUrl"),
  
  // === タイムスタンプ ===
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