-- =====================================================
-- BECMI GENERAL SKILLS
-- Based on D&D Rules Cyclopedia p. 81-85
-- =====================================================
-- This migration creates and populates the general_skills table
-- for the BECMI character skill system

-- Create general_skills table if it doesn't exist
CREATE TABLE IF NOT EXISTS general_skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    governing_ability ENUM('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clear existing data (in case of re-run)
DELETE FROM general_skills;

-- Reset auto increment
ALTER TABLE general_skills AUTO_INCREMENT = 1;

-- =====================================================
-- STRENGTH SKILLS
-- =====================================================
INSERT INTO general_skills (skill_name, governing_ability, description) VALUES
('Wrestling', 'strength', 'Grappling and subduing opponents without weapons'),
('Muscle', 'strength', 'Feats of strength, breaking objects, lifting heavy loads'),
('Climbing', 'strength', 'Climbing walls, cliffs, and other vertical surfaces'),

-- =====================================================
-- DEXTERITY SKILLS
-- =====================================================
('Acrobatics', 'dexterity', 'Tumbling, balance, and gymnastic feats'),
('Riding', 'dexterity', 'Mounted combat and animal handling while riding'),
('Stealth', 'dexterity', 'Moving silently and hiding in shadows'),
('Sleight of Hand', 'dexterity', 'Picking pockets, palming objects'),

-- =====================================================
-- CONSTITUTION SKILLS
-- =====================================================
('Endurance', 'constitution', 'Resisting fatigue, forced marches, and physical stress'),
('Disease Resistance', 'constitution', 'Resisting disease and poison'),

-- =====================================================
-- INTELLIGENCE SKILLS
-- =====================================================
('Knowledge (General)', 'intelligence', 'General knowledge, history, and lore'),
('Tracking', 'intelligence', 'Following tracks and trails in wilderness'),
('Navigation', 'intelligence', 'Finding direction, reading maps, using stars'),
('Alertness', 'intelligence', 'Noticing details, spotting hidden things'),
('Reading/Writing', 'intelligence', 'Literacy in additional languages'),

-- =====================================================
-- WISDOM SKILLS
-- =====================================================
('Hunting', 'wisdom', 'Finding food, tracking prey, setting snares'),
('Healing', 'wisdom', 'First aid, medical care, treating wounds'),
('Survival', 'wisdom', 'Surviving in wilderness, finding water and shelter'),
('Animal Handling', 'wisdom', 'Training and controlling animals'),
('Alertness (Wisdom)', 'wisdom', 'Sensing danger, intuition, street smarts'),

-- =====================================================
-- CHARISMA SKILLS
-- =====================================================
('Bargaining', 'charisma', 'Negotiating prices and deals with merchants'),
('Singing', 'charisma', 'Musical performance and entertainment'),
('Leadership', 'charisma', 'Leading groups, inspiring followers'),
('Persuasion', 'charisma', 'Convincing others, diplomacy');

-- =====================================================
-- VERIFY DATA
-- =====================================================
-- Show all skills grouped by governing ability
SELECT 
    governing_ability,
    COUNT(*) as skill_count,
    GROUP_CONCAT(skill_name ORDER BY skill_name SEPARATOR ', ') as skills
FROM general_skills
GROUP BY governing_ability
ORDER BY governing_ability;

-- Show total count
SELECT COUNT(*) as total_skills FROM general_skills;

