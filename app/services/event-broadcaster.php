<?php
/**
 * BECMI D&D Character Manager - Event Broadcaster Service
 * 
 * Broadcasts events to session_events table for real-time updates.
 * Events are picked up by long-polling clients.
 */

require_once __DIR__ . '/../core/database.php';

/**
 * BECMI D&D Character Manager - Event Broadcaster Service
 * 
 * Broadcasts events to session_events table for real-time updates.
 * Events are picked up by long-polling clients via /api/realtime/poll.php.
 * 
 * @package app/services
 * @since 1.0.0
 */
class EventBroadcaster {
    /**
     * @var Database Database connection instance
     */
    private $db;
    
    /**
     * Creates a new EventBroadcaster instance.
     * Initializes database connection.
     * 
     * @return void
     * 
     * @example
     * $broadcaster = new EventBroadcaster();
     */
    public function __construct() {
        $this->db = getDB();
    }
    
    /**
     * Broadcast an event to all participants in a session.
     * Inserts event into session_events table with processed=FALSE for polling clients.
     * 
     * @param int $sessionId Session ID
     * @param string $eventType Event type (e.g., 'hp_change', 'item_given', 'hex_map_player_moved', 'hex_map_hexes_revealed')
     * @param array $eventData Event data (will be JSON encoded)
     * @param int|null $createdByUserId User who triggered the event (optional)
     * @return bool Success status (true on success, false on error)
     * 
     * @example
     * // Broadcast HP change event
     * $broadcaster = new EventBroadcaster();
     * $success = $broadcaster->broadcastEvent(
     *     5, 
     *     'hp_change', 
     *     ['character_id' => 10, 'old_hp' => 50, 'new_hp' => 45],
     *     $userId
     * );
     * 
     * **Event Types:**
     * - `hp_change` - Character HP changed
     * - `item_given` - Item given to character
     * - `hex_map_player_moved` - Player moved on hex map
     * - `hex_map_hexes_revealed` - DM revealed hexes
     * - Custom event types as needed
     * 
     * **Database:**
     * - Inserts into `session_events` table
     * - Sets `processed = FALSE` for polling clients
     * - Event data is JSON encoded
     * 
     * @see getEvents() - Retrieves events for polling clients
     * @see broadcastEvent() - Helper function for easy broadcasting
     * 
     * @since 1.0.0
     */
    public function broadcastEvent($sessionId, $eventType, $eventData, $createdByUserId = null) {
        // CRITICAL: Ensure no output is sent during broadcast
        $outputStarted = ob_get_level() > 0;
        if ($outputStarted) {
            // Clear any existing output buffers with safety counter to prevent infinite loops
            $maxIterations = 100; // Safety limit
            $iterations = 0;
            while (ob_get_level() > 0 && $iterations < $maxIterations) {
                ob_end_clean();
                $iterations++;
            }
            // If we hit the limit, log a warning but continue
            if ($iterations >= $maxIterations && ob_get_level() > 0) {
                @error_log("EventBroadcaster::broadcastEvent: Warning - Output buffer cleanup hit safety limit. Remaining levels: " . ob_get_level());
            }
        }
        
        try {
            $eventDataJson = json_encode($eventData);
            if ($eventDataJson === false) {
                @error_log("EventBroadcaster::broadcastEvent: JSON encode failed: " . json_last_error_msg());
                return false;
            }
            
            @error_log("EventBroadcaster::broadcastEvent: session_id=$sessionId, event_type=$eventType, event_data_length=" . strlen($eventDataJson));
            
            // Insert event into session_events table
            $this->db->execute(
                "INSERT INTO session_events 
                 (session_id, event_type, event_data, created_by_user_id, processed)
                 VALUES (?, ?, ?, ?, FALSE)",
                [
                    $sessionId,
                    $eventType,
                    $eventDataJson,
                    $createdByUserId
                ]
            );
            
            $eventId = $this->db->lastInsertId();
            @error_log("EventBroadcaster::broadcastEvent: Event inserted with ID: $eventId");
            
            // CRITICAL: Clear any output that might have been generated
            if (ob_get_level() > 0) {
                ob_clean();
            }
            
            return true;
            
        } catch (Exception $e) {
            @error_log("Event broadcast error: " . $e->getMessage());
            @error_log("Event broadcast error trace: " . $e->getTraceAsString());
            
            // CRITICAL: Clear any output from error
            if (ob_get_level() > 0) {
                ob_clean();
            }
            
            return false;
        }
    }
    
    /**
     * Get unprocessed events for a session since a specific event ID.
     * Used by long-polling clients to retrieve new events.
     * 
     * @param int $sessionId Session ID
     * @param int $lastEventId Last event ID received by client (default: 0 for all events)
     * @return array Array of event objects, each with:
     *   - `event_id` (int) - Event ID
     *   - `event_type` (string) - Event type
     *   - `event_data` (array) - Decoded JSON event data
     *   - `created_at` (string) - Event timestamp
     * 
     * @example
     * // Get events since event ID 100
     * $events = $broadcaster->getEvents(5, 100);
     * foreach ($events as $event) {
     *   echo "Event: {$event['event_type']}\n";
     * }
     * 
     * **Limit:**
     * - Maximum 50 events per request (to prevent large responses)
     * 
     * **Event Processing:**
     * - Events are returned with `processed = FALSE`
     * - Client should call `markEventsProcessed()` after processing
     * 
     * @see markEventsProcessed() - Marks events as processed
     * @see /api/realtime/poll.php - Endpoint that calls this
     * 
     * @since 1.0.0
     */
    public function getEvents($sessionId, $lastEventId = 0) {
        try {
            error_log("EventBroadcaster::getEvents: session_id=$sessionId, lastEventId=$lastEventId");
            $events = $this->db->select(
                "SELECT event_id, event_type, event_data, created_at
                 FROM session_events
                 WHERE session_id = ? AND event_id > ? AND processed = FALSE
                 ORDER BY event_id ASC
                 LIMIT 50",
                [$sessionId, $lastEventId]
            );
            error_log("EventBroadcaster::getEvents: Found " . count($events) . " events");
            
            // Decode JSON event_data for each event
            $formattedEvents = array_map(function($event) {
                $decodedData = json_decode($event['event_data'], true);
                @error_log("EventBroadcaster::getEvents: Returning event_id={$event['event_id']}, event_type={$event['event_type']}, data_keys=" . (is_array($decodedData) ? implode(',', array_keys($decodedData)) : 'not_array'));
                return [
                    'event_id' => (int) $event['event_id'],
                    'event_type' => $event['event_type'],
                    'event_data' => $decodedData,
                    'created_at' => $event['created_at']
                ];
            }, $events);
            
            return $formattedEvents;
            
        } catch (Exception $e) {
            error_log("Get events error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Mark events as processed.
     * Sets processed=TRUE and processed_at=NOW() for specified event IDs.
     * 
     * @param array $eventIds Array of event IDs to mark as processed
     * @return void
     * 
     * @example
     * // Mark events 100, 101, 102 as processed
     * $broadcaster->markEventsProcessed([100, 101, 102]);
     * 
     * **Side Effects:**
     * - Sets `processed = TRUE` in database
     * - Sets `processed_at = NOW()` in database
     * 
     * **Note:**
     * Empty arrays are handled gracefully (no database query executed).
     * 
     * @see getEvents() - Returns events that need to be processed
     * 
     * @since 1.0.0
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
     * Update user activity for a session (for online status tracking).
     * Updates or inserts record in user_session_activity table.
     * 
     * @param int $userId User ID
     * @param int $sessionId Session ID
     * @param int $lastEventId Last event ID seen by user (default: 0)
     * @return void
     * 
     * @example
     * // Update activity for user 5 in session 10, last seen event 150
     * $broadcaster->updateUserActivity(5, 10, 150);
     * 
     * **Side Effects:**
     * - Updates `user_session_activity` table
     * - Sets `is_online = TRUE`
     * - Sets `last_poll_at = NOW()`
     * - Updates `last_event_id` to maximum of current and provided value
     * 
     * **Online Status:**
     * - Users who polled within last 30 seconds are considered online
     * - Used by `getOnlineUsers()` to show who's currently active
     * 
     * @see getOnlineUsers() - Gets list of online users
     * @see /api/realtime/poll.php - Called on each poll
     * 
     * @since 1.0.0
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
     * Get online users in a session (polled within last 30 seconds).
     * Returns array of user objects with user_id and username.
     * 
     * @param int $sessionId Session ID
     * @return array Array of user objects, each with:
     *   - `user_id` (int) - User ID
     *   - `username` (string) - Username
     * 
     * @example
     * // Get online users in session 5
     * $onlineUsers = $broadcaster->getOnlineUsers(5);
     * foreach ($onlineUsers as $user) {
     *   echo "Online: {$user['username']}\n";
     * }
     * 
     * **Online Criteria:**
     * - User must have polled within last 30 seconds
     * - `is_online = TRUE` in database
     * 
     * **Use Cases:**
     * - DM dashboard: Show who's currently active
     * - Session management: Display online status
     * 
     * @see updateUserActivity() - Updates user activity on each poll
     * 
     * @since 1.0.0
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
 * Helper function to broadcast event (for use in API endpoints).
 * Convenience wrapper around EventBroadcaster::broadcastEvent().
 * 
 * @param int $sessionId Session ID
 * @param string $eventType Event type (e.g., 'hp_change', 'item_given', 'hex_map_player_moved')
 * @param array $eventData Event data (will be JSON encoded)
 * @param int|null $userId User ID who triggered event (optional)
 * @return bool Success status
 * 
 * @example
 * // Broadcast event from API endpoint
 * broadcastEvent($sessionId, 'hp_change', ['character_id' => 1, 'new_hp' => 50], $userId);
 * 
 * **Usage:**
 * This helper function is used throughout API endpoints to broadcast events
 * without needing to instantiate EventBroadcaster manually.
 * 
 * @see EventBroadcaster::broadcastEvent() - Actual implementation
 * 
 * @since 1.0.0
 */
function broadcastEvent($sessionId, $eventType, $eventData, $userId = null) {
    $broadcaster = new EventBroadcaster();
    return $broadcaster->broadcastEvent($sessionId, $eventType, $eventData, $userId);
}

