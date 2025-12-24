<?php
/**
 * BECMI D&D Character Manager - Move Player Endpoint
 * 
 * Moves a character to a new hex position on the map.
 * Updates visibility automatically when player moves.
 * 
 * Request: POST
 * Body: {
 *   "map_id": int (required),
 *   "character_id": int (required),
 *   "q": int (required),
 *   "r": int (required)
 * }
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
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    $q = isset($input['q']) ? (int) $input['q'] : null;
    $r = isset($input['r']) ? (int) $input['r'] : null;
    
    $errors = [];
    
    if ($mapId <= 0) {
        $errors['map_id'] = 'Valid map ID is required';
    }
    
    if ($characterId <= 0) {
        $errors['character_id'] = 'Valid character ID is required';
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
    
    // Verify map exists and get map's session DM
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.session_id, gs.dm_user_id as map_dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Verify character exists and belongs to user (or user is DM of map's session)
    $character = $db->selectOne(
        "SELECT c.character_id, c.user_id, c.character_name
         FROM characters c
         WHERE c.character_id = ?",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check permissions: character owner or map's session DM can move
    $canMove = false;
    if ($character['user_id'] == $userId) {
        $canMove = true;
    } elseif ($map['session_id'] && $map['map_dm_user_id'] == $userId) {
        $canMove = true;
    }
    
    if (!$canMove) {
        Security::sendErrorResponse('You do not have permission to move this character', 403);
    }
    
    // Verify hex exists (optional - could allow moving to empty hexes)
    $tile = $db->selectOne(
        "SELECT tile_id, is_passable FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?",
        [$mapId, $q, $r]
    );
    
    if ($tile && !$tile['is_passable']) {
        Security::sendErrorResponse('Cannot move to impassable hex', 400);
    }
    
    // Get old position
    $oldPosition = $db->selectOne(
        "SELECT q, r FROM hex_player_positions WHERE map_id = ? AND character_id = ?",
        [$mapId, $characterId]
    );
    
    // Update or insert position
    if ($oldPosition) {
        $db->update(
            "UPDATE hex_player_positions SET q = ?, r = ?, updated_at = NOW()
             WHERE map_id = ? AND character_id = ?",
            [$q, $r, $mapId, $characterId]
        );
    } else {
        $db->insert(
            "INSERT INTO hex_player_positions (map_id, character_id, q, r, updated_at)
             VALUES (?, ?, ?, ?, NOW())",
            [$mapId, $characterId, $q, $r]
        );
    }
    
    // Update visibility for the character's user
    // Current hex gets full visibility
    $db->execute(
        "INSERT INTO hex_visibility (map_id, user_id, q, r, visibility_level, discovered_at, last_viewed_at)
         VALUES (?, ?, ?, ?, 2, NOW(), NOW())
         ON DUPLICATE KEY UPDATE visibility_level = 2, last_viewed_at = NOW()",
        [$mapId, $character['user_id'], $q, $r]
    );
    
    // Neighboring hexes get partial visibility
    // Hex neighbors in axial coordinates: (q+1,r), (q+1,r-1), (q,r-1), (q-1,r), (q-1,r+1), (q,r+1)
    $neighbors = [
        [$q + 1, $r],
        [$q + 1, $r - 1],
        [$q, $r - 1],
        [$q - 1, $r],
        [$q - 1, $r + 1],
        [$q, $r + 1]
    ];
    
    foreach ($neighbors as $neighbor) {
        $nq = $neighbor[0];
        $nr = $neighbor[1];
        $db->execute(
            "INSERT INTO hex_visibility (map_id, user_id, q, r, visibility_level, last_viewed_at)
             VALUES (?, ?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE visibility_level = GREATEST(visibility_level, 1), last_viewed_at = NOW()",
            [$mapId, $character['user_id'], $nq, $nr]
        );
    }
    
    // Broadcast event if in session
    if ($map['session_id']) {
        $broadcaster = new EventBroadcaster();
        $broadcaster->broadcastEvent(
            $map['session_id'],
            'hex_map_player_moved',
            [
                'map_id' => $mapId,
                'character_id' => $characterId,
                'character_name' => $character['character_name'],
                'old_position' => $oldPosition ? ['q' => (int) $oldPosition['q'], 'r' => (int) $oldPosition['r']] : null,
                'new_position' => ['q' => $q, 'r' => $r]
            ],
            $userId
        );
    }
    
    Security::logSecurityEvent('hex_map_player_moved', [
        'map_id' => $mapId,
        'character_id' => $characterId,
        'q' => $q,
        'r' => $r,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'map_id' => $mapId,
        'character_id' => $characterId,
        'position' => ['q' => $q, 'r' => $r],
        'old_position' => $oldPosition ? ['q' => (int) $oldPosition['q'], 'r' => (int) $oldPosition['r']] : null
    ], 'Character moved successfully');
    
} catch (Exception $e) {
    error_log('Move player error: ' . $e->getMessage());
    error_log('Move player trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while moving the character', 500);
}
?>
