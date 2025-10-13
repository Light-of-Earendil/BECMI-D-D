<?php
/**
 * BECMI D&D Character Manager - Memorize Spells
 * 
 * Sets which spells a character has memorized for the day.
 * Validates against available spell slots based on character level.
 * 
 * @return JSON Success/error response
 */

// Disable error display to prevent HTML output
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/becmi-rules.php';

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
    if (!isset($data['character_id']) || !isset($data['spell_ids'])) {
        Security::sendErrorResponse('Missing required fields: character_id, spell_ids', 400);
    }
    
    $characterId = (int) $data['character_id'];
    $spellIds = $data['spell_ids']; // Array of spell IDs to memorize
    
    if (!is_array($spellIds)) {
        Security::sendErrorResponse('spell_ids must be an array', 400);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify character ownership
    $character = $db->selectOne(
        "SELECT c.user_id, c.class, c.level, c.intelligence, c.wisdom
         FROM characters c
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check permissions (only owner can memorize spells)
    if ($character['user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to modify this character', 403);
    }
    
    // Get spell slots available for this character
    $characterClass = $character['class'];
    $level = $character['level'];
    
    $availableSlots = BECMIRulesEngine::getSpellSlots($characterClass, $level);
    if (empty($availableSlots)) {
        Security::sendErrorResponse('This character class cannot memorize spells', 400);
    }
    
    // Get all spells being memorized
    if (count($spellIds) > 0) {
        $placeholders = implode(',', array_fill(0, count($spellIds), '?'));
        $params = array_merge([$characterId], $spellIds);
        
        $spells = $db->select(
            "SELECT spell_id, spell_level, spell_type
             FROM character_spells
             WHERE character_id = ? AND spell_id IN ($placeholders)",
            $params
        );
    } else {
        $spells = [];
    }
    
    // Count spells per level
    $memorizedByLevel = [];
    foreach ($spells as $spell) {
        $spellLevel = $spell['spell_level'];
        if (!isset($memorizedByLevel[$spellLevel])) {
            $memorizedByLevel[$spellLevel] = 0;
        }
        $memorizedByLevel[$spellLevel]++;
    }
    
    // Validate against available slots
    foreach ($memorizedByLevel as $spellLevel => $count) {
        $available = isset($availableSlots[$spellLevel]) ? $availableSlots[$spellLevel] : 0;
        if ($count > $available) {
            Security::sendErrorResponse("Cannot memorize $count level $spellLevel spells (only $available slots available)", 400);
        }
    }
    
    // Begin transaction
    $db->execute("START TRANSACTION");
    
    try {
        // First, unmemorize all spells
        $db->execute(
            "UPDATE character_spells
             SET is_memorized = FALSE
             WHERE character_id = ?",
            [$characterId]
        );
        
        // Then memorize selected spells
        if (count($spellIds) > 0) {
            $placeholders = implode(',', array_fill(0, count($spellIds), '?'));
            $params = array_merge([$characterId], $spellIds);
            
            $db->execute(
                "UPDATE character_spells
                 SET is_memorized = TRUE
                 WHERE character_id = ? AND spell_id IN ($placeholders)",
                $params
            );
        }
        
        // Log the change
        $db->execute(
            "INSERT INTO character_changes 
             (character_id, user_id, change_type, field_name, new_value, change_reason)
             VALUES (?, ?, 'spell', 'memorized_spells', ?, 'Prepared spells for the day')",
            [
                $characterId,
                $userId,
                json_encode($spellIds)
            ]
        );
        
        $db->execute("COMMIT");
        
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'memorized_count' => count($spellIds),
            'memorized_by_level' => $memorizedByLevel,
            'available_slots' => $availableSlots
        ], 'Spells memorized successfully');
        
    } catch (Exception $e) {
        $db->execute("ROLLBACK");
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Memorize spells error: " . $e->getMessage());
    error_log("Memorize spells error file: " . $e->getFile() . " line " . $e->getLine());
    error_log("Memorize spells error trace: " . $e->getTraceAsString());
    
    // Send detailed error in response (but not trace for security)
    Security::sendErrorResponse('Failed to memorize spells: ' . $e->getMessage(), 500);
}

?>

