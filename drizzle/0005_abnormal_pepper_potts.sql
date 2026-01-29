ALTER TABLE "matches" ADD COLUMN "attendance" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;