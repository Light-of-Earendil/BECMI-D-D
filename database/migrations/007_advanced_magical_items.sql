-- =====================================================
-- ADVANCED MAGICAL ITEMS
-- Complex magical items with special abilities
-- Talking swords, intelligent weapons, cursed items, etc.
-- =====================================================

-- =====================================================
-- TALKING SWORDS (Intelligent Weapons)
-- =====================================================

-- Example talking sword with intelligence
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, magical_properties, requires_proficiency, is_magical) VALUES
('Sword of Intelligence', 'A talking sword with intelligence and ego', 60, 50000.00, 'weapon', 'sword', '1d8+2', 'slashing', 'melee', 1, 2, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"intelligence": 15, "ego": 12, "alignment": "lawful", "communication": "telepathy", "languages": ["common", "elvish", "dwarvish"], "special_purpose": "slay_evil", "personality": "noble and righteous"}', TRUE, TRUE);

-- Insert special abilities for the talking sword
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Sword of Intelligence'), 'Intelligence', 'The sword has an intelligence of 15 and can communicate telepathically', 'intelligence', '{"int": 15, "wis": 10, "cha": 12}'),
((SELECT item_id FROM items WHERE name = 'Sword of Intelligence'), 'Ego', 'The sword has an ego rating of 12 and may influence the wielder', 'intelligence', '{"ego": 12, "alignment_conflict": true}'),
((SELECT item_id FROM items WHERE name = 'Sword of Intelligence'), 'Detect Evil', 'The sword can detect evil creatures within 60 feet', 'utility', '{"range": 60, "duration": "continuous", "detection_type": "evil"}'),
((SELECT item_id FROM items WHERE name = 'Sword of Intelligence'), 'Extra Damage vs Evil', 'The sword deals +2d6 damage against evil creatures', 'combat', '{"damage_bonus": "2d6", "target_type": "evil", "damage_type": "radiant"}');

-- =====================================================
-- CURSED ITEMS
-- =====================================================

-- Example cursed sword
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, magical_properties, requires_proficiency, is_magical) VALUES
('Sword of Misfortune', 'A cursed sword that brings bad luck', 60, 0.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"cursed": true, "curse_type": "misfortune", "removal_difficulty": "remove_curse", "effects": ["critical_fumble", "save_penalty"]}', TRUE, TRUE);

-- Insert curse abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Sword of Misfortune'), 'Curse of Misfortune', 'Critical fumbles occur on rolls of 1-3 instead of just 1', 'curse', '{"fumble_range": "1-3", "effect": "critical_fumble"}'),
((SELECT item_id FROM items WHERE name = 'Sword of Misfortune'), 'Save Penalty', 'All saving throws suffer a -2 penalty while wielding this weapon', 'curse', '{"save_penalty": -2, "duration": "while_wielding"}'),
((SELECT item_id FROM items WHERE name = 'Sword of Misfortune'), 'Attunement Curse', 'Once wielded, the sword cannot be easily discarded', 'curse', '{"attunement_forced": true, "removal_requires": "remove_curse_spell"}');

-- =====================================================
-- CHARGED MAGICAL ITEMS
-- =====================================================

-- Example wand with charges
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, magical_bonus, charges, magical_properties, requires_proficiency, is_magical) VALUES
('Wand of Magic Missile', 'A wand that can cast magic missile spells', 10, 15000.00, 'weapon', 'wand', 0, 50, '{"spell": "magic_missile", "spell_level": 1, "charges_per_use": 1, "rechargeable": false}', FALSE, TRUE);

-- Insert wand abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Wand of Magic Missile'), 'Magic Missile', 'Casts magic missile (1d4+1 damage, +1 missile per 2 levels)', 'utility', '{"spell": "magic_missile", "level": 1, "damage": "1d4+1", "targeting": "automatic_hit", "range": 150}');

-- Example staff with charges
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, charges, base_item_id, magical_properties, requires_proficiency, is_magical) VALUES
('Staff of Power', 'A powerful staff with multiple spell charges', 40, 75000.00, 'weapon', 'staff', 2, 20, (SELECT item_id FROM items WHERE name = 'Staff'), '{"multiple_spells": true, "rechargeable": true, "spells": ["lightning_bolt", "fireball", "cone_of_cold"]}', FALSE, TRUE);

-- Insert staff abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Staff of Power'), 'Lightning Bolt', 'Casts lightning bolt (8d6 damage, 100ft line)', 'utility', '{"spell": "lightning_bolt", "level": 6, "damage": "8d6", "charges": 5, "range": 100, "area": "line"}'),
((SELECT item_id FROM items WHERE name = 'Staff of Power'), 'Fireball', 'Casts fireball (8d6 damage, 20ft radius)', 'utility', '{"spell": "fireball", "level": 6, "damage": "8d6", "charges": 5, "range": 300, "area": "20ft_radius"}'),
((SELECT item_id FROM items WHERE name = 'Staff of Power'), 'Cone of Cold', 'Casts cone of cold (8d6 damage, 60ft cone)', 'utility', '{"spell": "cone_of_cold", "level": 6, "damage": "8d6", "charges": 5, "range": 0, "area": "60ft_cone"}');

-- =====================================================
-- SPECIAL PURPOSE WEAPONS
-- =====================================================

-- Dragon Slayer sword
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, magical_properties, requires_proficiency, is_magical) VALUES
('Dragonslayer', 'A sword specifically designed to slay dragons', 60, 35000.00, 'weapon', 'sword', '2, 1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"special_purpose": "slay_dragons", "creature_bonus": {"dragons": 5}, "detection": "dragons_60ft"}', TRUE, TRUE);

-- Insert dragon slayer abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Dragonslayer'), 'Dragon Detection', 'Detects dragons within 60 feet', 'utility', '{"detection_range": 60, "target_type": "dragons", "duration": "continuous"}'),
((SELECT item_id FROM items WHERE name = 'Dragonslayer'), 'Dragon Slaying', '+5 bonus to hit and damage against dragons', 'combat', '{"hit_bonus": 5, "damage_bonus": 5, "target_type": "dragons"}'),
((SELECT item_id FROM items WHERE name = 'Dragonslayer'), 'Dragon Fear Immunity', 'Immune to dragon fear effects', 'defense', '{"immunity": "dragon_fear", "immunity_type": "fear_effects"}');

-- =====================================================
-- ALIGNMENT-SPECIFIC WEAPONS
-- =====================================================

-- Holy Avenger (Lawful Good only)
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, magical_properties, class_restrictions, requires_proficiency, is_magical) VALUES
('Holy Avenger', 'A blessed sword that can only be wielded by lawful good characters', 60, 125000.00, 'weapon', 'sword', '1d8+5', 'slashing', 'melee', 1, 5, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"alignment_restriction": "lawful_good", "holy_aura": true, "spell_resistance": 15, "protection_from_evil": true}', '["cleric", "paladin"]', TRUE, TRUE);

-- Insert Holy Avenger abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Holy Avenger'), 'Holy Aura', 'Creates a 10-foot radius protection from evil aura', 'defense', '{"aura_radius": 10, "effect": "protection_from_evil", "duration": "continuous"}'),
((SELECT item_id FROM items WHERE name = 'Holy Avenger'), 'Spell Resistance', 'Grants spell resistance 15', 'defense', '{"spell_resistance": 15, "duration": "continuous"}'),
((SELECT item_id FROM items WHERE name = 'Holy Avenger'), 'Undead Bane', 'Extra damage against undead creatures', 'combat', '{"damage_bonus": "2d6", "target_type": "undead", "damage_type": "radiant"}'),
((SELECT item_id FROM items WHERE name = 'Holy Avenger'), 'Alignment Restriction', 'Only lawful good characters can wield this weapon', 'curse', '{"alignment_required": "lawful_good", "penalty_for_others": "damage"}');

-- =====================================================
-- WEAPON WITH SPECIAL MATERIALS
-- =====================================================

-- Adamantine sword
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, damage_die, damage_type, weapon_type, hands_required, magical_bonus, base_item_id, magical_properties, requires_proficiency, is_magical) VALUES
('Adamantine Sword', 'A sword forged from the hardest metal known', 60, 15000.00, 'weapon', 'sword', '1d8+1', 'slashing', 'melee', 1, 1, (SELECT item_id FROM items WHERE name = 'Normal Sword'), '{"material": "adamantine", "hardness": 20, "ignores_hardness": true, "critical_threat": "19-20"}', TRUE, TRUE);

-- Insert adamantine abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Adamantine Sword'), 'Adamantine Hardness', 'Ignores hardness when sundering objects', 'utility', '{"ignores_hardness": true, "sunder_bonus": "+4"}'),
((SELECT item_id FROM items WHERE name = 'Adamantine Sword'), 'Critical Threat', 'Threatens critical hits on rolls of 19-20', 'combat', '{"critical_threat": "19-20", "critical_multiplier": 2}');

-- =====================================================
-- MAGICAL ARMOR WITH SPECIAL PROPERTIES
-- =====================================================

-- Example magical armor
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, ac_bonus, armor_type, magical_bonus, magical_properties, requires_proficiency, is_magical) VALUES
('Armor of Resistance', 'Chain mail that provides resistance to elemental damage', 400, 25000.00, 'armor', 'chain', 6, 'chain', 1, '{"resistance": ["fire", "cold", "lightning"], "resistance_amount": 5}', FALSE, TRUE);

-- Insert armor abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Armor of Resistance'), 'Fire Resistance', 'Reduces fire damage by 5 points', 'defense', '{"damage_type": "fire", "reduction": 5, "duration": "continuous"}'),
((SELECT item_id FROM items WHERE name = 'Armor of Resistance'), 'Cold Resistance', 'Reduces cold damage by 5 points', 'defense', '{"damage_type": "cold", "reduction": 5, "duration": "continuous"}'),
((SELECT item_id FROM items WHERE name = 'Armor of Resistance'), 'Lightning Resistance', 'Reduces lightning damage by 5 points', 'defense', '{"damage_type": "lightning", "reduction": 5, "duration": "continuous"}');

-- =====================================================
-- MAGICAL SHIELDS WITH SPECIAL PROPERTIES
-- =====================================================

-- Shield of Missile Attraction
INSERT INTO items (name, description, weight_cn, cost_gp, item_type, item_category, ac_bonus, armor_type, magical_bonus, magical_properties, requires_proficiency, is_magical) VALUES
('Shield of Missile Attraction', 'A shield that attracts missile attacks to itself', 100, 20000.00, 'shield', 'shield', 3, 'shield', 2, '{"missile_attraction": true, "deflection_bonus": "+4"}', FALSE, TRUE);

-- Insert shield abilities
INSERT INTO item_special_abilities (item_id, ability_name, ability_description, ability_type, ability_data) VALUES
((SELECT item_id FROM items WHERE name = 'Shield of Missile Attraction'), 'Missile Attraction', 'Attracts missile attacks within 30 feet to the shield', 'defense', '{"attraction_range": 30, "effect": "redirect_missiles"}'),
((SELECT item_id FROM items WHERE name = 'Shield of Missile Attraction'), 'Deflection Bonus', '+4 bonus to AC against missile attacks', 'defense', '{"ac_bonus": 4, "attack_type": "missile", "duration": "continuous"}');

-- =====================================================
-- NOTES ON ADVANCED MAGICAL ITEMS
-- =====================================================

-- These items demonstrate the full range of magical item capabilities:
-- 1. Intelligent weapons with ego and personality
-- 2. Cursed items with negative effects
-- 3. Charged items with limited uses
-- 4. Special purpose weapons with creature-specific bonuses
-- 5. Alignment-restricted items
-- 6. Special material weapons
-- 7. Armor with elemental resistance
-- 8. Shields with special defensive properties

-- The item_special_abilities table allows for complex abilities that can be:
-- - Combat bonuses (damage, hit bonuses, critical hits)
-- - Defensive abilities (AC, resistance, immunity)
-- - Utility effects (detection, communication, movement)
-- - Curses (negative effects, restrictions)
-- - Intelligence traits (personality, ego, communication)
-- - Communication abilities (languages, telepathy)

-- JSON data in ability_data allows for structured storage of complex rules
-- that can be easily parsed by the game engine for automatic effects.
