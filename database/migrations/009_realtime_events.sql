-- =====================================================
-- BECMI REAL-TIME EVENTS SYSTEM
-- Supports long-polling for real-time updates during sessions
-- =====================================================

-- Create session events table for real-time updates
CREATE TABLE IF NOT EXISTS session_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSON NOT NULL,
    created_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_session_unprocessed (session_id, processed, created_at),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create table for tracking last poll time per user/session
CREATE TABLE IF NOT EXISTS user_session_activity (
    user_id INT NOT NULL,
    session_id INT NOT NULL,
    last_poll_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_event_id INT DEFAULT 0,
    is_online BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (user_id, session_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    INDEX idx_online_status (session_id, is_online)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cleanup old events (run this periodically via cron)
-- Events older than 24 hours will be marked as processed
CREATE EVENT IF NOT EXISTS cleanup_old_session_events
ON SCHEDULE EVERY 1 HOUR
DO
    UPDATE session_events 
    SET processed = TRUE, processed_at = NOW()
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) AND processed = FALSE;

COMMIT;

