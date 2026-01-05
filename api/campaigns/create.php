<?php
/**
 * BECMI D&D Character Manager - Campaign Creation Endpoint
 *
 * Allows an authenticated Dungeon Master to create a new campaign.
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

    $name = Security::sanitizeInput($payload['campaign_name'] ?? '');
    $description = Security::sanitizeInput($payload['campaign_description'] ?? '');

    if (strlen($name) < 3 || strlen($name) > 100) {
        $errors['campaign_name'] = 'Campaign name must be between 3 and 100 characters';
    }

    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }

    $userId = Security::getCurrentUserId();
    $db = getDB();

    $campaignId = $db->insert(
        'INSERT INTO campaigns (
            campaign_name,
            campaign_description,
            dm_user_id,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, NOW(), NOW())',
        [
            $name,
            $description ?: null,
            $userId
        ]
    );

    Security::logSecurityEvent('campaign_created', [
        'campaign_id' => $campaignId,
        'dm_user_id' => $userId
    ]);

    Security::sendSuccessResponse([
        'campaign_id' => $campaignId,
        'campaign' => [
            'campaign_id' => $campaignId,
            'dm_user_id' => $userId,
            'campaign_name' => $name,
            'campaign_description' => $description ?: null,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]
    ], 'Campaign created successfully');
} catch (Exception $e) {
    error_log('Campaign creation error: '. $e->getMessage());
    error_log('Campaign creation error trace: '. $e->getTraceAsString());
    
    $errorMessage = 'An error occurred while creating the campaign';
    if (defined('DEBUG') && DEBUG) {
        $errorMessage .= ': ' . $e->getMessage();
    }
    
    Security::sendErrorResponse($errorMessage, 500);
}
