-- =====================================================
-- CAMPAIGN GAME TIME REDESIGN
-- Change from datetime to start date + seconds since start
-- =====================================================

-- Add new columns for game time tracking
ALTER TABLE campaigns 
ADD COLUMN campaign_start_datetime DATETIME NULL AFTER campaign_description,
ADD COLUMN game_time_seconds BIGINT DEFAULT 0 AFTER campaign_start_datetime;

-- Migrate existing game_time data
-- Set start datetime to campaign creation or game_time if it exists
-- Calculate seconds since start
UPDATE campaigns 
SET campaign_start_datetime = COALESCE(game_time, created_at),
    game_time_seconds = CASE 
        WHEN game_time IS NOT NULL THEN 
            TIMESTAMPDIFF(SECOND, created_at, game_time)
        ELSE 0
    END
WHERE campaign_start_datetime IS NULL;

-- Note: game_time column can be kept for backward compatibility or removed later
-- For now, we'll keep it but use the new columns going forward
