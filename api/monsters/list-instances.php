<?php
/**
 * BECMI D&D Character Manager - List Monster Instances for Session
 * 
 * Returns all monster instances for a session with monster type info.
 */

// Start output buffering immediately to catch any stray output
ob_start();

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (including the one we just started)
while (ob_get_level()) {
    @ob_end_clean();
}

// Initialize security
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
    
    // Verify user has access (DM or accepted player)
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    $isDM = ($session['dm_user_id'] == $userId);
    
    if (!$isDM) {
        $playerStatus = $db->selectOne(
            "SELECT status FROM session_players 
             WHERE session_id = ? AND user_id = ?",
            [$sessionId, $userId]
        );
        
        if (!$playerStatus || $playerStatus['status'] !== 'accepted') {
            Security::sendErrorResponse('You do not have permission to view monster instances for this session', 403);
        }
    }
    
    // Get monster instances
    $instances = $db->select(
        "SELECT mi.*, m.name as monster_name, m.armor_class as template_ac, m.hit_dice,
                m.attacks, m.damage, m.save_as, m.morale, m.treasure_type, m.intelligence,
                m.alignment, m.xp_value, m.description, m.image_url, m.monster_type, m.terrain
         FROM monster_instances mi
         JOIN monsters m ON mi.monster_id = m.monster_id
         WHERE mi.session_id = ? AND mi.is_active = 1
         ORDER BY mi.is_named_boss DESC, mi.instance_name ASC",
        [$sessionId]
    );
    
    // Format instances
    $formattedInstances = array_map(function($instance) {
        return [
            'instance_id' => (int) $instance['instance_id'],
            'monster_id' => (int) $instance['monster_id'],
            'monster_name' => $instance['monster_name'],
            'instance_name' => $instance['instance_name'],
            'is_named_boss' => (bool) $instance['is_named_boss'],
            'current_hp' => (int) $instance['current_hp'],
            'max_hp' => (int) $instance['max_hp'],
            'armor_class' => $instance['armor_class'] ? (int) $instance['armor_class'] : (int) $instance['template_ac'],
            'dexterity' => $instance['dexterity'] ? (int) $instance['dexterity'] : null,
            'equipment' => $instance['equipment'] ? json_decode($instance['equipment'], true) : [],
            'treasure' => $instance['treasure'] ? json_decode($instance['treasure'], true) : [],
            'spells' => $instance['spells'] ? json_decode($instance['spells'], true) : [],
            'notes' => $instance['notes'],
            'image_url' => $instance['image_url'],
            'monster_stats' => [
                'hit_dice' => $instance['hit_dice'],
                'attacks' => $instance['attacks'],
                'damage' => $instance['damage'],
                'save_as' => $instance['save_as'],
                'morale' => (int) $instance['morale'],
                'treasure_type' => $instance['treasure_type'],
                'intelligence' => (int) $instance['intelligence'],
                'alignment' => $instance['alignment'],
                'xp_value' => (int) $instance['xp_value'],
                'monster_type' => $instance['monster_type'],
                'terrain' => $instance['terrain']
            ]
        ];
    }, $instances);
    
    Security::sendSuccessResponse([
        'instances' => $formattedInstances,
        'total_count' => count($formattedInstances)
    ], 'Monster instances retrieved successfully');
    
} catch (Exception $e) {
    error_log("List monster instances error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to retrieve monster instances', 500);
}
?>
