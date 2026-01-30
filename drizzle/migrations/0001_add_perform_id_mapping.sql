-- Migration: Add performId mapping columns for Issue #123
-- Date: 2026-01-16
-- Description: Add J.LEAGUE ticket system perform_id columns to matches table for semi-automatic mapping

-- Add performId column (nullable varchar)
ALTER TABLE matches
ADD COLUMN performId VARCHAR(64) DEFAULT NULL;

-- Add performIdStatus enum column (nullable)
ALTER TABLE matches
ADD COLUMN performIdStatus ENUM('suggested', 'approved') DEFAULT NULL;

-- Add index on performId for faster lookups
CREATE INDEX idx_matches_performId ON matches(performId);

-- Add index on performIdStatus for filtering
CREATE INDEX idx_matches_performIdStatus ON matches(performIdStatus);
