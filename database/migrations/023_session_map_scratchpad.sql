-- =====================================================
-- Migration: Session Map Scratch-Pad System
-- Date: 2026-01-XX
-- Description: Create tables for multiplayer map scratch-pad with drawing and token support
-- =====================================================

-- Session maps table
CREATE TABLE IF NOT EXISTS session_maps (
    map_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    map_name VARCHAR(100) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_width INT,
    image_height INT,
    is_active BOOLEAN DEFAULT FALSE,
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_session_active (session_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session map drawings table
CREATE TABLE IF NOT EXISTS session_map_drawings (
    drawing_id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT NOT NULL,
    user_id INT NOT NULL,
    drawing_type ENUM('stroke', 'erase') DEFAULT 'stroke',
    color VARCHAR(7) DEFAULT '#000000',
    brush_size INT DEFAULT 3,
    path_data TEXT NOT NULL COMMENT 'JSON array of {x, y} points',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES session_maps(map_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_map_created (map_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session map tokens table
CREATE TABLE IF NOT EXISTS session_map_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT NOT NULL,
    character_id INT NULL,
    user_id INT NOT NULL,
    token_type ENUM('marker', 'portrait') DEFAULT 'marker',
    x_position DECIMAL(10,2) NOT NULL,
    y_position DECIMAL(10,2) NOT NULL,
    color VARCHAR(7) DEFAULT '#FF0000',
    label VARCHAR(50),
    portrait_url VARCHAR(500) NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES session_maps(map_id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_map_position (map_id, x_position, y_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
