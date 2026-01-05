-- =====================================================
-- TIME-BASED EFFECTS SYSTEM
-- Tracks and manages time-based effects like spells, hunger, thirst, etc.
-- =====================================================

-- Create time-based effects table
CREATE TABLE IF NOT EXISTS time_based_effects (
    effect_id INT AUTO_INCREMENT PRIMARY KEY,
    character_id INT NOT NULL,
    session_id INT NULL,
    campaign_id INT NULL,
    effect_type VARCHAR(50) NOT NULL, -- 'spell', 'condition', 'hunger', 'thirst', 'age', 'custom'
    effect_name VARCHAR(100) NOT NULL,
    effect_description TEXT,
    duration_seconds INT NOT NULL, -- Total duration in seconds
    remaining_seconds INT NOT NULL, -- Remaining duration in seconds
    started_at_game_time_seconds BIGINT NOT NULL, -- Game time seconds when effect started
    expires_at_game_time_seconds BIGINT NOT NULL, -- Game time seconds when effect expires
    effect_data JSON, -- Additional effect-specific data
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    INDEX idx_character_active (character_id, is_active),
    INDEX idx_campaign_active (campaign_id, is_active),
    INDEX idx_expires_at (expires_at_game_time_seconds, is_active),
    INDEX idx_effect_type (effect_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create time advancement log for tracking when time was advanced
CREATE TABLE IF NOT EXISTS time_advancement_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    session_id INT NULL,
    advanced_by_user_id INT NOT NULL,
    time_advanced_seconds INT NOT NULL,
    previous_game_time_seconds BIGINT NOT NULL,
    new_game_time_seconds BIGINT NOT NULL,
    advancement_type VARCHAR(20) NOT NULL, -- 'round', 'turn', 'day', 'custom'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (advanced_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_campaign_time (campaign_id, created_at),
    INDEX idx_session_time (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
