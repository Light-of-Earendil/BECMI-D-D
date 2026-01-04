<?php
/**
 * BECMI D&D Character Manager - Session Map Token Delete Endpoint
 * 
 * Removes a token from a map
 */

require_once '../../../../app/core/database.php';
require_once '../../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get token_id from query parameters or JSON body
    $tokenId = null;
    
    if (isset($_GET['token_id'])) {
        $tokenId = (int) $_GET['token_id'];
    } else {
        $data = Security::validateJSONInput();
        if (isset($data['token_id'])) {
            $tokenId = (int) $data['token_id'];
        }
    }
    
    if (!$tokenId) {
        Security::sendValidationErrorResponse(['token_id' => 'Token ID is required']);
    }
    
    // Get token and verify access
    $token = $db->selectOne(
        "SELECT t.token_id, t.map_id, t.user_id, m.session_id, s.dm_user_id
         FROM session_map_tokens t
         JOIN session_maps m ON t.map_id = m.map_id
         JOIN game_sessions s ON m.session_id = s.session_id
         WHERE t.token_id = ?",
        [$tokenId]
    );
    
    if (!$token) {
        Security::sendErrorResponse('Token not found', 404);
    }
    
    // User can delete their own tokens, or DM can delete any token
    if ($token['user_id'] != $userId && $token['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to delete this token', 403);
    }
    
    // Delete token
    $db->execute(
        "DELETE FROM session_map_tokens WHERE token_id = ?",
        [$tokenId]
    );
    
    // Broadcast event
    try {
        require_once '../../../../app/services/event-broadcaster.php';
        $broadcastResult = broadcastEvent(
            $token['session_id'],
            'map_token_removed',
            [
                'token_id' => $tokenId,
                'map_id' => $token['map_id']
            ],
            $userId
        );
        if (!$broadcastResult) {
            error_log("MAP TOKEN DELETE: Failed to broadcast event for token_id: $tokenId");
        }
    } catch (Exception $broadcastError) {
        // Log broadcast error but don't fail the request
        error_log("MAP TOKEN DELETE: Broadcast error: " . $broadcastError->getMessage());
    }
    
    Security::sendSuccessResponse(null, 'Token deleted successfully');
    
} catch (Exception $e) {
    error_log('Session map token delete error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting token', 500);
}
