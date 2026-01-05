<?php
/**
 * BECMI D&D Character Manager - Remove Character from Initiative
 * 
 * Removes a character from the initiative tracker.
 */

// Disable error display to prevent warnings/notices from corrupting JSON
@ini_set('display_errors', 0);
@error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);

// Start output buffering immediately to catch any stray output
ob_start();

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (including the one we just started)
while (ob_get_level()) {
    @ob_end_clean();
}

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

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
    $input = Security::validateJSONInput();
    
    $initiativeId = isset($input['initiative_id']) ? (int) $input['initiative_id'] : 0;
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    
    if ($initiativeId <= 0) {
        Security::sendValidationErrorResponse(['initiative_id' => 'Valid initiative ID is required']);
    }
    
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
        Security::sendErrorResponse('Only the DM can remove characters from initiative', 403);
    }
    
    // Verify initiative entry exists and is a character
    $initiative = $db->selectOne(
        "SELECT initiative_id, character_id, entity_name, entity_type
         FROM combat_initiatives
         WHERE initiative_id = ? AND session_id = ? AND is_active = 1",
        [$initiativeId, $sessionId]
    );
    
    if (!$initiative) {
        Security::sendErrorResponse('Initiative entry not found', 404);
    }
    
    if ($initiative['entity_type'] !== 'character') {
        Security::sendErrorResponse('This entry is not a character', 400);
    }
    
    // Remove from initiative (set is_active = 0)
    $db->execute(
        "UPDATE combat_initiatives SET is_active = 0 WHERE initiative_id = ?",
        [$initiativeId]
    );
    
    // Check if this was the current turn - if so, advance to next
    $currentTurn = $db->selectOne(
        "SELECT current_initiative_id FROM combat_current_turn WHERE session_id = ?",
        [$sessionId]
    );
    
    if ($currentTurn && $currentTurn['current_initiative_id'] == $initiativeId) {
        // Find next active initiative
        $nextInitiative = $db->selectOne(
            "SELECT initiative_id FROM combat_initiatives
             WHERE session_id = ? AND is_active = 1
             ORDER BY initiative_roll DESC, dexterity DESC, entity_name ASC
             LIMIT 1",
            [$sessionId]
        );
        
        if ($nextInitiative) {
            $db->execute(
                "UPDATE combat_current_turn 
                 SET current_initiative_id = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE session_id = ?",
                [$nextInitiative['initiative_id'], $sessionId]
            );
        } else {
            // No more initiatives - clear current turn
            $db->execute(
                "DELETE FROM combat_current_turn WHERE session_id = ?",
                [$sessionId]
            );
        }
    }
    
    // Log security event
    Security::logSecurityEvent('character_removed_from_initiative', [
        'session_id' => $sessionId,
        'character_id' => $initiative['character_id'],
        'initiative_id' => $initiativeId
    ]);
    
    // Clear any output before sending response
    while (ob_get_level()) {
        @ob_end_clean();
    }
    
    Security::sendSuccessResponse([
        'initiative_id' => $initiativeId,
        'character_id' => $initiative['character_id'],
        'entity_name' => $initiative['entity_name']
    ], 'Character removed from initiative tracker');
    
} catch (Exception $e) {
    // Clear any output before sending error response
    while (ob_get_level()) {
        @ob_end_clean();
    }
    
    error_log("Remove character from initiative error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to remove character from initiative: ' . $e->getMessage(), 500);
}
?>
