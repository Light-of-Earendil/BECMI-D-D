<?php
/**
 * BECMI D&D Character Manager - Add Character to Initiative
 * 
 * Adds a character to the initiative tracker.
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
    
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID is required']);
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
        Security::sendErrorResponse('Only the DM can add characters to initiative', 403);
    }
    
    // Get character
    $character = $db->selectOne(
        "SELECT character_id, character_name, dexterity, session_id
         FROM characters
         WHERE character_id = ? AND session_id = ? AND is_active = 1",
        [$characterId, $sessionId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found in this session', 404);
    }
    
    // Check if already in initiative
    $existing = $db->selectOne(
        "SELECT initiative_id FROM combat_initiatives 
         WHERE session_id = ? AND character_id = ? AND is_active = 1",
        [$sessionId, $characterId]
    );
    
    if ($existing) {
        Security::sendErrorResponse('Character is already in initiative tracker', 400);
    }
    
    // Roll initiative (1d6)
    $initiativeRoll = rand(1, 6);
    
    // Get dexterity
    $dexterity = $character['dexterity'] ? (int) $character['dexterity'] : null;
    
    // Add to initiative
    $initiativeId = $db->insert(
        "INSERT INTO combat_initiatives 
         (session_id, character_id, entity_name, entity_type, initiative_roll, dexterity)
         VALUES (?, ?, ?, 'character', ?, ?)",
        [
            $sessionId,
            $characterId,
            $character['character_name'],
            $initiativeRoll,
            $dexterity
        ]
    );
    
    // Log security event
    Security::logSecurityEvent('character_added_to_initiative', [
        'session_id' => $sessionId,
        'character_id' => $characterId,
        'initiative_id' => $initiativeId
    ]);
    
    // Clear any output before sending response
    while (ob_get_level()) {
        @ob_end_clean();
    }
    
    Security::sendSuccessResponse([
        'initiative_id' => $initiativeId,
        'character_id' => $characterId,
        'entity_name' => $character['character_name'],
        'initiative_roll' => $initiativeRoll,
        'dexterity' => $dexterity
    ], 'Character added to initiative tracker');
    
} catch (Exception $e) {
    // Clear any output before sending error response
    while (ob_get_level()) {
        @ob_end_clean();
    }
    
    error_log("Add character to initiative error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to add character to initiative: ' . $e->getMessage(), 500);
}
?>
