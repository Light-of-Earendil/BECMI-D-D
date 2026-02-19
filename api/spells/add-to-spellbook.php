<?php
/**
 * BECMI D&D Character Manager - Add Spell To Spellbook
 * 
 * Adds a spell to a character's spellbook.
 * Validates that the character's class can learn the spell.
 * 
 * @return JSON Success/error response
 */

// Start output buffering immediately to catch any stray output
ob_start();

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (including the one we just started)
while (ob_get_level()) {
    ob_end_clean();
}

// Enable error logging but disable display
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Register error handler to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        // Clear any output
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // Send JSON error response
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Fatal PHP error: ' . $error['message'],
            'file' => $error['file'],
            'line' => $error['line'],
            'code' => 'FATAL_ERROR'
        ]);
        exit;
    }
});

// Start output buffering to prevent any output before JSON
if (!ob_get_level()) {
    ob_start();
}

try {
    require_once '../../app/core/database.php';
    require_once '../../app/core/security.php';
} catch (Exception $e) {
    while (ob_get_level()) {
        ob_end_clean();
    }
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to load required files: ' . $e->getMessage(),
        'code' => 'LOAD_ERROR'
    ]);
    exit;
}

// Initialize security
Security::init();

// Clear any output that might have been generated
if (ob_get_level()) {
    ob_clean();
}

// Set content type
header('Content-Type: application/json; charset=utf-8');

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
    $errors = [];
    
    if (!isset($data['character_id']) || !is_numeric($data['character_id'])) {
        $errors['character_id'] = 'Valid character ID is required';
    }
    
    if (!isset($data['spell_id']) || !is_numeric($data['spell_id'])) {
        $errors['spell_id'] = 'Valid spell ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
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
    // Check by spell_id first (most reliable)
    $existing = $db->selectOne(
        "SELECT character_id FROM character_spells
         WHERE character_id = ? AND spell_id = ?",
        [$characterId, $spellId]
    );
    
    if ($existing) {
        Security::sendErrorResponse('Spell already in spellbook', 400);
    }
    
    // Also check by spell_name and spell_level (in case spell_id is NULL or different)
    $existingByName = $db->selectOne(
        "SELECT character_id FROM character_spells
         WHERE character_id = ? AND spell_name = ? AND spell_level = ?",
        [$characterId, $spell['spell_name'], $spell['spell_level']]
    );
    
    if ($existingByName) {
        Security::sendErrorResponse('Spell already in spellbook', 400);
    }
    
    // Set learned_at_level if not provided
    if ($learnedAtLevel === null) {
        $learnedAtLevel = $character['level'];
    }
    
    // Add spell to character's spellbook
    try {
        $db->execute(
            "INSERT INTO character_spells 
             (character_id, spell_id, spell_name, spell_level, spell_type, 
              memorized_count, max_memorized, is_memorized, times_cast_today)
             VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0)",
            [
                $characterId,
                $spellId,
                $spell['spell_name'],
                $spell['spell_level'],
                $spell['spell_type']
            ]
        );
    } catch (Exception $e) {
        error_log("Failed to insert spell into character_spells: " . $e->getMessage());
        error_log("Character ID: {$characterId}, Spell ID: {$spellId}, Spell Name: {$spell['spell_name']}");
        
        // Check if it's a duplicate key error
        if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'PRIMARY') !== false) {
            Security::sendErrorResponse('Spell already in spellbook', 400);
        } else {
            Security::sendErrorResponse('Failed to add spell to spellbook: ' . $e->getMessage(), 500);
        }
    }
    
    // Log the change
    try {
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
    } catch (Exception $e) {
        // Log error but don't fail the request - spell was already added
        error_log("Failed to log character change: " . $e->getMessage());
    }
    
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
    // Clear any output before sending error
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    error_log("Add spell to spellbook error: " . $e->getMessage());
    error_log("Add spell to spellbook error trace: " . $e->getTraceAsString());
    error_log("Add spell to spellbook error file: " . $e->getFile());
    error_log("Add spell to spellbook error line: " . $e->getLine());
    
    // Provide more specific error message
    $errorMessage = 'Failed to add spell to spellbook';
    if (strpos($e->getMessage(), 'Database query failed') !== false) {
        $errorMessage = 'Database error: ' . $e->getMessage();
    } else {
        $errorMessage = $e->getMessage();
    }
    
    // Ensure we can send error response
    try {
        Security::sendErrorResponse($errorMessage, 500);
    } catch (Exception $sendError) {
        // If sending error response fails, send raw JSON
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $errorMessage,
            'code' => 'EXCEPTION',
            'details' => $e->getMessage()
        ]);
        exit;
    }
} catch (Throwable $e) {
    // Catch any other errors (including fatal errors)
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    error_log("Add spell to spellbook fatal error: " . $e->getMessage());
    error_log("Add spell to spellbook fatal error trace: " . $e->getTraceAsString());
    
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Fatal error: ' . $e->getMessage(),
        'code' => 'FATAL_ERROR'
    ]);
    exit;
}
?>

