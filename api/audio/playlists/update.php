<?php
/**
 * BECMI D&D Character Manager - Update Playlist Endpoint
 * 
 * Updates a playlist (add/remove tracks, reorder, rename)
 * DM only
 * 
 * Request: PUT
 * Body: {
 *   "playlist_id": int,
 *   "playlist_name": string (optional),
 *   "tracks": [
 *     {
 *       "track_id": int,
 *       "track_order": int
 *     }
 *   ] (optional - if provided, replaces all tracks)
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "playlist_id": int,
 *     "playlist_name": string,
 *     "tracks": [...]
 *   }
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';
require_once '../../../app/services/audio-library.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    $data = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (!isset($data['playlist_id']) || !is_numeric($data['playlist_id'])) {
        $errors['playlist_id'] = 'Valid playlist ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $playlistId = (int) $data['playlist_id'];
    
    // Get playlist and verify access
    $playlist = $db->selectOne(
        "SELECT p.playlist_id, p.session_id, p.playlist_name, s.dm_user_id
         FROM session_audio_playlists p
         JOIN game_sessions s ON p.session_id = s.session_id
         WHERE p.playlist_id = ?",
        [$playlistId]
    );
    
    if (!$playlist) {
        Security::sendErrorResponse('Playlist not found', 404);
    }
    
    // Only DM can update playlists
    if ($playlist['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can update playlists', 403);
    }

    $audioLibrary = getAudioLibraryContext($db, (int) $playlist['session_id']);
    if (!$audioLibrary) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Update playlist name if provided
    if (isset($data['playlist_name'])) {
        $playlistName = trim($data['playlist_name']);
        if (strlen($playlistName) === 0) {
            Security::sendValidationErrorResponse(['playlist_name' => 'Playlist name cannot be empty']);
        }
        if (strlen($playlistName) > 200) {
            Security::sendValidationErrorResponse(['playlist_name' => 'Playlist name must be 200 characters or less']);
        }
        
        $db->execute(
            "UPDATE session_audio_playlists SET playlist_name = ? WHERE playlist_id = ?",
            [$playlistName, $playlistId]
        );
    }
    
    // Update tracks if provided
    if (isset($data['tracks']) && is_array($data['tracks'])) {
        // Delete existing tracks
        $db->execute(
            "DELETE FROM session_audio_playlist_tracks WHERE playlist_id = ?",
            [$playlistId]
        );
        
        // Verify all tracks belong to the same campaign-scoped library when available
        if (!empty($data['tracks'])) {
            $trackIds = array_map(function($t) {
                return (int) $t['track_id'];
            }, $data['tracks']);

            $scopeSessionIds = $audioLibrary['scope_session_ids'];
            $trackIdPlaceholders = implode(',', array_fill(0, count($trackIds), '?'));
            $scopePlaceholders = buildAudioLibraryPlaceholders($scopeSessionIds);
            
            $validTracks = $db->select(
                "SELECT track_id FROM session_audio_tracks 
                 WHERE track_id IN ($trackIdPlaceholders)
                 AND session_id IN ($scopePlaceholders)",
                array_merge($trackIds, $scopeSessionIds)
            );
            
            $validTrackIds = array_map(function($t) {
                return (int) $t['track_id'];
            }, $validTracks);
            
            // Insert new tracks
            foreach ($data['tracks'] as $index => $track) {
                $trackId = (int) $track['track_id'];
                $trackOrder = isset($track['track_order']) ? (int) $track['track_order'] : $index;
                
                // Only add if track is valid and belongs to session
                if (in_array($trackId, $validTrackIds)) {
                    $db->insert(
                        "INSERT INTO session_audio_playlist_tracks (playlist_id, track_id, track_order)
                         VALUES (?, ?, ?)",
                        [$playlistId, $trackId, $trackOrder]
                    );
                }
            }
        }
    }
    
    // Get updated playlist with tracks
    $updatedPlaylist = $db->selectOne(
        "SELECT playlist_id, session_id, playlist_name, created_at
         FROM session_audio_playlists
         WHERE playlist_id = ?",
        [$playlistId]
    );
    
    $tracks = $db->select(
        "SELECT pt.playlist_track_id, pt.track_id, pt.track_order,
                t.track_name, t.track_type, t.file_path, t.duration_seconds,
                t.session_id, s.session_title
         FROM session_audio_playlist_tracks pt
         JOIN session_audio_tracks t ON pt.track_id = t.track_id
         JOIN game_sessions s ON t.session_id = s.session_id
         WHERE pt.playlist_id = ?
         ORDER BY pt.track_order ASC",
        [$playlistId]
    );
    
    $formattedTracks = array_map(function($track) use ($audioLibrary, $playlist) {
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
                'is_shared_from_campaign' => $audioLibrary['scope_type'] === 'campaign' && (int) $track['session_id'] !== (int) $playlist['session_id']
            ]
        ];
    }, $tracks);
    
    Security::sendSuccessResponse([
        'playlist_id' => (int) $updatedPlaylist['playlist_id'],
        'playlist_name' => $updatedPlaylist['playlist_name'],
        'session_id' => (int) $updatedPlaylist['session_id'],
        'tracks' => $formattedTracks
    ], 'Playlist updated successfully');
    
} catch (Exception $e) {
    error_log("PLAYLIST UPDATE ERROR: " . $e->getMessage());
    error_log("PLAYLIST UPDATE ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to update playlist: ' . $e->getMessage(), 500);
}
?>
