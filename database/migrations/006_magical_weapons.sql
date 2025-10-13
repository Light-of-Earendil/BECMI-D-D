-- =====================================================
-- MAGICAL WEAPONS - COMMON VARIANTS
-- Based on Magical Weapon Generation Table
-- Creates +1, +2, +3 versions of all weapons
-- =====================================================

-- =====================================================
-- MAGICAL SWORDS
-- =====================================================

-- Short Sword magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Short Sword +1', 'Magical short sword with +1 bonus', 30, 2500.00, 'weapon', 'sword', '1d6+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Short Sword'), TRUE, TRUE),
('Short Sword +2', 'Magical short sword with +2 bonus', 30, 10000.00, 'weapon', 'sword', '1d6+2', 'slashing', 'melee', 1, 2, (SELECT item_id FROM items WHERE name = 'Short Sword'), TRUE, TRUE),
('Short Sword +3', 'Magical short sword with +3 bonus', 30, 22500.00, 'weapon', 'sword', '1d6+3', 'slashing', 'melee', 1, 3, (SELECT item_id FROM items WHERE name = 'Short Sword'), TRUE, TRUE);

-- Normal Sword magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Normal Sword +1', 'Magical sword with +1 bonus', 60, 2500.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), TRUE, TRUE),
('Normal Sword +2', 'Magical sword with +2 bonus', 60, 10000.00, 'weapon', 'sword', '1d8+2', 'slashing', 'melee', 1, 2, (SELECT item_id FROM items WHERE name = 'Normal Sword'), TRUE, TRUE),
('Normal Sword +3', 'Magical sword with +3 bonus', 60, 22500.00, 'weapon', 'sword', '1d8+3', 'slashing', 'melee', 1, 3, (SELECT item_id FROM items WHERE name = 'Normal Sword'), TRUE, TRUE);

-- Special Normal Sword variants with creature bonuses
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, magical_properties, requires_proficiency, is_magical) VALUES
('Normal Sword +1, +3 vs Dragons', 'Sword with special power against dragons', 60, 5000.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"creature_bonus": {"dragons": 3}}', TRUE, TRUE),
('Normal Sword +1, +3 vs Giants', 'Sword with special power against giants', 60, 5000.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"creature_bonus": {"giants": 3}}', TRUE, TRUE),
('Normal Sword +1, +3 vs Lycanthropes', 'Sword with special power against lycanthropes', 60, 5000.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"creature_bonus": {"lycanthropes": 3}}', TRUE, TRUE),
('Normal Sword +1, +3 vs Regenerating Monsters', 'Sword with special power against regenerating monsters', 60, 5000.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"creature_bonus": {"regenerating": 3}}', TRUE, TRUE),
('Normal Sword +1, +3 vs Spellcasters', 'Sword with special power against spellcasters', 60, 5000.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"creature_bonus": {"spellcasters": 3}}', TRUE, TRUE),
('Normal Sword +1, +3 vs Undead', 'Sword with special power against undead', 60, 5000.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"creature_bonus": {"undead": 3}}', TRUE, TRUE);

-- Bastard Sword magical variants (one-handed)
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Bastard Sword (One-Handed) +1', 'Magical bastard sword with +1 bonus', 60, 2500.00, 'weapon', 'sword', '1d6+2', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Bastard Sword (One-Handed)'), TRUE, TRUE),
('Bastard Sword (One-Handed) +2', 'Magical bastard sword with +2 bonus', 60, 10000.00, 'weapon', 'sword', '1d6+3', 'slashing', 'melee', 1, 2, (SELECT item_id FROM items WHERE name = 'Bastard Sword (One-Handed)'), TRUE, TRUE),
('Bastard Sword (One-Handed) +3', 'Magical bastard sword with +3 bonus', 60, 22500.00, 'weapon', 'sword', '1d6+4', 'slashing', 'melee', 1, 3, (SELECT item_id FROM items WHERE name = 'Bastard Sword (One-Handed)'), TRUE, TRUE);

-- Bastard Sword magical variants (two-handed)
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Bastard Sword (Two-Handed) +1', 'Magical bastard sword with +1 bonus', 60, 2500.00, 'weapon', 'sword', '1d8+2', 'slashing', 'melee', 2, 1, (SELECT item_id FROM items WHERE name = 'Bastard Sword (Two-Handed)'), TRUE, TRUE),
('Bastard Sword (Two-Handed) +2', 'Magical bastard sword with +2 bonus', 60, 10000.00, 'weapon', 'sword', '1d8+3', 'slashing', 'melee', 2, 2, (SELECT item_id FROM items WHERE name = 'Bastard Sword (Two-Handed)'), TRUE, TRUE),
('Bastard Sword (Two-Handed) +3', 'Magical bastard sword with +3 bonus', 60, 22500.00, 'weapon', 'sword', '1d8+4', 'slashing', 'melee', 2, 3, (SELECT item_id FROM items WHERE name = 'Bastard Sword (Two-Handed)'), TRUE, TRUE);

-- Two-Handed Sword magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Two-Handed Sword +1', 'Magical two-handed sword with +1 bonus', 100, 2500.00, 'weapon', 'sword', '1d10+1', 'slashing', 'melee', 2, 1, (SELECT item_id FROM items WHERE name = 'Two-Handed Sword'), TRUE, TRUE),
('Two-Handed Sword +2', 'Magical two-handed sword with +2 bonus', 100, 10000.00, 'weapon', 'sword', '1d10+2', 'slashing', 'melee', 2, 2, (SELECT item_id FROM items WHERE name = 'Two-Handed Sword'), TRUE, TRUE),
('Two-Handed Sword +3', 'Magical two-handed sword with +3 bonus', 100, 22500.00, 'weapon', 'sword', '1d10+3', 'slashing', 'melee', 2, 3, (SELECT item_id FROM items WHERE name = 'Two-Handed Sword'), TRUE, TRUE);

-- =====================================================
-- MAGICAL AXES
-- =====================================================

-- Hand Axe magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Hand Axe +1', 'Magical hand axe with +1 bonus', 30, 2500.00, 'weapon', 'axe', '1d6+1', 'slashing', 'melee', 10, 20, 30, TRUE, 1, 1, (SELECT item_id FROM items WHERE name = 'Hand Axe'), TRUE, TRUE),
('Hand Axe +2', 'Magical hand axe with +2 bonus', 30, 10000.00, 'weapon', 'axe', '1d6+2', 'slashing', 'melee', 10, 20, 30, TRUE, 1, 2, (SELECT item_id FROM items WHERE name = 'Hand Axe'), TRUE, TRUE),
('Hand Axe +3', 'Magical hand axe with +3 bonus', 30, 22500.00, 'weapon', 'axe', '1d6+3', 'slashing', 'melee', 10, 20, 30, TRUE, 1, 3, (SELECT item_id FROM items WHERE name = 'Hand Axe'), TRUE, TRUE);

-- Battle Axe magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Battle Axe +1', 'Magical battle axe with +1 bonus', 60, 2500.00, 'weapon', 'axe', '1d8+1', 'slashing', 'melee', 2, 1, (SELECT item_id FROM items WHERE name = 'Battle Axe'), TRUE, TRUE),
('Battle Axe +2', 'Magical battle axe with +2 bonus', 60, 10000.00, 'weapon', 'axe', '1d8+2', 'slashing', 'melee', 2, 2, (SELECT item_id FROM items WHERE name = 'Battle Axe'), TRUE, TRUE),
('Battle Axe +3', 'Magical battle axe with +3 bonus', 60, 22500.00, 'weapon', 'axe', '1d8+3', 'slashing', 'melee', 2, 3, (SELECT item_id FROM items WHERE name = 'Battle Axe'), TRUE, TRUE);

-- =====================================================
-- MAGICAL BLUDGEONS
-- =====================================================

-- Dagger magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Dagger +1', 'Magical dagger with +1 bonus', 10, 2500.00, 'weapon', 'dagger', '1d4+1', 'piercing', 'melee', 10, 20, 30, TRUE, 1, 1, (SELECT item_id FROM items WHERE name = 'Dagger'), FALSE, TRUE),
('Dagger +2', 'Magical dagger with +2 bonus', 10, 10000.00, 'weapon', 'dagger', '1d4+2', 'piercing', 'melee', 10, 20, 30, TRUE, 1, 2, (SELECT item_id FROM items WHERE name = 'Dagger'), FALSE, TRUE),
('Dagger +3', 'Magical dagger with +3 bonus', 10, 22500.00, 'weapon', 'dagger', '1d4+3', 'piercing', 'melee', 10, 20, 30, TRUE, 1, 3, (SELECT item_id FROM items WHERE name = 'Dagger'), FALSE, TRUE);

-- Throwing Hammer magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Throwing Hammer +1', 'Magical throwing hammer with +1 bonus', 20, 2500.00, 'weapon', 'bludgeon', '1d4+1', 'bludgeoning', 'melee', 10, 20, 30, TRUE, 1, 1, (SELECT item_id FROM items WHERE name = 'War Hammer'), TRUE, TRUE),
('Throwing Hammer +2', 'Magical throwing hammer with +2 bonus', 20, 10000.00, 'weapon', 'bludgeon', '1d4+2', 'bludgeoning', 'melee', 10, 20, 30, TRUE, 1, 2, (SELECT item_id FROM items WHERE name = 'War Hammer'), TRUE, TRUE),
('Throwing Hammer +3', 'Magical throwing hammer with +3 bonus', 20, 22500.00, 'weapon', 'bludgeon', '1d4+3', 'bludgeoning', 'melee', 10, 20, 30, TRUE, 1, 3, (SELECT item_id FROM items WHERE name = 'War Hammer'), TRUE, TRUE);

-- War Hammer magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('War Hammer +1', 'Magical war hammer with +1 bonus', 50, 2500.00, 'weapon', 'bludgeon', '1d6+1', 'bludgeoning', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'War Hammer'), TRUE, TRUE),
('War Hammer +2', 'Magical war hammer with +2 bonus', 50, 10000.00, 'weapon', 'bludgeon', '1d6+2', 'bludgeoning', 'melee', 1, 2, (SELECT item_id FROM items WHERE name = 'War Hammer'), TRUE, TRUE),
('War Hammer +3', 'Magical war hammer with +3 bonus', 50, 22500.00, 'weapon', 'bludgeon', '1d6+3', 'bludgeoning', 'melee', 1, 3, (SELECT item_id FROM items WHERE name = 'War Hammer'), TRUE, TRUE);

-- Mace magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Mace +1', 'Magical mace with +1 bonus', 30, 2500.00, 'weapon', 'bludgeon', '1d6+1', 'bludgeoning', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Mace'), TRUE, TRUE),
('Mace +2', 'Magical mace with +2 bonus', 30, 10000.00, 'weapon', 'bludgeon', '1d6+2', 'bludgeoning', 'melee', 1, 2, (SELECT item_id FROM items WHERE name = 'Mace'), TRUE, TRUE),
('Mace +3', 'Magical mace with +3 bonus', 30, 22500.00, 'weapon', 'bludgeon', '1d6+3', 'bludgeoning', 'melee', 1, 3, (SELECT item_id FROM items WHERE name = 'Mace'), TRUE, TRUE);

-- =====================================================
-- MAGICAL POLE WEAPONS
-- =====================================================

-- Polearm magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Polearm +1', 'Magical polearm with +1 bonus', 150, 2500.00, 'weapon', 'pole', '1d10+1', 'slashing', 'melee', 2, 1, (SELECT item_id FROM items WHERE name = 'Pole Arm'), TRUE, TRUE),
('Polearm +2', 'Magical polearm with +2 bonus', 150, 10000.00, 'weapon', 'pole', '1d10+2', 'slashing', 'melee', 2, 2, (SELECT item_id FROM items WHERE name = 'Pole Arm'), TRUE, TRUE),
('Polearm +3', 'Magical polearm with +3 bonus', 150, 22500.00, 'weapon', 'pole', '1d10+3', 'slashing', 'melee', 2, 3, (SELECT item_id FROM items WHERE name = 'Pole Arm'), TRUE, TRUE);

-- Spear magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Spear +1', 'Magical spear with +1 bonus', 30, 2500.00, 'weapon', 'pole', '1d6+1', 'piercing', 'melee', 20, 40, 60, TRUE, 2, 1, (SELECT item_id FROM items WHERE name = 'Spear'), TRUE, TRUE),
('Spear +2', 'Magical spear with +2 bonus', 30, 10000.00, 'weapon', 'pole', '1d6+2', 'piercing', 'melee', 20, 40, 60, TRUE, 2, 2, (SELECT item_id FROM items WHERE name = 'Spear'), TRUE, TRUE),
('Spear +3', 'Magical spear with +3 bonus', 30, 22500.00, 'weapon', 'pole', '1d6+3', 'piercing', 'melee', 20, 40, 60, TRUE, 2, 3, (SELECT item_id FROM items WHERE name = 'Spear'), TRUE, TRUE);

-- Staff magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Staff +1', 'Magical staff with +1 bonus', 40, 2500.00, 'weapon', 'bludgeon', '1d6+1', 'bludgeoning', 'melee', 2, 1, (SELECT item_id FROM items WHERE name = 'Staff'), FALSE, TRUE),
('Staff +2', 'Magical staff with +2 bonus', 40, 10000.00, 'weapon', 'bludgeon', '1d6+2', 'bludgeoning', 'melee', 2, 2, (SELECT item_id FROM items WHERE name = 'Staff'), FALSE, TRUE),
('Staff +3', 'Magical staff with +3 bonus', 40, 22500.00, 'weapon', 'bludgeon', '1d6+3', 'bludgeoning', 'melee', 2, 3, (SELECT item_id FROM items WHERE name = 'Staff'), FALSE, TRUE);

-- =====================================================
-- MAGICAL RANGED WEAPONS
-- =====================================================

-- Bow magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, ammunition_type, ammunition_capacity, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
-- Short Bow magical variants
('Bow, Short +1', 'Magical short bow with +1 bonus', 20, 2500.00, 'weapon', 'bow', '1d6+1', 'piercing', 'ranged', 50, 100, 150, 'arrow', 20, 2, 1, (SELECT item_id FROM items WHERE name = 'Bow, Short'), TRUE, TRUE),
('Bow, Short +2', 'Magical short bow with +2 bonus', 20, 10000.00, 'weapon', 'bow', '1d6+2', 'piercing', 'ranged', 50, 100, 150, 'arrow', 20, 2, 2, (SELECT item_id FROM items WHERE name = 'Bow, Short'), TRUE, TRUE),
('Bow, Short +3', 'Magical short bow with +3 bonus', 20, 22500.00, 'weapon', 'bow', '1d6+3', 'piercing', 'ranged', 50, 100, 150, 'arrow', 20, 2, 3, (SELECT item_id FROM items WHERE name = 'Bow, Short'), TRUE, TRUE),
-- Long Bow magical variants
('Bow, Long +1', 'Magical long bow with +1 bonus', 50, 2500.00, 'weapon', 'bow', '1d6+1', 'piercing', 'ranged', 70, 140, 210, 'arrow', 20, 2, 1, (SELECT item_id FROM items WHERE name = 'Bow, Long'), TRUE, TRUE),
('Bow, Long +2', 'Magical long bow with +2 bonus', 50, 10000.00, 'weapon', 'bow', '1d6+2', 'piercing', 'ranged', 70, 140, 210, 'arrow', 20, 2, 2, (SELECT item_id FROM items WHERE name = 'Bow, Long'), TRUE, TRUE),
('Bow, Long +3', 'Magical long bow with +3 bonus', 50, 22500.00, 'weapon', 'bow', '1d6+3', 'piercing', 'ranged', 70, 140, 210, 'arrow', 20, 2, 3, (SELECT item_id FROM items WHERE name = 'Bow, Long'), TRUE, TRUE);

-- Crossbow magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, ammunition_type, ammunition_capacity, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
-- Light Crossbow magical variants
('Crossbow, Light +1', 'Magical light crossbow with +1 bonus', 50, 2500.00, 'weapon', 'crossbow', '1d6+1', 'piercing', 'ranged', 60, 120, 180, 'quarrel', 30, 2, 1, (SELECT item_id FROM items WHERE name = 'Crossbow, Light'), TRUE, TRUE),
('Crossbow, Light +2', 'Magical light crossbow with +2 bonus', 50, 10000.00, 'weapon', 'crossbow', '1d6+2', 'piercing', 'ranged', 60, 120, 180, 'quarrel', 30, 2, 2, (SELECT item_id FROM items WHERE name = 'Crossbow, Light'), TRUE, TRUE),
('Crossbow, Light +3', 'Magical light crossbow with +3 bonus', 50, 22500.00, 'weapon', 'crossbow', '1d6+3', 'piercing', 'ranged', 60, 120, 180, 'quarrel', 30, 2, 3, (SELECT item_id FROM items WHERE name = 'Crossbow, Light'), TRUE, TRUE),
-- Heavy Crossbow magical variants
('Crossbow, Heavy +1', 'Magical heavy crossbow with +1 bonus', 80, 2500.00, 'weapon', 'crossbow', '2d4+1', 'piercing', 'ranged', 80, 160, 240, 'quarrel', 30, 2, 1, (SELECT item_id FROM items WHERE name = 'Crossbow, Heavy'), TRUE, TRUE),
('Crossbow, Heavy +2', 'Magical heavy crossbow with +2 bonus', 80, 10000.00, 'weapon', 'crossbow', '2d4+2', 'piercing', 'ranged', 80, 160, 240, 'quarrel', 30, 2, 2, (SELECT item_id FROM items WHERE name = 'Crossbow, Heavy'), TRUE, TRUE),
('Crossbow, Heavy +3', 'Magical heavy crossbow with +3 bonus', 80, 22500.00, 'weapon', 'crossbow', '2d4+3', 'piercing', 'ranged', 80, 160, 240, 'quarrel', 30, 2, 3, (SELECT item_id FROM items WHERE name = 'Crossbow, Heavy'), TRUE, TRUE);

-- Sling magical variants
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, ammunition_type, ammunition_capacity, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
('Sling +1', 'Magical sling with +1 bonus', 5, 2500.00, 'weapon', 'sling', '1d4+1', 'bludgeoning', 'ranged', 40, 80, 160, 'stone', 30, 1, 1, (SELECT item_id FROM items WHERE name = 'Sling'), FALSE, TRUE);

-- =====================================================
-- MAGICAL SHIELDS
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, ac_bonus, armor_type, magical_bonus, base_item_id, is_magical) VALUES
-- Shield magical variants
('Shield +1', 'Magical shield with +1 bonus', 100, 2500.00, 'shield', 'shield', 2, 'shield', 1, (SELECT item_id FROM items WHERE name = 'Shield'), TRUE),
-- Shield weapon magical variants
('Shield, Horned +1', 'Magical horned shield with +1 bonus', 20, 2500.00, 'weapon', 'shield', 0, 'shield', 1, (SELECT item_id FROM items WHERE name = 'Shield, Horned'), TRUE),
('Shield, Knife +1', 'Magical knife shield with +1 bonus', 20, 2500.00, 'weapon', 'shield', 0, 'shield', 1, (SELECT item_id FROM items WHERE name = 'Shield, Knife'), TRUE),
('Shield, Sword +1', 'Magical sword shield with +1 bonus', 275, 2500.00, 'weapon', 'shield', 0, 'shield', 1, (SELECT item_id FROM items WHERE name = 'Shield, Sword'), TRUE),
('Shield, Tusked +1', 'Magical tusked shield with +1 bonus', 20, 2500.00, 'weapon', 'shield', 0, 'shield', 1, (SELECT item_id FROM items WHERE name = 'Shield, Tusked'), TRUE);

-- =====================================================
-- MAGICAL AMMUNITION
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, ammunition_type, magical_bonus, base_item_id, stackable, is_magical) VALUES
-- Magical arrows
('Silver Arrows +1 (20)', 'Magical silver-tipped arrows with +1 bonus', 10, 1500.00, 'consumable', 'ammunition', 'arrow', 1, (SELECT item_id FROM items WHERE name = 'Silver Arrows (20)'), TRUE, TRUE),
('Silver Arrows +2 (20)', 'Magical silver-tipped arrows with +2 bonus', 10, 6000.00, 'consumable', 'ammunition', 'arrow', 2, (SELECT item_id FROM items WHERE name = 'Silver Arrows (20)'), TRUE, TRUE),
('Silver Arrows +3 (20)', 'Magical silver-tipped arrows with +3 bonus', 10, 13500.00, 'consumable', 'ammunition', 'arrow', 3, (SELECT item_id FROM items WHERE name = 'Silver Arrows (20)'), TRUE, TRUE),
-- Magical quarrels
('Silver Quarrels +1 (30)', 'Magical silver-tipped quarrels with +1 bonus', 10, 3000.00, 'consumable', 'ammunition', 'quarrel', 1, (SELECT item_id FROM items WHERE name = 'Silver Quarrels (30)'), TRUE, TRUE),
('Silver Quarrels +2 (30)', 'Magical silver-tipped quarrels with +2 bonus', 10, 12000.00, 'consumable', 'ammunition', 'quarrel', 2, (SELECT item_id FROM items WHERE name = 'Silver Quarrels (30)'), TRUE, TRUE),
('Silver Quarrels +3 (30)', 'Magical silver-tipped quarrels with +3 bonus', 10, 27000.00, 'consumable', 'ammunition', 'quarrel', 3, (SELECT item_id FROM items WHERE name = 'Silver Quarrels (30)'), TRUE, TRUE),
-- Magical sling stones
('Silver Pellets +1 (30)', 'Magical silver pellets with +1 bonus', 10, 1500.00, 'consumable', 'ammunition', 'stone', 1, (SELECT item_id FROM items WHERE name = 'Silver Pellets (30)'), TRUE, TRUE);

-- =====================================================
-- MAGICAL OTHER WEAPONS
-- =====================================================

INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, can_be_thrown, hands_required, magical_bonus, base_item_id, requires_proficiency, is_magical) VALUES
-- Blowgun magical variants
('Blowgun (up to 2\') +1', 'Magical short blowgun with +1 bonus', 5, 2500.00, 'weapon', 'blowgun', '1+1', 'piercing', 'ranged', 10, 20, 30, FALSE, 1, 1, (SELECT item_id FROM items WHERE name = 'Blowgun (up to 2\')'), TRUE, TRUE),
('Blowgun (2\'+) +1', 'Magical long blowgun with +1 bonus', 10, 2500.00, 'weapon', 'blowgun', '1d2+1', 'piercing', 'ranged', 15, 30, 45, FALSE, 1, 1, (SELECT item_id FROM items WHERE name = 'Blowgun (2\'+)'), TRUE, TRUE),
-- Bola magical variants
('Bola +1', 'Magical bola with +1 bonus', 20, 2500.00, 'weapon', 'other', '1d2+1', 'bludgeoning', 'melee', 20, 40, 60, TRUE, 1, 1, (SELECT item_id FROM items WHERE name = 'Bola'), FALSE, TRUE);
