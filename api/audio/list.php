<?php
/**
 * BECMI D&D Character Manager - Audio Tracks List Endpoint
 * 
 * Lists all audio tracks for a session, optionally filtered by type
 * 
 * Request: GET
 * Query: session_id (required), track_type (optional: 'music' or 'sound')
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "tracks": [
 *       {
 *         "track_id": int,
 *         "session_id": int,
 *         "track_name": string,
 *         "track_type": string,
 *         "file_path": string,
 *         "duration_seconds": int|null,
 *         "file_size_bytes": int,
 *         "created_at": string
 *       }
 *     ]
 *   }
 * }
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get session_id from query parameters
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : null;
    $trackType = isset($_GET['track_type']) ? trim($_GET['track_type']) : null;
    
    if (!$sessionId) {
        Security::sendValidationErrorResponse(['session_id' => 'Session ID is required']);
    }
    
    // Validate track_type if provided
    if ($trackType && !in_array($trackType, ['music', 'sound'])) {
        Security::sendValidationErrorResponse(['track_type' => 'Track type must be "music" or "sound"']);
    }
    
    // Verify session exists and user has access
    $session = $db->selectOne(
        "SELECT session_id, session_title, dm_user_id,
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
    
    // Check access: DM or participant
    if ($session['dm_user_id'] != $userId && $session['is_participant'] == 0) {
        Security::sendErrorResponse('You do not have access to this session', 403);
    }
    
    // Build query with optional type filter
    $query = "SELECT track_id, session_id, file_path, track_name, track_type, 
                     duration_seconds, file_size_bytes, created_at
              FROM session_audio_tracks
              WHERE session_id = ?";
    $params = [$sessionId];
    
    if ($trackType) {
        $query .= " AND track_type = ?";
        $params[] = $trackType;
    }
    
    $query .= " ORDER BY track_type ASC, track_name ASC";
    
    // Get all tracks for session
    $tracks = $db->select($query, $params);
    
    // Format response - ensure file_path is correct URL
    $formattedTracks = array_map(function($track) {
        $filePath = $track['file_path'];
        // Ensure path starts with / and doesn't have public/ prefix
        $fileUrl = $filePath;
        if (strpos($filePath, 'public/') === 0) {
            $fileUrl = substr($filePath, 7); // Remove 'public/' prefix
        }
        if (strpos($fileUrl, '/') !== 0) {
            $fileUrl = '/' . $fileUrl;
        }
        
        // Verify file exists
        $fullPath = dirname(dirname(__DIR__)) . '/public' . $fileUrl;
        $fileExists = file_exists($fullPath);
        
        if (!$fileExists) {
            error_log("AUDIO LIST: File not found at path: $fullPath (URL: $fileUrl, DB path: $filePath)");
        }
        
        return [
            'track_id' => (int) $track['track_id'],
            'session_id' => (int) $track['session_id'],
            'track_name' => $track['track_name'],
            'track_type' => $track['track_type'],
            'file_path' => $fileUrl,
            'file_exists' => $fileExists,
            'duration_seconds' => $track['duration_seconds'] !== null ? (int) $track['duration_seconds'] : null,
            'file_size_bytes' => (int) $track['file_size_bytes'],
            'created_at' => $track['created_at']
        ];
    }, $tracks);
    
    Security::sendSuccessResponse([
        'tracks' => $formattedTracks
    ]);
    
} catch (Exception $e) {
    error_log("AUDIO LIST ERROR: " . $e->getMessage());
    error_log("AUDIO LIST ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to list audio tracks: ' . $e->getMessage(), 500);
}
?>
