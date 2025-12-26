<?php
/**
 * BECMI D&D Character Manager - Move Player Endpoint
 * 
 * Moves a character to a new hex position on the map.
 * Updates visibility automatically when player moves and broadcasts real-time event.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_id` (int, required) - Map ID
 * - `character_id` (int, required) - Character ID to move
 * - `q` (int, required) - Target hex column coordinate
 * - `r` (int, required) - Target hex row coordinate
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Character moved successfully",
 *   "data": {
 *     "character_id": int,
 *     "map_id": int,
 *     "q": int,
 *     "r": int,
 *     "updated_at": string
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Character owner: Can move their own character
 * - Map creator: Can move any character on their map
 * - Session DM: Can move characters in their session
 * - Others: 403 Forbidden
 * 
 * **Visibility Updates:**
 * - Automatically sets current hex to full visibility (level 2)
 * - Sets neighboring hexes to partial visibility (level 1)
 * - Updates visibility for all players in session
 * 
 * **Real-time Events:**
 * - Broadcasts `hex_map_player_moved` event to all session participants
 * 
 * **Called From:**
 * - `HexMapPlayModule.moveCharacter()` - When player clicks hex to move
 * 
 * **Side Effects:**
 * - Updates `hex_map_positions` table
 * - Updates `hex_map_visibility` table for all players
 * - Broadcasts real-time event
 * - Logs security event `hex_map_character_moved`
 * 
 * @package api/hex-maps/play
 * @api POST /api/hex-maps/play/move.php
 * @since 1.0.0
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';
require_once '../../../app/services/event-broadcaster.php';

// Load travel multipliers configuration
$travelMultipliersConfig = require __DIR__ . '/../../../config/hex-map-travel-multipliers.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $mapId = isset($input['map_id']) ? (int) $input['map_id'] : 0;
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    $q = isset($input['q']) ? (int) $input['q'] : null;
    $r = isset($input['r']) ? (int) $input['r'] : null;
    
    $errors = [];
    
    if ($mapId <= 0) {
        $errors['map_id'] = 'Valid map ID is required';
    }
    
    if ($characterId <= 0) {
        $errors['character_id'] = 'Valid character ID is required';
    }
    
    if ($q === null) {
        $errors['q'] = 'Hex coordinate q is required';
    }
    
    if ($r === null) {
        $errors['r'] = 'Hex coordinate r is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify map exists and get map's session DM and creator
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.created_by_user_id, hm.session_id, gs.dm_user_id as map_dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Verify character exists and belongs to user (or user is DM of map's session or map creator)
    $character = $db->selectOne(
        "SELECT c.character_id, c.user_id, c.character_name
         FROM characters c
         WHERE c.character_id = ?",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check permissions: character owner, map creator, or map's session DM can move
    $canMove = false;
    if ($character['user_id'] == $userId) {
        $canMove = true;
    } elseif ($map['created_by_user_id'] == $userId) {
        $canMove = true;
    } elseif ($map['session_id'] && $map['map_dm_user_id'] == $userId) {
        $canMove = true;
    }
    
    if (!$canMove) {
        Security::sendErrorResponse('You do not have permission to move this character', 403);
    }
    
    // Get old position first (needed for travel time calculation)
    $oldPosition = $db->selectOne(
        "SELECT q, r FROM hex_player_positions WHERE map_id = ? AND character_id = ?",
        [$mapId, $characterId]
    );
    
    // Verify hex exists (optional - could allow moving to empty hexes)
    $tile = $db->selectOne(
        "SELECT tile_id, is_passable, terrain_type, 
                CAST(borders AS CHAR) as borders,
                CAST(roads AS CHAR) as roads,
                CAST(paths AS CHAR) as paths,
                CAST(rivers AS CHAR) as rivers
         FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?",
        [$mapId, $q, $r]
    );
    
    if ($tile && !$tile['is_passable']) {
        Security::sendErrorResponse('Cannot move to impassable hex', 400);
    }
    
    // Calculate travel time if moving from one hex to another
    $travelTimeHours = 0;
    $travelTimeMultiplier = 1.0;
    if ($oldPosition && $oldPosition['q'] !== null && $oldPosition['r'] !== null) {
        // Get from hex (old position) tile data
        $fromTile = $db->selectOne(
            "SELECT terrain_type,
                    CAST(borders AS CHAR) as borders,
                    CAST(roads AS CHAR) as roads,
                    CAST(paths AS CHAR) as paths,
                    CAST(rivers AS CHAR) as rivers
             FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?",
            [$mapId, $oldPosition['q'], $oldPosition['r']]
        );
        
        if ($fromTile && $tile) {
            // Calculate neighbor index
            $neighborIndex = -1;
            $neighbors = [
                [$oldPosition['q'], $oldPosition['r'] - 1],      // 0: top
                [$oldPosition['q'] + 1, $oldPosition['r'] - 1], // 1: top-right
                [$oldPosition['q'] + 1, $oldPosition['r']],     // 2: bottom-right
                [$oldPosition['q'], $oldPosition['r'] + 1],      // 3: bottom
                [$oldPosition['q'] - 1, $oldPosition['r'] + 1], // 4: bottom-left
                [$oldPosition['q'] - 1, $oldPosition['r']]       // 5: top-left
            ];
            
            for ($i = 0; $i < 6; $i++) {
                if ($neighbors[$i][0] === $q && $neighbors[$i][1] === $r) {
                    $neighborIndex = $i;
                    break;
                }
            }
            
            if ($neighborIndex >= 0) {
                // Parse roads and paths from JSON
                $fromRoads = [];
                $fromPaths = [];
                if ($fromTile['roads']) {
                    $decoded = json_decode($fromTile['roads'], true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $fromRoads = $decoded;
                    }
                }
                if ($fromTile['paths']) {
                    $decoded = json_decode($fromTile['paths'], true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $fromPaths = $decoded;
                    }
                }
                
                // Determine multiplier: road > path > terrain
                if (isset($fromRoads[$neighborIndex]) && $fromRoads[$neighborIndex]) {
                    $travelTimeMultiplier = $travelMultipliersConfig['road'];
                } elseif (isset($fromPaths[$neighborIndex]) && $fromPaths[$neighborIndex]) {
                    $travelTimeMultiplier = $travelMultipliersConfig['path'];
                } else {
                    // Use terrain multiplier
                    $terrainType = $tile['terrain_type'] ?: 'plains';
                    $travelTimeMultiplier = $travelMultipliersConfig['terrain'][$terrainType] 
                        ?? $travelMultipliersConfig['terrain']['default'] 
                        ?? 1.0;
                }
                
                // Calculate travel time in hours
                $baseTimeHours = $travelMultipliersConfig['base_time_hours'] ?? 1.0;
                $travelTimeHours = $baseTimeHours * $travelTimeMultiplier;
            }
        }
    }
    
    // Update or insert position
    if ($oldPosition) {
        $db->update(
            "UPDATE hex_player_positions SET q = ?, r = ?, updated_at = NOW()
             WHERE map_id = ? AND character_id = ?",
            [$q, $r, $mapId, $characterId]
        );
    } else {
        $db->insert(
            "INSERT INTO hex_player_positions (map_id, character_id, q, r, updated_at)
             VALUES (?, ?, ?, ?, NOW())",
            [$mapId, $characterId, $q, $r]
        );
    }
    
    // Update visibility for the character's user
    // Current hex gets full visibility
    $db->execute(
        "INSERT INTO hex_visibility (map_id, user_id, q, r, visibility_level, discovered_at, last_viewed_at)
         VALUES (?, ?, ?, ?, 2, NOW(), NOW())
         ON DUPLICATE KEY UPDATE visibility_level = 2, last_viewed_at = NOW()",
        [$mapId, $character['user_id'], $q, $r]
    );
    
    // Neighboring hexes get partial visibility
    // Hex neighbors in axial coordinates: (q+1,r), (q+1,r-1), (q,r-1), (q-1,r), (q-1,r+1), (q,r+1)
    $neighbors = [
        [$q + 1, $r],
        [$q + 1, $r - 1],
        [$q, $r - 1],
        [$q - 1, $r],
        [$q - 1, $r + 1],
        [$q, $r + 1]
    ];
    
    foreach ($neighbors as $neighbor) {
        $nq = $neighbor[0];
        $nr = $neighbor[1];
        $db->execute(
            "INSERT INTO hex_visibility (map_id, user_id, q, r, visibility_level, last_viewed_at)
             VALUES (?, ?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE visibility_level = GREATEST(visibility_level, 1), last_viewed_at = NOW()",
            [$mapId, $character['user_id'], $nq, $nr]
        );
    }
    
    // Update game time based on travel time
    $gameTime = null;
    try {
        // Get current game time from map
        $currentGameTime = $db->selectOne(
            "SELECT game_time FROM hex_maps WHERE map_id = ?",
            [$mapId]
        );
        
        if ($currentGameTime && $currentGameTime['game_time']) {
            // Parse existing game time
            $gameTime = new DateTime($currentGameTime['game_time']);
        } else {
            // Initialize game time to current date/time if not set
            $gameTime = new DateTime();
        }
        
        // Add travel time (convert hours to seconds)
        if ($travelTimeHours > 0) {
            $gameTime->modify('+' . round($travelTimeHours * 3600) . ' seconds');
        }
        
        // Update game time in database
        $db->update(
            "UPDATE hex_maps SET game_time = ? WHERE map_id = ?",
            [$gameTime->format('Y-m-d H:i:s'), $mapId]
        );
    } catch (Exception $e) {
        // If game_time column doesn't exist yet, log warning but don't fail
        error_log('Warning: Could not update game time: ' . $e->getMessage());
        $gameTime = null;
    }
    
    // Broadcast event if in session
    if ($map['session_id']) {
        $broadcaster = new EventBroadcaster();
        $broadcaster->broadcastEvent(
            $map['session_id'],
            'hex_map_player_moved',
            [
                'map_id' => $mapId,
                'character_id' => $characterId,
                'character_name' => $character['character_name'],
                'old_position' => $oldPosition ? ['q' => (int) $oldPosition['q'], 'r' => (int) $oldPosition['r']] : null,
                'new_position' => ['q' => $q, 'r' => $r],
                'travel_time_hours' => $travelTimeHours,
                'travel_time_multiplier' => $travelTimeMultiplier,
                'game_time' => $gameTime ? $gameTime->format('Y-m-d H:i:s') : null
            ],
            $userId
        );
    }
    
    Security::logSecurityEvent('hex_map_player_moved', [
        'map_id' => $mapId,
        'character_id' => $characterId,
        'q' => $q,
        'r' => $r,
        'travel_time_hours' => $travelTimeHours,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'map_id' => $mapId,
        'character_id' => $characterId,
        'position' => ['q' => $q, 'r' => $r],
        'old_position' => $oldPosition ? ['q' => (int) $oldPosition['q'], 'r' => (int) $oldPosition['r']] : null,
        'travel_time_hours' => $travelTimeHours,
        'travel_time_multiplier' => $travelTimeMultiplier,
        'game_time' => $gameTime ? $gameTime->format('Y-m-d H:i:s') : null
    ], 'Character moved successfully');
    
} catch (Exception $e) {
    error_log('Move player error: ' . $e->getMessage());
    error_log('Move player trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while moving the character', 500);
}
?>
