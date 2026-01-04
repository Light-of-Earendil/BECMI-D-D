<?php
/**
 * BECMI D&D Character Manager - Session Map Drawing Add Endpoint
 * 
 * Adds a drawing stroke/erase action to a map
 */

require_once '../../../../app/core/database.php';
require_once '../../../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Disable error display to prevent output before JSON
@ini_set('display_errors', 0);
@ini_set('display_startup_errors', 0);
// Keep error reporting on for logging, but don't display
error_reporting(E_ALL);

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

Security::init();
header('Content-Type: application/json; charset=utf-8');

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
    
    if (empty($data['path_data']) || !is_array($data['path_data'])) {
        $errors['path_data'] = 'Path data is required and must be an array';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $mapId = (int) $data['map_id'];
    $drawingType = isset($data['drawing_type']) && $data['drawing_type'] === 'erase' ? 'erase' : 'stroke';
    $color = isset($data['color']) ? trim($data['color']) : '#000000';
    $brushSize = isset($data['brush_size']) ? max(1, min(50, (int) $data['brush_size'])) : 3;
    $pathData = $data['path_data'];
    
    // Validate color format
    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
        Security::sendValidationErrorResponse(['color' => 'Invalid color format']);
    }
    
    // Validate path data (must be array of {x, y} objects)
    if (count($pathData) === 0) {
        Security::sendValidationErrorResponse(['path_data' => 'Path data cannot be empty']);
    }
    
    foreach ($pathData as $index => $point) {
        // Validate point is an array/object
        if (!is_array($point) && !is_object($point)) {
            Security::sendValidationErrorResponse(['path_data' => "Point at index $index must be an object with x and y properties"]);
        }
        
        // Convert object to array if needed
        if (is_object($point)) {
            $point = (array) $point;
        }
        
        if (!isset($point['x']) || !isset($point['y'])) {
            Security::sendValidationErrorResponse(['path_data' => "Point at index $index must have x and y coordinates"]);
        }
        if (!is_numeric($point['x']) || !is_numeric($point['y'])) {
            Security::sendValidationErrorResponse(['path_data' => "Point at index $index coordinates must be numeric"]);
        }
        
        // Validate coordinates are finite numbers
        if (!is_finite((float) $point['x']) || !is_finite((float) $point['y'])) {
            Security::sendValidationErrorResponse(['path_data' => "Point at index $index coordinates must be finite numbers"]);
        }
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
    
    // Encode path data to JSON
    $pathDataJson = json_encode($pathData);
    if ($pathDataJson === false) {
        $jsonError = json_last_error_msg();
        error_log("MAP DRAWING ADD: JSON encode failed: $jsonError");
        Security::sendErrorResponse('Failed to encode path data: ' . $jsonError, 500);
    }
    
    // Check JSON size (MySQL TEXT field can hold up to 65,535 bytes)
    if (strlen($pathDataJson) > 65535) {
        Security::sendValidationErrorResponse(['path_data' => 'Path data is too large (maximum 65,535 bytes)']);
    }
    
    // Insert drawing
    $drawingId = $db->insert(
        "INSERT INTO session_map_drawings 
         (map_id, user_id, drawing_type, color, brush_size, path_data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [$mapId, $userId, $drawingType, $color, $brushSize, $pathDataJson]
    );
    
    // Broadcast event
    try {
        require_once '../../../../app/services/event-broadcaster.php';
        $eventData = [
            'map_id' => $mapId,
            'drawing_id' => $drawingId,
            'user_id' => $userId,
            'drawing_type' => $drawingType,
            'color' => $color,
            'brush_size' => $brushSize,
            'path_data' => $pathData
        ];
        error_log("MAP DRAWING ADD: Broadcasting event for session {$map['session_id']}, map_id: $mapId, drawing_id: $drawingId");
        $broadcastResult = broadcastEvent(
            $map['session_id'],
            'map_drawing_added',
            $eventData,
            $userId
        );
        if (!$broadcastResult) {
            error_log("MAP DRAWING ADD: Failed to broadcast event for drawing_id: $drawingId");
        } else {
            error_log("MAP DRAWING ADD: Broadcast successful for drawing_id: $drawingId");
        }
    } catch (Exception $broadcastError) {
        // Log broadcast error but don't fail the request
        error_log("MAP DRAWING ADD: Broadcast error: " . $broadcastError->getMessage());
    }
    
    // Get created drawing
    $drawing = $db->selectOne(
        "SELECT 
            drawing_id,
            map_id,
            user_id,
            drawing_type,
            color,
            brush_size,
            path_data,
            created_at
         FROM session_map_drawings
         WHERE drawing_id = ?",
        [$drawingId]
    );
    
    if (!$drawing) {
        @error_log("MAP DRAWING ADD: Failed to retrieve drawing with ID: $drawingId");
        Security::sendErrorResponse('Failed to retrieve created drawing', 500);
    }
    
    // Decode path_data safely
    $pathDataDecoded = json_decode($drawing['path_data'], true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        @error_log("MAP DRAWING ADD: JSON decode error in drawing response: " . json_last_error_msg());
        $pathDataDecoded = [];
    }
    
    $formatted = [
        'drawing_id' => (int) $drawing['drawing_id'],
        'map_id' => (int) $drawing['map_id'],
        'user_id' => (int) $drawing['user_id'],
        'drawing_type' => $drawing['drawing_type'],
        'color' => $drawing['color'],
        'brush_size' => (int) $drawing['brush_size'],
        'path_data' => $pathDataDecoded,
        'created_at' => $drawing['created_at']
    ];
    
    Security::sendSuccessResponse($formatted, 'Drawing added successfully');
    
} catch (Exception $e) {
    error_log('Session map drawing add error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while adding drawing', 500);
}
