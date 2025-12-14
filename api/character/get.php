<?php
/**
 * BECMI D&D Character Manager - Get Character Endpoint
 * 
 * Retrieves character data with all calculated statistics.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/becmi-rules.php';

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get character ID from query parameters
    $characterId = $_GET['id'] ?? null;
    
    if (!$characterId || !is_numeric($characterId)) {
        Security::sendValidationErrorResponse(['id' => 'Valid character ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get character data
    $character = $db->selectOne(
        "SELECT c.*, u.username, gs.session_title 
         FROM characters c 
         JOIN users u ON c.user_id = u.user_id 
         LEFT JOIN game_sessions gs ON c.session_id = gs.session_id 
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check if user has access to this character
    $hasAccess = false;
    
    // Character owner has access
    if ($character['user_id'] == $userId) {
        $hasAccess = true;
    }
    
    // DM of the session has access (if character is assigned to a session)
    if (!$hasAccess && $character['session_id']) {
        $session = $db->selectOne(
            "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
            [$character['session_id']]
        );
        
        if ($session && $session['dm_user_id'] == $userId) {
            $hasAccess = true;
        }
    }
    
    // Other players in the session have read-only access (if character is assigned to a session)
    if (!$hasAccess && $character['session_id']) {
        $playerInSession = $db->selectOne(
            "SELECT user_id FROM session_players WHERE session_id = ? AND user_id = ?",
            [$character['session_id'], $userId]
        );
        
        if ($playerInSession) {
            $hasAccess = true;
        }
    }
    
    if (!$hasAccess) {
        Security::sendErrorResponse('Access denied', 403);
    }
    
    // Get character inventory
    $inventory = $db->select(
        "SELECT ci.*, i.name, i.description, i.weight_cn, i.cost_gp, i.item_type, 
                i.damage_die, i.damage_type, i.ac_bonus, i.weapon_type, i.range_short, i.range_long
         FROM character_inventory ci 
         JOIN items i ON ci.item_id = i.item_id 
         WHERE ci.character_id = ? 
         ORDER BY ci.is_equipped DESC, i.item_type, i.name",
        [$characterId]
    );
    
    // Get character skills
    $skills = $db->select(
        "SELECT skill_name, bonus, learned_at_level, notes 
         FROM character_skills 
         WHERE character_id = ? 
         ORDER BY skill_name",
        [$characterId]
    );
    
    // Get weapon mastery
    $weaponMastery = $db->select(
        "SELECT cwm.*, i.name as weapon_name, i.damage_die, i.damage_type
         FROM character_weapon_mastery cwm 
         JOIN items i ON cwm.item_id = i.item_id 
         WHERE cwm.character_id = ? 
         ORDER BY i.name",
        [$characterId]
    );
    
    // Get character spells (if applicable)
    $spells = [];
    if (in_array($character['class'], ['magic_user', 'cleric', 'elf'])) {
        $spells = $db->select(
            "SELECT spell_name, spell_level, spell_type, memorized_count, max_memorized 
             FROM character_spells 
             WHERE character_id = ? 
             ORDER BY spell_level, spell_name",
            [$characterId]
        );
    }
    
    // Recalculate all statistics to ensure they're current
    $calculatedStats = recalculateCharacterStats($character, $inventory);
    $currentHp = min($character['current_hp'], $calculatedStats['max_hp']);
    
    // Prepare response data
    $responseData = [
        'character' => [
            'character_id' => $character['character_id'],
            'character_name' => $character['character_name'],
            'class' => $character['class'],
            'level' => $character['level'],
            'experience_points' => $character['experience_points'],
            'current_hp' => $currentHp,
            'max_hp' => $calculatedStats['max_hp'],
            'strength' => $character['strength'],
            'dexterity' => $character['dexterity'],
            'constitution' => $character['constitution'],
            'intelligence' => $character['intelligence'],
            'wisdom' => $character['wisdom'],
            'charisma' => $character['charisma'],
            'armor_class' => $calculatedStats['armor_class'],
            'thac0' => $calculatedStats['thac0']['base'], // Only one THAC0
            'thac0_melee' => $calculatedStats['thac0']['base'], // For backward compatibility
            'thac0_ranged' => $calculatedStats['thac0']['base'], // For backward compatibility
            'strength_to_hit_bonus' => $calculatedStats['thac0']['strength_bonus'],
            'dexterity_to_hit_bonus' => $calculatedStats['thac0']['dexterity_bonus'],
            'movement_rate_normal' => $calculatedStats['movement']['normal'],
            'movement_rate_encounter' => $calculatedStats['movement']['encounter'],
            'encumbrance_status' => $calculatedStats['movement']['status'],
            'save_death_ray' => $calculatedStats['saving_throws']['death_ray'],
            'save_magic_wand' => $calculatedStats['saving_throws']['magic_wand'],
            'save_paralysis' => $calculatedStats['saving_throws']['paralysis'],
            'save_dragon_breath' => $calculatedStats['saving_throws']['dragon_breath'],
            'save_spells' => $calculatedStats['saving_throws']['spells'],
            'alignment' => $character['alignment'],
            'gender' => $character['gender'],
            'age' => $character['age'],
            'height' => $character['height'],
            'weight' => $character['weight'],
            'hair_color' => $character['hair_color'],
            'eye_color' => $character['eye_color'],
            'background' => $character['background'],
            'portrait_url' => $character['portrait_url'],
            'gold_pieces' => $character['gold_pieces'],
            'silver_pieces' => $character['silver_pieces'],
            'copper_pieces' => $character['copper_pieces'],
            'username' => $character['username'],
            'session_title' => $character['session_title'],
            'session_id' => $character['session_id'],
            'created_at' => $character['created_at'],
            'updated_at' => $character['updated_at']
        ],
        'inventory' => $inventory,
        'skills' => $skills,
        'weapon_mastery' => $weaponMastery,
        'spells' => $spells,
        'calculated_stats' => $calculatedStats
    ];
    
    // Return success response
    Security::sendSuccessResponse($responseData, 'Character data retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get character error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred while retrieving character data', 500);
}

/**
 * Recalculate all character statistics
 */
function recalculateCharacterStats($character, $inventory = null) {
    $stats = [];
    
    // Calculate hit points
    $stats['max_hp'] = BECMIRulesEngine::calculateHitPoints($character);
    
    // Calculate THAC0
    $stats['thac0'] = BECMIRulesEngine::calculateTHAC0($character);
    
    // Calculate movement rates
    $stats['movement'] = BECMIRulesEngine::calculateMovementRates($character);
    
    // Calculate saving throws
    $stats['saving_throws'] = BECMIRulesEngine::calculateSavingThrows($character);
    
    // Calculate armor class (with inventory data)
    $stats['armor_class'] = BECMIRulesEngine::calculateArmorClass($character, $inventory);
    
    // Calculate experience for next level
    $stats['xp_for_next_level'] = BECMIRulesEngine::getExperienceForNextLevel($character['class'], $character['level']);
    
    return $stats;
}
?>







