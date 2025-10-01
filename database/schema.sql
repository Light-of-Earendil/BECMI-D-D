
-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    reset_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    selector CHAR(32) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    requested_by_ip VARCHAR(45),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_selector (selector)
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);-- BECMI D&D Character and Session Management System
-- Database Schema for MySQL/MariaDB

-- Create database
CREATE DATABASE IF NOT EXISTS becmi_vtt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE becmi_vtt;

-- Users table for authentication and profiles
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    dm_user_id INT NOT NULL,
    session_title VARCHAR(100) NOT NULL,
    session_description TEXT,
    session_datetime DATETIME NOT NULL,
    duration_minutes INT DEFAULT 240,
    status ENUM('scheduled', 'active', 'completed', 'cancelled') DEFAULT 'scheduled',
    max_players INT DEFAULT 6,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dm_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Junction table linking users (players) to game sessions
CREATE TABLE IF NOT EXISTS session_players (
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('invited', 'accepted', 'declined') DEFAULT 'invited',
    PRIMARY KEY (session_id, user_id),
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Session reminders for automated email notifications
CREATE TABLE IF NOT EXISTS session_reminders (
    reminder_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    reminder_datetime DATETIME NOT NULL,
    reminder_type ENUM('session_start', 'session_reminder', 'session_cancelled') NOT NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Characters table - central repository for all character data
CREATE TABLE IF NOT EXISTS characters (
    character_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT NULL,  -- OPTIONAL: Characters can be created without a session
    character_name VARCHAR(50) NOT NULL,
    class ENUM('fighter', 'magic_user', 'cleric', 'thief', 'dwarf', 'elf', 'halfling') NOT NULL,
    level INT DEFAULT 1,
    experience_points INT DEFAULT 0,
    current_hp INT NOT NULL,
    max_hp INT NOT NULL,
    
    -- Ability Scores
    strength INT NOT NULL CHECK (strength >= 3 AND strength <= 18),
    dexterity INT NOT NULL CHECK (dexterity >= 3 AND dexterity <= 18),
    constitution INT NOT NULL CHECK (constitution >= 3 AND constitution <= 18),
    intelligence INT NOT NULL CHECK (intelligence >= 3 AND intelligence <= 18),
    wisdom INT NOT NULL CHECK (wisdom >= 3 AND wisdom <= 18),
    charisma INT NOT NULL CHECK (charisma >= 3 AND charisma <= 18),
    
    -- Combat Statistics
    armor_class INT DEFAULT 10,
    thac0_melee INT,
    thac0_ranged INT,
    
    -- Movement and Encumbrance
    movement_rate_normal INT DEFAULT 120,
    movement_rate_encounter INT DEFAULT 40,
    encumbrance_status ENUM('unencumbered', 'lightly_encumbered', 'heavily_encumbered', 'severely_encumbered') DEFAULT 'unencumbered',
    
    -- Saving Throws
    save_death_ray INT,
    save_magic_wand INT,
    save_paralysis INT,
    save_dragon_breath INT,
    save_spells INT,
    
    -- Character Details
    alignment ENUM('lawful', 'neutral', 'chaotic') NOT NULL,
    age INT,
    height VARCHAR(20),
    weight VARCHAR(20),
    hair_color VARCHAR(30),
    eye_color VARCHAR(30),
    
    -- Wealth
    gold_pieces INT DEFAULT 0,
    silver_pieces INT DEFAULT 0,
    copper_pieces INT DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE SET NULL
    -- Note: No unique constraint on (user_id, session_id) to allow multiple unassigned characters
);

-- Items master catalog
CREATE TABLE IF NOT EXISTS items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weight_cn INT DEFAULT 0,
    cost_gp DECIMAL(10,2) DEFAULT 0.00,
    item_type ENUM('weapon', 'armor', 'shield', 'gear', 'consumable', 'treasure') NOT NULL,
    
    -- Weapon properties
    damage_die VARCHAR(10), -- e.g., "1d6", "1d8+1"
    damage_type ENUM('slashing', 'piercing', 'bludgeoning', 'fire', 'cold', 'lightning', 'acid', 'poison', 'psychic', 'force') DEFAULT 'slashing',
    weapon_type ENUM('melee', 'ranged', 'thrown') DEFAULT 'melee',
    range_short INT DEFAULT 0,
    range_long INT DEFAULT 0,
    
    -- Armor properties
    ac_bonus INT DEFAULT 0,
    armor_type ENUM('leather', 'chain', 'plate', 'shield') DEFAULT 'leather',
    
    -- Item properties
    is_magical BOOLEAN DEFAULT FALSE,
    requires_proficiency BOOLEAN DEFAULT FALSE,
    stackable BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Character inventory
CREATE TABLE IF NOT EXISTS character_inventory (
    character_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    is_equipped BOOLEAN DEFAULT FALSE,
    equipped_slot ENUM('main_hand', 'off_hand', 'armor', 'shield', 'accessory') NULL,
    notes TEXT,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (character_id, item_id),
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

-- Character skills (General Skills system)
CREATE TABLE IF NOT EXISTS character_skills (
    character_id INT NOT NULL,
    skill_name VARCHAR(50) NOT NULL,
    bonus INT DEFAULT 0,
    learned_at_level INT DEFAULT 1,
    notes TEXT,
    PRIMARY KEY (character_id, skill_name),
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE
);

-- Weapon mastery tracking
CREATE TABLE IF NOT EXISTS character_weapon_mastery (
    character_id INT NOT NULL,
    item_id INT NOT NULL,
    mastery_rank ENUM('basic', 'skilled', 'expert', 'master', 'grand_master') DEFAULT 'basic',
    learned_at_level INT DEFAULT 1,
    PRIMARY KEY (character_id, item_id),
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);

-- Character spellbook (for magic-users and clerics)
CREATE TABLE IF NOT EXISTS character_spells (
    character_id INT NOT NULL,
    spell_name VARCHAR(100) NOT NULL,
    spell_level INT NOT NULL,
    spell_type ENUM('magic_user', 'cleric') NOT NULL,
    memorized_count INT DEFAULT 0,
    max_memorized INT DEFAULT 0,
    PRIMARY KEY (character_id, spell_name, spell_level),
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE
);

-- Character change log for audit trail
CREATE TABLE IF NOT EXISTS character_changes (
    change_id INT AUTO_INCREMENT PRIMARY KEY,
    character_id INT NOT NULL,
    user_id INT NOT NULL,
    change_type ENUM('creation', 'level_up', 'hp_change', 'ability_score', 'equipment', 'spell', 'skill', 'other') NOT NULL,
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(character_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- User sessions for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    csrf_token VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT '2030-12-31 23:59:59',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert default items (only if they don't exist)
INSERT IGNORE INTO items (name, description, weight_cn, cost_gp, item_type, damage_die, damage_type, weapon_type, requires_proficiency) VALUES
-- Weapons
('Dagger', 'A small, sharp blade', 10, 3.00, 'weapon', '1d4', 'piercing', 'melee', TRUE),
('Short Sword', 'A light, one-handed sword', 30, 10.00, 'weapon', '1d6', 'slashing', 'melee', TRUE),
('Long Sword', 'A standard two-handed sword', 60, 15.00, 'weapon', '1d8', 'slashing', 'melee', TRUE),
('Battle Axe', 'A heavy axe for combat', 50, 7.00, 'weapon', '1d8', 'slashing', 'melee', TRUE),
('Mace', 'A blunt weapon', 30, 5.00, 'weapon', '1d6', 'bludgeoning', 'melee', TRUE),
('Spear', 'A long thrusting weapon', 30, 1.00, 'weapon', '1d6', 'piercing', 'melee', TRUE),
('Short Bow', 'A light bow for ranged combat', 20, 25.00, 'weapon', '1d6', 'piercing', 'ranged', TRUE),
('Crossbow', 'A mechanical bow', 50, 30.00, 'weapon', '1d6', 'piercing', 'ranged', TRUE),

-- Armor
('Leather Armor', 'Basic leather protection', 200, 20.00, 'armor', NULL, NULL, NULL, FALSE),
('Chain Mail', 'Interlocked metal rings', 400, 75.00, 'armor', NULL, NULL, NULL, FALSE),
('Plate Mail', 'Heavy metal plates', 500, 400.00, 'armor', NULL, NULL, NULL, FALSE),
('Shield', 'Wooden or metal shield', 100, 10.00, 'shield', NULL, NULL, NULL, FALSE),

-- Gear
('Backpack', 'For carrying equipment', 20, 2.00, 'gear', NULL, NULL, NULL, FALSE),
('Rope (50 ft)', 'Hemp rope', 100, 1.00, 'gear', NULL, NULL, NULL, FALSE),
('Torch', 'Provides light', 10, 0.01, 'gear', NULL, NULL, NULL, FALSE),
('Rations (1 day)', 'Food and water', 50, 0.50, 'consumable', NULL, NULL, NULL, FALSE);

-- Update armor AC bonuses (only if items exist)
UPDATE items SET ac_bonus = 2 WHERE name = 'Leather Armor' AND ac_bonus IS NULL;
UPDATE items SET ac_bonus = 5 WHERE name = 'Chain Mail' AND ac_bonus IS NULL;
UPDATE items SET ac_bonus = 8 WHERE name = 'Plate Mail' AND ac_bonus IS NULL;
UPDATE items SET ac_bonus = 1 WHERE name = 'Shield' AND ac_bonus IS NULL;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_characters_user_session ON characters(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_characters_class_level ON characters(class, level);
CREATE INDEX IF NOT EXISTS idx_session_players_user ON session_players(user_id);
CREATE INDEX IF NOT EXISTS idx_session_reminders_datetime ON session_reminders(reminder_datetime);
CREATE INDEX IF NOT EXISTS idx_character_inventory_equipped ON character_inventory(character_id, is_equipped);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_character_changes_character ON character_changes(character_id, changed_at);

