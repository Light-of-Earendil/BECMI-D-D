<?php
/**
 * BECMI D&D Character Manager - Get Character Spells
 * 
 * Returns all spells in a character's spellbook with memorization status.
 * 
 * @return JSON Array of character's spells
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get character ID from query parameters
    $characterId = isset($_GET['character_id']) ? (int)$_GET['character_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID required']);
    }
    
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
        Security::sendErrorResponse('You do not have permission to view this character\'s spells', 403);
    }
    
    // Get all spells in character's spellbook
    $spells = $db->select(
        "SELECT cs.spell_id, cs.spell_name, cs.spell_level, cs.spell_type,
                cs.is_memorized, cs.times_cast_today,
                s.range_text, s.duration_text,
                s.description, s.components, s.reversible, s.reverse_name, s.reverse_description
         FROM character_spells cs
         JOIN spells s ON cs.spell_id = s.spell_id
         WHERE cs.character_id = ?
         ORDER BY cs.spell_level, cs.spell_name",
        [$characterId]
    );
    
    // Format response
    $formattedSpells = array_map(function($spell) {
        return [
            'spell_id' => (int) $spell['spell_id'],
            'spell_name' => $spell['spell_name'],
            'spell_level' => (int) $spell['spell_level'],
            'spell_type' => $spell['spell_type'],
            'range' => $spell['range_text'],
            'duration' => $spell['duration_text'],
            'description' => $spell['description'],
            'components' => $spell['components'],
            'reversible' => (bool) $spell['reversible'],
            'reverse_name' => $spell['reverse_name'],
            'reverse_description' => $spell['reverse_description'],
            'is_memorized' => (bool) $spell['is_memorized'],
            'times_cast_today' => (int) $spell['times_cast_today']
        ];
    }, $spells);
    
    // Group spells by level for easier UI rendering
    $spellsByLevel = [];
    foreach ($formattedSpells as $spell) {
        $level = $spell['spell_level'];
        if (!isset($spellsByLevel[$level])) {
            $spellsByLevel[$level] = [];
        }
        $spellsByLevel[$level][] = $spell;
    }
    
    // Get memorized spells count by level
    $memorizedByLevel = [];
    foreach ($formattedSpells as $spell) {
        if ($spell['is_memorized']) {
            $level = $spell['spell_level'];
            if (!isset($memorizedByLevel[$level])) {
                $memorizedByLevel[$level] = 0;
            }
            $memorizedByLevel[$level]++;
        }
    }
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'spells' => $formattedSpells,
        'spells_by_level' => $spellsByLevel,
        'memorized_by_level' => $memorizedByLevel,
        'total_spells' => count($formattedSpells),
        'total_memorized' => array_sum($memorizedByLevel)
    ], 'Character spells retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get character spells error: " . $e->getMessage());
    error_log("Get character spells error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to retrieve character spells', 500);
}
?>

