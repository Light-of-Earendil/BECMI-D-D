<?php
/**
 * BECMI D&D Character Manager - Session Creation Endpoint
 *
 * Allows an authenticated Dungeon Master to create a new game session.
 * Request payload is JSON via the SPA API client.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();

    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }

    $payload = Security::validateJSONInput();
    $errors = [];

    $title = Security::sanitizeInput($payload['session_title'] ?? '');
    $description = Security::sanitizeInput($payload['session_description'] ?? '');
    $datetimeRaw = Security::sanitizeInput($payload['session_datetime'] ?? '');
    $duration = isset($payload['duration_minutes']) ? (int) $payload['duration_minutes'] : 240;
    $maxPlayers = isset($payload['max_players']) ? (int) $payload['max_players'] : 6;
    $meetLink = Security::sanitizeInput($payload['meet_link'] ?? '');
    $campaignId = isset($payload['campaign_id']) ? (int) $payload['campaign_id'] : null;
    
    // Validate meet_link if provided (should be a valid URL)
    if (!empty($meetLink)) {
        if (!filter_var($meetLink, FILTER_VALIDATE_URL)) {
            $errors['meet_link'] = 'Meet link must be a valid URL';
        } elseif (strlen($meetLink) > 500) {
            $errors['meet_link'] = 'Meet link must be less than 500 characters';
        }
    }

    if (strlen($title) < 3 || strlen($title) > 100) {
        $errors['session_title'] = 'Session title must be between 3 and 100 characters';
    }

    $dateTime = DateTime::createFromFormat('Y-m-d H:i:s', $datetimeRaw);
    if (!$dateTime) {
        // Try fallback to ISO or other browser formats
        $timestamp = strtotime($datetimeRaw);
        if ($timestamp !== false) {
            $dateTime = (new DateTime())->setTimestamp($timestamp);
        }
    }

    if (!$dateTime) {
        $errors['session_datetime'] = 'Invalid session date/time format';
    } else {
        $now = new DateTime('now');
        if ($dateTime <= $now) {
            $errors['session_datetime'] = 'Session date must be in the future';
        }
    }

    if ($duration <= 0) {
        $errors['duration_minutes'] = 'Duration must be greater than zero';
    }

    if ($maxPlayers <= 0) {
        $errors['max_players'] = 'Max players must be at least 1';
    }

    // Validate campaign_id if provided
    if ($campaignId !== null && $campaignId > 0) {
        $db = getDB();
        $campaign = $db->selectOne(
            "SELECT campaign_id, dm_user_id FROM campaigns WHERE campaign_id = ?",
            [$campaignId]
        );
        
        if (!$campaign) {
            $errors['campaign_id'] = 'Campaign not found';
        } else {
            // Verify user is the DM of this campaign
            if ($campaign['dm_user_id'] != $userId) {
                $errors['campaign_id'] = 'You must be the DM of this campaign to link a session to it';
            }
        }
    }

    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }

    $userId = Security::getCurrentUserId();
    $db = getDB();

    $sessionId = $db->insert(
        'INSERT INTO game_sessions (
            dm_user_id,
            campaign_id,
            session_title,
            session_description,
            meet_link,
            session_datetime,
            duration_minutes,
            status,
            max_players,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [
            $userId,
            $campaignId,
            $title,
            $description,
            $meetLink ?: null,
            $dateTime->format('Y-m-d H:i:s'),
            $duration,
            'scheduled',
            $maxPlayers
        ]
    );

    Security::logSecurityEvent('session_created', [
        'session_id' => $sessionId,
        'dm_user_id' => $userId
    ]);

    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'session' => [
            'session_id' => $sessionId,
            'dm_user_id' => $userId,
            'campaign_id' => $campaignId,
            'session_title' => $title,
            'session_description' => $description,
            'meet_link' => $meetLink ?: null,
            'session_datetime' => $dateTime->format('Y-m-d H:i:s'),
            'duration_minutes' => $duration,
            'status' => 'scheduled',
            'max_players' => $maxPlayers
        ]
    ], 'Session created successfully');
} catch (Exception $e) {
    error_log('Session creation error: '. $e->getMessage());
    error_log('Session creation error trace: '. $e->getTraceAsString());
    
    // In development, show more details
    $errorMessage = 'An error occurred while creating the session';
    if (defined('DEBUG') && DEBUG) {
        $errorMessage .= ': ' . $e->getMessage();
    }
    
    Security::sendErrorResponse($errorMessage, 500);
}