<?php
/**
 * Lists campaign roster players for the current campaign DM.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/campaign-player-sync.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();

    $campaignId = isset($_GET['campaign_id']) ? (int) $_GET['campaign_id'] : 0;
    if ($campaignId <= 0) {
        Security::sendValidationErrorResponse(['campaign_id' => 'Valid campaign ID is required']);
    }

    $userId = Security::getCurrentUserId();
    $db = getDB();

    $campaign = $db->selectOne(
        "SELECT campaign_id, campaign_name, dm_user_id
         FROM campaigns
         WHERE campaign_id = ?",
        [$campaignId]
    );

    if (!$campaign) {
        Security::sendErrorResponse('Campaign not found', 404);
    }

    if ((int) $campaign['dm_user_id'] !== (int) $userId) {
        Security::sendErrorResponse('You do not have access to this campaign', 403);
    }

    if (!campaignPlayersFeatureReady($db)) {
        Security::sendSuccessResponse([
            'campaign_id' => (int) $campaign['campaign_id'],
            'campaign_name' => $campaign['campaign_name'],
            'players' => [],
            'player_count' => 0,
            'feature_ready' => false,
            'feature_message' => 'Run migration 037_campaign_players_and_session_map_library.sql to enable campaign auto-invites.'
        ]);
    }

    $players = $db->select(
        "SELECT cp.user_id, cp.added_at, u.username, u.email,
                COUNT(DISTINCT CASE WHEN gs.status IN ('scheduled', 'active') THEN gs.session_id END) AS auto_invite_session_count
         FROM campaign_players cp
         JOIN users u ON u.user_id = cp.user_id
         LEFT JOIN game_sessions gs ON gs.campaign_id = cp.campaign_id
         WHERE cp.campaign_id = ?
         GROUP BY cp.user_id, cp.added_at, u.username, u.email
         ORDER BY cp.added_at ASC, u.username ASC",
        [$campaignId]
    );

    $formattedPlayers = array_map(function ($player) {
        return [
            'user_id' => (int) $player['user_id'],
            'username' => $player['username'],
            'email' => $player['email'],
            'added_at' => $player['added_at'],
            'auto_invite_session_count' => (int) $player['auto_invite_session_count']
        ];
    }, $players);

    Security::sendSuccessResponse([
        'campaign_id' => (int) $campaign['campaign_id'],
        'campaign_name' => $campaign['campaign_name'],
        'players' => $formattedPlayers,
        'player_count' => count($formattedPlayers),
        'feature_ready' => true
    ]);
} catch (Exception $e) {
    error_log('Campaign players list error: ' . $e->getMessage());
    error_log('Campaign players list trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while loading campaign players', 500);
}
