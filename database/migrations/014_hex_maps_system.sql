-- =====================================================
-- BECMI HEX MAPS SYSTEM
-- Supports hex map creation, editing, and play mode with fog of war
-- =====================================================

-- Hex maps table - stores map metadata
CREATE TABLE IF NOT EXISTS hex_maps (
    map_id INT AUTO_INCREMENT PRIMARY KEY,
    map_name VARCHAR(100) NOT NULL,
    map_description TEXT,
    created_by_user_id INT NOT NULL,
    session_id INT NULL, -- Optional: can be linked to a session
    width_hexes INT DEFAULT 20, -- Map width in hexes
    height_hexes INT DEFAULT 20, -- Map height in hexes
    hex_size_pixels INT DEFAULT 50, -- Size of each hex in pixels for display
    background_image_url VARCHAR(500) NULL, -- Optional background image
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE SET NULL,
    INDEX idx_created_by (created_by_user_id),
    INDEX idx_session (session_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hex tiles table - stores individual hex data
-- Uses axial coordinates (q, r) for hex grid
CREATE TABLE IF NOT EXISTS hex_tiles (
    tile_id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT NOT NULL,
    q INT NOT NULL, -- Axial coordinate q (column-like)
    r INT NOT NULL, -- Axial coordinate r (row-like)
    terrain_type VARCHAR(50) DEFAULT 'plains', -- plains, forest, mountain, water, desert, etc.
    terrain_name VARCHAR(100) NULL, -- Optional name for this hex
    description TEXT, -- DM notes/description
    notes TEXT, -- Additional DM notes
    image_url VARCHAR(500) NULL, -- Optional tile image
    elevation INT DEFAULT 0, -- Elevation in feet
    is_passable BOOLEAN DEFAULT TRUE, -- Can players move through this hex?
    movement_cost INT DEFAULT 1, -- Movement cost (1 = normal, 2 = difficult, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES hex_maps(map_id) ON DELETE CASCADE,
    UNIQUE KEY unique_hex (map_id, q, r),
    INDEX idx_map_coords (map_id, q, r),
    INDEX idx_terrain (terrain_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hex visibility table - tracks what each player can see
-- Visibility levels:
-- 0 = not visible (fog of war)
-- 1 = partially visible (neighbor info only - can see terrain type but not details)
-- 2 = fully visible (current hex or revealed by DM)
CREATE TABLE IF NOT EXISTS hex_visibility (
    visibility_id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT NOT NULL,
    user_id INT NOT NULL, -- Player user ID
    q INT NOT NULL,
    r INT NOT NULL,
    visibility_level TINYINT DEFAULT 0, -- 0=hidden, 1=partial, 2=full
    discovered_at TIMESTAMP NULL, -- When this hex was first discovered
    last_viewed_at TIMESTAMP NULL, -- Last time player viewed this hex
    FOREIGN KEY (map_id) REFERENCES hex_maps(map_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_visibility (map_id, user_id, q, r),
    INDEX idx_map_user (map_id, user_id),
    INDEX idx_visibility_level (map_id, user_id, visibility_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hex player positions - tracks where each character is on the map
CREATE TABLE IF NOT EXISTS hex_player_positions (
    position_id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT NOT NULL,
    character_id INT NOT NULL,
    q INT NOT NULL,
    r INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES hex_maps(map_id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
    UNIQUE KEY unique_character_position (map_id, character_id),
    INDEX idx_map_coords (map_id, q, r),
    INDEX idx_character (character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hex map markers - for placing markers, notes, or points of interest
CREATE TABLE IF NOT EXISTS hex_map_markers (
    marker_id INT AUTO_INCREMENT PRIMARY KEY,
    map_id INT NOT NULL,
    q INT NOT NULL,
    r INT NOT NULL,
    marker_type VARCHAR(50) DEFAULT 'note', -- note, poi, encounter, treasure, etc.
    marker_name VARCHAR(100) NULL,
    marker_description TEXT,
    marker_icon VARCHAR(50) DEFAULT 'pin', -- Icon type
    marker_color VARCHAR(7) DEFAULT '#FF0000', -- Hex color
    is_visible_to_players BOOLEAN DEFAULT FALSE, -- Can players see this marker?
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (map_id) REFERENCES hex_maps(map_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_map_coords (map_id, q, r),
    INDEX idx_visible (is_visible_to_players)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
