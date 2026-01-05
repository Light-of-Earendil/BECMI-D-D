<?php
/**
 * BECMI D&D Character Manager - Create Playlist Endpoint
 * 
 * Creates a new playlist for a session
 * DM only
 * 
 * Request: POST
 * Body: {
 *   "session_id": int,
 *   "playlist_name": string
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "playlist_id": int,
 *     "playlist_name": string,
 *     "session_id": int,
 *     "created_at": string
 *   }
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

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
    
    if (!isset($data['playlist_name']) || trim($data['playlist_name']) === '') {
        $errors['playlist_name'] = 'Playlist name is required';
    } elseif (strlen(trim($data['playlist_name'])) > 200) {
        $errors['playlist_name'] = 'Playlist name must be 200 characters or less';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $sessionId = (int) $data['session_id'];
    $playlistName = trim($data['playlist_name']);
    
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
    
    // Only DM can create playlists
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can create playlists', 403);
    }
    
    // Insert playlist
    $playlistId = $db->insert(
        "INSERT INTO session_audio_playlists (session_id, playlist_name, created_by_user_id)
         VALUES (?, ?, ?)",
        [$sessionId, $playlistName, $userId]
    );
    
    // Get created playlist
    $playlist = $db->selectOne(
        "SELECT playlist_id, session_id, playlist_name, created_at
         FROM session_audio_playlists
         WHERE playlist_id = ?",
        [$playlistId]
    );
    
    Security::sendSuccessResponse([
        'playlist_id' => (int) $playlist['playlist_id'],
        'playlist_name' => $playlist['playlist_name'],
        'session_id' => (int) $playlist['session_id'],
        'created_at' => $playlist['created_at']
    ], 'Playlist created successfully');
    
} catch (Exception $e) {
    error_log("PLAYLIST CREATE ERROR: " . $e->getMessage());
    error_log("PLAYLIST CREATE ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to create playlist: ' . $e->getMessage(), 500);
}
?>
