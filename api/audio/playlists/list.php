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
require_once '../../../app/services/audio-library.php';

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
    
    $audioLibrary = getAudioLibraryContext($db, $sessionId);
    if (!$audioLibrary) {
        Security::sendErrorResponse('Session not found', 404);
    }

    $scopeSessionIds = $audioLibrary['scope_session_ids'];
    $placeholders = buildAudioLibraryPlaceholders($scopeSessionIds);

    // Get all playlists for session or linked campaign sessions
    $playlists = $db->select(
        "SELECT p.playlist_id, p.session_id, p.playlist_name, p.created_at, s.session_title
         FROM session_audio_playlists p
         JOIN game_sessions s ON p.session_id = s.session_id
         WHERE p.session_id IN ($placeholders)
         ORDER BY CASE WHEN p.session_id = ? THEN 0 ELSE 1 END, s.session_title ASC, p.playlist_name ASC",
        array_merge($scopeSessionIds, [$sessionId])
    );
    
    // Get tracks for each playlist
    $formattedPlaylists = array_map(function($playlist) use ($db, $audioLibrary, $sessionId) {
        $tracks = $db->select(
            "SELECT pt.playlist_track_id, pt.track_id, pt.track_order,
                    t.track_name, t.track_type, t.file_path, t.duration_seconds,
                    t.session_id, s.session_title
             FROM session_audio_playlist_tracks pt
             JOIN session_audio_tracks t ON pt.track_id = t.track_id
             JOIN game_sessions s ON t.session_id = s.session_id
             WHERE pt.playlist_id = ?
             ORDER BY pt.track_order ASC",
            [$playlist['playlist_id']]
        );
        
        $formattedTracks = array_map(function($track) {
            $fileUrl = normalizeAudioPublicPath($track['file_path']);
            
            return [
                'playlist_track_id' => (int) $track['playlist_track_id'],
                'track_id' => (int) $track['track_id'],
                'track_order' => (int) $track['track_order'],
                'source_session_id' => (int) $track['session_id'],
                'source_session_title' => $track['session_title'],
                'track' => [
                    'track_id' => (int) $track['track_id'],
                    'track_name' => $track['track_name'],
                    'track_type' => $track['track_type'],
                    'file_path' => $fileUrl,
                    'duration_seconds' => $track['duration_seconds'] !== null ? (int) $track['duration_seconds'] : null,
                    'source_session_id' => (int) $track['session_id'],
                    'source_session_title' => $track['session_title'],
                    'is_shared_from_campaign' => $audioLibrary['scope_type'] === 'campaign' && (int) $track['session_id'] !== $sessionId
                ]
            ];
        }, $tracks);
        
        return [
            'playlist_id' => (int) $playlist['playlist_id'],
            'playlist_name' => $playlist['playlist_name'],
            'session_id' => (int) $playlist['session_id'],
            'source_session_id' => (int) $playlist['session_id'],
            'source_session_title' => $playlist['session_title'],
            'is_shared_from_campaign' => $audioLibrary['scope_type'] === 'campaign' && (int) $playlist['session_id'] !== $sessionId,
            'created_at' => $playlist['created_at'],
            'tracks' => $formattedTracks
        ];
    }, $playlists);
    
    Security::sendSuccessResponse([
        'playlists' => $formattedPlaylists,
        'library_scope' => [
            'type' => $audioLibrary['scope_type'],
            'campaign_id' => $audioLibrary['campaign_id'],
            'session_id' => $audioLibrary['session_id'],
            'session_title' => $audioLibrary['session_title'],
            'shared_session_count' => count($audioLibrary['scope_session_ids'])
        ]
    ]);
    
} catch (Exception $e) {
    error_log("PLAYLIST LIST ERROR: " . $e->getMessage());
    error_log("PLAYLIST LIST ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to list playlists: ' . $e->getMessage(), 500);
}
?>
