-- =====================================================
-- Migration: Email Queue System
-- Date: 2026-01-03
-- Description: Create email queue table for asynchronous email sending
-- =====================================================

-- Email queue table
CREATE TABLE IF NOT EXISTS email_queue (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(100) NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('pending', 'processing', 'sent', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT NULL,
    scheduled_at DATETIME NULL COMMENT 'Send email at specific time (NULL = send immediately)',
    sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_priority_status (priority, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment
ALTER TABLE email_queue 
MODIFY COLUMN queue_id INT AUTO_INCREMENT PRIMARY KEY 
COMMENT 'Email queue for asynchronous email sending';

