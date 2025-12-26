<?php
/**
 * BECMI D&D Character Manager - List Hex Maps Endpoint
 * 
 * Returns a list of hex maps accessible to the current user.
 * DMs see all maps they created, plus maps linked to their sessions.
 * Players see maps linked to sessions they're part of.
 * 
 * **Request:** GET
 * 
 * **Query Parameters:**
 * - `session_id` (int, optional) - Filter by session ID
 * - `include_inactive` (boolean, optional, default: false) - Include inactive maps
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "maps": [
 *       {
 *         "map_id": int,
 *         "map_name": string,
 *         "map_description": string,
 *         "created_by_user_id": int,
 *         "created_by_username": string,
 *         "session_id": int|null,
 *         "session_title": string|null,
 *         "width_hexes": int,
 *         "height_hexes": int,
 *         "hex_size_pixels": int,
 *         "background_image_url": string|null,
 *         "is_active": bool,
 *         "created_at": string,
 *         "updated_at": string
 *       },
 *       ...
 *     ],
 *     "total_count": int
 *   }
 * }
 * ```
 * 
 * **Access Control:**
 * Users can see:
 * 1. Maps they created
 * 2. Maps linked to sessions where they are DM
 * 3. Maps linked to sessions where they are an accepted player
 * 
 * **Filtering:**
 * - If `session_id` provided: Only maps for that session
 * - If `include_inactive=false`: Only active maps (default)
 * - If `include_inactive=true`: Includes inactive maps
 * 
 * **Called From:**
 * - `HexMapEditorModule.renderEditor()` - When no mapId provided (shows map list)
 * 
 * **Side Effects:**
 * - None (read-only operation)
 * 
 * @package api/hex-maps
 * @api GET /api/hex-maps/list.php?session_id={sessionId}&include_inactive={true|false}
 * @since 1.0.0
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

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
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get query parameters
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : null;
    $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === 'true';
    
    // Get database connection
    $db = getDB();
    
    // Build query - users can see:
    // 1. Maps they created
    // 2. Maps linked to sessions where they are DM
    // 3. Maps linked to sessions where they are an accepted player
    $whereConditions = [];
    $params = [];
    
    if ($sessionId !== null && $sessionId > 0) {
        $whereConditions[] = "hm.session_id = ?";
        $params[] = $sessionId;
    }
    
    if (!$includeInactive) {
        $whereConditions[] = "hm.is_active = TRUE";
    }
    
    $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
    
    $maps = $db->select(
        "SELECT DISTINCT hm.map_id, hm.map_name, hm.map_description, hm.created_by_user_id,
                hm.session_id, hm.width_hexes, hm.height_hexes, hm.hex_size_pixels,
                hm.background_image_url, hm.is_active, hm.created_at, hm.updated_at,
                u.username as created_by_username,
                gs.session_title as session_title
         FROM hex_maps hm
         LEFT JOIN users u ON hm.created_by_user_id = u.user_id
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE (
             hm.created_by_user_id = ? OR
             (hm.session_id IS NOT NULL AND gs.dm_user_id = ?) OR
             (hm.session_id IS NOT NULL AND EXISTS (
                 SELECT 1 FROM session_players sp
                 WHERE sp.session_id = hm.session_id
                 AND sp.user_id = ?
                 AND sp.status = 'accepted'
             ))
         )
         " . ($whereClause ? "AND " . str_replace("WHERE", "", $whereClause) : "") . "
         ORDER BY hm.updated_at DESC",
        array_merge([$userId, $userId, $userId], $params)
    );
    
    // Format response
    $formattedMaps = array_map(function($map) {
        return [
            'map_id' => (int) $map['map_id'],
            'map_name' => $map['map_name'],
            'map_description' => $map['map_description'],
            'created_by_user_id' => (int) $map['created_by_user_id'],
            'created_by_username' => $map['created_by_username'],
            'session_id' => $map['session_id'] ? (int) $map['session_id'] : null,
            'session_title' => $map['session_title'],
            'width_hexes' => (int) $map['width_hexes'],
            'height_hexes' => (int) $map['height_hexes'],
            'hex_size_pixels' => (int) $map['hex_size_pixels'],
            'background_image_url' => $map['background_image_url'],
            'is_active' => (bool) $map['is_active'],
            'created_at' => $map['created_at'],
            'updated_at' => $map['updated_at']
        ];
    }, $maps);
    
    Security::sendSuccessResponse([
        'maps' => $formattedMaps,
        'total_count' => count($formattedMaps)
    ]);
    
} catch (Exception $e) {
    error_log('List hex maps error: ' . $e->getMessage());
    error_log('List hex maps trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while listing hex maps', 500);
}
?>
