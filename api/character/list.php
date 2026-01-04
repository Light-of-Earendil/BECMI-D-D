<?php
/**
 * BECMI D&D Character Manager - Character List Endpoint
 * 
 * Retrieves list of characters for the authenticated user.
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

// Set content type
header('Content-Type: application/json; charset=utf-8');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Check if session_id parameter is provided (for DM to see all characters in session)
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : null;
    $isDM = false;
    
    if ($sessionId && $sessionId > 0) {
        // Verify user is DM of this session
        $session = $db->selectOne(
            "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
            [$sessionId]
        );
        
        if ($session && $session['dm_user_id'] == $userId) {
            $isDM = true;
        }
    }
    
    // If DM and session_id provided, get ALL characters for that session
    if ($isDM) {
        $characters = $db->select(
            "SELECT c.character_id, c.character_name, c.class, c.level, c.current_hp, c.max_hp,
                    c.strength, c.dexterity, c.constitution, c.intelligence, c.wisdom, c.charisma,
                    c.alignment, c.gender, c.portrait_url, c.session_id, c.created_at, c.updated_at,
                    gs.session_title, gs.session_datetime, gs.status as session_status,
                    u.username as dm_username
             FROM characters c 
             LEFT JOIN game_sessions gs ON c.session_id = gs.session_id 
             LEFT JOIN users u ON gs.dm_user_id = u.user_id 
             WHERE c.session_id = ? AND c.is_active = 1 
             ORDER BY c.character_name ASC",
            [$sessionId]
        );
    } else {
        // Get user's own characters (including unassigned ones)
        $characters = $db->select(
            "SELECT c.character_id, c.character_name, c.class, c.level, c.current_hp, c.max_hp,
                    c.strength, c.dexterity, c.constitution, c.intelligence, c.wisdom, c.charisma,
                    c.alignment, c.gender, c.portrait_url, c.session_id, c.created_at, c.updated_at,
                    gs.session_title, gs.session_datetime, gs.status as session_status,
                    u.username as dm_username
             FROM characters c 
             LEFT JOIN game_sessions gs ON c.session_id = gs.session_id 
             LEFT JOIN users u ON gs.dm_user_id = u.user_id 
             WHERE c.user_id = ? AND c.is_active = 1 
             ORDER BY c.created_at DESC",
            [$userId]
        );
    }
    
    $allCharacters = $characters;
    
    // Add calculated fields for each character
    foreach ($allCharacters as &$character) {
        // Calculate basic derived stats
        $character['hp_percentage'] = $character['max_hp'] > 0 ? 
            round(($character['current_hp'] / $character['max_hp']) * 100) : 0;
        
        // Calculate ability score modifiers
        $character['strength_mod'] = getAbilityModifier($character['strength']);
        $character['dexterity_mod'] = getAbilityModifier($character['dexterity']);
        $character['constitution_mod'] = getAbilityModifier($character['constitution']);
        $character['intelligence_mod'] = getAbilityModifier($character['intelligence']);
        $character['wisdom_mod'] = getAbilityModifier($character['wisdom']);
        $character['charisma_mod'] = getAbilityModifier($character['charisma']);
        
        // Format session datetime
        if ($character['session_datetime']) {
            $character['session_datetime_formatted'] = date('M j, Y g:i A', strtotime($character['session_datetime']));
        }
        
        // Determine character status
        $character['status'] = getCharacterStatus($character);
    }
    
    // Sort characters by session datetime (upcoming first)
    usort($allCharacters, function($a, $b) {
        if ($a['session_datetime'] && $b['session_datetime']) {
            return strtotime($a['session_datetime']) - strtotime($b['session_datetime']);
        }
        return strtotime($a['created_at']) - strtotime($b['created_at']);
    });
    
    // Return success response
    Security::sendSuccessResponse([
        'characters' => $allCharacters,
        'total_count' => count($allCharacters)
    ], 'Character list retrieved successfully');
    
} catch (Exception $e) {
    error_log("Character list error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred while retrieving character list', 500);
}

/**
 * Get ability score modifier
 */
function getAbilityModifier($score) {
    $modifierTable = [
        3 => -3, 4 => -2, 5 => -2, 6 => -1, 7 => -1, 8 => -1, 9 => 0,
        10 => 0, 11 => 0, 12 => 0, 13 => 1, 14 => 1, 15 => 1, 16 => 2,
        17 => 2, 18 => 3
    ];
    
    return $modifierTable[$score] ?? 0;
}

/**
 * Determine character status
 */
function getCharacterStatus($character) {
    $now = time();
    $sessionTime = strtotime($character['session_datetime']);
    
    if (!$character['session_datetime']) {
        return 'no_session';
    }
    
    if ($character['session_status'] === 'completed') {
        return 'completed';
    }
    
    if ($character['session_status'] === 'cancelled') {
        return 'cancelled';
    }
    
    if ($sessionTime > $now) {
        $hoursUntil = ($sessionTime - $now) / 3600;
        if ($hoursUntil < 24) {
            return 'upcoming_soon';
        } else {
            return 'upcoming';
        }
    } else {
        return 'past';
    }
}
?>

