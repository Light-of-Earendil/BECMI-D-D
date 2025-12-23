<?php
/**
 * BECMI D&D Character Manager - Batch Create/Update Hex Tiles Endpoint
 * 
 * Creates or updates multiple hex tiles in a single request.
 * Useful for bulk operations like painting terrain.
 * 
 * Request: POST
 * Body: {
 *   "map_id": int (required),
 *   "tiles": [
 *     {
 *       "q": int,
 *       "r": int,
 *       "terrain_type": string,
 *       ...
 *     },
 *     ...
 *   ]
 * }
 */

// Suppress error display to prevent HTML output
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Start output buffering early to catch any errors
if (!ob_get_level()) {
    ob_start();
}

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

// Initialize security
Security::init();

// Clear any output that might have been generated (including PHP notices)
if (ob_get_level()) {
    ob_clean();
}

// Suppress any additional notices/warnings that might be output
// This handles system-level notices like "PHP Request Startup"
@ini_set('display_errors', 0);
@ini_set('display_startup_errors', 0);

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
    $tiles = isset($input['tiles']) && is_array($input['tiles']) ? $input['tiles'] : [];
    
    $errors = [];
    
    if ($mapId <= 0) {
        $errors['map_id'] = 'Valid map ID is required';
    }
    
    if (empty($tiles)) {
        $errors['tiles'] = 'At least one tile is required';
    }
    
    if (count($tiles) > 1000) {
        $errors['tiles'] = 'Maximum 1000 tiles per batch operation';
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
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        $processedTiles = [];
        $createdCount = 0;
        $updatedCount = 0;
        
        foreach ($tiles as $tileData) {
            $q = isset($tileData['q']) ? (int) $tileData['q'] : null;
            $r = isset($tileData['r']) ? (int) $tileData['r'] : null;
            
            if ($q === null || $r === null) {
                continue; // Skip invalid tiles
            }
            
            $terrainType = Security::sanitizeInput($tileData['terrain_type'] ?? 'plains');
            $terrainName = Security::sanitizeInput($tileData['terrain_name'] ?? '');
            $description = Security::sanitizeInput($tileData['description'] ?? '');
            $notes = Security::sanitizeInput($tileData['notes'] ?? '');
            $imageUrl = Security::sanitizeInput($tileData['image_url'] ?? '');
            $elevation = isset($tileData['elevation']) ? (int) $tileData['elevation'] : 0;
            $isPassable = isset($tileData['is_passable']) ? (bool) $tileData['is_passable'] : true;
            $movementCost = isset($tileData['movement_cost']) ? (int) $tileData['movement_cost'] : 1;
            
            // Handle borders JSON
            $borders = null;
            if (isset($tileData['borders']) && $tileData['borders'] !== null) {
                if (is_array($tileData['borders'])) {
                    // Array - encode if not empty
                    if (count($tileData['borders']) > 0) {
                        $borders = json_encode($tileData['borders']);
                    }
                } elseif (is_object($tileData['borders'])) {
                    // Object - encode if not empty
                    $bordersArray = (array) $tileData['borders'];
                    if (count($bordersArray) > 0) {
                        $borders = json_encode($tileData['borders']);
                    }
                } elseif (is_string($tileData['borders']) && trim($tileData['borders']) !== '') {
                    // Already JSON string, validate it
                    $decoded = json_decode($tileData['borders'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $borders = $tileData['borders'];
                    }
                }
            }
            
            // Handle roads JSON
            $roads = null;
            if (isset($tileData['roads']) && $tileData['roads'] !== null) {
                if (is_array($tileData['roads'])) {
                    // Array - encode if not empty
                    if (count($tileData['roads']) > 0) {
                        $roads = json_encode($tileData['roads']);
                    }
                } elseif (is_object($tileData['roads'])) {
                    // Object - encode if not empty
                    $roadsArray = (array) $tileData['roads'];
                    if (count($roadsArray) > 0) {
                        $roads = json_encode($tileData['roads']);
                    }
                } elseif (is_string($tileData['roads']) && trim($tileData['roads']) !== '') {
                    // Already JSON string, validate it
                    $decoded = json_decode($tileData['roads'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $roads = $tileData['roads'];
                    }
                }
            }
            
            if ($movementCost < 1) {
                $movementCost = 1;
            }
            
            // Check if tile exists
            $existingTile = $db->selectOne(
                "SELECT tile_id FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?",
                [$mapId, $q, $r]
            );
            
            if ($existingTile) {
                // Update
                $tileId = $existingTile['tile_id'];
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
                $updatedCount++;
            } else {
                // Create
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
                $createdCount++;
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
            
            $processedTiles[] = [
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
            ];
        }
        
        // Commit transaction
        $db->commit();
        
        Security::logSecurityEvent('hex_tiles_batch_updated', [
            'map_id' => $mapId,
            'tile_count' => count($processedTiles),
            'created' => $createdCount,
            'updated' => $updatedCount,
            'user_id' => $userId
        ]);
        
        Security::sendSuccessResponse([
            'tiles' => $processedTiles,
            'total_processed' => count($processedTiles),
            'created' => $createdCount,
            'updated' => $updatedCount
        ], 'Hex tiles processed successfully');
        
    } catch (Exception $e) {
        // Rollback transaction if it was started
        try {
            if ($db->inTransaction()) {
                $db->rollback();
            }
        } catch (Exception $rollbackError) {
            error_log('Failed to rollback transaction: ' . $rollbackError->getMessage());
        }
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Hex tiles batch error: ' . $e->getMessage());
    error_log('Hex tiles batch trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while processing hex tiles: ' . $e->getMessage(), 500);
}
?>
