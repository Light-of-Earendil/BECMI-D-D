<?php

require_once __DIR__ . '/../core/database.php';

function getAudioLibraryContext(Database $db, int $sessionId): ?array
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
    $scopeSessions = [[
        'session_id' => (int) $session['session_id'],
        'session_title' => $session['session_title']
    ]];

    if ($scopeType === 'campaign') {
        $campaignSessions = $db->select(
            "SELECT session_id, session_title
             FROM game_sessions
             WHERE campaign_id = ?
             ORDER BY session_datetime ASC, session_id ASC",
            [(int) $session['campaign_id']]
        );

        if (!empty($campaignSessions)) {
            $scopeSessions = array_map(function ($campaignSession) {
                return [
                    'session_id' => (int) $campaignSession['session_id'],
                    'session_title' => $campaignSession['session_title']
                ];
            }, $campaignSessions);
        }
    }

    return [
        'session_id' => (int) $session['session_id'],
        'session_title' => $session['session_title'],
        'campaign_id' => !empty($session['campaign_id']) ? (int) $session['campaign_id'] : null,
        'scope_type' => $scopeType,
        'scope_sessions' => $scopeSessions,
        'scope_session_ids' => array_map(function ($scopeSession) {
            return (int) $scopeSession['session_id'];
        }, $scopeSessions)
    ];
}

function buildAudioLibraryPlaceholders(array $sessionIds): string
{
    return implode(',', array_fill(0, count($sessionIds), '?'));
}

function normalizeAudioPublicPath(string $filePath): string
{
    $fileUrl = $filePath;

    if (strpos($filePath, 'public/') === 0) {
        $fileUrl = substr($filePath, 7);
    }

    if (strpos($fileUrl, '/') !== 0) {
        $fileUrl = '/' . $fileUrl;
    }

    return $fileUrl;
}

function fetchAudioTrackInLibrary(Database $db, int $trackId, array $audioLibrary, ?string $trackType = null): ?array
{
    $sessionIds = $audioLibrary['scope_session_ids'];
    $placeholders = buildAudioLibraryPlaceholders($sessionIds);

    $query = "SELECT t.track_id, t.session_id, t.file_path, t.track_name, t.track_type, t.duration_seconds,
                     s.session_title
              FROM session_audio_tracks t
              JOIN game_sessions s ON t.session_id = s.session_id
              WHERE t.track_id = ?
              AND t.session_id IN ($placeholders)";

    $params = array_merge([$trackId], $sessionIds);

    if ($trackType !== null) {
        $query .= " AND t.track_type = ?";
        $params[] = $trackType;
    }

    return $db->selectOne($query, $params);
}

function fetchAudioPlaylistInLibrary(Database $db, int $playlistId, array $audioLibrary): ?array
{
    $sessionIds = $audioLibrary['scope_session_ids'];
    $placeholders = buildAudioLibraryPlaceholders($sessionIds);

    return $db->selectOne(
        "SELECT p.playlist_id, p.session_id, p.playlist_name, s.session_title
         FROM session_audio_playlists p
         JOIN game_sessions s ON p.session_id = s.session_id
         WHERE p.playlist_id = ?
         AND p.session_id IN ($placeholders)",
        array_merge([$playlistId], $sessionIds)
    );
}

