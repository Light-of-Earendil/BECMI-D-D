/**
 * BECMI D&D Character Manager - BECMI Rules Engine (Client-Side)
 * 
 * Client-side implementation of BECMI rule calculations for real-time updates.
 * This mirrors the server-side calculations for immediate UI feedback.
 */

class BECMIRulesEngine {
    constructor() {
        console.log('BECMI Rules Engine initialized');
    }
    
    /**
     * Calculate THAC0 (To Hit Armor Class 0) for a character
     * NOTE: THAC0 is ALWAYS just the base value. Strength and Dex bonuses are separate.
     */
    calculateTHAC0(character) {
        const classType = character.class;
        const level = character.level;
        const strength = character.strength;
        const dexterity = character.dexterity;
        
        // Base THAC0 by class and level - THIS IS THE ONLY THAC0
        const baseTHAC0 = this.getBaseTHAC0(classType, level);
        
        // Strength bonus for melee attacks (separate, not part of THAC0)
        const strengthBonus = this.getStrengthToHitBonus(strength);
        
        // Dexterity bonus for ranged attacks (separate, not part of THAC0)
        const dexterityBonus = this.getDexterityToHitBonus(dexterity);
        
        // Weapon mastery bonus (placeholder for now)
        const masteryBonus = this.getWeaponMasteryBonus(character);
        
        return {
            base: baseTHAC0, // This is THE THAC0 - only one value
            strength_bonus: strengthBonus, // Separate bonus for melee
            dexterity_bonus: dexterityBonus, // Separate bonus for ranged
            mastery_bonus: masteryBonus
        };
    }
    
    /**
     * Get base THAC0 by class and level
     */
    /**
     * Get base THAC0 by class and level (from official BECMI Rules Cyclopedia Attack Rolls Table)
     * Supports levels 1-36 as per the official table
     */
    getBaseTHAC0(classType, level) {
        // Official BECMI Rules Cyclopedia Attack Rolls Table
        // Fighter/Elf/Halfling progression: 1-3, 4-6, 7-9, 10-12, 13-15, 16-18, 19-21, 22-24, 25-27
        // Cleric/Thief/Dwarf progression: 1-4, 5-8, 9-12, 13-16, 17-20, 21-24, 25-28, 29-32, 33-35
        // Magic-User progression: 1-5, 6-10, 11-15, 16-20, 21-25, 26-30, 31-35, 36
        
        const thac0Table = {
            // Fighter: 19, 19, 19, 18, 18, 18, 17, 17, 17, 16, 16, 16, 15, 15, 15, 14, 14, 14, 13, 13, 13, 12, 12, 12, 11, 11, 11, ...
            'fighter': [
                19, 19, 19,  // 1-3
                17, 17, 17,  // 4-6
                15, 15, 15,  // 7-9
                13, 13, 13,  // 10-12
                11, 11, 11,  // 13-15
                9, 9, 9,  // 16-18
                7, 7, 7,  // 19-21
                5, 5, 5,  // 22-24
                3, 3, 3,  // 25-27
                2, 2, 2,  // 28-30
                2, 2, 2,     // 31-33
                1, 1, 1      // 34-36
            ],
            // Cleric: 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 17, 17, 17, 17, 16, 16, 16, 16, 15, 15, 15, 15, 14, 14, 14, 14, 13, 13, 13, 13, 12, 12, 12
            'cleric': [
                19, 19, 19, 19,  // 1-4
                17, 17, 17, 17,  // 5-8
                15, 15, 15, 15,  // 9-12
                13, 13, 13, 13,  // 13-16
                11, 11, 11, 11,  // 17-20
                9, 9, 9, 9,  // 21-24
                7, 7, 7, 7,  // 25-28
                5, 5, 5, 5,  // 29-32
                3, 3, 3,       // 33-35
                2      // 36
            ],
            // Magic-User: 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 17, 17, 17, 17, 17, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 14, 14, 14, 14, 14, 13
            'magic_user': [
                19, 19, 19, 19, 19,  // 1-5
                17, 17, 17, 17, 17,  // 6-10
                15, 15, 15, 15, 15,  // 11-15
                13, 13, 13, 13, 13,  // 16-20
                11, 11, 11, 11, 11,  // 21-25
                9, 9, 9, 9, 9,  // 26-30
                7, 7, 7, 7, 7,  // 31-35
                5                      // 36
            ],
            // Thief: Same as Cleric
            'thief': [
                19, 19, 19, 19,  // 1-4
                17, 17, 17, 17,  // 5-8
                15, 15, 15, 15,  // 9-12
                13, 13, 13, 13,  // 13-16
                11, 11, 11, 11,  // 17-20
                9, 9, 9, 9,  // 21-24
                7, 7, 7, 7,  // 25-28
                5, 5, 5, 5,  // 29-32
                3, 3, 3,       // 33-35
                2      // 36
            ],
            // Dwarf: Same as Fighter
            'dwarf': [
                19, 19, 19,  // 1-3
                17, 17, 17,  // 4-6
                15, 15, 15,  // 7-9
                13, 13, 13,  // 10-12
                11, 11, 11,  // 13-15
                9, 9, 9,  // 16-18
                7, 7, 7,  // 19-21
                5, 5, 5,  // 22-24
                3, 3, 3,  // 25-27
                2, 2, 2,  // 28-30
                2, 2, 2,     // 31-33
                1, 1, 1      // 34-36
            ],
            // Elf: Same as Fighter (up to Name level, then switches)
            'elf': [
                19, 19, 19,  // 1-3
                17, 17, 17,  // 4-6
                15, 15, 15,  // 7-9
                13, 13, 13,  // 10-12
                11, 11, 11,  // 13-15
                9, 9, 9,  // 16-18
                7, 7, 7,  // 19-21
                5, 5, 5,  // 22-24
                3, 3, 3,  // 25-27
                2, 2, 2,  // 28-30
                2, 2, 2,     // 31-33
                1, 1, 1      // 34-36
            ],
            // Halfling: Same as Fighter
            'halfling': [
                19, 19, 19,  // 1-3
                17, 17, 17,  // 4-6
                15, 15, 15,  // 7-9
                13, 13, 13,  // 10-12
                11, 11, 11,  // 13-15
                9, 9, 9,  // 16-18
                7, 7, 7,  // 19-21
                5, 5, 5,  // 22-24
                3, 3, 3,  // 25-27
                2, 2, 2,  // 28-30
                2, 2, 2,     // 31-33
                1, 1, 1      // 34-36
            ],
            // Druid: Same as Cleric
            'druid': [
                19, 19, 19, 19,  // 1-4
                17, 17, 17, 17,  // 5-8
                15, 15, 15, 15,  // 9-12
                13, 13, 13, 13,  // 13-16
                11, 11, 11, 11,  // 17-20
                9, 9, 9, 9,  // 21-24
                7, 7, 7, 7,  // 25-28
                5, 5, 5, 5,  // 29-32
                3, 3, 3,       // 33-35
                2      // 36
            ],
            // Mystic: Same as Fighter (up to level 16)
            'mystic': [
                19, 19, 19, 19, 19,  // 1-5
                17, 17, 17, 17, 17,  // 6-10
                15, 15, 15, 15, 15,  // 11-15
                13, 13, 13, 13, 13,  // 16-20
                11, 11, 11, 11, 11,  // 21-25
                9, 9, 9, 9, 9,  // 26-30
                7, 7, 7, 7, 7,  // 31-35
                5                      // 36
            ],
            'barbarian': [
                19, 19, 18, 17, 16, 15, 14,
                14, 13, 12, 12, 11, 10, 10
            ]
        };
        
        // Cap at the available table length for the selected class.
        const classTable = thac0Table[classType] || [];
        const levelIndex = Math.min(level - 1, classTable.length - 1);
        return thac0Table[classType]?.[levelIndex] ?? 19;
    }
    
    /**
     * Get Strength bonus to hit
     */
    getStrengthToHitBonus(strength) {
        const bonusTable = {
            3: -3, 4: -2, 5: -2, 6: -1, 7: -1, 8: -1, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return bonusTable[strength] || 0;
    }
    
    /**
     * Get Dexterity bonus to hit (ranged attacks)
     */
    getDexterityToHitBonus(dexterity) {
        const bonusTable = {
            3: -3, 4: -2, 5: -2, 6: -1, 7: -1, 8: -1, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return bonusTable[dexterity] || 0;
    }
    
    /**
     * Get weapon mastery bonus (placeholder)
     */
    getWeaponMasteryBonus(character) {
        // This would need to be calculated based on equipped weapon and mastery level
        return 0;
    }
    
    /**
     * Calculate movement rates based on encumbrance (BECMI Chapter 6 rules)
     */
    calculateMovementRates(character) {
        const strength = character.strength;
        const totalWeight = this.calculateTotalWeight(character);
        const overlandByStatus = {
            unencumbered: 24,
            lightly_encumbered: 18,
            heavily_encumbered: 12,
            severely_encumbered: 6,
            overloaded: 3,
            immobile: 0
        };
        let movement;
        
        // BECMI Character Movement Rates and Encumbrance Table (Chapter 6)
        // Encumbrance levels are fixed, not adjusted by strength
        if (totalWeight <= 400) {
            movement = {
                normal: 120,
                encounter: 40,
                running: 120,
                status: 'unencumbered',
                weight: totalWeight,
                limit: 400
            };
        } else if (totalWeight <= 800) {
            movement = {
                normal: 90,
                encounter: 30,
                running: 90,
                status: 'lightly_encumbered',
                weight: totalWeight,
                limit: 800
            };
        } else if (totalWeight <= 1200) {
            movement = {
                normal: 60,
                encounter: 20,
                running: 60,
                status: 'heavily_encumbered',
                weight: totalWeight,
                limit: 1200
            };
        } else if (totalWeight <= 1600) {
            movement = {
                normal: 30,
                encounter: 10,
                running: 30,
                status: 'severely_encumbered',
                weight: totalWeight,
                limit: 1600
            };
        } else if (totalWeight <= 2400) {
            movement = {
                normal: 15,
                encounter: 5,
                running: 15,
                status: 'overloaded',
                weight: totalWeight,
                limit: 2400
            };
        } else {
            movement = {
                normal: 0,
                encounter: 0,
                running: 0,
                status: 'immobile',
                weight: totalWeight,
                limit: 2400
            };
        }

        movement.overland = overlandByStatus[movement.status] || 0;

        if (character.class === 'barbarian') {
            movement = this.applyBarbarianFleetOfFoot(movement, character, totalWeight);
        }

        return movement;
    }

    /**
     * Apply Barbarian Fleet of Foot movement bonuses when armor and load allow it.
     */
    applyBarbarianFleetOfFoot(movement, character, totalWeight) {
        const armorType = this.getEquippedArmorType(character.inventory || []);
        let fleetBonus = 0;

        if (totalWeight <= 1200) {
            if (armorType === null || armorType === 'leather') {
                fleetBonus = 10;
            } else if (armorType === 'chain') {
                fleetBonus = 5;
            }
        }

        if (fleetBonus > 0) {
            movement.normal += fleetBonus;
            movement.running += fleetBonus;
            movement.encounter += Math.floor(fleetBonus / 3);
        }

        if (totalWeight <= 800 && movement.overland > 0 && (armorType === null || armorType === 'leather')) {
            movement.overland = Math.round(movement.overland * 1.25);
        }

        movement.fleet_bonus = fleetBonus;

        return movement;
    }

    /**
     * Return equipped armor type for class feature calculations.
     */
    getEquippedArmorType(inventory) {
        if (!Array.isArray(inventory) || inventory.length === 0) {
            return null;
        }

        for (const item of inventory) {
            const isEquipped = item.is_equipped !== undefined ? Boolean(item.is_equipped) : true;
            const itemType = item.item_type || 'unknown';

            if (!isEquipped || itemType !== 'armor') {
                continue;
            }

            if (item.armor_type) {
                return String(item.armor_type).toLowerCase().trim();
            }

            const name = String(item.name || '').toLowerCase().trim();
            if (name.includes('leather')) return 'leather';
            if (name.includes('chain')) return 'chain';
            if (name.includes('plate') || name.includes('suit')) return 'plate';

            return 'other';
        }

        return null;
    }
    
    /**
     * Calculate total weight of character's inventory
     */
    calculateTotalWeight(character) {
        if (!character.inventory) {
            return 0;
        }
        
        return character.inventory.reduce((total, item) => {
            return total + (item.weight_cn * item.quantity);
        }, 0);
    }
    
    /**
     * Get encumbrance adjustment from Strength
     */
    getEncumbranceAdjustmentFromStrength(strength) {
        const adjustmentTable = {
            3: -200, 4: -150, 5: -100, 6: -50, 7: 0, 8: 0, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 200,
            17: 400, 18: 600
        };
        
        return adjustmentTable[strength] || 0;
    }
    
    /**
     * Calculate saving throws for a character
     */
    calculateSavingThrows(character) {
        const classType = character.class;
        const level = character.level;
        
        // Base saving throws by class and level
        const baseSaves = this.getBaseSavingThrows(classType, level);
        
        // Apply ability score adjustments
        const adjustedSaves = this.applyAbilityScoreAdjustments(baseSaves, character);
        
        return adjustedSaves;
    }
    
    /**
     * Get base saving throws by class and level (from official BECMI Rules Cyclopedia Saving Throws Table)
     * Supports levels 1-36 as per the official table
     */
    getBaseSavingThrows(classType, level) {
        // Helper function to get save value based on level ranges
        const getSaveForLevel = (ranges, level) => {
            for (const [range, value] of Object.entries(ranges)) {
                const [min, max] = range.split('-').map(Number);
                if (level >= min && level <= max) {
                    return value;
                }
            }
            // If level exceeds all ranges, use the last value
            return Object.values(ranges).pop();
        };
        
        // Official BECMI Rules Cyclopedia Saving Throws Table
        const saveTable = {
            'fighter': {
                'death_ray': {'1-3': 12, '4-6': 10, '7-9': 8, '10-12': 6, '13-15': 6, '16-18': 5, '19-21': 5, '22-24': 4, '25-27': 4, '28-30': 3, '31-33': 3, '34-36': 2},
                'magic_wand': {'1-3': 13, '4-6': 11, '7-9': 9, '10-12': 7, '13-15': 6, '16-18': 6, '19-21': 5, '22-24': 5, '25-27': 4, '28-30': 4, '31-33': 3, '34-36': 2},
                'paralysis': {'1-3': 14, '4-6': 12, '7-9': 10, '10-12': 8, '13-15': 7, '16-18': 6, '19-21': 6, '22-24': 5, '25-27': 5, '28-30': 4, '31-33': 3, '34-36': 2},
                'dragon_breath': {'1-3': 15, '4-6': 13, '7-9': 11, '10-12': 9, '13-15': 8, '16-18': 7, '19-21': 6, '22-24': 5, '25-27': 4, '28-30': 3, '31-33': 2, '34-36': 2},
                'spells': {'1-3': 16, '4-6': 14, '7-9': 12, '10-12': 10, '13-15': 9, '16-18': 8, '19-21': 7, '22-24': 6, '25-27': 5, '28-30': 4, '31-33': 3, '34-36': 2}
            },
            'cleric': {
                'death_ray': {'1-4': 11, '5-8': 9, '9-12': 7, '13-16': 6, '17-20': 5, '21-24': 4, '25-28': 3, '29-32': 2, '33-36': 2},
                'magic_wand': {'1-4': 12, '5-8': 10, '9-12': 8, '13-16': 7, '17-20': 6, '21-24': 5, '25-28': 4, '29-32': 3, '33-36': 2},
                'paralysis': {'1-4': 14, '5-8': 12, '9-12': 10, '13-16': 8, '17-20': 6, '21-24': 5, '25-28': 4, '29-32': 3, '33-36': 2},
                'dragon_breath': {'1-4': 16, '5-8': 14, '9-12': 12, '13-16': 10, '17-20': 8, '21-24': 6, '25-28': 4, '29-32': 3, '33-36': 2},
                'spells': {'1-4': 15, '5-8': 13, '9-12': 11, '13-16': 9, '17-20': 7, '21-24': 6, '25-28': 4, '29-32': 3, '33-36': 2}
            },
            'magic_user': {
                'death_ray': {'1-5': 13, '6-10': 11, '11-15': 9, '16-20': 7, '21-24': 5, '25-28': 4, '29-32': 3, '33-36': 2},
                'magic_wand': {'1-5': 14, '6-10': 12, '11-15': 10, '16-20': 8, '21-24': 6, '25-28': 4, '29-32': 3, '33-36': 2},
                'paralysis': {'1-5': 13, '6-10': 11, '11-15': 9, '16-20': 7, '21-24': 5, '25-28': 4, '29-32': 3, '33-36': 2},
                'dragon_breath': {'1-5': 16, '6-10': 14, '11-15': 12, '16-20': 10, '21-24': 8, '25-28': 6, '29-32': 4, '33-36': 2},
                'spells': {'1-5': 15, '6-10': 12, '11-15': 9, '16-20': 6, '21-24': 4, '25-28': 3, '29-32': 2, '33-36': 2}
            },
            'thief': {
                'death_ray': {'1-4': 13, '5-8': 11, '9-12': 9, '13-16': 7, '17-20': 5, '21-24': 4, '25-28': 3, '29-32': 2, '33-36': 2},
                'magic_wand': {'1-4': 14, '5-8': 12, '9-12': 10, '13-16': 8, '17-20': 6, '21-24': 5, '25-28': 4, '29-32': 3, '33-36': 2},
                'paralysis': {'1-4': 13, '5-8': 11, '9-12': 9, '13-16': 7, '17-20': 5, '21-24': 4, '25-28': 3, '29-32': 2, '33-36': 2},
                'dragon_breath': {'1-4': 16, '5-8': 14, '9-12': 12, '13-16': 10, '17-20': 8, '21-24': 6, '25-28': 4, '29-32': 3, '33-36': 2},
                'spells': {'1-4': 15, '5-8': 12, '9-12': 11, '13-16': 9, '17-20': 7, '21-24': 5, '25-28': 3, '29-32': 2, '33-36': 2}
            },
            'dwarf': {
                'death_ray': {'1-3': 8, '4-6': 6, '7-9': 4, '10-12': 2},
                'magic_wand': {'1-3': 9, '4-6': 7, '7-9': 5, '10-12': 3},
                'paralysis': {'1-3': 10, '4-6': 8, '7-9': 6, '10-12': 4},
                'dragon_breath': {'1-3': 13, '4-6': 10, '7-9': 7, '10-12': 4},
                'spells': {'1-3': 12, '4-6': 9, '7-9': 6, '10-12': 3}
            },
            'elf': {
                'death_ray': {'1-3': 12, '4-6': 8, '7-9': 4, '10': 2},
                'magic_wand': {'1-3': 13, '4-6': 10, '7-9': 7, '10': 4},
                'paralysis': {'1-3': 13, '4-6': 10, '7-9': 7, '10': 4},
                'dragon_breath': {'1-3': 15, '4-6': 11, '7-9': 7, '10': 3},
                'spells': {'1-3': 15, '4-6': 11, '7-9': 7, '10': 3}
            },
            'halfling': {
                'death_ray': {'1-3': 8, '4-6': 5, '7-8': 2},
                'magic_wand': {'1-3': 9, '4-6': 6, '7-8': 3},
                'paralysis': {'1-3': 10, '4-6': 7, '7-8': 4},
                'dragon_breath': {'1-3': 13, '4-6': 9, '7-8': 5},
                'spells': {'1-3': 12, '4-6': 8, '7-8': 4}
            },
            'druid': {
                'death_ray': {'1-4': 11, '5-8': 9, '9-12': 7, '13-16': 6, '17-20': 5, '21-24': 4, '25-28': 3, '29-32': 2, '33-36': 2},
                'magic_wand': {'1-4': 12, '5-8': 10, '9-12': 8, '13-16': 7, '17-20': 6, '21-24': 5, '25-28': 4, '29-32': 3, '33-36': 2},
                'paralysis': {'1-4': 14, '5-8': 12, '9-12': 10, '13-16': 8, '17-20': 6, '21-24': 5, '25-28': 4, '29-32': 3, '33-36': 2},
                'dragon_breath': {'1-4': 16, '5-8': 14, '9-12': 12, '13-16': 10, '17-20': 8, '21-24': 6, '25-28': 4, '29-32': 3, '33-36': 2},
                'spells': {'1-4': 15, '5-8': 13, '9-12': 11, '13-16': 9, '17-20': 7, '21-24': 6, '25-28': 4, '29-32': 3, '33-36': 2}
            },
            'mystic': {
                'death_ray': {'1-3': 12, '4-6': 10, '7-9': 8, '10-12': 6, '13-15': 6, '16-18': 5, '19-21': 5, '22-24': 4, '25-27': 4, '28-30': 3, '31-33': 3, '34-36': 2},
                'magic_wand': {'1-3': 13, '4-6': 11, '7-9': 9, '10-12': 7, '13-15': 6, '16-18': 6, '19-21': 5, '22-24': 5, '25-27': 4, '28-30': 4, '31-33': 3, '34-36': 2},
                'paralysis': {'1-3': 14, '4-6': 12, '7-9': 10, '10-12': 8, '13-15': 7, '16-18': 6, '19-21': 6, '22-24': 5, '25-27': 5, '28-30': 4, '31-33': 3, '34-36': 2},
                'dragon_breath': {'1-3': 15, '4-6': 13, '7-9': 11, '10-12': 9, '13-15': 8, '16-18': 7, '19-21': 6, '22-24': 5, '25-27': 4, '28-30': 3, '31-33': 2, '34-36': 2},
                'spells': {'1-3': 16, '4-6': 14, '7-9': 12, '10-12': 10, '13-15': 9, '16-18': 8, '19-21': 7, '22-24': 6, '25-27': 5, '28-30': 4, '31-33': 3, '34-36': 2}
            },
            'barbarian': {
                'death_ray': {'1-3': 12, '4-6': 10, '7-9': 8, '10-12': 6, '13-14': 4},
                'magic_wand': {'1-3': 13, '4-6': 11, '7-9': 9, '10-12': 7, '13-14': 5},
                'paralysis': {'1-3': 14, '4-6': 12, '7-9': 10, '10-12': 8, '13-14': 6},
                'dragon_breath': {'1-3': 15, '4-6': 13, '7-9': 10, '10-12': 8, '13-14': 5},
                'spells': {'1-3': 16, '4-6': 14, '7-9': 12, '10-12': 10, '13-14': 8}
            }
        };
        
        // Cap at level 36 (max in official table)
        level = Math.min(level, 36);
        
        if (!saveTable[classType]) {
            return {
                death_ray: 20,
                magic_wand: 20,
                paralysis: 20,
                dragon_breath: 20,
                spells: 20
            };
        }
        
        return {
            death_ray: getSaveForLevel(saveTable[classType].death_ray, level),
            magic_wand: getSaveForLevel(saveTable[classType].magic_wand, level),
            paralysis: getSaveForLevel(saveTable[classType].paralysis, level),
            dragon_breath: getSaveForLevel(saveTable[classType].dragon_breath, level),
            spells: getSaveForLevel(saveTable[classType].spells, level)
        };
    }
    
    /**
     * Apply ability score adjustments to saving throws
     */
    applyAbilityScoreAdjustments(baseSaves, character) {
        const adjustedSaves = { ...baseSaves };
        
        // In BECMI, Constitution does NOT affect saving throws - only HP
        // Only Wisdom affects spells save (Rod/Staff/Spell)
        const wisBonus = this.getWisdomBonus(character.wisdom);
        adjustedSaves.spells -= wisBonus;
        
        return adjustedSaves;
    }
    
    /**
     * Get Constitution bonus
     */
    getConstitutionBonus(constitution) {
        const bonusTable = {
            3: -2, 4: -1, 5: -1, 6: 0, 7: 0, 8: 0, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return bonusTable[constitution] || 0;
    }
    
    /**
     * Get Wisdom bonus
     */
    getWisdomBonus(wisdom) {
        const bonusTable = {
            3: -2, 4: -1, 5: -1, 6: 0, 7: 0, 8: 0, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return bonusTable[wisdom] || 0;
    }
    
    /**
     * Calculate hit points for a character
     */
    calculateHitPoints(character) {
        const classType = character.class;
        const level = character.level;
        const constitution = character.constitution;
        
        // Hit dice by class
        const hitDice = {
            'fighter': 8, 'cleric': 6, 'magic_user': 4, 'thief': 4,
            'dwarf': 8, 'elf': 6, 'halfling': 6, 'druid': 6,
            'mystic': 6, 'barbarian': 8
        };
        
        const hitDie = hitDice[classType] || 6;
        
        // Constitution bonus/penalty
        const conBonus = this.getConstitutionBonus(constitution);
        
        // Calculate base hit points
        let baseHP = hitDie + conBonus; // First level
        
        // Add hit points for additional levels
        for (let i = 2; i <= level; i++) {
            if (classType === 'barbarian' && i > 9) {
                baseHP += 3;
                continue;
            }

            baseHP += Math.max(1, hitDie + conBonus);
        }
        
        return Math.max(1, baseHP); // Minimum 1 HP
    }
    
    /**
     * Calculate armor class according to BECMI rules
     * BECMI uses descending AC where lower is better
     */
    calculateArmorClass(character, inventory = null) {
        // Dexterity bonus/penalty (subtract from AC, lower is better)
        const dexBonus = this.getDexterityBonus(character.dexterity);
        
        // Start with base AC (no armor)
        let baseAC = 9;
        
        // Check for equipped armor - ARMOR REPLACES the base AC
        if (inventory || character.inventory) {
            const inv = inventory || character.inventory;
            const equippedArmor = inv.find(item => 
                item.is_equipped && item.item_type === 'armor');
            if (equippedArmor) {
                // BECMI armor AC values (lower is better) - ARMOR REPLACES base AC
                const armorACTable = {
                    'leather armor': 7,
                    'leather armour': 7,
                    'scale armor': 6,
                    'scale armour': 6,
                    'chain mail': 5,
                    'banded armor': 4,
                    'banded armour': 4,
                    'plate mail': 3,
                    'plate armour': 3,
                    'plate armor': 3,
                    'suit armor': 0,
                    'suit armour': 0
                };
                
                const armorName = equippedArmor.name.toLowerCase().trim();
                baseAC = armorACTable[armorName] || 9; // ARMOR REPLACES base AC
                
                // Add magical bonus if applicable
                if (equippedArmor.magical_bonus && equippedArmor.magical_bonus > 0) {
                    baseAC -= equippedArmor.magical_bonus; // Subtract magical bonus (lower AC is better)
                }
            }
        }
        
        // Shield bonus (subtract from AC, lower is better)  
        let shieldBonus = 0;
        if (inventory || character.inventory) {
            const inv = inventory || character.inventory;
            const equippedShield = inv.find(item => 
                item.is_equipped && item.item_type === 'shield');
            if (equippedShield) {
                shieldBonus = 1; // Standard shield gives -1 AC (better)
                
                // Add magical bonus if applicable
                if (equippedShield.magical_bonus && equippedShield.magical_bonus > 0) {
                    shieldBonus += equippedShield.magical_bonus; // Add magical bonus (lower AC is better)
                }
            }
        }
        
        return baseAC - dexBonus - shieldBonus;
    }
    
    /**
     * Get Dexterity bonus to AC
     */
    getDexterityBonus(dexterity) {
        const bonusTable = {
            3: -3, 4: -2, 5: -2, 6: -1, 7: -1, 8: -1, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return bonusTable[dexterity] || 0;
    }
    
    /**
     * Get ability score modifier
     */
    getAbilityModifier(score) {
        const modifierTable = {
            3: -3, 4: -2, 5: -2, 6: -1, 7: -1, 8: -1, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return modifierTable[score] || 0;
    }
    
    /**
     * Calculate experience points needed for next level
     */
    getExperienceForNextLevel(classType, currentLevel) {
        const xpTable = {
            'fighter': [0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 750000, 1000000, 1250000, 1500000, 1750000, 2000000, 2250000, 2500000, 2750000, 3000000],
            'cleric': [0, 1500, 3000, 6000, 12000, 24000, 48000, 96000, 192000, 384000, 576000, 768000, 960000, 1152000, 1344000, 1536000, 1728000, 1920000, 2112000, 2304000],
            'magic_user': [0, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 960000, 1280000, 1600000, 1920000, 2240000, 2560000, 2880000, 3200000, 3520000, 3840000],
            'thief': [0, 1200, 2400, 4800, 9600, 19200, 38400, 76800, 153600, 307200, 460800, 614400, 768000, 921600, 1075200, 1228800, 1382400, 1536000, 1689600, 1843200],
            'dwarf': [0, 2200, 4400, 8800, 17600, 35200, 70400, 140800, 281600, 563200, 844800, 1126400, 1408000, 1689600, 1971200, 2252800, 2534400, 2816000, 3097600, 3379200],
            'elf': [0, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 1024000, 1536000, 2048000, 2560000, 3072000, 3584000, 4096000, 4608000, 5120000, 5632000, 6144000],
            'halfling': [0, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 768000, 1024000, 1280000, 1536000, 1788000, 2048000, 2304000, 2560000, 2816000, 3072000],
            'barbarian': [0, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 250000, 370000, 490000, 610000, 730000, 850000]
        };
        
        if (currentLevel >= this.getMaxLevelForClass(classType)) {
            return null; // Max level reached
        }
        
        return xpTable[classType]?.[currentLevel] || null;
    }

    /**
     * Get maximum supported class level.
     */
    getMaxLevelForClass(classType) {
        const maxLevels = {
            fighter: 36,
            dwarf: 12,
            elf: 10,
            halfling: 8,
            cleric: 36,
            magic_user: 36,
            thief: 36,
            druid: 36,
            mystic: 36,
            barbarian: 14
        };

        return maxLevels[classType] || 20;
    }
    
    /**
     * Get class prime requisites
     * 
     * @param {string} classType - Character class
     * @returns {Array<string>} Array of prime requisite ability names
     */
    getClassPrimeRequisites(classType) {
        const primeRequisites = {
            'fighter': ['strength'],
            'cleric': ['wisdom'],
            'magic_user': ['intelligence'],
            'thief': ['dexterity'],
            'dwarf': ['strength'],
            'elf': ['strength', 'intelligence'],
            'halfling': ['strength', 'dexterity'],
            'druid': ['wisdom'],
            'mystic': ['strength', 'dexterity'],
            'barbarian': ['strength']
        };
        
        return primeRequisites[classType] || [];
    }
    
    /**
     * Calculate experience bonus from prime requisite
     * Rules Cyclopedia Chapter 1, page 1061-1103
     * 
     * @param {string} classType - Character class
     * @param {Object} abilities - Character abilities
     * @returns {number} XP multiplier (0.8, 0.9, 1.0, 1.05, or 1.10)
     */
    getExperienceBonus(classType, abilities) {
        const primeReqs = this.getClassPrimeRequisites(classType);

        if (classType === 'barbarian') {
            const strength = abilities.strength || 10;
            if (strength >= 16) return 1.10;
            if (strength >= 13) return 1.05;
            return 1.0;
        }
        
        // Special handling for classes with two prime requisites
        if (primeReqs.length === 2) {
            const req1 = abilities[primeReqs[0]] || 10;
            const req2 = abilities[primeReqs[1]] || 10;
            
            // Elf: Str 13-18 AND Int 13-15: +5%, Str 13-18 AND Int 16-18: +10%
            if (classType === 'elf') {
                if (req1 >= 13 && req1 <= 18 && req2 >= 13 && req2 <= 18) {
                    if (req2 >= 16) {
                        return 1.10; // +10% (Int 16-18)
                    }
                    return 1.05; // +5% (Int 13-15)
                }
                return 1.0; // No bonus
            }
            
            // Halfling: Str 13-18 OR Dex 13-18: +5%, Str 13-18 AND Dex 13-18: +10%
            if (classType === 'halfling') {
                const str13to18 = (req1 >= 13 && req1 <= 18);
                const dex13to18 = (req2 >= 13 && req2 <= 18);
                
                if (str13to18 && dex13to18) {
                    return 1.10; // +10% (both 13-18)
                }
                if (str13to18 || dex13to18) {
                    return 1.05; // +5% (one 13-18)
                }
                return 1.0; // No bonus
            }
            
            // Mystic: Str 3-5: -10%, Str 6-8: -5%, Str 13-15: +5%, Str 16-18: +10%
            // (Uses Strength as primary, but has both Str and Dex as requisites)
            if (classType === 'mystic') {
                const str = req1; // Assuming first is strength
                if (str >= 16) return 1.10; // +10%
                if (str >= 13) return 1.05; // +5%
                if (str <= 5) return 0.90; // -10%
                if (str <= 8) return 0.95; // -5%
                return 1.0; // No bonus
            }
            
            // Default for other dual-requisite classes: both must meet threshold
            if (req1 >= 13 && req2 >= 13) {
                if (req1 >= 16 && req2 >= 16) {
                    return 1.10; // +10%
                }
                return 1.05; // +5%
            }
            
            // Penalties for low scores (use lowest)
            const lowest = Math.min(req1, req2);
            if (lowest <= 5) return 0.80; // -20%
            if (lowest <= 8) return 0.90; // -10%
            
            return 1.0; // No bonus
        }
        
        // Single prime requisite
        const primeValue = abilities[primeReqs[0]] || 10;
        
        if (primeValue >= 16) return 1.10; // +10%
        if (primeValue >= 13) return 1.05; // +5%
        if (primeValue <= 5) return 0.80; // -20%
        if (primeValue <= 8) return 0.90; // -10%
        
        return 1.0; // No bonus or penalty
    }

    /**
     * Return fixed HP gain for classes that stop rolling hit dice after name level.
     */
    getFixedHitPointGainForLevel(classType, newLevel) {
        if (classType === 'barbarian' && Number(newLevel) > 9) {
            return 3;
        }

        return null;
    }

    /**
     * Get Barbarian Rage progression for a level.
     */
    getBarbarianRageStats(level) {
        const safeLevel = Math.max(1, Math.min(14, Number(level) || 1));
        let usesPerDay = 1;

        if (safeLevel >= 12) {
            usesPerDay = 4;
        } else if (safeLevel >= 8) {
            usesPerDay = 3;
        } else if (safeLevel >= 4) {
            usesPerDay = 2;
        }

        return {
            uses_per_day: usesPerDay,
            duration_rounds: Math.max(3, safeLevel),
            temporary_hp: safeLevel,
            attack_bonus: 2,
            damage_bonus: 2,
            save_bonus_death_poison_breath: 2,
            ac_penalty: 2,
            cooldown_turns: 1
        };
    }

    /**
     * Get Barbarian Wilderness Mastery values for a level.
     */
    getBarbarianWildernessMastery(level) {
        const safeLevel = Math.max(1, Math.min(14, Number(level) || 1));
        const table = {
            1: { track_percent: 25, forage: '1-2', hunt: '1-2', navigate: '1-3', hide_percent: 10 },
            2: { track_percent: 30, forage: '1-3', hunt: '1-2', navigate: '1-3', hide_percent: 15 },
            3: { track_percent: 35, forage: '1-3', hunt: '1-3', navigate: '1-4', hide_percent: 20 },
            4: { track_percent: 40, forage: '1-4', hunt: '1-3', navigate: '1-4', hide_percent: 25 },
            5: { track_percent: 45, forage: '1-4', hunt: '1-4', navigate: '1-4', hide_percent: 30 },
            6: { track_percent: 50, forage: '1-5', hunt: '1-4', navigate: '1-5', hide_percent: 35 },
            7: { track_percent: 55, forage: '1-5', hunt: '1-5', navigate: '1-5', hide_percent: 40 },
            8: { track_percent: 60, forage: '1-5', hunt: '1-5', navigate: '1-5', hide_percent: 45 },
            9: { track_percent: 65, forage: '1-6', hunt: '1-5', navigate: '1-6', hide_percent: 50 },
            10: { track_percent: 70, forage: '1-6', hunt: '1-6', navigate: '1-6', hide_percent: 55 },
            11: { track_percent: 75, forage: '1-6', hunt: '1-6', navigate: '1-6', hide_percent: 60 },
            12: { track_percent: 80, forage: '1-6', hunt: '1-6', navigate: '1-6', hide_percent: 65 },
            13: { track_percent: 85, forage: '1-6', hunt: '1-6', navigate: '1-6', hide_percent: 70 },
            14: { track_percent: 90, forage: '1-6', hunt: '1-6', navigate: '1-6', hide_percent: 75 }
        };

        return table[safeLevel];
    }
    
    /**
     * Recalculate all character statistics
     */
    recalculateAllStats(character) {
        return {
            max_hp: this.calculateHitPoints(character),
            thac0: this.calculateTHAC0(character),
            movement: this.calculateMovementRates(character),
            saving_throws: this.calculateSavingThrows(character),
            armor_class: this.calculateArmorClass(character),
            xp_for_next_level: this.getExperienceForNextLevel(character.class, character.level)
        };
    }
}

// Export to window for use in app.js
window.BECMIRulesEngine = BECMIRulesEngine;
