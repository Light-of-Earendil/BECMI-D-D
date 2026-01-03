-- =====================================================
-- Migration: Add Google Meet Link to Sessions
-- Date: 2026-01-03
-- Description: Add video conference link field to game_sessions table
-- =====================================================

-- Add meet_link column to game_sessions table
ALTER TABLE game_sessions 
ADD COLUMN meet_link VARCHAR(500) NULL 
AFTER session_description;

-- Add index for faster lookups
CREATE INDEX idx_meet_link ON game_sessions(meet_link(100));

-- Add comment
ALTER TABLE game_sessions 
MODIFY COLUMN meet_link VARCHAR(500) NULL 
COMMENT 'Google Meet or other video conference link for the session';
