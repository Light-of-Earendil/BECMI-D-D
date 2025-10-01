/**
 * BECMI D&D Character Manager - Calculations Module
 * 
 * Additional calculation utilities and helper functions for BECMI rules.
 */

class BECMICalculations {
    constructor() {
        console.log('BECMI Calculations Module initialized');
    }
    
    /**
     * Calculate ability score modifiers
     */
    static getAbilityModifier(score) {
        const modifierTable = {
            3: -3, 4: -2, 5: -2, 6: -1, 7: -1, 8: -1, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return modifierTable[score] || 0;
    }
    
    /**
     * Calculate damage bonus from Strength
     */
    static getStrengthDamageBonus(strength) {
        const bonusTable = {
            3: -1, 4: -1, 5: -1, 6: 0, 7: 0, 8: 0, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return bonusTable[strength] || 0;
    }
    
    /**
     * Calculate initiative bonus from Dexterity
     */
    static getInitiativeBonus(dexterity) {
        const bonusTable = {
            3: -2, 4: -1, 5: -1, 6: -1, 7: 0, 8: 0, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        
        return bonusTable[dexterity] || 0;
    }
    
    /**
     * Calculate spell failure chance for armor
     */
    static getSpellFailureChance(armorType) {
        const failureTable = {
            'none': 0,
            'leather': 10,
            'chain': 30,
            'plate': 50,
            'shield': 5
        };
        
        return failureTable[armorType] || 0;
    }
    
    /**
     * Calculate encumbrance penalty to AC
     */
    static getEncumbranceACPenalty(encumbranceStatus) {
        const penaltyTable = {
            'unencumbered': 0,
            'lightly_encumbered': 0,
            'heavily_encumbered': 1,
            'severely_encumbered': 2,
            'overloaded': 3
        };
        
        return penaltyTable[encumbranceStatus] || 0;
    }
    
    /**
     * Calculate weapon speed factor
     */
    static getWeaponSpeedFactor(weaponType) {
        const speedTable = {
            'dagger': 2,
            'short_sword': 3,
            'long_sword': 5,
            'battle_axe': 7,
            'mace': 7,
            'spear': 6,
            'short_bow': 7,
            'crossbow': 8
        };
        
        return speedTable[weaponType] || 5;
    }
    
    /**
     * Calculate spell range
     */
    static getSpellRange(spellLevel, casterLevel) {
        // Base range calculation for BECMI
        const baseRange = 10 + (spellLevel * 10);
        const levelBonus = Math.floor(casterLevel / 3) * 10;
        
        return baseRange + levelBonus;
    }
    
    /**
     * Calculate spell duration
     */
    static getSpellDuration(spellLevel, casterLevel) {
        // Base duration calculation for BECMI
        const baseDuration = spellLevel * 10; // in rounds
        const levelBonus = Math.floor(casterLevel / 2) * 10;
        
        return baseDuration + levelBonus;
    }
    
    /**
     * Calculate thief skill percentages
     */
    static getThiefSkillPercentages(level, dexterity) {
        const dexBonus = Math.floor((dexterity - 10) / 2);
        
        return {
            'open_locks': Math.min(99, 10 + (level * 5) + dexBonus),
            'find_traps': Math.min(99, 5 + (level * 5) + dexBonus),
            'remove_traps': Math.min(99, 5 + (level * 5) + dexBonus),
            'pick_pockets': Math.min(99, 15 + (level * 5) + dexBonus),
            'move_silently': Math.min(99, 10 + (level * 5) + dexBonus),
            'hide_in_shadows': Math.min(99, 5 + (level * 5) + dexBonus),
            'hear_noise': Math.min(99, 10 + (level * 5) + dexBonus),
            'climb_walls': Math.min(99, 85 + (level * 1))
        };
    }
    
    /**
     * Calculate cleric turning undead
     */
    static getClericTurning(level, wisdom) {
        const wisBonus = Math.floor((wisdom - 10) / 2);
        const effectiveLevel = level + wisBonus;
        
        const turningTable = {
            1: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': '-', 'wraith': '-', 'mummy': '-', 'spectre': '-', 'vampire': '-', 'ghost': '-', 'demon': '-'},
            2: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': 'T', 'wraith': '-', 'mummy': '-', 'spectre': '-', 'vampire': '-', 'ghost': '-', 'demon': '-'},
            3: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': 'T', 'wraith': 'T', 'mummy': '-', 'spectre': '-', 'vampire': '-', 'ghost': '-', 'demon': '-'},
            4: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': 'T', 'wraith': 'T', 'mummy': 'T', 'spectre': '-', 'vampire': '-', 'ghost': '-', 'demon': '-'},
            5: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': 'T', 'wraith': 'T', 'mummy': 'T', 'spectre': 'T', 'vampire': '-', 'ghost': '-', 'demon': '-'},
            6: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': 'T', 'wraith': 'T', 'mummy': 'T', 'spectre': 'T', 'vampire': 'T', 'ghost': '-', 'demon': '-'},
            7: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': 'T', 'wraith': 'T', 'mummy': 'T', 'spectre': 'T', 'vampire': 'T', 'ghost': 'T', 'demon': '-'},
            8: { 'skeleton': 'T', 'zombie': 'T', 'ghoul': 'T', 'wight': 'T', 'wraith': 'T', 'mummy': 'T', 'spectre': 'T', 'vampire': 'T', 'ghost': 'T', 'demon': 'T'}
        };
        
        return turningTable[Math.min(effectiveLevel, 8)] || turningTable[1];
    }
    
    /**
     * Calculate magic-user spell progression
     */
    static getMagicUserSpellProgression(level) {
        const spellTable = {
            1: [1, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1: 1 first-level spell
            2: [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2: 2 first-level spells
            3: [2, 1, 0, 0, 0, 0, 0, 0, 0], // Level 3: 2 first, 1 second
            4: [2, 2, 0, 0, 0, 0, 0, 0, 0], // Level 4: 2 first, 2 second
            5: [2, 2, 1, 0, 0, 0, 0, 0, 0], // Level 5: 2 first, 2 second, 1 third
            6: [3, 2, 2, 0, 0, 0, 0, 0, 0], // Level 6: 3 first, 2 second, 2 third
            7: [3, 3, 2, 1, 0, 0, 0, 0, 0], // Level 7: 3 first, 3 second, 2 third, 1 fourth
            8: [3, 3, 3, 2, 0, 0, 0, 0, 0], // Level 8: 3 first, 3 second, 3 third, 2 fourth
            9: [4, 3, 3, 2, 1, 0, 0, 0, 0], // Level 9: 4 first, 3 second, 3 third, 2 fourth, 1 fifth
            10: [4, 4, 3, 3, 2, 0, 0, 0, 0] // Level 10: 4 first, 4 second, 3 third, 3 fourth, 2 fifth
        };
        
        return spellTable[Math.min(level, 10)] || spellTable[1];
    }
    
    /**
     * Calculate cleric spell progression
     */
    static getClericSpellProgression(level) {
        const spellTable = {
            1: [0, 0, 0, 0, 0, 0, 0], // Level 1: No spells
            2: [1, 0, 0, 0, 0, 0, 0], // Level 2: 1 first-level spell
            3: [2, 0, 0, 0, 0, 0, 0], // Level 3: 2 first-level spells
            4: [2, 1, 0, 0, 0, 0, 0], // Level 4: 2 first, 1 second
            5: [2, 2, 0, 0, 0, 0, 0], // Level 5: 2 first, 2 second
            6: [2, 2, 1, 0, 0, 0, 0], // Level 6: 2 first, 2 second, 1 third
            7: [3, 2, 2, 0, 0, 0, 0], // Level 7: 3 first, 2 second, 2 third
            8: [3, 3, 2, 1, 0, 0, 0], // Level 8: 3 first, 3 second, 2 third, 1 fourth
            9: [3, 3, 3, 2, 0, 0, 0], // Level 9: 3 first, 3 second, 3 third, 2 fourth
            10: [4, 3, 3, 2, 1, 0, 0] // Level 10: 4 first, 3 second, 3 third, 2 fourth, 1 fifth
        };
        
        return spellTable[Math.min(level, 10)] || spellTable[1];
    }
    
    /**
     * Calculate weapon mastery bonuses
     */
    static getWeaponMasteryBonus(masteryRank, weaponType) {
        const masteryTable = {
            'basic': { 'to_hit': 0, 'damage': 0, 'speed': 0 },
            'skilled': { 'to_hit': 1, 'damage': 1, 'speed': -1 },
            'expert': { 'to_hit': 2, 'damage': 2, 'speed': -2 },
            'master': { 'to_hit': 3, 'damage': 3, 'speed': -3 },
            'grand_master': { 'to_hit': 4, 'damage': 4, 'speed': -4 }
        };
        
        return masteryTable[masteryRank] || masteryTable['basic'];
    }
    
    /**
     * Calculate general skill success chance
     */
    static getGeneralSkillSuccess(skillLevel, abilityModifier, difficulty = 0) {
        const baseChance = 10 + (skillLevel * 5) + abilityModifier + difficulty;
        return Math.max(5, Math.min(95, baseChance));
    }
    
    /**
     * Calculate morale for NPCs
     */
    static getNPCMorale(alignment, charisma, situation = 'normal') {
        let baseMorale = 7; // Neutral base
        
        if (alignment === 'lawful') baseMorale = 8;
        if (alignment === 'chaotic') baseMorale = 6;
        
        const chaModifier = Math.floor((charisma - 10) / 2);
        baseMorale += chaModifier;
        
        // Situation modifiers
        const situationModifiers = {
            'normal': 0,
            'advantage': 2,
            'disadvantage': -2,
            'desperate': -4,
            'victorious': 4
        };
        
        baseMorale += situationModifiers[situation] || 0;
        
        return Math.max(2, Math.min(12, baseMorale));
    }
    
    /**
     * Calculate reaction roll modifier
     */
    static getReactionModifier(charisma, situation = 'neutral') {
        const chaModifier = Math.floor((charisma - 10) / 2);
        
        const situationModifiers = {
            'neutral': 0,
            'friendly': 2,
            'hostile': -2,
            'desperate': -1,
            'confident': 1
        };
        
        return chaModifier + (situationModifiers[situation] || 0);
    }
    
    /**
     * Calculate henchman loyalty
     */
    static getHenchmanLoyalty(charisma, treatment = 'fair') {
        const chaModifier = Math.floor((charisma - 10) / 2);
        
        const treatmentModifiers = {
            'poor': -4,
            'fair': 0,
            'good': 2,
            'excellent': 4
        };
        
        return 7 + chaModifier + (treatmentModifiers[treatment] || 0);
    }
    
    /**
     * Calculate hireling cost
     */
    static getHirelingCost(level, charisma, duration = 'daily') {
        const baseCost = level * 10; // Base cost per level
        const chaModifier = Math.floor((charisma - 10) / 2);
        
        const durationMultipliers = {
            'daily': 1,
            'weekly': 5,
            'monthly': 20
        };
        
        const cost = (baseCost - chaModifier) * (durationMultipliers[duration] || 1);
        return Math.max(1, cost);
    }
}

// Export to window for use in app.js
window.BECMICalculations = BECMICalculations;