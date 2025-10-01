<?php
/**
 * BECMI D&D Character Manager - Accept Session Invitation Endpoint
 * 
 * Allows a player to accept an invitation to join a game session.
 * Updates the invitation status from 'invited' to 'accepted'.
 * 
 * Request: POST
 * Body: {
 *   "session_id": int
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Invitation accepted",
 *   "data": {
 *     "session_id": int,
 *     "session_title": string,
 *     "session_datetime": string,
 *     "dm_username": string
 *   }
 * }
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
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID (player)
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify session exists
    $session = $db->selectOne(
        "SELECT gs.session_id, gs.session_title, gs.session_datetime, gs.max_players, 
                gs.status, gs.dm_user_id, u.username as dm_username
         FROM game_sessions gs
         JOIN users u ON gs.dm_user_id = u.user_id
         WHERE gs.session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Check if session is cancelled or completed
    if ($session['status'] === 'cancelled') {
        Security::sendValidationErrorResponse(['session_id' => 'Cannot accept invitation to a cancelled session']);
    }
    
    if ($session['status'] === 'completed') {
        Security::sendValidationErrorResponse(['session_id' => 'Cannot accept invitation to a completed session']);
    }
    
    // Check if user is the DM (can't accept own session)
    if ($session['dm_user_id'] == $userId) {
        Security::sendValidationErrorResponse(['session_id' => 'You are the DM of this session']);
    }
    
    // Check if invitation exists
    $invitation = $db->selectOne(
        "SELECT status FROM session_players 
         WHERE session_id = ? AND user_id = ?",
        [$sessionId, $userId]
    );
    
    if (!$invitation) {
        Security::sendErrorResponse('No invitation found for this session', 404);
    }
    
    // Check invitation status
    if ($invitation['status'] === 'accepted') {
        Security::sendValidationErrorResponse(['session_id' => 'You have already accepted this invitation']);
    }
    
    if ($invitation['status'] === 'declined') {
        // Allow accepting after declining
        error_log("ACCEPT INVITATION: User {$userId} accepting previously declined invitation to session {$sessionId}");
    }
    
    if ($invitation['status'] !== 'invited' && $invitation['status'] !== 'declined') {
        Security::sendValidationErrorResponse(['session_id' => 'Invalid invitation status']);
    }
    
    // Check if session is full
    $acceptedPlayers = $db->selectOne(
        "SELECT COUNT(*) as count 
         FROM session_players 
         WHERE session_id = ? AND status = 'accepted'",
        [$sessionId]
    );
    
    $currentPlayers = (int) $acceptedPlayers['count'];
    $maxPlayers = (int) $session['max_players'];
    
    if ($currentPlayers >= $maxPlayers) {
        Security::sendValidationErrorResponse([
            'session_id' => "Session is full ({$currentPlayers}/{$maxPlayers} players)"
        ]);
    }
    
    // Accept invitation
    $db->execute(
        "UPDATE session_players 
         SET status = 'accepted', joined_at = NOW() 
         WHERE session_id = ? AND user_id = ?",
        [$sessionId, $userId]
    );
    
    error_log("ACCEPT INVITATION: User {$userId} accepted invitation to session {$sessionId} ({$session['session_title']})");
    
    // Format session datetime for response
    $sessionDatetime = null;
    if (!empty($session['session_datetime'])) {
        $timestamp = strtotime($session['session_datetime']);
        if ($timestamp !== false) {
            $sessionDatetime = date('c', $timestamp);
        }
    }
    
    // Return success with session info
    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'session_title' => $session['session_title'],
        'session_datetime' => $sessionDatetime,
        'dm_username' => $session['dm_username'],
        'status' => 'accepted'
    ], "Invitation accepted successfully");
    
} catch (Exception $e) {
    error_log("ACCEPT INVITATION ERROR: " . $e->getMessage());
    error_log("ACCEPT INVITATION ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to accept invitation: ' . $e->getMessage(), 500);
}

