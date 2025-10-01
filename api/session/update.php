<?php
/**
 * BECMI D&D Character Manager - Session Update Endpoint
 *
 * Allows a DM to update their game session
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();

    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }

    // DEBUG: Read raw input
    $rawInput = file_get_contents('php://input');
    error_log("UPDATE SESSION - Raw input: " . substr($rawInput, 0, 500));
    error_log("UPDATE SESSION - Request method: " . $_SERVER['REQUEST_METHOD']);
    error_log("UPDATE SESSION - Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
    
    // Decode manually
    $payload = [];
    if (!empty($rawInput)) {
        $payload = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("UPDATE SESSION - JSON decode error: " . json_last_error_msg());
            Security::sendErrorResponse('Invalid JSON input', 400);
        }
    }
    
    error_log("UPDATE SESSION - Decoded payload keys: " . implode(', ', array_keys($payload)));
    
    $errors = [];
    $sessionId = isset($payload['session_id']) ? (int) $payload['session_id'] : 0;
    $title = Security::sanitizeInput($payload['session_title'] ?? '');
    $description = Security::sanitizeInput($payload['session_description'] ?? '');
    $datetimeRaw = Security::sanitizeInput($payload['session_datetime'] ?? '');
    $duration = isset($payload['duration_minutes']) ? (int) $payload['duration_minutes'] : 240;
    $maxPlayers = isset($payload['max_players']) ? (int) $payload['max_players'] : 6;
    $status = $payload['status'] ?? 'scheduled';

    if ($sessionId <= 0) {
        $errors['session_id'] = 'Invalid session ID';
    }

    if (strlen($title) < 3 || strlen($title) > 100) {
        $errors['session_title'] = 'Session title must be between 3 and 100 characters';
    }

    $dateTime = DateTime::createFromFormat('Y-m-d H:i:s', $datetimeRaw);
    if (!$dateTime) {
        $timestamp = strtotime($datetimeRaw);
        if ($timestamp !== false) {
            $dateTime = (new DateTime())->setTimestamp($timestamp);
        }
    }

    if (!$dateTime) {
        $errors['session_datetime'] = 'Invalid session date/time format';
    }

    if ($duration <= 0) {
        $errors['duration_minutes'] = 'Duration must be greater than zero';
    }

    if ($maxPlayers <= 0) {
        $errors['max_players'] = 'Max players must be at least 1';
    }

    $validStatuses = ['scheduled', 'active', 'completed', 'cancelled'];
    if (!in_array($status, $validStatuses)) {
        $errors['status'] = 'Invalid status';
    }

    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }

    $userId = Security::getCurrentUserId();
    $db = getDB();

    // Verify user owns this session
    $existingSession = $db->selectOne(
        'SELECT dm_user_id FROM game_sessions WHERE session_id = ?',
        [$sessionId]
    );

    if (!$existingSession) {
        Security::sendErrorResponse('Session not found', 404);
    }

    if ($existingSession['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to edit this session', 403);
    }

    // Update session
    $db->execute(
        'UPDATE game_sessions SET
            session_title = ?,
            session_description = ?,
            session_datetime = ?,
            duration_minutes = ?,
            max_players = ?,
            status = ?,
            updated_at = NOW()
         WHERE session_id = ?',
        [
            $title,
            $description,
            $dateTime->format('Y-m-d H:i:s'),
            $duration,
            $maxPlayers,
            $status,
            $sessionId
        ]
    );

    Security::logSecurityEvent('session_updated', [
        'session_id' => $sessionId,
        'dm_user_id' => $userId
    ]);

    Security::sendSuccessResponse([
        'session' => [
            'session_id' => $sessionId,
            'dm_user_id' => $userId,
            'session_title' => $title,
            'session_description' => $description,
            'session_datetime' => $dateTime->format('Y-m-d H:i:s'),
            'duration_minutes' => $duration,
            'status' => $status,
            'max_players' => $maxPlayers
        ]
    ], 'Session updated successfully');
} catch (Exception $e) {
    error_log('Session update error: '. $e->getMessage());
    Security::sendErrorResponse('An error occurred while updating the session', 500);
}
