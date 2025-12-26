<?php
/**
 * BECMI D&D Character Manager - Create Hex Map Marker Endpoint
 * 
 * Creates a marker (settlement, POI, etc.) on a hex map.
 * Validates marker type and ensures only one marker per hex.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_id` (int, required) - Map ID
 * - `q` (int, required) - Hex column coordinate
 * - `r` (int, required) - Hex row coordinate
 * - `marker_type` (string, required) - Marker type: "village", "town", "city", "castle", "fort", "ruins", "poi", "note", "encounter", "treasure", "area_label"
 * - `marker_name` (string, optional) - Marker name/label
 * - `marker_description` (string, optional) - Marker description
 * - `marker_icon` (string, optional) - Font Awesome icon class (e.g., "fa-home")
 * - `marker_color` (string, optional) - Marker color (hex code, e.g., "#8B7355")
 * - `is_visible_to_players` (boolean, optional, default: false) - Whether players can see this marker
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Marker created successfully",
 *   "data": {
 *     "marker_id": int,
 *     "map_id": int,
 *     "q": int,
 *     "r": int,
 *     "marker_type": string,
 *     "marker_name": string,
 *     ...
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Map creator: Can create markers
 * - Session DM: Can create markers
 * - Others: 403 Forbidden
 * 
 * **Validation:**
 * - Only one marker per hex (replaces existing marker if present)
 * - Valid marker_type required
 * 
 * **Marker Types:**
 * - Settlements: village, town, city, castle, fort, ruins
 * - Points of Interest: poi, encounter, treasure, note
 * - Area Labels: area_label (text-only labels for region/area names)
 * 
 * **Called From:**
 * - `HexMapEditorModule.placeSettlement()` - When placing settlement markers
 * 
 * **Side Effects:**
 * - Creates row in `hex_map_markers` table
 * - Replaces existing marker if one exists at (q, r)
 * - Logs security event `hex_map_marker_created`
 * 
 * @package api/hex-maps/markers
 * @api POST /api/hex-maps/markers/create.php
 * @since 1.0.0
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

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
    $q = isset($input['q']) ? (int) $input['q'] : null;
    $r = isset($input['r']) ? (int) $input['r'] : null;
    $markerType = Security::sanitizeInput($input['marker_type'] ?? '');
    
    $errors = [];
    
    if ($mapId <= 0) {
        $errors['map_id'] = 'Valid map ID is required';
    }
    
    if ($q === null) {
        $errors['q'] = 'Hex coordinate q is required';
    }
    
    if ($r === null) {
        $errors['r'] = 'Hex coordinate r is required';
    }
    
    if (empty($markerType)) {
        $errors['marker_type'] = 'Marker type is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify map exists and user has edit permissions
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.created_by_user_id, hm.session_id, gs.dm_user_id as session_dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Check permissions: creator or session DM can add markers
    $canEdit = false;
    if ($map['created_by_user_id'] == $userId) {
        $canEdit = true;
    } elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $canEdit = true;
    }
    
    if (!$canEdit) {
        Security::sendErrorResponse('You do not have permission to add markers to this map', 403);
    }
    
    // Get marker data
    $markerName = Security::sanitizeInput($input['marker_name'] ?? '');
    $markerDescription = Security::sanitizeInput($input['marker_description'] ?? '');
    $markerIcon = Security::sanitizeInput($input['marker_icon'] ?? getDefaultIconForType($markerType));
    $markerColor = Security::sanitizeInput($input['marker_color'] ?? getDefaultColorForType($markerType));
    $isVisibleToPlayers = isset($input['is_visible_to_players']) ? (bool) $input['is_visible_to_players'] : false;
    
    // Check if marker already exists at this location
    $existingMarker = $db->selectOne(
        "SELECT marker_id FROM hex_map_markers WHERE map_id = ? AND q = ? AND r = ?",
        [$mapId, $q, $r]
    );
    
    if ($existingMarker) {
        // Update existing marker
        $markerId = $existingMarker['marker_id'];
        $db->update(
            "UPDATE hex_map_markers SET
                marker_type = ?,
                marker_name = ?,
                marker_description = ?,
                marker_icon = ?,
                marker_color = ?,
                is_visible_to_players = ?,
                updated_at = NOW()
             WHERE marker_id = ?",
            [
                $markerType,
                $markerName ?: null,
                $markerDescription ?: null,
                $markerIcon,
                $markerColor,
                $isVisibleToPlayers,
                $markerId
            ]
        );
    } else {
        // Create new marker
        $markerId = $db->insert(
            "INSERT INTO hex_map_markers (
                map_id, q, r, marker_type, marker_name, marker_description,
                marker_icon, marker_color, is_visible_to_players,
                created_by_user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
            [
                $mapId,
                $q,
                $r,
                $markerType,
                $markerName ?: null,
                $markerDescription ?: null,
                $markerIcon,
                $markerColor,
                $isVisibleToPlayers,
                $userId
            ]
        );
    }
    
    // Get the marker
    $marker = $db->selectOne(
        "SELECT marker_id, map_id, q, r, marker_type, marker_name, marker_description,
                marker_icon, marker_color, is_visible_to_players,
                created_at, updated_at
         FROM hex_map_markers
         WHERE marker_id = ?",
        [$markerId]
    );
    
    Security::logSecurityEvent('hex_map_marker_created', [
        'marker_id' => $markerId,
        'map_id' => $mapId,
        'marker_type' => $markerType,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'marker_id' => (int) $marker['marker_id'],
        'map_id' => (int) $marker['map_id'],
        'q' => (int) $marker['q'],
        'r' => (int) $marker['r'],
        'marker_type' => $marker['marker_type'],
        'marker_name' => $marker['marker_name'],
        'marker_description' => $marker['marker_description'],
        'marker_icon' => $marker['marker_icon'],
        'marker_color' => $marker['marker_color'],
        'is_visible_to_players' => (bool) $marker['is_visible_to_players'],
        'created_at' => $marker['created_at'],
        'updated_at' => $marker['updated_at']
    ], $existingMarker ? 'Marker updated successfully' : 'Marker created successfully');
    
} catch (Exception $e) {
    error_log('Hex map marker create error: ' . $e->getMessage());
    error_log('Hex map marker create trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while creating the marker', 500);
}

/**
 * Get default icon for marker type
 */
function getDefaultIconForType($type) {
    $icons = [
        'village' => 'fa-home',
        'town' => 'fa-city',
        'city' => 'fa-building',
        'castle' => 'fa-chess-rook',
        'fort' => 'fa-shield-alt',
        'ruins' => 'fa-monument',
        'poi' => 'fa-map-marker-alt',
        'encounter' => 'fa-skull',
        'treasure' => 'fa-coins',
        'note' => 'fa-sticky-note'
    ];
    return $icons[$type] ?? 'fa-map-marker-alt';
}

/**
 * Get default color for marker type
 */
function getDefaultColorForType($type) {
    $colors = [
        'village' => '#8B7355',
        'town' => '#9C7C38',
        'city' => '#B08F43',
        'castle' => '#6B4423',
        'fort' => '#8B4513',
        'ruins' => '#696969',
        'poi' => '#FF6B6B',
        'encounter' => '#B33A2B',
        'treasure' => '#FFD700',
        'note' => '#7BD4D2'
    ];
    return $colors[$type] ?? '#FF0000';
}
?>
