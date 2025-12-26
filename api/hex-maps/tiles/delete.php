<?php
/**
 * BECMI D&D Character Manager - Delete Hex Tile Endpoint
 * 
 * Deletes a hex tile from a map.
 * Verifies tile exists and user has permission before deletion.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_id` (int, required) - Map ID
 * - `q` (int, required) - Hex column coordinate
 * - `r` (int, required) - Hex row coordinate
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Hex tile deleted successfully",
 *   "data": {
 *     "map_id": int,
 *     "q": int,
 *     "r": int
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Map creator: Can delete tiles
 * - Session DM: Can delete tiles
 * - Others: 403 Forbidden
 * 
 * **Called From:**
 * - `HexMapEditorModule.saveMap()` - When deleting tiles that were removed
 * - `HexMapEditorModule.eraseRoadFromHex()` - When deleting empty tiles after road removal
 * 
 * **Side Effects:**
 * - Deletes row from `hex_tiles` table
 * - Logs security event `hex_tile_deleted`
 * 
 * @package api/hex-maps/tiles
 * @api POST /api/hex-maps/tiles/delete.php
 * @since 1.0.0
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
    
    // Check permissions: creator or session DM can delete tiles
    $canEdit = false;
    if ($map['created_by_user_id'] == $userId) {
        $canEdit = true;
    } elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $canEdit = true;
    }
    
    if (!$canEdit) {
        Security::sendErrorResponse('You do not have permission to delete tiles on this map', 403);
    }
    
    // Check if tile exists
    $tile = $db->selectOne(
        "SELECT tile_id FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?",
        [$mapId, $q, $r]
    );
    
    if (!$tile) {
        Security::sendErrorResponse('Hex tile not found', 404);
    }
    
    // Delete the tile
    $db->delete("DELETE FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?", [$mapId, $q, $r]);
    
    Security::logSecurityEvent('hex_tile_deleted', [
        'map_id' => $mapId,
        'q' => $q,
        'r' => $r,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'map_id' => $mapId,
        'q' => $q,
        'r' => $r
    ], 'Hex tile deleted successfully');
    
} catch (Exception $e) {
    error_log('Hex tile delete error: ' . $e->getMessage());
    error_log('Hex tile delete trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting the hex tile', 500);
}
?>
