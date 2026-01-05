<?php
/**
 * BECMI D&D Character Manager - Get Campaign Game Time Endpoint
 * 
 * Returns current game time for a campaign.
 * Accessible by players in sessions linked to the campaign.
 * 
 * **Request:** GET
 * 
 * **Query Parameters:**
 * - `campaign_id` (int, required) - Campaign ID
 * - `session_id` (int, optional) - Session ID (for access verification)
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "campaign_id": int,
 *     "game_time_seconds": int,
 *     "campaign_start_datetime": string,
 *     "current_game_datetime": string,
 *     "time_elapsed_formatted": string
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Campaign DM: Full access
 * - Session Players: Can view if session is linked to campaign
 * - Others: 403 Forbidden
 * 
 * @package api/campaigns
 * @api GET /api/campaigns/get-game-time.php
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    Security::requireAuth();
    
    $campaignId = isset($_GET['campaign_id']) ? (int) $_GET['campaign_id'] : 0;
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : 0;
    
    if ($campaignId <= 0) {
        Security::sendValidationErrorResponse(['campaign_id' => 'Valid campaign ID is required']);
    }
    
    $userId = Security::getCurrentUserId();
    $db = getDB();
    
    // Get campaign
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
    
    // Check permissions: DM or player in linked session
    $isDM = $campaign['dm_user_id'] == $userId;
    $hasAccess = $isDM;
    
    if (!$hasAccess && $sessionId > 0) {
        // Check if user is a player in this session and session is linked to campaign
        $sessionPlayer = $db->selectOne(
            "SELECT sp.user_id, sp.status, gs.campaign_id
             FROM session_players sp
             JOIN game_sessions gs ON sp.session_id = gs.session_id
             WHERE sp.session_id = ? AND sp.user_id = ? 
             AND sp.status IN ('accepted', 'invited')
             AND gs.campaign_id = ?",
            [$sessionId, $userId, $campaignId]
        );
        $hasAccess = $sessionPlayer !== null;
    }
    
    if (!$hasAccess) {
        Security::sendErrorResponse('You do not have access to this campaign', 403);
    }
    
    // Calculate current game world datetime
    $currentGameDatetime = null;
    $gameTimeSeconds = (int) ($campaign['game_time_seconds'] ?? 0);
    
    if ($campaign['campaign_start_datetime']) {
        $startDate = new DateTime($campaign['campaign_start_datetime']);
        $currentGameDatetime = clone $startDate;
        $currentGameDatetime->modify('+' . $gameTimeSeconds . ' seconds');
    }
    
    // Format time elapsed
    $timeElapsedFormatted = formatGameTimeFromSeconds($gameTimeSeconds);
    
    Security::sendSuccessResponse([
        'campaign_id' => $campaignId,
        'game_time_seconds' => $gameTimeSeconds,
        'campaign_start_datetime' => $campaign['campaign_start_datetime'],
        'current_game_datetime' => $currentGameDatetime ? $currentGameDatetime->format('Y-m-d H:i:s') : null,
        'time_elapsed_formatted' => $timeElapsedFormatted
    ]);
    
} catch (Exception $e) {
    error_log('Get game time error: ' . $e->getMessage());
    Security::sendErrorResponse('An error occurred while fetching game time', 500);
}

/**
 * Format game time from seconds to human readable format
 * 
 * @param int $seconds - Total seconds
 * @return string - Formatted time (e.g., "2 days, 5 hours, 30 minutes, 15 seconds")
 */
function formatGameTimeFromSeconds($seconds) {
    if ($seconds < 60) {
        return "$seconds second" . ($seconds !== 1 ? 's' : '');
    }
    
    $days = floor($seconds / 86400);
    $hours = floor(($seconds % 86400) / 3600);
    $minutes = floor(($seconds % 3600) / 60);
    $secs = $seconds % 60;
    
    $parts = [];
    if ($days > 0) {
        $parts[] = "$days day" . ($days !== 1 ? 's' : '');
    }
    if ($hours > 0) {
        $parts[] = "$hours hour" . ($hours !== 1 ? 's' : '');
    }
    if ($minutes > 0) {
        $parts[] = "$minutes minute" . ($minutes !== 1 ? 's' : '');
    }
    if ($secs > 0 && $days === 0) {
        $parts[] = "$secs second" . ($secs !== 1 ? 's' : '');
    }
    
    if (empty($parts)) {
        return '0 seconds';
    }
    
    return implode(', ', $parts);
}
?>
