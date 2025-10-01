<?php
/**
 * BECMI D&D Character Manager - Remove Player from Session Endpoint
 * 
 * Allows a DM to remove a player from their game session.
 * Deletes the invitation record and unassigns any characters.
 * 
 * Request: POST
 * Body: {
 *   "session_id": int,
 *   "user_id": int (player to remove)
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Player removed from session",
 *   "data": {
 *     "unassigned_characters": int
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
    $errors = [];
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    $playerUserId = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    
    if ($sessionId <= 0) {
        $errors['session_id'] = 'Valid session ID is required';
    }
    
    if ($playerUserId <= 0) {
        $errors['user_id'] = 'Valid user ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID (DM)
    $dmUserId = Security::getCurrentUserId();
    
    // Check if trying to remove self
    if ($playerUserId == $dmUserId) {
        Security::sendValidationErrorResponse(['user_id' => 'You cannot remove yourself from your own session']);
    }
    
    // Get database connection
    $db = getDB();
    
    // Verify session exists and user is the DM
    $session = $db->selectOne(
        "SELECT session_id, dm_user_id, session_title 
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $dmUserId) {
        Security::sendErrorResponse('You do not have permission to remove players from this session', 403);
    }
    
    // Check if player is in the session
    $invitation = $db->selectOne(
        "SELECT status FROM session_players 
         WHERE session_id = ? AND user_id = ?",
        [$sessionId, $playerUserId]
    );
    
    if (!$invitation) {
        Security::sendErrorResponse('Player is not in this session', 404);
    }
    
    // Get player username for logging
    $player = $db->selectOne(
        "SELECT username FROM users WHERE user_id = ?",
        [$playerUserId]
    );
    
    $playerUsername = $player ? $player['username'] : "User {$playerUserId}";
    
    // Unassign any characters the player has in this session
    $assignedCharacters = $db->select(
        "SELECT character_id, character_name 
         FROM characters 
         WHERE user_id = ? AND session_id = ? AND is_active = 1",
        [$playerUserId, $sessionId]
    );
    
    if (!empty($assignedCharacters)) {
        $db->execute(
            "UPDATE characters 
             SET session_id = NULL 
             WHERE user_id = ? AND session_id = ?",
            [$playerUserId, $sessionId]
        );
        
        $characterNames = array_column($assignedCharacters, 'character_name');
        error_log("REMOVE PLAYER: Unassigned " . count($assignedCharacters) . " characters from session {$sessionId}: " . implode(', ', $characterNames));
    }
    
    // Remove player from session
    $db->execute(
        "DELETE FROM session_players 
         WHERE session_id = ? AND user_id = ?",
        [$sessionId, $playerUserId]
    );
    
    error_log("REMOVE PLAYER: DM {$dmUserId} removed player {$playerUsername} (ID: {$playerUserId}) from session {$sessionId} ({$session['session_title']})");
    
    // Return success
    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'user_id' => $playerUserId,
        'username' => $playerUsername,
        'unassigned_characters' => count($assignedCharacters)
    ], "Player {$playerUsername} removed from session successfully");
    
} catch (Exception $e) {
    error_log("REMOVE PLAYER ERROR: " . $e->getMessage());
    error_log("REMOVE PLAYER ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to remove player: ' . $e->getMessage(), 500);
}

