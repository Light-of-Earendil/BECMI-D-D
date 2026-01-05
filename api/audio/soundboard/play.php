<?php
/**
 * BECMI D&D Character Manager - Soundboard Play Endpoint
 * 
 * Plays a sound effect via soundboard
 * Broadcasts real-time event to all session participants
 * DM only
 * 
 * Request: POST
 * Body: {
 *   "session_id": int,
 *   "track_id": int,
 *   "volume": float (0-1, optional, defaults to 1.0)
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Sound effect played"
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';
require_once '../../../app/services/event-broadcaster.php';

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
    
    if (!isset($data['track_id']) || !is_numeric($data['track_id'])) {
        $errors['track_id'] = 'Valid track ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $sessionId = (int) $data['session_id'];
    $trackId = (int) $data['track_id'];
    $volume = isset($data['volume']) ? (float) $data['volume'] : 1.0;
    
    // Validate volume
    if ($volume < 0 || $volume > 1) {
        Security::sendValidationErrorResponse(['volume' => 'Volume must be between 0 and 1']);
    }
    
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
    
    // Only DM can play sound effects
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can play sound effects', 403);
    }
    
    // Verify track exists, belongs to session, and is a sound effect
    $track = $db->selectOne(
        "SELECT track_id, track_name, track_type, file_path, duration_seconds
         FROM session_audio_tracks
         WHERE track_id = ? AND session_id = ? AND track_type = 'sound'",
        [$trackId, $sessionId]
    );
    
    if (!$track) {
        Security::sendErrorResponse('Sound effect not found or does not belong to this session', 404);
    }
    
    // Prepare event data
    $filePath = $track['file_path'];
    $fileUrl = (strpos($filePath, '/') === 0) ? $filePath : '/' . $filePath;
    
    $eventData = [
        'session_id' => $sessionId,
        'track_id' => $trackId,
        'track_name' => $track['track_name'],
        'file_path' => $fileUrl,
        'volume' => $volume,
        'duration_seconds' => $track['duration_seconds']
    ];
    
    // Broadcast event
    $broadcastResult = broadcastEvent($sessionId, 'soundboard_play', $eventData, $userId);
    
    if (!$broadcastResult) {
        error_log("SOUNDBOARD PLAY: Failed to broadcast event for session_id: $sessionId, track_id: $trackId");
        Security::sendErrorResponse('Failed to broadcast soundboard play event', 500);
    }
    
    Security::sendSuccessResponse(null, 'Sound effect played successfully');
    
} catch (Exception $e) {
    error_log("SOUNDBOARD PLAY ERROR: " . $e->getMessage());
    error_log("SOUNDBOARD PLAY ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to play sound effect: ' . $e->getMessage(), 500);
}
?>
