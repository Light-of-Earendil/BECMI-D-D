<?php
/**
 * BECMI D&D Character Manager - Create/Update Hex Tile Endpoint
 * 
 * Creates or updates a hex tile. If a tile already exists at (q, r), it will be updated.
 * 
 * Request: POST
 * Body: {
 *   "map_id": int (required),
 *   "q": int (required),
 *   "r": int (required),
 *   "terrain_type": string (optional, default: "plains"),
 *   "terrain_name": string (optional),
 *   "description": string (optional),
 *   "notes": string (optional),
 *   "image_url": string (optional),
 *   "elevation": int (optional, default: 0),
 *   "is_passable": boolean (optional, default: true),
 *   "movement_cost": int (optional, default: 1)
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

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
    $q = isset($input['q']) ? (int) $input['q'] : null;
    $r = isset($input['r']) ? (int) $input['r'] : null;
    
    $errors = [];
    
    if ($mapId <= 0) {
        $errors['map_id'] = 'Valid map ID is required';
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
    
    // Verify map exists and user has edit permissions
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
    
    // Check permissions: creator or session DM can edit tiles
    $canEdit = false;
    if ($map['created_by_user_id'] == $userId) {
        $canEdit = true;
    } elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $canEdit = true;
    }
    
    if (!$canEdit) {
        Security::sendErrorResponse('You do not have permission to edit tiles on this map', 403);
    }
    
    // Get tile data
    // Only set terrain_type if explicitly provided (not null) - roads should not change terrain
    $terrainType = isset($input['terrain_type']) && $input['terrain_type'] !== null 
        ? Security::sanitizeInput($input['terrain_type']) 
        : null;
    $terrainName = Security::sanitizeInput($input['terrain_name'] ?? '');
    $description = Security::sanitizeInput($input['description'] ?? '');
    $notes = Security::sanitizeInput($input['notes'] ?? '');
    $imageUrl = Security::sanitizeInput($input['image_url'] ?? '');
    $elevation = isset($input['elevation']) ? (int) $input['elevation'] : 0;
    $isPassable = isset($input['is_passable']) ? (bool) $input['is_passable'] : true;
    $movementCost = isset($input['movement_cost']) ? (int) $input['movement_cost'] : 1;
    
    // Handle borders JSON
    $borders = null;
    if (isset($input['borders'])) {
        if (is_array($input['borders']) || is_object($input['borders'])) {
            $borders = json_encode($input['borders']);
        } elseif (is_string($input['borders'])) {
            // Already JSON string, validate it
            $decoded = json_decode($input['borders'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $borders = $input['borders'];
            }
        }
    }
    
    // Handle roads JSON
    $roads = null;
    if (isset($input['roads'])) {
        if (is_array($input['roads']) || is_object($input['roads'])) {
            $roads = json_encode($input['roads']);
        } elseif (is_string($input['roads'])) {
            // Already JSON string, validate it
            $decoded = json_decode($input['roads'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $roads = $input['roads'];
            }
        }
    }
    
    // Validate movement_cost
    if ($movementCost < 1) {
        $movementCost = 1;
    }
    
    // Check if tile already exists
    $existingTile = $db->selectOne(
        "SELECT tile_id FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?",
        [$mapId, $q, $r]
    );
    
    if ($existingTile) {
        // Update existing tile
        $tileId = $existingTile['tile_id'];
        
        // If terrain_type is null, preserve existing terrain_type (don't overwrite when just adding roads/borders)
        if ($terrainType === null) {
            $existingTileData = $db->selectOne(
                "SELECT terrain_type FROM hex_tiles WHERE tile_id = ?",
                [$tileId]
            );
            $terrainType = $existingTileData['terrain_type'] ?? null;
        }
        
        $db->update(
            "UPDATE hex_tiles SET
                terrain_type = ?,
                terrain_name = ?,
                description = ?,
                notes = ?,
                image_url = ?,
                elevation = ?,
                is_passable = ?,
                movement_cost = ?,
                borders = ?,
                roads = ?,
                updated_at = NOW()
             WHERE tile_id = ?",
            [
                $terrainType,
                $terrainName ?: null,
                $description ?: null,
                $notes ?: null,
                $imageUrl ?: null,
                $elevation,
                $isPassable,
                $movementCost,
                $borders,
                $roads,
                $tileId
            ]
        );
    } else {
        // Create new tile
        // If terrain_type is null, use default 'plains' (matching API documentation and batch.php behavior)
        if ($terrainType === null) {
            $terrainType = 'plains';
        }
        
        $tileId = $db->insert(
            "INSERT INTO hex_tiles (
                map_id, q, r, terrain_type, terrain_name, description, notes,
                image_url, elevation, is_passable, movement_cost, borders, roads,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [
                $mapId,
                $q,
                $r,
                $terrainType,
                $terrainName ?: null,
                $description ?: null,
                $notes ?: null,
                $imageUrl ?: null,
                $elevation,
                $isPassable,
                $movementCost,
                $borders,
                $roads
            ]
        );
    }
    
    // Get the tile
    $tile = $db->selectOne(
        "SELECT tile_id, map_id, q, r, terrain_type, terrain_name, description, notes,
                image_url, elevation, is_passable, movement_cost, borders, roads,
                created_at, updated_at
         FROM hex_tiles
         WHERE tile_id = ?",
        [$tileId]
    );
    
    Security::logSecurityEvent('hex_tile_updated', [
        'tile_id' => $tileId,
        'map_id' => $mapId,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'tile_id' => (int) $tile['tile_id'],
        'map_id' => (int) $tile['map_id'],
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
    ], $existingTile ? 'Hex tile updated successfully' : 'Hex tile created successfully');
    
} catch (Exception $e) {
    error_log('Hex tile create/update error: ' . $e->getMessage());
    error_log('Hex tile create/update trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while saving the hex tile', 500);
}
?>
