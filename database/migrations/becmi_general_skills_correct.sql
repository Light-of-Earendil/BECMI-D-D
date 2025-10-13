-- =====================================================
-- BECMI GENERAL SKILLS - CORRECT VERSION
-- Based on D&D Rules Cyclopedia p. 81-85
-- This is the ACTUAL list from the Rules Cyclopedia
-- =====================================================

-- Create general_skills table if it doesn't exist
CREATE TABLE IF NOT EXISTS general_skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) NOT NULL UNIQUE,
    governing_ability ENUM('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Clear existing data
DELETE FROM general_skills;

-- Reset auto increment
ALTER TABLE general_skills AUTO_INCREMENT = 1;

-- =====================================================
-- STRENGTH SKILLS (3 skills)
-- =====================================================
INSERT INTO general_skills (skill_name, governing_ability, description) VALUES
('Intimidation', 'strength', 'Ability to bully NPCs into doing what you want. Works best against low-level characters (below 5th level).'),
('Muscle', 'strength', 'Experience with heavy lifting and hard labor. +2 bonus on Strength rolls for tasks such as opening doors. Understanding of simple machinery.'),
('Wrestling', 'strength', 'In wrestling combat, gives +1 to wrestling rating. Higher skill scores give higher bonuses.'),

-- =====================================================
-- DEXTERITY SKILLS (10 skills)
-- =====================================================
('Acrobatics', 'dexterity', 'Perform impressive acrobatic feats, balance on taut ropes. Reduce effective height of fall by 10\'. +2 to save vs. mechanical traps where agility helps.'),
('Alertness', 'dexterity', 'Draw weapon without losing time, avoid effects of surprise, wake at slightest noise.'),
('Blind Shooting', 'dexterity', 'Shoot at targets without seeing them (in darkness or beyond sight range). Must hear target. No darkness penalties on successful check.'),
('Cheating', 'dexterity', 'Win at gambling by cheating. Limited to Chaotic alignment characters.'),
('Escape', 'dexterity', 'Get loose when tied or locked up. Separate rolls for ropes and locks.'),
('Mountaineering', 'dexterity', 'Mountain climbing with ropes, pitons, and gear. Rig lines for non-climbers.'),
('Piloting', 'dexterity', 'Pilot sailing vessels, aerial ships, or flying castles. Must specify vessel type.'),
('Quick Draw', 'dexterity', 'Nock and fire arrow with +2 bonus to individual initiative.'),
('Riding', 'dexterity', 'Care, feed, and control riding animals. Must specify animal type (horses, giant eagles, etc.).'),
('Stealth', 'dexterity', 'Move silently in specific terrain. Must choose: city/outdoors, indoors/caves, forest/jungle, plains, desert, arctic, or mountains/hills.'),

-- =====================================================
-- CONSTITUTION SKILLS (2 skills)
-- =====================================================
('Endurance', 'constitution', 'Perform tiring tasks for long periods. Run for an hour without collapsing. Cumulative +1 penalty each extra hour.'),
('Food Tasting', 'constitution', 'Taste food and water to detect spoilage. Avoid food poisoning. May detect poisons with taste.'),

-- =====================================================
-- INTELLIGENCE SKILLS (26 skills)
-- =====================================================
('Alchemy', 'intelligence', 'Recognize and identify alchemical substances, potions, and poisons. Create antidote potions for specific poison types.'),
('Alternate Magics', 'intelligence', 'Basic familiarity with non-spellcasting magics. Know magical abilities of well-known monsters and Immortals.'),
('Art', 'intelligence', 'Create art (painting, sculpture, woodcarving, mosaic, etc.). Must specify type. +2 reaction when presenting portraits/sculptures.'),
('Artillery', 'intelligence', 'Command artillery crews (catapult, trebuchet). Calculate trajectory, distance, throw weight. Or build/repair siege equipment.'),
('Craft', 'intelligence', 'Know one craft type: armor-making, bow-making, leatherworking, smithing, weapon-making, etc. Must specify type.'),
('Disguise', 'intelligence', 'Make character look like someone else. Target makes Wisdom roll to penetrate disguise.'),
('Engineering', 'intelligence', 'Plan, design, and build large constructions: houses, bridges, dams. Evaluate existing structures.'),
('Fire-Building', 'intelligence', 'Start fires without tinderbox. With tinderbox, automatic in ordinary conditions. Without, 1-2 on 1d6 each round.'),
('Healing', 'intelligence', 'Treat wounds and diagnose illnesses in humans/demihumans. Restore 1d3 HP once per set of wounds. Diagnose illness type.'),
('Hunting', 'intelligence', 'Locate, stalk, and hunt game. +1 to hit unaware targets. Supply food for self and others in fertile areas.'),
('Knowledge', 'intelligence', 'Expert in one field: culture, geography, history, legends, theology, etc. Must specify type.'),
('Labor', 'intelligence', 'Accomplished at one labor type: bricklaying, farming, mining, stonecutting, etc. Must specify type.'),
('Language', 'intelligence', 'Know additional languages beyond common. Must specify language.'),
('Lip Reading', 'intelligence', 'Overhear conversations by reading lips. Must see lips and understand language spoken.'),
('Magical Engineering', 'intelligence', 'Recognize basic principles of magical devices. Identify most common magical items.'),
('Mapping', 'intelligence', 'Understand and make maps. Comprehend simple maps automatically. Roll for complicated layouts.'),
('Military Tactics', 'intelligence', 'Interpret enemy force movements. Set up own forces better. Bonuses/penalties during mass combat.'),
('Mimicry', 'intelligence', 'Mimic animal noises and foreign-language accents. Useful for recognition codes and signals.'),
('Nature Lore', 'intelligence', 'Knowledge of plants and animals in specific terrain: desert, forest, jungle, mountain/hill, open sea, plains, or arctic. Must specify terrain.'),
('Navigation', 'intelligence', 'Know location by sun and stars. Successful rolls give more precise location.'),
('Planar Geography', 'intelligence', 'General knowledge of Prime, inner, outer, Astral, and Ethereal Planes. Travel techniques and common inhabitants.'),
('Profession', 'intelligence', 'Accomplished at non-labor profession: politics, cooking, estate management, scribing, etc. Must specify type.'),
('Science', 'intelligence', 'Expert in one scientific branch: astronomy, geology, metallurgy, etc. Must specify type.'),
('Shipbuilding', 'intelligence', 'Design and build ships. Supervise construction. Evaluate encountered ships.'),
('Signaling', 'intelligence', 'Leave messages understood only by other specialists of same culture/guild/force. Must specify type: military trumpet, naval flags, smoke, drums, etc.'),
('Snares', 'intelligence', 'Build traps to capture animals, monsters, and visitors.'),
('Survival', 'intelligence', 'Find food, shelter, and water in specific terrain: desert, forest/jungle, mountain/hill, open sea, plains, or arctic. Must specify terrain.'),
('Tracking', 'intelligence', 'Follow tracks. Success depends on age of tracks, terrain, number of tracks, etc.'),
('Veterinary Healing', 'intelligence', 'Like Healing but for non-humans, monsters, and animals. General (+1 penalty all) or Specialized (no penalty for specialty, +2 for others).'),

-- =====================================================
-- WISDOM SKILLS (9 skills)
-- =====================================================
('Animal Training', 'wisdom', 'Raise, train, and care for one animal type. Teach simple tricks/orders. Must specify type (horses, dogs, etc.).'),
('Bravery', 'wisdom', 'Resist effects of magical fear. NPCs can ignore morale checks or Intimidation.'),
('Caving', 'wisdom', 'Always know location in underground caves, caverns, rivers. Automatically know route taken. Works in mazes.'),
('Ceremony', 'wisdom', 'Honor an Immortal through ritual and ceremony. Know code of behavior and rituals pleasing to specific Immortal. Must specify Immortal.'),
('Danger Sense', 'wisdom', 'Detect imminent danger. Will not know nature or source. DM makes roll secretly.'),
('Detect Deception', 'wisdom', 'Recognize deceptive behavior in NPCs. Warns to distrust NPC. Does not reveal truth/falsehood of statements.'),
('Gambling', 'wisdom', 'Win money in honest games of skill and betting. Increases chances of winning.'),
('Law and Justice', 'wisdom', 'Knowledge of laws and judicial system of one culture/country. Must specify culture.'),
('Mysticism', 'wisdom', 'Instinctively know best course of action to please Immortals in general. Recognize idols and give proper respect.'),

-- =====================================================
-- CHARISMA SKILLS (8 skills)
-- =====================================================
('Acting', 'charisma', 'Make living as stage actor. Assume different personality or show false emotions. Tell convincing lies over limited time.'),
('Bargaining', 'charisma', 'Get best deal available for goods, services, or information.'),
('Deceiving', 'charisma', 'Persuade listener of truth and sincerity while lying. Speaker must believe what they say sounds true.'),
('Leadership', 'charisma', 'Add +1 to morale of NPCs under control. Convince NPCs to follow commands. Does not antagonize like Intimidation.'),
('Music', 'charisma', 'Play one group of related instruments skillfully. Must specify group: stringed, brass, percussion, woodwinds, etc.'),
('Persuasion', 'charisma', 'Persuade NPCs of honesty and sincerity. Speaker must believe truth of what they say. Good for diplomats.'),
('Singing', 'charisma', 'Sing in skilled manner. Make living as entertainer or bard.'),
('Storytelling', 'charisma', 'Captivate audience when telling stories. Earn living as storyteller.');

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

-- Show total count (should be 58 skills)
SELECT COUNT(*) as total_skills FROM general_skills;

-- Show breakdown by ability
SELECT 
    'Strength' as ability, COUNT(*) as count FROM general_skills WHERE governing_ability = 'strength'
UNION ALL
SELECT 'Dexterity', COUNT(*) FROM general_skills WHERE governing_ability = 'dexterity'
UNION ALL
SELECT 'Constitution', COUNT(*) FROM general_skills WHERE governing_ability = 'constitution'
UNION ALL
SELECT 'Intelligence', COUNT(*) FROM general_skills WHERE governing_ability = 'intelligence'
UNION ALL
SELECT 'Wisdom', COUNT(*) FROM general_skills WHERE governing_ability = 'wisdom'
UNION ALL
SELECT 'Charisma', COUNT(*) FROM general_skills WHERE governing_ability = 'charisma';

