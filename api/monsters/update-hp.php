<?php
/**
 * BECMI D&D Character Manager - Update Monster Instance HP
 * 
 * Updates HP for a monster instance and checks if it's dead.
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
    $newHP = isset($input['new_hp']) ? (int) $input['new_hp'] : null;
    $hpChange = isset($input['hp_change']) ? (int) $input['hp_change'] : null; // Relative change
    
    if ($instanceId <= 0) {
        Security::sendValidationErrorResponse(['instance_id' => 'Valid instance ID is required']);
    }
    
    if ($newHP === null && $hpChange === null) {
        Security::sendValidationErrorResponse(['new_hp or hp_change' => 'Either new_hp or hp_change is required']);
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
        Security::sendErrorResponse('Only the DM can update monster HP', 403);
    }
    
    // Calculate new HP
    $currentHP = (int) $instance['current_hp'];
    if ($newHP !== null) {
        $finalHP = max(-10, $newHP); // Minimum -10 HP
    } else {
        $finalHP = max(-10, $currentHP + $hpChange);
    }
    
    // Update HP
    $db->execute(
        "UPDATE monster_instances 
         SET current_hp = ?, updated_at = NOW()
         WHERE instance_id = ?",
        [$finalHP, $instanceId]
    );
    
    // Check if dead
    $isDead = $finalHP <= 0;
    
    // If dead, mark as inactive in initiative tracker
    if ($isDead) {
        $db->execute(
            "UPDATE combat_initiatives 
             SET is_active = 0
             WHERE monster_instance_id = ? AND is_active = 1",
            [$instanceId]
        );
    }
    
    Security::sendSuccessResponse([
        'instance_id' => $instanceId,
        'current_hp' => $finalHP,
        'max_hp' => (int) $instance['max_hp'],
        'is_dead' => $isDead
    ], $isDead ? 'Monster is dead' : 'Monster HP updated');
    
} catch (Exception $e) {
    error_log("Update monster HP error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to update monster HP: ' . $e->getMessage(), 500);
}
?>
