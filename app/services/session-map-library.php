<?php
/**
 * Session scratch-pad map library helpers.
 *
 * Uploaded map assets can be reused across sessions in the same campaign,
 * while each session keeps its own local map rows for drawings and tokens.
 */

require_once __DIR__ . '/../core/database.php';

function sessionMapLibraryFeatureReady(Database $db): bool
{
    static $featureReady = null;

    if ($featureReady !== null) {
        return $featureReady;
    }

    try {
        $featureReady = $db->selectOne("SHOW COLUMNS FROM session_maps LIKE 'source_map_id'") !== null;
    } catch (Exception $e) {
        $featureReady = false;
    }

    return $featureReady;
}

function getSessionMapLibraryContext(Database $db, int $sessionId): ?array
{
    $session = $db->selectOne(
        "SELECT session_id, session_title, campaign_id
         FROM game_sessions
         WHERE session_id = ?",
        [$sessionId]
    );

    if (!$session) {
        return null;
    }

    $scopeType = !empty($session['campaign_id']) ? 'campaign' : 'session';

    return [
        'session_id' => (int) $session['session_id'],
        'session_title' => $session['session_title'],
        'campaign_id' => !empty($session['campaign_id']) ? (int) $session['campaign_id'] : null,
        'scope_type' => $scopeType
    ];
}

function normalizeSessionMapPublicPath(string $filePath): string
{
    if (strpos($filePath, '/') === 0) {
        return $filePath;
    }

    return '/' . ltrim($filePath, '/');
}

function getSessionLocalMaps(Database $db, int $sessionId): array
{
    if (sessionMapLibraryFeatureReady($db)) {
        return $db->select(
            "SELECT m.map_id, m.session_id, m.source_map_id, m.map_name, m.image_path,
                    m.image_width, m.image_height, m.is_active, m.created_at,
                    CASE
                        WHEN m.source_map_id IS NULL THEN m.map_id
                        ELSE m.source_map_id
                    END AS canonical_map_id,
                    srcs.session_id AS source_session_id,
                    COALESCE(srcs.session_title, gs.session_title) AS source_session_title
             FROM session_maps m
             JOIN game_sessions gs ON gs.session_id = m.session_id
             LEFT JOIN session_maps src ON src.map_id = m.source_map_id
             LEFT JOIN game_sessions srcs ON srcs.session_id = src.session_id
             WHERE m.session_id = ?
             ORDER BY m.is_active DESC, m.created_at ASC, m.map_id ASC",
            [$sessionId]
        );
    }

    return $db->select(
        "SELECT m.map_id, m.session_id, NULL AS source_map_id, m.map_name, m.image_path,
                m.image_width, m.image_height, m.is_active, m.created_at,
                m.map_id AS canonical_map_id,
                m.session_id AS source_session_id,
                gs.session_title AS source_session_title
         FROM session_maps m
         JOIN game_sessions gs ON gs.session_id = m.session_id
         WHERE m.session_id = ?
         ORDER BY m.is_active DESC, m.created_at ASC, m.map_id ASC",
        [$sessionId]
    );
}

function getCampaignLibraryMaps(Database $db, array $mapLibraryContext, array $localMaps): array
{
    if (
        !sessionMapLibraryFeatureReady($db) ||
        $mapLibraryContext['scope_type'] !== 'campaign' ||
        empty($mapLibraryContext['campaign_id'])
    ) {
        return [];
    }

    $localCanonicalIds = [];
    foreach ($localMaps as $localMap) {
        $localCanonicalIds[(int) $localMap['canonical_map_id']] = true;
    }

    $rows = $db->select(
        "SELECT m.map_id, m.session_id, m.source_map_id, m.map_name, m.image_path,
                m.image_width, m.image_height, m.created_at, gs.session_title,
                CASE
                    WHEN m.source_map_id IS NULL THEN m.map_id
                    ELSE m.source_map_id
                END AS canonical_map_id
         FROM session_maps m
         JOIN game_sessions gs ON gs.session_id = m.session_id
         WHERE gs.campaign_id = ?
           AND m.session_id <> ?
         ORDER BY CASE WHEN m.source_map_id IS NULL THEN 0 ELSE 1 END ASC,
                  m.created_at ASC,
                  m.map_id ASC",
        [
            (int) $mapLibraryContext['campaign_id'],
            (int) $mapLibraryContext['session_id']
        ]
    );

    $campaignLibraryMaps = [];
    $seenCanonicalIds = [];

    foreach ($rows as $row) {
        $canonicalMapId = (int) $row['canonical_map_id'];

        if (isset($localCanonicalIds[$canonicalMapId]) || isset($seenCanonicalIds[$canonicalMapId])) {
            continue;
        }

        $campaignLibraryMaps[] = [
            'library_map_id' => $canonicalMapId,
            'source_session_id' => (int) $row['session_id'],
            'source_session_title' => $row['session_title'],
            'map_name' => $row['map_name'],
            'image_url' => normalizeSessionMapPublicPath($row['image_path']),
            'image_width' => isset($row['image_width']) ? (int) $row['image_width'] : 0,
            'image_height' => isset($row['image_height']) ? (int) $row['image_height'] : 0,
            'created_at' => $row['created_at']
        ];

        $seenCanonicalIds[$canonicalMapId] = true;
    }

    return $campaignLibraryMaps;
}
