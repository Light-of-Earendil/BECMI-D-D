-- =====================================================
-- BECMI EQUIPMENT SYSTEM - SCHEMA EXTENSIONS
-- Extends items table with all BECMI-specific fields
-- and creates supporting tables for magical item abilities
-- =====================================================

-- Add new columns to items table for BECMI equipment
ALTER TABLE items 
ADD COLUMN range_medium INT DEFAULT 0 AFTER range_long,
ADD COLUMN item_category VARCHAR(50) AFTER item_type,
ADD COLUMN size_category ENUM('small', 'medium', 'large') DEFAULT 'medium' AFTER item_category,
ADD COLUMN hands_required TINYINT DEFAULT 1 AFTER size_category,
ADD COLUMN ammunition_type VARCHAR(50) AFTER hands_required,
ADD COLUMN ammunition_capacity INT DEFAULT 0 AFTER ammunition_type,
ADD COLUMN special_properties TEXT AFTER ammunition_capacity,
ADD COLUMN can_be_thrown BOOLEAN DEFAULT FALSE AFTER special_properties,
ADD COLUMN class_restrictions TEXT AFTER can_be_thrown,
ADD COLUMN magical_bonus INT DEFAULT 0 AFTER class_restrictions,
ADD COLUMN magical_properties TEXT AFTER magical_bonus,
ADD COLUMN base_item_id INT DEFAULT NULL AFTER magical_properties,
ADD COLUMN charges INT DEFAULT 0 AFTER base_item_id,
ADD COLUMN creature_type VARCHAR(50) AFTER charges,
ADD COLUMN capacity_cn INT DEFAULT 0 AFTER creature_type,
ADD COLUMN movement_rate INT DEFAULT 0 AFTER capacity_cn;

-- Add foreign key constraint for base_item_id
ALTER TABLE items 
ADD CONSTRAINT fk_items_base_item 
FOREIGN KEY (base_item_id) REFERENCES items(item_id) ON DELETE SET NULL;

-- Create table for complex magical item abilities
CREATE TABLE IF NOT EXISTS item_special_abilities (
    ability_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    ability_name VARCHAR(100) NOT NULL,
    ability_description TEXT,
    ability_type ENUM('combat', 'defense', 'utility', 'curse', 'intelligence', 'communication') NOT NULL,
    ability_data JSON, -- Structured data (e.g., {int: 12, ego: 8, alignment: 'lawful'})
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    INDEX idx_item_abilities (item_id, ability_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend character_inventory for magical items
ALTER TABLE character_inventory 
ADD COLUMN custom_name VARCHAR(100) AFTER notes,
ADD COLUMN identified BOOLEAN DEFAULT TRUE AFTER custom_name,
ADD COLUMN charges_remaining INT DEFAULT 0 AFTER identified,
ADD COLUMN attunement_status ENUM('none', 'attuned', 'cursed') DEFAULT 'none' AFTER charges_remaining;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_base_item ON items(base_item_id);
CREATE INDEX IF NOT EXISTS idx_items_magical_bonus ON items(magical_bonus);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(item_category);
CREATE INDEX IF NOT EXISTS idx_items_size ON items(size_category);
CREATE INDEX IF NOT EXISTS idx_items_creature_type ON items(creature_type);
CREATE INDEX IF NOT EXISTS idx_character_inventory_custom ON character_inventory(custom_name);
CREATE INDEX IF NOT EXISTS idx_character_inventory_attunement ON character_inventory(attunement_status);

-- Add comments for documentation
ALTER TABLE items COMMENT = 'BECMI equipment catalog with support for magical variants and special properties';
ALTER TABLE item_special_abilities COMMENT = 'Complex magical item abilities like talking swords, intelligent weapons, etc.';
ALTER TABLE character_inventory COMMENT = 'Character inventory with support for magical items and custom properties';

-- Update item_type enum to include new categories
ALTER TABLE items 
MODIFY COLUMN item_type ENUM('weapon', 'armor', 'shield', 'gear', 'consumable', 'treasure', 'mount', 'vehicle', 'ship', 'siege_weapon') NOT NULL;
