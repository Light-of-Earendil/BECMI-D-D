<?php
/**
 * BECMI D&D Character Manager - Get Initiative Order
 * 
 * Returns initiative order for a session sorted by initiative roll (DESC), then dexterity (DESC).
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
    
    // Get session ID
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : 0;
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user is DM of this session
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can view initiative', 403);
    }
    
    // Get initiative order
    $initiatives = $db->select(
        "SELECT ci.initiative_id, ci.character_id, ci.entity_name, ci.entity_type,
                ci.initiative_roll, ci.dexterity, ci.is_active,
                c.current_hp, c.max_hp, c.class, c.level
         FROM combat_initiatives ci
         LEFT JOIN characters c ON ci.character_id = c.character_id
         WHERE ci.session_id = ? AND ci.is_active = 1
         ORDER BY ci.initiative_roll DESC, ci.dexterity DESC, ci.entity_name ASC",
        [$sessionId]
    );
    
    // Get current turn
    $currentTurn = $db->selectOne(
        "SELECT current_initiative_id, round_number FROM combat_current_turn WHERE session_id = ?",
        [$sessionId]
    );
    
    // Format initiative data
    $formattedInitiatives = array_map(function($init) use ($currentTurn) {
        return [
            'initiative_id' => (int) $init['initiative_id'],
            'character_id' => $init['character_id'] ? (int) $init['character_id'] : null,
            'entity_name' => $init['entity_name'],
            'entity_type' => $init['entity_type'],
            'initiative_roll' => (int) $init['initiative_roll'],
            'dexterity' => $init['dexterity'] ? (int) $init['dexterity'] : null,
            'is_current_turn' => $currentTurn && $currentTurn['current_initiative_id'] == $init['initiative_id'],
            'hp' => $init['current_hp'] && $init['max_hp'] ? [
                'current' => (int) $init['current_hp'],
                'max' => (int) $init['max_hp'],
                'percentage' => round(((int)$init['current_hp'] / (int)$init['max_hp']) * 100, 1)
            ] : null,
            'class' => $init['class'],
            'level' => $init['level'] ? (int) $init['level'] : null
        ];
    }, $initiatives);
    
    Security::sendSuccessResponse([
        'initiatives' => $formattedInitiatives,
        'current_turn' => $currentTurn ? [
            'initiative_id' => (int) $currentTurn['current_initiative_id'],
            'round_number' => (int) $currentTurn['round_number']
        ] : null,
        'total_count' => count($formattedInitiatives)
    ], 'Initiative order retrieved');
    
} catch (Exception $e) {
    error_log("Get initiative error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to get initiative order', 500);
}
?>

