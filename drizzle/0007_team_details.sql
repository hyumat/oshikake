-- Issue #72: teams テーブルに詳細カラムを追加
-- チーム略称、エンブレム画像URL、カラー、スタジアム情報

ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "shortName" varchar(32);
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "emblemUrl" varchar(512);
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "primaryColor" varchar(16);
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "secondaryColor" varchar(16);
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "stadiumName" varchar(128);
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "stadiumAddress" varchar(256);
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "stadiumCapacity" integer;
