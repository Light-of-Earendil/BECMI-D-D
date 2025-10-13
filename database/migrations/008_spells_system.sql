-- =====================================================
-- BECMI SPELL SYSTEM - CORRECTED VERSION
-- Exact implementation from D&D Rules Cyclopedia Chapter 4
-- Complete with all Level 1-3 spells for Magic-Users and Clerics
-- =====================================================

-- Drop and recreate spells table for clean start
DROP TABLE IF EXISTS spells;

-- Create spells master table
CREATE TABLE spells (
    spell_id INT AUTO_INCREMENT PRIMARY KEY,
    spell_name VARCHAR(100) NOT NULL,
    spell_level INT NOT NULL CHECK (spell_level >= 1 AND spell_level <= 9),
    spell_type ENUM('magic_user', 'cleric', 'druid') NOT NULL,
    casting_time VARCHAR(50) DEFAULT '1 round',
    range_text VARCHAR(100),
    duration_text VARCHAR(100),
    effect_text VARCHAR(200),
    description TEXT NOT NULL,
    components VARCHAR(100),
    reversible BOOLEAN DEFAULT FALSE,
    reverse_name VARCHAR(100),
    reverse_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_spell (spell_name, spell_type, spell_level),
    INDEX idx_spell_type_level (spell_type, spell_level),
    INDEX idx_reversible (reversible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend character_spells table (safely)
ALTER TABLE character_spells 
ADD COLUMN IF NOT EXISTS spell_id INT AFTER character_id,
ADD COLUMN IF NOT EXISTS is_memorized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS times_cast_today INT DEFAULT 0;

-- Add foreign key if not exists
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
     WHERE CONSTRAINT_NAME = 'fk_character_spells_spell' 
     AND TABLE_NAME = 'character_spells') = 0,
    'ALTER TABLE character_spells ADD CONSTRAINT fk_character_spells_spell FOREIGN KEY (spell_id) REFERENCES spells(spell_id) ON DELETE CASCADE',
    'SELECT "Foreign key already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_spells_memorized ON character_spells(character_id, is_memorized);
CREATE INDEX IF NOT EXISTS idx_character_spells_spell ON character_spells(spell_id);

-- =====================================================
-- FIRST LEVEL MAGICAL SPELLS (Rules Cyclopedia p.54-59)
-- =====================================================
INSERT INTO spells (spell_name, spell_level, spell_type, casting_time, range_text, duration_text, effect_text, description, components, reversible, reverse_name, reverse_description) VALUES

('Analyze', 1, 'magic_user', '1 round', '0 (touch only)', '1 round', 'Analyzes magic on one item',
'A spellcaster using this spell can handle one item and learn the enchantment on it. The spellcaster has a chance of 15% plus 5% per experience level to determine one magical characteristic of the item. The spell does not reveal precise information, characterizing bonuses as "many" or "few", estimating charges within 25% of actual.', 
'V, S, M (lens)', FALSE, NULL, NULL),

('Charm Person', 1, 'magic_user', '1 round', '120''', 'Special (see below)', 'One living person',
'This spell affects humans, demihumans, and certain humanoid creatures. The victim is allowed a saving throw vs. spells. If failed, the victim believes the spellcaster is its "best friend" and will defend the spellcaster. Duration depends on Intelligence: High INT (13-18) saves every day, Average INT (9-12) saves every week, Low INT (3-8) saves every month. Only affects creatures up to ogre-size.',
'V, S', FALSE, NULL, NULL),

('Detect Magic', 1, 'magic_user', '1 round', '0', '2 turns', 'Everything within 60''',
'When cast, the spellcaster will see a glow surround all magical objects, creatures, and places which are visible and within 60 feet. The spell does not reveal command words or spell types.',
'V, S', FALSE, NULL, NULL),

('Floating Disc', 1, 'magic_user', '1 round', '0', '6 turns', 'Disc remains within 6''',
'This spell creates an invisible magical horizontal platform about the size and shape of a small round shield. It can carry up to 5000 cn (500 pounds). The disc is created at the height of the spellcaster''s waist and will always remain at that height, following the spellcaster within 6 feet at his movement rate.',
'V, S, M (drop of mercury)', FALSE, NULL, NULL),

('Hold Portal', 1, 'magic_user', '1 round', '10''', '2-12 (2d6) turns', 'One door, gate, or similar portal',
'This spell will magically hold shut any portal—door, gate, etc. A knock spell will open it. Any creature three or more Hit Dice greater than the caster may break through in one round, but the portal will relock if closed within spell duration.',
'V', FALSE, NULL, NULL),

('Light', 1, 'magic_user', '1 round', '120''', '6 turns + 1 turn/level of caster', 'Volume of 30'' diameter',
'This spell creates a large ball of light, much like a bright torchlight. If cast on an object, the light moves with it. If cast at a creature''s eyes, the creature must save vs. spells or be blinded until duration ends.',
'V, S, M (firefly)', TRUE, 'Darkness', 
'Creates a circle of darkness 30'' in diameter blocking all sight except infravision. If cast at eyes, causes blindness (save vs. spells to resist).'),

('Magic Missile', 1, 'magic_user', '1 round', '150''', '1 round', 'Creates 1 or more arrows',
'A magic missile is a glowing arrow that inflicts 1d6+1 (2-7) points of damage. It automatically hits any one visible target specified. For every 5 levels of experience, two more missiles are created (max 3 total at 10th level). Multiple missiles may target one creature or different targets.',
'V, S', FALSE, NULL, NULL),

('Protection from Evil', 1, 'magic_user', '1 round', '0', '6 turns', 'The spellcaster only',
'This spell creates an invisible magical barrier all around the spellcaster''s body. All attacks against the spellcaster are penalized by -1, and the spellcaster gains +1 to all saving throws. Enchanted creatures cannot attack in melee combat. If the spellcaster attacks in melee, enchanted creatures can then touch him, but penalties still apply.',
'V, S, M (holy water or powdered iron)', FALSE, NULL, NULL),

('Read Languages', 1, 'magic_user', '1 round', '0', '2 turns', 'The spellcaster only',
'This spell allows the spellcaster to read (not speak) any unknown languages or codes, including treasure maps, secret symbols, etc.',
'V, S, M (piece of amber)', FALSE, NULL, NULL),

('Read Magic', 1, 'magic_user', '1 round', '0', '1 turn', 'The spellcaster only',
'This spell allows the spellcaster to read magical words or runes, such as those found on scrolls and items. A spellcaster cannot understand unfamiliar magic writings without using this spell. Once a scroll or rune is read with this spell, it can be read later without the spell.',
'V, S, M (clear crystal)', FALSE, NULL, NULL),

('Shield', 1, 'magic_user', '1 round', '0', '2 turns', 'The spellcaster only',
'This spell creates a magical barrier all around the spellcaster. The caster has AC 2 against missiles and AC 4 against all other attacks while the spell lasts. If someone shoots a magic missile at the protected caster, the caster may save vs. spells per missile; if successful, the missile has no effect.',
'V, S', FALSE, NULL, NULL),

('Sleep', 1, 'magic_user', '1 round', '240''', '4d4 (4-16) turns', '2-16 Hit Dice of creatures in 40'' square area',
'This spell puts creatures to sleep for up to 16 turns. It only affects creatures with 4+1 Hit Dice or less within a 40'' X 40'' area chosen by the player. The spell will not affect undead or very large creatures. The DM rolls 2d8 to find total Hit Dice affected. Victims get no saving throw. Sleeping victims can be killed with single blow of edged weapon.',
'V, S, M (pinch of sand or rose petals)', FALSE, NULL, NULL),

('Ventriloquism', 1, 'magic_user', '1 round', '60''', '2 turns', 'One item or location',
'This spell allows the spellcaster to make the sound of his or her voice come from somewhere else, such as a statue, animal, a dark corner, etc. The "somewhere else" must be within range.',
'V, M (small cone)', FALSE, NULL, NULL);

-- =====================================================
-- SECOND LEVEL MAGICAL SPELLS (Rules Cyclopedia p.59-62)
-- =====================================================
INSERT INTO spells (spell_name, spell_level, spell_type, casting_time, range_text, duration_text, effect_text, description, components, reversible, reverse_name, reverse_description) VALUES

('Continual Light', 2, 'magic_user', '1 round', '120''', 'Permanent', 'Volume of 60'' diameter',
'This spell creates a globe of light 60'' across, much brighter than a torch but not as bright as daylight. It lasts forever or until magically removed. May be cast on an object or creature''s eyes (save vs. spells or be permanently blinded).',
'V, S, M (powdered diamond)', TRUE, 'Continual Darkness',
'Creates a volume of complete darkness in 30'' radius. Torches, lanterns, and even light spell will not affect it. Infravision cannot penetrate it. If cast on eyes, causes blindness (save vs. spells).'),

('Detect Evil', 2, 'magic_user', '1 round', '60''', '2 turns', 'Everything within 60''',
'When cast, the spellcaster will see a glow surround all evilly-enchanted objects within 60''. It also causes creatures that want to harm the spellcaster to glow when within range. Does not allow hearing actual thoughts. Chaotic alignment is not automatically evil.',
'V, S, M (strip of holy parchment)', FALSE, NULL, NULL),

('Detect Invisible', 2, 'magic_user', '1 round', '10'' per level of spellcaster', '6 turns', 'The spellcaster only',
'When cast, the spellcaster can see all invisible creatures and objects within range. Range is 10'' for each level (e.g., 3rd level caster sees invisible things within 30'').',
'V, S, M (pinch of talc or powdered silver)', FALSE, NULL, NULL),

('Entangle', 2, 'magic_user', '1 round', '30''', '1 round per level', 'Controls ropes',
'This spell allows the spellcaster to use any rope-like object of living or once-living material (roots, vines, leather ropes, plant-fibre ropes) to behave as ordered. About 50'' of normal 1/2" diameter vine plus 5'' per level can be affected. Commands: coil, coil and knot, loop, loop and knot, tie and knot, and reverses.',
'V, S, M (length of rope)', FALSE, NULL, NULL),

('ESP', 2, 'magic_user', '1 round', '60''', '12 turns', 'All thoughts in one direction',
'Allows the spellcaster to "hear" thoughts. Must concentrate in one direction for 6 rounds to hear thoughts of a creature within range. Understands thoughts regardless of language. Does not work on undead. Will not be hampered by wood or liquid, penetrates 2 feet of rock, but thin lead coating blocks it. Targets may save vs. spells.',
'V, S, M (copper piece)', TRUE, 'Mindmask',
'May be cast by touch on any one creature. Recipient is completely immune to ESP and all other mind-reading for spell duration.'),

('Invisibility', 2, 'magic_user', '1 round', '240''', 'Permanent until broken', 'One creature or object',
'Makes one creature or object invisible. All items carried and worn also become invisible. Any invisible item becomes visible when it leaves possession. Invisible creature remains invisible until he attacks or casts any spell.',
'V, S, M (eyelash in gum arabic)', FALSE, NULL, NULL),

('Knock', 2, 'magic_user', '1 round', '60''', 'See below', 'One lock or bar',
'Opens any type of lock, any normal or magically locked door (hold portal or wizard lock), secret doors (must be found first). Unlocks gates, unsticks stuck doors, opens treasure chests. Forces barred doors open. If door is locked AND barred, only one type opens.',
'V', FALSE, NULL, NULL),

('Levitate', 2, 'magic_user', '1 round', '0', '6 turns + 1 turn/level', 'The spellcaster only',
'Caster may move up or down in air without support at rate of 20'' per round. Does not allow side-to-side movement except by pushing/pulling. May carry normal weight up to 2,000 cn (200 lbs).',
'V, S, M (leather loop or wire)', FALSE, NULL, NULL),

('Locate Object', 2, 'magic_user', '1 round', '60'' + 10''/level', '2 turns', 'One object within range',
'Caster can find an object within spell range. Must know exactly what object looks like, or can specify common type like "any flight of stairs". Points to nearest designated object within range, giving direction but not distance.',
'V, S, M (forked twig)', FALSE, NULL, NULL),

('Mirror Image', 2, 'magic_user', '1 round', '0', '6 turns', 'The spellcaster only',
'Creates 1d4 (1-4) additional images that look and act exactly like caster. Images appear and remain within 3'' of caster. Images are not real and cannot do anything. Any successful attack on caster strikes an image instead, causing it to disappear.',
'V, S', FALSE, NULL, NULL),

('Phantasmal Force', 2, 'magic_user', '1 round', '240''', 'Concentration', 'Volume 20'' x 20'' x 20''',
'Creates or changes appearances within area. Caster can create illusion of something seen. If used to create monster, it appears real but is AC 9 and disappears when hit. If used to create attack, victim may save vs. spells. Never inflicts real damage. Lasts as long as caster concentrates.',
'V, S, M (bit of fleece)', FALSE, NULL, NULL),

('Web', 2, 'magic_user', '1 round', '10''', '48 turns', 'Volume 10'' x 10'' x 10''',
'Creates mass of sticky strands difficult to destroy except with flame. Usually blocks area affected. Giants and creatures with great Strength break through in 2 rounds. Human of average Strength takes 2d4 turns. Flames destroy web in 2 rounds but creatures within take 1d6 damage.',
'V, S, M (spider web)', FALSE, NULL, NULL),

('Wizard Lock', 2, 'magic_user', '1 round', '10''', 'Permanent', 'One portal or lock',
'More powerful version of hold portal. Works on any lock, not just doors, and lasts forever (until magically dispelled). Knock spell can open it. The wizard who cast it can easily open the door, as can any magic-using character/creature 3+ levels/HD greater than caster.',
'V, S, M (gold dust worth 10 gp)', FALSE, NULL, NULL);

-- =====================================================  
-- THIRD LEVEL MAGICAL SPELLS (Rules Cyclopedia p.62-66)
-- =====================================================
INSERT INTO spells (spell_name, spell_level, spell_type, casting_time, range_text, duration_text, effect_text, description, components, reversible, reverse_name, reverse_description) VALUES

('Clairvoyance', 3, 'magic_user', '1 round', '60''', '12 turns', 'See through another''s eyes',
'Caster may see through eyes of any single creature in spell range. "Seeing" through a creature''s eyes takes one full turn, after which caster can change to another creature. Two feet of rock or thin coating of lead blocks effects. No saving throw allowed.',
'V, S, M (crystal sphere)', FALSE, NULL, NULL),

('Create Air', 3, 'magic_user', '1 round', 'Immediate area, 8,000 cu. ft.', '1 hour per level', 'Provides breathable air',
'Provides breathable air in 8,000 cubic feet (20'' x 20'' x 20'' room). Can be cast on enclosed vehicle interiors, living creatures, or equipment. When cast on person, provides pressurized air but bubbles constantly underwater. Does not protect from poison gasses.',
'V, S, M (small bellows)', FALSE, NULL, NULL),

('Dispel Magic', 3, 'magic_user', '1 round', '120''', 'Permanent', 'Destroys spells in 20'' cube',
'Destroys other spell effects in 20'' x 20'' x 20'' cubic volume. Does not affect magical items. Spell effects by caster of equal or lower level are automatically destroyed. Higher-level caster effects: 5% failure chance per level difference. Can dispel effects OF magical items when used (e.g., dispel control from ring of human control).',
'V, S', FALSE, NULL, NULL),

('Fireball', 3, 'magic_user', '1 round', '240''', 'Instantaneous', 'Explosion in 40'' diameter sphere',
'Creates missile of fire that bursts into ball of fire with 40'' diameter (20'' radius) where it strikes. Causes 1d6 points of fire damage per level of caster to every creature in area. Each victim may save vs. spells for half damage.',
'V, S, M (small ball of bat guano and sulfur)', FALSE, NULL, NULL),

('Fly', 3, 'magic_user', '1 round', 'Touch', '1d6 (1-6) turns + 1 turn/level', 'One creature may fly',
'Allows target (possibly caster) to fly. Recipient can fly in any direction at any speed up to 360'' (120'') by concentration. May also stop and hover without concentration. May carry normal weight up to 2,000 cn (200 lbs).',
'V, S, M (wing feather)', FALSE, NULL, NULL),

('Haste', 3, 'magic_user', '1 round', '240''', '3 turns', 'Up to 24 creatures move double speed',
'Allows up to 24 creatures in 60'' diameter circle to perform actions at double speed for 3 turns. Those affected move at twice normal speed and make double normal number of attacks. Does not affect magic rate, so hasted spellcaster still only casts one spell per round.',
'V, S, M (licorice root shaving)', TRUE, 'Slow',
'Removes effects of haste, or causes victims to move and attack at half normal speed. Does not affect spellcasting or magical device use. Victims may save vs. spells.'),

('Hold Person', 3, 'magic_user', '1 round', '120''', '1 turn/level', 'Paralyzes up to 4 creatures',
'Affects any human, demihuman, or human-like creature (bugbear, gnoll, hobgoblin, kobold, lizard man, ogre, orc, nixie, pixie, sprite). Not undead or larger than ogres. Each victim saves vs. spells or is paralyzed. If cast at single person, -2 penalty to save. If cast at group, affects up to 4 persons with no penalty.',
'V, S, M (small straight piece of iron)', TRUE, 'Free Person',
'Removes paralysis of up to 4 victims of hold person spell (cleric or magic-user version). Has no other effect.'),

('Infravision', 3, 'magic_user', '1 round', 'Touch', '1 day', 'One living creature',
'Enables recipient to see in the dark to 60'' range with same vision as dwarves and elves. Warm things appear red, cold things blue. Does not work in normal or magical light.',
'V, S, M (carrots or agate)', FALSE, NULL, NULL),

('Invisibility 10'' Radius', 3, 'magic_user', '1 round', '120''', 'Permanent until broken', 'All creatures within 10''',
'Makes recipient and all others within 10'' at time of casting invisible. Those who move further than 10'' from recipient become visible and may not regain invisibility. Otherwise same as invisibility spell. Invisible creature remains invisible until attacks or casts spell.',
'V, S, M (eyelash in gum arabic)', FALSE, NULL, NULL),

('Lightning Bolt', 3, 'magic_user', '1 round', '180''', 'Instantaneous', 'Bolt 60'' long, 5'' wide',
'Creates bolt of lightning starting up to 180'' away and extending 60'' in straight line. All creatures within take 1d6 damage per caster level. Each victim may save vs. spells for half damage. If bolt strikes solid surface, it bounces back toward caster until total length is 60''.',
'V, S, M (fur and amber, glass or crystal rod)', FALSE, NULL, NULL),

('Protection from Evil 10'' Radius', 3, 'magic_user', '1 round', '0', '12 turns', 'Barrier 20'' diameter',
'Creates invisible magical barrier extending 10'' radius in all directions. Each creature within gains +1 to all saves, all attacks against them penalized by -1. Enchanted creatures cannot attack those within in melee. If anyone within attacks enchanted creature, barrier no longer prevents melee but bonuses/penalties still apply.',
'V, S, M (holy water or powdered silver)', FALSE, NULL, NULL),

('Protection from Normal Missiles', 3, 'magic_user', '1 round', '30''', '12 turns', 'One creature',
'Gives recipient complete protection from all small nonmagical missiles (arrows, quarrels, thrown spears). Ranged attacks simply miss. Large or magical attacks (catapult stone, magic arrow) are not affected.',
'V, S, M (piece of tortoise or turtle shell)', FALSE, NULL, NULL),

('Water Breathing', 3, 'magic_user', '1 round', '30''', '1 day (24 hours)', 'One air-breathing creature',
'Allows recipient to breathe while underwater at any depth. Does not affect movement or interfere with breathing air if recipient emerges from water.',
'V, S, M (reed or piece of straw)', FALSE, NULL, NULL);

-- =====================================================
-- FIRST LEVEL CLERICAL SPELLS (Rules Cyclopedia p.48-51)
-- =====================================================
INSERT INTO spells (spell_name, spell_level, spell_type, casting_time, range_text, duration_text, effect_text, description, components, reversible, reverse_name, reverse_description) VALUES

('Cure Light Wounds', 1, 'cleric', '1 round', 'Touch', 'Permanent', 'Any one living creature',
'This spell either heals damage or removes paralysis. If used to heal, cures 2-7 (1d6+1) points of damage. Cannot heal damage if used to cure paralysis. Cannot increase total hit points above original amount. Cleric may cast on himself.',
'V, S', TRUE, 'Cause Light Wounds',
'Causes 1d6+1 (2-7) points of damage to any creature or character touched (no saving throw). Cleric must make normal attack roll to inflict damage.'),

('Detect Evil', 1, 'cleric', '1 round', '120''', '6 turns', 'Everything within 120''',
'When cast, cleric will see evilly enchanted objects within 120'' glow. Causes creatures that want to harm cleric to glow when within range. Actual thoughts cannot be heard. Chaotic alignment does not automatically mean Evil. Traps and poison are not evil, merely dangerous.',
'V, S, M (holy symbol)', FALSE, NULL, NULL),

('Detect Magic', 1, 'cleric', '1 round', '0', '2 turns', 'Everything within 60''',
'When cast, cleric will see glow surround magical objects, creatures, and places within 60''. Glow will not last very long; should be used when wanting to know if particular objects already within sight are magical.',
'V, S, M (holy symbol)', FALSE, NULL, NULL),

('Light', 1, 'cleric', '1 round', '120''', '12 turns', 'Volume of 30'' diameter',
'Creates large ball of light, as if cast by bright torch or lamp. If cast on object (such as cleric''s weapon), light moves with object. If cast at creature''s eyes, victim must save vs. spell or be blinded for duration or until canceled.',
'V, M (firefly or glow-worm)', TRUE, 'Darkness',
'Creates circle of darkness 30'' in diameter. Blocks all sight except infravision. Cancels light spell if cast upon it. If cast at opponent''s eyes, causes blindness (save vs. spell).'),

('Protection from Evil', 1, 'cleric', '1 round', '0', '12 turns', 'The cleric only',
'Creates invisible magical barrier around cleric''s body (less than inch away). Characters and monsters attacking cleric penalized by -1 to attack rolls, cleric gains +1 bonus to all saving throws. Enchanted creatures cannot even touch the cleric (but can use missile weapons with -1 penalty). If cleric attacks enchanted creature, they can then touch cleric but penalties still apply.',
'V, S, M (holy water or silver dust)', FALSE, NULL, NULL),

('Purify Food and Water', 1, 'cleric', '1 round', '10''', 'Permanent', 'See below',
'Makes spoiled or poisoned food and water safe and usable. Purifies one ration of preserved food (iron or standard), or six waterskins of water, or enough normal food to feed dozen people. If cast at mud, causes dirt to settle leaving pool of pure clear water. Will not affect living creature.',
'V, S', FALSE, NULL, NULL),

('Remove Fear', 1, 'cleric', '1 round', 'Touch', '2 turns', 'Any one living creature',
'When cleric casts and touches living creature, spell calms creature and removes any fear. If creature affected by fear spell/effect that doesn''t normally allow saving throw, remove fear can still be useful—victim gets save vs. spells adding bonus equal to cleric''s level (max +6). Roll of 1 always fails.',
'V, S', TRUE, 'Cause Fear',
'Makes any one creature flee for two turns. Victim may save vs. spells to avoid effect. Has range of 120''.'),

('Resist Cold', 1, 'cleric', '1 round', '0', '6 turns', 'All creatures within 30''',
'When cast, all creatures within 30'' of cleric can withstand freezing temperatures without harm. Those affected gain +2 bonus to all saves against cold attacks. Any damage from cold reduced by 1 point per die (minimum 1 point per die). Effect moves with cleric.',
'V, S, M (fur)', FALSE, NULL, NULL);

-- =====================================================
-- SECOND LEVEL CLERICAL SPELLS (Rules Cyclopedia p.51-53)
-- =====================================================
INSERT INTO spells (spell_name, spell_level, spell_type, casting_time, range_text, duration_text, effect_text, description, components, reversible, reverse_name, reverse_description) VALUES

('Bless', 2, 'cleric', '1 round', '60''', '6 turns', 'All within 20'' square area',
'Improves morale of friendly creatures by +1 and gives recipients +1 bonus on all attack and damage rolls. Only affects creatures in 20'' X 20'' area, and only those not yet in melee.',
'V, S, M (holy water)', TRUE, 'Blight',
'Places -1 penalty on enemies'' morale, attack rolls, and damage rolls. Each victim may save vs. spells to avoid penalties.'),

('Find Traps', 2, 'cleric', '1 round', '0 (Cleric only)', '2 turns', 'Traps within 30'' glow',
'Causes all mechanical and magical traps to glow with dull blue light when cleric comes within 30''. Does not reveal types of traps or method of removing them. Ambush is not a trap, nor is natural hazard like quicksand.',
'V, S', FALSE, NULL, NULL),

('Hold Person', 2, 'cleric', '1 round', '180''', '9 turns', 'Paralyzes up to 4 creatures',
'Affects any human, demihuman, or human-like creature. Not undead or creatures larger than ogres. Each victim saves vs. spells or is paralyzed for 9 turns. If cast at single person, -2 penalty to save. If cast at group, affects up to 4 persons with no penalty. Paralysis may only be removed by reversed spell or dispel magic.',
'V, S, M (small straight piece of iron)', TRUE, 'Free Person',
'Removes paralysis of up to 4 victims of hold person spell. Has no other effect (does not remove ghoul paralysis).'),

('Know Alignment', 2, 'cleric', '1 round', '0 (Cleric only)', '1 round', 'One creature within 10''',
'Caster may discover alignment (Lawful, Neutral, Chaotic) of any one creature within 10''. May also be used to find alignment of enchanted item or area.',
'V, S, M (holy symbol)', TRUE, 'Confuse Alignment',
'Lasts 1 turn per level of caster, may be cast on any creature by touch (no save). For duration, cleric trying to identify alignment gets false answer. Same false answer results from all further attempts.'),

('Resist Fire', 2, 'cleric', '1 round', '30''', '2 turns', 'One living creature',
'For duration, normal fire and heat cannot harm recipient. Recipient gains +2 bonus on all saves against magical fire (dragon breath, fireball). Damage from such fire reduced by 1 point per die (minimum 1 point per die). Red dragon breath damage reduced by 1 point per Hit Die.',
'V, S', FALSE, NULL, NULL),

('Silence 15'' Radius', 2, 'cleric', '1 round', '180''', '12 turns', 'Sphere of silence 30'' across',
'Makes area of effect totally silent. Conversation and spellcasting impossible for duration. Does not prevent person within from hearing noises outside. If cast on creature, victim saves vs. spells or effect moves with creature. If save successful, spell remains in area cast and victim may move out.',
'V, S', FALSE, NULL, NULL),

('Snake Charm', 2, 'cleric', '1 round', '60''', '2-5 rounds or 2-5 turns', 'Charms 1 HD of snakes per level',
'Cleric may charm 1 Hit Die of snakes for each level of experience, no save allowed. Snakes affected rise up and sway but will not attack unless attacked. If used on snakes attacking, duration is 1d4+1 (2-5) rounds; otherwise lasts 1d4+1 (2-5) turns. When wears off, snakes return to normal reactions.',
'V, S, M (snake scale)', FALSE, NULL, NULL),

('Speak with Animals', 2, 'cleric', '1 round', '0 (Cleric only)', '6 turns', 'Allows conversation within 30''',
'When casting, cleric must name one type of animal (e.g., wolves). For duration, cleric may speak with all animals of that type if within 30'' (effect moves with caster). Can speak to normal or giant forms but only one type at a time. Cannot speak to intelligent animals and fantastic creatures. Creatures usually have favorable reactions (+2 bonus) and can be talked into doing favor if reaction high enough.',
'V, S, M (bit of fur)', FALSE, NULL, NULL);

-- =====================================================
-- THIRD LEVEL CLERICAL SPELLS (Rules Cyclopedia p.53-56)
-- =====================================================
INSERT INTO spells (spell_name, spell_level, spell_type, casting_time, range_text, duration_text, effect_text, description, components, reversible, reverse_name, reverse_description) VALUES

('Continual Light', 3, 'cleric', '1 round', '120''', 'Permanent', 'Sphere of light 60'' across',
'Creates light as bright as daylight in spherical volume of 30'' radius. Lasts until dispel magic or continual darkness cast upon it. Creatures penalized in bright daylight suffer same penalties within spell effect. If cast on opponent''s eyes, victim saves vs. spells or is blinded until effect removed.',
'V, S, M (diamond dust worth 50 gp)', TRUE, 'Continual Darkness',
'Creates completely dark volume 30'' radius. Blocks all sight except infravision. Torches, lanterns, even light spell will not affect it. Infravision cannot penetrate it. Continual light cancels it. If cast on eyes, causes blindness (save vs. spells).'),

('Cure Blindness', 3, 'cleric', '1 round', 'Touch', 'Permanent', 'One living creature',
'Cures nearly any form of blindness, including those caused by light or darkness spells (normal or continual). Will not affect blindness caused by curse.',
'V, S', FALSE, NULL, NULL),

('Cure Disease', 3, 'cleric', '1 round', '30''', 'Permanent', 'One living creature within range',
'Cures any living creature of one disease, such as those caused by mummy or green slime. If cast by cleric of 11th level or greater, also cures lycanthropy.',
'V, S', TRUE, 'Cause Disease',
'Infects victim with hideous wasting disease unless successful save vs. spells. Diseased victim has -2 penalty on all attack rolls. Victim''s wounds cannot be magically cured, natural healing takes twice as long. Fatal in 2d12 (2-24) days unless removed by cure disease.'),

('Growth of Animal', 3, 'cleric', '1 round', '120''', '12 turns', 'Doubles size of one animal',
'Doubles size of one normal or giant animal. Animal then has twice normal strength and inflicts double normal damage. May carry twice normal encumbrance. Does not change behavior, AC, or hit points. Does not affect intelligent animal races or fantastic creatures.',
'V, S, M (piece of hair or fur)', FALSE, NULL, NULL),

('Locate Object', 3, 'cleric', '1 turn', '0 (Cleric only)', '6 turns', 'Detects one object within 120''',
'Allows cleric to sense direction of one known object. Gives no information about distance. Can detect common object with partial description (like "stairs leading up") but only reveals direction to closest such object. To find specific object, cleric must know exactly what it looks like. Will not locate a creature.',
'V, S, M (forked twig)', FALSE, NULL, NULL),

('Remove Curse', 3, 'cleric', '1 round', 'Touch', 'Permanent', 'Removes any one curse',
'Removes one curse, whether on character, item, or area. Some curses (especially on magical items) may only be removed for short time at DM discretion; such curses would require dispel evil for permanent removal (or possibly remove curse by high level cleric/magic-user).',
'V, S', TRUE, 'Curse',
'Causes misfortune or penalty to affect victim. Curses limited only by caster''s imagination, but if too powerful may return to caster! Safe limits: -4 penalty on attack rolls; -2 penalty on saves; prime requisite reduced to half; -4 penalty on reaction rolls. Victim may save vs. spells.'),

('Speak with the Dead', 3, 'cleric', '1 round', '10''', '1 round per level', 'Cleric may ask three questions',
'Cleric may ask 3 questions of deceased spirit if body within range. 6th-7th level: recently deceased (up to 4 days). 8th-14th level: up to 4 months dead. 15th-20th level: up to 4 years dead. 21st+: no time limit. Spirit replies in tongue known to cleric. If alignments same, provides clear brief answers; if differ, may reply in riddles.',
'V, S, M (holy symbol)', FALSE, NULL, NULL),

('Striking', 3, 'cleric', '1 round', '30''', '1 turn', '1d6 bonus damage on 1 weapon',
'Allows any one weapon to inflict 1d6 additional damage per attack (like magical staff of striking). Weapon inflicts this extra damage with every successful blow for duration. Bonus does not apply to attack rolls, only damage. If cast on normal weapon, weapon may then damage creatures affected only by magic weapons, doing 1d6 damage per strike.',
'V, S', FALSE, NULL, NULL);

-- Default unmemorized status for existing spells
UPDATE character_spells SET is_memorized = FALSE WHERE is_memorized IS NULL;
UPDATE character_spells SET times_cast_today = 0 WHERE times_cast_today IS NULL;

COMMIT;

