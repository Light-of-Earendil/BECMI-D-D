-- =====================================================
-- Migration: Monsters Table (Monster Types/Templates)
-- Date: 2026-01-04
-- Description: Create monsters table with BECMI Rules Cyclopedia stats
-- =====================================================

CREATE TABLE IF NOT EXISTS monsters (
    monster_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    armor_class INT NOT NULL,
    hit_dice VARCHAR(50) NOT NULL,  -- e.g., "3*", "11****", "8***"
    move_ground VARCHAR(50),         -- e.g., "60' (20')"
    move_flying VARCHAR(50) NULL,     -- e.g., "150' (50')"
    move_swimming VARCHAR(50) NULL,  -- e.g., "360' (120')"
    attacks VARCHAR(200) NOT NULL,   -- e.g., "2 claws/1 weapon + special"
    damage VARCHAR(200) NOT NULL,     -- e.g., "1d4/1d4/1d6"
    no_appearing VARCHAR(50) NOT NULL, -- e.g., "1d6 (2d4)"
    save_as VARCHAR(50) NOT NULL,     -- e.g., "F6", "C (level = HD)"
    morale INT NOT NULL,
    treasure_type VARCHAR(10) NULL,  -- e.g., "C", "H x 2, I"
    intelligence INT NOT NULL,
    alignment ENUM('Lawful', 'Neutral', 'Chaotic') NOT NULL,
    xp_value INT NOT NULL,
    description TEXT,
    monster_type VARCHAR(100),       -- e.g., "Monster (Rare)", "Humanoid (Common)"
    terrain VARCHAR(200),            -- e.g., "Hill, Mountain"
    `load` VARCHAR(100) NULL,          -- e.g., "1,000 cn at full speed"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_monster_type (monster_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
