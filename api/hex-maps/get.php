<?php
/**
 * BECMI D&D Character Manager - Get Hex Map Endpoint
 * 
 * Returns detailed information about a specific hex map, including all tiles.
 * 
 * Request: GET
 * Query params:
 *   - map_id (required): Map ID
 *   - include_tiles (optional): Include tile data (default: true)
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "map": {...},
 *     "tiles": [...],
 *     "tile_count": int
 *   }
 * }
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

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
    $includeTiles = !isset($_GET['include_tiles']) || $_GET['include_tiles'] !== 'false';
    
    if ($mapId <= 0) {
        Security::sendValidationErrorResponse(['map_id' => 'Valid map ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get map and verify access
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.map_name, hm.map_description, hm.created_by_user_id,
                hm.session_id, hm.width_hexes, hm.height_hexes, hm.hex_size_pixels,
                hm.background_image_url, hm.is_active, hm.created_at, hm.updated_at,
                u.username as created_by_username,
                gs.session_title as session_title,
                gs.dm_user_id as session_dm_user_id
         FROM hex_maps hm
         LEFT JOIN users u ON hm.created_by_user_id = u.user_id
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Check access permissions
    $hasAccess = false;
    
    // Creator has access
    if ($map['created_by_user_id'] == $userId) {
        $hasAccess = true;
    }
    // DM of linked session has access
    elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $hasAccess = true;
    }
    // Player in linked session has access
    elseif ($map['session_id']) {
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
    
    // Determine if user is DM (creator or session DM)
    $isDM = ($map['created_by_user_id'] == $userId) || 
            ($map['session_id'] && $map['session_dm_user_id'] == $userId);
    
    // Format map data
    $mapData = [
        'map_id' => (int) $map['map_id'],
        'map_name' => $map['map_name'],
        'map_description' => $map['map_description'],
        'created_by_user_id' => (int) $map['created_by_user_id'],
        'created_by_username' => $map['created_by_username'],
        'session_id' => $map['session_id'] ? (int) $map['session_id'] : null,
        'session_title' => $map['session_title'],
        'width_hexes' => (int) $map['width_hexes'],
        'height_hexes' => (int) $map['height_hexes'],
        'hex_size_pixels' => (int) $map['hex_size_pixels'],
        'background_image_url' => $map['background_image_url'],
        'is_active' => (bool) $map['is_active'],
        'created_at' => $map['created_at'],
        'updated_at' => $map['updated_at']
    ];
    
    $response = ['map' => $mapData];
    
    // Include markers - filter by visibility for non-DM users
    $markerQuery = "SELECT marker_id, q, r, marker_type, marker_name, marker_description,
                           marker_icon, marker_color, is_visible_to_players,
                           created_at, updated_at
                    FROM hex_map_markers
                    WHERE map_id = ?";
    $markerParams = [$mapId];
    
    // If user is not DM, only return markers visible to players
    if (!$isDM) {
        $markerQuery .= " AND is_visible_to_players = TRUE";
    }
    
    $markerQuery .= " ORDER BY marker_type, marker_name";
    
    $markers = $db->select($markerQuery, $markerParams);
    
    $formattedMarkers = array_map(function($marker) {
        return [
            'marker_id' => (int) $marker['marker_id'],
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
    
    $response['markers'] = $formattedMarkers;
    $response['marker_count'] = count($formattedMarkers);
    
    // Include tiles if requested
    if ($includeTiles) {
        $tiles = $db->select(
            "SELECT tile_id, q, r, terrain_type, terrain_name, description, notes,
                    image_url, elevation, is_passable, movement_cost, borders, roads,
                    created_at, updated_at
             FROM hex_tiles
             WHERE map_id = ?
             ORDER BY r, q",
            [$mapId]
        );
        
        $formattedTiles = array_map(function($tile) {
            return [
                'tile_id' => (int) $tile['tile_id'],
                'q' => (int) $tile['q'],
                'r' => (int) $tile['r'],
                'terrain_type' => $tile['terrain_type'],
                'terrain_name' => $tile['terrain_name'],
                'description' => $tile['description'],
                'notes' => $tile['notes'],
                'image_url' => $tile['image_url'],
                'elevation' => (int) $tile['elevation'],
                'is_passable' => (bool) $tile['is_passable'],
                'movement_cost' => (int) $tile['movement_cost'],
                'borders' => $tile['borders'], // Include borders JSON
                'roads' => $tile['roads'] ?? null, // Include roads JSON
                'created_at' => $tile['created_at'],
                'updated_at' => $tile['updated_at']
            ];
        }, $tiles);
        
        $response['tiles'] = $formattedTiles;
        $response['tile_count'] = count($formattedTiles);
    }
    
    Security::sendSuccessResponse($response);
    
} catch (Exception $e) {
    error_log('Get hex map error: ' . $e->getMessage());
    error_log('Get hex map trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving the hex map', 500);
}
?>
