<?php
/**
 * BECMI D&D Character Manager - Delete Hex Map Endpoint
 * 
 * Allows the map creator or session DM to delete a hex map.
 * This will cascade delete all associated tiles, visibility data, and positions.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_id` (int, required) - Map ID to delete
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Hex map deleted successfully",
 *   "data": {
 *     "map_id": int
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Map creator: Can delete map
 * - Session DM: Can delete map
 * - Others: 403 Forbidden
 * 
 * **Cascade Deletes:**
 * - All tiles in `hex_tiles` table
 * - All markers in `hex_map_markers` table
 * - All visibility data in `hex_map_visibility` table
 * - All character positions in `hex_map_positions` table
 * 
 * **Warning:**
 * This is a destructive operation that cannot be undone.
 * All map data is permanently deleted.
 * 
 * **Called From:**
 * - Map deletion UI (when implemented)
 * 
 * **Side Effects:**
 * - Deletes row from `hex_maps` table (cascade deletes related data)
 * - Logs security event `hex_map_deleted`
 * 
 * @package api/hex-maps
 * @api POST /api/hex-maps/delete.php
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
        "SELECT hm.map_id, hm.map_name, hm.created_by_user_id, hm.session_id, gs.dm_user_id as session_dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Check permissions: creator or session DM can delete
    $canDelete = false;
    if ($map['created_by_user_id'] == $userId) {
        $canDelete = true;
    } elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $canDelete = true;
    }
    
    if (!$canDelete) {
        Security::sendErrorResponse('You do not have permission to delete this hex map', 403);
    }
    
    // Delete the map (cascade will handle related records)
    $db->delete("DELETE FROM hex_maps WHERE map_id = ?", [$mapId]);
    
    Security::logSecurityEvent('hex_map_deleted', [
        'map_id' => $mapId,
        'map_name' => $map['map_name'],
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'map_id' => $mapId
    ], 'Hex map deleted successfully');
    
} catch (Exception $e) {
    error_log('Hex map delete error: ' . $e->getMessage());
    error_log('Hex map delete trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting the hex map', 500);
}
?>
