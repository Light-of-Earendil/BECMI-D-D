<?php
/**
 * BECMI D&D Character Manager - Session Map Drawings Clear Endpoint
 * 
 * Clears all drawings for a map (DM only)
 */

require_once '../../../../app/core/database.php';
require_once '../../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    $mapId = isset($data['map_id']) ? (int) $data['map_id'] : null;
    
    if (!$mapId) {
        Security::sendValidationErrorResponse(['map_id' => 'Map ID is required']);
    }
    
    // Verify map exists and user is DM
    $map = $db->selectOne(
        "SELECT m.map_id, m.session_id, s.dm_user_id
         FROM session_maps m
         JOIN game_sessions s ON m.session_id = s.session_id
         WHERE m.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Map not found', 404);
    }
    
    if ($map['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can clear drawings', 403);
    }
    
    // Delete all drawings
    $db->execute(
        "DELETE FROM session_map_drawings WHERE map_id = ?",
        [$mapId]
    );
    
    // Broadcast event
    try {
        require_once '../../../../app/services/event-broadcaster.php';
        $broadcastResult = broadcastEvent(
            $map['session_id'],
            'map_drawings_cleared',
            [
                'map_id' => $mapId,
                'cleared_by_user_id' => $userId
            ],
            $userId
        );
        if (!$broadcastResult) {
            error_log("MAP DRAWINGS CLEAR: Failed to broadcast event for map_id: $mapId");
        }
    } catch (Exception $broadcastError) {
        // Log broadcast error but don't fail the request
        error_log("MAP DRAWINGS CLEAR: Broadcast error: " . $broadcastError->getMessage());
    }
    
    Security::sendSuccessResponse(null, 'Drawings cleared successfully');
    
} catch (Exception $e) {
    error_log('Session map drawings clear error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while clearing drawings', 500);
}
