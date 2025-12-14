<?php
/**
 * BECMI D&D Character Manager - Level Up Character
 * 
 * Handles complete level-up process for BECMI characters.
 * Updates all relevant stats based on class progression tables.
 * 
 * @return JSON Success/error response with updated character data
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/becmi-rules.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($data === null) {
        Security::sendErrorResponse('Invalid JSON data', 400);
    }
    
    // Validate required fields
    $required = ['character_id'];
    $validation = Security::validateRequired($data, $required);
    if (!$validation['valid']) {
        Security::sendValidationErrorResponse($validation['errors']);
    }
    
    $characterId = (int) $data['character_id'];
    $newHpRolled = isset($data['new_hp_rolled']) ? (int) $data['new_hp_rolled'] : null;
    $newSpells = isset($data['new_spells']) ? $data['new_spells'] : [];
    $newSkills = isset($data['new_skills']) ? $data['new_skills'] : [];
    $newWeaponMastery = isset($data['new_weapon_mastery']) ? $data['new_weapon_mastery'] : null;
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get character with full details
    $character = $db->selectOne(
        "SELECT c.*, gs.dm_user_id
         FROM characters c
         LEFT JOIN game_sessions gs ON c.session_id = gs.session_id
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check permissions (owner or DM)
    $isOwner = $character['user_id'] == $userId;
    $isDM = $character['session_id'] && $character['dm_user_id'] == $userId;
    
    if (!$isOwner && !$isDM) {
        Security::sendErrorResponse('You do not have permission to level up this character', 403);
    }
    
    $currentLevel = $character['level'];
    $nextLevel = $currentLevel + 1;
    $currentXp = $character['experience_points'];
    
    // Get required XP for next level using BECMI rules
    $requiredXp = BECMIRulesEngine::getExperienceForNextLevel($character['class'], $currentLevel);
    
    if ($requiredXp === null) {
        Security::sendErrorResponse("Character has reached maximum level for their class", 400);
    }
    
    // Verify character has enough XP
    if ($currentXp < $requiredXp) {
        Security::sendErrorResponse("Character needs $requiredXp XP to reach level $nextLevel (currently has $currentXp)", 400);
    }
    
    // Begin transaction
    $db->execute("START TRANSACTION");
    
    try {
        // Calculate new HP
        if ($newHpRolled === null) {
            // Auto-roll HP based on class
            $hitDice = BECMIRules::getClassHitDice($character['class']);
            $conBonus = BECMIRules::getAbilityModifier($character['constitution']);
            
            // Roll HP (minimum 1)
            $hpRoll = rand(1, (int)substr($hitDice, 2)); // Extract die size from "1d8" -> 8
            $newHpGained = max(1, $hpRoll + $conBonus);
        } else {
            $newHpGained = max(1, $newHpRolled);
        }
        
        $newMaxHp = $character['max_hp'] + $newHpGained;
        $newCurrentHp = $character['current_hp'] + $newHpGained; // Heal by amount gained
        
        // Calculate new THAC0 based on class and level (only ONE THAC0)
        $characterForThac0 = array_merge($character, ['level' => $nextLevel]);
        $newThac0Data = BECMIRulesEngine::calculateTHAC0($characterForThac0);
        $newThac0 = $newThac0Data['base']; // Only one THAC0 value
        
        // Calculate new saving throws
        $newSaves = BECMIRulesEngine::calculateSavingThrows($characterForThac0);
        
        // Update character
        $db->execute(
            "UPDATE characters
             SET level = ?,
                 max_hp = ?,
                 current_hp = ?,
                 thac0_melee = ?,
                 thac0_ranged = ?,
                 save_death_ray = ?,
                 save_magic_wand = ?,
                 save_paralysis = ?,
                 save_dragon_breath = ?,
                 save_spells = ?
             WHERE character_id = ?",
            [
                $nextLevel,
                $newMaxHp,
                $newCurrentHp,
                $newThac0, // Only one THAC0
                $newThac0, // Store same value for compatibility
                $newSaves['death_ray'],
                $newSaves['magic_wand'],
                $newSaves['paralysis'],
                $newSaves['dragon_breath'],
                $newSaves['spells'],
                $characterId
            ]
        );
        
        // Add new spells to spellbook (if provided)
        foreach ($newSpells as $spellId) {
            $spellId = (int) $spellId;
            
            // Get spell details
            $spell = $db->selectOne(
                "SELECT spell_id, spell_name, spell_level, spell_type
                 FROM spells
                 WHERE spell_id = ?",
                [$spellId]
            );
            
            if ($spell) {
                // Add to spellbook
                $db->execute(
                    "INSERT IGNORE INTO character_spells 
                     (character_id, spell_id, spell_name, spell_level, spell_type, 
                      memorized_count, max_memorized, is_memorized, times_cast_today)
                     VALUES (?, ?, ?, ?, ?, 0, 0, FALSE, 0)",
                    [
                        $characterId,
                        $spell['spell_id'],
                        $spell['spell_name'],
                        $spell['spell_level'],
                        $spell['spell_type']
                    ]
                );
            }
        }
        
        // Add new skills (if provided)
        foreach ($newSkills as $skillData) {
            if (is_string($skillData)) {
                $skillName = $skillData;
                $bonus = 0;
            } else {
                $skillName = $skillData['skill_name'];
                $bonus = isset($skillData['bonus']) ? (int) $skillData['bonus'] : 0;
            }
            
            // Add skill
            $db->execute(
                "INSERT IGNORE INTO character_skills 
                 (character_id, skill_name, bonus, learned_at_level)
                 VALUES (?, ?, ?, ?)",
                [
                    $characterId,
                    $skillName,
                    $bonus,
                    $nextLevel
                ]
            );
        }
        
        // Update weapon mastery (if provided)
        if ($newWeaponMastery) {
            $itemId = (int) $newWeaponMastery['item_id'];
            $rank = $newWeaponMastery['rank'];
            
            // Check if mastery exists
            $existing = $db->selectOne(
                "SELECT character_id FROM character_weapon_mastery
                 WHERE character_id = ? AND item_id = ?",
                [$characterId, $itemId]
            );
            
            if ($existing) {
                // Update existing mastery
                $db->execute(
                    "UPDATE character_weapon_mastery
                     SET mastery_rank = ?
                     WHERE character_id = ? AND item_id = ?",
                    [$rank, $characterId, $itemId]
                );
            } else {
                // Add new mastery
                $db->execute(
                    "INSERT INTO character_weapon_mastery 
                     (character_id, item_id, mastery_rank, learned_at_level)
                     VALUES (?, ?, ?, ?)",
                    [$characterId, $itemId, $rank, $nextLevel]
                );
            }
        }
        
        // Log the level-up
        $db->execute(
            "INSERT INTO character_changes 
             (character_id, user_id, change_type, field_name, old_value, new_value, change_reason)
             VALUES (?, ?, 'level_up', 'level', ?, ?, ?)",
            [
                $characterId,
                $userId,
                (string) $currentLevel,
                (string) $nextLevel,
                "Leveled up to $nextLevel. HP gained: $newHpGained. $reason"
            ]
        );
        
        $db->execute("COMMIT");
        
        // Get updated character
        $updatedCharacter = $db->selectOne(
            "SELECT * FROM characters WHERE character_id = ?",
            [$characterId]
        );
        
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'old_level' => $currentLevel,
            'new_level' => $nextLevel,
            'hp_gained' => $newHpGained,
            'new_max_hp' => $newMaxHp,
            'new_current_hp' => $newCurrentHp,
            'new_thac0' => $newThac0, // Only one THAC0
            'new_thac0_melee' => $newThac0, // For backward compatibility
            'new_thac0_ranged' => $newThac0, // For backward compatibility
            'strength_to_hit_bonus' => $newThac0Data['strength_bonus'],
            'dexterity_to_hit_bonus' => $newThac0Data['dexterity_bonus'],
            'new_saves' => $newSaves,
            'spells_added' => count($newSpells),
            'skills_added' => count($newSkills),
            'weapon_mastery_updated' => $newWeaponMastery ? true : false,
            'character' => $updatedCharacter
        ], "Character leveled up to level $nextLevel!");
        
    } catch (Exception $e) {
        $db->execute("ROLLBACK");
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Level up error: " . $e->getMessage());
    error_log("Level up error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to level up character', 500);
}
?>

