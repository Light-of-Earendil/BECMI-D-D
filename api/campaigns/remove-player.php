<?php
/**
 * Removes a player from the campaign roster and clears pending auto-invites.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/campaign-player-sync.php';

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

    $campaignId = isset($input['campaign_id']) ? (int) $input['campaign_id'] : 0;
    $playerUserId = isset($input['user_id']) ? (int) $input['user_id'] : 0;

    $errors = [];
    if ($campaignId <= 0) {
        $errors['campaign_id'] = 'Valid campaign ID is required';
    }
    if ($playerUserId <= 0) {
        $errors['user_id'] = 'Valid user ID is required';
    }
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }

    $dmUserId = Security::getCurrentUserId();
    $db = getDB();

    if (!campaignPlayersFeatureReady($db)) {
        Security::sendErrorResponse('Campaign player auto-invites are not ready. Run migration 037_campaign_players_and_session_map_library.sql.', 503);
    }

    $campaign = $db->selectOne(
        "SELECT campaign_id, campaign_name, dm_user_id
         FROM campaigns
         WHERE campaign_id = ?",
        [$campaignId]
    );

    if (!$campaign) {
        Security::sendErrorResponse('Campaign not found', 404);
    }

    if ((int) $campaign['dm_user_id'] !== (int) $dmUserId) {
        Security::sendErrorResponse('You do not have permission to manage this campaign', 403);
    }

    if ($playerUserId === (int) $dmUserId) {
        Security::sendValidationErrorResponse(['user_id' => 'You cannot remove the campaign DM from the campaign']);
    }

    $player = $db->selectOne(
        "SELECT user_id, username
         FROM users
         WHERE user_id = ?",
        [$playerUserId]
    );

    if (!$player) {
        Security::sendErrorResponse('Player not found', 404);
    }

    $db->beginTransaction();

    try {
        $deletedMemberships = $db->delete(
            "DELETE FROM campaign_players
             WHERE campaign_id = ? AND user_id = ?",
            [$campaignId, $playerUserId]
        );

        if ($deletedMemberships === 0) {
            $db->rollback();
            Security::sendErrorResponse('Player is not in this campaign roster', 404);
        }

        $removedPendingInvites = removePendingCampaignInvites($db, $campaignId, $playerUserId);

        $db->commit();

        Security::sendSuccessResponse([
            'campaign_id' => (int) $campaign['campaign_id'],
            'campaign_name' => $campaign['campaign_name'],
            'user_id' => (int) $player['user_id'],
            'username' => $player['username'],
            'removed_pending_session_invites' => $removedPendingInvites
        ], 'Player removed from campaign roster');
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
} catch (Exception $e) {
    error_log('Campaign remove player error: ' . $e->getMessage());
    error_log('Campaign remove player trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while removing a campaign player', 500);
}
