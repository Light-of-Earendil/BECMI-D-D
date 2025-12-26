<?php
/**
 * BECMI D&D Character Manager - BECMI Rules Engine
 * 
 * Implements all BECMI rule calculations including THAC0, encumbrance,
 * saving throws, and all optional rule modifications.
 */

class BECMIRulesEngine {
    
    /**
     * Calculate THAC0 (To Hit Armor Class 0) for a character.
     * 
     * **Important:** THAC0 is ALWAYS just the base value. Strength and Dex bonuses are separate.
     * This follows BECMI rules where THAC0 is the base attack value, and ability bonuses
     * are applied separately during combat resolution.
     * 
     * @param array $character Character data array with:
     *   - `class` (string) - Character class
     *   - `level` (int) - Character level (1-36)
     *   - `strength` (int) - Strength score (3-18)
     *   - `dexterity` (int) - Dexterity score (3-18)
     * @return array THAC0 calculation result with:
     *   - `base` (int) - Base THAC0 value (the actual THAC0)
     *   - `strength_bonus` (int) - Strength bonus for melee attacks (separate)
     *   - `dexterity_bonus` (int) - Dexterity bonus for ranged attacks (separate)
     *   - `mastery_bonus` (int) - Weapon mastery bonus (if applicable)
     * 
     * @example
     * // Calculate THAC0 for a 5th level fighter with STR 16, DEX 14
     * $character = ['class' => 'fighter', 'level' => 5, 'strength' => 16, 'dexterity' => 14];
     * $thac0 = BECMIRulesEngine::calculateTHAC0($character);
     * // Returns: ['base' => 17, 'strength_bonus' => 2, 'dexterity_bonus' => 1, 'mastery_bonus' => 0]
     * 
     * **THAC0 Calculation:**
     * - Base THAC0: Lookup by class and level from official BECMI table
     * - Strength bonus: Separate bonus for melee attacks (not part of THAC0)
     * - Dexterity bonus: Separate bonus for ranged attacks (not part of THAC0)
     * - Weapon mastery: Additional bonus from weapon mastery system
     * 
     * **Supported Classes:**
     * - fighter, cleric, magic_user, thief
     * - dwarf, elf, halfling
     * - druid, mystic
     * 
     * **Level Support:**
     * - Supports levels 1-36 as per official BECMI Rules Cyclopedia
     * 
     * @see getBaseTHAC0() - Gets base THAC0 from official table
     * @see getStrengthToHitBonus() - Calculates strength bonus
     * @see getDexterityToHitBonus() - Calculates dexterity bonus
     * @see getWeaponMasteryBonus() - Calculates weapon mastery bonus
     * 
     * @since 1.0.0
     */
    public static function calculateTHAC0($character) {
        $class = $character['class'];
        $level = $character['level'];
        $strength = $character['strength'];
        $dexterity = $character['dexterity'];
        
        // Base THAC0 by class and level - THIS IS THE ONLY THAC0
        $baseTHAC0 = self::getBaseTHAC0($class, $level);
        
        // Strength bonus for melee attacks (separate, not part of THAC0)
        $strengthBonus = self::getStrengthToHitBonus($strength);
        
        // Dexterity bonus for ranged attacks (separate, not part of THAC0)
        $dexterityBonus = self::getDexterityToHitBonus($dexterity);
        
        // Weapon mastery bonus (if applicable)
        $masteryBonus = self::getWeaponMasteryBonus($character);
        
        return [
            'base' => $baseTHAC0, // This is THE THAC0 - only one value
            'strength_bonus' => $strengthBonus, // Separate bonus for melee
            'dexterity_bonus' => $dexterityBonus, // Separate bonus for ranged
            'mastery_bonus' => $masteryBonus
        ];
    }
    
    /**
     * Get base THAC0 by class and level from official BECMI Rules Cyclopedia Attack Rolls Table.
     * Supports levels 1-36 as per the official table.
     * 
     * @param string $class Character class
     * @param int $level Character level (1-36)
     * @return int Base THAC0 value
     * 
     * @example
     * // Get base THAC0 for 5th level fighter
     * $thac0 = BECMIRulesEngine::getBaseTHAC0('fighter', 5);
     * // Returns: 17
     * 
     * **THAC0 Progressions:**
     * - Fighter/Elf/Halfling: 19 (1-3), 17 (4-6), 15 (7-9), 13 (10-12), 11 (13-15), 9 (16-18), 7 (19-21), 5 (22-24), 3 (25-27), 2 (28-30), 1 (34-36)
     * - Cleric/Thief/Dwarf: 19 (1-4), 17 (5-8), 15 (9-12), 13 (13-16), 11 (17-20), 9 (21-24), 7 (25-28), 5 (29-32), 3 (33-35), 2 (36)
     * - Magic-User: 19 (1-5), 17 (6-10), 15 (11-15), 13 (16-20), 11 (21-25), 9 (26-30), 7 (31-35), 5 (36)
     * 
     * @see calculateTHAC0() - Calls this to get base THAC0
     * 
     * @since 1.0.0
     */
    private static function getBaseTHAC0($class, $level) {
        // Official BECMI Rules Cyclopedia Attack Rolls Table
        // Fighter/Elf/Halfling progression: 1-3, 4-6, 7-9, 10-12, 13-15, 16-18, 19-21, 22-24, 25-27
        // Cleric/Thief/Dwarf progression: 1-4, 5-8, 9-12, 13-16, 17-20, 21-24, 25-28, 29-32, 33-35
        // Magic-User progression: 1-5, 6-10, 11-15, 16-20, 21-25, 26-30, 31-35, 36
        
        $thac0Table = [
            'fighter' => [
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
            'cleric' => [
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
            'magic_user' => [
                19, 19, 19, 19, 19,  // 1-5
                17, 17, 17, 17, 17,  // 6-10
                15, 15, 15, 15, 15,  // 11-15
                13, 13, 13, 13, 13,  // 16-20
                11, 11, 11, 11, 11,  // 21-25
                9, 9, 9, 9, 9,  // 26-30
                7, 7, 7, 7, 7,  // 31-35
                5                      // 36
            ],
            'thief' => [
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
            'dwarf' => [
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
            'elf' => [
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
            'halfling' => [
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
            'druid' => [
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
            'mystic' => [
                19, 19, 19, 19, 19,  // 1-5
                17, 17, 17, 17, 17,  // 6-10
                15, 15, 15, 15, 15,  // 11-15
                13, 13, 13, 13, 13,  // 16-20
                11, 11, 11, 11, 11,  // 21-25
                9, 9, 9, 9, 9,  // 26-30
                7, 7, 7, 7, 7,  // 31-35
                5                      // 36
            ]
        ];
        
        // Cap at level 36 (max in official table)
        $levelIndex = min($level - 1, 35);
        return $thac0Table[$class][$levelIndex] ?? 19;
    }
    
    /**
     * Get Strength bonus to hit for melee attacks.
     * 
     * @param int $strength Strength score (3-18)
     * @return int Bonus to hit (negative for penalties, positive for bonuses)
     * 
     * @example
     * // Get strength bonus for STR 16
     * $bonus = BECMIRulesEngine::getStrengthToHitBonus(16);
     * // Returns: 2
     * 
     * **Bonus Table:**
     * - 3: -3
     * - 4-5: -2
     * - 6-8: -1
     * - 9-12: 0
     * - 13-15: +1
     * - 16: +2
     * - 17: +2
     * - 18: +3
     * 
     * @see calculateTHAC0() - Uses this for strength bonus
     * 
     * @since 1.0.0
     */
    private static function getStrengthToHitBonus($strength) {
        $bonusTable = [
            3 => -3, 4 => -2, 5 => -2, 6 => -1, 7 => -1, 8 => -1, 9 => 0,
            10 => 0, 11 => 0, 12 => 0, 13 => 1, 14 => 1, 15 => 1, 16 => 2,
            17 => 2, 18 => 3
        ];
        
        return $bonusTable[$strength] ?? 0;
    }
    
    /**
     * Get Dexterity bonus to hit for ranged attacks.
     * 
     * @param int $dexterity Dexterity score (3-18)
     * @return int Bonus to hit (negative for penalties, positive for bonuses)
     * 
     * @example
     * // Get dexterity bonus for DEX 15
     * $bonus = BECMIRulesEngine::getDexterityToHitBonus(15);
     * // Returns: 1
     * 
     * **Bonus Table:**
     * - Same as strength bonus table (3: -3, 4-5: -2, 6-8: -1, 9-12: 0, 13-15: +1, 16: +2, 17: +2, 18: +3)
     * 
     * @see calculateTHAC0() - Uses this for dexterity bonus
     * 
     * @since 1.0.0
     */
    private static function getDexterityToHitBonus($dexterity) {
        $bonusTable = [
            3 => -3, 4 => -2, 5 => -2, 6 => -1, 7 => -1, 8 => -1, 9 => 0,
            10 => 0, 11 => 0, 12 => 0, 13 => 1, 14 => 1, 15 => 1, 16 => 2,
            17 => 2, 18 => 3
        ];
        
        return $bonusTable[$dexterity] ?? 0;
    }
    
    /**
     * Get weapon mastery bonus to hit.
     * 
     * **Note:** This is a placeholder implementation. Weapon mastery system will be
     * implemented when weapon mastery features are added to the system.
     * 
     * @param array $character Character data (should include equipped weapon and mastery level)
     * @return int Weapon mastery bonus (currently always returns 0)
     * 
     * @example
     * // Get weapon mastery bonus
     * $bonus = BECMIRulesEngine::getWeaponMasteryBonus($character);
     * // Currently returns: 0
     * 
     * **Future Implementation:**
     * This will calculate bonus based on:
     * - Equipped weapon type
     * - Character's weapon mastery level for that weapon
     * - Official BECMI weapon mastery bonus table
     * 
     * @see calculateTHAC0() - Uses this for weapon mastery bonus
     * 
     * @since 1.0.0
     * @todo Implement weapon mastery bonus calculation
     */
    private static function getWeaponMasteryBonus($character) {
        // This would need to be calculated based on equipped weapon and mastery level
        // For now, return 0 - this will be implemented when weapon mastery is added
        return 0;
    }
    
    /**
     * Calculate movement rates based on encumbrance (BECMI Chapter 6 rules).
     * Returns movement rates for normal, encounter, and running movement, plus encumbrance status.
     * 
     * @param array $character Character data with:
     *   - `strength` (int) - Strength score (for encumbrance capacity)
     *   - Inventory data (for total weight calculation)
     * @return array Movement rates with:
     *   - `normal` (int) - Normal movement rate in feet per turn
     *   - `encounter` (int) - Encounter movement rate in feet per round
     *   - `running` (int) - Running movement rate in feet per turn
     *   - `status` (string) - Encumbrance status: 'unencumbered', 'lightly_encumbered', 'heavily_encumbered', 'severely_encumbered', 'overloaded', 'immobile'
     *   - `weight` (int) - Total weight in coins (cn)
     *   - `limit` (int) - Weight limit for current status in coins (cn)
     * 
     * @example
     * // Calculate movement for character with 500 cn weight
     * $character = ['strength' => 13, ...];
     * $movement = BECMIRulesEngine::calculateMovementRates($character);
     * // Returns: ['normal' => 90, 'encounter' => 30, 'running' => 90, 'status' => 'lightly_encumbered', 'weight' => 500, 'limit' => 800]
     * 
     * **Encumbrance Levels (BECMI Chapter 6):**
     * - Unencumbered (≤ 400 cn): 120/40/120 ft (normal/encounter/running)
     * - Lightly encumbered (401-800 cn): 90/30/90 ft
     * - Heavily encumbered (801-1200 cn): 60/20/60 ft
     * - Severely encumbered (1201-1600 cn): 30/10/30 ft
     * - Overloaded (1601-2400 cn): 15/5/15 ft
     * - Immobile (> 2400 cn): 0/0/0 ft
     * 
     * **Note:**
     * Encumbrance levels are fixed, not adjusted by strength in standard BECMI rules.
     * Strength may affect carrying capacity in optional rules.
     * 
     * @see calculateTotalWeight() - Calculates total inventory weight
     * 
     * @since 1.0.0
     */
    public static function calculateMovementRates($character) {
        $strength = $character['strength'];
        $totalWeight = self::calculateTotalWeight($character);
        
        // BECMI Character Movement Rates and Encumbrance Table (Chapter 6)
        // Encumbrance levels are fixed, not adjusted by strength
        if ($totalWeight <= 400) {
            return [
                'normal' => 120,
                'encounter' => 40,
                'running' => 120,
                'status' => 'unencumbered',
                'weight' => $totalWeight,
                'limit' => 400
            ];
        } elseif ($totalWeight <= 800) {
            return [
                'normal' => 90,
                'encounter' => 30,
                'running' => 90,
                'status' => 'lightly_encumbered',
                'weight' => $totalWeight,
                'limit' => 800
            ];
        } elseif ($totalWeight <= 1200) {
            return [
                'normal' => 60,
                'encounter' => 20,
                'running' => 60,
                'status' => 'heavily_encumbered',
                'weight' => $totalWeight,
                'limit' => 1200
            ];
        } elseif ($totalWeight <= 1600) {
            return [
                'normal' => 30,
                'encounter' => 10,
                'running' => 30,
                'status' => 'severely_encumbered',
                'weight' => $totalWeight,
                'limit' => 1600
            ];
        } elseif ($totalWeight <= 2400) {
            return [
                'normal' => 15,
                'encounter' => 5,
                'running' => 15,
                'status' => 'overloaded',
                'weight' => $totalWeight,
                'limit' => 2400
            ];
        } else {
            return [
                'normal' => 0,
                'encounter' => 0,
                'running' => 0,
                'status' => 'immobile',
                'weight' => $totalWeight,
                'limit' => 2400
            ];
        }
    }
    
    /**
     * Calculate total weight of character's inventory
     */
    private static function calculateTotalWeight($character) {
        // This would need to query the character_inventory table
        // For now, return a placeholder value
        return 0;
    }
    
    /**
     * Get encumbrance adjustment from Strength
     */
    private static function getEncumbranceAdjustmentFromStrength($strength) {
        $adjustmentTable = [
            3 => -200, 4 => -150, 5 => -100, 6 => -50, 7 => 0, 8 => 0, 9 => 0,
            10 => 0, 11 => 0, 12 => 0, 13 => 0, 14 => 0, 15 => 0, 16 => 200,
            17 => 400, 18 => 600
        ];
        
        return $adjustmentTable[$strength] ?? 0;
    }
    
    /**
     * Calculate saving throws for a character.
     * Returns all five saving throw categories with ability score adjustments applied.
     * 
     * @param array $character Character data array with:
     *   - `class` (string) - Character class
     *   - `level` (int) - Character level (1-36)
     *   - `strength` (int) - Strength score
     *   - `dexterity` (int) - Dexterity score
     *   - `constitution` (int) - Constitution score
     *   - `intelligence` (int) - Intelligence score
     *   - `wisdom` (int) - Wisdom score
     *   - `charisma` (int) - Charisma score
     * @return array Saving throws with keys:
     *   - `death_ray` (int) - Death ray or poison save
     *   - `magic_wand` (int) - Magic wand save
     *   - `paralysis` (int) - Paralysis or turn to stone save
     *   - `dragon_breath` (int) - Dragon breath save
     *   - `spells` (int) - Spells save
     * 
     * @example
     * // Calculate saving throws for 5th level fighter
     * $character = ['class' => 'fighter', 'level' => 5, 'strength' => 16, ...];
     * $saves = BECMIRulesEngine::calculateSavingThrows($character);
     * // Returns: ['death_ray' => 10, 'magic_wand' => 11, 'paralysis' => 12, 'dragon_breath' => 13, 'spells' => 14]
     * 
     * **Calculation Process:**
     * 1. Gets base saving throws from official BECMI table (by class and level)
     * 2. Applies ability score adjustments (Wisdom for spells, Constitution for breath, etc.)
     * 3. Returns adjusted saving throws
     * 
     * **Ability Score Adjustments:**
     * - Spells: Wisdom bonus/penalty
     * - Dragon Breath: Constitution bonus/penalty
     * - Other saves: No ability adjustments (base values only)
     * 
     * @see getBaseSavingThrows() - Gets base saves from official table
     * @see applyAbilityScoreAdjustments() - Applies ability score modifiers
     * 
     * @since 1.0.0
     */
    public static function calculateSavingThrows($character) {
        $class = $character['class'];
        $level = $character['level'];
        
        // Base saving throws by class and level
        $baseSaves = self::getBaseSavingThrows($class, $level);
        
        // Apply ability score adjustments
        $adjustedSaves = self::applyAbilityScoreAdjustments($baseSaves, $character);
        
        return $adjustedSaves;
    }
    
    /**
     * Get base saving throws by class and level (from official BECMI Rules Cyclopedia Saving Throws Table)
     * Supports levels 1-36 as per the official table
     */
    private static function getBaseSavingThrows($class, $level) {
        // Helper function to get save value based on level ranges
        $getSaveForLevel = function($ranges, $level) {
            foreach ($ranges as $range => $value) {
                list($min, $max) = explode('-', $range);
                if ($level >= (int)$min && $level <= (int)$max) {
                    return $value;
                }
            }
            // If level exceeds all ranges, use the last value
            return end($ranges);
        };
        
        // Official BECMI Rules Cyclopedia Saving Throws Table
        $saveTable = [
            'fighter' => [
                'death_ray' => ['1-3' => 12, '4-6' => 10, '7-9' => 8, '10-12' => 6, '13-15' => 6, '16-18' => 5, '19-21' => 5, '22-24' => 4, '25-27' => 4, '28-30' => 3, '31-33' => 3, '34-36' => 2],
                'magic_wand' => ['1-3' => 13, '4-6' => 11, '7-9' => 9, '10-12' => 7, '13-15' => 6, '16-18' => 6, '19-21' => 5, '22-24' => 5, '25-27' => 4, '28-30' => 4, '31-33' => 3, '34-36' => 2],
                'paralysis' => ['1-3' => 14, '4-6' => 12, '7-9' => 10, '10-12' => 8, '13-15' => 7, '16-18' => 6, '19-21' => 6, '22-24' => 5, '25-27' => 5, '28-30' => 4, '31-33' => 3, '34-36' => 2],
                'dragon_breath' => ['1-3' => 15, '4-6' => 13, '7-9' => 11, '10-12' => 9, '13-15' => 8, '16-18' => 7, '19-21' => 6, '22-24' => 5, '25-27' => 4, '28-30' => 3, '31-33' => 2, '34-36' => 2],
                'spells' => ['1-3' => 16, '4-6' => 14, '7-9' => 12, '10-12' => 10, '13-15' => 9, '16-18' => 8, '19-21' => 7, '22-24' => 6, '25-27' => 5, '28-30' => 4, '31-33' => 3, '34-36' => 2]
            ],
            'cleric' => [
                'death_ray' => ['1-4' => 11, '5-8' => 9, '9-12' => 7, '13-16' => 6, '17-20' => 5, '21-24' => 4, '25-28' => 3, '29-32' => 2, '33-36' => 2],
                'magic_wand' => ['1-4' => 12, '5-8' => 10, '9-12' => 8, '13-16' => 7, '17-20' => 6, '21-24' => 5, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'paralysis' => ['1-4' => 14, '5-8' => 12, '9-12' => 10, '13-16' => 8, '17-20' => 6, '21-24' => 5, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'dragon_breath' => ['1-4' => 16, '5-8' => 14, '9-12' => 12, '13-16' => 10, '17-20' => 8, '21-24' => 6, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'spells' => ['1-4' => 15, '5-8' => 13, '9-12' => 11, '13-16' => 9, '17-20' => 7, '21-24' => 6, '25-28' => 4, '29-32' => 3, '33-36' => 2]
            ],
            'magic_user' => [
                'death_ray' => ['1-5' => 13, '6-10' => 11, '11-15' => 9, '16-20' => 7, '21-24' => 5, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'magic_wand' => ['1-5' => 14, '6-10' => 12, '11-15' => 10, '16-20' => 8, '21-24' => 6, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'paralysis' => ['1-5' => 13, '6-10' => 11, '11-15' => 9, '16-20' => 7, '21-24' => 5, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'dragon_breath' => ['1-5' => 16, '6-10' => 14, '11-15' => 12, '16-20' => 10, '21-24' => 8, '25-28' => 6, '29-32' => 4, '33-36' => 2],
                'spells' => ['1-5' => 15, '6-10' => 12, '11-15' => 9, '16-20' => 6, '21-24' => 4, '25-28' => 3, '29-32' => 2, '33-36' => 2]
            ],
            'thief' => [
                'death_ray' => ['1-4' => 13, '5-8' => 11, '9-12' => 9, '13-16' => 7, '17-20' => 5, '21-24' => 4, '25-28' => 3, '29-32' => 2, '33-36' => 2],
                'magic_wand' => ['1-4' => 14, '5-8' => 12, '9-12' => 10, '13-16' => 8, '17-20' => 6, '21-24' => 5, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'paralysis' => ['1-4' => 13, '5-8' => 11, '9-12' => 9, '13-16' => 7, '17-20' => 5, '21-24' => 4, '25-28' => 3, '29-32' => 2, '33-36' => 2],
                'dragon_breath' => ['1-4' => 16, '5-8' => 14, '9-12' => 12, '13-16' => 10, '17-20' => 8, '21-24' => 6, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'spells' => ['1-4' => 15, '5-8' => 12, '9-12' => 11, '13-16' => 9, '17-20' => 7, '21-24' => 5, '25-28' => 3, '29-32' => 2, '33-36' => 2]
            ],
            'dwarf' => [
                'death_ray' => ['1-3' => 8, '4-6' => 6, '7-9' => 4, '10-12' => 2],
                'magic_wand' => ['1-3' => 9, '4-6' => 7, '7-9' => 5, '10-12' => 3],
                'paralysis' => ['1-3' => 10, '4-6' => 8, '7-9' => 6, '10-12' => 4],
                'dragon_breath' => ['1-3' => 13, '4-6' => 10, '7-9' => 7, '10-12' => 4],
                'spells' => ['1-3' => 12, '4-6' => 9, '7-9' => 6, '10-12' => 3]
            ],
            'elf' => [
                'death_ray' => ['1-3' => 12, '4-6' => 8, '7-9' => 4, '10' => 2],
                'magic_wand' => ['1-3' => 13, '4-6' => 10, '7-9' => 7, '10' => 4],
                'paralysis' => ['1-3' => 13, '4-6' => 10, '7-9' => 7, '10' => 4],
                'dragon_breath' => ['1-3' => 15, '4-6' => 11, '7-9' => 7, '10' => 3],
                'spells' => ['1-3' => 15, '4-6' => 11, '7-9' => 7, '10' => 3]
            ],
            'halfling' => [
                'death_ray' => ['1-3' => 8, '4-6' => 5, '7-8' => 2],
                'magic_wand' => ['1-3' => 9, '4-6' => 6, '7-8' => 3],
                'paralysis' => ['1-3' => 10, '4-6' => 7, '7-8' => 4],
                'dragon_breath' => ['1-3' => 13, '4-6' => 9, '7-8' => 5],
                'spells' => ['1-3' => 12, '4-6' => 8, '7-8' => 4]
            ],
            'druid' => [
                'death_ray' => ['1-4' => 11, '5-8' => 9, '9-12' => 7, '13-16' => 6, '17-20' => 5, '21-24' => 4, '25-28' => 3, '29-32' => 2, '33-36' => 2],
                'magic_wand' => ['1-4' => 12, '5-8' => 10, '9-12' => 8, '13-16' => 7, '17-20' => 6, '21-24' => 5, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'paralysis' => ['1-4' => 14, '5-8' => 12, '9-12' => 10, '13-16' => 8, '17-20' => 6, '21-24' => 5, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'dragon_breath' => ['1-4' => 16, '5-8' => 14, '9-12' => 12, '13-16' => 10, '17-20' => 8, '21-24' => 6, '25-28' => 4, '29-32' => 3, '33-36' => 2],
                'spells' => ['1-4' => 15, '5-8' => 13, '9-12' => 11, '13-16' => 9, '17-20' => 7, '21-24' => 6, '25-28' => 4, '29-32' => 3, '33-36' => 2]
            ],
            'mystic' => [
                'death_ray' => ['1-3' => 12, '4-6' => 10, '7-9' => 8, '10-12' => 6, '13-15' => 6, '16-18' => 5, '19-21' => 5, '22-24' => 4, '25-27' => 4, '28-30' => 3, '31-33' => 3, '34-36' => 2],
                'magic_wand' => ['1-3' => 13, '4-6' => 11, '7-9' => 9, '10-12' => 7, '13-15' => 6, '16-18' => 6, '19-21' => 5, '22-24' => 5, '25-27' => 4, '28-30' => 4, '31-33' => 3, '34-36' => 2],
                'paralysis' => ['1-3' => 14, '4-6' => 12, '7-9' => 10, '10-12' => 8, '13-15' => 7, '16-18' => 6, '19-21' => 6, '22-24' => 5, '25-27' => 5, '28-30' => 4, '31-33' => 3, '34-36' => 2],
                'dragon_breath' => ['1-3' => 15, '4-6' => 13, '7-9' => 11, '10-12' => 9, '13-15' => 8, '16-18' => 7, '19-21' => 6, '22-24' => 5, '25-27' => 4, '28-30' => 3, '31-33' => 2, '34-36' => 2],
                'spells' => ['1-3' => 16, '4-6' => 14, '7-9' => 12, '10-12' => 10, '13-15' => 9, '16-18' => 8, '19-21' => 7, '22-24' => 6, '25-27' => 5, '28-30' => 4, '31-33' => 3, '34-36' => 2]
            ]
        ];
        
        // Cap at level 36 (max in official table)
        $level = min($level, 36);
        
        if (!isset($saveTable[$class])) {
            return [
                'death_ray' => 20,
                'magic_wand' => 20,
                'paralysis' => 20,
                'dragon_breath' => 20,
                'spells' => 20
            ];
        }
        
        return [
            'death_ray' => $getSaveForLevel($saveTable[$class]['death_ray'], $level),
            'magic_wand' => $getSaveForLevel($saveTable[$class]['magic_wand'], $level),
            'paralysis' => $getSaveForLevel($saveTable[$class]['paralysis'], $level),
            'dragon_breath' => $getSaveForLevel($saveTable[$class]['dragon_breath'], $level),
            'spells' => $getSaveForLevel($saveTable[$class]['spells'], $level)
        ];
    }
    
    /**
     * Apply ability score adjustments to saving throws
     */
    private static function applyAbilityScoreAdjustments($baseSaves, $character) {
        $adjustedSaves = $baseSaves;
        
        // Constitution bonus to all saves
        $conBonus = self::getConstitutionBonus($character['constitution']);
        foreach ($adjustedSaves as $key => $value) {
            $adjustedSaves[$key] = $value - $conBonus;
        }
        
        // Wisdom bonus to spells save
        $wisBonus = self::getWisdomBonus($character['wisdom']);
        $adjustedSaves['spells'] -= $wisBonus;
        
        return $adjustedSaves;
    }
    
    /**
     * Get Constitution bonus
     */
    private static function getConstitutionBonus($constitution) {
        $bonusTable = [
            3 => -2, 4 => -1, 5 => -1, 6 => 0, 7 => 0, 8 => 0, 9 => 0,
            10 => 0, 11 => 0, 12 => 0, 13 => 0, 14 => 0, 15 => 1, 16 => 2,
            17 => 2, 18 => 3
        ];
        
        return $bonusTable[$constitution] ?? 0;
    }
    
    /**
     * Get Wisdom bonus
     */
    private static function getWisdomBonus($wisdom) {
        $bonusTable = [
            3 => -2, 4 => -1, 5 => -1, 6 => 0, 7 => 0, 8 => 0, 9 => 0,
            10 => 0, 11 => 0, 12 => 0, 13 => 0, 14 => 0, 15 => 1, 16 => 2,
            17 => 2, 18 => 3
        ];
        
        return $bonusTable[$wisdom] ?? 0;
    }
    
    /**
     * Calculate hit points for a character
     */
    public static function calculateHitPoints($character) {
        $class = $character['class'];
        $level = $character['level'];
        $constitution = $character['constitution'];
        
        // Hit dice by class (Rules Cyclopedia Chapter 1, page 290-302)
        $hitDice = [
            'fighter' => 8,
            'cleric' => 6,
            'magic_user' => 4,
            'thief' => 4,
            'dwarf' => 8,
            'elf' => 6,
            'halfling' => 6,
            'druid' => 6,
            'mystic' => 6
        ];
        
        $hitDie = $hitDice[$class] ?? 6;
        
        // Constitution bonus/penalty
        $conBonus = self::getConstitutionBonus($constitution);
        
        // Calculate base hit points
        $baseHP = $hitDie + $conBonus; // First level
        
        // Add hit points for additional levels
        for ($i = 2; $i <= $level; $i++) {
            $baseHP += max(1, $hitDie + $conBonus);
        }
        
        return max(1, $baseHP); // Minimum 1 HP
    }
    
    /**
     * Calculate experience points needed for next level
     */
    public static function getExperienceForNextLevel($class, $currentLevel) {
        $xpTable = [
            'fighter' => [0, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 750000, 1000000, 1250000, 1500000, 1750000, 2000000, 2250000, 2500000, 2750000, 3000000],
            'cleric' => [0, 1500, 3000, 6000, 12000, 25000, 50000, 100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000, 2300000, 2400000, 2500000, 2600000, 2700000, 2800000, 2900000],
            'magic_user' => [0, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 960000, 1280000, 1600000, 1920000, 2240000, 2560000, 2880000, 3200000, 3520000, 3840000],
            'thief' => [0, 1200, 2400, 4800, 9600, 19200, 38400, 76800, 153600, 307200, 460800, 614400, 768000, 921600, 1075200, 1228800, 1382400, 1536000, 1689600, 1843200],
            'dwarf' => [0, 2200, 4400, 8800, 17600, 35200, 70400, 140800, 281600, 563200, 844800, 1126400, 1408000, 1689600, 1971200, 2252800, 2534400, 2816000, 3097600, 3379200],
            'elf' => [0, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 1024000, 1536000, 2048000, 2560000, 3072000, 3584000, 4096000, 4608000, 5120000, 5632000, 6144000],
            'halfling' => [0, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 768000, 1024000, 1280000, 1536000, 1788000, 2048000, 2304000, 2560000, 2816000, 3072000]
        ];
        
        // Check max level by class
        $maxLevels = [
            'fighter' => 36, 'dwarf' => 12, 'elf' => 10, 'halfling' => 8,
            'cleric' => 36, 'magic_user' => 36, 'thief' => 36, 'druid' => 36, 'mystic' => 36
        ];
        
        if ($currentLevel >= ($maxLevels[$class] ?? 20)) {
            return null; // Max level reached
        }
        
        return $xpTable[$class][$currentLevel] ?? null;
    }
    
    /**
     * Get spell slots per level for Clerics
     * Based on Cleric Experience Table from Rules Cyclopedia
     */
    public static function getClericSpellSlots($level) {
        $spellSlots = [
            1 => [0, 0, 0, 0, 0, 0, 0], // Level 1: No spells
            2 => [1, 0, 0, 0, 0, 0, 0], // Level 2: 1 first level spell
            3 => [2, 0, 0, 0, 0, 0, 0], // Level 3: 2 first level spells
            4 => [2, 1, 0, 0, 0, 0, 0], // Level 4: 2/1/0/0/0/0/0
            5 => [2, 2, 0, 0, 0, 0, 0], // Level 5: 2/2/0/0/0/0/0
            6 => [3, 2, 0, 0, 0, 0, 0], // Level 6: 3/2/0/0/0/0/0
            7 => [3, 2, 1, 0, 0, 0, 0], // Level 7: 3/2/1/0/0/0/0
            8 => [3, 3, 2, 0, 0, 0, 0], // Level 8: 3/3/2/0/0/0/0
            9 => [3, 3, 2, 1, 0, 0, 0], // Level 9: 3/3/2/1/0/0/0
            10 => [4, 4, 3, 2, 0, 0, 0], // Level 10: 4/4/3/2/0/0/0
            11 => [4, 4, 3, 2, 1, 0, 0], // Level 11: 4/4/3/2/1/0/0
            12 => [4, 4, 4, 3, 2, 0, 0], // Level 12: 4/4/4/3/2/0/0
            13 => [5, 5, 4, 3, 2, 1, 0], // Level 13: 5/5/4/3/2/1/0
            14 => [5, 5, 4, 4, 3, 2, 0], // Level 14: 5/5/4/4/3/2/0
            15 => [5, 5, 5, 4, 3, 2, 0], // Level 15: 5/5/5/4/3/2/0
            16 => [6, 6, 5, 4, 3, 2, 1], // Level 16: 6/6/5/4/3/2/1
            17 => [6, 6, 5, 4, 4, 3, 2], // Level 17: 6/6/5/4/4/3/2
            18 => [6, 6, 6, 5, 4, 3, 2], // Level 18: 6/6/6/5/4/3/2
            19 => [7, 6, 6, 5, 4, 4, 3], // Level 19: 7/6/6/5/4/4/3
            20 => [7, 7, 6, 5, 5, 4, 3], // Level 20: 7/7/6/5/5/4/3
            21 => [7, 7, 6, 6, 5, 4, 4], // Level 21: 7/7/6/6/5/4/4
            22 => [7, 7, 7, 6, 5, 5, 4], // Level 22: 7/7/7/6/5/5/4
            23 => [7, 7, 7, 6, 6, 5, 4], // Level 23: 7/7/7/6/6/5/4
            24 => [8, 7, 7, 6, 6, 5, 5], // Level 24: 8/7/7/6/6/5/5
            25 => [8, 7, 7, 7, 6, 5, 5], // Level 25: 8/7/7/7/6/5/5
            26 => [8, 8, 7, 7, 6, 6, 5], // Level 26: 8/8/7/7/6/6/5
            27 => [8, 8, 7, 7, 7, 6, 5], // Level 27: 8/8/7/7/7/6/5
            28 => [8, 8, 8, 7, 7, 6, 6], // Level 28: 8/8/8/7/7/6/6
            29 => [8, 8, 8, 7, 7, 7, 6], // Level 29: 8/8/8/7/7/7/6
            30 => [8, 8, 8, 8, 7, 7, 6], // Level 30: 8/8/8/8/7/7/6
            31 => [8, 8, 8, 8, 7, 7, 7], // Level 31: 8/8/8/8/7/7/7
            32 => [9, 8, 8, 8, 7, 7, 7], // Level 32: 9/8/8/8/7/7/7
            33 => [9, 9, 8, 8, 7, 7, 7], // Level 33: 9/9/8/8/7/7/7
            34 => [9, 9, 9, 8, 8, 7, 7], // Level 34: 9/9/9/8/8/7/7
            35 => [9, 9, 9, 9, 8, 8, 7], // Level 35: 9/9/9/9/8/8/7
            36 => [9, 9, 9, 9, 9, 8, 8]  // Level 36: 9/9/9/9/9/8/8
        ];
        
        return $spellSlots[$level] ?? [0, 0, 0, 0, 0, 0, 0];
    }
    
    /**
     * Get spell slots per level for Magic-Users
     * Based on Magic-User Experience Table from Rules Cyclopedia
     */
    public static function getMagicUserSpellSlots($level) {
        $spellSlots = [
            1 => [1, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1: 1 first level spell
            2 => [2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2: 2 first level spells
            3 => [2, 1, 0, 0, 0, 0, 0, 0, 0], // Level 3: 2/1/0/0/0/0/0/0/0
            4 => [2, 2, 0, 0, 0, 0, 0, 0, 0], // Level 4: 2/2/0/0/0/0/0/0/0
            5 => [2, 2, 1, 0, 0, 0, 0, 0, 0], // Level 5: 2/2/1/0/0/0/0/0/0
            6 => [3, 2, 1, 0, 0, 0, 0, 0, 0], // Level 6: 3/2/1/0/0/0/0/0/0
            7 => [3, 2, 2, 0, 0, 0, 0, 0, 0], // Level 7: 3/2/2/0/0/0/0/0/0
            8 => [3, 3, 2, 1, 0, 0, 0, 0, 0], // Level 8: 3/3/2/1/0/0/0/0/0
            9 => [3, 3, 2, 2, 0, 0, 0, 0, 0], // Level 9: 3/3/2/2/0/0/0/0/0
            10 => [4, 3, 2, 2, 1, 0, 0, 0, 0], // Level 10: 4/3/2/2/1/0/0/0/0
            11 => [4, 3, 3, 2, 1, 0, 0, 0, 0], // Level 11: 4/3/3/2/1/0/0/0/0
            12 => [4, 4, 3, 2, 2, 0, 0, 0, 0], // Level 12: 4/4/3/2/2/0/0/0/0
            13 => [4, 4, 3, 3, 2, 1, 0, 0, 0], // Level 13: 4/4/3/3/2/1/0/0/0
            14 => [5, 4, 3, 3, 2, 1, 0, 0, 0], // Level 14: 5/4/3/3/2/1/0/0/0
            15 => [5, 4, 4, 3, 2, 2, 0, 0, 0], // Level 15: 5/4/4/3/2/2/0/0/0
            16 => [5, 5, 4, 3, 3, 2, 1, 0, 0], // Level 16: 5/5/4/3/3/2/1/0/0
            17 => [5, 5, 4, 4, 3, 2, 1, 0, 0], // Level 17: 5/5/4/4/3/2/1/0/0
            18 => [6, 5, 4, 4, 3, 3, 2, 0, 0], // Level 18: 6/5/4/4/3/3/2/0/0
            19 => [6, 5, 5, 4, 3, 3, 2, 1, 0], // Level 19: 6/5/5/4/3/3/2/1/0
            20 => [6, 6, 5, 4, 4, 3, 2, 1, 0], // Level 20: 6/6/5/4/4/3/2/1/0
            21 => [6, 6, 5, 5, 4, 3, 3, 2, 0], // Level 21: 6/6/5/5/4/3/3/2/0
            22 => [6, 6, 6, 5, 4, 4, 3, 2, 1], // Level 22: 6/6/6/5/4/4/3/2/1
            23 => [6, 6, 6, 5, 5, 4, 3, 2, 1], // Level 23: 6/6/6/5/5/4/3/2/1
            24 => [6, 6, 6, 6, 5, 4, 4, 3, 2], // Level 24: 6/6/6/6/5/4/4/3/2
            25 => [6, 6, 6, 6, 5, 5, 4, 3, 2], // Level 25: 6/6/6/6/5/5/4/3/2
            26 => [6, 6, 6, 6, 6, 5, 4, 4, 3], // Level 26: 6/6/6/6/6/5/4/4/3
            27 => [6, 6, 6, 6, 6, 5, 5, 4, 3], // Level 27: 6/6/6/6/6/5/5/4/3
            28 => [6, 6, 6, 6, 6, 6, 5, 4, 4], // Level 28: 6/6/6/6/6/6/5/4/4
            29 => [6, 6, 6, 6, 6, 6, 5, 5, 4], // Level 29: 6/6/6/6/6/6/5/5/4
            30 => [6, 6, 6, 6, 6, 6, 6, 5, 5], // Level 30: 6/6/6/6/6/6/6/5/5
            31 => [6, 6, 6, 6, 6, 6, 6, 5, 5], // Level 31: 6/6/6/6/6/6/6/5/5
            32 => [6, 6, 6, 6, 6, 6, 6, 6, 5], // Level 32: 6/6/6/6/6/6/6/6/5
            33 => [6, 6, 6, 6, 6, 6, 6, 6, 5], // Level 33: 6/6/6/6/6/6/6/6/5
            34 => [6, 6, 6, 6, 6, 6, 6, 6, 6], // Level 34: 6/6/6/6/6/6/6/6/6
            35 => [6, 6, 6, 6, 6, 6, 6, 6, 6], // Level 35: 6/6/6/6/6/6/6/6/6
            36 => [6, 6, 6, 6, 6, 6, 6, 6, 6]  // Level 36: 6/6/6/6/6/6/6/6/6
        ];
        
        return $spellSlots[$level] ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    
    /**
     * Get spell slots for a character class and level.
     * Returns associative array with spell level as key and slot count as value.
     * 
     * @param string $class Character class
     * @param int $level Character level (1-36)
     * @return array Associative array with spell level (1-9) as key and slot count as value.
     *   Example: [1 => 2, 2 => 1] means 2 first-level slots and 1 second-level slot.
     *   Returns empty array for non-spellcasters.
     * 
     * @example
     * // Get spell slots for 5th level cleric
     * $slots = BECMIRulesEngine::getSpellSlots('cleric', 5);
     * // Returns: [1 => 2, 2 => 1] (2 first-level, 1 second-level)
     * 
     * **Supported Classes:**
     * - `cleric`, `druid` - Cleric spell progression
     * - `magic_user`, `elf` - Magic-user spell progression
     * - Others - Returns empty array (no spell slots)
     * 
     * **Spell Slot Progression:**
     * - Clerics: Gain slots starting at level 2
     * - Magic-Users: Gain slots starting at level 1
     * - Supports levels 1-36 with full progression
     * 
     * @see getClericSpellSlots() - Gets cleric/druid spell slots
     * @see getMagicUserSpellSlots() - Gets magic-user/elf spell slots
     * 
     * @since 1.0.0
     */
    public static function getSpellSlots($class, $level) {
        $slots = [];
        switch ($class) {
            case 'cleric':
            case 'druid':
                $slots = self::getClericSpellSlots($level);
                break;
            case 'magic_user':
            case 'elf':
                $slots = self::getMagicUserSpellSlots($level);
                break;
            default:
                $slots = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // Non-spellcasters
        }
        
        // Convert array to associative array with level as key
        $result = [];
        foreach ($slots as $spellLevel => $count) {
            if ($count > 0) {
                $result[$spellLevel + 1] = $count; // Convert 0-based to 1-based level
            }
        }
        
        return $result;
    }
    
    /**
     * Calculate armor class according to BECMI rules.
     * BECMI uses descending AC where lower is better (AC 9 = no armor, AC 2 = plate mail).
     * 
     * @param array $character Character data with:
     *   - `dexterity` (int) - Dexterity score (3-18)
     * @param array|null $inventory Character inventory array (optional). If provided, checks for equipped armor.
     *   Each item should have:
     *   - `is_equipped` (bool) - Whether item is equipped
     *   - `item_type` (string) - Item type ('armor' for armor)
     *   - `item_name` (string) - Item name (e.g., 'leather armor', 'chain mail')
     * @return int Armor class (lower is better, range typically 2-9)
     * 
     * @example
     * // Calculate AC for character with DEX 14 and leather armor
     * $character = ['dexterity' => 14];
     * $inventory = [['is_equipped' => true, 'item_type' => 'armor', 'item_name' => 'leather armor']];
     * $ac = BECMIRulesEngine::calculateArmorClass($character, $inventory);
     * // Returns: 6 (leather armor AC 7, DEX 14 gives -1, so 7-1=6)
     * 
     * **AC Calculation:**
     * 1. Base AC: 9 (no armor) or armor AC (if equipped armor)
     * 2. Dexterity adjustment: Subtract DEX bonus from AC (lower is better)
     * 3. Shield: Additional -1 if shield equipped
     * 
     * **Armor AC Values (BECMI):**
     * - No armor: 9
     * - Leather armor: 7
     * - Chain mail: 5
     * - Plate mail: 2
     * - Shield: -1 (additional)
     * 
     * **Dexterity Adjustments:**
     * - DEX 3-8: +1 to AC (worse)
     * - DEX 9-12: 0
     * - DEX 13-15: -1 to AC (better)
     * - DEX 16-17: -2 to AC
     * - DEX 18: -3 to AC
     * 
     * @see getDexterityBonus() - Gets dexterity AC adjustment
     * 
     * @since 1.0.0
     */
    public static function calculateArmorClass($character, $inventory = null) {
        // Dexterity bonus/penalty (subtract from AC, lower is better)
        $dexBonus = self::getDexterityBonus($character['dexterity']);
        
        // Start with base AC (no armor)
        $baseAC = 9;
        
        // Check for equipped armor - ARMOR REPLACES the base AC
        if ($inventory) {
            $equippedArmor = array_filter($inventory, function($item) {
                // Handle both database inventory (with is_equipped) and character creation equipment (without is_equipped)
                $isEquipped = isset($item['is_equipped']) ? $item['is_equipped'] : true;
                $itemType = isset($item['item_type']) ? $item['item_type'] : 'unknown';
                return $isEquipped && $itemType === 'armor';
            });
            
            if (!empty($equippedArmor)) {
                $armor = reset($equippedArmor);
                // BECMI armor AC values (lower is better) - ARMOR REPLACES base AC
                $armorACTable = [
                    'leather armor' => 7,
                    'leather armour' => 7,
                    'scale armor' => 6,
                    'scale armour' => 6,
                    'chain mail' => 5,
                    'banded armor' => 4,
                    'banded armour' => 4,
                    'plate mail' => 3,
                    'plate armour' => 3,
                    'plate armor' => 3,
                    'suit armor' => 0,
                    'suit armour' => 0
                ];
                
                $armorName = strtolower(trim($armor['name']));
                $baseAC = $armorACTable[$armorName] ?? 9; // ARMOR REPLACES base AC
                
                // Add magical bonus if applicable
                if (isset($armor['magical_bonus']) && $armor['magical_bonus'] && $armor['magical_bonus'] > 0) {
                    $baseAC -= $armor['magical_bonus']; // Subtract magical bonus (lower AC is better)
                }
            }
        }
        
        // Shield bonus (subtract from AC, lower is better)  
        $shieldBonus = 0;
        if ($inventory) {
            $equippedShield = array_filter($inventory, function($item) {
                // Handle both database inventory (with is_equipped) and character creation equipment (without is_equipped)
                $isEquipped = isset($item['is_equipped']) ? $item['is_equipped'] : true;
                $itemType = isset($item['item_type']) ? $item['item_type'] : 'unknown';
                return $isEquipped && $itemType === 'shield';
            });
            
            if (!empty($equippedShield)) {
                $shield = reset($equippedShield);
                $shieldBonus = 1; // Standard shield gives -1 AC (better)
                
                // Add magical bonus if applicable
                if (isset($shield['magical_bonus']) && $shield['magical_bonus'] && $shield['magical_bonus'] > 0) {
                    $shieldBonus += $shield['magical_bonus']; // Add magical bonus (lower AC is better)
                }
            }
        }
        
        return $baseAC - $dexBonus - $shieldBonus;
    }
    
    /**
     * Get Dexterity bonus to AC
     */
    private static function getDexterityBonus($dexterity) {
        $bonusTable = [
            3 => -3, 4 => -2, 5 => -2, 6 => -1, 7 => -1, 8 => -1, 9 => 0,
            10 => 0, 11 => 0, 12 => 0, 13 => 1, 14 => 1, 15 => 1, 16 => 2,
            17 => 2, 18 => 3
        ];
        
        return $bonusTable[$dexterity] ?? 0;
    }
    
    /**
     * Get ability modifier for any ability score
     * Public method for use by API endpoints
     * 
     * @param int $abilityScore The ability score (3-18)
     * @return int The modifier (-3 to +3)
     */
    public static function getAbilityModifier($abilityScore) {
        $bonusTable = [
            3 => -3, 4 => -2, 5 => -2, 6 => -1, 7 => -1, 8 => -1, 9 => 0,
            10 => 0, 11 => 0, 12 => 0, 13 => 1, 14 => 1, 15 => 1, 16 => 2,
            17 => 2, 18 => 3
        ];
        
        return $bonusTable[$abilityScore] ?? 0;
    }
    
    /**
     * Get class prime requisites
     * Rules Cyclopedia Chapter 1-2
     * 
     * @param string $class Character class
     * @return array Array of prime requisite ability names
     */
    public static function getClassPrimeRequisites($class) {
        $primeRequisites = [
            'fighter' => ['strength'],
            'cleric' => ['wisdom'],
            'magic_user' => ['intelligence'],
            'thief' => ['dexterity'],
            'dwarf' => ['strength'],
            'elf' => ['strength', 'intelligence'],
            'halfling' => ['strength', 'dexterity'],
            'druid' => ['wisdom'],
            'mystic' => ['strength', 'dexterity']
        ];
        
        return $primeRequisites[$class] ?? [];
    }
    
    /**
     * Validate class requirements (minimum ability scores)
     * Rules Cyclopedia Chapter 1, page 129-146
     * 
     * @param string $class Character class
     * @param array $abilities Character abilities
     * @return array ['valid' => bool, 'error' => string]
     */
    public static function validateClassRequirements($class, $abilities) {
        $requirements = [
            'fighter' => [],
            'cleric' => [],
            'magic_user' => [],
            'thief' => [],
            'dwarf' => ['constitution' => 9],
            'elf' => ['intelligence' => 9],
            'halfling' => ['dexterity' => 9, 'constitution' => 9],
            'druid' => [], // Cannot be created at 1st level
            'mystic' => ['wisdom' => 13, 'dexterity' => 13]
        ];
        
        // Special case: Druid
        if ($class === 'druid') {
            return [
                'valid' => false,
                'error' => 'Druid characters must start as Neutral Clerics and become Druids at 9th level. Please select Cleric class instead.'
            ];
        }
        
        $classReqs = $requirements[$class] ?? [];
        
        foreach ($classReqs as $ability => $minScore) {
            if (!isset($abilities[$ability]) || $abilities[$ability] < $minScore) {
                $abilityName = ucfirst($ability);
                return [
                    'valid' => false,
                    'error' => "{$abilityName} must be at least {$minScore} to play a " . ucfirst(str_replace('_', '-', $class))
                ];
            }
        }
        
        return ['valid' => true, 'error' => null];
    }
    
    /**
     * Validate ability score adjustments
     * Rules Cyclopedia Chapter 1, Step 3, page 227-268
     * 
     * Rules:
     * - Trade 2 points from ability to raise prime requisite by 1
     * - Cannot lower any ability below 9
     * - Cannot lower Constitution or Charisma
     * - Cannot lower Dexterity (except for Thief/Halfling who can raise it)
     * - Can only raise prime requisites
     * 
     * @param array $original Original rolled abilities
     * @param array $adjusted Adjusted abilities
     * @param string $class Character class
     * @return array ['valid' => bool, 'error' => string, 'details' => array]
     */
    public static function validateAbilityAdjustmentRules($original, $adjusted, $class) {
        $primeReqs = self::getClassPrimeRequisites($class);
        $canLowerDex = in_array($class, ['thief', 'halfling']);
        
        $totalPointsLowered = 0;
        $totalPointsRaised = 0;
        $errors = [];
        
        foreach (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as $ability) {
            $origValue = $original[$ability] ?? 10;
            $adjValue = $adjusted[$ability] ?? 10;
            $diff = $adjValue - $origValue;
            
            // Check if lowered below 9
            if ($adjValue < 9 && $diff < 0) {
                return [
                    'valid' => false,
                    'error' => ucfirst($ability) . " cannot be lowered below 9 (currently {$adjValue})",
                    'details' => []
                ];
            }
            
            // Check if Constitution or Charisma lowered
            if (in_array($ability, ['constitution', 'charisma']) && $diff < 0) {
                return [
                    'valid' => false,
                    'error' => ucfirst($ability) . " cannot be lowered",
                    'details' => []
                ];
            }
            
            // Check if Dexterity lowered (not allowed except for Thief/Halfling)
            if ($ability === 'dexterity' && $diff < 0 && !$canLowerDex) {
                return [
                    'valid' => false,
                    'error' => "Dexterity cannot be lowered for this class",
                    'details' => []
                ];
            }
            
            // Check if non-prime requisite raised
            if ($diff > 0 && !in_array($ability, $primeReqs)) {
                return [
                    'valid' => false,
                    'error' => "Can only raise prime requisites (" . implode(', ', $primeReqs) . "), not " . ucfirst($ability),
                    'details' => []
                ];
            }
            
            // Count points
            if ($diff < 0) {
                $totalPointsLowered += abs($diff);
            }
            if ($diff > 0) {
                $totalPointsRaised += $diff;
            }
        }
        
        // Check 2-for-1 ratio
        $expectedPointsRaised = floor($totalPointsLowered / 2);
        if ($totalPointsRaised != $expectedPointsRaised) {
            return [
                'valid' => false,
                'error' => "Invalid point exchange: Lowered {$totalPointsLowered} points (should raise " . floor($totalPointsLowered / 2) . "), but raised {$totalPointsRaised}",
                'details' => ['lowered' => $totalPointsLowered, 'raised' => $totalPointsRaised]
            ];
        }
        
        return [
            'valid' => true,
            'error' => null,
            'details' => ['lowered' => $totalPointsLowered, 'raised' => $totalPointsRaised]
        ];
    }
    
    /**
     * Get number of starting spells for a class
     * Rules Cyclopedia Chapter 3, page 1967-2012
     * 
     * @param string $class Character class
     * @param int $level Character level
     * @return int Number of starting spells in spellbook
     */
    public static function getStartingSpellsForClass($class, $level = 1) {
        // Magic-Users start with 2 spells at 1st level
        if ($class === 'magic_user' && $level === 1) {
            return 2;
        }
        
        // Elves start with 1 spell at 1st level (as they have fewer spells total)
        if ($class === 'elf' && $level === 1) {
            return 1;
        }
        
        // Clerics don't get spells until 2nd level
        // All other classes don't use spells
        return 0;
    }
    
    /**
     * Get hit die for a class
     * Rules Cyclopedia Chapter 1, page 290-302
     * 
     * @param string $class Character class
     * @return int Hit die size (4, 6, or 8)
     */
    public static function getHitDieForClass($class) {
        $hitDice = [
            'fighter' => 8,
            'cleric' => 6,
            'magic_user' => 4,
            'thief' => 4,
            'dwarf' => 8,
            'elf' => 6,
            'halfling' => 6,
            'druid' => 6,
            'mystic' => 6
        ];
        
        return $hitDice[$class] ?? 6;
    }
    
    /**
     * Calculate experience bonus from prime requisite
     * Rules Cyclopedia Chapter 1, page 1061-1103
     * 
     * @param string $class Character class
     * @param array $abilities Character abilities
     * @return float XP multiplier (0.8, 0.9, 1.0, 1.05, or 1.10)
     */
    public static function getExperienceBonus($class, $abilities) {
        $primeReqs = self::getClassPrimeRequisites($class);
        
        // Special handling for classes with two prime requisites
        if (count($primeReqs) === 2) {
            $req1 = $abilities[$primeReqs[0]] ?? 10;
            $req2 = $abilities[$primeReqs[1]] ?? 10;
            
            // Elf: Str 13-18 AND Int 13-15: +5%, Str 13-18 AND Int 16-18: +10%
            if ($class === 'elf') {
                if ($req1 >= 13 && $req1 <= 18 && $req2 >= 13 && $req2 <= 18) {
                    if ($req2 >= 16) {
                        return 1.10; // +10% (Int 16-18)
                    }
                    return 1.05; // +5% (Int 13-15)
                }
                return 1.0; // No bonus
            }
            
            // Halfling: Str 13-18 OR Dex 13-18: +5%, Str 13-18 AND Dex 13-18: +10%
            if ($class === 'halfling') {
                $str13to18 = ($req1 >= 13 && $req1 <= 18);
                $dex13to18 = ($req2 >= 13 && $req2 <= 18);
                
                if ($str13to18 && $dex13to18) {
                    return 1.10; // +10% (both 13-18)
                }
                if ($str13to18 || $dex13to18) {
                    return 1.05; // +5% (one 13-18)
                }
                return 1.0; // No bonus
            }
            
            // Mystic: Str 3-5: -10%, Str 6-8: -5%, Str 13-15: +5%, Str 16-18: +10%
            // (Uses Strength as primary, but has both Str and Dex as requisites)
            if ($class === 'mystic') {
                $str = $req1; // Assuming first is strength
                if ($str >= 16) return 1.10; // +10%
                if ($str >= 13) return 1.05; // +5%
                if ($str <= 5) return 0.90; // -10%
                if ($str <= 8) return 0.95; // -5%
                return 1.0; // No bonus
            }
            
            // Default for other dual-requisite classes: both must meet threshold
            if ($req1 >= 13 && $req2 >= 13) {
                if ($req1 >= 16 && $req2 >= 16) {
                    return 1.10; // +10%
                }
                return 1.05; // +5%
            }
            
            // Penalties for low scores (use lowest)
            $lowest = min($req1, $req2);
            if ($lowest <= 5) return 0.80; // -20%
            if ($lowest <= 8) return 0.90; // -10%
            
            return 1.0; // No bonus
        }
        
        // Single prime requisite
        $primeValue = $abilities[$primeReqs[0]] ?? 10;
        
        if ($primeValue >= 16) return 1.10; // +10%
        if ($primeValue >= 13) return 1.05; // +5%
        if ($primeValue <= 5) return 0.80; // -20%
        if ($primeValue <= 8) return 0.90; // -10%
        
        return 1.0; // No bonus or penalty
    }
}
?>
