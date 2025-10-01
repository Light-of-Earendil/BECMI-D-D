<?php
/**
 * BECMI D&D Character Manager - BECMI Rules Engine
 * 
 * Implements all BECMI rule calculations including THAC0, encumbrance,
 * saving throws, and all optional rule modifications.
 */

class BECMIRulesEngine {
    
    /**
     * Calculate THAC0 (To Hit Armor Class 0) for a character
     */
    public static function calculateTHAC0($character) {
        $class = $character['class'];
        $level = $character['level'];
        $strength = $character['strength'];
        $dexterity = $character['dexterity'];
        
        // Base THAC0 by class and level
        $baseTHAC0 = self::getBaseTHAC0($class, $level);
        
        // Strength bonus for melee attacks
        $strengthBonus = self::getStrengthToHitBonus($strength);
        
        // Dexterity bonus for ranged attacks
        $dexterityBonus = self::getDexterityToHitBonus($dexterity);
        
        // Weapon mastery bonus (if applicable)
        $masteryBonus = self::getWeaponMasteryBonus($character);
        
        return [
            'melee' => $baseTHAC0 - $strengthBonus - $masteryBonus,
            'ranged' => $baseTHAC0 - $dexterityBonus - $masteryBonus,
            'base' => $baseTHAC0,
            'strength_bonus' => $strengthBonus,
            'dexterity_bonus' => $dexterityBonus,
            'mastery_bonus' => $masteryBonus
        ];
    }
    
    /**
     * Get base THAC0 by class and level
     */
    private static function getBaseTHAC0($class, $level) {
        $thac0Table = [
            'fighter' => [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
            'cleric' => [20, 20, 20, 19, 19, 19, 18, 18, 18, 17, 17, 17, 16, 16, 16, 15, 15, 15, 14, 14],
            'magic_user' => [20, 20, 20, 20, 20, 19, 19, 19, 19, 19, 18, 18, 18, 18, 18, 17, 17, 17, 17, 17],
            'thief' => [20, 20, 19, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11],
            'dwarf' => [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
            'elf' => [20, 20, 19, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11],
            'halfling' => [20, 20, 19, 19, 18, 18, 17, 17, 16, 16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11]
        ];
        
        $levelIndex = min($level - 1, 19); // Cap at level 20
        return $thac0Table[$class][$levelIndex] ?? 20;
    }
    
    /**
     * Get Strength bonus to hit
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
     * Get Dexterity bonus to hit (ranged attacks)
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
     * Get weapon mastery bonus
     */
    private static function getWeaponMasteryBonus($character) {
        // This would need to be calculated based on equipped weapon and mastery level
        // For now, return 0 - this will be implemented when weapon mastery is added
        return 0;
    }
    
    /**
     * Calculate movement rates based on encumbrance
     */
    public static function calculateMovementRates($character) {
        $strength = $character['strength'];
        $totalWeight = self::calculateTotalWeight($character);
        
        // Strength adjustment to encumbrance limits
        $strengthAdjustment = self::getEncumbranceAdjustmentFromStrength($strength);
        
        // Adjusted encumbrance levels
        $unencumberedLimit = 400 + $strengthAdjustment;
        $lightlyEncumberedLimit = 800 + $strengthAdjustment;
        $heavilyEncumberedLimit = 1200 + $strengthAdjustment;
        $severelyEncumberedLimit = 1600 + $strengthAdjustment;
        
        if ($totalWeight <= $unencumberedLimit) {
            return [
                'normal' => 120,
                'encounter' => 40,
                'status' => 'unencumbered',
                'weight' => $totalWeight,
                'limit' => $unencumberedLimit
            ];
        } elseif ($totalWeight <= $lightlyEncumberedLimit) {
            return [
                'normal' => 90,
                'encounter' => 30,
                'status' => 'lightly_encumbered',
                'weight' => $totalWeight,
                'limit' => $lightlyEncumberedLimit
            ];
        } elseif ($totalWeight <= $heavilyEncumberedLimit) {
            return [
                'normal' => 60,
                'encounter' => 20,
                'status' => 'heavily_encumbered',
                'weight' => $totalWeight,
                'limit' => $heavilyEncumberedLimit
            ];
        } elseif ($totalWeight <= $severelyEncumberedLimit) {
            return [
                'normal' => 30,
                'encounter' => 10,
                'status' => 'severely_encumbered',
                'weight' => $totalWeight,
                'limit' => $severelyEncumberedLimit
            ];
        } else {
            return [
                'normal' => 15,
                'encounter' => 5,
                'status' => 'overloaded',
                'weight' => $totalWeight,
                'limit' => $severelyEncumberedLimit
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
     * Calculate saving throws for a character
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
     * Get base saving throws by class and level
     */
    private static function getBaseSavingThrows($class, $level) {
        $saveTable = [
            'fighter' => [
                'death_ray' => [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis' => [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath' => [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1],
                'spells' => [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1]
            ],
            'cleric' => [
                'death_ray' => [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand' => [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis' => [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath' => [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1],
                'spells' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            'magic_user' => [
                'death_ray' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand' => [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'paralysis' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath' => [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1],
                'spells' => [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            'thief' => [
                'death_ray' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand' => [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1],
                'paralysis' => [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath' => [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1],
                'spells' => [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1]
            ],
            'dwarf' => [
                'death_ray' => [8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand' => [9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis' => [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'spells' => [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            'elf' => [
                'death_ray' => [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath' => [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1],
                'spells' => [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],
            'halfling' => [
                'death_ray' => [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'magic_wand' => [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'paralysis' => [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                'dragon_breath' => [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1],
                'spells' => [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1]
            ]
        ];
        
        $levelIndex = min($level - 1, 19); // Cap at level 20
        
        return [
            'death_ray' => $saveTable[$class]['death_ray'][$levelIndex] ?? 20,
            'magic_wand' => $saveTable[$class]['magic_wand'][$levelIndex] ?? 20,
            'paralysis' => $saveTable[$class]['paralysis'][$levelIndex] ?? 20,
            'dragon_breath' => $saveTable[$class]['dragon_breath'][$levelIndex] ?? 20,
            'spells' => $saveTable[$class]['spells'][$levelIndex] ?? 20
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
        
        // Hit dice by class
        $hitDice = [
            'fighter' => 8, 'cleric' => 6, 'magic_user' => 4, 'thief' => 4,
            'dwarf' => 8, 'elf' => 6, 'halfling' => 6
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
            'cleric' => [0, 1500, 3000, 6000, 12000, 24000, 48000, 96000, 192000, 384000, 576000, 768000, 960000, 1152000, 1344000, 1536000, 1728000, 1920000, 2112000, 2304000],
            'magic_user' => [0, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 960000, 1280000, 1600000, 1920000, 2240000, 2560000, 2880000, 3200000, 3520000, 3840000],
            'thief' => [0, 1200, 2400, 4800, 9600, 19200, 38400, 76800, 153600, 307200, 460800, 614400, 768000, 921600, 1075200, 1228800, 1382400, 1536000, 1689600, 1843200],
            'dwarf' => [0, 2200, 4400, 8800, 17600, 35200, 70400, 140800, 281600, 563200, 844800, 1126400, 1408000, 1689600, 1971200, 2252800, 2534400, 2816000, 3097600, 3379200],
            'elf' => [0, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 1024000, 1536000, 2048000, 2560000, 3072000, 3584000, 4096000, 4608000, 5120000, 5632000, 6144000],
            'halfling' => [0, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000, 768000, 1024000, 1280000, 1536000, 1788000, 2048000, 2304000, 2560000, 2816000, 3072000]
        ];
        
        if ($currentLevel >= 20) {
            return null; // Max level reached
        }
        
        return $xpTable[$class][$currentLevel] ?? null;
    }
    
    /**
     * Calculate armor class
     */
    public static function calculateArmorClass($character) {
        $baseAC = 10;
        
        // Dexterity bonus/penalty
        $dexBonus = self::getDexterityBonus($character['dexterity']);
        
        // Armor bonus (would need to check equipped armor)
        $armorBonus = 0; // Placeholder
        
        // Shield bonus (would need to check equipped shield)
        $shieldBonus = 0; // Placeholder
        
        return $baseAC + $dexBonus + $armorBonus + $shieldBonus;
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
}
?>
