<?php
/**
 * BECMI D&D Character Manager - Create Hex Map Endpoint
 * 
 * Allows authenticated users (DMs) to create a new hex map.
 * Validates input, checks session permissions if linking to a session, and creates map in database.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_name` (string, required) - Map name (3-100 characters)
 * - `map_description` (string, optional) - Map description
 * - `session_id` (int, optional) - Session ID to link map to (user must be DM of session)
 * - `width_hexes` (int, optional, default: 20) - Map width in hexes (1-200)
 * - `height_hexes` (int, optional, default: 20) - Map height in hexes (1-200)
 * - `hex_size_pixels` (int, optional, default: 50) - Hex size in pixels (10-200)
 * - `background_image_url` (string, optional) - Background image URL
 * - `scale` (float, optional) - Distance in miles from center of one hex to center of the next (positive number, or null/empty if not applicable)
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Hex map created successfully",
 *   "data": {
 *     "map_id": int,
 *     "map_name": string,
 *     "map_description": string,
 *     "created_by_user_id": int,
 *     "session_id": int|null,
 *     "width_hexes": int,
 *     "height_hexes": int,
 *     "hex_size_pixels": int,
 *     "background_image_url": string|null,
 *     "is_active": bool,
 *     "created_at": string,
 *     "updated_at": string
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Requires authentication
 * - If `session_id` provided, user must be DM of that session
 * 
 * **Validation:**
 * - Map name: 3-100 characters
 * - Width/Height: 1-200 hexes
 * - Hex size: 10-200 pixels
 * - Session ID: Must exist and user must be DM
 * 
 * **Called From:**
 * - `HexMapEditorModule.createMap()` - When creating new map
 * 
 * **Side Effects:**
 * - Creates new row in `hex_maps` table
 * - Logs security event `hex_map_created`
 * 
 * @package api/hex-maps
 * @api POST /api/hex-maps/create.php
 * @since 1.0.0
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
    $campaignId = isset($input['campaign_id']) ? (int) $input['campaign_id'] : null;
    $widthHexes = isset($input['width_hexes']) ? (int) $input['width_hexes'] : 20;
    $heightHexes = isset($input['height_hexes']) ? (int) $input['height_hexes'] : 20;
    $hexSizePixels = isset($input['hex_size_pixels']) ? (int) $input['hex_size_pixels'] : 50;
    $backgroundImageUrl = Security::sanitizeInput($input['background_image_url'] ?? '');
    
    // Handle scale - distance in miles from center of one hex to center of the next
    $scale = null;
    if (isset($input['scale']) && $input['scale'] !== null && $input['scale'] !== '') {
        $scale = filter_var($input['scale'], FILTER_VALIDATE_FLOAT);
        if ($scale === false || $scale < 0) {
            $errors['scale'] = 'Scale must be a positive number (miles)';
        }
    }
    
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
    
    // Validate campaign_id if provided
    if ($campaignId !== null && $campaignId > 0) {
        $db = getDB();
        $campaign = $db->selectOne(
            "SELECT campaign_id, dm_user_id FROM campaigns WHERE campaign_id = ?",
            [$campaignId]
        );
        
        if (!$campaign) {
            $errors['campaign_id'] = 'Campaign not found';
        } else {
            // Verify user is the DM of this campaign
            $userId = Security::getCurrentUserId();
            if ($campaign['dm_user_id'] != $userId) {
                $errors['campaign_id'] = 'You must be the DM of this campaign to link a map to it';
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
    // Try to include scale and campaign_id, but handle gracefully if columns don't exist yet
    try {
        $mapId = $db->insert(
            'INSERT INTO hex_maps (
                map_name,
                map_description,
                created_by_user_id,
                campaign_id,
                session_id,
                width_hexes,
                height_hexes,
                hex_size_pixels,
                background_image_url,
                scale,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [
                $mapName,
                $mapDescription ?: null,
                $userId,
                $campaignId,
                $sessionId,
                $widthHexes,
                $heightHexes,
                $hexSizePixels,
                $backgroundImageUrl ?: null,
                $scale
            ]
        );
    } catch (Exception $e) {
        // If scale or campaign_id column doesn't exist yet, try without them
        if (strpos($e->getMessage(), 'scale') !== false || strpos($e->getMessage(), 'campaign_id') !== false || strpos($e->getMessage(), 'Unknown column') !== false) {
            try {
                $mapId = $db->insert(
                    'INSERT INTO hex_maps (
                        map_name,
                        map_description,
                        created_by_user_id,
                        campaign_id,
                        session_id,
                        width_hexes,
                        height_hexes,
                        hex_size_pixels,
                        background_image_url,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                    [
                        $mapName,
                        $mapDescription ?: null,
                        $userId,
                        $campaignId,
                        $sessionId,
                        $widthHexes,
                        $heightHexes,
                        $hexSizePixels,
                        $backgroundImageUrl ?: null
                    ]
                );
            } catch (Exception $e2) {
                // If campaign_id also doesn't exist, try without it
                if (strpos($e2->getMessage(), 'campaign_id') !== false || strpos($e2->getMessage(), 'Unknown column') !== false) {
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
                } else {
                    throw $e2;
                }
            }
        } else {
            throw $e;
        }
    }
    
    // Get the created map
    // Try to include scale and campaign_id, but handle gracefully if columns don't exist yet
    try {
        $map = $db->selectOne(
            "SELECT map_id, map_name, map_description, created_by_user_id, campaign_id, session_id,
                    width_hexes, height_hexes, hex_size_pixels, background_image_url,
                    scale, is_active, created_at, updated_at
             FROM hex_maps
             WHERE map_id = ?",
            [$mapId]
        );
    } catch (Exception $e) {
        // If scale or campaign_id column doesn't exist yet, select without them
        if (strpos($e->getMessage(), 'scale') !== false || strpos($e->getMessage(), 'campaign_id') !== false || strpos($e->getMessage(), 'Unknown column') !== false) {
            try {
                $map = $db->selectOne(
                    "SELECT map_id, map_name, map_description, created_by_user_id, campaign_id, session_id,
                            width_hexes, height_hexes, hex_size_pixels, background_image_url,
                            is_active, created_at, updated_at
                     FROM hex_maps
                     WHERE map_id = ?",
                    [$mapId]
                );
                if (strpos($e->getMessage(), 'scale') !== false) {
                    $map['scale'] = null;
                }
            } catch (Exception $e2) {
                // If campaign_id also doesn't exist, select without it
                if (strpos($e2->getMessage(), 'campaign_id') !== false || strpos($e2->getMessage(), 'Unknown column') !== false) {
                    $map = $db->selectOne(
                        "SELECT map_id, map_name, map_description, created_by_user_id, session_id,
                                width_hexes, height_hexes, hex_size_pixels, background_image_url,
                                is_active, created_at, updated_at
                         FROM hex_maps
                         WHERE map_id = ?",
                        [$mapId]
                    );
                    $map['campaign_id'] = null;
                    if (strpos($e->getMessage(), 'scale') !== false) {
                        $map['scale'] = null;
                    }
                } else {
                    throw $e2;
                }
            }
        } else {
            throw $e;
        }
    }
    
    Security::logSecurityEvent('hex_map_created', [
        'map_id' => $mapId,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'map_id' => (int) $map['map_id'],
        'map_name' => $map['map_name'],
        'map_description' => $map['map_description'],
        'created_by_user_id' => (int) $map['created_by_user_id'],
        'campaign_id' => isset($map['campaign_id']) && $map['campaign_id'] ? (int) $map['campaign_id'] : null,
        'session_id' => $map['session_id'] ? (int) $map['session_id'] : null,
        'width_hexes' => (int) $map['width_hexes'],
        'height_hexes' => (int) $map['height_hexes'],
        'hex_size_pixels' => (int) $map['hex_size_pixels'],
        'background_image_url' => $map['background_image_url'],
        'scale' => isset($map['scale']) && $map['scale'] !== null ? (float) $map['scale'] : null,
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
