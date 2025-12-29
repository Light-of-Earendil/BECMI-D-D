<?php
/**
 * BECMI D&D Character Manager - Get Hex Map Endpoint
 * 
 * Returns detailed information about a specific hex map, including all tiles and markers.
 * Verifies user has access (creator, session DM, or accepted player) before returning data.
 * 
 * **Request:** GET
 * 
 * **Query Parameters:**
 * - `map_id` (int, required) - Map ID to retrieve
 * - `include_tiles` (boolean, optional, default: true) - Include tile data in response
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "map": {
 *       "map_id": int,
 *       "map_name": string,
 *       "map_description": string,
 *       "created_by_user_id": int,
 *       "session_id": int|null,
 *       "width_hexes": int,
 *       "height_hexes": int,
 *       "hex_size_pixels": int,
 *       "background_image_url": string|null,
 *       "is_active": bool,
 *       "created_at": string,
 *       "updated_at": string
 *     },
 *     "tiles": [
 *       {
 *         "tile_id": int,
 *         "q": int,
 *         "r": int,
 *         "terrain_type": string,
 *         "borders": object,
 *         "roads": object,
 *         ...
 *       },
 *       ...
 *     ],
 *     "tile_count": int,
 *     "is_dm": bool
 *   }
 * }
 * ```
 * 
 * **Access Control:**
 * - Map creator: Full access
 * - Session DM (if map linked to session): Full access
 * - Accepted player (if map linked to session): Read access
 * - Others: 403 Forbidden
 * 
 * **Tile Data:**
 * - Borders: JSON object `{edgeIndex: borderType}` (e.g., {"0": "local", "2": "national"})
 * - Roads: JSON object `{neighborIndex: true}` (e.g., {"0": true, "2": true})
 * - Both are parsed from JSON strings if stored as strings
 * 
 * **Called From:**
 * - `HexMapEditorModule.loadMap()` - When loading map for editing
 * - `HexMapPlayModule.loadMap()` - When loading map for play
 * 
 * **Side Effects:**
 * - None (read-only operation)
 * 
 * @package api/hex-maps
 * @api GET /api/hex-maps/get.php?map_id={mapId}&include_tiles={true|false}
 * @since 1.0.0
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
    // Try to include game_time column, but handle gracefully if it doesn't exist yet
    try {
        $map = $db->selectOne(
            "SELECT hm.map_id, hm.map_name, hm.map_description, hm.created_by_user_id,
                    hm.session_id, hm.width_hexes, hm.height_hexes, hm.hex_size_pixels,
                    hm.background_image_url, hm.is_active, hm.game_time, hm.scale, hm.created_at, hm.updated_at,
                    u.username as created_by_username,
                    gs.session_title as session_title,
                    gs.dm_user_id as session_dm_user_id
             FROM hex_maps hm
             LEFT JOIN users u ON hm.created_by_user_id = u.user_id
             LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
             WHERE hm.map_id = ?",
            [$mapId]
        );
    } catch (Exception $e) {
        // If game_time or scale column doesn't exist yet, select without them
        if (strpos($e->getMessage(), 'game_time') !== false || strpos($e->getMessage(), 'scale') !== false || strpos($e->getMessage(), 'Unknown column') !== false) {
            try {
                $map = $db->selectOne(
                    "SELECT hm.map_id, hm.map_name, hm.map_description, hm.created_by_user_id,
                            hm.session_id, hm.width_hexes, hm.height_hexes, hm.hex_size_pixels,
                            hm.background_image_url, hm.is_active, hm.game_time, hm.created_at, hm.updated_at,
                            u.username as created_by_username,
                            gs.session_title as session_title,
                            gs.dm_user_id as session_dm_user_id
                     FROM hex_maps hm
                     LEFT JOIN users u ON hm.created_by_user_id = u.user_id
                     LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
                     WHERE hm.map_id = ?",
                    [$mapId]
                );
                // Set missing fields to null if columns don't exist
                if (strpos($e->getMessage(), 'game_time') !== false) {
                    $map['game_time'] = null;
                }
                if (strpos($e->getMessage(), 'scale') !== false) {
                    $map['scale'] = null;
                }
            } catch (Exception $e2) {
                // If both game_time and scale don't exist, try without both
                if (strpos($e2->getMessage(), 'game_time') !== false || strpos($e2->getMessage(), 'scale') !== false || strpos($e2->getMessage(), 'Unknown column') !== false) {
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
                    $map['game_time'] = null;
                    $map['scale'] = null;
                } else {
                    throw $e2;
                }
            }
        } else {
            throw $e;
        }
    }
    
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
        'game_time' => isset($map['game_time']) ? $map['game_time'] : null,
        'scale' => isset($map['scale']) && $map['scale'] !== null ? (float) $map['scale'] : null,
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
        // Use CAST to ensure borders, roads, paths, and rivers are returned as strings (not objects)
        // Try to select paths and rivers columns, but handle gracefully if they don't exist yet
        try {
            $tiles = $db->select(
                "SELECT tile_id, q, r, terrain_type, terrain_name, description, notes,
                        image_url, elevation, is_passable, movement_cost,
                        CAST(borders AS CHAR) as borders,
                        CAST(roads AS CHAR) as roads,
                        CAST(paths AS CHAR) as paths,
                        CAST(rivers AS CHAR) as rivers,
                        created_at, updated_at
                 FROM hex_tiles
                 WHERE map_id = ?
                 ORDER BY r, q",
                [$mapId]
            );
        } catch (Exception $e) {
            // If rivers column doesn't exist, try without it
            if (strpos($e->getMessage(), 'rivers') !== false || strpos($e->getMessage(), 'Unknown column') !== false) {
                try {
                    // Try with paths but without rivers
                    $tiles = $db->select(
                        "SELECT tile_id, q, r, terrain_type, terrain_name, description, notes,
                                image_url, elevation, is_passable, movement_cost,
                                CAST(borders AS CHAR) as borders,
                                CAST(roads AS CHAR) as roads,
                                CAST(paths AS CHAR) as paths,
                                NULL as rivers,
                                created_at, updated_at
                         FROM hex_tiles
                         WHERE map_id = ?
                         ORDER BY r, q",
                        [$mapId]
                    );
                } catch (Exception $e2) {
                    // If paths column also doesn't exist, select without paths or rivers
                    if (strpos($e2->getMessage(), 'paths') !== false || strpos($e2->getMessage(), 'Unknown column') !== false) {
                        $tiles = $db->select(
                            "SELECT tile_id, q, r, terrain_type, terrain_name, description, notes,
                                    image_url, elevation, is_passable, movement_cost,
                                    CAST(borders AS CHAR) as borders,
                                    CAST(roads AS CHAR) as roads,
                                    NULL as paths,
                                    NULL as rivers,
                                    created_at, updated_at
                             FROM hex_tiles
                             WHERE map_id = ?
                             ORDER BY r, q",
                            [$mapId]
                        );
                    } else {
                        throw $e2;
                    }
                }
            } else {
                throw $e; // Re-throw if it's a different error
            }
        }
        
        $formattedTiles = array_map(function($tile) {
            // Normalize borders: return null for empty/null, otherwise return JSON string
            $borders = null;
            if (isset($tile['borders']) && $tile['borders'] !== null && trim($tile['borders']) !== '') {
                // Validate it's valid JSON
                $decoded = json_decode($tile['borders'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    $borders = $tile['borders']; // Return as JSON string
                }
            }
            
            // Normalize roads: return null for empty/null, otherwise return JSON string
            $roads = null;
            if (isset($tile['roads']) && $tile['roads'] !== null && trim($tile['roads']) !== '') {
                // Validate it's valid JSON
                $decoded = json_decode($tile['roads'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    $roads = $tile['roads']; // Return as JSON string
                }
            }
            
            // Normalize paths: return null for empty/null, otherwise return JSON string
            $paths = null;
            if (isset($tile['paths']) && $tile['paths'] !== null && trim($tile['paths']) !== '') {
                // Validate it's valid JSON
                $decoded = json_decode($tile['paths'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    $paths = $tile['paths']; // Return as JSON string
                }
            }
            
            // Normalize rivers: return null for empty/null, otherwise return JSON string
            $rivers = null;
            try {
                if (isset($tile['rivers']) && $tile['rivers'] !== null && trim($tile['rivers']) !== '') {
                    // Validate it's valid JSON
                    $decoded = json_decode($tile['rivers'], true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                        $rivers = $tile['rivers']; // Return as JSON string
                    }
                }
            } catch (Exception $e) {
                // If rivers column doesn't exist, set to null
                $rivers = null;
            }
            
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
                'borders' => $borders, // JSON string or null
                'roads' => $roads, // JSON string or null
                'paths' => $paths, // JSON string or null
                'rivers' => $rivers, // JSON string or null
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
