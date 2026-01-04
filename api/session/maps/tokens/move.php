<?php
/**
 * BECMI D&D Character Manager - Session Map Token Move Endpoint
 * 
 * Updates token position
 */

require_once '../../../../app/core/database.php';
require_once '../../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    $tokenId = isset($data['token_id']) ? (int) $data['token_id'] : null;
    $xPosition = isset($data['x_position']) ? (float) $data['x_position'] : null;
    $yPosition = isset($data['y_position']) ? (float) $data['y_position'] : null;
    
    if (!$tokenId) {
        Security::sendValidationErrorResponse(['token_id' => 'Token ID is required']);
    }
    
    if ($xPosition === null || $yPosition === null) {
        Security::sendValidationErrorResponse(['x_position' => 'X and Y positions are required']);
    }
    
    // Get token and verify access
    $token = $db->selectOne(
        "SELECT t.token_id, t.map_id, t.user_id, m.session_id, s.dm_user_id,
                (SELECT COUNT(*) FROM session_players sp 
                 WHERE sp.session_id = m.session_id 
                 AND sp.user_id = ? AND sp.status = 'accepted') as is_participant
         FROM session_map_tokens t
         JOIN session_maps m ON t.map_id = m.map_id
         JOIN game_sessions s ON m.session_id = s.session_id
         WHERE t.token_id = ?",
        [$userId, $tokenId]
    );
    
    if (!$token) {
        Security::sendErrorResponse('Token not found', 404);
    }
    
    // Verify user has access to session (DM or participant)
    if ($token['dm_user_id'] != $userId && $token['is_participant'] == 0) {
        Security::sendErrorResponse('You do not have access to this session', 403);
    }
    
    // User can move their own tokens, or DM can move any token
    if ($token['user_id'] != $userId && $token['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to move this token', 403);
    }
    
    // Update token position
    $db->execute(
        "UPDATE session_map_tokens 
         SET x_position = ?, y_position = ?, updated_at = NOW()
         WHERE token_id = ?",
        [$xPosition, $yPosition, $tokenId]
    );
    
    // Get updated token for character_id
    $updatedToken = $db->selectOne(
        "SELECT character_id FROM session_map_tokens WHERE token_id = ?",
        [$tokenId]
    );
    
    // Broadcast event
    try {
        require_once '../../../../app/services/event-broadcaster.php';
        $broadcastResult = broadcastEvent(
            $token['session_id'],
            'map_token_moved',
            [
                'token_id' => $tokenId,
                'map_id' => $token['map_id'],
                'character_id' => $updatedToken['character_id'],
                'x_position' => $xPosition,
                'y_position' => $yPosition,
                'user_id' => $userId
            ],
            $userId
        );
        if (!$broadcastResult) {
            error_log("MAP TOKEN MOVE: Failed to broadcast event for token_id: $tokenId");
        }
    } catch (Exception $broadcastError) {
        // Log broadcast error but don't fail the request
        error_log("MAP TOKEN MOVE: Broadcast error: " . $broadcastError->getMessage());
    }
    
    Security::sendSuccessResponse([
        'token_id' => $tokenId,
        'x_position' => $xPosition,
        'y_position' => $yPosition
    ], 'Token moved successfully');
    
} catch (Exception $e) {
    error_log('Session map token move error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while moving token', 500);
}
