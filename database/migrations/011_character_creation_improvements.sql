-- =====================================================
-- CHARACTER CREATION IMPROVEMENTS
-- Based on D&D Rules Cyclopedia Chapter 1-2
-- Adds Druid/Mystic classes, ability adjustment tracking, and starting spell support
-- =====================================================

-- Add Druid and Mystic to class enum
ALTER TABLE characters 
MODIFY COLUMN class ENUM('fighter','magic_user','cleric','thief','dwarf','elf','halfling','druid','mystic') NOT NULL;

-- Add ability score adjustment tracking
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS ability_adjustments JSON DEFAULT NULL COMMENT 'Records which abilities were adjusted and by how much',
ADD COLUMN IF NOT EXISTS original_strength INT DEFAULT NULL COMMENT 'Original rolled strength before adjustments',
ADD COLUMN IF NOT EXISTS original_dexterity INT DEFAULT NULL COMMENT 'Original rolled dexterity before adjustments',
ADD COLUMN IF NOT EXISTS original_constitution INT DEFAULT NULL COMMENT 'Original rolled constitution before adjustments',
ADD COLUMN IF NOT EXISTS original_intelligence INT DEFAULT NULL COMMENT 'Original rolled intelligence before adjustments',
ADD COLUMN IF NOT EXISTS original_wisdom INT DEFAULT NULL COMMENT 'Original rolled wisdom before adjustments',
ADD COLUMN IF NOT EXISTS original_charisma INT DEFAULT NULL COMMENT 'Original rolled charisma before adjustments';

-- Add starting spell tracking to character_spells
ALTER TABLE character_spells
ADD COLUMN IF NOT EXISTS is_starting_spell BOOLEAN DEFAULT FALSE COMMENT 'True if this was a starting spell from character creation';

-- Add personality and background fields
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS personality TEXT DEFAULT NULL COMMENT 'Character personality description',
ADD COLUMN IF NOT EXISTS background TEXT DEFAULT NULL COMMENT 'Character background story';

COMMIT;

