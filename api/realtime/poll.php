<?php
/**
 * BECMI D&D Character Manager - Real-Time Polling Endpoint
 * 
 * Long-polling endpoint for real-time session updates.
 * Returns new events since last poll for a specific session.
 * 
 * @return JSON Array of events
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/event-broadcaster.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

// Disable output buffering for long-polling
if (ob_get_level()) ob_end_flush();

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get parameters
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : 0;
    $lastEventId = isset($_GET['last_event_id']) ? (int) $_GET['last_event_id'] : 0;
    $timeout = isset($_GET['timeout']) ? min((int) $_GET['timeout'], 30) : 25; // Max 30 seconds
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user has access to this session
    $sessionPlayer = $db->selectOne(
        "SELECT sp.user_id, gs.dm_user_id
         FROM session_players sp
         JOIN game_sessions gs ON sp.session_id = gs.session_id
         WHERE sp.session_id = ? AND sp.user_id = ? AND sp.status = 'accepted'",
        [$sessionId, $userId]
    );
    
    // Also check if user is DM
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    $isDM = $session && $session['dm_user_id'] == $userId;
    $isPlayer = $sessionPlayer !== null;
    
    if (!$isDM && !$isPlayer) {
        Security::sendErrorResponse('You do not have access to this session', 403);
    }
    
    // Create event broadcaster
    $broadcaster = new EventBroadcaster();
    
    // Update user activity
    $broadcaster->updateUserActivity($userId, $sessionId, $lastEventId);
    
    // Long-polling: Wait for new events up to timeout seconds
    $startTime = time();
    $events = [];
    
    while (time() - $startTime < $timeout) {
        // Get new events
        $events = $broadcaster->getEvents($sessionId, $lastEventId);
        
        if (!empty($events)) {
            // Found new events - return immediately
            break;
        }
        
        // No events yet - wait 1 second before checking again
        sleep(1);
        
        // Update activity to keep user online
        $broadcaster->updateUserActivity($userId, $sessionId, $lastEventId);
    }
    
    // Get online users in this session
    $onlineUsers = $broadcaster->getOnlineUsers($sessionId);
    
    // Return events
    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'events' => $events,
        'event_count' => count($events),
        'last_event_id' => !empty($events) ? end($events)['event_id'] : $lastEventId,
        'online_users' => $onlineUsers,
        'online_count' => count($onlineUsers),
        'timestamp' => time()
    ]);
    
} catch (Exception $e) {
    error_log("Polling error: " . $e->getMessage());
    error_log("Polling error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Polling failed', 500);
}
?>

