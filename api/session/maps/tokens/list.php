<?php
/**
 * BECMI D&D Character Manager - Session Map Tokens List Endpoint
 * 
 * Gets all tokens for a map
 */

require_once '../../../../app/core/database.php';
require_once '../../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

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
    
    // Verify map exists and user has access
    $map = $db->selectOne(
        "SELECT m.map_id, m.session_id, s.dm_user_id,
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
    
    if ($map['dm_user_id'] != $userId && $map['is_participant'] == 0) {
        Security::sendErrorResponse('You do not have access to this map', 403);
    }
    
    // Get all tokens for map
    $tokens = $db->select(
        "SELECT 
            t.token_id,
            t.map_id,
            t.character_id,
            t.monster_instance_id,
            t.initiative_id,
            t.user_id,
            t.token_type,
            t.x_position,
            t.y_position,
            t.color,
            t.label,
            t.portrait_url,
            t.is_visible,
            t.created_at,
            t.updated_at,
            c.character_name,
            mi.instance_name as monster_instance_name,
            u.username
         FROM session_map_tokens t
         LEFT JOIN characters c ON t.character_id = c.character_id
         LEFT JOIN monster_instances mi ON t.monster_instance_id = mi.instance_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.map_id = ? AND t.is_visible = TRUE
         ORDER BY t.created_at ASC",
        [$mapId]
    );
    
    $formattedTokens = array_map(function($token) {
        return [
            'token_id' => (int) $token['token_id'],
            'map_id' => (int) $token['map_id'],
            'character_id' => $token['character_id'] ? (int) $token['character_id'] : null,
            'character_name' => $token['character_name'] ? $token['character_name'] : null,
            'monster_instance_id' => $token['monster_instance_id'] ? (int) $token['monster_instance_id'] : null,
            'monster_instance_name' => $token['monster_instance_name'] ? $token['monster_instance_name'] : null,
            'initiative_id' => $token['initiative_id'] ? (int) $token['initiative_id'] : null,
            'user_id' => (int) $token['user_id'],
            'username' => $token['username'] ? $token['username'] : '',
            'token_type' => $token['token_type'] ? $token['token_type'] : 'marker',
            'x_position' => (float) $token['x_position'],
            'y_position' => (float) $token['y_position'],
            'color' => $token['color'] ? $token['color'] : '#FF0000',
            'label' => $token['label'] ? $token['label'] : null,
            'portrait_url' => $token['portrait_url'] ? $token['portrait_url'] : null,
            'is_visible' => (bool) $token['is_visible'],
            'created_at' => $token['created_at'],
            'updated_at' => $token['updated_at'] ? $token['updated_at'] : $token['created_at']
        ];
    }, $tokens);
    
    Security::sendSuccessResponse([
        'tokens' => $formattedTokens
    ], 'Tokens retrieved successfully');
    
} catch (Exception $e) {
    error_log('Session map tokens list error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving tokens', 500);
}
