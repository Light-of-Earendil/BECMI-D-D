<?php
/**
 * BECMI D&D Character Manager - Get Character Weapon Masteries
 * 
 * Returns all weapon masteries for a character with calculated bonuses.
 * Bonuses are based on BECMI Rules Cyclopedia p. 75.
 * 
 * @return JSON Array of weapon masteries with attack/damage bonuses
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

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
    $characterId = isset($_GET['character_id']) ? (int)$_GET['character_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user has access to this character
    $character = $db->selectOne(
        "SELECT c.user_id, c.session_id, gs.dm_user_id
         FROM characters c
         LEFT JOIN game_sessions gs ON c.session_id = gs.session_id
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check if user owns character or is DM of the session
    $isOwner = $character['user_id'] == $userId;
    $isDM = $character['session_id'] && $character['dm_user_id'] == $userId;
    
    if (!$isOwner && !$isDM) {
        Security::sendErrorResponse('You do not have permission to view this character', 403);
    }
    
    // Fetch weapon masteries with optional base weapon name for magical items
    $masteries = $db->select(
        "SELECT cwm.mastery_rank, cwm.learned_at_level, 
                i.item_id, i.name as weapon_name, i.damage_die, i.weapon_type,
                i.base_item_id, i.is_magical, i.magical_bonus,
                base_i.name as base_weapon_name
         FROM character_weapon_mastery cwm
         JOIN items i ON cwm.item_id = i.item_id
         LEFT JOIN items base_i ON i.base_item_id = base_i.item_id
         WHERE cwm.character_id = ?
         ORDER BY cwm.learned_at_level, i.name",
        [$characterId]
    );
    
    $allMasteries = $masteries;
    
    // Add bonus calculations per Rules Cyclopedia p. 75-77
    // Attack bonuses: Basic=0, Skilled=+2, Expert=+4, Master=+6, Grand Master=+8 (vs Primary targets)
    // Damage bonuses: +1 per mastery level above Basic
    $bonusTable = [
        'basic' => ['attack_primary' => 0, 'attack_secondary' => 0, 'damage' => 0],
        'skilled' => ['attack_primary' => 2, 'attack_secondary' => 1, 'damage' => 1],
        'expert' => ['attack_primary' => 4, 'attack_secondary' => 2, 'damage' => 2],
        'master' => ['attack_primary' => 6, 'attack_secondary' => 4, 'damage' => 3],
        'grand_master' => ['attack_primary' => 8, 'attack_secondary' => 6, 'damage' => 4]
    ];
    
    $formattedMasteries = array_map(function($m) use ($bonusTable) {
        $rank = $m['mastery_rank'];
        $bonuses = $bonusTable[$rank] ?? $bonusTable['basic'];
        
        return [
            'item_id' => (int) $m['item_id'],
            'weapon_name' => $m['weapon_name'],
            'damage_die' => $m['damage_die'],
            'weapon_type' => $m['weapon_type'],
            'base_item_id' => (int) $m['base_item_id'],
            'is_magical' => (bool) $m['is_magical'],
            'magical_bonus' => (int) $m['magical_bonus'],
            'base_weapon_name' => $m['base_weapon_name'] ?? null,
            'mastery_rank' => $rank,
            'learned_at_level' => (int) $m['learned_at_level'],
            'attack_bonus_primary' => $bonuses['attack_primary'],
            'attack_bonus_secondary' => $bonuses['attack_secondary'],
            'damage_bonus' => $bonuses['damage']
        ];
    }, $allMasteries);
    
    Security::sendSuccessResponse([
        'masteries' => $formattedMasteries,
        'count' => count($formattedMasteries)
    ]);
    
} catch (Exception $e) {
    error_log("Get weapon masteries error: " . $e->getMessage());
    error_log("Get weapon masteries error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to fetch weapon masteries', 500);
}
?>

