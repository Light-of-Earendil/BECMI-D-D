<?php
/**
 * BECMI D&D Character Manager - Ambiance Stop Endpoint
 * 
 * Stops currently playing ambiance sound
 * Broadcasts real-time event to all session participants
 * DM only
 * 
 * Request: POST
 * Body: {
 *   "session_id": int
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Ambiance stopped"
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';
require_once '../../../app/services/event-broadcaster.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    $data = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (!isset($data['session_id']) || !is_numeric($data['session_id'])) {
        $errors['session_id'] = 'Valid session ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $sessionId = (int) $data['session_id'];
    
    // Verify session exists and user is DM
    $session = $db->selectOne(
        "SELECT session_id, dm_user_id 
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Only DM can stop ambiance
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can stop ambiance', 403);
    }
    
    // Broadcast real-time event
    $broadcaster = new EventBroadcaster();
    $eventData = [
        'session_id' => $sessionId
    ];
    
    $broadcastResult = broadcastEvent($sessionId, 'ambiance_stop', $eventData, $userId);
    
    if (!$broadcastResult) {
        error_log("AMBIANCE STOP: Failed to broadcast event for session_id: $sessionId");
        Security::sendErrorResponse('Failed to broadcast ambiance stop event', 500);
    }
    
    Security::sendSuccessResponse(null, 'Ambiance stopped successfully');
    
} catch (Exception $e) {
    error_log("AMBIANCE STOP ERROR: " . $e->getMessage());
    error_log("AMBIANCE STOP ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to stop ambiance: ' . $e->getMessage(), 500);
}
?>
