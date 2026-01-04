<?php
/**
 * BECMI D&D Character Manager - Start Session Endpoint
 * 
 * Allows ONLY the DM (session creator) to start their game session.
 * Changes session status from 'scheduled' to 'active'.
 * 
 * Request: POST
 * Body: {
 *   "session_id": int
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Session started successfully",
 *   "data": {
 *     "session_id": int,
 *     "session_title": string,
 *     "status": "active",
 *     "started_at": string
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
    
    // Get current user ID (must be DM)
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify session exists and get DM info
    $session = $db->selectOne(
        "SELECT session_id, session_title, status, dm_user_id, session_datetime
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // CRITICAL SECURITY CHECK: Only DM can start session
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Access denied - only the Dungeon Master can start this session', 403);
    }
    
    // Check if session can be started
    if ($session['status'] === 'active') {
        Security::sendValidationErrorResponse(['session_id' => 'Session is already active']);
    }
    
    if ($session['status'] === 'completed') {
        Security::sendValidationErrorResponse(['session_id' => 'Cannot start a completed session']);
    }
    
    if ($session['status'] === 'cancelled') {
        Security::sendValidationErrorResponse(['session_id' => 'Cannot start a cancelled session']);
    }
    
    // Check if session time has passed (allow DM to start early, but log it)
    $sessionDateTime = new DateTime($session['session_datetime']);
    $now = new DateTime();
    
    if ($sessionDateTime > $now) {
        // DM can start early, but we log it for tracking
        $timeDiff = $now->diff($sessionDateTime);
        $hoursEarly = $timeDiff->days * 24 + $timeDiff->h + ($timeDiff->i / 60);
        
        error_log("EARLY SESSION START: User {$userId} started session {$sessionId} ({$hoursEarly} hours early). Scheduled: {$sessionDateTime->format('Y-m-d H:i:s')}, Started: {$now->format('Y-m-d H:i:s')}");
        
        // Log security event for early start
        Security::logSecurityEvent('session_started_early', [
            'session_id' => $sessionId,
            'session_title' => $session['session_title'],
            'dm_user_id' => $userId,
            'scheduled_time' => $sessionDateTime->format('Y-m-d H:i:s'),
            'actual_start_time' => $now->format('Y-m-d H:i:s'),
            'hours_early' => round($hoursEarly, 2)
        ]);
    }
    
    // Start session - update status to 'active'
    $db->execute(
        "UPDATE game_sessions 
         SET status = 'active', updated_at = NOW() 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    error_log("START SESSION: User {$userId} started session {$sessionId} ({$session['session_title']})");
    
    // Log security event
    Security::logSecurityEvent('session_started', [
        'session_id' => $sessionId,
        'session_title' => $session['session_title'],
        'dm_user_id' => $userId
    ]);
    
    // Return success response
    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'session_title' => $session['session_title'],
        'status' => 'active',
        'started_at' => date('Y-m-d H:i:s')
    ], "Session '{$session['session_title']}' started successfully");
    
} catch (Exception $e) {
    error_log("START SESSION ERROR: " . $e->getMessage());
    error_log("START SESSION ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to start session: ' . $e->getMessage(), 500);
}
?>
