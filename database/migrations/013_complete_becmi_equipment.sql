-- Complete BECMI Equipment Implementation
-- Based on BECMI Rules Cyclopedia Weapons, Armor, and Adventuring Gear Tables

USE becmi_vtt;

-- First, let's update existing items with correct BECMI data
UPDATE items SET 
    cost_gp = 7.00,
    weight_cn = 60,
    range_short = 0,
    range_medium = 0,
    range_long = 0
WHERE name = 'Battle Axe';

UPDATE items SET 
    cost_gp = 4.00,
    weight_cn = 30,
    range_short = 10,
    range_medium = 20,
    range_long = 30
WHERE name = 'Hand Axe';

UPDATE items SET 
    cost_gp = 25.00,
    weight_cn = 20,
    range_short = 50,
    range_medium = 100,
    range_long = 150
WHERE name = 'Short Bow';

UPDATE items SET 
    cost_gp = 40.00,
    weight_cn = 30,
    range_short = 70,
    range_medium = 140,
    range_long = 210
WHERE name = 'Long Bow';

UPDATE items SET 
    cost_gp = 30.00,
    weight_cn = 50,
    range_short = 60,
    range_medium = 120,
    range_long = 180
WHERE name = 'Light Crossbow';

UPDATE items SET 
    cost_gp = 50.00,
    weight_cn = 80,
    range_short = 80,
    range_medium = 160,
    range_long = 240
WHERE name = 'Heavy Crossbow';

UPDATE items SET 
    cost_gp = 3.00,
    weight_cn = 10,
    range_short = 10,
    range_medium = 20,
    range_long = 30
WHERE name = 'Dagger';

UPDATE items SET 
    cost_gp = 1.00,
    weight_cn = 20,
    range_short = 30,
    range_medium = 60,
    range_long = 90
WHERE name = 'Javelin';

UPDATE items SET 
    cost_gp = 3.00,
    weight_cn = 30,
    range_short = 20,
    range_medium = 40,
    range_long = 60
WHERE name = 'Spear';

UPDATE items SET 
    cost_gp = 5.00,
    weight_cn = 25,
    range_short = 10,
    range_medium = 20,
    range_long = 30
WHERE name = 'Trident';

UPDATE items SET 
    cost_gp = 4.00,
    weight_cn = 25,
    range_short = 10,
    range_medium = 20,
    range_long = 30
WHERE name = 'Throwing Hammer';

UPDATE items SET 
    cost_gp = 2.00,
    weight_cn = 20,
    range_short = 40,
    range_medium = 80,
    range_long = 160
WHERE name = 'Sling';

UPDATE items SET 
    cost_gp = 10.00,
    weight_cn = 60
WHERE name = 'Normal Sword';

UPDATE items SET 
    cost_gp = 7.00,
    weight_cn = 30
WHERE name = 'Short Sword';

UPDATE items SET 
    cost_gp = 15.00,
    weight_cn = 80
WHERE name = 'Bastard Sword (1-Hand)';

UPDATE items SET 
    cost_gp = 15.00,
    weight_cn = 80
WHERE name = 'Bastard Sword (2-Hand)';

UPDATE items SET 
    cost_gp = 15.00,
    weight_cn = 100
WHERE name = 'Two-Handed Sword';

UPDATE items SET 
    cost_gp = 7.00,
    weight_cn = 150
WHERE name = 'Halberd';

UPDATE items SET 
    cost_gp = 3.00,
    weight_cn = 80
WHERE name = 'Pike';

UPDATE items SET 
    cost_gp = 5.00,
    weight_cn = 30
WHERE name = 'Staff';

UPDATE items SET 
    cost_gp = 5.00,
    weight_cn = 30
WHERE name = 'Mace';

UPDATE items SET 
    cost_gp = 5.00,
    weight_cn = 50
WHERE name = 'War Hammer';

-- Update armor costs
UPDATE items SET 
    cost_gp = 20.00,
    weight_cn = 200,
    ac_bonus = 7
WHERE name = 'Leather Armor';

UPDATE items SET 
    cost_gp = 40.00,
    weight_cn = 400,
    ac_bonus = 5
WHERE name = 'Chain Mail';

UPDATE items SET 
    cost_gp = 60.00,
    weight_cn = 500,
    ac_bonus = 3
WHERE name = 'Plate Mail';

UPDATE items SET 
    cost_gp = 10.00,
    weight_cn = 100,
    ac_bonus = -1
WHERE name = 'Shield';

-- Now add all the missing weapons from BECMI Weapons Table

-- BLUDGEONS
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, damage_die, damage_type, weapon_type, special_properties) VALUES
('Blackjack', 'Small weighted club for surprise attacks', 'weapon', 'bludgeon', 5.00, 5, '1d2', 'bludgeoning', 'melee', 'stealth weapon'),
('Club', 'Simple wooden club', 'weapon', 'bludgeon', 3.00, 50, '1d4', 'bludgeoning', 'melee', 'improvised weapon'),
('Torch', 'Wooden torch - can be used as weapon', 'weapon', 'bludgeon', 0.17, 20, '1d4', 'bludgeoning', 'melee', 'provides light, burns for 1 hour');

-- DAGGERS (missing variants)
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, special_properties) VALUES
('Silver Dagger', 'Magical weapon effective against certain creatures', 'weapon', 'dagger', 30.00, 10, '1d4', 'piercing', 'thrown', 10, 20, 30, 'effective against lycanthropes and undead');

-- POLE WEAPONS (missing variants)
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, damage_die, damage_type, weapon_type, special_properties) VALUES
('Lance', 'Heavy lance for mounted combat', 'weapon', 'pole', 10.00, 180, '1d10', 'piercing', 'melee', 'mounted combat bonus, two-handed'),
('Polearm', 'General polearm weapon', 'weapon', 'pole', 7.00, 150, '1d10', 'slashing', 'melee', 'two-handed, reach weapon'),
('Poleaxe', 'Axe mounted on pole', 'weapon', 'pole', 5.00, 120, '1d10', 'slashing', 'melee', 'two-handed, can chop wood');

-- SHIELD WEAPONS
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, damage_die, damage_type, weapon_type, special_properties) VALUES
('Horned Shield', 'Shield with horns for ramming', 'weapon', 'shield', 15.00, 20, '1d2', 'bludgeoning', 'melee', 'shield + weapon, AC -1'),
('Knife Shield', 'Shield with embedded knife', 'weapon', 'shield', 65.00, 70, '1d4+1', 'slashing', 'melee', 'shield + weapon, AC -1'),
('Sword Shield', 'Shield with sword blade', 'weapon', 'shield', 200.00, 185, '1d4+2', 'slashing', 'melee', 'shield + weapon, AC -1'),
('Tusked Shield', 'Shield with tusk spikes', 'weapon', 'shield', 200.00, 275, '1d4+1', 'piercing', 'melee', 'shield + weapon, AC -1');

-- OTHER WEAPONS
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, special_properties) VALUES
('Blowgun (2\')', 'Short blowgun', 'weapon', 'other', 2.00, 10, '1', 'piercing', 'ranged', 20, 0, 0, 'requires darts, silent'),
('Blowgun (2\'+)', 'Long blowgun', 'weapon', 'other', 3.00, 15, '1', 'piercing', 'ranged', 30, 0, 0, 'requires darts, silent'),
('Bola', 'Throwing weapon to entangle', 'weapon', 'other', 5.00, 30, '1d2', 'bludgeoning', 'thrown', 20, 40, 60, 'entangles target'),
('Cestus', 'Spiked gloves', 'weapon', 'other', 5.00, 5, '1d3', 'piercing', 'melee', 0, 0, 0, 'worn on hands, cannot be disarmed'),
('Holy Water', 'Sacred water in breakable vial', 'weapon', 'other', 25.00, 1, '1d8', 'holy', 'thrown', 10, 30, 50, 'damages undead and demons'),
('Net', 'Throwing net to entangle', 'weapon', 'other', 20.00, 30, '0', 'none', 'thrown', 10, 20, 30, 'entangles target, no damage'),
('Oil, Burning', 'Flask of oil that burns', 'weapon', 'other', 2.00, 10, '1d8', 'fire', 'thrown', 10, 30, 50, 'continues burning, area effect'),
('Rock, Thrown', 'Simple thrown rock', 'weapon', 'other', 0.00, 5, '1d3', 'bludgeoning', 'thrown', 10, 30, 50, 'improvised weapon'),
('Whip', 'Flexible whip weapon', 'weapon', 'other', 1.00, 10, '1d2', 'slashing', 'melee', 0, 0, 0, 'reach weapon, can disarm');

-- Add missing armor types
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, ac_bonus, armor_type, special_properties) VALUES
('Scale Mail', 'Overlapping metal scales', 'armor', 'armor', 30.00, 300, 6, 'chain', ''),
('Banded Mail', 'Alternating leather and metal bands', 'armor', 'armor', 50.00, 450, 4, 'plate', ''),
('Suit Armor', 'Full plate armor suit', 'armor', 'armor', 250.00, 750, 0, 'plate', 'special properties, see description');

-- Add comprehensive adventuring gear
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, capacity_cn, special_properties) VALUES
-- Containers
('Belt', 'Leather belt', 'gear', 'clothing', 0.20, 5, 0, 'worn item'),
('Belt Pouch', 'Small pouch for coins and small items', 'gear', 'container', 0.50, 2, 50, 'capacity 50 cn when full'),
('Sack, Small', 'Small cloth sack', 'gear', 'container', 1.00, 1, 200, 'capacity 200 cn when full'),
('Sack, Large', 'Large cloth sack', 'gear', 'container', 2.00, 5, 600, 'capacity 600 cn when full'),
('Quiver', 'Container for arrows or quarrels', 'gear', 'container', 1.00, 5, 0, 'holds 20 arrows or 30 quarrels'),

-- Clothing
('Boots, Plain', 'Simple leather boots', 'gear', 'clothing', 1.00, 10, 0, 'worn item'),
('Boots, Riding', 'High boots for riding', 'gear', 'clothing', 5.00, 15, 0, 'worn item'),
('Cloak, Short', 'Short cape or cloak', 'gear', 'clothing', 0.50, 10, 0, 'worn item'),
('Cloak, Long', 'Long cape or cloak', 'gear', 'clothing', 1.00, 15, 0, 'worn item'),
('Clothes, Plain', 'Simple tunic and pants', 'gear', 'clothing', 0.50, 20, 0, 'worn item'),
('Clothes, Middle-class', 'Good quality clothing', 'gear', 'clothing', 5.00, 20, 0, 'worn item'),
('Clothes, Fine', 'High quality clothing', 'gear', 'clothing', 20.00, 20, 0, 'worn item'),
('Clothes, Extravagant', 'Luxury clothing', 'gear', 'clothing', 50.00, 30, 0, 'worn item'),
('Hat or Cap', 'Head covering', 'gear', 'clothing', 0.20, 3, 0, 'worn item'),
('Shoes', 'Simple footwear', 'gear', 'clothing', 0.50, 0, 0, 'worn item'),

-- Tools and Equipment
('Garlic', 'Clove of garlic', 'gear', 'tool', 5.00, 1, 0, 'ward against vampires'),
('Grappling Hook', 'Metal hook with rope', 'gear', 'tool', 25.00, 80, 0, 'climbing aid'),
('Hammer', 'Small hammer', 'gear', 'tool', 2.00, 10, 0, 'tool'),
('Holy Water', 'Sacred water', 'gear', 'tool', 25.00, 1, 0, 'ward against undead'),
('Iron Spike', 'Single iron spike', 'gear', 'tool', 0.10, 5, 0, 'climbing aid'),
('Iron Spikes (12)', 'Set of 12 iron spikes', 'gear', 'tool', 1.00, 60, 0, 'climbing aid'),
('Mirror', 'Hand-sized steel mirror', 'gear', 'tool', 5.00, 5, 0, 'reflective surface'),
('Oil (Flask)', 'Flask of oil', 'gear', 'consumable', 2.00, 10, 0, 'fuel for lanterns, burns'),
('Pole, Wooden', '10-foot wooden pole', 'gear', 'tool', 1.00, 100, 0, 'testing tool, reach aid'),
('Stakes (3) and Mallet', 'Wooden stakes and mallet', 'gear', 'tool', 3.00, 10, 0, 'anti-vampire tool'),
('Thieves\' Tools', 'Lockpicks and tools', 'gear', 'tool', 25.00, 10, 0, 'thief only, opens locks'),

-- Food and Drink
('Rations, Iron', 'Preserved food for one week', 'consumable', 'food', 15.00, 70, 0, 'lasts indefinitely'),
('Rations, Standard', 'Unpreserved food for one week', 'consumable', 'food', 5.00, 200, 0, 'spoils after one week'),
('Wine', 'One quart of wine', 'consumable', 'drink', 1.00, 30, 0, 'alcoholic beverage'),

-- Miscellaneous
('Wolfsbane', 'Plant for protection', 'gear', 'herb', 10.00, 1, 0, 'protection against werewolves');

-- Update existing gear with correct costs and weights
UPDATE items SET cost_gp = 5.00, weight_cn = 20 WHERE name = 'Backpack';
UPDATE items SET cost_gp = 0.20, weight_cn = 50 WHERE name = 'Bedroll';
UPDATE items SET cost_gp = 25.00, weight_cn = 1 WHERE name = 'Holy Symbol';
UPDATE items SET cost_gp = 10.00, weight_cn = 30 WHERE name = 'Lantern';
UPDATE items SET cost_gp = 1.00, weight_cn = 50 WHERE name = 'Rope (50 ft)';
UPDATE items SET cost_gp = 15.00, weight_cn = 30 WHERE name = 'Spell Book';
UPDATE items SET cost_gp = 3.00, weight_cn = 5 WHERE name = 'Tinderbox';
UPDATE items SET cost_gp = 0.02, weight_cn = 20 WHERE name = 'Torch';
UPDATE items SET cost_gp = 1.00, weight_cn = 5 WHERE name = 'Waterskin';
UPDATE items SET cost_gp = 5.00, weight_cn = 70 WHERE name = 'Rations (1 week)';

-- Add ammunition items
INSERT INTO items (name, description, item_type, item_category, cost_gp, weight_cn, ammunition_type, special_properties) VALUES
('Arrow', 'Standard arrow for bows', 'consumable', 'ammunition', 0.05, 2, 'arrow', 'single arrow'),
('Arrows (20)', 'Bundle of 20 arrows', 'consumable', 'ammunition', 1.00, 40, 'arrow', 'bundle of 20 arrows'),
('Quarrel', 'Crossbow bolt', 'consumable', 'ammunition', 0.05, 2, 'quarrel', 'single quarrel'),
('Quarrels (30)', 'Bundle of 30 quarrels', 'consumable', 'ammunition', 1.50, 60, 'quarrel', 'bundle of 30 quarrels'),
('Dart', 'Blowgun dart', 'consumable', 'ammunition', 0.02, 1, 'dart', 'blowgun ammunition'),
('Darts (50)', 'Bundle of 50 darts', 'consumable', 'ammunition', 1.00, 50, 'dart', 'bundle of 50 darts'),
('Sling Stone', 'Stone for sling', 'consumable', 'ammunition', 0.00, 1, 'stone', 'improvised ammunition'),
('Sling Bullet', 'Lead bullet for sling', 'consumable', 'ammunition', 0.01, 1, 'bullet', 'standard sling ammunition');

-- Update special properties for existing items
UPDATE items SET special_properties = 'two-handed, reach weapon' WHERE name IN ('Halberd', 'Pike', 'Lance', 'Polearm', 'Poleaxe');
UPDATE items SET special_properties = 'two-handed' WHERE name = 'Two-Handed Sword';
UPDATE items SET special_properties = 'thrown weapon' WHERE name IN ('Hand Axe', 'Dagger', 'Javelin', 'Spear', 'Trident', 'Throwing Hammer');
UPDATE items SET special_properties = 'ranged weapon' WHERE name IN ('Short Bow', 'Long Bow', 'Light Crossbow', 'Heavy Crossbow', 'Sling');

-- Add class restrictions
UPDATE items SET class_restrictions = 'thief' WHERE name = 'Thieves\' Tools';
UPDATE items SET class_restrictions = 'cleric' WHERE name = 'Holy Symbol';
UPDATE items SET class_restrictions = 'magic_user' WHERE name = 'Spell Book';

-- Add druid restrictions for armor
UPDATE items SET special_properties = 'druid can use if no metal parts' WHERE name = 'Leather Armor';

-- Add thief armor restrictions
UPDATE items SET special_properties = 'thief can use this armor' WHERE name = 'Leather Armor';

-- Update suit armor special properties
UPDATE items SET special_properties = 'special properties - see rules description' WHERE name = 'Suit Armor';

COMMIT;
