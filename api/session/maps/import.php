<?php
/**
 * Imports a campaign-shared scratch-pad map into the current session.
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';
require_once '../../../app/services/session-map-library.php';

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
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    $sourceMapId = isset($input['source_map_id']) ? (int) $input['source_map_id'] : 0;

    $errors = [];
    if ($sessionId <= 0) {
        $errors['session_id'] = 'Valid session ID is required';
    }
    if ($sourceMapId <= 0) {
        $errors['source_map_id'] = 'Valid source map ID is required';
    }
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }

    $db = getDB();
    $userId = Security::getCurrentUserId();

    if (!sessionMapLibraryFeatureReady($db)) {
        Security::sendErrorResponse('Campaign map library is not ready. Run migration 037_campaign_players_and_session_map_library.sql.', 503);
    }

    $session = $db->selectOne(
        "SELECT session_id, session_title, campaign_id, dm_user_id
         FROM game_sessions
         WHERE session_id = ?",
        [$sessionId]
    );

    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }

    if ((int) $session['dm_user_id'] !== (int) $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can import campaign maps', 403);
    }

    if (empty($session['campaign_id'])) {
        Security::sendValidationErrorResponse(['session_id' => 'Session must be linked to a campaign before importing shared maps']);
    }

    $campaignId = (int) $session['campaign_id'];

    $existingMap = $db->selectOne(
        "SELECT map_id, map_name, image_path, image_width, image_height
         FROM session_maps
         WHERE session_id = ?
           AND (map_id = ? OR COALESCE(source_map_id, map_id) = ?)
         ORDER BY map_id ASC
         LIMIT 1",
        [$sessionId, $sourceMapId, $sourceMapId]
    );

    $db->beginTransaction();

    try {
        if ($existingMap) {
            $mapId = (int) $existingMap['map_id'];
            $mapName = $existingMap['map_name'];
            $imagePath = $existingMap['image_path'];
            $imageWidth = (int) $existingMap['image_width'];
            $imageHeight = (int) $existingMap['image_height'];
            $sourceSessionTitle = $session['session_title'];
        } else {
            $librarySourceMap = $db->selectOne(
                "SELECT m.map_id, m.map_name, m.image_path, m.image_width, m.image_height,
                        gs.session_id AS source_session_id, gs.session_title AS source_session_title
                 FROM session_maps m
                 JOIN game_sessions gs ON gs.session_id = m.session_id
                 WHERE gs.campaign_id = ?
                   AND (m.map_id = ? OR m.source_map_id = ?)
                   AND gs.session_id <> ?
                 ORDER BY CASE WHEN m.map_id = ? THEN 0 ELSE 1 END ASC,
                          CASE WHEN m.source_map_id IS NULL THEN 0 ELSE 1 END ASC,
                          m.created_at ASC,
                          m.map_id ASC
                 LIMIT 1",
                [$campaignId, $sourceMapId, $sourceMapId, $sessionId, $sourceMapId]
            );

            if (!$librarySourceMap) {
                $db->rollback();
                Security::sendErrorResponse('Shared campaign map not found', 404);
            }

            $mapId = (int) $db->insert(
                "INSERT INTO session_maps
                 (session_id, source_map_id, map_name, image_path, image_width, image_height, is_active, created_by_user_id)
                 VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)",
                [
                    $sessionId,
                    $sourceMapId,
                    $librarySourceMap['map_name'],
                    $librarySourceMap['image_path'],
                    $librarySourceMap['image_width'],
                    $librarySourceMap['image_height'],
                    $userId
                ]
            );

            $mapName = $librarySourceMap['map_name'];
            $imagePath = $librarySourceMap['image_path'];
            $imageWidth = (int) $librarySourceMap['image_width'];
            $imageHeight = (int) $librarySourceMap['image_height'];
            $sourceSessionTitle = $librarySourceMap['source_session_title'];
        }

        $db->execute(
            "UPDATE session_maps
             SET is_active = CASE WHEN map_id = ? THEN TRUE ELSE FALSE END
             WHERE session_id = ?",
            [$mapId, $sessionId]
        );

        $db->commit();

        try {
            require_once '../../../app/services/event-broadcaster.php';
            broadcastEvent(
                $sessionId,
                'map_refresh',
                ['session_id' => $sessionId],
                $userId
            );
        } catch (Exception $broadcastError) {
            error_log('Session map import broadcast error: ' . $broadcastError->getMessage());
        }

        Security::sendSuccessResponse([
            'map_id' => $mapId,
            'map_name' => $mapName,
            'image_url' => normalizeSessionMapPublicPath($imagePath),
            'image_width' => $imageWidth,
            'image_height' => $imageHeight,
            'is_active' => true,
            'source_map_id' => $sourceMapId,
            'source_session_title' => $sourceSessionTitle
        ], 'Campaign map added to this session');
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
} catch (Exception $e) {
    error_log('Session map import error: ' . $e->getMessage());
    error_log('Session map import trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to import campaign map', 500);
}
