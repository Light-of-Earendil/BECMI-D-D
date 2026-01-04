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
    
    // Verify user is DM of this session
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can view initiative', 403);
    }
    
    // Get initiative order (handle missing tables gracefully)
    $initiatives = [];
    $currentTurn = null;
    
    try {
        // Check if combat_initiatives table exists
        $tableExists = $db->selectOne(
            "SELECT COUNT(*) as count FROM information_schema.tables 
             WHERE table_schema = DATABASE() AND table_name = 'combat_initiatives'"
        );
        
        if ($tableExists && $tableExists['count'] > 0) {
            $initiatives = $db->select(
                "SELECT ci.initiative_id, ci.character_id, ci.entity_name, ci.entity_type,
                        ci.initiative_roll, ci.dexterity, ci.is_active,
                        c.current_hp, c.max_hp, c.class, c.level
                 FROM combat_initiatives ci
                 LEFT JOIN characters c ON ci.character_id = c.character_id
                 WHERE ci.session_id = ? AND ci.is_active = 1
                 ORDER BY ci.initiative_roll DESC, ci.dexterity DESC, ci.entity_name ASC",
                [$sessionId]
            );
            
            // Get current turn
            $currentTurn = $db->selectOne(
                "SELECT current_initiative_id, round_number FROM combat_current_turn WHERE session_id = ?",
                [$sessionId]
            );
        }
    } catch (Exception $e) {
        // Tables don't exist - return empty initiative list
        error_log("Combat tables not found, returning empty initiative list: " . $e->getMessage());
        $initiatives = [];
        $currentTurn = null;
    }
    
    // Format initiative data
    $formattedInitiatives = array_map(function($init) use ($currentTurn) {
        return [
            'initiative_id' => (int) $init['initiative_id'],
            'character_id' => $init['character_id'] ? (int) $init['character_id'] : null,
            'entity_name' => $init['entity_name'],
            'entity_type' => $init['entity_type'],
            'initiative_roll' => (int) $init['initiative_roll'],
            'dexterity' => $init['dexterity'] ? (int) $init['dexterity'] : null,
            'is_current_turn' => $currentTurn && $currentTurn['current_initiative_id'] == $init['initiative_id'],
            'hp' => $init['current_hp'] && $init['max_hp'] ? [
                'current' => (int) $init['current_hp'],
                'max' => (int) $init['max_hp'],
                'percentage' => round(((int)$init['current_hp'] / (int)$init['max_hp']) * 100, 1)
            ] : null,
            'class' => $init['class'],
            'level' => $init['level'] ? (int) $init['level'] : null
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

