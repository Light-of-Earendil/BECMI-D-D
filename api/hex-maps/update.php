<?php
/**
 * BECMI D&D Character Manager - Update Hex Map Endpoint
 * 
 * Allows the map creator or session DM to update map metadata.
 * Updates only the fields provided in the request body.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_id` (int, required) - Map ID to update
 * - `map_name` (string, optional) - Map name (3-100 characters)
 * - `map_description` (string, optional) - Map description
 * - `width_hexes` (int, optional) - Map width in hexes (1-200)
 * - `height_hexes` (int, optional) - Map height in hexes (1-200)
 * - `hex_size_pixels` (int, optional) - Hex size in pixels (10-200)
 * - `background_image_url` (string, optional) - Background image URL
 * - `is_active` (boolean, optional) - Whether map is active
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Hex map updated successfully",
 *   "data": {
 *     "map_id": int,
 *     "map_name": string,
 *     ...
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Map creator: Can update map metadata
 * - Session DM: Can update map metadata
 * - Others: 403 Forbidden
 * 
 * **Validation:**
 * - Map name: 3-100 characters
 * - Width/Height: 1-200 hexes
 * - Hex size: 10-200 pixels
 * - At least one field must be provided for update
 * 
 * **Called From:**
 * - `HexMapEditorModule.saveMap()` - Updates map metadata when saving
 * 
 * **Side Effects:**
 * - Updates row in `hex_maps` table
 * - Sets `updated_at = NOW()`
 * - Logs security event `hex_map_updated`
 * 
 * @package api/hex-maps
 * @api POST /api/hex-maps/update.php
 * @since 1.0.0
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

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
    
    if ($mapId <= 0) {
        Security::sendValidationErrorResponse(['map_id' => 'Valid map ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get map and verify permissions
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
    
    // Check permissions: creator or session DM can update
    $canUpdate = false;
    if ($map['created_by_user_id'] == $userId) {
        $canUpdate = true;
    } elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $canUpdate = true;
    }
    
    if (!$canUpdate) {
        Security::sendErrorResponse('You do not have permission to update this hex map', 403);
    }
    
    // Build update query dynamically based on provided fields
    $updateFields = [];
    $updateParams = [];
    
    if (isset($input['map_name'])) {
        $mapName = Security::sanitizeInput($input['map_name']);
        if (strlen($mapName) < 3 || strlen($mapName) > 100) {
            Security::sendValidationErrorResponse(['map_name' => 'Map name must be between 3 and 100 characters']);
        }
        $updateFields[] = "map_name = ?";
        $updateParams[] = $mapName;
    }
    
    if (isset($input['map_description'])) {
        $updateFields[] = "map_description = ?";
        $updateParams[] = Security::sanitizeInput($input['map_description']) ?: null;
    }
    
    if (isset($input['width_hexes'])) {
        $widthHexes = (int) $input['width_hexes'];
        if ($widthHexes < 1 || $widthHexes > 200) {
            Security::sendValidationErrorResponse(['width_hexes' => 'Width must be between 1 and 200 hexes']);
        }
        $updateFields[] = "width_hexes = ?";
        $updateParams[] = $widthHexes;
    }
    
    if (isset($input['height_hexes'])) {
        $heightHexes = (int) $input['height_hexes'];
        if ($heightHexes < 1 || $heightHexes > 200) {
            Security::sendValidationErrorResponse(['height_hexes' => 'Height must be between 1 and 200 hexes']);
        }
        $updateFields[] = "height_hexes = ?";
        $updateParams[] = $heightHexes;
    }
    
    if (isset($input['hex_size_pixels'])) {
        $hexSizePixels = (int) $input['hex_size_pixels'];
        if ($hexSizePixels < 10 || $hexSizePixels > 200) {
            Security::sendValidationErrorResponse(['hex_size_pixels' => 'Hex size must be between 10 and 200 pixels']);
        }
        $updateFields[] = "hex_size_pixels = ?";
        $updateParams[] = $hexSizePixels;
    }
    
    if (isset($input['background_image_url'])) {
        $updateFields[] = "background_image_url = ?";
        $updateParams[] = Security::sanitizeInput($input['background_image_url']) ?: null;
    }
    
    if (isset($input['is_active'])) {
        $updateFields[] = "is_active = ?";
        $updateParams[] = (bool) $input['is_active'];
    }
    
    if (empty($updateFields)) {
        Security::sendValidationErrorResponse(['general' => 'No fields to update']);
    }
    
    // Add updated_at
    $updateFields[] = "updated_at = NOW()";
    
    // Add map_id to params
    $updateParams[] = $mapId;
    
    // Execute update
    $sql = "UPDATE hex_maps SET " . implode(", ", $updateFields) . " WHERE map_id = ?";
    $db->update($sql, $updateParams);
    
    // Get updated map
    $updatedMap = $db->selectOne(
        "SELECT map_id, map_name, map_description, created_by_user_id, session_id,
                width_hexes, height_hexes, hex_size_pixels, background_image_url,
                is_active, created_at, updated_at
         FROM hex_maps
         WHERE map_id = ?",
        [$mapId]
    );
    
    Security::logSecurityEvent('hex_map_updated', [
        'map_id' => $mapId,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'map_id' => (int) $updatedMap['map_id'],
        'map_name' => $updatedMap['map_name'],
        'map_description' => $updatedMap['map_description'],
        'created_by_user_id' => (int) $updatedMap['created_by_user_id'],
        'session_id' => $updatedMap['session_id'] ? (int) $updatedMap['session_id'] : null,
        'width_hexes' => (int) $updatedMap['width_hexes'],
        'height_hexes' => (int) $updatedMap['height_hexes'],
        'hex_size_pixels' => (int) $updatedMap['hex_size_pixels'],
        'background_image_url' => $updatedMap['background_image_url'],
        'is_active' => (bool) $updatedMap['is_active'],
        'created_at' => $updatedMap['created_at'],
        'updated_at' => $updatedMap['updated_at']
    ], 'Hex map updated successfully');
    
} catch (Exception $e) {
    error_log('Hex map update error: ' . $e->getMessage());
    error_log('Hex map update trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while updating the hex map', 500);
}
?>
