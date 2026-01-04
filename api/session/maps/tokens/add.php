<?php
/**
 * BECMI D&D Character Manager - Session Map Token Add Endpoint
 * 
 * Adds or updates a token on a map
 */

require_once '../../../../app/core/database.php';
require_once '../../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (empty($data['map_id'])) {
        $errors['map_id'] = 'Map ID is required';
    }
    
    if (!isset($data['x_position']) || !is_numeric($data['x_position'])) {
        $errors['x_position'] = 'X position is required and must be numeric';
    }
    
    if (!isset($data['y_position']) || !is_numeric($data['y_position'])) {
        $errors['y_position'] = 'Y position is required and must be numeric';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $mapId = (int) $data['map_id'];
    $characterId = isset($data['character_id']) ? (int) $data['character_id'] : null;
    $tokenType = isset($data['token_type']) && $data['token_type'] === 'portrait' ? 'portrait' : 'marker';
    $xPosition = (float) $data['x_position'];
    $yPosition = (float) $data['y_position'];
    $color = isset($data['color']) ? trim($data['color']) : '#FF0000';
    $label = isset($data['label']) ? trim($data['label']) : null;
    $portraitUrl = isset($data['portrait_url']) ? trim($data['portrait_url']) : null;
    
    // Validate color format
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
        Security::sendValidationErrorResponse(['color' => 'Invalid color format']);
    }
    
    // Validate label length
    if ($label && strlen($label) > 50) {
        Security::sendValidationErrorResponse(['label' => 'Label must be 50 characters or less']);
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
    
    // If character_id provided, get character portrait
    if ($characterId && !$portraitUrl) {
        try {
            $character = $db->selectOne(
                "SELECT character_id, portrait_url FROM characters WHERE character_id = ?",
                [$characterId]
            );
            
            if ($character && !empty($character['portrait_url'])) {
                $portraitUrl = $character['portrait_url'];
                $tokenType = 'portrait';
            } else if ($characterId) {
                // Character exists but has no portrait - log warning but continue
                error_log("MAP TOKEN ADD: Character $characterId has no portrait_url, using marker token type");
            }
        } catch (Exception $e) {
            // Log error but don't fail - character might not exist, use marker token
            error_log("MAP TOKEN ADD: Error fetching character portrait: " . $e->getMessage());
        }
    }
    
    // Check if token already exists for this character on this map
    $existingToken = null;
    if ($characterId) {
        $existingToken = $db->selectOne(
            "SELECT token_id FROM session_map_tokens 
             WHERE map_id = ? AND character_id = ?",
            [$mapId, $characterId]
        );
    }
    
    if ($existingToken) {
        // Update existing token
        $tokenId = $existingToken['token_id'];
        $db->execute(
            "UPDATE session_map_tokens 
             SET x_position = ?, y_position = ?, color = ?, label = ?, 
                 portrait_url = ?, token_type = ?, updated_at = NOW()
             WHERE token_id = ?",
            [$xPosition, $yPosition, $color, $label, $portraitUrl, $tokenType, $tokenId]
        );
    } else {
        // Create new token
        $tokenId = $db->insert(
            "INSERT INTO session_map_tokens 
             (map_id, character_id, user_id, token_type, x_position, y_position, 
              color, label, portrait_url, is_visible, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())",
            [$mapId, $characterId, $userId, $tokenType, $xPosition, $yPosition, 
             $color, $label, $portraitUrl]
        );
    }
    
    // Broadcast event
    try {
        require_once '../../../../app/services/event-broadcaster.php';
        $broadcastResult = broadcastEvent(
            $map['session_id'],
            'map_token_moved',
            [
                'token_id' => $tokenId,
                'map_id' => $mapId,
                'character_id' => $characterId,
                'x_position' => $xPosition,
                'y_position' => $yPosition,
                'user_id' => $userId
            ],
            $userId
        );
        if (!$broadcastResult) {
            error_log("MAP TOKEN ADD: Failed to broadcast event for token_id: $tokenId");
        }
    } catch (Exception $broadcastError) {
        // Log broadcast error but don't fail the request
        error_log("MAP TOKEN ADD: Broadcast error: " . $broadcastError->getMessage());
    }
    
    // Get created/updated token
    $token = $db->selectOne(
        "SELECT 
            t.token_id,
            t.map_id,
            t.character_id,
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
            u.username
         FROM session_map_tokens t
         LEFT JOIN characters c ON t.character_id = c.character_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.token_id = ?",
        [$tokenId]
    );
    
    $formatted = [
        'token_id' => (int) $token['token_id'],
        'map_id' => (int) $token['map_id'],
        'character_id' => $token['character_id'] ? (int) $token['character_id'] : null,
        'character_name' => $token['character_name'],
        'user_id' => (int) $token['user_id'],
        'username' => $token['username'],
        'token_type' => $token['token_type'],
        'x_position' => (float) $token['x_position'],
        'y_position' => (float) $token['y_position'],
        'color' => $token['color'],
        'label' => $token['label'],
        'portrait_url' => $token['portrait_url'],
        'is_visible' => (bool) $token['is_visible'],
        'created_at' => $token['created_at'],
        'updated_at' => $token['updated_at']
    ];
    
    Security::sendSuccessResponse($formatted, 'Token added successfully');
    
} catch (Exception $e) {
    error_log('Session map token add error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while adding token', 500);
}
