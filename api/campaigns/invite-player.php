<?php
/**
 * Adds a player to a campaign roster and seeds session invitations.
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
        Security::sendValidationErrorResponse(['user_id' => 'You are already the DM of this campaign']);
    }

    $player = $db->selectOne(
        "SELECT user_id, username, email
         FROM users
         WHERE user_id = ? AND is_active = 1",
        [$playerUserId]
    );

    if (!$player) {
        Security::sendErrorResponse('Player not found', 404);
    }

    $db->beginTransaction();

    try {
        $existingMembership = $db->selectOne(
            "SELECT user_id
             FROM campaign_players
             WHERE campaign_id = ? AND user_id = ?",
            [$campaignId, $playerUserId]
        );

        $isNewMembership = $existingMembership === null;

        if ($isNewMembership) {
            $db->insert(
                "INSERT INTO campaign_players (campaign_id, user_id, added_by_user_id, added_at)
                 VALUES (?, ?, ?, NOW())",
                [$campaignId, $playerUserId, $dmUserId]
            );
        }

        $seededSessionInvites = syncCampaignPlayerToCampaignSessions($db, $campaignId, $playerUserId);

        $db->commit();

        Security::sendSuccessResponse([
            'campaign_id' => (int) $campaign['campaign_id'],
            'campaign_name' => $campaign['campaign_name'],
            'user_id' => (int) $player['user_id'],
            'username' => $player['username'],
            'email' => $player['email'],
            'is_new_membership' => $isNewMembership,
            'seeded_session_invites' => $seededSessionInvites
        ], $isNewMembership
            ? 'Player added to campaign and auto-invited to campaign sessions'
            : 'Player is already in the campaign roster. Missing session invites were restored.');
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
} catch (Exception $e) {
    error_log('Campaign invite player error: ' . $e->getMessage());
    error_log('Campaign invite player trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while inviting a campaign player', 500);
}
