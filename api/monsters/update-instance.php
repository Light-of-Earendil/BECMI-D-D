<?php
/**
 * BECMI D&D Character Manager - Update Monster Instance
 * 
 * Updates equipment, treasure, spells, notes for a monster instance.
 */

// Start output buffering immediately to catch any stray output
ob_start();

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (including the one we just started)
while (ob_get_level()) {
    @ob_end_clean();
}

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

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
    
    $instanceId = isset($input['instance_id']) ? (int) $input['instance_id'] : 0;
    
    if ($instanceId <= 0) {
        Security::sendValidationErrorResponse(['instance_id' => 'Valid instance ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get monster instance and verify DM access
    $instance = $db->selectOne(
        "SELECT mi.*, s.dm_user_id 
         FROM monster_instances mi
         JOIN game_sessions s ON mi.session_id = s.session_id
         WHERE mi.instance_id = ?",
        [$instanceId]
    );
    
    if (!$instance) {
        Security::sendErrorResponse('Monster instance not found', 404);
    }
    
    if ($instance['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can update monster instances', 403);
    }
    
    // Build update query
    $updates = [];
    $params = [];
    
    if (isset($input['equipment'])) {
        $updates[] = "equipment = ?";
        $params[] = is_array($input['equipment']) ? json_encode($input['equipment']) : $input['equipment'];
    }
    
    if (isset($input['treasure'])) {
        $updates[] = "treasure = ?";
        $params[] = is_array($input['treasure']) ? json_encode($input['treasure']) : $input['treasure'];
    }
    
    if (isset($input['spells'])) {
        $updates[] = "spells = ?";
        $params[] = is_array($input['spells']) ? json_encode($input['spells']) : $input['spells'];
    }
    
    if (isset($input['notes'])) {
        $updates[] = "notes = ?";
        $params[] = $input['notes'];
    }
    
    if (isset($input['instance_name'])) {
        $updates[] = "instance_name = ?";
        $params[] = trim($input['instance_name']);
    }
    
    if (isset($input['armor_class'])) {
        $updates[] = "armor_class = ?";
        $params[] = (int) $input['armor_class'];
    }
    
    if (isset($input['dexterity'])) {
        $updates[] = "dexterity = ?";
        $params[] = $input['dexterity'] !== null ? (int) $input['dexterity'] : null;
    }
    
    if (empty($updates)) {
        Security::sendValidationErrorResponse(['fields' => 'At least one field must be provided for update']);
    }
    
    $params[] = $instanceId;
    
    // Update instance
    $db->execute(
        "UPDATE monster_instances 
         SET " . implode(', ', $updates) . ", updated_at = NOW()
         WHERE instance_id = ?",
        $params
    );
    
    // Get updated instance
    $updated = $db->selectOne(
        "SELECT * FROM monster_instances WHERE instance_id = ?",
        [$instanceId]
    );
    
    Security::sendSuccessResponse($updated, 'Monster instance updated successfully');
    
} catch (Exception $e) {
    error_log("Update monster instance error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to update monster instance: ' . $e->getMessage(), 500);
}
?>
