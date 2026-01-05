-- =====================================================
-- BECMI CAMPAIGNS SYSTEM
-- Supports campaign creation and linking sessions to campaigns
-- =====================================================

-- Campaigns table - stores campaign metadata
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_name VARCHAR(100) NOT NULL,
    campaign_description TEXT,
    dm_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dm_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_dm_user (dm_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add campaign_id to game_sessions table
ALTER TABLE game_sessions 
ADD COLUMN campaign_id INT NULL AFTER dm_user_id,
ADD FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE SET NULL,
ADD INDEX idx_campaign (campaign_id);

-- Add campaign_id to hex_maps table (in addition to session_id)
ALTER TABLE hex_maps 
ADD COLUMN campaign_id INT NULL AFTER created_by_user_id,
ADD FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE SET NULL,
ADD INDEX idx_campaign (campaign_id);
