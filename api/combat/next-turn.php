<?php
/**
 * BECMI D&D Character Manager - Next/Previous Turn
 * 
 * Advances to the next turn in initiative order, or goes back to previous turn.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

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
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    $direction = isset($input['direction']) ? $input['direction'] : 'next'; // 'next' or 'previous'
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user is DM
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can change turns', 403);
    }
    
    // Get current turn
    $currentTurn = $db->selectOne(
        "SELECT current_initiative_id, round_number FROM combat_current_turn WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$currentTurn) {
        Security::sendErrorResponse('No active combat in this session', 400);
    }
    
    // Get all initiatives in order
    $initiatives = $db->select(
        "SELECT initiative_id FROM combat_initiatives 
         WHERE session_id = ? AND is_active = 1
         ORDER BY initiative_roll DESC, dexterity DESC",
        [$sessionId]
    );
    
    if (count($initiatives) === 0) {
        Security::sendErrorResponse('No initiatives found', 400);
    }
    
    // Find current position
    $currentIndex = -1;
    foreach ($initiatives as $index => $init) {
        if ($init['initiative_id'] == $currentTurn['current_initiative_id']) {
            $currentIndex = $index;
            break;
        }
    }
    
    if ($currentIndex === -1) {
        Security::sendErrorResponse('Current turn not found in initiative order', 500);
    }
    
    // Calculate new position
    $newIndex = $currentIndex;
    $newRound = (int) $currentTurn['round_number'];
    
    if ($direction === 'next') {
        $newIndex++;
        if ($newIndex >= count($initiatives)) {
            $newIndex = 0;
            $newRound++;
        }
    } else { // 'previous'
        $newIndex--;
        if ($newIndex < 0) {
            $newIndex = count($initiatives) - 1;
            $newRound = max(1, $newRound - 1);
        }
    }
    
    $newInitiativeId = $initiatives[$newIndex]['initiative_id'];
    
    // Update current turn
    $db->execute(
        "UPDATE combat_current_turn 
         SET current_initiative_id = ?, round_number = ?
         WHERE session_id = ?",
        [$newInitiativeId, $newRound, $sessionId]
    );
    
    // Get new current turn details
    $newTurn = $db->selectOne(
        "SELECT ci.entity_name, ci.initiative_roll FROM combat_initiatives ci
         WHERE ci.initiative_id = ?",
        [$newInitiativeId]
    );
    
    Security::sendSuccessResponse([
        'initiative_id' => $newInitiativeId,
        'entity_name' => $newTurn['entity_name'],
        'round_number' => $newRound,
        'direction' => $direction
    ], ucfirst($direction) . ' turn: ' . $newTurn['entity_name']);
    
} catch (Exception $e) {
    error_log("Next turn error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to change turn', 500);
}
?>

