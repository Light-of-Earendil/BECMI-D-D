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

/**
 * Check whether a table exists in current schema.
 */
function realtimeTableExists(Database $db, string $tableName): bool {
    try {
        $exists = $db->selectOne(
            "SELECT 1 AS table_exists
             FROM information_schema.tables
             WHERE table_schema = DATABASE()
             AND table_name = ?
             LIMIT 1",
            [$tableName]
        );
        return $exists !== null;
    } catch (Exception $e) {
        return false;
    }
}

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
    $timeout = isset($_GET['timeout']) ? (int) $_GET['timeout'] : 20;
    if ($timeout <= 0) {
        $timeout = 20;
    }
    $timeout = min($timeout, 30); // Hard cap for long-polling window
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();

    // Release PHP session lock before long-poll wait loop so concurrent
    // requests from the same user (audio list, map data, etc.) are not blocked.
    if (session_status() === PHP_SESSION_ACTIVE) {
        @session_write_close();
    }
    
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
    $startTime = microtime(true);
    $lastActivityUpdate = $startTime;
    $events = [];
    
    while (microtime(true) - $startTime < $timeout) {
        // Get new events
        $events = $broadcaster->getEvents($sessionId, $lastEventId);
        
        if (!empty($events)) {
            // Found new events - return immediately
            break;
        }
        
        // No events yet - keep request parked for true long-poll behavior.
        usleep(250000); // 250ms

        // Keep online presence fresh, but avoid write storm.
        $now = microtime(true);
        if (($now - $lastActivityUpdate) >= 5) {
            $broadcaster->updateUserActivity($userId, $sessionId, $lastEventId);
            $lastActivityUpdate = $now;
        }
    }
    
    // Get online users in this session
    $onlineUsers = $broadcaster->getOnlineUsers($sessionId);
    
    // Get the highest event ID for this session (even if no new events)
    // This ensures clients always know the latest event ID.
    $eventTable = null;
    if (realtimeTableExists($db, 'session_events')) {
        $eventTable = 'session_events';
    } elseif (realtimeTableExists($db, 'realtime_events')) {
        $eventTable = 'realtime_events';
    }

    $maxEventId = $lastEventId;
    if ($eventTable !== null) {
        $maxEventResult = $db->selectOne(
            "SELECT COALESCE(MAX(event_id), 0) as max_event_id
             FROM {$eventTable}
             WHERE session_id = ?",
            [$sessionId]
        );
        $maxEventId = (int) ($maxEventResult['max_event_id'] ?? $lastEventId);
    }
    
    // Use the highest of: max event ID, last event ID from request, or last event ID from events returned
    $returnedLastEventId = !empty($events) ? end($events)['event_id'] : $lastEventId;
    $finalLastEventId = max($maxEventId, $returnedLastEventId, $lastEventId);
    
    // Final activity update at response time.
    $broadcaster->updateUserActivity($userId, $sessionId, $finalLastEventId);
    
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
