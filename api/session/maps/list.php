<?php
/**
 * BECMI D&D Character Manager - Session Maps List Endpoint
 * 
 * Lists all maps for a session
 * 
 * Request: GET
 * Query: session_id (required)
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "maps": [
 *       {
 *         "map_id": int,
 *         "session_id": int,
 *         "map_name": string,
 *         "image_url": string,
 *         "image_width": int,
 *         "image_height": int,
 *         "is_active": boolean,
 *         "created_at": string
 *       }
 *     ]
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
    
    // Get session_id from query parameters
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : null;
    
    if (!$sessionId) {
        Security::sendValidationErrorResponse(['session_id' => 'Session ID is required']);
    }
    
    // Verify session exists and user has access
    $session = $db->selectOne(
        "SELECT session_id, session_title, dm_user_id,
                (SELECT COUNT(*) FROM session_players sp 
                 WHERE sp.session_id = s.session_id 
                 AND sp.user_id = ? AND sp.status = 'accepted') as is_participant
         FROM game_sessions s
         WHERE s.session_id = ?",
        [$userId, $sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Check access: DM or accepted player
    if ($session['dm_user_id'] != $userId && $session['is_participant'] == 0) {
        Security::sendErrorResponse('You do not have access to this session', 403);
    }
    
    // Get all maps for session
    $maps = $db->select(
        "SELECT map_id, session_id, map_name, image_path, image_width, image_height, 
                is_active, created_at
         FROM session_maps
         WHERE session_id = ?
         ORDER BY is_active DESC, created_at ASC",
        [$sessionId]
    );
    
    // Format response - ensure image_url path is correct
    $formattedMaps = array_map(function($map) {
        $imagePath = $map['image_path'];
        $imageUrl = (strpos($imagePath, '/') === 0) ? $imagePath : '/' . $imagePath;
        
        return [
            'map_id' => (int) $map['map_id'],
            'session_id' => (int) $map['session_id'],
            'map_name' => $map['map_name'],
            'image_url' => $imageUrl,
            'image_width' => (int) $map['image_width'],
            'image_height' => (int) $map['image_height'],
            'is_active' => (bool) $map['is_active'],
            'created_at' => $map['created_at']
        ];
    }, $maps);
    
    Security::sendSuccessResponse([
        'maps' => $formattedMaps
    ]);
    
} catch (Exception $e) {
    error_log("MAP LIST ERROR: " . $e->getMessage());
    error_log("MAP LIST ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to list maps: ' . $e->getMessage(), 500);
}
?>
