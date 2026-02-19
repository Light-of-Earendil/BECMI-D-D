-- =====================================================
-- Migration: Add Missing Monsters from Basic D&D Wiki
-- Date: 2026-01-XX
-- Description: Add monsters from https://dungeonsdragons.fandom.com/wiki/List_of_Basic_Dungeons_%26_Dragons_monsters
--              that are missing from the database
-- =====================================================

-- Actaeon (Elk Centaur)
-- Source: Master Rules (BECMI) (1985)
-- HD: 11**, XP: 2700 (from wiki)
INSERT INTO monsters (
    name, armor_class, hit_dice, move_ground, move_flying, move_swimming,
    attacks, damage, no_appearing, save_as, morale, treasure_type,
    intelligence, alignment, xp_value, description, monster_type, terrain, `load`
) VALUES (
    'Actaeon',
    3,
    '11**',
    '150\' (50\')',
    NULL,
    NULL,
    '2 spears/1 antler or breath',
    '1d6+6/1d6+6/2d8 (special)',
    '0 (1)',
    'C11',
    10,
    'B',
    12,
    'Neutral',
    2700,
    'This solitary creature is a protector of woodland creatures. The actaeon is 9\' tall, with the arms, torso, and facial features of a human but the antlers and lower legs of an elk; its whole body is covered with brown elklike hide. It can camouflage itself perfectly (as if invisible) in light or dense woods. When angered by the wanton slaying of woodland creatures, the actaeon springs out of hiding, usually with surprise. It often uses large wood and bone spears to punish or slay the defilers of the woods. It has a powerful breath weapon that can be used once per day, filling a 10\' X 10\' X 10\' cube; each victim within it must make a saving throw vs. dragon breath or be polymorphed into a normal forest creature. Once per day an actaeon may summon woodland creatures to assist it.',
    'Monster (Rare)',
    'Woods',
    '3,000 cn at full speed; 6,000 cn at half speed'
);

-- Adaptor
-- Source: Master Rules (BECMI) (1985)
-- HD: 8*, XP: 1200 (from wiki)
INSERT INTO monsters (
    name, armor_class, hit_dice, move_ground, move_flying, move_swimming,
    attacks, damage, no_appearing, save_as, morale, treasure_type,
    intelligence, alignment, xp_value, description, monster_type, terrain, `load`
) VALUES (
    'Adaptor',
    9,
    '8*',
    '120\' (40\')',
    NULL,
    NULL,
    '2 (sword) or see below',
    '1d8+4/1d8+4 or see below',
    '1d6 (1d12)',
    'F8',
    10,
    'V',
    13,
    'Neutral',
    1200,
    'Adaptors are a peculiar race native to all planes of existence. They are very intelligent, and their ancient race has greater and wider knowledge than any sage, but their cultural philosophy demands that they not pass their great knowledge between planes and human cultures. Instead, they travel and observe civilization throughout the planes, exchanging information only among themselves. Adaptors are natural (nonmagical) polymorphs, able to change into the form of any creature of human or demihuman size. They also change color after they adapt to an attack. They are travelers, rarely staying anywhere for more than three days, and able to enter and leave other planes at will. These creatures have the ability to adapt - to alter their physical structure to survive in any environment. Once exposed to any type of magical attack, they then become immune to it. In combat, adaptors are skilled at swordplay (2 attacks per round, +4 bonus to attack and damage rolls).',
    'Monster (Very Rare)',
    'Anywhere humans are found',
    NULL
);

-- Aerial Servant (Haoou)
-- Source: Companion Rules (BECMI) (1984)
-- HD: 16**, XP: 3250 (from wiki - note: Rules Cyclopedia says 4050, but wiki says 3250)
INSERT INTO monsters (
    name, armor_class, hit_dice, move_ground, move_flying, move_swimming,
    attacks, damage, no_appearing, save_as, morale, treasure_type,
    intelligence, alignment, xp_value, description, monster_type, terrain, `load`
) VALUES (
    'Aerial Servant',
    0,
    '16**',
    '240\' (80\')',
    '720\' (240\')',
    NULL,
    '1',
    '4d8',
    '1 (1d4)',
    'F16',
    9,
    'Nil or Special',
    12,
    'Chaotic',
    3250,
    'Aerial servants are known by a name which sounds like "haoou." They are only encountered on the Prime Plane when conjured by a cleric (see the clerical spell aerial servant). They don\'t care to be summoned for this slave labor; they do not deliberately or maliciously misinterpret their summoners\' orders, but they are hateful enemies of humans who visit the plane of Air. Clerics can summon aerial servants to perform tasks for them. Summoned aerial servants will not fight; they only accept orders to seize things or prisoners and bring them back to the cleric. They can only be harmed by spells or magical weapons. They travel at super-speed, often surprising their prey. The percentage chance of breaking free of the servant\'s grip is equal to the victim\'s Hit Dice or experience level.',
    'Planar Monster (Very Rare)',
    'Plane of Air; Any',
    '5,000 cn at full flying speed; 10,000 cn at half speed'
);

-- Djinni (Lesser)
-- Source: Rules Cyclopedia
-- HD: 7+1*, XP: 1025 (from RC)
INSERT INTO monsters (
    name, armor_class, hit_dice, move_ground, move_flying, move_swimming,
    attacks, damage, no_appearing, save_as, morale, treasure_type,
    intelligence, alignment, xp_value, description, monster_type, terrain, `load`
) VALUES (
    'Djinni (Lesser)',
    5,
    '7+1*',
    '90\' (30\')',
    '240\' (80\')',
    NULL,
    '1 (fist or whirlwind) + special',
    '2d8 (fist) or 2d6 (whirlwind)',
    '1 (1)',
    'F7',
    12,
    'Nil',
    14,
    'Chaotic',
    1025,
    'Djinn are intelligent, free-willed, enchanted creatures from the elemental plane of Air. They appear as tall, humanlike beings. Djinn are basically good-beaned, in spite of their Chaotic alignment. Djinn are highly magical in nature, and can only be harmed by magic or magical weapons. A djinni can use each of its seven powers three times each day: Create Food and drink, Create metallic objects, Create soft goods and wooden objects, Become invisible, Assume gaseous Form, Form a whirlwind, Create illusions. A djinni has two forms of attack. In normal form, it strikes with its fist. It may also transform itself into a whirlwind. If a djinni is slain, its spirit returns to its own plane.',
    'Planar Monster, Enchanted (Rare)',
    'Plane of Air, Desert (preferred)',
    '3,500 cn at full flying speed; 7,000 cn at half speed'
);

-- Djinni (Greater; Pasha)
-- Source: Rules Cyclopedia
-- HD: 15***, XP: 4000 (from RC - note: file shows "4," which is likely 4000)
INSERT INTO monsters (
    name, armor_class, hit_dice, move_ground, move_flying, move_swimming,
    attacks, damage, no_appearing, save_as, morale, treasure_type,
    intelligence, alignment, xp_value, description, monster_type, terrain, `load`
) VALUES (
    'Djinni (Greater; Pasha)',
    -2,
    '15***',
    '120\' (40\')',
    '360\' (120\')',
    NULL,
    '2 fists or 1 whirlwind',
    '3d10/3d10 or 3d12 + special',
    '1 (1)',
    'M15',
    11,
    'Nil',
    14,
    'Chaotic',
    4000,
    'In the elemental plane of Air, the rulers of the djinn are known as pashas. They appear as very large normal djinn. A pasha cannot be affected by normal weapons, or even by weapons of less than +2 enchantment. They regenerate at the rate of 3 points per round. A pasha can perform all the abilities of a normal djinni as often as desired, up to once per round. It can also enter or leave the Ethereal Plane by concentrating for 1 full round. They have other special powers, each usable once per day: Grant another\'s wish, Cast cloudkill, Cast water to gas, Cast weather control. A pasha\'s whirlwind form is 120\' tall, 40\' diameter at the top, 10\' diameter at the base, and can move at 240\' (80\') rate. Unlike normal djinn, it can enter or leave whirlwind form in only 1 round. This form inflicts 3d12 points of damage to all in its path and slays any victim of less than 5 Hit Dice unless the victim makes a saving throw vs. death ray. Pashas cannot be summoned by spells, and are influenced by very few magical items. They normally appear on the Prime Plane only in response to the cries of a mistreated djinni.',
    'Planar Monster, Enchanted (Very Rare)',
    'Normally found only on their own plane; prefer Desert terrains',
    '10,000 cn flying at full speed; 20,000 cn flying at half speed'
);
