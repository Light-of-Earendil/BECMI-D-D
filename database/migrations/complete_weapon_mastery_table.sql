-- =====================================================
-- COMPLETE WEAPON MASTERY TABLE
-- Based on Rules Cyclopedia Weapon Mastery Tables
-- This implements the FULL weapon mastery system with
-- damage progression, defense bonuses, and special effects
-- =====================================================

-- Create weapon_mastery_levels table
CREATE TABLE IF NOT EXISTS weapon_mastery_levels (
    mastery_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    mastery_level ENUM('basic', 'skilled', 'expert', 'master', 'grand_master') NOT NULL,
    
    -- Damage progression
    primary_damage VARCHAR(20), -- e.g., "1d6", "1d8+1", "P=1d8+10"
    secondary_damage VARCHAR(20), -- e.g., "1d6+8", "S=1d6+8"
    
    -- Range (for missile weapons)
    short_range INT DEFAULT NULL,
    medium_range INT DEFAULT NULL,
    long_range INT DEFAULT NULL,
    
    -- Defense bonuses
    hand_held_defense VARCHAR(20) DEFAULT NULL, -- e.g., "H:-1AC/1"
    missile_defense VARCHAR(20) DEFAULT NULL,   -- e.g., "M:-2AC/2"
    
    -- Special effects
    special_effects TEXT DEFAULT NULL, -- e.g., "Deflect (1)", "Stun (s/m)"
    
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    UNIQUE KEY unique_weapon_mastery (item_id, mastery_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clear existing data
DELETE FROM weapon_mastery_levels;

-- =====================================================
-- MISSILE WEAPONS MASTERY LEVELS
-- =====================================================

-- Short Bow
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(7, 'basic', 50, 100, 150, '1d6', NULL, NULL, NULL),
(7, 'skilled', 60, 120, 180, '1d6', NULL, 'M:-1AC/1', NULL),
(7, 'expert', 70, 140, 210, '1d8', NULL, 'M:-2AC/2', NULL),
(7, 'master', 80, 160, 240, 'P=1d8+2', NULL, 'M:-3AC/2', NULL),
(7, 'grand_master', 90, 180, 270, 'P=1d8+4', NULL, 'M:-4AC/3', NULL);

-- Long Bow  
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(27, 'basic', 70, 140, 210, '1d6', NULL, NULL, NULL),
(27, 'skilled', 80, 160, 240, '1d6', NULL, 'M:-1AC/1', NULL),
(27, 'expert', 90, 180, 270, '1d8', NULL, 'M:-2AC/2', NULL),
(27, 'master', 100, 200, 300, 'P=1d8+2', NULL, 'M:-3AC/2', NULL),
(27, 'grand_master', 110, 220, 330, 'P=1d8+4', NULL, 'M:-4AC/3', NULL);

-- Crossbow (Light)
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(29, 'basic', 60, 120, 180, '1d6', NULL, NULL, NULL),
(29, 'skilled', 70, 140, 210, '1d6', NULL, 'M:-1AC/1', NULL),
(29, 'expert', 80, 160, 240, '1d8', NULL, 'M:-2AC/2', NULL),
(29, 'master', 90, 180, 270, 'P=1d8+2', NULL, 'M:-3AC/2', NULL),
(29, 'grand_master', 100, 200, 300, 'P=1d8+4', NULL, 'M:-4AC/3', NULL);

-- Crossbow (Heavy)
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(28, 'basic', 80, 160, 240, '2d4', NULL, NULL, NULL),
(28, 'skilled', 90, 180, 270, '2d4', NULL, 'M:-1AC/1', NULL),
(28, 'expert', 100, 200, 300, '2d4+1', NULL, 'M:-2AC/2', NULL),
(28, 'master', 110, 220, 330, 'P=2d4+3', NULL, 'M:-3AC/2', NULL),
(28, 'grand_master', 120, 240, 360, 'P=2d4+5', NULL, 'M:-4AC/3', NULL);

-- Sling
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(30, 'basic', 40, 80, 120, '1d4', NULL, NULL, NULL),
(30, 'skilled', 50, 100, 150, '1d4', NULL, 'M:-1AC/1', NULL),
(30, 'expert', 60, 120, 180, '1d6', NULL, 'M:-2AC/2', NULL),
(30, 'master', 70, 140, 210, 'P=1d6+2', NULL, 'M:-3AC/2', NULL),
(30, 'grand_master', 80, 160, 240, 'P=1d6+4', NULL, 'M:-4AC/3', NULL);

-- =====================================================
-- HAND-HELD WEAPONS EASILY THROWN
-- =====================================================

-- Dagger
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(1, 'basic', 10, 20, 30, '1d4', NULL, NULL, NULL),
(1, 'skilled', 15, 30, 45, '1d4', 'H:-1AC/1', NULL, NULL),
(1, 'expert', 20, 40, 60, '1d6', 'H:-2AC/2', NULL, NULL),
(1, 'master', 25, 50, 75, 'P=1d6+2', 'H:-3AC/2', NULL, NULL),
(1, 'grand_master', 30, 60, 90, 'P=1d6+4', 'H:-4AC/3', NULL);

-- Hand Axe
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(23, 'basic', 10, 20, 30, '1d6', NULL, NULL, NULL),
(23, 'skilled', 15, 30, 45, '1d6', 'H:-1AC/1', NULL, NULL),
(23, 'expert', 20, 40, 60, '1d8', 'H:-2AC/2', NULL, NULL),
(23, 'master', 25, 50, 75, 'P=1d8+2', 'H:-3AC/2', NULL, NULL),
(23, 'grand_master', 30, 60, 90, 'P=1d8+4', 'H:-4AC/3', NULL);

-- Javelin
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(25, 'basic', 20, 40, 60, '1d6', NULL, NULL, NULL),
(25, 'skilled', 30, 60, 90, '1d6', 'H:-1AC/1', NULL, NULL),
(25, 'expert', 40, 80, 120, '1d8', 'H:-2AC/2', NULL, NULL),
(25, 'master', 50, 100, 150, 'P=1d8+2', 'H:-3AC/2', NULL, NULL),
(25, 'grand_master', 60, 120, 180, 'P=1d8+4', 'H:-4AC/3', NULL);

-- Spear
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(6, 'basic', 20, 40, 60, '1d6', NULL, NULL, NULL),
(6, 'skilled', 30, 60, 90, '1d6', 'H:-1AC/1', NULL, NULL),
(6, 'expert', 40, 80, 120, '1d8', 'H:-2AC/2', NULL, NULL),
(6, 'master', 50, 100, 150, 'P=1d8+2', 'H:-3AC/2', NULL, NULL),
(6, 'grand_master', 60, 120, 180, 'P=1d8+4', 'H:-4AC/3', NULL);

-- Trident
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(26, 'basic', 20, 40, 60, '1d6', NULL, NULL, NULL),
(26, 'skilled', 30, 60, 90, '1d6', 'H:-1AC/1', NULL, NULL),
(26, 'expert', 40, 80, 120, '1d8', 'H:-2AC/2', NULL, NULL),
(26, 'master', 50, 100, 150, 'P=1d8+2', 'H:-3AC/2', NULL, NULL),
(26, 'grand_master', 60, 120, 180, 'P=1d8+4', 'H:-4AC/3', NULL);

-- =====================================================
-- HAND-HELD WEAPONS FOR HAND-HELD USE ONLY
-- =====================================================

-- Normal Sword
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(3, 'basic', '1d8', NULL, NULL, NULL, NULL),
(3, 'skilled', '1d8+1', NULL, 'H:-1AC/1', NULL, NULL),
(3, 'expert', '1d8+2', NULL, 'H:-2AC/2', NULL, 'Deflect (1)'),
(3, 'master', 'P=1d8+4', 'S=1d8+2', 'H:-3AC/2', NULL, 'Deflect (2)'),
(3, 'grand_master', 'P=1d8+6', 'S=1d8+4', 'H:-4AC/3', NULL, 'Deflect (3)');

-- Short Sword
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(2, 'basic', '1d6', NULL, NULL, NULL, NULL),
(2, 'skilled', '1d6+1', NULL, 'H:-1AC/1', NULL, NULL),
(2, 'expert', '1d6+2', NULL, 'H:-2AC/2', NULL, 'Deflect (1)'),
(2, 'master', 'P=1d6+4', 'S=1d6+2', 'H:-3AC/2', NULL, 'Deflect (2)'),
(2, 'grand_master', 'P=1d6+6', 'S=1d6+4', 'H:-4AC/3', NULL, 'Deflect (3)');

-- Two-Handed Sword
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(32, 'basic', '1d10', NULL, NULL, NULL, NULL),
(32, 'skilled', '1d10+1', NULL, 'H:-1AC/1', NULL, NULL),
(32, 'expert', '1d10+2', NULL, 'H:-2AC/2', NULL, 'Deflect (1)'),
(32, 'master', 'P=1d10+4', 'S=1d10+2', 'H:-3AC/2', NULL, 'Deflect (2)'),
(32, 'grand_master', 'P=1d10+6', 'S=1d10+4', 'H:-4AC/3', NULL, 'Deflect (3)');

-- Bastard Sword (1-Hand)
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(31, 'basic', '1d6+1', NULL, NULL, NULL, NULL),
(31, 'skilled', '1d6+2', NULL, 'H:-1AC/1', NULL, NULL),
(31, 'expert', '1d8+1', NULL, 'H:-2AC/2', NULL, 'Deflect (1)'),
(31, 'master', 'P=1d8+3', 'S=1d6+1', 'H:-3AC/2', NULL, 'Deflect (2)'),
(31, 'grand_master', 'P=1d8+10', 'S=1d6+8', 'H:-4AC/3', NULL, 'Deflect (2)');

-- Bastard Sword (2-Hand)
INSERT INTO weapon_mastery_levels (item_id, mastery_level, short_range, medium_range, long_range, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(37, 'basic', NULL, NULL, NULL, '1d8+1', NULL, NULL, NULL, NULL),
(37, 'skilled', NULL, NULL, NULL, '1d8+2', NULL, NULL, NULL, 'Deflect (1)'),
(37, 'expert', NULL, NULL, 5, '1d10+1', NULL, 'H:-1AC/1', NULL, 'Deflect (1)'),
(37, 'master', NULL, NULL, 5, 'P=1d10+3', 'S=1d8+1', 'H:-2AC/2', NULL, 'Deflect (2)'),
(37, 'grand_master', NULL, NULL, 5, 'P=1d12+10', 'S=1d10+8', 'H:-3AC/2', NULL, 'Deflect (3)');

-- Battle Axe
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(4, 'basic', '1d8', NULL, NULL, NULL, NULL),
(4, 'skilled', '1d8+1', NULL, 'H:-1AC/1', NULL, NULL),
(4, 'expert', '1d8+2', NULL, 'H:-2AC/2', NULL, NULL),
(4, 'master', 'P=1d8+4', 'S=1d8+2', 'H:-3AC/2', NULL, NULL),
(4, 'grand_master', 'P=1d8+6', 'S=1d8+4', 'H:-4AC/3', NULL, NULL);

-- Mace
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(5, 'basic', '1d6', NULL, NULL, NULL, NULL),
(5, 'skilled', '1d6+1', NULL, 'H:-1AC/1', NULL, NULL),
(5, 'expert', '1d6+2', NULL, 'H:-2AC/2', NULL, NULL),
(5, 'master', 'P=1d6+4', 'S=1d6+2', 'H:-3AC/2', NULL, NULL),
(5, 'grand_master', 'P=1d6+6', 'S=1d6+4', 'H:-4AC/3', NULL, NULL);

-- War Hammer
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(33, 'basic', '1d6', NULL, NULL, NULL, NULL),
(33, 'skilled', '1d6+1', NULL, 'H:-1AC/1', NULL, NULL),
(33, 'expert', '1d6+2', NULL, 'H:-2AC/2', NULL, NULL),
(33, 'master', 'P=1d6+4', 'S=1d6+2', 'H:-3AC/2', NULL, NULL),
(33, 'grand_master', 'P=1d6+6', 'S=1d6+4', 'H:-4AC/3', NULL, NULL);

-- Staff
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(36, 'basic', '1d6', NULL, NULL, NULL, NULL),
(36, 'skilled', '1d6+1', NULL, 'H:-1AC/1', NULL, NULL),
(36, 'expert', '1d6+2', NULL, 'H:-2AC/2', NULL, NULL),
(36, 'master', 'P=1d6+4', 'S=1d6+2', 'H:-3AC/2', NULL, NULL),
(36, 'grand_master', 'P=1d6+6', 'S=1d6+4', 'H:-4AC/3', NULL, NULL);

-- Halberd
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(34, 'basic', '1d10', NULL, NULL, NULL, NULL),
(34, 'skilled', '1d10+1', NULL, 'H:-1AC/1', NULL, NULL),
(34, 'expert', '1d10+2', NULL, 'H:-2AC/2', NULL, NULL),
(34, 'master', 'P=1d10+4', 'S=1d10+2', 'H:-3AC/2', NULL, NULL),
(34, 'grand_master', 'P=1d10+6', 'S=1d10+4', 'H:-4AC/3', NULL, NULL);

-- Pike
INSERT INTO weapon_mastery_levels (item_id, mastery_level, primary_damage, secondary_damage, hand_held_defense, missile_defense, special_effects) VALUES
(35, 'basic', '1d10', NULL, NULL, NULL, NULL),
(35, 'skilled', '1d10+1', NULL, 'H:-1AC/1', NULL, NULL),
(35, 'expert', '1d10+2', NULL, 'H:-2AC/2', NULL, NULL),
(35, 'master', 'P=1d10+4', 'S=1d10+2', 'H:-3AC/2', NULL, NULL),
(35, 'grand_master', 'P=1d10+6', 'S=1d10+4', 'H:-4AC/3', NULL, NULL);
