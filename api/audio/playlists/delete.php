<?php
/**
 * BECMI D&D Character Manager - Delete Playlist Endpoint
 * 
 * Deletes a playlist and all its track associations
 * DM only
 * 
 * Request: DELETE
 * Query: playlist_id (required)
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Playlist deleted successfully"
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get playlist_id from query parameters
    $playlistId = isset($_GET['playlist_id']) ? (int) $_GET['playlist_id'] : null;
    
    if (!$playlistId) {
        Security::sendValidationErrorResponse(['playlist_id' => 'Playlist ID is required']);
    }
    
    // Get playlist and verify access
    $playlist = $db->selectOne(
        "SELECT p.playlist_id, s.dm_user_id
         FROM session_audio_playlists p
         JOIN game_sessions s ON p.session_id = s.session_id
         WHERE p.playlist_id = ?",
        [$playlistId]
    );
    
    if (!$playlist) {
        Security::sendErrorResponse('Playlist not found', 404);
    }
    
    // Only DM can delete playlists
    if ($playlist['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can delete playlists', 403);
    }
    
    // Delete playlist (cascade will delete tracks)
    $db->execute(
        "DELETE FROM session_audio_playlists WHERE playlist_id = ?",
        [$playlistId]
    );
    
    Security::sendSuccessResponse(null, 'Playlist deleted successfully');
    
} catch (Exception $e) {
    error_log("PLAYLIST DELETE ERROR: " . $e->getMessage());
    error_log("PLAYLIST DELETE ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to delete playlist: ' . $e->getMessage(), 500);
}
?>
