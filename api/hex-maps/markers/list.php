<?php
/**
 * BECMI D&D Character Manager - List Hex Map Markers Endpoint
 * 
 * Returns all markers for a specific map.
 * 
 * Request: GET
 * Query params:
 *   - map_id (required): Map ID
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get query parameters
    $mapId = isset($_GET['map_id']) ? (int) $_GET['map_id'] : 0;
    
    if ($mapId <= 0) {
        Security::sendValidationErrorResponse(['map_id' => 'Valid map ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify map exists and user has access
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.created_by_user_id, hm.session_id, gs.dm_user_id as session_dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Check access
    $hasAccess = false;
    if ($map['created_by_user_id'] == $userId) {
        $hasAccess = true;
    } elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $hasAccess = true;
    } elseif ($map['session_id']) {
        $playerCheck = $db->selectOne(
            "SELECT 1 FROM session_players
             WHERE session_id = ? AND user_id = ? AND status = 'accepted'",
            [$map['session_id'], $userId]
        );
        if ($playerCheck) {
            $hasAccess = true;
        }
    }
    
    if (!$hasAccess) {
        Security::sendErrorResponse('You do not have access to this hex map', 403);
    }
    
    // Get markers
    $markers = $db->select(
        "SELECT marker_id, map_id, q, r, marker_type, marker_name, marker_description,
                marker_icon, marker_color, is_visible_to_players,
                created_at, updated_at
         FROM hex_map_markers
         WHERE map_id = ?
         ORDER BY marker_type, marker_name",
        [$mapId]
    );
    
    $formattedMarkers = array_map(function($marker) {
        return [
            'marker_id' => (int) $marker['marker_id'],
            'map_id' => (int) $marker['map_id'],
            'q' => (int) $marker['q'],
            'r' => (int) $marker['r'],
            'marker_type' => $marker['marker_type'],
            'marker_name' => $marker['marker_name'],
            'marker_description' => $marker['marker_description'],
            'marker_icon' => $marker['marker_icon'],
            'marker_color' => $marker['marker_color'],
            'is_visible_to_players' => (bool) $marker['is_visible_to_players'],
            'created_at' => $marker['created_at'],
            'updated_at' => $marker['updated_at']
        ];
    }, $markers);
    
    Security::sendSuccessResponse([
        'markers' => $formattedMarkers,
        'total_count' => count($formattedMarkers)
    ]);
    
} catch (Exception $e) {
    error_log('List hex map markers error: ' . $e->getMessage());
    error_log('List hex map markers trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while listing markers', 500);
}
?>
