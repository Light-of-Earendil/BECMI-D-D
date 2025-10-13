<?php
/**
 * BECMI D&D Character Manager - Long Rest
 * 
 * Resets all spells to unmemorized state after a long rest.
 * Allows character to re-memorize spells for the new day.
 * 
 * @return JSON Success/error response
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
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($data === null) {
        Security::sendErrorResponse('Invalid JSON data', 400);
    }
    
    // Validate required fields
    $required = ['character_id'];
    $validation = Security::validateRequired($data, $required);
    if (!$validation['valid']) {
        Security::sendValidationErrorResponse($validation['errors']);
    }
    
    $characterId = (int) $data['character_id'];
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify character ownership or DM access
    $character = $db->selectOne(
        "SELECT c.user_id, c.session_id, gs.dm_user_id, c.character_name
         FROM characters c
         LEFT JOIN game_sessions gs ON c.session_id = gs.session_id
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check permissions
    $isOwner = $character['user_id'] == $userId;
    $isDM = $character['session_id'] && $character['dm_user_id'] == $userId;
    
    if (!$isOwner && !$isDM) {
        Security::sendErrorResponse('You do not have permission to rest this character', 403);
    }
    
    // Reset all spells
    $db->execute(
        "UPDATE character_spells
         SET is_memorized = FALSE,
             times_cast_today = 0
         WHERE character_id = ?",
        [$characterId]
    );
    
    // Get total spell count for response
    $spellCount = $db->selectOne(
        "SELECT COUNT(*) as count
         FROM character_spells
         WHERE character_id = ?",
        [$characterId]
    );
    
    // Log the change
    $db->execute(
        "INSERT INTO character_changes 
         (character_id, user_id, change_type, field_name, new_value, change_reason)
         VALUES (?, ?, 'other', 'long_rest', 'completed', 'Character took a long rest')",
        [
            $characterId,
            $userId
        ]
    );
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'character_name' => $character['character_name'],
        'spells_reset' => (int) $spellCount['count']
    ], 'Long rest completed. All spells have been reset.');
    
} catch (Exception $e) {
    error_log("Long rest error: " . $e->getMessage());
    error_log("Long rest error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to complete long rest', 500);
}
?>

