<?php
/**
 * BECMI D&D Character Manager - Add Monster to Initiative
 * 
 * Adds a monster instance to the initiative tracker.
 */

// Disable error display to prevent warnings/notices from corrupting JSON
@ini_set('display_errors', 0);
@error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);

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
    
    $monsterInstanceId = isset($input['monster_instance_id']) ? (int) $input['monster_instance_id'] : 0;
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    
    if ($monsterInstanceId <= 0) {
        Security::sendValidationErrorResponse(['monster_instance_id' => 'Valid monster instance ID is required']);
    }
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user is DM
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can add monsters to initiative', 403);
    }
    
    // Get monster instance
    $monsterInstance = $db->selectOne(
        "SELECT mi.*, m.name as monster_name, m.hit_dice
         FROM monster_instances mi
         JOIN monsters m ON mi.monster_id = m.monster_id
         WHERE mi.instance_id = ? AND mi.session_id = ?",
        [$monsterInstanceId, $sessionId]
    );
    
    if (!$monsterInstance) {
        Security::sendErrorResponse('Monster instance not found', 404);
    }
    
    // Check if already in initiative
    $existing = $db->selectOne(
        "SELECT initiative_id FROM combat_initiatives 
         WHERE session_id = ? AND monster_instance_id = ? AND is_active = 1",
        [$sessionId, $monsterInstanceId]
    );
    
    if ($existing) {
        Security::sendErrorResponse('Monster instance is already in initiative tracker', 400);
    }
    
    // Roll initiative (1d6)
    $initiativeRoll = rand(1, 6);
    
    // Get dexterity (use from instance if set, otherwise null)
    $dexterity = $monsterInstance['dexterity'];
    
    // Add to initiative
    $initiativeId = $db->insert(
        "INSERT INTO combat_initiatives 
         (session_id, monster_instance_id, entity_name, entity_type, initiative_roll, dexterity)
         VALUES (?, ?, ?, 'monster', ?, ?)",
        [
            $sessionId,
            $monsterInstanceId,
            $monsterInstance['instance_name'],
            $initiativeRoll,
            $dexterity
        ]
    );
    
    // Log security event
    Security::logSecurityEvent('monster_added_to_initiative', [
        'session_id' => $sessionId,
        'monster_instance_id' => $monsterInstanceId,
        'initiative_id' => $initiativeId
    ]);
    
    // Clear any output before sending response
    while (ob_get_level()) {
        @ob_end_clean();
    }
    
    Security::sendSuccessResponse([
        'initiative_id' => $initiativeId,
        'monster_instance_id' => $monsterInstanceId,
        'entity_name' => $monsterInstance['instance_name'],
        'initiative_roll' => $initiativeRoll,
        'dexterity' => $dexterity
    ], 'Monster added to initiative tracker');
    
} catch (Exception $e) {
    // Clear any output before sending error response
    while (ob_get_level()) {
        @ob_end_clean();
    }
    
    error_log("Add monster to initiative error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to add monster to initiative: ' . $e->getMessage(), 500);
}
?>
