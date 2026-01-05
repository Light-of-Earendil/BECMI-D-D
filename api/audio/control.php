<?php
/**
 * BECMI D&D Character Manager - Audio Control Endpoint
 * 
 * Controls audio playback (play, pause, stop, volume, loop)
 * Broadcasts real-time events to all session participants
 * DM only
 * 
 * Request: POST
 * Body: {
 *   "session_id": int,
 *   "action": "play" | "pause" | "stop" | "volume" | "loop",
 *   "track_id": int (optional, for play action),
 *   "playlist_id": int (optional, for play action),
 *   "volume": float (0-1, for volume action),
 *   "music_volume": float (0-1, for volume action),
 *   "sound_volume": float (0-1, for volume action),
 *   "loop": boolean (for loop action),
 *   "current_time": float (optional, for play action - current playback position in seconds)
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Audio control command executed"
 * }
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/event-broadcaster.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    $data = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (!isset($data['session_id']) || !is_numeric($data['session_id'])) {
        $errors['session_id'] = 'Valid session ID is required';
    }
    
    if (!isset($data['action']) || !in_array($data['action'], ['play', 'pause', 'stop', 'volume', 'loop'])) {
        $errors['action'] = 'Valid action is required (play, pause, stop, volume, or loop)';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $sessionId = (int) $data['session_id'];
    $action = $data['action'];
    
    // Verify session exists and user is DM
    $session = $db->selectOne(
        "SELECT session_id, dm_user_id 
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Only DM can control audio
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can control audio', 403);
    }
    
    // Prepare event data based on action
    $eventData = [
        'session_id' => $sessionId,
        'action' => $action
    ];
    
    if ($action === 'play') {
        // Validate play action
        if (!isset($data['track_id']) && !isset($data['playlist_id'])) {
            Security::sendValidationErrorResponse(['track_id' => 'Either track_id or playlist_id is required for play action']);
        }
        
        if (isset($data['track_id'])) {
            $trackId = (int) $data['track_id'];
            // Verify track exists and belongs to session
            $track = $db->selectOne(
                "SELECT track_id, track_name, track_type, file_path, duration_seconds
                 FROM session_audio_tracks
                 WHERE track_id = ? AND session_id = ?",
                [$trackId, $sessionId]
            );
            
            if (!$track) {
                Security::sendErrorResponse('Track not found or does not belong to this session', 404);
            }
            
            $eventData['track_id'] = $trackId;
            $eventData['track_name'] = $track['track_name'];
            $eventData['track_type'] = $track['track_type'];
            $filePath = $track['file_path'];
            // Ensure path starts with / and doesn't have public/ prefix
            $fileUrl = $filePath;
            if (strpos($filePath, 'public/') === 0) {
                $fileUrl = substr($filePath, 7); // Remove 'public/' prefix
            }
            if (strpos($fileUrl, '/') !== 0) {
                $fileUrl = '/' . $fileUrl;
            }
            $eventData['file_path'] = $fileUrl;
            $eventData['duration_seconds'] = $track['duration_seconds'];
        }
        
        if (isset($data['playlist_id'])) {
            $playlistId = (int) $data['playlist_id'];
            // Verify playlist exists and belongs to session
            $playlist = $db->selectOne(
                "SELECT playlist_id, playlist_name
                 FROM session_audio_playlists
                 WHERE playlist_id = ? AND session_id = ?",
                [$playlistId, $sessionId]
            );
            
            if (!$playlist) {
                Security::sendErrorResponse('Playlist not found or does not belong to this session', 404);
            }
            
            $eventData['playlist_id'] = $playlistId;
            $eventData['playlist_name'] = $playlist['playlist_name'];
            
            // Get first track in playlist
            $firstTrack = $db->selectOne(
                "SELECT t.track_id, t.track_name, t.track_type, t.file_path, t.duration_seconds
                 FROM session_audio_playlist_tracks pt
                 JOIN session_audio_tracks t ON pt.track_id = t.track_id
                 WHERE pt.playlist_id = ?
                 ORDER BY pt.track_order ASC
                 LIMIT 1",
                [$playlistId]
            );
            
            if ($firstTrack) {
                $eventData['track_id'] = (int) $firstTrack['track_id'];
                $eventData['track_name'] = $firstTrack['track_name'];
                $eventData['track_type'] = $firstTrack['track_type'];
                $filePath = $firstTrack['file_path'];
                // Ensure path starts with / and doesn't have public/ prefix
                $fileUrl = $filePath;
                if (strpos($filePath, 'public/') === 0) {
                    $fileUrl = substr($filePath, 7); // Remove 'public/' prefix
                }
                if (strpos($fileUrl, '/') !== 0) {
                    $fileUrl = '/' . $fileUrl;
                }
                $eventData['file_path'] = $fileUrl;
                $eventData['duration_seconds'] = $firstTrack['duration_seconds'];
                
                // Get all tracks in playlist for client-side playlist management
                $allTracks = $db->select(
                    "SELECT pt.playlist_track_id, pt.track_id, pt.track_order,
                            t.track_name, t.track_type, t.file_path, t.duration_seconds
                     FROM session_audio_playlist_tracks pt
                     JOIN session_audio_tracks t ON pt.track_id = t.track_id
                     WHERE pt.playlist_id = ?
                     ORDER BY pt.track_order ASC",
                    [$playlistId]
                );
                
                $formattedTracks = array_map(function($track) {
                    $filePath = $track['file_path'];
                    $fileUrl = $filePath;
                    if (strpos($filePath, 'public/') === 0) {
                        $fileUrl = substr($filePath, 7);
                    }
                    if (strpos($fileUrl, '/') !== 0) {
                        $fileUrl = '/' . $fileUrl;
                    }
                    
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
                }, $allTracks);
                
                $eventData['playlist_tracks'] = $formattedTracks;
                $eventData['is_playlist_looping'] = isset($data['is_playlist_looping']) ? (bool) $data['is_playlist_looping'] : false;
                $eventData['is_playlist_shuffled'] = isset($data['is_playlist_shuffled']) ? (bool) $data['is_playlist_shuffled'] : false;
            } else {
                Security::sendErrorResponse('Playlist is empty', 400);
            }
        }
        
        // Optional current_time for synchronization
        if (isset($data['current_time'])) {
            $eventData['current_time'] = (float) $data['current_time'];
        }
    }
    
    if ($action === 'volume') {
        // Validate volume action
        if (isset($data['volume'])) {
            $volume = (float) $data['volume'];
            if ($volume < 0 || $volume > 1) {
                Security::sendValidationErrorResponse(['volume' => 'Volume must be between 0 and 1']);
            }
            $eventData['volume'] = $volume;
        }
        
        if (isset($data['music_volume'])) {
            $musicVolume = (float) $data['music_volume'];
            if ($musicVolume < 0 || $musicVolume > 1) {
                Security::sendValidationErrorResponse(['music_volume' => 'Music volume must be between 0 and 1']);
            }
            $eventData['music_volume'] = $musicVolume;
        }
        
        if (isset($data['sound_volume'])) {
            $soundVolume = (float) $data['sound_volume'];
            if ($soundVolume < 0 || $soundVolume > 1) {
                Security::sendValidationErrorResponse(['sound_volume' => 'Sound volume must be between 0 and 1']);
            }
            $eventData['sound_volume'] = $soundVolume;
        }
        
        if (!isset($data['volume']) && !isset($data['music_volume']) && !isset($data['sound_volume'])) {
            Security::sendValidationErrorResponse(['volume' => 'At least one volume parameter is required for volume action']);
        }
    }
    
    if ($action === 'loop') {
        if (!isset($data['loop'])) {
            Security::sendValidationErrorResponse(['loop' => 'Loop value is required for loop action']);
        }
        $eventData['loop'] = (bool) $data['loop'];
    }
    
    // Broadcast event
    $eventType = 'audio_' . $action;
    $broadcastResult = broadcastEvent($sessionId, $eventType, $eventData, $userId);
    
    if (!$broadcastResult) {
        error_log("AUDIO CONTROL: Failed to broadcast event for session_id: $sessionId, action: $action");
        Security::sendErrorResponse('Failed to broadcast audio control event', 500);
    }
    
    Security::sendSuccessResponse(null, 'Audio control command executed successfully');
    
} catch (Exception $e) {
    error_log("AUDIO CONTROL ERROR: " . $e->getMessage());
    error_log("AUDIO CONTROL ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to execute audio control: ' . $e->getMessage(), 500);
}
?>
