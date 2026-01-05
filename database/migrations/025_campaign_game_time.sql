-- =====================================================
-- CAMPAIGN GAME TIME
-- Move game time tracking from hex maps to campaigns
-- =====================================================

-- Add game_time to campaigns table
ALTER TABLE campaigns 
ADD COLUMN game_time DATETIME NULL AFTER campaign_description;
