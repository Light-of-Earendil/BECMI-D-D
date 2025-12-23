<?php
/**
 * BECMI D&D Character Manager - Delete Hex Map Marker Endpoint
 * 
 * Deletes a marker from a hex map.
 * 
 * Request: POST
 * Body: {
 *   "marker_id": int (required)
 * }
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
    $markerId = isset($input['marker_id']) ? (int) $input['marker_id'] : 0;
    
    if ($markerId <= 0) {
        Security::sendValidationErrorResponse(['marker_id' => 'Valid marker ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get marker and verify permissions
    $marker = $db->selectOne(
        "SELECT hmm.marker_id, hmm.map_id, hm.created_by_user_id, hm.session_id, gs.dm_user_id as session_dm_user_id
         FROM hex_map_markers hmm
         JOIN hex_maps hm ON hmm.map_id = hm.map_id
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hmm.marker_id = ?",
        [$markerId]
    );
    
    if (!$marker) {
        Security::sendErrorResponse('Marker not found', 404);
    }
    
    // Check permissions: creator or session DM can delete
    $canDelete = false;
    if ($marker['created_by_user_id'] == $userId) {
        $canDelete = true;
    } elseif ($marker['session_id'] && $marker['session_dm_user_id'] == $userId) {
        $canDelete = true;
    }
    
    if (!$canDelete) {
        Security::sendErrorResponse('You do not have permission to delete this marker', 403);
    }
    
    // Delete the marker
    $db->delete("DELETE FROM hex_map_markers WHERE marker_id = ?", [$markerId]);
    
    Security::logSecurityEvent('hex_map_marker_deleted', [
        'marker_id' => $markerId,
        'map_id' => $marker['map_id'],
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'marker_id' => $markerId
    ], 'Marker deleted successfully');
    
} catch (Exception $e) {
    error_log('Hex map marker delete error: ' . $e->getMessage());
    error_log('Hex map marker delete trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting the marker', 500);
}
?>
