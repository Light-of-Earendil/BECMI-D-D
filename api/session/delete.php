<?php
/**
 * BECMI D&D Character Manager - Session Delete Endpoint
 *
 * Allows a DM to delete their game session
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();

    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }

    // DEBUG: Read raw input BEFORE validateJSONInput consumes it
    $rawInput = file_get_contents('php://input');
    error_log("DELETE SESSION - Raw input: " . $rawInput);
    error_log("DELETE SESSION - Request method: " . $_SERVER['REQUEST_METHOD']);
    error_log("DELETE SESSION - Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
    
    // Now decode it manually since we already read it
    $payload = [];
    if (!empty($rawInput)) {
        $payload = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("DELETE SESSION - JSON decode error: " . json_last_error_msg());
            Security::sendErrorResponse('Invalid JSON input', 400);
        }
    }
    
    error_log("DELETE SESSION - Decoded payload: " . json_encode($payload));
    
    $sessionId = isset($payload['session_id']) ? (int) $payload['session_id'] : 0;

    if ($sessionId <= 0) {
        error_log("DELETE SESSION ERROR - Invalid session_id. Payload keys: " . implode(', ', array_keys($payload)));
        Security::sendValidationErrorResponse(['session_id' => 'Invalid session ID']);
    }

    $userId = Security::getCurrentUserId();
    $db = getDB();

    // Verify user owns this session
    $session = $db->selectOne(
        'SELECT dm_user_id, session_title FROM game_sessions WHERE session_id = ?',
        [$sessionId]
    );

    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }

    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to delete this session', 403);
    }

    // Delete session (cascade will delete related records)
    $db->execute('DELETE FROM game_sessions WHERE session_id = ?', [$sessionId]);

    Security::logSecurityEvent('session_deleted', [
        'session_id' => $sessionId,
        'session_title' => $session['session_title'],
        'dm_user_id' => $userId
    ]);

    Security::sendSuccessResponse(null, 'Session deleted successfully');
} catch (Exception $e) {
    error_log('Session delete error: '. $e->getMessage());
    Security::sendErrorResponse('An error occurred while deleting the session', 500);
}
