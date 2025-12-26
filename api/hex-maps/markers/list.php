<?php
/**
 * BECMI D&D Character Manager - List Hex Map Markers Endpoint
 * 
 * Returns all markers for a specific map.
 * Filters markers by visibility for non-DM users (only shows markers with is_visible_to_players=true).
 * 
 * **Request:** GET
 * 
 * **Query Parameters:**
 * - `map_id` (int, required) - Map ID
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "markers": [
 *       {
 *         "marker_id": int,
 *         "map_id": int,
 *         "q": int,
 *         "r": int,
 *         "marker_type": string,
 *         "marker_name": string,
 *         "marker_description": string,
 *         "marker_icon": string,
 *         "marker_color": string,
 *         "is_visible_to_players": bool,
 *         "created_at": string,
 *         "updated_at": string
 *       },
 *       ...
 *     ]
 *   }
 * }
 * ```
 * 
 * **Access Control:**
 * - Map creator: Sees all markers
 * - Session DM: Sees all markers
 * - Accepted player: Only sees markers with `is_visible_to_players = true`
 * - Others: 403 Forbidden
 * 
 * **Visibility Filtering:**
 * - DM: All markers returned
 * - Player: Only markers with `is_visible_to_players = true` returned
 * - This prevents players from seeing hidden markers (secret locations, DM notes)
 * 
 * **Called From:**
 * - `HexMapEditorModule.loadMarkers()` - Loads markers for editor
 * - `HexMapPlayModule.loadMap()` - Loads markers for play mode
 * 
 * **Side Effects:**
 * - None (read-only operation)
 * 
 * @package api/hex-maps/markers
 * @api GET /api/hex-maps/markers/list.php?map_id={mapId}
 * @since 1.0.0
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
    
    // Determine if user is DM (creator or session DM)
    $isDM = ($map['created_by_user_id'] == $userId) || 
            ($map['session_id'] && $map['session_dm_user_id'] == $userId);
    
    // Get markers - filter by visibility for non-DM users
    $markerQuery = "SELECT marker_id, map_id, q, r, marker_type, marker_name, marker_description,
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
