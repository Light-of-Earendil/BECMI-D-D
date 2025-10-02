-- =====================================================
-- COMPLETE BECMI EQUIPMENT LIST
-- Based on D&D Rules Cyclopedia
-- =====================================================
-- This migration adds all BECMI equipment with proper stats

-- First, clear existing items (for clean migration)
-- In production, you may want to keep existing character inventories
-- TRUNCATE TABLE items;

-- Delete existing items
DELETE FROM items;

-- Reset auto increment
ALTER TABLE items AUTO_INCREMENT = 1;

-- =====================================================
-- MELEE WEAPONS
-- =====================================================
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, damage_die, damage_type, weapon_type, requires_proficiency) VALUES
-- Small Blades
('Dagger', 'Small blade, can be thrown', 10, 3.00, 'weapon', '1d4', 'piercing', 'melee', FALSE),
('Silver Dagger', 'Silver blade for lycanthropes', 10, 30.00, 'weapon', '1d4', 'piercing', 'melee', FALSE),

-- Swords
('Short Sword', 'Light one-handed sword', 30, 7.00, 'weapon', '1d6', 'slashing', 'melee', TRUE),
('Normal Sword', 'Standard one-handed sword', 60, 10.00, 'weapon', '1d8', 'slashing', 'melee', TRUE),
('Two-Handed Sword', 'Large blade requiring two hands', 150, 15.00, 'weapon', '1d10', 'slashing', 'melee', TRUE),

-- Axes
('Hand Axe', 'Light axe, can be thrown', 50, 4.00, 'weapon', '1d6', 'slashing', 'melee', TRUE),
('Battle Axe', 'Heavy one-handed axe', 50, 7.00, 'weapon', '1d8', 'slashing', 'melee', TRUE),

-- Blunt Weapons
('Club', 'Simple wooden club', 50, 0.00, 'weapon', '1d4', 'bludgeoning', 'melee', FALSE),
('Mace', 'Metal flanged mace', 30, 5.00, 'weapon', '1d6', 'bludgeoning', 'melee', TRUE),
('War Hammer', 'Heavy war hammer', 30, 5.00, 'weapon', '1d6', 'bludgeoning', 'melee', TRUE),
('Morning Star', 'Spiked ball on chain', 125, 6.00, 'weapon', '1d6', 'bludgeoning', 'melee', TRUE),

-- Pole Weapons
('Spear', 'Thrusting weapon, can be thrown', 30, 3.00, 'weapon', '1d6', 'piercing', 'melee', TRUE),
('Pole Arm', 'Long pole with blade', 150, 7.00, 'weapon', '1d10', 'slashing', 'melee', TRUE),
('Pike', 'Very long thrusting pole', 160, 5.00, 'weapon', '1d10', 'piercing', 'melee', TRUE),
('Lance', 'Cavalry weapon', 120, 6.00, 'weapon', '1d6', 'piercing', 'melee', TRUE),

-- Staff
('Staff', 'Wooden quarterstaff', 40, 2.00, 'weapon', '1d6', 'bludgeoning', 'melee', FALSE);

-- =====================================================
-- RANGED WEAPONS
-- =====================================================
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, damage_die, damage_type, weapon_type, range_short, range_long, requires_proficiency) VALUES
('Short Bow', 'Light bow', 30, 25.00, 'weapon', '1d6', 'piercing', 'ranged', 50, 150, TRUE),
('Long Bow', 'Powerful bow', 50, 40.00, 'weapon', '1d6', 'piercing', 'ranged', 70, 210, TRUE),
('Light Crossbow', 'Mechanical bow', 50, 30.00, 'weapon', '1d6', 'piercing', 'ranged', 60, 180, TRUE),
('Heavy Crossbow', 'Powerful crossbow', 80, 50.00, 'weapon', '1d8', 'piercing', 'ranged', 80, 240, TRUE),
('Sling', 'Simple leather sling', 20, 2.00, 'weapon', '1d4', 'bludgeoning', 'ranged', 40, 160, FALSE);

-- =====================================================
-- AMMUNITION
-- =====================================================
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, stackable) VALUES
('Arrows (20)', 'Arrows for bows', 10, 5.00, 'consumable', TRUE),
('Silver Arrows (20)', 'Silver tipped arrows', 10, 30.00, 'consumable', TRUE),
('Quarrels (30)', 'Bolts for crossbows', 10, 10.00, 'consumable', TRUE),
('Silver Quarrels (30)', 'Silver tipped bolts', 10, 60.00, 'consumable', TRUE),
('Sling Stones (30)', 'Stones for sling', 10, 0.00, 'consumable', TRUE);

-- =====================================================
-- ARMOR
-- =====================================================
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, ac_bonus, armor_type) VALUES
('Leather Armor', 'Boiled leather protection', 200, 20.00, 'armor', 2, 'leather'),
('Scale Mail', 'Overlapping scales', 400, 30.00, 'armor', 4, 'chain'),
('Chain Mail', 'Interlocked metal rings', 400, 40.00, 'armor', 5, 'chain'),
('Banded Mail', 'Leather with metal bands', 350, 50.00, 'armor', 6, 'chain'),
('Plate Mail', 'Full plate armor', 500, 60.00, 'armor', 7, 'plate'),
('Suit Armor', 'Best quality plate', 500, 400.00, 'armor', 8, 'plate'),

('Shield', 'Wooden or metal shield', 100, 10.00, 'shield', 1, 'shield');

-- =====================================================
-- ADVENTURING GEAR
-- =====================================================
INSERT INTO items (name, description, weight_cn, cost_gp, item_type) VALUES
-- Containers
('Backpack', 'Leather backpack (400 cn capacity)', 20, 5.00, 'gear'),
('Pouch, Belt', 'Small belt pouch (50 cn capacity)', 5, 1.00, 'gear'),
('Pouch, Small', 'Small pouch (30 cn capacity)', 1, 0.50, 'gear'),
('Sack, Small', 'Small sack (200 cn capacity)', 5, 1.00, 'gear'),
('Sack, Large', 'Large sack (600 cn capacity)', 20, 2.00, 'gear'),
('Saddle Bags', 'Pair of bags for mount (300 cn each)', 150, 5.00, 'gear'),

-- Light Sources
('Torch', 'Burns for 1 hour', 10, 0.01, 'gear'),
('Lantern', 'Metal lantern', 20, 10.00, 'gear'),
('Oil Flask', 'Lantern fuel or fire weapon', 10, 2.00, 'consumable'),
('Tinder Box', 'Flint and steel', 5, 0.80, 'gear'),
('Candle', 'Burns for 1 hour', 1, 0.01, 'consumable'),

-- Rope & Tools
('Rope, 50 ft', 'Hemp rope', 50, 1.00, 'gear'),
('Rope, 50 ft (Silk)', 'Strong silk rope', 50, 10.00, 'gear'),
('Chain, 10 ft', 'Iron chain', 100, 15.00, 'gear'),
('Pole, 10 ft', 'Wooden pole for probing', 100, 1.00, 'gear'),
('Spikes, Iron (12)', 'For climbing or doors', 60, 1.00, 'gear'),
('Grappling Hook', 'For climbing', 80, 25.00, 'gear'),
('Crowbar', 'Iron pry bar', 50, 2.00, 'gear'),
('Hammer (small)', 'Tack hammer', 10, 2.00, 'gear'),
('Mallet (wooden)', 'Wooden mallet', 10, 1.00, 'gear'),

-- Camping Gear
('Bedroll', 'Sleeping roll', 50, 2.00, 'gear'),
('Blanket', 'Wool blanket', 30, 2.00, 'gear'),
('Tent (1 person)', 'Small tent', 200, 5.00, 'gear'),
('Tent (4-8 persons)', 'Large tent', 500, 25.00, 'gear'),

-- Food & Drink
('Rations, Standard (1 week)', 'Normal preserved food', 200, 15.00, 'consumable'),
('Rations, Iron (1 week)', 'Compact dried food', 70, 15.00, 'consumable'),
('Waterskin/Wineskin', 'Leather container', 10, 0.50, 'gear'),
('Wine (2 pints)', 'Bottle of wine', 60, 1.00, 'consumable'),
('Ale, Beer (small cask)', 'Small barrel', 150, 2.00, 'consumable'),

-- Miscellaneous Tools
('Chalk', 'For marking', 1, 0.10, 'gear'),
('Parchment (sheet)', 'Writing material', 1, 1.00, 'consumable'),
('Ink (vial)', 'Writing ink', 1, 8.00, 'consumable'),
('Quill', 'Writing quill', 1, 0.10, 'consumable'),
('Mirror, Steel', 'Small steel mirror', 5, 5.00, 'gear'),
('Whetstone', 'For sharpening', 5, 0.50, 'gear'),
('Shovel', 'Digging tool', 80, 3.00, 'gear'),
('Holy Symbol (wooden)', 'Wooden religious symbol', 1, 5.00, 'gear'),
('Holy Symbol (silver)', 'Silver religious symbol', 1, 25.00, 'gear'),
('Holy Water (vial)', 'Blessed water', 10, 25.00, 'consumable'),
('Wolfsbane (bunch)', 'Herb for lycanthropes', 1, 10.00, 'consumable'),
('Garlic', 'Anti-vampire herb', 1, 0.50, 'consumable'),

-- Musical Instruments
('Flute', 'Wooden flute', 5, 5.00, 'gear'),
('Horn', 'Signal horn', 20, 3.00, 'gear');

-- =====================================================
-- ANIMALS & TRANSPORTATION
-- =====================================================
INSERT INTO items (name, description, weight_cn, cost_gp, item_type) VALUES
-- Riding Animals
('Camel', 'Desert mount', 0, 100.00, 'treasure'),
('Donkey, Mule', 'Pack animal', 0, 30.00, 'treasure'),
('Horse, Draft', 'Heavy work horse', 0, 40.00, 'treasure'),
('Horse, Riding', 'Standard riding horse', 0, 75.00, 'treasure'),
('Horse, War', 'Battle-trained horse', 0, 250.00, 'treasure'),
('Pony', 'Small mount', 0, 40.00, 'treasure'),

-- Transport
('Cart (hand)', 'Small hand cart', 0, 25.00, 'treasure'),
('Wagon', 'Large wagon', 0, 200.00, 'treasure'),
('Saddle', 'Riding saddle', 150, 25.00, 'gear'),
('Saddle Bags', 'Bags for saddle', 150, 5.00, 'gear');

-- =====================================================
-- WEAPON MASTERY BONUS DATA
-- =====================================================
-- Note: Weapon Mastery bonuses are stored per character-weapon combo
-- in the character_weapon_mastery table.
-- 
-- BECMI Weapon Mastery Levels:
-- 1. Basic: Default (no special bonuses)
-- 2. Skilled: +1 to hit, +1 damage
-- 3. Expert: +2 to hit, +2 damage, +1 vs AC deflection
-- 4. Master: +3 to hit, +3 damage, +2 vs AC deflection, special maneuver
-- 5. Grand Master: +4 to hit, +4 damage, +3 vs AC deflection, special maneuver (improved)
--
-- Each weapon also has unique mastery effects (e.g., Sword: Parry, Axe: Disarm, etc.)
-- These are implemented in the rules engine and weapon mastery system.


