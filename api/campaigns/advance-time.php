<?php
/**
 * BECMI D&D Character Manager - Advance Campaign Game Time Endpoint
 * 
 * Allows DM to advance game time by rounds, turns, or days.
 * Automatically processes time-based effects when time advances.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `campaign_id` (int, required) - Campaign ID
 * - `session_id` (int, optional) - Session ID (for logging)
 * - `advancement_type` (string, required) - 'round', 'turn', or 'day'
 * - `custom_seconds` (int, optional) - Custom seconds to advance (if advancement_type is 'custom')
 * - `notes` (string, optional) - Notes about the time advancement
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Time advanced successfully",
 *   "data": {
 *     "campaign_id": int,
 *     "time_advanced_seconds": int,
 *     "previous_game_time_seconds": int,
 *     "new_game_time_seconds": int,
 *     "effects_processed": int,
 *     "effects_expired": array,
 *     "current_game_datetime": string
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Campaign DM: Can advance time
 * - Others: 403 Forbidden
 * 
 * @package api/campaigns
 * @api POST /api/campaigns/advance-time.php
 * @since 1.0.0
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
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $campaignId = isset($input['campaign_id']) ? (int) $input['campaign_id'] : 0;
    $sessionId = isset($input['session_id']) ? (int) ($input['session_id'] ?? 0) : null;
    $advancementType = $input['advancement_type'] ?? '';
    
    if ($campaignId <= 0) {
        Security::sendValidationErrorResponse(['campaign_id' => 'Valid campaign ID is required']);
    }
    
    if (!in_array($advancementType, ['round', 'turn', 'day', 'custom'])) {
        Security::sendValidationErrorResponse(['advancement_type' => 'Invalid advancement type. Must be: round, turn, day, or custom']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get campaign and verify permissions
    $campaign = $db->selectOne(
        "SELECT campaign_id, campaign_name, dm_user_id, 
                campaign_start_datetime, game_time_seconds
         FROM campaigns
         WHERE campaign_id = ?",
        [$campaignId]
    );
    
    if (!$campaign) {
        Security::sendErrorResponse('Campaign not found', 404);
    }
    
    // Check permissions: only DM can advance time
    if ($campaign['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to advance time in this campaign', 403);
    }
    
    // Calculate seconds to advance
    $secondsToAdvance = 0;
    switch ($advancementType) {
        case 'round':
            $secondsToAdvance = 10; // 10 seconds per round
            break;
        case 'turn':
            $secondsToAdvance = 600; // 10 minutes = 600 seconds per turn
            break;
        case 'day':
            $secondsToAdvance = 86400; // 1 day = 86400 seconds
            break;
        case 'custom':
            $secondsToAdvance = isset($input['custom_seconds']) ? (int) $input['custom_seconds'] : 0;
            if ($secondsToAdvance <= 0) {
                Security::sendValidationErrorResponse(['custom_seconds' => 'Custom seconds must be greater than 0']);
            }
            break;
    }
    
    $previousSeconds = (int) ($campaign['game_time_seconds'] ?? 0);
    $newSeconds = $previousSeconds + $secondsToAdvance;
    
    // Update campaign game time
    $db->update(
        "UPDATE campaigns 
         SET game_time_seconds = ? 
         WHERE campaign_id = ?",
        [$newSeconds, $campaignId]
    );
    
    // Log time advancement
    $db->insert(
        "INSERT INTO time_advancement_log 
         (campaign_id, session_id, advanced_by_user_id, time_advanced_seconds, 
          previous_game_time_seconds, new_game_time_seconds, advancement_type, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            $campaignId,
            $sessionId,
            $userId,
            $secondsToAdvance,
            $previousSeconds,
            $newSeconds,
            $advancementType,
            $input['notes'] ?? null
        ]
    );
    
    // Process time-based effects
    $effectsProcessed = processTimeBasedEffects($db, $campaignId, $previousSeconds, $newSeconds);
    
    // Calculate current game world datetime
    $currentGameDatetime = null;
    if ($campaign['campaign_start_datetime']) {
        $startDate = new DateTime($campaign['campaign_start_datetime']);
        $currentGameDatetime = clone $startDate;
        $currentGameDatetime->modify('+' . $newSeconds . ' seconds');
    }
    
    // Get session_id from campaign if not provided
    if (!$sessionId) {
        $session = $db->selectOne(
            "SELECT session_id FROM game_sessions WHERE campaign_id = ? LIMIT 1",
            [$campaignId]
        );
        if ($session) {
            $sessionId = (int) $session['session_id'];
        }
    }
    
    // Broadcast game_time_advanced event to all players
    if ($sessionId) {
        try {
            require_once '../../app/services/event-broadcaster.php';
            $broadcaster = new EventBroadcaster();
            $broadcaster->broadcastEvent(
                $sessionId,
                'game_time_advanced',
                [
                    'campaign_id' => $campaignId,
                    'session_id' => $sessionId,
                    'time_advanced_seconds' => $secondsToAdvance,
                    'previous_game_time_seconds' => $previousSeconds,
                    'new_game_time_seconds' => $newSeconds,
                    'current_game_datetime' => $currentGameDatetime ? $currentGameDatetime->format('Y-m-d H:i:s') : null,
                    'effects_expired' => $effectsProcessed['expired']
                ],
                $userId
            );
        } catch (Exception $broadcastError) {
            error_log('Failed to broadcast game_time_advanced event: ' . $broadcastError->getMessage());
            // Don't fail the request if broadcasting fails
        }
    }
    
    Security::logSecurityEvent('campaign_time_advanced', [
        'campaign_id' => $campaignId,
        'user_id' => $userId,
        'time_advanced_seconds' => $secondsToAdvance,
        'advancement_type' => $advancementType
    ]);
    
    Security::sendSuccessResponse([
        'campaign_id' => $campaignId,
        'time_advanced_seconds' => $secondsToAdvance,
        'previous_game_time_seconds' => $previousSeconds,
        'new_game_time_seconds' => $newSeconds,
        'effects_processed' => $effectsProcessed['total'],
        'effects_expired' => $effectsProcessed['expired'],
        'current_game_datetime' => $currentGameDatetime ? $currentGameDatetime->format('Y-m-d H:i:s') : null
    ], 'Time advanced successfully');
    
} catch (Exception $e) {
    error_log('Campaign time advancement error: ' . $e->getMessage());
    error_log('Campaign time advancement trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while advancing time', 500);
}

/**
 * Process time-based effects when time advances
 * 
 * @param Database $db - Database connection
 * @param int $campaignId - Campaign ID
 * @param int $previousSeconds - Previous game time seconds
 * @param int $newSeconds - New game time seconds
 * @return array - Processing results
 */
function processTimeBasedEffects($db, $campaignId, $previousSeconds, $newSeconds) {
    $expired = [];
    $updated = 0;
    
    // Get all active effects for this campaign
    $effects = $db->select(
        "SELECT effect_id, character_id, effect_type, effect_name, 
                duration_seconds, remaining_seconds, expires_at_game_time_seconds,
                effect_data
         FROM time_based_effects
         WHERE campaign_id = ? AND is_active = TRUE
         ORDER BY expires_at_game_time_seconds ASC",
        [$campaignId]
    );
    
    foreach ($effects as $effect) {
        $expiresAt = (int) $effect['expires_at_game_time_seconds'];
        
        // Check if effect has expired
        if ($newSeconds >= $expiresAt) {
            // Effect has expired
            $db->update(
                "UPDATE time_based_effects 
                 SET is_active = FALSE, remaining_seconds = 0
                 WHERE effect_id = ?",
                [$effect['effect_id']]
            );
            
            $expired[] = [
                'effect_id' => (int) $effect['effect_id'],
                'character_id' => (int) $effect['character_id'],
                'effect_type' => $effect['effect_type'],
                'effect_name' => $effect['effect_name']
            ];
            $updated++;
        } else {
            // Update remaining seconds
            $newRemaining = $expiresAt - $newSeconds;
            $db->update(
                "UPDATE time_based_effects 
                 SET remaining_seconds = ?
                 WHERE effect_id = ?",
                [$newRemaining, $effect['effect_id']]
            );
            $updated++;
        }
    }
    
    return [
        'total' => $updated,
        'expired' => $expired
    ];
}
?>
