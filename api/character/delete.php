<?php
/**
 * BECMI D&D Character Manager - Character Delete Endpoint
 * 
 * Soft-deletes a character (sets is_active to 0) with audit logging.
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
    
    $input = Security::validateJSONInput();
    
    // Validate character_id
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get existing character
    $character = $db->selectOne(
        "SELECT character_id, user_id, session_id, character_name, class, level, is_active FROM characters WHERE character_id = ?",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check if character is already deleted
    if ($character['is_active'] == 0) {
        Security::sendErrorResponse('Character has already been deleted', 410);
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
        Security::sendErrorResponse('Access denied - you do not own this character', 403);
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Soft delete: Set is_active to 0
        $db->execute(
            "UPDATE characters SET is_active = 0, updated_at = NOW() WHERE character_id = ?",
            [$characterId]
        );
        
        // Log character deletion
        $db->insert(
            "INSERT INTO character_changes (character_id, user_id, change_type, field_name, old_value, new_value, change_reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $characterId,
                $userId,
                'other',
                'is_active',
                '1',
                '0',
                'Character deleted by ' . ($character['user_id'] == $userId ? 'owner' : 'DM')
            ]
        );
        
        // Commit transaction
        $db->commit();
        
        // Log security event
        Security::logSecurityEvent('character_deleted', [
            'character_id' => $characterId,
            'character_name' => $character['character_name'],
            'class' => $character['class'],
            'level' => $character['level'],
            'deleted_by' => $userId,
            'was_owner' => ($character['user_id'] == $userId)
        ]);
        
        // Return success response
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'character_name' => $character['character_name']
        ], 'Character deleted successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        Security::debugLog('Character delete transaction rolled back', [
            'character_id' => $characterId,
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
        throw $e;
    }
    
} catch (Exception $e) {
    Security::debugLog('Character delete error', [
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);

    Security::sendErrorResponse('Failed to delete character', 500);
}
?>

