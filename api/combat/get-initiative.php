<?php
/**
 * BECMI D&D Character Manager - Get Initiative Order
 * 
 * Returns initiative order for a session sorted by initiative roll (DESC), then dexterity (DESC).
 */

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

// Enable error logging but disable display
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

try {
    require_once '../../app/core/database.php';
    require_once '../../app/core/security.php';
} catch (Exception $e) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to load required files: ' . $e->getMessage(),
        'code' => 'LOAD_ERROR'
    ]);
    exit;
}

// Initialize security (REQUIRED to start session)
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get session ID
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : 0;
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user has access to this session (DM or accepted player)
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    $isDM = ($session['dm_user_id'] == $userId);
    
    // Check if user is accepted player (if not DM)
    if (!$isDM) {
        $playerStatus = $db->selectOne(
            "SELECT status FROM session_players 
             WHERE session_id = ? AND user_id = ?",
            [$sessionId, $userId]
        );
        
        if (!$playerStatus || $playerStatus['status'] !== 'accepted') {
            Security::sendErrorResponse('You do not have permission to view initiative for this session', 403);
        }
    }
    
    // Get initiative order (optimized - no table existence check needed)
    $initiatives = $db->select(
        "SELECT ci.initiative_id, ci.character_id, ci.monster_instance_id, ci.entity_name, ci.entity_type,
                ci.initiative_roll, ci.dexterity, ci.is_active,
                c.current_hp, c.max_hp, c.class, c.level,
                mi.current_hp as monster_current_hp, mi.max_hp as monster_max_hp, 
                mi.is_named_boss, mi.armor_class as monster_ac
         FROM combat_initiatives ci
         LEFT JOIN characters c ON ci.character_id = c.character_id
         LEFT JOIN monster_instances mi ON ci.monster_instance_id = mi.instance_id
         WHERE ci.session_id = ? AND ci.is_active = 1
         ORDER BY ci.initiative_roll DESC, ci.dexterity DESC, ci.entity_name ASC",
        [$sessionId]
    );
    
    // Get current turn
    $currentTurn = $db->selectOne(
        "SELECT current_initiative_id, round_number FROM combat_current_turn WHERE session_id = ?",
        [$sessionId]
    );
    
    // Format initiative data
    $formattedInitiatives = array_map(function($init) use ($currentTurn) {
        // Determine HP source (character or monster)
        $hp = null;
        if ($init['entity_type'] === 'monster' && $init['monster_current_hp'] && $init['monster_max_hp']) {
            $hp = [
                'current' => (int) $init['monster_current_hp'],
                'max' => (int) $init['monster_max_hp'],
                'percentage' => round(((int)$init['monster_current_hp'] / (int)$init['monster_max_hp']) * 100, 1)
            ];
        } elseif ($init['current_hp'] && $init['max_hp']) {
            $hp = [
                'current' => (int) $init['current_hp'],
                'max' => (int) $init['max_hp'],
                'percentage' => round(((int)$init['current_hp'] / (int)$init['max_hp']) * 100, 1)
            ];
        }
        
        return [
            'initiative_id' => (int) $init['initiative_id'],
            'character_id' => $init['character_id'] ? (int) $init['character_id'] : null,
            'monster_instance_id' => $init['monster_instance_id'] ? (int) $init['monster_instance_id'] : null,
            'entity_name' => $init['entity_name'],
            'entity_type' => $init['entity_type'],
            'initiative_roll' => (int) $init['initiative_roll'],
            'dexterity' => $init['dexterity'] ? (int) $init['dexterity'] : null,
            'is_current_turn' => $currentTurn && $currentTurn['current_initiative_id'] == $init['initiative_id'],
            'hp' => $hp,
            'class' => $init['class'],
            'level' => $init['level'] ? (int) $init['level'] : null,
            'is_named_boss' => $init['is_named_boss'] ? (bool) $init['is_named_boss'] : false,
            'monster_ac' => $init['monster_ac'] ? (int) $init['monster_ac'] : null
        ];
    }, $initiatives);
    
    Security::sendSuccessResponse([
        'initiatives' => $formattedInitiatives,
        'current_turn' => $currentTurn ? [
            'initiative_id' => (int) $currentTurn['current_initiative_id'],
            'round_number' => (int) $currentTurn['round_number']
        ] : null,
        'total_count' => count($formattedInitiatives)
    ], 'Initiative order retrieved');
    
} catch (Exception $e) {
    error_log("Get initiative error: " . $e->getMessage());
    error_log("Get initiative error trace: " . $e->getTraceAsString());
    error_log("Get initiative error file: " . $e->getFile() . " line " . $e->getLine());
    
    Security::sendErrorResponse('Failed to get initiative order: ' . $e->getMessage(), 500);
}

