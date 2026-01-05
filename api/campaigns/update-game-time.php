<?php
/**
 * BECMI D&D Character Manager - Update Campaign Game Time Endpoint
 * 
 * Allows the campaign DM to update the campaign's in-game time.
 * Game time is tracked as seconds since campaign start.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `campaign_id` (int, required) - Campaign ID
 * - `campaign_start_datetime` (string, optional) - Start date/time in game world (Y-m-d H:i:s format)
 * - `game_time_seconds` (int, optional) - Total seconds since campaign start
 * - `add_seconds` (int, optional) - Add seconds to current game_time_seconds
 * - `add_minutes` (int, optional) - Add minutes to current game_time_seconds
 * - `add_hours` (int, optional) - Add hours to current game_time_seconds
 * - `add_days` (int, optional) - Add days to current game_time_seconds
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Game time updated successfully",
 *   "data": {
 *     "campaign_id": int,
 *     "campaign_start_datetime": string,
 *     "game_time_seconds": int,
 *     "current_game_datetime": string
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Campaign DM: Can update game time
 * - Others: 403 Forbidden
 * 
 * @package api/campaigns
 * @api POST /api/campaigns/update-game-time.php
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
    
    if ($campaignId <= 0) {
        Security::sendValidationErrorResponse(['campaign_id' => 'Valid campaign ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get campaign and verify permissions
    try {
        $campaign = $db->selectOne(
            "SELECT campaign_id, campaign_name, dm_user_id, 
                    campaign_start_datetime, game_time_seconds
             FROM campaigns
             WHERE campaign_id = ?",
            [$campaignId]
        );
    } catch (Exception $e) {
        // If new columns don't exist yet, try old format
        if (strpos($e->getMessage(), 'campaign_start_datetime') !== false || 
            strpos($e->getMessage(), 'game_time_seconds') !== false || 
            strpos($e->getMessage(), 'Unknown column') !== false) {
            $campaign = $db->selectOne(
                "SELECT campaign_id, campaign_name, dm_user_id
                 FROM campaigns
                 WHERE campaign_id = ?",
                [$campaignId]
            );
            $campaign['campaign_start_datetime'] = null;
            $campaign['game_time_seconds'] = 0;
        } else {
            throw $e;
        }
    }
    
    if (!$campaign) {
        Security::sendErrorResponse('Campaign not found', 404);
    }
    
    // Check permissions: only DM can update
    if ($campaign['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to update this campaign', 403);
    }
    
    // Get current values
    $startDatetime = $campaign['campaign_start_datetime'];
    $currentSeconds = (int) ($campaign['game_time_seconds'] ?? 0);
    
    // Update start datetime if provided
    if (isset($input['campaign_start_datetime']) && $input['campaign_start_datetime']) {
        $startDatetimeObj = DateTime::createFromFormat('Y-m-d H:i:s', $input['campaign_start_datetime']);
        if (!$startDatetimeObj) {
            Security::sendValidationErrorResponse(['campaign_start_datetime' => 'Invalid format. Use Y-m-d H:i:s']);
        }
        $startDatetime = $startDatetimeObj->format('Y-m-d H:i:s');
    } elseif (!$startDatetime) {
        // Initialize start datetime if not set
        $startDatetime = date('Y-m-d H:i:s');
    }
    
    // Calculate new seconds
    $newSeconds = $currentSeconds;
    
    if (isset($input['game_time_seconds'])) {
        // Direct seconds setting
        $newSeconds = (int) $input['game_time_seconds'];
        if ($newSeconds < 0) {
            Security::sendValidationErrorResponse(['game_time_seconds' => 'Seconds cannot be negative']);
        }
    } else {
        // Add time to current seconds
        if (isset($input['add_seconds'])) {
            $newSeconds += (int) $input['add_seconds'];
        }
        if (isset($input['add_minutes'])) {
            $newSeconds += (int) $input['add_minutes'] * 60;
        }
        if (isset($input['add_hours'])) {
            $newSeconds += (int) $input['add_hours'] * 3600;
        }
        if (isset($input['add_days'])) {
            $newSeconds += (int) $input['add_days'] * 86400;
        }
    }
    
    // Calculate current game world datetime
    $startDate = new DateTime($startDatetime);
    $currentGameDatetime = clone $startDate;
    $currentGameDatetime->modify('+' . $newSeconds . ' seconds');
    
    // Update in database
    try {
        $db->update(
            "UPDATE campaigns 
             SET campaign_start_datetime = ?, 
                 game_time_seconds = ? 
             WHERE campaign_id = ?",
            [$startDatetime, $newSeconds, $campaignId]
        );
    } catch (Exception $e) {
        // If columns don't exist yet, log warning
        if (strpos($e->getMessage(), 'campaign_start_datetime') !== false || 
            strpos($e->getMessage(), 'game_time_seconds') !== false || 
            strpos($e->getMessage(), 'Unknown column') !== false) {
            error_log('Warning: New game time columns do not exist. Please run migration 026_campaign_game_time_redesign.sql');
            Security::sendErrorResponse('Game time tracking is not available. Please run migration 026_campaign_game_time_redesign.sql', 500);
        } else {
            throw $e;
        }
    }
    
    Security::logSecurityEvent('campaign_game_time_updated', [
        'campaign_id' => $campaignId,
        'user_id' => $userId,
        'game_time_seconds' => $newSeconds,
        'start_datetime' => $startDatetime
    ]);
    
    Security::sendSuccessResponse([
        'campaign_id' => $campaignId,
        'campaign_start_datetime' => $startDatetime,
        'game_time_seconds' => $newSeconds,
        'current_game_datetime' => $currentGameDatetime->format('Y-m-d H:i:s')
    ], 'Game time updated successfully');
    
} catch (Exception $e) {
    error_log('Campaign game time update error: ' . $e->getMessage());
    error_log('Campaign game time update trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while updating game time', 500);
}
?>
