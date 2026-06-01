-- =====================================================
-- Migration: Client Error Logging
-- Date: 2026-03-06
-- Description: Persist client-side JavaScript errors and recent API activity
-- =====================================================

CREATE TABLE IF NOT EXISTS client_errors (
    client_error_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    error_id VARCHAR(64) NOT NULL,
    request_id VARCHAR(64) NULL,
    user_id INT NULL,
    message VARCHAR(500) NOT NULL,
    stack_trace TEXT NULL,
    url VARCHAR(500) NULL,
    user_agent VARCHAR(500) NULL,
    context_json MEDIUMTEXT NULL,
    api_activity_json MEDIUMTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client_errors_error_id (error_id),
    INDEX idx_client_errors_request_id (request_id),
    INDEX idx_client_errors_user_id (user_id),
    INDEX idx_client_errors_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
