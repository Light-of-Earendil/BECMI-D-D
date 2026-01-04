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

// Disable output compression for long-polling to avoid encoding issues
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (suppress errors for zlib compression)
while (ob_get_level()) {
    @ob_end_clean();
}

// Explicitly disable compression headers
header('Content-Encoding: identity');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

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
    $timeout = isset($_GET['timeout']) ? min((int) $_GET['timeout'], 10) : 5; // Max 10 seconds, default 5
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user has access to this session
    // First check if user is DM
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    $isDM = $session['dm_user_id'] == $userId;
    
    // If not DM, check if user is a player in the session
    // Accept both 'accepted' and 'invited' status for real-time updates
    // (invited players should be able to see the map even if not fully accepted yet)
    $sessionPlayer = null;
    if (!$isDM) {
        $sessionPlayer = $db->selectOne(
            "SELECT sp.user_id, sp.status, gs.dm_user_id
             FROM session_players sp
             JOIN game_sessions gs ON sp.session_id = gs.session_id
             WHERE sp.session_id = ? AND sp.user_id = ? AND sp.status IN ('accepted', 'invited')",
            [$sessionId, $userId]
        );
    }
    
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
    
    // Get the highest event ID for this session (even if no new events)
    // This ensures clients always know the latest event ID
    $db = getDB();
    $maxEventId = $db->selectOne(
        "SELECT COALESCE(MAX(event_id), 0) as max_event_id 
         FROM session_events 
         WHERE session_id = ?",
        [$sessionId]
    );
    $maxEventId = (int) ($maxEventId['max_event_id'] ?? $lastEventId);
    
    // Use the highest of: max event ID, last event ID from request, or last event ID from events returned
    $returnedLastEventId = !empty($events) ? end($events)['event_id'] : $lastEventId;
    $finalLastEventId = max($maxEventId, $returnedLastEventId, $lastEventId);
    
    @error_log("Poll response: session_id=$sessionId, events_count=" . count($events) . ", lastEventId_requested=$lastEventId, maxEventId=$maxEventId, finalLastEventId=$finalLastEventId");
    
    // Return events
    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'events' => $events,
        'event_count' => count($events),
        'last_event_id' => $finalLastEventId,
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

