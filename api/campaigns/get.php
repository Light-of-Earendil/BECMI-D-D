<?php
/**
 * BECMI D&D Character Manager - Get Campaign Endpoint
 * 
 * Returns detailed information about a specific campaign, including sessions.
 * Verifies user has access (DM) before returning data.
 * 
 * **Request:** GET
 * 
 * **Query Parameters:**
 * - `campaign_id` (int, required) - Campaign ID to retrieve
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "campaign": {
 *       "campaign_id": int,
 *       "campaign_name": string,
 *       "campaign_description": string,
 *       "dm_user_id": int,
 *       "dm_username": string,
 *       "created_at": string,
 *       "updated_at": string
 *     },
 *     "sessions": [
 *       {
 *         "session_id": int,
 *         "session_title": string,
 *         "session_datetime": string,
 *         "status": string
 *       },
 *       ...
 *     ],
 *     "session_count": int
 *   }
 * }
 * ```
 * 
 * **Access Control:**
 * - Campaign DM: Full access
 * - Others: 403 Forbidden
 * 
 * @package api/campaigns
 * @api GET /api/campaigns/get.php?campaign_id={campaignId}
 * @since 1.0.0
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get query parameters
    $campaignId = isset($_GET['campaign_id']) ? (int) $_GET['campaign_id'] : 0;
    
    if ($campaignId <= 0) {
        Security::sendValidationErrorResponse(['campaign_id' => 'Valid campaign ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get campaign and verify access
    // Try to include new game time columns, but handle gracefully if they don't exist yet
    try {
        $campaign = $db->selectOne(
            "SELECT c.campaign_id, c.campaign_name, c.campaign_description, 
                    c.campaign_start_datetime, c.game_time_seconds,
                    c.dm_user_id, c.created_at, c.updated_at,
                    u.username as dm_username
             FROM campaigns c
             LEFT JOIN users u ON c.dm_user_id = u.user_id
             WHERE c.campaign_id = ?",
            [$campaignId]
        );
    } catch (Exception $e) {
        // If new columns don't exist yet, try old format
        if (strpos($e->getMessage(), 'campaign_start_datetime') !== false || 
            strpos($e->getMessage(), 'game_time_seconds') !== false || 
            strpos($e->getMessage(), 'Unknown column') !== false) {
            try {
                $campaign = $db->selectOne(
                    "SELECT c.campaign_id, c.campaign_name, c.campaign_description, 
                            c.game_time, c.dm_user_id, c.created_at, c.updated_at,
                            u.username as dm_username
                     FROM campaigns c
                     LEFT JOIN users u ON c.dm_user_id = u.user_id
                     WHERE c.campaign_id = ?",
                    [$campaignId]
                );
                $campaign['campaign_start_datetime'] = null;
                $campaign['game_time_seconds'] = 0;
            } catch (Exception $e2) {
                // If game_time also doesn't exist
                if (strpos($e2->getMessage(), 'game_time') !== false || strpos($e2->getMessage(), 'Unknown column') !== false) {
                    $campaign = $db->selectOne(
                        "SELECT c.campaign_id, c.campaign_name, c.campaign_description, 
                                c.dm_user_id, c.created_at, c.updated_at,
                                u.username as dm_username
                         FROM campaigns c
                         LEFT JOIN users u ON c.dm_user_id = u.user_id
                         WHERE c.campaign_id = ?",
                        [$campaignId]
                    );
                    $campaign['campaign_start_datetime'] = null;
                    $campaign['game_time_seconds'] = 0;
                    $campaign['game_time'] = null;
                } else {
                    throw $e2;
                }
            }
        } else {
            throw $e;
        }
    }
    
    if (!$campaign) {
        Security::sendErrorResponse('Campaign not found', 404);
    }
    
    // Check access permissions - only DM can access
    if ($campaign['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have access to this campaign', 403);
    }
    
    // Calculate current game world datetime
    $currentGameDatetime = null;
    if (isset($campaign['campaign_start_datetime']) && $campaign['campaign_start_datetime'] && 
        isset($campaign['game_time_seconds'])) {
        $startDate = new DateTime($campaign['campaign_start_datetime']);
        $currentGameDatetime = clone $startDate;
        $currentGameDatetime->modify('+' . (int) $campaign['game_time_seconds'] . ' seconds');
    }
    
    // Format campaign data
    $campaignData = [
        'campaign_id' => (int) $campaign['campaign_id'],
        'campaign_name' => $campaign['campaign_name'],
        'campaign_description' => $campaign['campaign_description'],
        'campaign_start_datetime' => isset($campaign['campaign_start_datetime']) && $campaign['campaign_start_datetime'] ? $campaign['campaign_start_datetime'] : null,
        'game_time_seconds' => isset($campaign['game_time_seconds']) ? (int) $campaign['game_time_seconds'] : 0,
        'current_game_datetime' => $currentGameDatetime ? $currentGameDatetime->format('Y-m-d H:i:s') : null,
        'dm_user_id' => (int) $campaign['dm_user_id'],
        'dm_username' => $campaign['dm_username'],
        'created_at' => $campaign['created_at'],
        'updated_at' => $campaign['updated_at']
    ];
    
    // Get sessions for this campaign
    $sessions = $db->select(
        "SELECT session_id, session_title, session_datetime, status
         FROM game_sessions
         WHERE campaign_id = ?
         ORDER BY session_datetime ASC",
        [$campaignId]
    );
    
    $formattedSessions = array_map(function($session) {
        return [
            'session_id' => (int) $session['session_id'],
            'session_title' => $session['session_title'],
            'session_datetime' => $session['session_datetime'],
            'status' => $session['status']
        ];
    }, $sessions);
    
    Security::sendSuccessResponse([
        'campaign' => $campaignData,
        'sessions' => $formattedSessions,
        'session_count' => count($formattedSessions)
    ]);
    
} catch (Exception $e) {
    error_log('Get campaign error: ' . $e->getMessage());
    error_log('Get campaign trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving the campaign', 500);
}
?>
