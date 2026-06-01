<?php
/**
 * Campaign player synchronization helpers.
 *
 * Campaign membership is the source of truth for reusable player rosters.
 * Session invitations remain session-specific, but new/existing campaign
 * sessions can be seeded from this roster.
 */

require_once __DIR__ . '/../core/database.php';

function campaignPlayersFeatureReady(Database $db): bool
{
    static $featureReady = null;

    if ($featureReady !== null) {
        return $featureReady;
    }

    try {
        $featureReady = $db->selectOne("SHOW TABLES LIKE 'campaign_players'") !== null;
    } catch (Exception $e) {
        $featureReady = false;
    }

    return $featureReady;
}

function syncCampaignPlayersToSession(Database $db, int $campaignId, int $sessionId): int
{
    if (!campaignPlayersFeatureReady($db)) {
        return 0;
    }

    $stmt = $db->execute(
        "INSERT INTO session_players (session_id, user_id, status, joined_at)
         SELECT ?, cp.user_id, 'invited', NOW()
         FROM campaign_players cp
         LEFT JOIN session_players sp
                ON sp.session_id = ? AND sp.user_id = cp.user_id
         WHERE cp.campaign_id = ?
           AND sp.user_id IS NULL",
        [$sessionId, $sessionId, $campaignId]
    );

    return $stmt->rowCount();
}

function syncCampaignPlayerToCampaignSessions(Database $db, int $campaignId, int $userId): int
{
    if (!campaignPlayersFeatureReady($db)) {
        return 0;
    }

    $stmt = $db->execute(
        "INSERT INTO session_players (session_id, user_id, status, joined_at)
         SELECT gs.session_id, ?, 'invited', NOW()
         FROM game_sessions gs
         LEFT JOIN session_players sp
                ON sp.session_id = gs.session_id AND sp.user_id = ?
         WHERE gs.campaign_id = ?
           AND gs.status IN ('scheduled', 'active')
           AND sp.user_id IS NULL",
        [$userId, $userId, $campaignId]
    );

    return $stmt->rowCount();
}

function removePendingCampaignInvites(Database $db, int $campaignId, int $userId): int
{
    if (!campaignPlayersFeatureReady($db)) {
        return 0;
    }

    return $db->delete(
        "DELETE sp
         FROM session_players sp
         JOIN game_sessions gs ON gs.session_id = sp.session_id
         WHERE gs.campaign_id = ?
           AND sp.user_id = ?
           AND sp.status = 'invited'",
        [$campaignId, $userId]
    );
}
