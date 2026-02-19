<?php
/**
 * BECMI D&D Character Manager - Ambiance Play Endpoint
 * 
 * Plays an ambiance sound (looping background audio)
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
 *   "message": "Ambiance played"
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
    
    // Only DM can play ambiance
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can play ambiance', 403);
    }
    
    // Get track info
    $track = $db->selectOne(
        "SELECT track_id, track_name, track_type, file_path, duration_seconds
         FROM session_audio_tracks
         WHERE track_id = ? AND session_id = ? AND track_type = 'ambiance'",
        [$trackId, $sessionId]
    );
    
    if (!$track) {
        Security::sendErrorResponse('Ambiance track not found', 404);
    }
    
    // Normalize file path (ensure it starts with / and remove public/ prefix if present)
    $filePath = $track['file_path'];
    if (strpos($filePath, 'public/') === 0) {
        $filePath = substr($filePath, 7); // Remove 'public/' prefix
    }
    if (strpos($filePath, '/') !== 0) {
        $filePath = '/' . $filePath;
    }
    
    // Broadcast real-time event
    $broadcaster = new EventBroadcaster();
    $eventData = [
        'session_id' => $sessionId,
        'track_id' => $trackId,
        'track_name' => $track['track_name'],
        'file_path' => $filePath,
        'volume' => $volume,
        'duration_seconds' => $track['duration_seconds']
    ];
    
    $broadcastResult = broadcastEvent($sessionId, 'ambiance_play', $eventData, $userId);
    
    if (!$broadcastResult) {
        error_log("AMBIANCE PLAY: Failed to broadcast event for session_id: $sessionId, track_id: $trackId");
        Security::sendErrorResponse('Failed to broadcast ambiance play event', 500);
    }
    
    Security::sendSuccessResponse(null, 'Ambiance played successfully');
    
} catch (Exception $e) {
    error_log("AMBIANCE PLAY ERROR: " . $e->getMessage());
    error_log("AMBIANCE PLAY ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to play ambiance: ' . $e->getMessage(), 500);
}
?>
