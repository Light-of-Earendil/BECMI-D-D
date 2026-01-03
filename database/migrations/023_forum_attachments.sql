-- =====================================================
-- Migration: Forum Post Attachments
-- Date: 2026-01-03
-- Description: Create forum_post_attachments table for image uploads
-- =====================================================

-- Forum post attachments table
CREATE TABLE IF NOT EXISTS forum_post_attachments (
    attachment_id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL COMMENT 'File size in bytes',
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_post_id (post_id),
    FOREIGN KEY (post_id) REFERENCES forum_posts(post_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment
ALTER TABLE forum_post_attachments 
MODIFY COLUMN attachment_id INT AUTO_INCREMENT PRIMARY KEY 
COMMENT 'Forum post image attachments';
