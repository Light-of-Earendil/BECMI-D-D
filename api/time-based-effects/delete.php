<?php
/**
 * BECMI D&D Character Manager - Delete Time-Based Effect Endpoint
 * 
 * Deletes or deactivates a time-based effect
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `effect_id` (int, required) - Effect ID to delete
 * 
 * @package api/time-based-effects
 * @api POST /api/time-based-effects/delete.php
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    Security::requireAuth();
    
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    $input = Security::validateJSONInput();
    
    $effectId = isset($input['effect_id']) ? (int) $input['effect_id'] : 0;
    
    if ($effectId <= 0) {
        Security::sendValidationErrorResponse(['effect_id' => 'Valid effect ID is required']);
    }
    
    $userId = Security::getCurrentUserId();
    $db = getDB();
    
    // Get effect and verify access
    $effect = $db->selectOne(
        "SELECT tbe.effect_id, tbe.character_id, tbe.campaign_id, tbe.session_id,
                c.user_id as character_owner_id,
                gs.dm_user_id as session_dm_id,
                camp.dm_user_id as campaign_dm_id
         FROM time_based_effects tbe
         LEFT JOIN characters c ON tbe.character_id = c.character_id
         LEFT JOIN game_sessions gs ON tbe.session_id = gs.session_id
         LEFT JOIN campaigns camp ON tbe.campaign_id = camp.campaign_id
         WHERE tbe.effect_id = ?",
        [$effectId]
    );
    
    if (!$effect) {
        Security::sendErrorResponse('Effect not found', 404);
    }
    
    // Check permissions: character owner or DM
    $hasAccess = false;
    if ($effect['character_owner_id'] == $userId) {
        $hasAccess = true;
    } elseif ($effect['session_dm_id'] == $userId || $effect['campaign_dm_id'] == $userId) {
        $hasAccess = true;
    }
    
    if (!$hasAccess) {
        Security::sendErrorResponse('You do not have permission to delete this effect', 403);
    }
    
    // Deactivate effect (soft delete)
    $db->update(
        "UPDATE time_based_effects SET is_active = FALSE WHERE effect_id = ?",
        [$effectId]
    );
    
    Security::logSecurityEvent('time_based_effect_deleted', [
        'effect_id' => $effectId,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'effect_id' => $effectId
    ], 'Effect deactivated successfully');
    
} catch (Exception $e) {
    error_log('Delete time-based effect error: ' . $e->getMessage());
    Security::sendErrorResponse('An error occurred while deleting the effect', 500);
}
?>
