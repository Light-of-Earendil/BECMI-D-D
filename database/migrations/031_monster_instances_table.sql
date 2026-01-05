-- =====================================================
-- Migration: Monster Instances Table
-- Date: 2026-01-04
-- Description: Create monster_instances table for individual monster instances in sessions
-- =====================================================

CREATE TABLE IF NOT EXISTS monster_instances (
    instance_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    monster_id INT NOT NULL,
    instance_name VARCHAR(100) NOT NULL,  -- e.g., "Hobgoblin #1", "Gorthak the Destroyer"
    is_named_boss BOOLEAN DEFAULT FALSE,  -- TRUE for unique named monsters, FALSE for generic instances
    current_hp INT NOT NULL,
    max_hp INT NOT NULL,
    armor_class INT NULL,  -- Kan overrides monster template AC
    dexterity INT NULL,    -- For initiative
    equipment TEXT NULL,   -- JSON array of equipment items
    treasure TEXT NULL,     -- JSON array of treasure items
    spells TEXT NULL,       -- JSON array of spells (for spellcasting monsters)
    notes TEXT NULL,        -- DM notes about this specific instance
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (monster_id) REFERENCES monsters(monster_id) ON DELETE RESTRICT,
    INDEX idx_session_active (session_id, is_active),
    INDEX idx_named_boss (is_named_boss)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
