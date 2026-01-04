<?php
/**
 * BECMI D&D Character Manager - Session Map Update Endpoint
 * 
 * Updates map metadata or sets active map
 * 
 * Request: PUT/PATCH
 * Body: {
 *   "map_id": int (required),
 *   "map_name": string (optional),
 *   "is_active": boolean (optional, DM only)
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "map_id": int,
 *     "map_name": string,
 *     "is_active": boolean
 *   }
 * }
 */

// CRITICAL: Disable error display to prevent output before JSON
@ini_set('display_errors', 0);
@ini_set('display_startup_errors', 0);
// Keep error reporting on for logging, but don't display
error_reporting(E_ALL);

// CRITICAL: Clear ALL output buffers before anything else
// This must be done before any require_once to prevent output from included files
while (ob_get_level()) {
    ob_end_clean();
}

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Start output buffering to catch any accidental output
ob_start();

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

// Clear any output from require_once
if (ob_get_level() > 0) {
    ob_clean();
}

Security::init();

// CRITICAL: Set headers AFTER clearing all output
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    if (!$db) {
        error_log("MAP UPDATE: Failed to get database connection");
        Security::sendErrorResponse('Database connection failed', 500);
    }
    
    $userId = Security::getCurrentUserId();
    if (!$userId) {
        error_log("MAP UPDATE: Failed to get user ID");
        Security::sendErrorResponse('Authentication failed', 401);
    }
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    $mapId = isset($data['map_id']) ? (int) $data['map_id'] : null;
    
    if (!$mapId) {
        Security::sendValidationErrorResponse(['map_id' => 'Map ID is required']);
    }
    
    // Get map and verify access
    try {
        $map = $db->selectOne(
            "SELECT m.map_id, m.session_id, m.map_name, m.is_active,
                    s.dm_user_id
             FROM session_maps m
             JOIN game_sessions s ON m.session_id = s.session_id
             WHERE m.map_id = ?",
            [$mapId]
        );
    } catch (Exception $dbError) {
        error_log("MAP UPDATE: Database query error: " . $dbError->getMessage());
        Security::sendErrorResponse('Database query failed', 500);
    }
    
    if (!$map) {
        Security::sendErrorResponse('Map not found', 404);
    }
    
    // Only DM can update maps
    if ($map['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can update maps', 403);
    }
    
    $updates = [];
    $params = [];
    
    // Update map name if provided
    if (isset($data['map_name'])) {
        $mapName = trim($data['map_name']);
        if (strlen($mapName) === 0) {
            Security::sendValidationErrorResponse(['map_name' => 'Map name cannot be empty']);
        }
        if (strlen($mapName) > 100) {
            Security::sendValidationErrorResponse(['map_name' => 'Map name must be 100 characters or less']);
        }
        $updates[] = "map_name = ?";
        $params[] = $mapName;
    }
    
    // Update active status if provided (DM only)
    if (isset($data['is_active'])) {
        $isActive = (bool) $data['is_active'];
        
        if ($isActive) {
            // Set all other maps in session to inactive
            try {
                $db->execute(
                    "UPDATE session_maps SET is_active = FALSE WHERE session_id = ?",
                    [$map['session_id']]
                );
            } catch (Exception $updateError) {
                error_log("MAP UPDATE: Failed to set other maps inactive: " . $updateError->getMessage());
                Security::sendErrorResponse('Failed to update map status', 500);
            }
            
            // Broadcast map_refresh event so players reload and see the new active map
            try {
                // CRITICAL: Clear any output before requiring file to prevent output
                if (ob_get_level() > 0) {
                    ob_clean();
                }
                
                require_once '../../../app/services/event-broadcaster.php';
                
                // CRITICAL: Clear any output after require
                if (ob_get_level() > 0) {
                    ob_clean();
                }
                
                $broadcastResult = broadcastEvent(
                    $map['session_id'],
                    'map_refresh',
                    [
                        'session_id' => $map['session_id']
                    ],
                    $userId
                );
                
                if (!$broadcastResult) {
                    error_log("MAP UPDATE: Failed to broadcast map_refresh event for session_id: {$map['session_id']}");
                }
                
                // CRITICAL: Clear any output after broadcast to prevent output before JSON
                if (ob_get_level() > 0) {
                    ob_clean();
                }
            } catch (Exception $broadcastError) {
                // Log broadcast error but don't fail the request
                error_log("MAP UPDATE: Broadcast error: " . $broadcastError->getMessage());
                
                // CRITICAL: Clear any output from error
                if (ob_get_level() > 0) {
                    ob_clean();
                }
            }
        }
        
        $updates[] = "is_active = ?";
        $params[] = $isActive ? 1 : 0;
    }
    
    if (empty($updates)) {
        Security::sendValidationErrorResponse(['message' => 'No fields to update']);
    }
    
    // Add map_id for WHERE clause
    $params[] = $mapId;
    
    // Update map
    try {
        $db->execute(
            "UPDATE session_maps SET " . implode(', ', $updates) . " WHERE map_id = ?",
            $params
        );
    } catch (Exception $updateError) {
        error_log("MAP UPDATE: Update query error: " . $updateError->getMessage());
        error_log("MAP UPDATE: Update query: UPDATE session_maps SET " . implode(', ', $updates) . " WHERE map_id = ?");
        error_log("MAP UPDATE: Update params: " . print_r($params, true));
        Security::sendErrorResponse('Failed to update map: ' . $updateError->getMessage(), 500);
    }
    
    // Get updated map
    try {
        $updatedMap = $db->selectOne(
            "SELECT map_id, map_name, is_active FROM session_maps WHERE map_id = ?",
            [$mapId]
        );
    } catch (Exception $selectError) {
        error_log("MAP UPDATE: Select query error: " . $selectError->getMessage());
        Security::sendErrorResponse('Failed to retrieve updated map', 500);
    }
    
    if (!$updatedMap) {
        error_log("MAP UPDATE: Updated map not found with ID: $mapId");
        Security::sendErrorResponse('Failed to retrieve updated map', 500);
    }
    
    // CRITICAL: Clear any output before sending response
    if (ob_get_level() > 0) {
        ob_clean();
    }
    
    // CRITICAL: End output buffering and send response
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    
    Security::sendSuccessResponse([
        'map_id' => (int) $updatedMap['map_id'],
        'map_name' => $updatedMap['map_name'],
        'is_active' => (bool) $updatedMap['is_active']
    ], 'Map updated successfully');
    
} catch (Throwable $e) {
    // CRITICAL: Clear any output before sending error response
    if (ob_get_level() > 0) {
        ob_clean();
    }
    
    // CRITICAL: End output buffering
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    
    error_log("MAP UPDATE ERROR: " . $e->getMessage());
    error_log("MAP UPDATE ERROR STACK TRACE: " . $e->getTraceAsString());
    error_log("MAP UPDATE ERROR FILE: " . $e->getFile() . " LINE: " . $e->getLine());
    
    // Ensure we can send error response
    try {
        Security::sendErrorResponse('Failed to update map: ' . $e->getMessage(), 500);
    } catch (Throwable $sendError) {
        // Last resort - send raw error
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to update map: ' . $e->getMessage()
        ]);
        exit;
    }
}
