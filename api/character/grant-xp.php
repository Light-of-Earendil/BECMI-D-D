<?php
/**
 * BECMI D&D Character Manager - Grant XP
 * 
 * Allows DM to award experience points to characters in their session.
 * Checks if characters qualify for level-up and sends notifications.
 * 
 * @return JSON Success/error response with level-up eligible characters
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/event-broadcaster.php';

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
    $required = ['session_id', 'character_ids', 'xp_amount'];
    $validation = Security::validateRequired($data, $required);
    if (!$validation['valid']) {
        Security::sendValidationErrorResponse($validation['errors']);
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
    
    // Begin transaction
    $db->execute("START TRANSACTION");
    
    try {
        $updatedCharacters = [];
        $charactersReadyToLevelUp = [];
        
        foreach ($characterIds as $characterId) {
            $characterId = (int) $characterId;
            
            // Verify character is in this session
            $character = $db->selectOne(
                "SELECT character_id, character_name, level, experience_points, class
                 FROM characters
                 WHERE character_id = ? AND session_id = ? AND is_active = 1",
                [$characterId, $sessionId]
            );
            
            if (!$character) {
                continue; // Skip invalid characters
            }
            
            $oldXp = $character['experience_points'];
            $newXp = $oldXp + $xpAmount;
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
            $db->execute(
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
            
            $characterData = [
                'character_id' => $characterId,
                'character_name' => $character['character_name'],
                'old_xp' => $oldXp,
                'new_xp' => $newXp,
                'xp_gained' => $xpAmount,
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
        
        // Broadcast real-time event
        $characterNames = array_map(function($c) { return $c['character_name']; }, $updatedCharacters);
        broadcastEvent($sessionId, 'xp_awarded', [
            'xp_amount' => $xpAmount,
            'reason' => $reason,
            'character_ids' => $characterIds,
            'character_names' => $characterNames,
            'ready_to_level_up' => array_map(function($c) { return $c['character_name']; }, $charactersReadyToLevelUp)
        ], $userId);
        
        Security::sendSuccessResponse([
            'session_id' => $sessionId,
            'xp_amount' => $xpAmount,
            'reason' => $reason,
            'characters_updated' => count($updatedCharacters),
            'characters' => $updatedCharacters,
            'ready_to_level_up' => $charactersReadyToLevelUp,
            'level_up_count' => count($charactersReadyToLevelUp)
        ], "Awarded $xpAmount XP to " . count($updatedCharacters) . " character(s)");
        
    } catch (Exception $e) {
        $db->execute("ROLLBACK");
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Grant XP error: " . $e->getMessage());
    error_log("Grant XP error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to grant XP', 500);
}
?>

