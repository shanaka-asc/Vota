-- Migration: Add is_closed column to polls table
-- Created: 2026-01-30

ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;

-- Comment to explain the column usage
COMMENT ON COLUMN polls.is_closed IS 'Indicates if the poll is closed for new responses.';
