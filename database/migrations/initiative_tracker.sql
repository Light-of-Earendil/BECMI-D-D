-- Initiative Tracker for BECMI D&D
-- Simple 1d6 system per BECMI rules

CREATE TABLE IF NOT EXISTS combat_initiatives (
    initiative_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    character_id INT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_type ENUM('character', 'npc', 'monster') NOT NULL DEFAULT 'character',
    initiative_roll INT NOT NULL,
    dexterity INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
    
    INDEX idx_session_initiative (session_id, initiative_roll DESC),
    INDEX idx_session_active (session_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Current turn tracker for session
CREATE TABLE IF NOT EXISTS combat_current_turn (
    session_id INT PRIMARY KEY,
    current_initiative_id INT NOT NULL,
    round_number INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (current_initiative_id) REFERENCES combat_initiatives(initiative_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

