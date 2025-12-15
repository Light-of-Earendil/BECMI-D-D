<?php
/**
 * BECMI D&D Character Manager - Grant XP
 * 
 * Allows DM to award experience points to characters in their session.
 * Checks if characters qualify for level-up and sends notifications.
 * 
 * @return JSON Success/error response with level-up eligible characters
 */

// Enable error logging but disable display
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Register error handler to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== NULL && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        // Clear any output
        if (ob_get_level()) {
            ob_clean();
        }
        
        // Send JSON error response
        header('Content-Type: application/json');
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
require_once '../../app/services/becmi-rules.php';
require_once '../../app/services/event-broadcaster.php';
} catch (Exception $e) {
    if (ob_get_level()) {
        ob_clean();
    }
    header('Content-Type: application/json');
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
    $errors = [];
    if (!isset($data['session_id']) || empty($data['session_id'])) {
        $errors['session_id'] = 'Session ID is required';
    }
    if (!isset($data['character_ids']) || !is_array($data['character_ids']) || empty($data['character_ids'])) {
        $errors['character_ids'] = 'Character IDs array is required';
    }
    if (!isset($data['xp_amount']) || $data['xp_amount'] <= 0) {
        $errors['xp_amount'] = 'XP amount must be greater than 0';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $sessionId = (int) $data['session_id'];
    $characterIds = $data['character_ids']; // Array of character IDs
    $xpAmount = (int) $data['xp_amount'];
    $reason = isset($data['reason']) ? trim($data['reason']) : 'XP Award';
    
    if (!is_array($characterIds) || empty($characterIds)) {
        Security::sendErrorResponse('character_ids must be a non-empty array', 400);
    }
    
    if ($xpAmount <= 0) {
        Security::sendErrorResponse('xp_amount must be greater than 0', 400);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user is DM of this session
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can award XP', 403);
    }
    
    // XP thresholds for level-up (BECMI Rules Cyclopedia)
    $xpThresholds = [
        1 => 0,
        2 => 2000,
        3 => 4000,
        4 => 8000,
        5 => 16000,
        6 => 32000,
        7 => 64000,
        8 => 120000,
        9 => 240000,
        10 => 360000,
        11 => 480000,
        12 => 600000,
        13 => 720000,
        14 => 840000,
        15 => 960000,
        16 => 1080000,
        17 => 1200000,
        18 => 1320000,
        19 => 1440000,
        20 => 1560000,
        21 => 1680000,
        22 => 1800000,
        23 => 1920000,
        24 => 2040000,
        25 => 2160000,
        26 => 2280000,
        27 => 2400000,
        28 => 2520000,
        29 => 2640000,
        30 => 2760000,
        31 => 2880000,
        32 => 3000000,
        33 => 3120000,
        34 => 3240000,
        35 => 3360000,
        36 => 3480000
    ];
    
    // Initialize variables before transaction
    $validCharacterIds = [];
    $updatedCharacters = [];
    $charactersReadyToLevelUp = [];
    $xpPerCharacter = 0;
    
    // Begin transaction
    $db->execute("START TRANSACTION");
    
    try {
        // First, verify all characters and count valid ones
        foreach ($characterIds as $characterId) {
            $characterId = (int) $characterId;
            
            // Verify character is in this session
            $character = $db->selectOne(
                "SELECT character_id, character_name, level, experience_points, class
                 FROM characters
                 WHERE character_id = ? AND session_id = ? AND is_active = 1",
                [$characterId, $sessionId]
            );
            
            if ($character) {
                $validCharacterIds[] = $characterId;
            }
        }
        
        if (empty($validCharacterIds)) {
            $db->execute("ROLLBACK");
            Security::sendErrorResponse('No valid characters found to award XP to', 400);
        }
        
        // Divide XP among selected characters and round up
        $xpPerCharacter = (int) ceil($xpAmount / count($validCharacterIds));
        
        foreach ($validCharacterIds as $characterId) {
            // Get character data with abilities for XP bonus calculation
            $character = $db->selectOne(
                "SELECT character_id, character_name, level, experience_points, class,
                        strength, dexterity, constitution, intelligence, wisdom, charisma
                 FROM characters
                 WHERE character_id = ? AND session_id = ? AND is_active = 1",
                [$characterId, $sessionId]
            );
            
            if (!$character) {
                continue; // Skip invalid characters (shouldn't happen, but safety check)
            }
            
            // Calculate XP bonus/penalty based on prime requisite
            $abilities = [
                'strength' => (int) $character['strength'],
                'dexterity' => (int) $character['dexterity'],
                'constitution' => (int) $character['constitution'],
                'intelligence' => (int) $character['intelligence'],
                'wisdom' => (int) $character['wisdom'],
                'charisma' => (int) $character['charisma']
            ];
            
            $xpMultiplier = BECMIRulesEngine::getExperienceBonus($character['class'], $abilities);
            $baseXp = $xpPerCharacter;
            $adjustedXp = (int) round($baseXp * $xpMultiplier);
            $xpBonus = $adjustedXp - $baseXp;
            
            $oldXp = $character['experience_points'];
            $newXp = $oldXp + $adjustedXp; // Apply adjusted XP (with bonus/penalty)
            $currentLevel = $character['level'];
            
            // Update XP
            $db->execute(
                "UPDATE characters
                 SET experience_points = ?
                 WHERE character_id = ?",
                [$newXp, $characterId]
            );
            
            // Check if character qualifies for level-up
            $canLevelUp = false;
            $nextLevel = $currentLevel + 1;
            
            if (isset($xpThresholds[$nextLevel]) && $newXp >= $xpThresholds[$nextLevel]) {
                $canLevelUp = true;
            }
            
            // Log the XP award
            try {
                $db->insert(
                    "INSERT INTO character_changes 
                     (character_id, user_id, change_type, field_name, old_value, new_value, change_reason)
                     VALUES (?, ?, 'other', 'experience_points', ?, ?, ?)",
                    [
                        $characterId,
                        $userId,
                        (string) $oldXp,
                        (string) $newXp,
                        $reason
                    ]
                );
            } catch (Exception $logError) {
                // Log error but don't fail the XP award
                error_log("Failed to log XP award to character_changes: " . $logError->getMessage());
            }
            
            $characterData = [
                'character_id' => $characterId,
                'character_name' => $character['character_name'],
                'old_xp' => $oldXp,
                'new_xp' => $newXp,
                'xp_base' => $baseXp, // Base XP before bonus/penalty
                'xp_adjusted' => $adjustedXp, // XP after prime requisite bonus/penalty
                'xp_bonus' => $xpBonus, // Bonus/penalty amount (can be negative)
                'xp_multiplier' => $xpMultiplier, // Multiplier used (0.8, 0.9, 1.0, 1.05, or 1.10)
                'xp_gained' => $adjustedXp, // Individual XP amount actually awarded (with bonus/penalty)
                'current_level' => $currentLevel,
                'can_level_up' => $canLevelUp
            ];
            
            if ($canLevelUp) {
                $characterData['next_level'] = $nextLevel;
                $characterData['xp_for_next_level'] = $xpThresholds[$nextLevel];
                $charactersReadyToLevelUp[] = $characterData;
            }
            
            $updatedCharacters[] = $characterData;
        }
        
        $db->execute("COMMIT");
        
        // Broadcast real-time event (don't fail if this fails)
        try {
            $characterNames = array_map(function($c) { return $c['character_name']; }, $updatedCharacters);
            broadcastEvent($sessionId, 'xp_awarded', [
                'xp_amount' => $xpAmount,
                'reason' => $reason,
                'character_ids' => $characterIds,
                'character_names' => $characterNames,
                'ready_to_level_up' => array_map(function($c) { return $c['character_name']; }, $charactersReadyToLevelUp)
            ], $userId);
        } catch (Exception $broadcastError) {
            // Log error but don't fail the XP award
            error_log("Failed to broadcast XP award event: " . $broadcastError->getMessage());
        }
        
        // Clear any output before sending response
        if (ob_get_level()) {
            ob_clean();
        }
        
        Security::sendSuccessResponse([
            'session_id' => $sessionId,
            'xp_amount' => $xpAmount, // Total XP amount entered
            'xp_per_character' => $xpPerCharacter, // XP per character (divided and rounded up)
            'reason' => $reason,
            'characters_updated' => count($updatedCharacters),
            'characters' => $updatedCharacters,
            'ready_to_level_up' => $charactersReadyToLevelUp,
            'level_up_count' => count($charactersReadyToLevelUp)
        ], "Awarded " . $xpPerCharacter . " XP to each of " . count($updatedCharacters) . " character(s) (total: " . $xpAmount . " XP)");
        
    } catch (Exception $e) {
        // Rollback transaction on error
        try {
            $db->execute("ROLLBACK");
        } catch (Exception $rollbackError) {
            error_log("Rollback error: " . $rollbackError->getMessage());
        }
        throw $e;
    }
    
} catch (Exception $e) {
    // Clear any output before sending error
    if (ob_get_level()) {
        ob_clean();
    }
    
    // Log detailed error information
    $errorDetails = [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ];
    
    error_log("Grant XP error: " . json_encode($errorDetails));
    
    // Send user-friendly error message (don't expose internal details)
    $errorMessage = 'Failed to grant XP';
    if (strpos($e->getMessage(), 'SQLSTATE') !== false) {
        $errorMessage = 'Database error occurred while granting XP';
    } elseif (strpos($e->getMessage(), 'Undefined') !== false) {
        $errorMessage = 'Internal error: Missing required data';
    }
    
    Security::sendErrorResponse($errorMessage, 500);
}

