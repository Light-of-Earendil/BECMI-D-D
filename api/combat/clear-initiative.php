<?php
/**
 * BECMI D&D Character Manager - Clear Initiative
 * 
 * Clears all initiative data for a session (end combat).
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
        Security::sendErrorResponse('Only the DM can clear initiative', 403);
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Clear current turn
        $db->execute(
            "DELETE FROM combat_current_turn WHERE session_id = ?",
            [$sessionId]
        );
        
        // Clear all initiatives
        $db->execute(
            "DELETE FROM combat_initiatives WHERE session_id = ?",
            [$sessionId]
        );
        
        $db->commit();
        
        // Log security event
        Security::logSecurityEvent('initiative_cleared', [
            'session_id' => $sessionId
        ]);
        
        Security::sendSuccessResponse([
            'session_id' => $sessionId
        ], 'Initiative cleared - combat ended');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Clear initiative error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to clear initiative', 500);
}
?>

