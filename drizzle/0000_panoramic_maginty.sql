CREATE TYPE "public"."auditAction" AS ENUM('attendance_create', 'attendance_update', 'attendance_delete', 'expense_add', 'expense_update', 'expense_delete', 'auth_login', 'auth_logout');--> statement-breakpoint
CREATE TYPE "public"."expenseCategory" AS ENUM('transport', 'ticket', 'food', 'other');--> statement-breakpoint
CREATE TYPE "public"."marinosSide" AS ENUM('home', 'away');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'plus', 'pro');--> statement-breakpoint
CREATE TYPE "public"."resultWdl" AS ENUM('W', 'D', 'L');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."syncStatus" AS ENUM('success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."userMatchStatus" AS ENUM('planned', 'attended');--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" "auditAction" NOT NULL,
	"targetId" integer,
	"targetType" varchar(32),
	"metadata" text,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"eventName" varchar(64) NOT NULL,
	"eventData" text,
	"seasonYear" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matchExpenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userMatchId" integer NOT NULL,
	"userId" integer NOT NULL,
	"category" "expenseCategory" NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"matchId" varchar(32) NOT NULL,
	"date" varchar(10) NOT NULL,
	"opponent" varchar(128) NOT NULL,
	"homeScore" integer,
	"awayScore" integer,
	"stadium" varchar(256),
	"kickoff" varchar(5),
	"competition" varchar(128),
	"ticketSalesStart" varchar(10),
	"notes" text,
	"source" varchar(32) DEFAULT 'sheets' NOT NULL,
	"sourceKey" varchar(128) NOT NULL,
	"status" varchar(64),
	"isResult" integer DEFAULT 0 NOT NULL,
	"marinosSide" "marinosSide",
	"homeTeam" varchar(128) NOT NULL,
	"awayTeam" varchar(128) NOT NULL,
	"roundLabel" varchar(64),
	"roundNumber" integer,
	"matchUrl" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "matches_matchId_unique" UNIQUE("matchId"),
	CONSTRAINT "matches_sourceKey_unique" UNIQUE("sourceKey")
);
--> statement-breakpoint
CREATE TABLE "savings_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"ruleId" integer,
	"matchId" integer,
	"condition" varchar(256) NOT NULL,
	"amount" integer NOT NULL,
	"triggeredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(64) NOT NULL,
	"condition" varchar(256) NOT NULL,
	"amount" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "syncLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(32) NOT NULL,
	"status" "syncStatus" NOT NULL,
	"matchesCount" integer DEFAULT 0 NOT NULL,
	"resultsCount" integer DEFAULT 0,
	"upcomingCount" integer DEFAULT 0,
	"detailFetched" integer DEFAULT 0,
	"detailFailed" integer DEFAULT 0,
	"errorMessage" text,
	"failedUrls" text,
	"durationMs" integer,
	"syncedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userMatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"matchId" integer,
	"seasonYear" integer,
	"date" varchar(10) NOT NULL,
	"kickoff" varchar(5),
	"competition" varchar(128),
	"opponent" varchar(128) NOT NULL,
	"stadium" varchar(256),
	"marinosSide" "marinosSide",
	"status" "userMatchStatus" DEFAULT 'planned' NOT NULL,
	"resultWdl" "resultWdl",
	"marinosGoals" integer,
	"opponentGoals" integer,
	"costYen" integer DEFAULT 0 NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"planExpiresAt" timestamp,
	"stripeCustomerId" varchar(255),
	"stripeSubscriptionId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "savings_history" ADD CONSTRAINT "savings_history_userId_users_openId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("openId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_history" ADD CONSTRAINT "savings_history_ruleId_savings_rules_id_fk" FOREIGN KEY ("ruleId") REFERENCES "public"."savings_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_history" ADD CONSTRAINT "savings_history_matchId_matches_id_fk" FOREIGN KEY ("matchId") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_rules" ADD CONSTRAINT "savings_rules_userId_users_openId_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("openId") ON DELETE no action ON UPDATE no action;