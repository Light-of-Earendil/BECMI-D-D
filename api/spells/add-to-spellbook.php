<?php
/**
 * BECMI D&D Character Manager - Add Spell To Spellbook
 * 
 * Adds a spell to a character's spellbook.
 * Validates that the character's class can learn the spell.
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
    $learnedAtLevel = isset($data['learned_at_level']) ? (int) $data['learned_at_level'] : null;
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify character ownership or DM access
    $character = $db->selectOne(
        "SELECT c.user_id, c.class, c.level, c.session_id, gs.dm_user_id
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
        Security::sendErrorResponse('You do not have permission to modify this character', 403);
    }
    
    // Get spell details
    $spell = $db->selectOne(
        "SELECT spell_id, spell_name, spell_level, spell_type
         FROM spells
         WHERE spell_id = ?",
        [$spellId]
    );
    
    if (!$spell) {
        Security::sendErrorResponse('Spell not found', 404);
    }
    
    // Validate character class can learn this spell
    $characterClass = $character['class'];
    $spellType = $spell['spell_type'];
    
    $canLearnSpell = false;
    if ($spellType === 'magic_user' && in_array($characterClass, ['magic_user', 'elf'])) {
        $canLearnSpell = true;
    }
    if ($spellType === 'cleric' && in_array($characterClass, ['cleric', 'elf'])) {
        $canLearnSpell = true;
    }
    
    if (!$canLearnSpell) {
        Security::sendErrorResponse("This character class cannot learn {$spellType} spells", 400);
    }
    
    // Check if spell already in spellbook
    $existing = $db->selectOne(
        "SELECT character_id FROM character_spells
         WHERE character_id = ? AND spell_id = ?",
        [$characterId, $spellId]
    );
    
    if ($existing) {
        Security::sendErrorResponse('Spell already in spellbook', 400);
    }
    
    // Set learned_at_level if not provided
    if ($learnedAtLevel === null) {
        $learnedAtLevel = $character['level'];
    }
    
    // Add spell to character's spellbook
    $db->execute(
        "INSERT INTO character_spells 
         (character_id, spell_id, spell_name, spell_level, spell_type, 
          memorized_count, max_memorized, is_memorized, times_cast_today)
         VALUES (?, ?, ?, ?, ?, 0, 0, FALSE, 0)",
        [
            $characterId,
            $spellId,
            $spell['spell_name'],
            $spell['spell_level'],
            $spell['spell_type']
        ]
    );
    
    // Log the change
    $db->execute(
        "INSERT INTO character_changes 
         (character_id, user_id, change_type, field_name, new_value, change_reason)
         VALUES (?, ?, 'spell', 'spellbook', ?, 'Added spell to spellbook')",
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
            'spell_type' => $spell['spell_type']
        ]
    ], "Spell '{$spell['spell_name']}' added to spellbook");
    
} catch (Exception $e) {
    error_log("Add spell to spellbook error: " . $e->getMessage());
    error_log("Add spell to spellbook error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to add spell to spellbook', 500);
}
?>

