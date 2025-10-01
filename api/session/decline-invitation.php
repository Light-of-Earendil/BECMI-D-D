<?php
/**
 * BECMI D&D Character Manager - Decline Session Invitation Endpoint
 * 
 * Allows a player to decline an invitation to join a game session.
 * Updates the invitation status from 'invited' to 'declined'.
 * 
 * Request: POST
 * Body: {
 *   "session_id": int
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Invitation declined"
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
        "SELECT session_id, session_title, dm_user_id 
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Check if user is the DM (can't decline own session)
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
    if ($invitation['status'] === 'declined') {
        Security::sendValidationErrorResponse(['session_id' => 'You have already declined this invitation']);
    }
    
    if ($invitation['status'] !== 'invited' && $invitation['status'] !== 'accepted') {
        Security::sendValidationErrorResponse(['session_id' => 'Invalid invitation status']);
    }
    
    // Decline invitation
    $db->execute(
        "UPDATE session_players 
         SET status = 'declined' 
         WHERE session_id = ? AND user_id = ?",
        [$sessionId, $userId]
    );
    
    error_log("DECLINE INVITATION: User {$userId} declined invitation to session {$sessionId} ({$session['session_title']})");
    
    // If player had characters assigned to this session, unassign them
    $assignedCharacters = $db->select(
        "SELECT character_id, character_name 
         FROM characters 
         WHERE user_id = ? AND session_id = ? AND is_active = 1",
        [$userId, $sessionId]
    );
    
    if (!empty($assignedCharacters)) {
        $db->execute(
            "UPDATE characters 
             SET session_id = NULL 
             WHERE user_id = ? AND session_id = ?",
            [$userId, $sessionId]
        );
        
        $characterNames = array_column($assignedCharacters, 'character_name');
        error_log("DECLINE INVITATION: Unassigned " . count($assignedCharacters) . " characters from session {$sessionId}: " . implode(', ', $characterNames));
    }
    
    // Return success
    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'session_title' => $session['session_title'],
        'status' => 'declined',
        'unassigned_characters' => count($assignedCharacters)
    ], "Invitation declined successfully");
    
} catch (Exception $e) {
    error_log("DECLINE INVITATION ERROR: " . $e->getMessage());
    error_log("DECLINE INVITATION ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to decline invitation: ' . $e->getMessage(), 500);
}

