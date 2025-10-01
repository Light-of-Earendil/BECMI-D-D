/**
 * BECMI D&D Character Manager - Starting Gold Calculator
 * 
 * Handles starting gold calculation based on BECMI rules.
 * Each character class has different starting gold formulae.
 * 
 * @module CharacterCreationGold
 * @requires BECMIConstants
 * 
 * @fileoverview
 * This module provides utilities for calculating starting gold
 * for new characters in the BECMI ruleset. Starting gold varies
 * by character class and is rolled using different dice combinations.
 * 
 * @author AI Development Assistant
 * @version 1.0.0
 */

class CharacterCreationGold {
    /**
     * Creates a new CharacterCreationGold instance
     * 
     * @constructor
     */
    constructor() {
        console.log('Character Creation Gold Calculator initialized');
    }

    /**
     * Get starting gold formula for a character class
     * 
     * @param {string} characterClass - The character class (e.g., 'fighter', 'magic_user')
     * @returns {Object} Starting gold formula with dice and multiplier
     * 
     * @example
     * const formula = goldCalc.getStartingGoldFormula('fighter');
     * // Returns: { dice: 3, sides: 6, multiplier: 10 }
     */
    getStartingGoldFormula(characterClass) {
        /**
         * BECMI Starting Gold by Class:
         * - Fighter, Cleric, Dwarf, Elf, Halfling: 3d6 × 10 gp
         * - Magic-User, Thief: 2d6 × 10 gp
         * 
         * Source: BECMI Rules Cyclopedia
         */
        const formulas = {
            'fighter': { dice: 3, sides: 6, multiplier: 10, description: '3d6 × 10 gp' },
            'cleric': { dice: 3, sides: 6, multiplier: 10, description: '3d6 × 10 gp' },
            'magic_user': { dice: 2, sides: 6, multiplier: 10, description: '2d6 × 10 gp' },
            'thief': { dice: 2, sides: 6, multiplier: 10, description: '2d6 × 10 gp' },
            'dwarf': { dice: 3, sides: 6, multiplier: 10, description: '3d6 × 10 gp' },
            'elf': { dice: 3, sides: 6, multiplier: 10, description: '3d6 × 10 gp' },
            'halfling': { dice: 3, sides: 6, multiplier: 10, description: '3d6 × 10 gp' }
        };

        return formulas[characterClass] || formulas['fighter']; // Default to fighter if unknown
    }

    /**
     * Roll starting gold for a character
     * 
     * @param {string} characterClass - The character class
     * @returns {Object} Result with gold amount and roll details
     * 
     * @example
     * const result = goldCalc.rollStartingGold('fighter');
     * // Returns: { 
     * //   gold: 120, 
     * //   rolls: [4, 6, 2], 
     * //   total: 12, 
     * //   formula: '3d6 × 10',
     * //   description: 'Rolled 4 + 6 + 2 = 12, multiplied by 10 = 120 gp'
     * // }
     */
    rollStartingGold(characterClass) {
        const formula = this.getStartingGoldFormula(characterClass);
        const rolls = [];
        let total = 0;

        // Roll the dice
        for (let i = 0; i < formula.dice; i++) {
            const roll = Math.floor(Math.random() * formula.sides) + 1;
            rolls.push(roll);
            total += roll;
        }

        // Apply multiplier
        const gold = total * formula.multiplier;

        // Create description
        const rollsDescription = rolls.join(' + ');
        const description = `Rolled ${rollsDescription} = ${total}, multiplied by ${formula.multiplier} = ${gold} gp`;

        console.log(`Starting gold roll for ${characterClass}: ${description}`);

        return {
            gold: gold,
            rolls: rolls,
            total: total,
            formula: formula.description,
            description: description
        };
    }

    /**
     * Format gold amount as display string
     * 
     * @param {number} gold - Gold amount in pieces
     * @returns {string} Formatted gold string
     * 
     * @example
     * formatGold(120); // Returns "120 gp"
     * formatGold(1500); // Returns "1,500 gp"
     */
    formatGold(gold) {
        return `${gold.toLocaleString()} gp`;
    }

    /**
     * Convert gold to other currencies if needed
     * BECMI uses: 1 gp = 10 sp = 100 cp
     * 
     * @param {number} goldPieces - Amount in gold pieces
     * @returns {Object} Currency breakdown
     * 
     * @example
     * convertGold(12.5);
     * // Returns: { gp: 12, sp: 5, cp: 0 }
     */
    convertGold(goldPieces) {
        const gp = Math.floor(goldPieces);
        const remainder = goldPieces - gp;
        const sp = Math.floor(remainder * 10);
        const cp = Math.floor((remainder * 10 - sp) * 10);

        return { gp, sp, cp };
    }
}

// Export to window for use in character creation
window.CharacterCreationGold = CharacterCreationGold;

