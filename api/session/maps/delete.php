<?php
/**
 * BECMI D&D Character Manager - Session Map Delete Endpoint
 * 
 * Deletes a map and all associated drawings and tokens
 * DM only
 * 
 * Request: DELETE
 * Query: map_id (required)
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Map deleted successfully"
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get map_id from query parameters
    $mapId = isset($_GET['map_id']) ? (int) $_GET['map_id'] : null;
    
    if (!$mapId) {
        Security::sendValidationErrorResponse(['map_id' => 'Map ID is required']);
    }
    
    // Get map and verify access
    $map = $db->selectOne(
        "SELECT m.map_id, m.session_id, m.image_path, s.dm_user_id
         FROM session_maps m
         JOIN game_sessions s ON m.session_id = s.session_id
         WHERE m.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Map not found', 404);
    }
    
    // Only DM can delete maps
    if ($map['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can delete maps', 403);
    }
    
    // Delete image file if it exists
    $imagePath = dirname(dirname(dirname(__DIR__))) . '/public/' . $map['image_path'];
    if (file_exists($imagePath)) {
        @unlink($imagePath);
    }
    
    // Delete map (cascade will delete drawings and tokens)
    $db->execute(
        "DELETE FROM session_maps WHERE map_id = ?",
        [$mapId]
    );
    
    Security::sendSuccessResponse(null, 'Map deleted successfully');
    
} catch (Exception $e) {
    error_log("MAP DELETE ERROR: " . $e->getMessage());
    error_log("MAP DELETE ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to delete map: ' . $e->getMessage(), 500);
}
?>
