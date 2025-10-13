<?php
/**
 * BECMI D&D Character Manager - Event Broadcaster Service
 * 
 * Broadcasts events to session_events table for real-time updates.
 * Events are picked up by long-polling clients.
 */

require_once __DIR__ . '/../core/database.php';

class EventBroadcaster {
    private $db;
    
    public function __construct() {
        $this->db = getDB();
    }
    
    /**
     * Broadcast an event to all participants in a session
     * 
     * @param int $sessionId - Session ID
     * @param string $eventType - Event type (hp_change, item_given, etc.)
     * @param array $eventData - Event data
     * @param int|null $createdByUserId - User who triggered the event
     * @return bool Success status
     */
    public function broadcastEvent($sessionId, $eventType, $eventData, $createdByUserId = null) {
        try {
            // Insert event into session_events table
            $this->db->execute(
                "INSERT INTO session_events 
                 (session_id, event_type, event_data, created_by_user_id, processed)
                 VALUES (?, ?, ?, ?, FALSE)",
                [
                    $sessionId,
                    $eventType,
                    json_encode($eventData),
                    $createdByUserId
                ]
            );
            
            return true;
            
        } catch (Exception $e) {
            error_log("Event broadcast error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get unprocessed events for a session since a specific time
     * 
     * @param int $sessionId - Session ID
     * @param int $lastEventId - Last event ID received by client
     * @return array Array of events
     */
    public function getEvents($sessionId, $lastEventId = 0) {
        try {
            $events = $this->db->select(
                "SELECT event_id, event_type, event_data, created_at
                 FROM session_events
                 WHERE session_id = ? AND event_id > ? AND processed = FALSE
                 ORDER BY event_id ASC
                 LIMIT 50",
                [$sessionId, $lastEventId]
            );
            
            // Decode JSON event_data for each event
            return array_map(function($event) {
                return [
                    'event_id' => (int) $event['event_id'],
                    'event_type' => $event['event_type'],
                    'event_data' => json_decode($event['event_data'], true),
                    'created_at' => $event['created_at']
                ];
            }, $events);
            
        } catch (Exception $e) {
            error_log("Get events error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Mark events as processed
     * 
     * @param array $eventIds - Array of event IDs to mark as processed
     */
    public function markEventsProcessed($eventIds) {
        if (empty($eventIds)) {
            return;
        }
        
        try {
            $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
            $this->db->execute(
                "UPDATE session_events
                 SET processed = TRUE, processed_at = NOW()
                 WHERE event_id IN ($placeholders)",
                $eventIds
            );
        } catch (Exception $e) {
            error_log("Mark events processed error: " . $e->getMessage());
        }
    }
    
    /**
     * Update user activity for a session
     * 
     * @param int $userId - User ID
     * @param int $sessionId - Session ID
     * @param int $lastEventId - Last event ID seen
     */
    public function updateUserActivity($userId, $sessionId, $lastEventId = 0) {
        try {
            $this->db->execute(
                "INSERT INTO user_session_activity 
                 (user_id, session_id, last_poll_at, last_event_id, is_online)
                 VALUES (?, ?, NOW(), ?, TRUE)
                 ON DUPLICATE KEY UPDATE 
                 last_poll_at = NOW(), 
                 last_event_id = GREATEST(last_event_id, ?),
                 is_online = TRUE",
                [$userId, $sessionId, $lastEventId, $lastEventId]
            );
        } catch (Exception $e) {
            error_log("Update user activity error: " . $e->getMessage());
        }
    }
    
    /**
     * Get online users in a session
     * 
     * @param int $sessionId - Session ID
     * @return array Array of online user IDs
     */
    public function getOnlineUsers($sessionId) {
        try {
            // Users who polled within last 30 seconds are considered online
            $users = $this->db->select(
                "SELECT usa.user_id, u.username
                 FROM user_session_activity usa
                 JOIN users u ON usa.user_id = u.user_id
                 WHERE usa.session_id = ? 
                 AND usa.last_poll_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
                 AND usa.is_online = TRUE",
                [$sessionId]
            );
            
            return array_map(function($user) {
                return [
                    'user_id' => (int) $user['user_id'],
                    'username' => $user['username']
                ];
            }, $users);
            
        } catch (Exception $e) {
            error_log("Get online users error: " . $e->getMessage());
            return [];
        }
    }
}

/**
 * Helper function to broadcast event (for use in API endpoints)
 * 
 * @param int $sessionId - Session ID
 * @param string $eventType - Event type
 * @param array $eventData - Event data
 * @param int|null $userId - User ID who triggered event
 */
function broadcastEvent($sessionId, $eventType, $eventData, $userId = null) {
    $broadcaster = new EventBroadcaster();
    return $broadcaster->broadcastEvent($sessionId, $eventType, $eventData, $userId);
}
?>

