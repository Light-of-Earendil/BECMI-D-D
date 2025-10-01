-- Migration: Make session_id optional in characters table
-- Date: 2025-10-01
-- Description: Allow characters to be created without being assigned to a session

-- Step 1: Drop the unique constraint on (user_id, session_id)
ALTER TABLE characters DROP INDEX unique_character_per_session;

-- Step 2: Modify session_id column to allow NULL
ALTER TABLE characters MODIFY COLUMN session_id INT NULL;

-- Step 3: Drop existing foreign key constraint
-- Note: MySQL auto-generates FK names, so we need to find it first
-- Run this query to find FK name: 
-- SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE TABLE_NAME = 'characters' AND COLUMN_NAME = 'session_id';

-- For now, using common naming pattern:
ALTER TABLE characters DROP FOREIGN KEY characters_ibfk_2;

-- Step 4: Re-add foreign key with ON DELETE SET NULL
ALTER TABLE characters 
ADD CONSTRAINT characters_session_fk 
FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) 
ON DELETE SET NULL;

-- Verification: Check that session_id is now nullable
-- SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'characters' AND COLUMN_NAME = 'session_id';

