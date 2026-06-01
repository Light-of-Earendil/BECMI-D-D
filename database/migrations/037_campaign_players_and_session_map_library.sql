-- =====================================================
-- Campaign players + shared session map library
-- Adds a reusable campaign roster and map asset lineage
-- =====================================================

CREATE TABLE IF NOT EXISTS campaign_players (
    campaign_id INT NOT NULL,
    user_id INT NOT NULL,
    added_by_user_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, user_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (added_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_campaign_players_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE session_maps
ADD COLUMN source_map_id INT NULL AFTER session_id,
ADD INDEX idx_session_maps_source (source_map_id);
