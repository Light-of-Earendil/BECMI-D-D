<?php
/**
 * BECMI D&D Character Manager - Remove Monster from Initiative
 * 
 * Removes a monster instance from the initiative tracker.
 */

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
        Security::sendErrorResponse('Only the DM can remove monsters from initiative', 403);
    }
    
    // Get initiative entry
    $initiative = $db->selectOne(
        "SELECT * FROM combat_initiatives 
         WHERE initiative_id = ? AND session_id = ? AND entity_type = 'monster'",
        [$initiativeId, $sessionId]
    );
    
    if (!$initiative) {
        Security::sendErrorResponse('Monster initiative entry not found', 404);
    }
    
    // Remove from initiative (cascade will handle tokens)
    $db->execute(
        "DELETE FROM combat_initiatives WHERE initiative_id = ?",
        [$initiativeId]
    );
    
    // Log security event
    Security::logSecurityEvent('monster_removed_from_initiative', [
        'session_id' => $sessionId,
        'initiative_id' => $initiativeId,
        'monster_instance_id' => $initiative['monster_instance_id']
    ]);
    
    Security::sendSuccessResponse([
        'initiative_id' => $initiativeId
    ], 'Monster removed from initiative tracker');
    
} catch (Exception $e) {
    error_log("Remove monster from initiative error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to remove monster from initiative: ' . $e->getMessage(), 500);
}
?>
