<?php
/**
 * BECMI D&D Character Manager - List Time-Based Effects Endpoint
 * 
 * Lists time-based effects for a character, session, or campaign
 * 
 * **Request:** GET
 * 
 * **Query Parameters:**
 * - `character_id` (int, optional) - Filter by character
 * - `session_id` (int, optional) - Filter by session
 * - `campaign_id` (int, optional) - Filter by campaign
 * - `effect_type` (string, optional) - Filter by effect type
 * - `active_only` (bool, optional) - Only return active effects (default: true)
 * 
 * @package api/time-based-effects
 * @api GET /api/time-based-effects/list.php
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    Security::requireAuth();
    
    $characterId = isset($_GET['character_id']) ? (int) $_GET['character_id'] : null;
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : null;
    $campaignId = isset($_GET['campaign_id']) ? (int) $_GET['campaign_id'] : null;
    $effectType = $_GET['effect_type'] ?? null;
    $activeOnly = !isset($_GET['active_only']) || $_GET['active_only'] !== 'false';
    
    $userId = Security::getCurrentUserId();
    $db = getDB();
    
    // Build query
    $conditions = [];
    $params = [];
    
    if ($characterId) {
        // Verify user owns character or is DM
        $character = $db->selectOne(
            "SELECT character_id, user_id FROM characters WHERE character_id = ?",
            [$characterId]
        );
        
        if (!$character) {
            Security::sendErrorResponse('Character not found', 404);
        }
        
        // Check if user owns character or is DM of session/campaign
        $hasAccess = false;
        if ($character['user_id'] == $userId) {
            $hasAccess = true;
        } else {
            // Check if user is DM
            if ($sessionId) {
                $session = $db->selectOne(
                    "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
                    [$sessionId]
                );
                if ($session && $session['dm_user_id'] == $userId) {
                    $hasAccess = true;
                }
            }
            if (!$hasAccess && $campaignId) {
                $campaign = $db->selectOne(
                    "SELECT dm_user_id FROM campaigns WHERE campaign_id = ?",
                    [$campaignId]
                );
                if ($campaign && $campaign['dm_user_id'] == $userId) {
                    $hasAccess = true;
                }
            }
        }
        
        if (!$hasAccess) {
            Security::sendErrorResponse('You do not have access to this character', 403);
        }
        
        $conditions[] = "character_id = ?";
        $params[] = $characterId;
    }
    
    if ($sessionId) {
        $conditions[] = "session_id = ?";
        $params[] = $sessionId;
    }
    
    if ($campaignId) {
        $conditions[] = "campaign_id = ?";
        $params[] = $campaignId;
    }
    
    if ($effectType) {
        $conditions[] = "effect_type = ?";
        $params[] = $effectType;
    }
    
    if ($activeOnly) {
        $conditions[] = "is_active = TRUE";
    }
    
    $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
    
    $effects = $db->select(
        "SELECT effect_id, character_id, session_id, campaign_id, effect_type, 
                effect_name, effect_description, duration_seconds, remaining_seconds,
                started_at_game_time_seconds, expires_at_game_time_seconds, 
                effect_data, is_active, created_at, updated_at
         FROM time_based_effects
         $whereClause
         ORDER BY expires_at_game_time_seconds ASC",
        $params
    );
    
    // Format response
    $formattedEffects = array_map(function($effect) {
        return [
            'effect_id' => (int) $effect['effect_id'],
            'character_id' => (int) $effect['character_id'],
            'session_id' => $effect['session_id'] ? (int) $effect['session_id'] : null,
            'campaign_id' => $effect['campaign_id'] ? (int) $effect['campaign_id'] : null,
            'effect_type' => $effect['effect_type'],
            'effect_name' => $effect['effect_name'],
            'effect_description' => $effect['effect_description'],
            'duration_seconds' => (int) $effect['duration_seconds'],
            'remaining_seconds' => (int) $effect['remaining_seconds'],
            'started_at_game_time_seconds' => (int) $effect['started_at_game_time_seconds'],
            'expires_at_game_time_seconds' => (int) $effect['expires_at_game_time_seconds'],
            'effect_data' => $effect['effect_data'] ? json_decode($effect['effect_data'], true) : null,
            'is_active' => (bool) $effect['is_active'],
            'created_at' => $effect['created_at'],
            'updated_at' => $effect['updated_at']
        ];
    }, $effects);
    
    Security::sendSuccessResponse([
        'effects' => $formattedEffects,
        'total_count' => count($formattedEffects)
    ]);
    
} catch (Exception $e) {
    error_log('List time-based effects error: ' . $e->getMessage());
    Security::sendErrorResponse('An error occurred while listing effects', 500);
}
?>
