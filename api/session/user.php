<?php
/**
 * BECMI D&D Character Manager - Session List Endpoint
 *
 * Returns all sessions associated with the authenticated user either as DM
 * or invited player. The response includes derived metadata needed by the
 * dashboard and session management views.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (suppress errors for zlib compression)
while (ob_get_level()) {
    @ob_end_clean();
}

// Initialize security (REQUIRED to start session)
Security::init();

// Force JSON output for consistency with SPA expectations
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();

    $userId = Security::getCurrentUserId();
    $db = getDB();

    // Aggregate player counts once to avoid per-row queries
    $sessionStats = $db->select(
        "SELECT session_id,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count,
                COUNT(*) AS total_count
         FROM session_players
         GROUP BY session_id"
    );

    $statsMap = [];
    foreach ($sessionStats as $row) {
        $statsMap[$row['session_id']] = [
            'accepted' => (int) $row['accepted_count'],
            'total' => (int) $row['total_count']
        ];
    }

    // Pull sessions where the user is DM or an invited player
    $sessions = $db->select(
        "SELECT DISTINCT
                gs.session_id,
                gs.dm_user_id,
                gs.session_title,
                gs.session_description,
                gs.meet_link,
                gs.session_datetime,
                gs.duration_minutes,
                gs.status,
                gs.max_players,
                u.username AS dm_username,
                CASE WHEN gs.dm_user_id = ? THEN 1 ELSE 0 END AS is_dm,
                sp.status AS invitation_status
         FROM game_sessions gs
         INNER JOIN users u ON u.user_id = gs.dm_user_id
         LEFT JOIN session_players sp
               ON sp.session_id = gs.session_id AND sp.user_id = ?
         WHERE gs.dm_user_id = ? OR sp.user_id = ?
         ORDER BY gs.session_datetime ASC",
        [$userId, $userId, $userId, $userId]
    );

    $formattedSessions = array_map(function ($session) use ($statsMap) {
        $sessionId = (int) $session['session_id'];
        $stats = $statsMap[$sessionId] ?? ['accepted' => 0, 'total' => 0];

        $sessionDatetime = $session['session_datetime'];
        $isoDatetime = null;
        if (!empty($sessionDatetime)) {
            $timestamp = strtotime($sessionDatetime);
            if ($timestamp !== false) {
                $isoDatetime = date('c', $timestamp);
            }
        }

        return [
            'session_id' => $sessionId,
            'dm_user_id' => (int) $session['dm_user_id'],
            'session_title' => $session['session_title'],
            'session_description' => $session['session_description'],
            'meet_link' => $session['meet_link'] ?? null,
            'session_datetime' => $sessionDatetime,
            'session_datetime_iso' => $isoDatetime,
            'duration_minutes' => (int) ($session['duration_minutes'] ?? 0),
            'status' => $session['status'],
            'max_players' => (int) ($session['max_players'] ?? 0),
            'dm_username' => $session['dm_username'],
            'is_dm' => ((int) $session['is_dm']) === 1,
            'user_role' => ((int) $session['is_dm']) === 1 ? 'dm' : 'player',
            'invitation_status' => $session['invitation_status'] ?? null,
            'current_players' => $stats['accepted'],
            'total_players' => $stats['total']
        ];
    }, $sessions);

    Security::sendSuccessResponse([
        'sessions' => $formattedSessions,
        'total_count' => count($formattedSessions)
    ], 'User sessions retrieved successfully');
} catch (Exception $e) {
    error_log('Session list error: '. $e->getMessage());
    Security::sendErrorResponse('An error occurred while retrieving sessions', 500);
}
?>
