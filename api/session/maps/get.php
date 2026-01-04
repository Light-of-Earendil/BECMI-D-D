<?php
/**
 * BECMI D&D Character Manager - Session Map Get Endpoint
 * 
 * Gets a single map's details
 * 
 * Request: GET
 * Query: map_id (required)
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "map_id": int,
 *     "session_id": int,
 *     "map_name": string,
 *     "image_url": string,
 *     "image_width": int,
 *     "image_height": int,
 *     "is_active": boolean,
 *     "created_at": string
 *   }
 * }
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

// Initialize security (REQUIRED to start session)
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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
        "SELECT m.map_id, m.session_id, m.map_name, m.image_path, m.image_width, m.image_height, 
                m.is_active, m.created_at, m.created_by_user_id,
                s.dm_user_id,
                (SELECT COUNT(*) FROM session_players sp 
                 WHERE sp.session_id = m.session_id 
                 AND sp.user_id = ? AND sp.status = 'accepted') as is_participant
         FROM session_maps m
         JOIN game_sessions s ON m.session_id = s.session_id
         WHERE m.map_id = ?",
        [$userId, $mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Map not found', 404);
    }
    
    // Check access: DM or accepted player
    if ($map['dm_user_id'] != $userId && $map['is_participant'] == 0) {
        Security::sendErrorResponse('You do not have access to this map', 403);
    }
    
    // Format response - ensure image_url path is correct
    $imagePath = $map['image_path'];
    $imageUrl = (strpos($imagePath, '/') === 0) ? $imagePath : '/' . $imagePath;
    
    Security::sendSuccessResponse([
        'map_id' => (int) $map['map_id'],
        'session_id' => (int) $map['session_id'],
        'map_name' => $map['map_name'],
        'image_url' => $imageUrl,
        'image_width' => (int) $map['image_width'],
        'image_height' => (int) $map['image_height'],
        'is_active' => (bool) $map['is_active'],
        'created_at' => $map['created_at']
    ]);
    
} catch (Exception $e) {
    error_log("MAP GET ERROR: " . $e->getMessage());
    error_log("MAP GET ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to get map: ' . $e->getMessage(), 500);
}
?>