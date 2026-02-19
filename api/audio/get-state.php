<?php
/**
 * BECMI D&D Character Manager - Get Audio State Endpoint
 *
 * Returns current synchronized audio state for a session.
 * Used by players joining mid-session.
 *
 * Request: GET
 * Query: session_id (required)
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

/**
 * Check whether a table exists in current schema.
 */
function audioStateTableExists(Database $db, string $tableName): bool {
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

/**
 * Resolve event table with backward-compatible fallback.
 * Prefer session_events, fallback to realtime_events.
 */
function resolveAudioEventTable(Database $db): ?string {
    if (audioStateTableExists($db, 'session_events')) {
        return 'session_events';
    }
    if (audioStateTableExists($db, 'realtime_events')) {
        return 'realtime_events';
    }
    return null;
}

/**
 * Get last event for session and type (optionally after event_id).
 */
function getLastSessionEvent(Database $db, string $eventTable, int $sessionId, string $eventType, ?int $afterEventId = null): ?array {
    $query = "SELECT event_id, event_data, created_at
              FROM {$eventTable}
              WHERE session_id = ?
              AND event_type = ?";
    $params = [$sessionId, $eventType];

    if ($afterEventId !== null) {
        $query .= " AND event_id > ?";
        $params[] = $afterEventId;
    }

    $query .= " ORDER BY event_id DESC LIMIT 1";
    return $db->selectOne($query, $params);
}

/**
 * Decode event JSON safely.
 */
function decodeEventData(?array $event): array {
    if (!$event || !isset($event['event_data'])) {
        return [];
    }
    $decoded = json_decode($event['event_data'], true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * First numeric key helper.
 */
function pickNumericValue(array $data, array $keys): ?float {
    foreach ($keys as $key) {
        if (array_key_exists($key, $data) && is_numeric($data[$key])) {
            return (float) $data[$key];
        }
    }
    return null;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();

    $db = getDB();
    $userId = Security::getCurrentUserId();
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : 0;

    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Session ID is required']);
    }

    $session = $db->selectOne(
        "SELECT session_id, dm_user_id,
                (SELECT COUNT(*) FROM session_players sp
                 WHERE sp.session_id = s.session_id
                 AND sp.user_id = ? AND sp.status IN ('accepted', 'invited')) as is_participant
         FROM game_sessions s
         WHERE s.session_id = ?",
        [$userId, $sessionId]
    );

    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }

    if ((int) $session['dm_user_id'] !== (int) $userId && (int) $session['is_participant'] === 0) {
        Security::sendErrorResponse('You do not have access to this session', 403);
    }

    $eventTable = resolveAudioEventTable($db);

    // Defaults returned when no events exist yet.
    $isPlaying = false;
    $isPaused = false;
    $stateData = [];
    $currentTime = null;
    $isLooping = false;
    $playlistTracks = null;

    $masterVolume = 0.6;
    $musicVolume = 0.33;
    $soundVolume = 1.0;
    $ambianceVolume = 1.0;

    $ambianceTrackId = null;
    $ambianceFilePath = null;

    if ($eventTable !== null) {
        $lastPlayEvent = getLastSessionEvent($db, $eventTable, $sessionId, 'audio_play');
        $lastPauseEvent = $lastPlayEvent
            ? getLastSessionEvent($db, $eventTable, $sessionId, 'audio_pause', (int) $lastPlayEvent['event_id'])
            : null;
        $lastStopEvent = $lastPlayEvent
            ? getLastSessionEvent($db, $eventTable, $sessionId, 'audio_stop', (int) $lastPlayEvent['event_id'])
            : null;

        $lastVolumeEvent = getLastSessionEvent($db, $eventTable, $sessionId, 'audio_volume');
        $lastLoopEvent = getLastSessionEvent($db, $eventTable, $sessionId, 'audio_loop');

        $lastAmbiancePlayEvent = getLastSessionEvent($db, $eventTable, $sessionId, 'ambiance_play');
        $lastAmbianceStopEvent = $lastAmbiancePlayEvent
            ? getLastSessionEvent($db, $eventTable, $sessionId, 'ambiance_stop', (int) $lastAmbiancePlayEvent['event_id'])
            : null;

        if ($lastPlayEvent) {
            $playData = decodeEventData($lastPlayEvent);
            $pauseData = decodeEventData($lastPauseEvent);

            if ($lastStopEvent) {
                $isPlaying = false;
                $isPaused = false;
            } elseif ($lastPauseEvent) {
                $isPlaying = true;
                $isPaused = true;
            } else {
                $isPlaying = true;
                $isPaused = false;
            }

            $stateData = $playData;

            if ($isPaused && isset($pauseData['current_time']) && is_numeric($pauseData['current_time'])) {
                $stateData['current_time'] = (float) $pauseData['current_time'];
            }
        }

        if ($isPlaying && !$isPaused && $lastPlayEvent) {
            $baseTime = isset($stateData['current_time']) && is_numeric($stateData['current_time'])
                ? (float) $stateData['current_time']
                : 0.0;
            $playTimestamp = strtotime($lastPlayEvent['created_at']);
            $elapsed = max(0, time() - $playTimestamp);
            $currentTime = $baseTime + $elapsed;
        } elseif ($isPaused && isset($stateData['current_time']) && is_numeric($stateData['current_time'])) {
            $currentTime = (float) $stateData['current_time'];
        }

        if ($lastVolumeEvent) {
            $volumeData = decodeEventData($lastVolumeEvent);

            $masterValue = pickNumericValue($volumeData, ['volume', 'master', 'master_volume']);
            $musicValue = pickNumericValue($volumeData, ['music_volume', 'music']);
            $soundValue = pickNumericValue($volumeData, ['sound_volume', 'sound']);
            $ambianceValue = pickNumericValue($volumeData, ['ambiance_volume', 'ambiance']);

            if ($masterValue !== null) {
                $masterVolume = $masterValue;
            }
            if ($musicValue !== null) {
                $musicVolume = $musicValue;
            }
            if ($soundValue !== null) {
                $soundVolume = $soundValue;
            }
            if ($ambianceValue !== null) {
                $ambianceVolume = $ambianceValue;
            }
        }

        if ($lastLoopEvent) {
            $loopData = decodeEventData($lastLoopEvent);
            if (array_key_exists('loop', $loopData)) {
                $isLooping = (bool) $loopData['loop'];
            }
        }

        if ($lastAmbiancePlayEvent && !$lastAmbianceStopEvent) {
            $ambianceData = decodeEventData($lastAmbiancePlayEvent);
            if (isset($ambianceData['track_id']) && is_numeric($ambianceData['track_id'])) {
                $ambianceTrackId = (int) $ambianceData['track_id'];
            }
            if (isset($ambianceData['file_path']) && is_string($ambianceData['file_path'])) {
                $ambianceFilePath = $ambianceData['file_path'];
            }
        }

        if (isset($stateData['playlist_tracks']) && is_array($stateData['playlist_tracks'])) {
            $playlistTracks = $stateData['playlist_tracks'];
        }
    }

    Security::sendSuccessResponse([
        'is_playing' => $isPlaying,
        'is_paused' => $isPaused,
        'track_id' => isset($stateData['track_id']) && is_numeric($stateData['track_id']) ? (int) $stateData['track_id'] : null,
        'playlist_id' => isset($stateData['playlist_id']) && is_numeric($stateData['playlist_id']) ? (int) $stateData['playlist_id'] : null,
        'track_name' => isset($stateData['track_name']) ? $stateData['track_name'] : null,
        'file_path' => isset($stateData['file_path']) ? $stateData['file_path'] : null,
        'current_time' => $currentTime,
        'duration_seconds' => isset($stateData['duration_seconds']) && is_numeric($stateData['duration_seconds']) ? (int) $stateData['duration_seconds'] : null,
        'is_looping' => $isLooping,
        'is_playlist_looping' => !empty($stateData['is_playlist_looping']),
        'is_playlist_shuffled' => !empty($stateData['is_playlist_shuffled']),
        'playlist_tracks' => $playlistTracks,
        'volume' => $masterVolume,
        'master_volume' => $masterVolume, // backward compatibility
        'music_volume' => $musicVolume,
        'sound_volume' => $soundVolume,
        'ambiance_volume' => $ambianceVolume,
        'ambiance_track_id' => $ambianceTrackId,
        'ambiance_file_path' => $ambianceFilePath
    ]);

} catch (Exception $e) {
    error_log("AUDIO GET STATE ERROR: " . $e->getMessage());
    error_log("AUDIO GET STATE ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to get audio state', 500);
}
?>
