-- ========================================
-- MIGRATION: Make session_id OPTIONAL
-- Date: 2025-10-01
-- ========================================
-- This migration allows characters to be created without being assigned to a session.
-- Run this SQL in phpMyAdmin or your MySQL admin tool.

USE snilld_dk_db;

-- Drop unique constraint (allows multiple unassigned characters per user)
ALTER TABLE characters DROP INDEX IF EXISTS unique_character_per_session;

-- Make session_id nullable
ALTER TABLE characters MODIFY COLUMN session_id INT NULL;

-- Drop old foreign key constraint (name varies, try both common patterns)
ALTER TABLE characters DROP FOREIGN KEY IF EXISTS characters_ibfk_2;
ALTER TABLE characters DROP FOREIGN KEY IF EXISTS characters_ibfk_1;

-- Add new foreign key with SET NULL on delete (instead of CASCADE)
ALTER TABLE characters 
ADD CONSTRAINT fk_characters_session 
FOREIGN KEY (session_id) 
REFERENCES game_sessions(session_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Verify changes
SELECT 
    COLUMN_NAME, 
    IS_NULLABLE, 
    COLUMN_TYPE,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'snilld_dk_db'
  AND TABLE_NAME = 'characters' 
  AND COLUMN_NAME = 'session_id';

-- Expected result: IS_NULLABLE should be 'YES'

