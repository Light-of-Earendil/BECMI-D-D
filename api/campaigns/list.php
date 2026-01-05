<?php
/**
 * BECMI D&D Character Manager - List Campaigns Endpoint
 * 
 * Returns a list of campaigns accessible to the current user.
 * DMs see all campaigns they created.
 * 
 * **Request:** GET
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "campaigns": [
 *       {
 *         "campaign_id": int,
 *         "campaign_name": string,
 *         "campaign_description": string,
 *         "dm_user_id": int,
 *         "dm_username": string,
 *         "session_count": int,
 *         "created_at": string,
 *         "updated_at": string
 *       },
 *       ...
 *     ],
 *     "total_count": int
 *   }
 * }
 * ```
 * 
 * **Access Control:**
 * Users can see campaigns where they are the DM.
 * 
 * @package api/campaigns
 * @api GET /api/campaigns/list.php
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
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get campaigns where user is DM
    // Try to include new game time columns, but handle gracefully if they don't exist yet
    try {
        $campaigns = $db->select(
            "SELECT c.campaign_id, c.campaign_name, c.campaign_description, 
                    c.campaign_start_datetime, c.game_time_seconds,
                    c.dm_user_id, c.created_at, c.updated_at,
                    u.username as dm_username,
                    COUNT(gs.session_id) as session_count
             FROM campaigns c
             LEFT JOIN users u ON c.dm_user_id = u.user_id
             LEFT JOIN game_sessions gs ON c.campaign_id = gs.campaign_id
             WHERE c.dm_user_id = ?
             GROUP BY c.campaign_id, c.campaign_name, c.campaign_description, 
                      c.campaign_start_datetime, c.game_time_seconds,
                      c.dm_user_id, c.created_at, c.updated_at, u.username
             ORDER BY c.updated_at DESC",
            [$userId]
        );
    } catch (Exception $e) {
        // If new columns don't exist yet, try old format
        if (strpos($e->getMessage(), 'campaign_start_datetime') !== false || 
            strpos($e->getMessage(), 'game_time_seconds') !== false || 
            strpos($e->getMessage(), 'Unknown column') !== false) {
            try {
                $campaigns = $db->select(
                    "SELECT c.campaign_id, c.campaign_name, c.campaign_description, 
                            c.game_time, c.dm_user_id, c.created_at, c.updated_at,
                            u.username as dm_username,
                            COUNT(gs.session_id) as session_count
                     FROM campaigns c
                     LEFT JOIN users u ON c.dm_user_id = u.user_id
                     LEFT JOIN game_sessions gs ON c.campaign_id = gs.campaign_id
                     WHERE c.dm_user_id = ?
                     GROUP BY c.campaign_id, c.campaign_name, c.campaign_description, 
                              c.game_time, c.dm_user_id, c.created_at, c.updated_at, u.username
                     ORDER BY c.updated_at DESC",
                    [$userId]
                );
                // Convert old format to new format
                foreach ($campaigns as &$campaign) {
                    if ($campaign['game_time']) {
                        $campaign['campaign_start_datetime'] = $campaign['game_time'];
                        $campaign['game_time_seconds'] = 0;
                    } else {
                        $campaign['campaign_start_datetime'] = null;
                        $campaign['game_time_seconds'] = 0;
                    }
                }
            } catch (Exception $e2) {
                // If game_time also doesn't exist
                if (strpos($e2->getMessage(), 'game_time') !== false || strpos($e2->getMessage(), 'Unknown column') !== false) {
                    $campaigns = $db->select(
                        "SELECT c.campaign_id, c.campaign_name, c.campaign_description, 
                                c.dm_user_id, c.created_at, c.updated_at,
                                u.username as dm_username,
                                COUNT(gs.session_id) as session_count
                         FROM campaigns c
                         LEFT JOIN users u ON c.dm_user_id = u.user_id
                         LEFT JOIN game_sessions gs ON c.campaign_id = gs.campaign_id
                         WHERE c.dm_user_id = ?
                         GROUP BY c.campaign_id, c.campaign_name, c.campaign_description, 
                                  c.dm_user_id, c.created_at, c.updated_at, u.username
                         ORDER BY c.updated_at DESC",
                        [$userId]
                    );
                    foreach ($campaigns as &$campaign) {
                        $campaign['campaign_start_datetime'] = null;
                        $campaign['game_time_seconds'] = 0;
                    }
                } else {
                    throw $e2;
                }
            }
        } else {
            throw $e;
        }
    }
    
    // Format response
    $formattedCampaigns = array_map(function($campaign) {
        // Calculate current game world datetime
        $currentGameDatetime = null;
        if (isset($campaign['campaign_start_datetime']) && $campaign['campaign_start_datetime'] && 
            isset($campaign['game_time_seconds'])) {
            $startDate = new DateTime($campaign['campaign_start_datetime']);
            $currentGameDatetime = clone $startDate;
            $currentGameDatetime->modify('+' . (int) $campaign['game_time_seconds'] . ' seconds');
        }
        
        return [
            'campaign_id' => (int) $campaign['campaign_id'],
            'campaign_name' => $campaign['campaign_name'],
            'campaign_description' => $campaign['campaign_description'],
            'campaign_start_datetime' => isset($campaign['campaign_start_datetime']) && $campaign['campaign_start_datetime'] ? $campaign['campaign_start_datetime'] : null,
            'game_time_seconds' => isset($campaign['game_time_seconds']) ? (int) $campaign['game_time_seconds'] : 0,
            'current_game_datetime' => $currentGameDatetime ? $currentGameDatetime->format('Y-m-d H:i:s') : null,
            'dm_user_id' => (int) $campaign['dm_user_id'],
            'dm_username' => $campaign['dm_username'],
            'session_count' => (int) $campaign['session_count'],
            'created_at' => $campaign['created_at'],
            'updated_at' => $campaign['updated_at']
        ];
    }, $campaigns);
    
    Security::sendSuccessResponse([
        'campaigns' => $formattedCampaigns,
        'total_count' => count($formattedCampaigns)
    ]);
    
} catch (Exception $e) {
    error_log('List campaigns error: ' . $e->getMessage());
    error_log('List campaigns trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while listing campaigns', 500);
}
?>
