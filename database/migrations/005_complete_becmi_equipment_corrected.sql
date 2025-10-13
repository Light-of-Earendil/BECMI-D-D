-- =====================================================
-- COMPLETE BECMI EQUIPMENT LIST - CORRECTED
-- Based on D&D Rules Cyclopedia tables
-- This migration replaces all existing items with correct BECMI stats
-- =====================================================

-- Clear existing items for clean migration
DELETE FROM items;
ALTER TABLE items AUTO_INCREMENT = 1;

-- =====================================================
-- WEAPONS TABLE - MELEE WEAPONS
-- =====================================================

-- Small Blades
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, requires_proficiency) VALUES
('Dagger', 'Small blade, can be thrown', 10, 3.00, 'weapon', 'dagger', '1d4', 'piercing', 'melee', 10, 20, 30, TRUE, FALSE),
('Silver Dagger', 'Silver blade for lycanthropes', 10, 30.00, 'weapon', 'dagger', '1d4', 'piercing', 'melee', 10, 20, 30, TRUE, FALSE);

-- Swords
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, requires_proficiency) VALUES
('Short Sword', 'Light one-handed sword', 30, 7.00, 'weapon', 'sword', '1d6', 'slashing', 'melee', 1, TRUE),
('Normal Sword', 'Standard one-handed sword', 60, 10.00, 'weapon', 'sword', '1d8', 'slashing', 'melee', 1, TRUE),
('Bastard Sword (One-Handed)', 'Versatile sword, can be used one-handed', 60, 10.00, 'weapon', 'sword', '1d6+1', 'slashing', 'melee', 1, TRUE),
('Bastard Sword (Two-Handed)', 'Versatile sword, used two-handed', 60, 10.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 2, TRUE),
('Two-Handed Sword', 'Large blade requiring two hands', 100, 15.00, 'weapon', 'sword', '1d10', 'slashing', 'melee', 2, TRUE);

-- Axes
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, requires_proficiency) VALUES
('Hand Axe', 'Light axe, can be thrown', 30, 4.00, 'weapon', 'axe', '1d6', 'slashing', 'melee', 10, 20, 30, TRUE, 1, TRUE),
('Battle Axe', 'Heavy one-handed axe', 60, 7.00, 'weapon', 'axe', '1d8', 'slashing', 'melee', 0, 0, 0, FALSE, 2, TRUE);

-- Bludgeons
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, requires_proficiency) VALUES
('Blackjack', 'Small club for stunning', 10, 2.00, 'weapon', 'bludgeon', '1d2', 'bludgeoning', 'melee', 1, FALSE),
('Club', 'Simple wooden club', 50, 0.00, 'weapon', 'bludgeon', '1d4', 'bludgeoning', 'melee', 1, FALSE),
('Mace', 'Metal flanged mace', 30, 5.00, 'weapon', 'bludgeon', '1d6', 'bludgeoning', 'melee', 1, TRUE),
('War Hammer', 'Heavy war hammer', 50, 5.00, 'weapon', 'bludgeon', '1d6', 'bludgeoning', 'melee', 1, TRUE),
('Staff', 'Wooden quarterstaff', 40, 2.00, 'weapon', 'bludgeon', '1d6', 'bludgeoning', 'melee', 2, FALSE);

-- Pole Weapons
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, requires_proficiency) VALUES
('Spear', 'Thrusting weapon, can be thrown', 30, 3.00, 'weapon', 'pole', '1d6', 'piercing', 'melee', 20, 40, 60, TRUE, 2, TRUE),
('Javelin', 'Light throwing spear', 20, 1.00, 'weapon', 'pole', '1d6', 'piercing', 'melee', 30, 60, 90, TRUE, 1, TRUE),
('Lance', 'Cavalry weapon', 120, 6.00, 'weapon', 'pole', '1d6', 'piercing', 'melee', 0, 0, 0, FALSE, 2, TRUE),
('Pike', 'Very long thrusting pole', 150, 5.00, 'weapon', 'pole', '1d10', 'piercing', 'melee', 0, 0, 0, FALSE, 2, TRUE),
('Pole Arm', 'Long pole with blade', 150, 7.00, 'weapon', 'pole', '1d10', 'slashing', 'melee', 0, 0, 0, FALSE, 2, TRUE),
('Halberd', 'Polearm with axe and spear', 150, 7.00, 'weapon', 'pole', '1d10', 'slashing', 'melee', 0, 0, 0, FALSE, 2, TRUE),
('Poleaxe', 'Polearm with axe head', 150, 7.00, 'weapon', 'pole', '1d10', 'slashing', 'melee', 0, 0, 0, FALSE, 2, TRUE),
('Trident', 'Three-pronged spear', 50, 5.00, 'weapon', 'pole', '1d6', 'piercing', 'melee', 20, 40, 60, TRUE, 2, TRUE);

-- Shield Weapons
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, requires_proficiency) VALUES
('Shield, Horned', 'Shield with horns for attacking', 20, 15.00, 'weapon', 'shield', '1d2', 'piercing', 'melee', 1, TRUE),
('Shield, Knife', 'Shield with hidden blade', 20, 15.00, 'weapon', 'shield', '1d4', 'piercing', 'melee', 1, TRUE),
('Shield, Sword', 'Shield with sword attachment', 275, 200.00, 'weapon', 'shield', '1d4+2', 'slashing', 'melee', 1, TRUE),
('Shield, Tusked', 'Shield with tusk attachments', 20, 15.00, 'weapon', 'shield', '1d4', 'piercing', 'melee', 1, TRUE);

-- Other Weapons
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, requires_proficiency) VALUES
('Bola', 'Rope with weights for entangling', 20, 5.00, 'weapon', 'other', '1d2', 'bludgeoning', 'melee', 20, 40, 60, TRUE, 1, FALSE),
('Net', 'Large net for entangling', 20, 20.00, 'weapon', 'other', '0', 'none', 'melee', 10, 20, 30, TRUE, 1, FALSE),
('Whip', 'Leather whip', 10, 1.00, 'weapon', 'other', '1d2', 'slashing', 'melee', 15, 30, 45, FALSE, 1, TRUE);

-- =====================================================
-- WEAPONS TABLE - RANGED WEAPONS
-- =====================================================

-- Bows
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, ammunition_type, ammunition_capacity, hands_required, requires_proficiency) VALUES
('Bow, Short', 'Light bow for ranged combat', 20, 25.00, 'weapon', 'bow', '1d6', 'piercing', 'ranged', 50, 100, 150, 'arrow', 20, 2, TRUE),
('Bow, Long', 'Powerful long bow', 50, 40.00, 'weapon', 'bow', '1d6', 'piercing', 'ranged', 70, 140, 210, 'arrow', 20, 2, TRUE);

-- Crossbows
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, ammunition_type, ammunition_capacity, hands_required, requires_proficiency) VALUES
('Crossbow, Light', 'Light crossbow', 50, 30.00, 'weapon', 'crossbow', '1d6', 'piercing', 'ranged', 60, 120, 180, 'quarrel', 30, 2, TRUE),
('Crossbow, Heavy', 'Heavy crossbow', 80, 50.00, 'weapon', 'crossbow', '2d4', 'piercing', 'ranged', 80, 160, 240, 'quarrel', 30, 2, TRUE);

-- Other Ranged Weapons
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, ammunition_type, ammunition_capacity, hands_required, requires_proficiency) VALUES
('Sling', 'Simple leather sling', 5, 2.00, 'weapon', 'sling', '1d4', 'bludgeoning', 'ranged', 40, 80, 160, 'stone', 30, 1, FALSE),
('Blowgun (up to 2\')', 'Short blowgun', 5, 5.00, 'weapon', 'blowgun', '1', 'piercing', 'ranged', 10, 20, 30, 'dart', 5, 1, TRUE),
('Blowgun (2\'+)', 'Long blowgun', 10, 10.00, 'weapon', 'blowgun', '1d2', 'piercing', 'ranged', 15, 30, 45, 'dart', 5, 1, TRUE);

-- =====================================================
-- AMMUNITION TABLE
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, ammunition_type, stackable) VALUES
-- Arrows
('Arrows (20)', 'Standard arrows for bows', 10, 5.00, 'consumable', 'ammunition', 'arrow', TRUE),
('Silver Arrows (20)', 'Silver-tipped arrows', 10, 30.00, 'consumable', 'ammunition', 'arrow', TRUE),
-- Quarrels
('Quarrels (30)', 'Crossbow bolts', 10, 10.00, 'consumable', 'ammunition', 'quarrel', TRUE),
('Silver Quarrels (30)', 'Silver-tipped quarrels', 10, 60.00, 'consumable', 'ammunition', 'quarrel', TRUE),
-- Sling ammunition
('Sling Stones (30)', 'Stones or lead pellets for sling', 10, 0.00, 'consumable', 'ammunition', 'stone', TRUE),
('Silver Pellets (30)', 'Silver pellets for sling', 10, 30.00, 'consumable', 'ammunition', 'stone', TRUE),
-- Darts
('Darts (5)', 'Blowgun darts', 1, 5.00, 'consumable', 'ammunition', 'dart', TRUE);

-- =====================================================
-- ARMOR TABLE
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, ac_bonus, armor_type, class_restrictions) VALUES
-- Shields
('Shield', 'Wooden or metal shield', 100, 10.00, 'shield', 'shield', 1, 'shield', '["fighter", "cleric", "dwarf", "elf", "halfling"]'),
-- Armor
('Leather Armor', 'Boiled leather protection', 200, 20.00, 'armor', 'leather', 2, 'leather', '["fighter", "cleric", "thief", "dwarf", "elf", "halfling"]'),
('Scale Mail', 'Overlapping metal scales', 300, 30.00, 'armor', 'scale', 4, 'chain', '["fighter", "cleric", "dwarf", "elf"]'),
('Chain Mail', 'Interlocked metal rings', 400, 40.00, 'armor', 'chain', 5, 'chain', '["fighter", "cleric", "dwarf", "elf"]'),
('Banded Mail', 'Leather with metal bands', 450, 50.00, 'armor', 'banded', 6, 'chain', '["fighter", "cleric", "dwarf", "elf"]'),
('Plate Mail', 'Full plate armor', 500, 60.00, 'armor', 'plate', 7, 'plate', '["fighter", "cleric", "dwarf", "elf"]'),
('Suit Armor', 'Best quality plate armor', 750, 250.00, 'armor', 'suit', 10, 'plate', '["fighter", "cleric", "dwarf", "elf"]');

-- =====================================================
-- ADVENTURING GEAR TABLE
-- =====================================================

-- Containers
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, capacity_cn, stackable) VALUES
('Backpack', 'Leather backpack', 20, 5.00, 'gear', 'container', 400, FALSE),
('Pouch, Belt', 'Small belt pouch', 5, 1.00, 'gear', 'container', 50, FALSE),
('Sack, Small', 'Small sack', 5, 1.00, 'gear', 'container', 200, FALSE),
('Sack, Large', 'Large sack', 20, 2.00, 'gear', 'container', 600, FALSE);

-- Light Sources
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, stackable) VALUES
('Torch', 'Burns for 1 hour', 20, 0.02, 'gear', 'light', TRUE),
('Lantern', 'Metal lantern with oil', 30, 10.00, 'gear', 'light', FALSE),
('Oil', 'One flask of oil', 10, 2.00, 'consumable', 'light', TRUE);

-- Rope & Tools
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category) VALUES
('Rope (50 ft)', 'Hemp rope', 50, 1.00, 'gear', 'tool'),
('Chain (10 ft)', 'Iron chain', 100, 15.00, 'gear', 'tool'),
('Pole (10 ft)', 'Wooden pole for probing', 100, 1.00, 'gear', 'tool'),
('Spikes, Iron (12)', 'For climbing or doors', 60, 1.00, 'gear', 'tool'),
('Grappling Hook', 'For climbing', 80, 25.00, 'gear', 'tool'),
('Crowbar', 'Iron pry bar', 50, 2.00, 'gear', 'tool'),
('Hammer (small)', 'Tack hammer', 10, 2.00, 'gear', 'tool'),
('Mallet (wooden)', 'Wooden mallet', 10, 1.00, 'gear', 'tool');

-- Camping Gear
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category) VALUES
('Bedroll', 'Sleeping roll', 50, 2.00, 'gear', 'camping'),
('Blanket', 'Wool blanket', 30, 2.00, 'gear', 'camping'),
('Tent (1 person)', 'Small tent', 200, 5.00, 'gear', 'camping'),
('Tent (4-8 persons)', 'Large tent', 500, 25.00, 'gear', 'camping');

-- Food & Drink
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, stackable) VALUES
('Rations, Standard (1 week)', 'Normal preserved food', 200, 5.00, 'consumable', 'food', TRUE),
('Rations, Iron (1 week)', 'Compact dried food', 70, 15.00, 'consumable', 'food', TRUE),
('Waterskin/Wineskin', 'Leather container', 5, 1.00, 'gear', 'container', FALSE),
('Wine (2 pints)', 'Bottle of wine', 60, 1.00, 'consumable', 'food', TRUE),
('Ale, Beer (small cask)', 'Small barrel', 150, 2.00, 'consumable', 'food', TRUE);

-- Miscellaneous Tools
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, stackable) VALUES
('Chalk', 'For marking', 1, 0.10, 'gear', 'tool', TRUE),
('Parchment (sheet)', 'Writing material', 1, 1.00, 'consumable', 'tool', TRUE),
('Ink (vial)', 'Writing ink', 1, 8.00, 'consumable', 'tool', TRUE),
('Quill', 'Writing quill', 1, 0.10, 'gear', 'tool', TRUE),
('Mirror, Steel', 'Small steel mirror', 5, 5.00, 'gear', 'tool', FALSE),
('Whetstone', 'For sharpening', 5, 0.50, 'gear', 'tool', FALSE),
('Shovel', 'Digging tool', 80, 3.00, 'gear', 'tool', FALSE),
('Holy Symbol (wooden)', 'Wooden religious symbol', 1, 5.00, 'gear', 'tool', FALSE),
('Holy Symbol (silver)', 'Silver religious symbol', 1, 25.00, 'gear', 'tool', FALSE),
('Holy Water (vial)', 'Blessed water', 10, 25.00, 'consumable', 'tool', TRUE),
('Wolfsbane (bunch)', 'Herb for lycanthropes', 1, 10.00, 'consumable', 'tool', TRUE),
('Garlic', 'Anti-vampire herb', 1, 0.50, 'consumable', 'tool', TRUE);

-- Musical Instruments
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category) VALUES
('Flute', 'Wooden flute', 5, 5.00, 'gear', 'instrument'),
('Horn', 'Signal horn', 20, 3.00, 'gear', 'instrument');

-- =====================================================
-- RIDING ANIMAL COSTS TABLE
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, creature_type, capacity_cn, movement_rate) VALUES
('Camel', 'Desert mount', 0, 100.00, 'mount', 'animal', 'mount', 3000, 120),
('Horse, Draft', 'Heavy work horse', 0, 40.00, 'mount', 'animal', 'mount', 2000, 120),
('Horse, Riding', 'Standard riding horse', 0, 75.00, 'mount', 'animal', 'mount', 2500, 180),
('Horse, War', 'Battle-trained horse', 0, 250.00, 'mount', 'animal', 'mount', 2500, 180),
('Mule', 'Pack animal', 0, 30.00, 'mount', 'animal', 'mount', 1500, 120),
('Pony', 'Small mount', 0, 35.00, 'mount', 'animal', 'mount', 1200, 120);

-- =====================================================
-- LAND TRANSPORTATION GEAR TABLE
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, capacity_cn) VALUES
('Saddle & Tack', 'Riding saddle and equipment', 300, 25.00, 'gear', 'saddle', 200),
('Saddle Bags', 'Pair of bags for mount', 100, 5.00, 'gear', 'saddle', 800),
('Cart (2 wheels)', 'Small hand cart', 0, 100.00, 'vehicle', 'cart', 4000),
('Wagon (4 wheels)', 'Large wagon', 0, 200.00, 'vehicle', 'wagon', 15000);

-- =====================================================
-- SAILING VESSELS TABLE
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, capacity_cn, movement_rate, special_properties) VALUES
-- Boats
('Boat, River', 'River boat', 0, 36000, 'ship', 'boat', 40000, 36, '{"crew_rowers": 8, "crew_sailors": 2, "crew_marines": 0, "hull_points": "20-40", "armor_class": 8}'),
('Boat, Sailing', 'Sailing boat', 0, 20000, 'ship', 'boat', 20000, 72, '{"crew_rowers": 0, "crew_sailors": 1, "crew_marines": 0, "hull_points": "20-40", "armor_class": 8}'),
('Canoe', 'Light canoe', 0, 6000, 'ship', 'boat', 6000, 18, '{"crew_rowers": 0, "crew_sailors": 1, "crew_marines": 0, "hull_points": "5-10", "armor_class": 9}'),

-- Galleys
('Galley, Large', 'Large war galley', 0, 60000, 'ship', 'galley', 60000, 18, '{"crew_rowers": 180, "crew_sailors": 20, "crew_marines": 50, "hull_points": "100-120", "armor_class": 7}'),
('Galley, Small', 'Small galley', 0, 40000, 'ship', 'galley', 40000, 18, '{"crew_rowers": 60, "crew_sailors": 10, "crew_marines": 20, "hull_points": "80-100", "armor_class": 8}'),
('Galley, War', 'War galley', 0, 80000, 'ship', 'galley', 80000, 12, '{"crew_rowers": 300, "crew_sailors": 30, "crew_marines": 75, "hull_points": "120-150", "armor_class": 7}'),

-- Ships
('Lifeboat, Ship\'s', 'Ship\'s lifeboat', 0, 15000, 'ship', 'boat', 15000, 18, '{"crew_rowers": 0, "crew_sailors": 0, "crew_marines": 0, "hull_points": "10-20", "armor_class": 9}'),
('Longship', 'Viking longship', 0, 30000, 'ship', 'ship', 30000, 18, '{"crew_rowers": 0, "crew_sailors": 75, "crew_marines": 0, "hull_points": "60-80", "armor_class": 8}'),
('Sailing Ship, Small', 'Small sailing vessel', 0, 100000, 'ship', 'ship', 100000, 90, '{"crew_rowers": 0, "crew_sailors": 10, "crew_marines": 25, "hull_points": "60-90", "armor_class": 8}'),
('Sailing Ship, Large', 'Large sailing vessel', 0, 300000, 'ship', 'ship', 300000, 72, '{"crew_rowers": 0, "crew_sailors": 20, "crew_marines": 50, "hull_points": "120-180", "armor_class": 7}'),
('Troop Transport', 'Military transport ship', 0, 600000, 'ship', 'ship', 600000, 60, '{"crew_rowers": 0, "crew_sailors": 20, "crew_marines": 100, "hull_points": "160-220", "armor_class": 7}');

-- =====================================================
-- SIEGE WEAPONS TABLE
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, special_properties) VALUES
('Ballista', 'Large crossbow siege weapon', 6000, 75, 'siege_weapon', 'ballista', '1d10+6', 'piercing', 'ranged', 100, 200, 300, '{"encumbrance": 6000, "armor_class": 4, "hull_points": 9, "crew": 4, "fire_rate": "1 per 2 rounds", "ammo_cost_week": 2000}'),
('Catapult, Light', 'Light siege catapult', 12000, 150, 'siege_weapon', 'catapult', '1d8+8', 'bludgeoning', 'ranged', 200, 250, 300, '{"encumbrance": 12000, "armor_class": 4, "hull_points": 18, "crew": 6, "fire_rate": "1 per 5 rounds", "ammo_cost_week": 4000, "minimum_range": 150}'),
('Catapult, Heavy', 'Heavy siege catapult', 18000, 250, 'siege_weapon', 'catapult', '1d10+10', 'bludgeoning', 'ranged', 250, 325, 400, '{"encumbrance": 18000, "armor_class": 0, "hull_points": 27, "crew": 8, "fire_rate": "1 per 6 rounds", "ammo_cost_week": 6000, "minimum_range": 175}'),
('Trebuchet', 'Largest siege weapon', 24000, 400, 'siege_weapon', 'trebuchet', '1d12+13', 'bludgeoning', 'ranged', 250, 400, 500, '{"encumbrance": 24000, "armor_class": 0, "hull_points": 36, "crew": 12, "fire_rate": "1 per 6 rounds", "ammo_cost_week": 8000, "minimum_range": 100}'),
('Bore', 'Siege ram for gates', 3000, 150, 'siege_weapon', 'ram', '1d6+14', 'bludgeoning', 'melee', 0, 0, 0, '{"encumbrance": 3000, "armor_class": -4, "hull_points": 50, "crew": 10, "fire_rate": "1 per 2 rounds"}'),
('Ram, Battering', 'Standard battering ram', 3000, 100, 'siege_weapon', 'ram', '1d6+8', 'bludgeoning', 'melee', 0, 0, 0, '{"encumbrance": 3000, "armor_class": -4, "hull_points": 50, "crew": 10, "fire_rate": "1 per 2 rounds"}');
