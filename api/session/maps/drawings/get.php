<?php
/**
 * BECMI D&D Character Manager - Session Map Drawings Get Endpoint
 * 
 * Gets all drawings for a map
 */

require_once '../../../../app/core/database.php';
require_once '../../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get map_id from query parameters
    $mapId = isset($_GET['map_id']) ? (int) $_GET['map_id'] : null;
    
    if (!$mapId) {
        Security::sendValidationErrorResponse(['map_id' => 'Map ID is required']);
    }
    
    // Verify map exists and user has access
    $map = $db->selectOne(
        "SELECT m.map_id, m.session_id, s.dm_user_id,
                (SELECT COUNT(*) FROM session_players sp 
                 WHERE sp.session_id = m.session_id 
                 AND sp.user_id = ? AND sp.status = 'accepted') as is_participant
         FROM session_maps m
         JOIN game_sessions s ON m.session_id = s.session_id
         WHERE m.map_id = ?",
        [$userId, $mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Map not found', 404);
    }
    
    if ($map['dm_user_id'] != $userId && $map['is_participant'] == 0) {
        Security::sendErrorResponse('You do not have access to this map', 403);
    }
    
    // Get all drawings for map
    $drawings = $db->select(
        "SELECT 
            d.drawing_id,
            d.map_id,
            d.user_id,
            d.drawing_type,
            d.color,
            d.brush_size,
            d.path_data,
            d.created_at,
            u.username
         FROM session_map_drawings d
         JOIN users u ON d.user_id = u.user_id
         WHERE d.map_id = ?
         ORDER BY d.created_at ASC",
        [$mapId]
    );
    
    $formattedDrawings = array_map(function($drawing) {
        // Safely decode path_data JSON
        $pathData = json_decode($drawing['path_data'], true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("MAP DRAWINGS GET: JSON decode error for drawing_id {$drawing['drawing_id']}: " . json_last_error_msg());
            $pathData = []; // Default to empty array on decode failure
        }
        
        return [
            'drawing_id' => (int) $drawing['drawing_id'],
            'map_id' => (int) $drawing['map_id'],
            'user_id' => (int) $drawing['user_id'],
            'username' => $drawing['username'],
            'drawing_type' => $drawing['drawing_type'],
            'color' => $drawing['color'],
            'brush_size' => (int) $drawing['brush_size'],
            'path_data' => $pathData,
            'created_at' => $drawing['created_at']
        ];
    }, $drawings);
    
    Security::sendSuccessResponse([
        'drawings' => $formattedDrawings
    ], 'Drawings retrieved successfully');
    
} catch (Exception $e) {
    error_log('Session map drawings get error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving drawings', 500);
}
