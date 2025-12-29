<?php
/**
 * BECMI D&D Character Manager - Get Visible Hexes Endpoint
 * 
 * Returns hexes visible to the current user based on their character's position
 * and visibility rules. DMs see everything, players see only their current hex
 * and have limited info about neighboring hexes.
 * 
 * **Request:** GET
 * 
 * **Query Parameters:**
 * - `map_id` (int, required) - Map ID
 * - `character_id` (int, optional) - Character ID (defaults to user's character in session)
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "is_dm": bool,
 *     "character_id": int|null,
 *     "player_position": {"q": int, "r": int}|null,
 *     "hexes": [
 *       {
 *         "q": int,
 *         "r": int,
 *         "terrain_type": string,
 *         "visibility_level": int,
 *         "characters": [{"character_id": int, "character_name": string}, ...] (DM only)
 *       },
 *       ...
 *     ]
 *   }
 * }
 * ```
 * 
 * **Visibility Levels:**
 * - 0: Hidden (fog of war) - Very dim, barely visible
 * - 1: Partial (neighbor visibility) - Can see terrain type but not details
 * - 2: Full (current hex or DM-revealed) - Full visibility with all details
 * 
 * **DM vs Player:**
 * - DM: Sees all hexes with full visibility (level 2)
 * - Player: Sees current hex fully (level 2), neighbors partially (level 1), others hidden (level 0)
 * 
 * **Access Control:**
 * - Map creator: Full access (treated as DM)
 * - Session DM: Full access (treated as DM)
 * - Accepted player: Limited access (fog of war)
 * - Others: 403 Forbidden
 * 
 * **Called From:**
 * - `HexMapPlayModule.loadVisibleHexes()` - Loads visible hexes for play mode
 * - Auto-refresh interval (every 5 seconds)
 * 
 * **Side Effects:**
 * - None (read-only operation)
 * 
 * @package api/hex-maps/play
 * @api GET /api/hex-maps/play/get-visible.php?map_id={mapId}&character_id={characterId}
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
    $characterId = isset($_GET['character_id']) ? (int) $_GET['character_id'] : null;
    
    if ($mapId <= 0) {
        Security::sendValidationErrorResponse(['map_id' => 'Valid map ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get map and verify access
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.map_name, hm.created_by_user_id, hm.session_id, gs.dm_user_id as session_dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Check access permissions (same as get.php and markers/list.php)
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
    
    // Check if user is DM (map creator or session DM)
    $isDM = ($map['created_by_user_id'] == $userId) || 
            ($map['session_id'] && $map['session_dm_user_id'] == $userId);
    
    // If not DM, get character position
    $playerQ = null;
    $playerR = null;
    $actualCharacterId = null;
    
    if (!$isDM) {
        // Get character ID if not provided
        if ($characterId === null) {
            // Try to find user's character in the session
            if ($map['session_id']) {
                $character = $db->selectOne(
                    "SELECT character_id FROM characters
                     WHERE user_id = ? AND session_id = ?
                     ORDER BY character_id DESC LIMIT 1",
                    [$userId, $map['session_id']]
                );
                if ($character) {
                    $characterId = (int) $character['character_id'];
                }
            }
        }
        
        if ($characterId) {
            $actualCharacterId = $characterId;
            // Get character position
            $position = $db->selectOne(
                "SELECT q, r FROM hex_player_positions
                 WHERE map_id = ? AND character_id = ?",
                [$mapId, $characterId]
            );
            
            if ($position) {
                $playerQ = (int) $position['q'];
                $playerR = (int) $position['r'];
            }
        }
    }
    
    // If DM, return all tiles with full visibility
    if ($isDM) {
        // Try to include rivers, roads, paths, and borders, but handle gracefully if columns don't exist
        try {
            $tiles = $db->select(
                "SELECT ht.tile_id, ht.q, ht.r, ht.terrain_type, ht.terrain_name,
                        ht.description, ht.notes, ht.image_url, ht.elevation,
                        ht.is_passable, ht.movement_cost,
                        CAST(ht.borders AS CHAR) as borders,
                        CAST(ht.roads AS CHAR) as roads,
                        CAST(ht.paths AS CHAR) as paths,
                        CAST(ht.rivers AS CHAR) as rivers,
                        hpp.character_id, c.character_name
                 FROM hex_tiles ht
                 LEFT JOIN hex_player_positions hpp ON ht.map_id = hpp.map_id 
                    AND ht.q = hpp.q AND ht.r = hpp.r
                 LEFT JOIN characters c ON hpp.character_id = c.character_id
                 WHERE ht.map_id = ?
                 ORDER BY ht.r, ht.q",
                [$mapId]
            );
        } catch (Exception $e) {
            // If rivers/paths columns don't exist, try without them
            if (strpos($e->getMessage(), 'rivers') !== false || strpos($e->getMessage(), 'paths') !== false || strpos($e->getMessage(), 'Unknown column') !== false) {
                try {
                    $tiles = $db->select(
                        "SELECT ht.tile_id, ht.q, ht.r, ht.terrain_type, ht.terrain_name,
                                ht.description, ht.notes, ht.image_url, ht.elevation,
                                ht.is_passable, ht.movement_cost,
                                CAST(ht.borders AS CHAR) as borders,
                                CAST(ht.roads AS CHAR) as roads,
                                NULL as paths,
                                NULL as rivers,
                                hpp.character_id, c.character_name
                         FROM hex_tiles ht
                         LEFT JOIN hex_player_positions hpp ON ht.map_id = hpp.map_id 
                            AND ht.q = hpp.q AND ht.r = hpp.r
                         LEFT JOIN characters c ON hpp.character_id = c.character_id
                         WHERE ht.map_id = ?
                         ORDER BY ht.r, ht.q",
                        [$mapId]
                    );
                } catch (Exception $e2) {
                    // Fallback to basic query without roads/borders
                    $tiles = $db->select(
                        "SELECT ht.tile_id, ht.q, ht.r, ht.terrain_type, ht.terrain_name,
                                ht.description, ht.notes, ht.image_url, ht.elevation,
                                ht.is_passable, ht.movement_cost,
                                NULL as borders,
                                NULL as roads,
                                NULL as paths,
                                NULL as rivers,
                                hpp.character_id, c.character_name
                         FROM hex_tiles ht
                         LEFT JOIN hex_player_positions hpp ON ht.map_id = hpp.map_id 
                            AND ht.q = hpp.q AND ht.r = hpp.r
                         LEFT JOIN characters c ON hpp.character_id = c.character_id
                         WHERE ht.map_id = ?
                         ORDER BY ht.r, ht.q",
                        [$mapId]
                    );
                }
            } else {
                throw $e;
            }
        }
        
        $visibleHexes = array_map(function($tile) {
            // Normalize JSON fields
            $borders = null;
            $roads = null;
            $paths = null;
            $rivers = null;
            
            if ($tile['borders']) {
                $decoded = json_decode($tile['borders'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    $borders = $decoded;
                }
            }
            
            if ($tile['roads']) {
                $decoded = json_decode($tile['roads'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    $roads = $decoded;
                }
            }
            
            if ($tile['paths']) {
                $decoded = json_decode($tile['paths'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    $paths = $decoded;
                }
            }
            
            if ($tile['rivers']) {
                $decoded = json_decode($tile['rivers'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                    $rivers = $decoded;
                }
            }
            
            $hex = [
                'q' => (int) $tile['q'],
                'r' => (int) $tile['r'],
                'tile_id' => (int) $tile['tile_id'],
                'terrain_type' => $tile['terrain_type'],
                'terrain_name' => $tile['terrain_name'],
                'description' => $tile['description'],
                'notes' => $tile['notes'],
                'image_url' => $tile['image_url'],
                'elevation' => (int) $tile['elevation'],
                'is_passable' => (bool) $tile['is_passable'],
                'movement_cost' => (int) $tile['movement_cost'],
                'visibility_level' => 2, // DM sees everything
                'borders' => $borders,
                'roads' => $roads,
                'paths' => $paths,
                'rivers' => $rivers,
                'characters' => []
            ];
            
            if ($tile['character_id']) {
                $hex['characters'][] = [
                    'character_id' => (int) $tile['character_id'],
                    'character_name' => $tile['character_name']
                ];
            }
            
            return $hex;
        }, $tiles);
        
        Security::sendSuccessResponse([
            'map_id' => $mapId,
            'is_dm' => true,
            'hexes' => $visibleHexes,
            'total_hexes' => count($visibleHexes)
        ]);
    }
    
    // For players: return only visible hexes
    if ($playerQ === null || $playerR === null) {
        // Player has no position - return empty
        Security::sendSuccessResponse([
            'map_id' => $mapId,
            'is_dm' => false,
            'character_id' => $actualCharacterId,
            'hexes' => [],
            'total_hexes' => 0,
            'message' => 'Character not positioned on map'
        ]);
    }
    
    // Get visibility data for this user
    $visibility = $db->select(
        "SELECT q, r, visibility_level FROM hex_visibility
         WHERE map_id = ? AND user_id = ?",
        [$mapId, $userId]
    );
    
    // Create visibility map
    $visibilityMap = [];
    foreach ($visibility as $vis) {
        $key = $vis['q'] . ',' . $vis['r'];
        $visibilityMap[$key] = (int) $vis['visibility_level'];
    }
    
    // Get all tiles in a reasonable range (current hex + neighbors)
    // For now, get tiles within 2 hexes of player position
    // Try to include rivers, roads, paths, and borders, but handle gracefully if columns don't exist
    try {
        $tiles = $db->select(
            "SELECT ht.tile_id, ht.q, ht.r, ht.terrain_type, ht.terrain_name,
                    ht.description, ht.notes, ht.image_url, ht.elevation,
                    ht.is_passable, ht.movement_cost,
                    CAST(ht.borders AS CHAR) as borders,
                    CAST(ht.roads AS CHAR) as roads,
                    CAST(ht.paths AS CHAR) as paths,
                    CAST(ht.rivers AS CHAR) as rivers
             FROM hex_tiles ht
             WHERE ht.map_id = ?
             AND ABS(ht.q - ?) + ABS(ht.r - ?) + ABS(ht.q + ht.r - ? - ?) <= 4
             ORDER BY ht.r, ht.q",
            [$mapId, $playerQ, $playerR, $playerQ, $playerR]
        );
    } catch (Exception $e) {
        // If rivers/paths columns don't exist, try without them
        if (strpos($e->getMessage(), 'rivers') !== false || strpos($e->getMessage(), 'paths') !== false || strpos($e->getMessage(), 'Unknown column') !== false) {
            try {
                $tiles = $db->select(
                    "SELECT ht.tile_id, ht.q, ht.r, ht.terrain_type, ht.terrain_name,
                            ht.description, ht.notes, ht.image_url, ht.elevation,
                            ht.is_passable, ht.movement_cost,
                            CAST(ht.borders AS CHAR) as borders,
                            CAST(ht.roads AS CHAR) as roads,
                            NULL as paths,
                            NULL as rivers
                     FROM hex_tiles ht
                     WHERE ht.map_id = ?
                     AND ABS(ht.q - ?) + ABS(ht.r - ?) + ABS(ht.q + ht.r - ? - ?) <= 4
                     ORDER BY ht.r, ht.q",
                    [$mapId, $playerQ, $playerR, $playerQ, $playerR]
                );
            } catch (Exception $e2) {
                // Fallback to basic query without roads/borders
                $tiles = $db->select(
                    "SELECT ht.tile_id, ht.q, ht.r, ht.terrain_type, ht.terrain_name,
                            ht.description, ht.notes, ht.image_url, ht.elevation,
                            ht.is_passable, ht.movement_cost,
                            NULL as borders,
                            NULL as roads,
                            NULL as paths,
                            NULL as rivers
                     FROM hex_tiles ht
                     WHERE ht.map_id = ?
                     AND ABS(ht.q - ?) + ABS(ht.r - ?) + ABS(ht.q + ht.r - ? - ?) <= 4
                     ORDER BY ht.r, ht.q",
                    [$mapId, $playerQ, $playerR, $playerQ, $playerR]
                );
            }
        } else {
            throw $e;
        }
    }
    
    // Calculate hex distance (axial coordinates)
    function hexDistance($q1, $r1, $q2, $r2) {
        return (abs($q1 - $q2) + abs($q1 + $r1 - $q2 - $r2) + abs($r1 - $r2)) / 2;
    }
    
    $visibleHexes = [];
    
    foreach ($tiles as $tile) {
        $q = (int) $tile['q'];
        $r = (int) $tile['r'];
        $key = $q . ',' . $r;
        $distance = hexDistance($playerQ, $playerR, $q, $r);
        
        // Determine visibility level
        $visLevel = 0; // Hidden by default
        
        // Check stored visibility
        if (isset($visibilityMap[$key])) {
            $visLevel = $visibilityMap[$key];
        } else {
            // Current hex is always fully visible
            if ($q == $playerQ && $r == $playerR) {
                $visLevel = 2;
                // Store in database
                $db->execute(
                    "INSERT INTO hex_visibility (map_id, user_id, q, r, visibility_level, discovered_at, last_viewed_at)
                     VALUES (?, ?, ?, ?, 2, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE visibility_level = 2, last_viewed_at = NOW()",
                    [$mapId, $userId, $q, $r]
                );
            }
            // Neighbors get partial visibility (terrain type only)
            elseif ($distance == 1) {
                $visLevel = 1;
                // Store partial visibility
                $db->execute(
                    "INSERT INTO hex_visibility (map_id, user_id, q, r, visibility_level, last_viewed_at)
                     VALUES (?, ?, ?, ?, 1, NOW())
                     ON DUPLICATE KEY UPDATE visibility_level = GREATEST(visibility_level, 1), last_viewed_at = NOW()",
                    [$mapId, $userId, $q, $r]
                );
            }
        }
        
        // Normalize JSON fields
        $borders = null;
        $roads = null;
        $paths = null;
        $rivers = null;
        
        if (isset($tile['borders']) && $tile['borders']) {
            $decoded = json_decode($tile['borders'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                $borders = $decoded;
            }
        }
        
        if (isset($tile['roads']) && $tile['roads']) {
            $decoded = json_decode($tile['roads'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                $roads = $decoded;
            }
        }
        
        if (isset($tile['paths']) && $tile['paths']) {
            $decoded = json_decode($tile['paths'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                $paths = $decoded;
            }
        }
        
        if (isset($tile['rivers']) && $tile['rivers']) {
            $decoded = json_decode($tile['rivers'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && count($decoded) > 0) {
                $rivers = $decoded;
            }
        }
        
        // Build hex data based on visibility level
        $hex = [
            'q' => $q,
            'r' => $r,
            'tile_id' => (int) $tile['tile_id'],
            'visibility_level' => $visLevel,
            'distance' => $distance
        ];
        
        if ($visLevel >= 1) {
            // Partial or full: show terrain type and basic features
            $hex['terrain_type'] = $tile['terrain_type'];
            $hex['terrain_name'] = $tile['terrain_name'];
            $hex['elevation'] = (int) $tile['elevation'];
            $hex['is_passable'] = (bool) $tile['is_passable'];
            $hex['movement_cost'] = (int) $tile['movement_cost'];
            // Rivers are part of terrain, so show them at partial visibility
            if ($rivers) {
                $hex['rivers'] = $rivers;
            }
        }
        
        if ($visLevel >= 2) {
            // Full visibility: show all details including infrastructure
            $hex['description'] = $tile['description'];
            $hex['notes'] = $tile['notes'];
            $hex['image_url'] = $tile['image_url'];
            // Show all infrastructure at full visibility
            if ($borders) {
                $hex['borders'] = $borders;
            }
            if ($roads) {
                $hex['roads'] = $roads;
            }
            if ($paths) {
                $hex['paths'] = $paths;
            }
            if ($rivers) {
                $hex['rivers'] = $rivers;
            }
        }
        
        $visibleHexes[] = $hex;
    }
    
    Security::sendSuccessResponse([
        'map_id' => $mapId,
        'is_dm' => false,
        'character_id' => $actualCharacterId,
        'player_position' => ['q' => $playerQ, 'r' => $playerR],
        'hexes' => $visibleHexes,
        'total_hexes' => count($visibleHexes)
    ]);
    
} catch (Exception $e) {
    error_log('Get visible hexes error: ' . $e->getMessage());
    error_log('Get visible hexes trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving visible hexes', 500);
}
?>
