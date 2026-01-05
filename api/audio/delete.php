<?php
/**
 * BECMI D&D Character Manager - Audio Track Delete Endpoint
 * 
 * Deletes an audio track and its file
 * DM only
 * 
 * Request: DELETE
 * Query: track_id (required)
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Audio track deleted successfully"
 * }
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get track_id from query parameters
    $trackId = isset($_GET['track_id']) ? (int) $_GET['track_id'] : null;
    
    if (!$trackId) {
        Security::sendValidationErrorResponse(['track_id' => 'Track ID is required']);
    }
    
    // Get track and verify access
    $track = $db->selectOne(
        "SELECT t.track_id, t.session_id, t.file_path, s.dm_user_id
         FROM session_audio_tracks t
         JOIN game_sessions s ON t.session_id = s.session_id
         WHERE t.track_id = ?",
        [$trackId]
    );
    
    if (!$track) {
        Security::sendErrorResponse('Audio track not found', 404);
    }
    
    // Only DM can delete tracks
    if ($track['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can delete audio tracks', 403);
    }
    
    // Delete audio file if it exists
    $filePath = dirname(dirname(__DIR__)) . '/public/' . $track['file_path'];
    if (file_exists($filePath)) {
        @unlink($filePath);
    }
    
    // Delete track (cascade will delete from playlists)
    $db->execute(
        "DELETE FROM session_audio_tracks WHERE track_id = ?",
        [$trackId]
    );
    
    Security::sendSuccessResponse(null, 'Audio track deleted successfully');
    
} catch (Exception $e) {
    error_log("AUDIO DELETE ERROR: " . $e->getMessage());
    error_log("AUDIO DELETE ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to delete audio track: ' . $e->getMessage(), 500);
}
?>
