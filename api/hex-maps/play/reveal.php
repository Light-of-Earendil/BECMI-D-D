<?php
/**
 * BECMI D&D Character Manager - Reveal Hex Endpoint
 * 
 * Allows DM to reveal hexes to players (set visibility to full).
 * Can reveal single hex or multiple hexes to all players or specific user.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_id` (int, required) - Map ID
 * - `hexes` (array, required) - Array of hex coordinate objects `[{"q": int, "r": int}, ...]`
 *   - Maximum 100 hexes per request
 * - `user_id` (int, optional) - If provided, reveal only to this user. Otherwise reveals to all players in session.
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Hexes revealed successfully",
 *   "data": {
 *     "revealed_count": int,
 *     "hexes": [{"q": int, "r": int}, ...]
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Map creator: Can reveal hexes
 * - Session DM: Can reveal hexes
 * - Others: 403 Forbidden
 * 
 * **Visibility Updates:**
 * - Sets specified hexes to full visibility (level 2) for target user(s)
 * - If `user_id` provided: Reveals only to that user
 * - If `user_id` omitted: Reveals to all players in session
 * 
 * **Real-time Events:**
 * - Broadcasts `hex_map_hexes_revealed` event to all session participants
 * 
 * **Called From:**
 * - `HexMapPlayModule.revealHexes()` - When DM reveals hexes
 * 
 * **Side Effects:**
 * - Updates `hex_map_visibility` table
 * - Broadcasts real-time event
 * - Logs security event `hex_map_hexes_revealed`
 * 
 * @package api/hex-maps/play
 * @api POST /api/hex-maps/play/reveal.php
 * @since 1.0.0
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';
require_once '../../../app/services/event-broadcaster.php';

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
    $hexes = isset($input['hexes']) && is_array($input['hexes']) ? $input['hexes'] : [];
    $targetUserId = isset($input['user_id']) ? (int) $input['user_id'] : null;
    
    $errors = [];
    
    if ($mapId <= 0) {
        $errors['map_id'] = 'Valid map ID is required';
    }
    
    if (empty($hexes)) {
        $errors['hexes'] = 'At least one hex is required';
    }
    
    if (count($hexes) > 100) {
        $errors['hexes'] = 'Maximum 100 hexes per reveal operation';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify map exists and user is DM
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.session_id, gs.dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Verify user is DM
    if (!$map['session_id'] || $map['dm_user_id'] != $userId) {
        // Also check if user created the map
        $mapCreator = $db->selectOne(
            "SELECT created_by_user_id FROM hex_maps WHERE map_id = ?",
            [$mapId]
        );
        if (!$mapCreator || $mapCreator['created_by_user_id'] != $userId) {
            Security::sendErrorResponse('Only the DM can reveal hexes', 403);
        }
    }
    
    // Get target user IDs
    $targetUserIds = [];
    
    if ($targetUserId) {
        // Reveal to specific user
        $targetUserIds[] = $targetUserId;
    } elseif ($map['session_id']) {
        // Reveal to all players in session
        $players = $db->select(
            "SELECT user_id FROM session_players
             WHERE session_id = ? AND status = 'accepted'",
            [$map['session_id']]
        );
        foreach ($players as $player) {
            $targetUserIds[] = (int) $player['user_id'];
        }
    } else {
        Security::sendErrorResponse('Cannot determine target users. Map must be linked to a session or user_id must be provided.', 400);
    }
    
    if (empty($targetUserIds)) {
        Security::sendErrorResponse('No target users found', 400);
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        $revealedHexes = [];
        
        foreach ($hexes as $hexData) {
            $q = isset($hexData['q']) ? (int) $hexData['q'] : null;
            $r = isset($hexData['r']) ? (int) $hexData['r'] : null;
            
            if ($q === null || $r === null) {
                continue; // Skip invalid hexes
            }
            
            // Update visibility for all target users
            foreach ($targetUserIds as $targetUid) {
                $db->execute(
                    "INSERT INTO hex_visibility (map_id, user_id, q, r, visibility_level, discovered_at, last_viewed_at)
                     VALUES (?, ?, ?, ?, 2, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE visibility_level = 2, last_viewed_at = NOW()",
                    [$mapId, $targetUid, $q, $r]
                );
            }
            
            $revealedHexes[] = ['q' => $q, 'r' => $r];
        }
        
        // Commit transaction
        $db->commit();
        
        // Broadcast event if in session
        if ($map['session_id']) {
            $broadcaster = new EventBroadcaster();
            $broadcaster->broadcastEvent(
                $map['session_id'],
                'hex_map_hexes_revealed',
                [
                    'map_id' => $mapId,
                    'hexes' => $revealedHexes,
                    'target_user_ids' => $targetUserIds
                ],
                $userId
            );
        }
        
        Security::logSecurityEvent('hex_map_hexes_revealed', [
            'map_id' => $mapId,
            'hex_count' => count($revealedHexes),
            'target_user_ids' => $targetUserIds,
            'user_id' => $userId
        ]);
        
        Security::sendSuccessResponse([
            'map_id' => $mapId,
            'hexes' => $revealedHexes,
            'target_user_ids' => $targetUserIds,
            'total_revealed' => count($revealedHexes)
        ], 'Hexes revealed successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Reveal hexes error: ' . $e->getMessage());
    error_log('Reveal hexes trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while revealing hexes', 500);
}
?>
