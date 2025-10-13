-- =====================================================
-- NOTIFICATION PREFERENCES
-- User preferences for email and browser notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id INT PRIMARY KEY,
    email_session_reminders BOOLEAN DEFAULT TRUE,
    email_session_cancelled BOOLEAN DEFAULT TRUE,
    email_xp_awarded BOOLEAN DEFAULT FALSE,
    browser_hp_critical BOOLEAN DEFAULT TRUE,
    browser_xp_awarded BOOLEAN DEFAULT TRUE,
    browser_item_received BOOLEAN DEFAULT TRUE,
    browser_session_starting BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create default preferences for existing users
INSERT IGNORE INTO user_notification_preferences (user_id)
SELECT user_id FROM users WHERE is_active = TRUE;

COMMIT;

