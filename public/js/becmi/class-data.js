/**
 * BECMI D&D Character Manager - Class Data
 * 
 * Complete class definitions from Rules Cyclopedia Chapter 2
 * Includes prime requisites, requirements, hit dice, and restrictions
 */

const BECMI_CLASS_DATA = {
    fighter: {
        name: 'Fighter',
        primeRequisites: ['strength'],
        minRequirements: {},
        hitDie: 8,
        maxLevel: 36,
        armor: 'Any armor, shields allowed',
        weapons: 'Any weapons',
        specialAbilities: 'Lance Attack, Set Spear vs Charge',
        description: 'A warrior whose main skill is prowess at arms. Fighters protect their weaker allies and have the most hit points.',
        xpBonus: {
            '3-5': -0.20,
            '6-8': -0.10,
            '13-15': 0.05,
            '16-18': 0.10
        }
    },
    cleric: {
        name: 'Cleric',
        primeRequisites: ['wisdom'],
        minRequirements: {},
        hitDie: 6,
        maxLevel: 36,
        armor: 'Any armor, shields allowed',
        weapons: 'No edged or pointed weapons (club, mace, staff, etc.)',
        specialAbilities: 'Turn Undead, Clerical Spells (from 2nd level)',
        description: 'A human dedicated to a great cause. Clerics can cast healing and protective spells and turn undead.',
        xpBonus: {
            '3-5': -0.20,
            '6-8': -0.10,
            '13-15': 0.05,
            '16-18': 0.10
        }
    },
    magic_user: {
        name: 'Magic-User',
        primeRequisites: ['intelligence'],
        minRequirements: {},
        hitDie: 4,
        maxLevel: 36,
        armor: 'None (no armor or shields)',
        weapons: 'Dagger only (optionally: staff, sling, dart)',
        specialAbilities: 'Magical Spells, Spell Book (starts with 2 spells)',
        description: 'A character who studies magic. Weak at first but becomes extremely powerful. Cannot wear armor.',
        xpBonus: {
            '3-5': -0.20,
            '6-8': -0.10,
            '13-15': 0.05,
            '16-18': 0.10
        },
        startingSpells: 2
    },
    thief: {
        name: 'Thief',
        primeRequisites: ['dexterity'],
        minRequirements: {},
        hitDie: 4,
        maxLevel: 36,
        armor: 'Leather armor only (no shields)',
        weapons: 'Any missile weapon, any one-handed melee weapon',
        specialAbilities: 'Open Locks, Find/Remove Traps, Climb Walls, Move Silently, Hide in Shadows, Pick Pockets, Hear Noise, Backstab',
        description: 'A character specializing in stealth and cunning. Has unique skills for exploration and infiltration.',
        xpBonus: {
            '3-5': -0.20,
            '6-8': -0.10,
            '13-15': 0.05,
            '16-18': 0.10
        }
    },
    dwarf: {
        name: 'Dwarf',
        primeRequisites: ['strength'],
        minRequirements: {
            constitution: 9
        },
        hitDie: 8,
        maxLevel: 12,
        armor: 'Any armor, shields allowed',
        weapons: 'Any Small or Medium melee weapon, short bows, crossbows (no longbows)',
        specialAbilities: 'Infravision 60\', Detect traps/slopes/construction (1 in 3), Fighter maneuvers, Resistant to magic',
        description: 'Short and stocky demihuman. Sturdy fighter resistant to magic with special detection abilities.',
        xpBonus: {
            '3-5': -0.20,
            '6-8': -0.10,
            '13-15': 0.05,
            '16-18': 0.10
        }
    },
    elf: {
        name: 'Elf',
        primeRequisites: ['strength', 'intelligence'],
        minRequirements: {
            intelligence: 9
        },
        hitDie: 6,
        maxLevel: 10,
        armor: 'Any armor, shields allowed',
        weapons: 'Any weapons',
        specialAbilities: 'Infravision 60\', Detect secret doors (1 in 3), Immune to ghoul paralysis, Magic-User spells (starts with 1 spell), Fighter maneuvers',
        description: 'Slender demihuman combining fighter and magic-user abilities. Cannot reach very high levels but very versatile.',
        xpBonus: {
            'both_13-15': 0.05,
            'both_16-18': 0.10
        },
        startingSpells: 1
    },
    halfling: {
        name: 'Halfling',
        primeRequisites: ['strength', 'dexterity'],
        minRequirements: {
            dexterity: 9,
            constitution: 9
        },
        hitDie: 6,
        maxLevel: 8,
        armor: 'Any armor (must be halfling-sized), shields allowed',
        weapons: 'Any Small melee weapon, short bow, light crossbow',
        specialAbilities: '+1 missile attacks, -2 AC vs large creatures, +1 initiative, Hide in woods (90%), Hide in shadows (33%)',
        description: 'Small demihuman resembling human child. Excellent with missiles and able to hide very effectively.',
        xpBonus: {
            'either_13-15': 0.05,
            'both_13+': 0.10
        }
    },
    druid: {
        name: 'Druid',
        primeRequisites: ['wisdom'],
        minRequirements: {
            // Special: Must be 9th level Neutral Cleric
        },
        hitDie: 6,
        maxLevel: 36,
        armor: 'Leather armor only, wooden shields',
        weapons: 'No edged/piercing weapons, no metal weapons',
        specialAbilities: 'Clerical Spells, Druidic Spells, Nature affinity',
        description: 'Neutral spellcaster devoted to nature. Cannot be created at 1st level - must start as Neutral Cleric and become Druid at 9th level.',
        xpBonus: {
            '3-5': -0.20,
            '6-8': -0.10,
            '13-15': 0.05,
            '16-18': 0.10
        },
        creationRestriction: 'Must start as Neutral Cleric, becomes Druid at 9th level'
    },
    mystic: {
        name: 'Mystic',
        primeRequisites: ['strength', 'dexterity'],
        minRequirements: {
            wisdom: 13,
            dexterity: 13
        },
        hitDie: 6,
        maxLevel: 16,
        armor: 'None (AC improves by level, no magical protection items)',
        weapons: 'Any weapons (but higher levels prefer unarmed)',
        specialAbilities: 'Martial Arts (unarmed combat), AC bonus, Multiple attacks, Mystic abilities (Awareness, Heal Self, Mind Block, etc.)',
        description: 'Monastic warrior-monk specializing in unarmed combat. Must donate treasure to needy and tithe 10% to cloister.',
        xpBonus: {
            '3-5': -0.10,
            '6-8': -0.05,
            '13-15': 0.05,
            '16-18': 0.10
        },
        specialRestrictions: [
            'Cannot wear armor or use magical protection items',
            'Must donate all treasure to needy to gain XP',
            'Must tithe 10% to cloister',
            'Oath is sacred - breaking oath causes level loss'
        ]
    }
};

/**
 * Get class data for a specific class
 * @param {string} className - Class identifier (e.g., 'fighter', 'magic_user')
 * @returns {Object} Class data object
 */
function getClassData(className) {
    return BECMI_CLASS_DATA[className] || null;
}

/**
 * Get prime requisites for a class
 * @param {string} className - Class identifier
 * @returns {Array} Array of ability names
 */
function getClassPrimeRequisites(className) {
    const classData = BECMI_CLASS_DATA[className];
    return classData ? classData.primeRequisites : [];
}

/**
 * Get minimum requirements for a class
 * @param {string} className - Class identifier
 * @returns {Object} Object with ability: minScore pairs
 */
function getClassRequirements(className) {
    const classData = BECMI_CLASS_DATA[className];
    return classData ? classData.minRequirements : {};
}

/**
 * Validate if abilities meet class requirements
 * @param {string} className - Class identifier
 * @param {Object} abilities - Character abilities
 * @returns {Object} { valid: boolean, error: string }
 */
function validateClassRequirements(className, abilities) {
    const classData = BECMI_CLASS_DATA[className];
    
    if (!classData) {
        return { valid: false, error: 'Unknown class' };
    }
    
    // Special case: Druid
    if (className === 'druid') {
        return {
            valid: false,
            error: 'Druids must start as Neutral Clerics and become Druids at 9th level'
        };
    }
    
    // Check minimum requirements
    const requirements = classData.minRequirements;
    for (const [ability, minScore] of Object.entries(requirements)) {
        if (!abilities[ability] || abilities[ability] < minScore) {
            const abilityName = ability.charAt(0).toUpperCase() + ability.slice(1);
            return {
                valid: false,
                error: `${abilityName} must be at least ${minScore} to play a ${classData.name}`
            };
        }
    }
    
    return { valid: true, error: null };
}

/**
 * Get hit die for a class
 * @param {string} className - Class identifier
 * @returns {number} Hit die size (4, 6, or 8)
 */
function getClassHitDie(className) {
    const classData = BECMI_CLASS_DATA[className];
    return classData ? classData.hitDie : 6;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BECMI_CLASS_DATA = BECMI_CLASS_DATA;
    window.getClassData = getClassData;
    window.getClassPrimeRequisites = getClassPrimeRequisites;
    window.getClassRequirements = getClassRequirements;
    window.validateClassRequirements = validateClassRequirements;
    window.getClassHitDie = getClassHitDie;
}

