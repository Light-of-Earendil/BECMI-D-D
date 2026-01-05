<?php
/**
 * BECMI D&D Character Manager - List Playlists Endpoint
 * 
 * Lists all playlists for a session with their tracks
 * 
 * Request: GET
 * Query: session_id (required)
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "playlists": [
 *       {
 *         "playlist_id": int,
 *         "playlist_name": string,
 *         "session_id": int,
 *         "created_at": string,
 *         "tracks": [
 *           {
 *             "playlist_track_id": int,
 *             "track_id": int,
 *             "track_order": int,
 *             "track": {
 *               "track_id": int,
 *               "track_name": string,
 *               "track_type": string,
 *               "file_path": string,
 *               "duration_seconds": int|null
 *             }
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

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
    
    if (!$sessionId) {
        Security::sendValidationErrorResponse(['session_id' => 'Session ID is required']);
    }
    
    // Verify session exists and user has access
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
    
    // Check access: DM or participant
    if ($session['dm_user_id'] != $userId && $session['is_participant'] == 0) {
        Security::sendErrorResponse('You do not have access to this session', 403);
    }
    
    // Get all playlists for session
    $playlists = $db->select(
        "SELECT playlist_id, session_id, playlist_name, created_at
         FROM session_audio_playlists
         WHERE session_id = ?
         ORDER BY playlist_name ASC",
        [$sessionId]
    );
    
    // Get tracks for each playlist
    $formattedPlaylists = array_map(function($playlist) use ($db) {
        $tracks = $db->select(
            "SELECT pt.playlist_track_id, pt.track_id, pt.track_order,
                    t.track_name, t.track_type, t.file_path, t.duration_seconds
             FROM session_audio_playlist_tracks pt
             JOIN session_audio_tracks t ON pt.track_id = t.track_id
             WHERE pt.playlist_id = ?
             ORDER BY pt.track_order ASC",
            [$playlist['playlist_id']]
        );
        
        $formattedTracks = array_map(function($track) {
            $filePath = $track['file_path'];
            $fileUrl = (strpos($filePath, '/') === 0) ? $filePath : '/' . $filePath;
            
            return [
                'playlist_track_id' => (int) $track['playlist_track_id'],
                'track_id' => (int) $track['track_id'],
                'track_order' => (int) $track['track_order'],
                'track' => [
                    'track_id' => (int) $track['track_id'],
                    'track_name' => $track['track_name'],
                    'track_type' => $track['track_type'],
                    'file_path' => $fileUrl,
                    'duration_seconds' => $track['duration_seconds'] !== null ? (int) $track['duration_seconds'] : null
                ]
            ];
        }, $tracks);
        
        return [
            'playlist_id' => (int) $playlist['playlist_id'],
            'playlist_name' => $playlist['playlist_name'],
            'session_id' => (int) $playlist['session_id'],
            'created_at' => $playlist['created_at'],
            'tracks' => $formattedTracks
        ];
    }, $playlists);
    
    Security::sendSuccessResponse([
        'playlists' => $formattedPlaylists
    ]);
    
} catch (Exception $e) {
    error_log("PLAYLIST LIST ERROR: " . $e->getMessage());
    error_log("PLAYLIST LIST ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to list playlists: ' . $e->getMessage(), 500);
}
?>
