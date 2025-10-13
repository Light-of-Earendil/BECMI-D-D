<?php
/**
 * BECMI D&D Character Manager - Cast Spell
 * 
 * Casts a memorized spell, removing it from memorized spells.
 * In BECMI, once cast, a spell is no longer memorized until rest.
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
    $required = ['character_id', 'spell_id'];
    $validation = Security::validateRequired($data, $required);
    if (!$validation['valid']) {
        Security::sendValidationErrorResponse($validation['errors']);
    }
    
    $characterId = (int) $data['character_id'];
    $spellId = (int) $data['spell_id'];
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify character ownership or DM access
    $character = $db->selectOne(
        "SELECT c.user_id, c.session_id, gs.dm_user_id
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
        Security::sendErrorResponse('You do not have permission to cast spells for this character', 403);
    }
    
    // Get spell details and verify it's memorized
    $spell = $db->selectOne(
        "SELECT cs.spell_id, cs.spell_name, cs.spell_level, cs.is_memorized,
                s.description
         FROM character_spells cs
         JOIN spells s ON cs.spell_id = s.spell_id
         WHERE cs.character_id = ? AND cs.spell_id = ?",
        [$characterId, $spellId]
    );
    
    if (!$spell) {
        Security::sendErrorResponse('Spell not in character\'s spellbook', 404);
    }
    
    if (!$spell['is_memorized']) {
        Security::sendErrorResponse('This spell is not currently memorized', 400);
    }
    
    // Cast the spell (unmemorize it and increment times_cast_today)
    $db->execute(
        "UPDATE character_spells
         SET is_memorized = FALSE,
             times_cast_today = times_cast_today + 1
         WHERE character_id = ? AND spell_id = ?",
        [$characterId, $spellId]
    );
    
    // Log the change
    $db->execute(
        "INSERT INTO character_changes 
         (character_id, user_id, change_type, field_name, new_value, change_reason)
         VALUES (?, ?, 'spell', 'cast_spell', ?, 'Cast spell')",
        [
            $characterId,
            $userId,
            $spell['spell_name']
        ]
    );
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'spell' => [
            'spell_id' => (int) $spell['spell_id'],
            'spell_name' => $spell['spell_name'],
            'spell_level' => (int) $spell['spell_level'],
            'description' => $spell['description']
        ]
    ], "Cast spell: {$spell['spell_name']}");
    
} catch (Exception $e) {
    error_log("Cast spell error: " . $e->getMessage());
    error_log("Cast spell error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to cast spell', 500);
}
?>

