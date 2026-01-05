<?php
/**
 * BECMI D&D Character Manager - Create Time-Based Effect Endpoint
 * 
 * Creates a new time-based effect (spell, condition, hunger, thirst, etc.)
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `character_id` (int, required) - Character ID
 * - `session_id` (int, optional) - Session ID
 * - `campaign_id` (int, optional) - Campaign ID (required if no session_id)
 * - `effect_type` (string, required) - 'spell', 'condition', 'hunger', 'thirst', 'age', 'custom'
 * - `effect_name` (string, required) - Name of the effect
 * - `effect_description` (text, optional) - Description
 * - `duration_seconds` (int, required) - Total duration in seconds
 * - `effect_data` (JSON, optional) - Additional effect-specific data
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "data": {
 *     "effect_id": int,
 *     "character_id": int,
 *     "effect_name": string,
 *     "remaining_seconds": int,
 *     "expires_at_game_time_seconds": int
 *   }
 * }
 * ```
 * 
 * @package api/time-based-effects
 * @api POST /api/time-based-effects/create.php
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

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
    
    // Validate required fields
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    $sessionId = isset($input['session_id']) ? (int) ($input['session_id'] ?? 0) : null;
    $campaignId = isset($input['campaign_id']) ? (int) ($input['campaign_id'] ?? 0) : null;
    $effectType = $input['effect_type'] ?? '';
    $effectName = Security::sanitizeInput($input['effect_name'] ?? '');
    $effectDescription = Security::sanitizeInput($input['effect_description'] ?? '');
    $durationSeconds = isset($input['duration_seconds']) ? (int) $input['duration_seconds'] : 0;
    $effectData = isset($input['effect_data']) ? json_encode($input['effect_data']) : null;
    
    $errors = [];
    
    if ($characterId <= 0) {
        $errors['character_id'] = 'Valid character ID is required';
    }
    
    if (!$sessionId && !$campaignId) {
        $errors['campaign_id'] = 'Either session_id or campaign_id is required';
    }
    
    if (!in_array($effectType, ['spell', 'condition', 'hunger', 'thirst', 'age', 'custom'])) {
        $errors['effect_type'] = 'Invalid effect type';
    }
    
    if (empty($effectName)) {
        $errors['effect_name'] = 'Effect name is required';
    }
    
    if ($durationSeconds <= 0) {
        $errors['duration_seconds'] = 'Duration must be greater than 0';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $userId = Security::getCurrentUserId();
    $db = getDB();
    
    // Verify character belongs to user or user is DM
    $character = $db->selectOne(
        "SELECT character_id, user_id FROM characters WHERE character_id = ?",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Get campaign_id if not provided but session_id is
    if (!$campaignId && $sessionId) {
        $session = $db->selectOne(
            "SELECT campaign_id FROM game_sessions WHERE session_id = ?",
            [$sessionId]
        );
        if ($session && $session['campaign_id']) {
            $campaignId = (int) $session['campaign_id'];
        }
    }
    
    if (!$campaignId) {
        Security::sendErrorResponse('Campaign ID is required. Session must be linked to a campaign.', 400);
    }
    
    // Get current game time from campaign
    $campaign = $db->selectOne(
        "SELECT game_time_seconds FROM campaigns WHERE campaign_id = ?",
        [$campaignId]
    );
    
    if (!$campaign) {
        Security::sendErrorResponse('Campaign not found', 404);
    }
    
    $currentGameTimeSeconds = (int) ($campaign['game_time_seconds'] ?? 0);
    $startedAt = $currentGameTimeSeconds;
    $expiresAt = $currentGameTimeSeconds + $durationSeconds;
    
    // Create effect
    $effectId = $db->insert(
        "INSERT INTO time_based_effects 
         (character_id, session_id, campaign_id, effect_type, effect_name, effect_description,
          duration_seconds, remaining_seconds, started_at_game_time_seconds, 
          expires_at_game_time_seconds, effect_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            $characterId,
            $sessionId,
            $campaignId,
            $effectType,
            $effectName,
            $effectDescription ?: null,
            $durationSeconds,
            $durationSeconds, // Initially remaining equals duration
            $startedAt,
            $expiresAt,
            $effectData
        ]
    );
    
    Security::logSecurityEvent('time_based_effect_created', [
        'effect_id' => $effectId,
        'character_id' => $characterId,
        'effect_type' => $effectType,
        'duration_seconds' => $durationSeconds
    ]);
    
    Security::sendSuccessResponse([
        'effect_id' => $effectId,
        'character_id' => $characterId,
        'effect_name' => $effectName,
        'remaining_seconds' => $durationSeconds,
        'expires_at_game_time_seconds' => $expiresAt
    ], 'Time-based effect created successfully');
    
} catch (Exception $e) {
    error_log('Create time-based effect error: ' . $e->getMessage());
    Security::sendErrorResponse('An error occurred while creating the effect', 500);
}
?>
