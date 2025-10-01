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
     */
    calculateTHAC0(character) {
        const classType = character.class;
        const level = character.level;
        const strength = character.strength;
        const dexterity = character.dexterity;
        
        // Base THAC0 by class and level
        const baseTHAC0 = this.getBaseTHAC0(classType, level);
        
        // Strength bonus for melee attacks
        const strengthBonus = this.getStrengthToHitBonus(strength);
        
        // Dexterity bonus for ranged attacks
        const dexterityBonus = this.getDexterityToHitBonus(dexterity);
        
        // Weapon mastery bonus (placeholder for now)
        const masteryBonus = this.getWeaponMasteryBonus(character);
        
        return {
            melee: baseTHAC0 - strengthBonus - masteryBonus,
            ranged: baseTHAC0 - dexterityBonus - masteryBonus,
            base: baseTHAC0,
            strength_bonus: strengthBonus,
            dexterity_bonus: dexterityBonus,
            mastery_bonus: masteryBonus
        };
    }
    
    /**
     * Get base THAC0 by class and level
     */
    getBaseTHAC0(classType, level) {
        const thac0Table = {
            'fighter': [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
            'cleric': [20, 20, 20, 19, 19, 19, 18, 18, 18, 17, 17, 17, 16, 16, 16, 15, 15, 15, 14, 14],
            'magic_user': [20, 20, 20, 20, 20, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 17, 17, 17, 17, 17],
            'thief': [20, 20, 19, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11],
            'dwarf': [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
            'elf': [20, 20, 19, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11],
            'halfling': [20, 20, 19, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11]
        };
        
        const levelIndex = Math.min(level - 1, 19); // Cap at level 20
        return thac0Table[classType][levelIndex] || 20;
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
     * Calculate movement rates based on encumbrance
     */
    calculateMovementRates(character) {
        const strength = character.strength;
        const totalWeight = this.calculateTotalWeight(character);
        
        // Strength adjustment to encumbrance limits
        const strengthAdjustment = this.getEncumbranceAdjustmentFromStrength(strength);
        
        // Adjusted encumbrance levels
        const unencumberedLimit = 400 + strengthAdjustment;
        const lightlyEncumberedLimit = 800 + strengthAdjustment;
        const heavilyEncumberedLimit = 1200 + strengthAdjustment;
        const severelyEncumberedLimit = 1600 + strengthAdjustment;
        
        if (totalWeight <= unencumberedLimit) {
            return {
                normal: 120,
                encounter: 40,
                status: 'unencumbered',
                weight: totalWeight,
                limit: unencumberedLimit
            };
        } else if (totalWeight <= lightlyEncumberedLimit) {
            return {
                normal: 90,
                encounter: 30,
                status: 'lightly_encumbered',
                weight: totalWeight,
                limit: lightlyEncumberedLimit
            };
        } else if (totalWeight <= heavilyEncumberedLimit) {
            return {
                normal: 60,
                encounter: 20,
                status: 'heavily_encumbered',
                weight: totalWeight,
                limit: heavilyEncumberedLimit
            };
        } else if (totalWeight <= severelyEncumberedLimit) {
            return {
                normal: 30,
                encounter: 10,
                status: 'severely_encumbered',
                weight: totalWeight,
                limit: severelyEncumberedLimit
            };
        } else {
            return {
                normal: 15,
                encounter: 5,
                status: 'overloaded',
                weight: totalWeight,
                limit: severelyEncumberedLimit
            };
        }
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
     * Get base saving throws by class and level
     */
    getBaseSavingThrows(classType, level) {
        const saveTable = {
            'fighter': {
                'death_ray': [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis': [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath': [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1],
                'spells': [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1]
            },
            'cleric': {
                'death_ray': [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand': [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis': [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath': [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1],
                'spells': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1]
            },
            'magic_user': {
                'death_ray': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand': [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'paralysis': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath': [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1],
                'spells': [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            },
            'thief': {
                'death_ray': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand': [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'paralysis': [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath': [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1],
                'spells': [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1]
            },
            'dwarf': {
                'death_ray': [8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand': [9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis': [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'spells': [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            },
            'elf': {
                'death_ray': [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath': [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1],
                'spells': [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            },
            'halfling': {
                'death_ray': [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand': [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis': [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath': [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1],
                'spells': [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1]
            }
        };
        
        const levelIndex = Math.min(level - 1, 19); // Cap at level 20
        
        return {
            'death_ray': saveTable[classType]['death_ray'][levelIndex] || 20,
            'magic_wand': saveTable[classType]['magic_wand'][levelIndex] || 20,
            'paralysis': saveTable[classType]['paralysis'][levelIndex] || 20,
            'dragon_breath': saveTable[classType]['dragon_breath'][levelIndex] || 20,
            'spells': saveTable[classType]['spells'][levelIndex] || 20
        };
    }
    
    /**
     * Apply ability score adjustments to saving throws
     */
    applyAbilityScoreAdjustments(baseSaves, character) {
        const adjustedSaves = { ...baseSaves };
        
        // Constitution bonus to all saves
        const conBonus = this.getConstitutionBonus(character.constitution);
        Object.keys(adjustedSaves).forEach(key => {
            adjustedSaves[key] -= conBonus;
        });
        
        // Wisdom bonus to spells save
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
            'dwarf': 8, 'elf': 6, 'halfling': 6
        };
        
        const hitDie = hitDice[classType] || 6;
        
        // Constitution bonus/penalty
        const conBonus = this.getConstitutionBonus(constitution);
        
        // Calculate base hit points
        let baseHP = hitDie + conBonus; // First level
        
        // Add hit points for additional levels
        for (let i = 2; i <= level; i++) {
            baseHP += Math.max(1, hitDie + conBonus);
        }
        
        return Math.max(1, baseHP); // Minimum 1 HP
    }
    
    /**
     * Calculate armor class
     */
    calculateArmorClass(character) {
        let baseAC = 10;
        
        // Dexterity bonus/penalty
        const dexBonus = this.getDexterityBonus(character.dexterity);
        
        // Armor bonus (would need to check equipped armor)
        let armorBonus = 0;
        if (character.inventory) {
            const equippedArmor = character.inventory.find(item => 
                item.is_equipped && item.item_type === 'armor');
            if (equippedArmor) {
                armorBonus = equippedArmor.ac_bonus || 0;
            }
        }
        
        // Shield bonus (would need to check equipped shield)
        let shieldBonus = 0;
        if (character.inventory) {
            const equippedShield = character.inventory.find(item => 
                item.is_equipped && item.item_type === 'shield');
            if (equippedShield) {
                shieldBonus = equippedShield.ac_bonus || 0;
            }
        }
        
        return baseAC + dexBonus + armorBonus + shieldBonus;
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
            'halfling': [0, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 768000, 1024000, 1280000, 1536000, 1788000, 2048000, 2304000, 2560000, 2816000, 3072000]
        };
        
        if (currentLevel >= 20) {
            return null; // Max level reached
        }
        
        return xpTable[classType][currentLevel] || null;
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
window.RulesEngine = BECMIRulesEngine;