<?php
/**
 * BECMI D&D Character Manager - Update Character HP Endpoint
 * 
 * Dedicated endpoint for HP updates (damage, healing, death, resurrection).
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
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $rawInput = file_get_contents('php://input');
    error_log("HP UPDATE - Raw input: " . $rawInput);
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("HP UPDATE - JSON decode error: " . json_last_error_msg());
        Security::sendErrorResponse('Invalid JSON input', 400);
    }
    
    // Validate character_id
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID is required']);
    }
    
    // Get HP change parameters
    $hpChange = isset($input['hp_change']) ? (int) $input['hp_change'] : null;
    $newHp = isset($input['new_hp']) ? (int) $input['new_hp'] : null;
    $reason = isset($input['reason']) ? Security::sanitizeInput($input['reason']) : 'HP updated';
    
    // Must provide either hp_change OR new_hp
    if ($hpChange === null && $newHp === null) {
        Security::sendValidationErrorResponse([
            'hp_change' => 'Either hp_change (±value) or new_hp (absolute value) is required'
        ]);
    }
    
    error_log("HP UPDATE - Character ID: $characterId, HP Change: $hpChange, New HP: $newHp, Reason: $reason");
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get existing character
    $character = $db->selectOne(
        "SELECT character_id, user_id, session_id, character_name, current_hp, max_hp FROM characters WHERE character_id = ? AND is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Verify user owns this character OR is the DM
    $hasAccess = false;
    
    if ($character['user_id'] == $userId) {
        $hasAccess = true;
    }
    
    // Check if user is DM of the session
    if (!$hasAccess) {
        $session = $db->selectOne(
            "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
            [$character['session_id']]
        );
        
        if ($session && $session['dm_user_id'] == $userId) {
            $hasAccess = true;
        }
    }
    
    if (!$hasAccess) {
        Security::sendErrorResponse('Access denied', 403);
    }
    
    // Calculate new HP value
    $oldHp = (int) $character['current_hp'];
    $maxHp = (int) $character['max_hp'];
    
    if ($newHp !== null) {
        // Absolute value provided
        $calculatedNewHp = $newHp;
    } else {
        // Relative change provided
        $calculatedNewHp = $oldHp + $hpChange;
    }
    
    // Clamp HP between 0 and max_hp (allow negative for death tracking)
    if ($calculatedNewHp < -10) {
        $calculatedNewHp = -10; // Dead is dead (BECMI death at -10)
    }
    if ($calculatedNewHp > $maxHp) {
        $calculatedNewHp = $maxHp;
    }
    
    error_log("HP UPDATE - Old HP: $oldHp / $maxHp, New HP: $calculatedNewHp / $maxHp");
    
    // Check for special conditions
    $isDead = $calculatedNewHp <= 0;
    $wasHealed = $calculatedNewHp > $oldHp;
    $wasDamaged = $calculatedNewHp < $oldHp;
    
    // Determine change type
    $changeType = 'hp_change';
    if ($isDead && $oldHp > 0) {
        $changeType = 'hp_change'; // Character died
        $reason = $reason . ' (character died)';
    } elseif ($oldHp <= 0 && $calculatedNewHp > 0) {
        $changeType = 'hp_change'; // Character resurrected/stabilized
        $reason = $reason . ' (character stabilized/healed)';
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Update HP
        $db->execute(
            "UPDATE characters SET current_hp = ?, updated_at = NOW() WHERE character_id = ?",
            [$calculatedNewHp, $characterId]
        );
        
        // Log HP change
        $db->insert(
            "INSERT INTO character_changes (character_id, user_id, change_type, field_name, old_value, new_value, change_reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $characterId,
                $userId,
                $changeType,
                'current_hp',
                $oldHp,
                $calculatedNewHp,
                $reason
            ]
        );
        
        // Commit transaction
        $db->commit();
        
        error_log("HP UPDATE - Success! HP changed from $oldHp to $calculatedNewHp");
        
        // Log security event
        Security::logSecurityEvent('character_hp_updated', [
            'character_id' => $characterId,
            'character_name' => $character['character_name'],
            'old_hp' => $oldHp,
            'new_hp' => $calculatedNewHp,
            'change' => ($calculatedNewHp - $oldHp),
            'is_dead' => $isDead
        ]);
        
        // Broadcast real-time event if character is in a session
        if ($character['session_id']) {
            broadcastEvent($character['session_id'], 'hp_change', [
                'character_id' => $characterId,
                'character_name' => $character['character_name'],
                'old_hp' => $oldHp,
                'new_hp' => $calculatedNewHp,
                'max_hp' => $maxHp,
                'hp_change' => ($calculatedNewHp - $oldHp),
                'is_dead' => $isDead
            ], $userId);
        }
        
        // Return success response
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'old_hp' => $oldHp,
            'new_hp' => $calculatedNewHp,
            'max_hp' => $maxHp,
            'hp_change' => ($calculatedNewHp - $oldHp),
            'is_dead' => $isDead,
            'hp_percentage' => round(($calculatedNewHp / $maxHp) * 100, 1)
        ], $isDead ? 'Character is dead' : 'HP updated successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("=== HP UPDATE ERROR ===");
    error_log("Error message: " . $e->getMessage());
    error_log("Error code: " . $e->getCode());
    error_log("Error file: " . $e->getFile() . " (line " . $e->getLine() . ")");
    error_log("Stack trace: " . $e->getTraceAsString());
    error_log("=== END ERROR ===");
    
    Security::sendErrorResponse('Failed to update HP: ' . $e->getMessage(), 500);
}
?>

