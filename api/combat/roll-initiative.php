<?php
/**
 * BECMI D&D Character Manager - Roll Initiative
 * 
 * Rolls 1d6 initiative for all characters in the session.
 * BECMI rules: Each side rolls 1d6, highest goes first.
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
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    
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
        Security::sendErrorResponse('Only the DM can roll initiative', 403);
    }
    
    // Get all characters in this session
    $characters = $db->select(
        "SELECT character_id, character_name, dexterity
         FROM characters
         WHERE session_id = ? AND is_active = 1
         ORDER BY character_name",
        [$sessionId]
    );
    
    if (count($characters) === 0) {
        Security::sendErrorResponse('No characters in this session', 400);
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Clear existing initiatives for this session
        $db->execute(
            "DELETE FROM combat_initiatives WHERE session_id = ?",
            [$sessionId]
        );
        
        // Clear current turn
        $db->execute(
            "DELETE FROM combat_current_turn WHERE session_id = ?",
            [$sessionId]
        );
        
        // Roll initiative for each character (1d6)
        $initiatives = [];
        foreach ($characters as $character) {
            $roll = rand(1, 6); // 1d6
            
            $initiativeId = $db->insert(
                "INSERT INTO combat_initiatives 
                 (session_id, character_id, entity_name, entity_type, initiative_roll, dexterity)
                 VALUES (?, ?, ?, 'character', ?, ?)",
                [
                    $sessionId,
                    $character['character_id'],
                    $character['character_name'],
                    $roll,
                    $character['dexterity']
                ]
            );
            
            $initiatives[] = [
                'initiative_id' => $initiativeId,
                'entity_name' => $character['character_name'],
                'roll' => $roll,
                'dexterity' => (int) $character['dexterity']
            ];
        }
        
        // Set first turn (highest initiative)
        $firstInitiative = $db->selectOne(
            "SELECT initiative_id FROM combat_initiatives 
             WHERE session_id = ? AND is_active = 1
             ORDER BY initiative_roll DESC, dexterity DESC
             LIMIT 1",
            [$sessionId]
        );
        
        if ($firstInitiative) {
            $db->insert(
                "INSERT INTO combat_current_turn (session_id, current_initiative_id, round_number)
                 VALUES (?, ?, 1)",
                [$sessionId, $firstInitiative['initiative_id']]
            );
        }
        
        $db->commit();
        
        // Log security event
        Security::logSecurityEvent('initiative_rolled', [
            'session_id' => $sessionId,
            'character_count' => count($characters)
        ]);
        
        Security::sendSuccessResponse([
            'initiatives' => $initiatives,
            'message' => 'Initiative rolled for ' . count($characters) . ' character(s)'
        ], 'Initiative rolled successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Roll initiative error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to roll initiative', 500);
}
?>

