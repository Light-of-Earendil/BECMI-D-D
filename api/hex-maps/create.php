<?php
/**
 * BECMI D&D Character Manager - Create Hex Map Endpoint
 * 
 * Allows authenticated users (DMs) to create a new hex map.
 * 
 * Request: POST
 * Body: {
 *   "map_name": string (required),
 *   "map_description": string (optional),
 *   "session_id": int (optional),
 *   "width_hexes": int (default: 20),
 *   "height_hexes": int (default: 20),
 *   "hex_size_pixels": int (default: 50),
 *   "background_image_url": string (optional)
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Hex map created successfully",
 *   "data": {
 *     "map_id": int,
 *     "map_name": string,
 *     ...
 *   }
 * }
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
    $mapName = Security::sanitizeInput($input['map_name'] ?? '');
    $mapDescription = Security::sanitizeInput($input['map_description'] ?? '');
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : null;
    $widthHexes = isset($input['width_hexes']) ? (int) $input['width_hexes'] : 20;
    $heightHexes = isset($input['height_hexes']) ? (int) $input['height_hexes'] : 20;
    $hexSizePixels = isset($input['hex_size_pixels']) ? (int) $input['hex_size_pixels'] : 50;
    $backgroundImageUrl = Security::sanitizeInput($input['background_image_url'] ?? '');
    
    $errors = [];
    
    // Validate map name
    if (strlen($mapName) < 3 || strlen($mapName) > 100) {
        $errors['map_name'] = 'Map name must be between 3 and 100 characters';
    }
    
    // Validate dimensions
    if ($widthHexes < 1 || $widthHexes > 200) {
        $errors['width_hexes'] = 'Width must be between 1 and 200 hexes';
    }
    
    if ($heightHexes < 1 || $heightHexes > 200) {
        $errors['height_hexes'] = 'Height must be between 1 and 200 hexes';
    }
    
    if ($hexSizePixels < 10 || $hexSizePixels > 200) {
        $errors['hex_size_pixels'] = 'Hex size must be between 10 and 200 pixels';
    }
    
    // Validate session_id if provided
    if ($sessionId !== null && $sessionId > 0) {
        $db = getDB();
        $session = $db->selectOne(
            "SELECT session_id, dm_user_id FROM game_sessions WHERE session_id = ?",
            [$sessionId]
        );
        
        if (!$session) {
            $errors['session_id'] = 'Session not found';
        } else {
            // Verify user is the DM of this session
            $userId = Security::getCurrentUserId();
            if ($session['dm_user_id'] != $userId) {
                $errors['session_id'] = 'You must be the DM of this session to link a map to it';
            }
        }
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Create the map
    $mapId = $db->insert(
        'INSERT INTO hex_maps (
            map_name,
            map_description,
            created_by_user_id,
            session_id,
            width_hexes,
            height_hexes,
            hex_size_pixels,
            background_image_url,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [
            $mapName,
            $mapDescription ?: null,
            $userId,
            $sessionId,
            $widthHexes,
            $heightHexes,
            $hexSizePixels,
            $backgroundImageUrl ?: null
        ]
    );
    
    // Get the created map
    $map = $db->selectOne(
        "SELECT map_id, map_name, map_description, created_by_user_id, session_id,
                width_hexes, height_hexes, hex_size_pixels, background_image_url,
                is_active, created_at, updated_at
         FROM hex_maps
         WHERE map_id = ?",
        [$mapId]
    );
    
    Security::logSecurityEvent('hex_map_created', [
        'map_id' => $mapId,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'map_id' => (int) $map['map_id'],
        'map_name' => $map['map_name'],
        'map_description' => $map['map_description'],
        'created_by_user_id' => (int) $map['created_by_user_id'],
        'session_id' => $map['session_id'] ? (int) $map['session_id'] : null,
        'width_hexes' => (int) $map['width_hexes'],
        'height_hexes' => (int) $map['height_hexes'],
        'hex_size_pixels' => (int) $map['hex_size_pixels'],
        'background_image_url' => $map['background_image_url'],
        'is_active' => (bool) $map['is_active'],
        'created_at' => $map['created_at'],
        'updated_at' => $map['updated_at']
    ], 'Hex map created successfully');
    
} catch (Exception $e) {
    error_log('Hex map creation error: ' . $e->getMessage());
    error_log('Hex map creation trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while creating the hex map', 500);
}
?>
