CREATE TYPE "public"."matchOutcome" AS ENUM('win', 'draw', 'loss');--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"label" varchar(64),
	"startDate" varchar(10),
	"endDate" varchar(10),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"slug" varchar(32) NOT NULL,
	"aliases" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "teams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "teamId" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "seasonId" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ticketSales1" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ticketSales2" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ticketSales3" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "ticketSalesGeneral" timestamp;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "resultScore" varchar(16);--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "resultOutcome" "matchOutcome";--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_seasonId_seasons_id_fk" FOREIGN KEY ("seasonId") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_teamId_idx" ON "matches" USING btree ("teamId");--> statement-breakpoint
CREATE INDEX "matches_seasonId_idx" ON "matches" USING btree ("seasonId");--> statement-breakpoint
CREATE INDEX "matches_teamId_seasonId_idx" ON "matches" USING btree ("teamId","seasonId");