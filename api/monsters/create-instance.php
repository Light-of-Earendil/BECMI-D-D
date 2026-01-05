<?php
/**
 * BECMI D&D Character Manager - Create Monster Instance
 * 
 * Creates a monster instance based on a monster type template.
 * Handles HP calculation from Hit Dice, auto-naming, and bulk creation.
 */

// Disable error display to prevent warnings/notices from corrupting JSON
@ini_set('display_errors', 0);
@error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);

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
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    require_once '../../app/core/constants.php';
    $monsterId = isset($input['monster_id']) ? (int) $input['monster_id'] : 0;
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    $count = isset($input['count']) ? max(1, min(MAX_BULK_CREATE_COUNT, (int) $input['count'])) : 1; // Bulk creation
    
    if ($monsterId <= 0) {
        Security::sendValidationErrorResponse(['monster_id' => 'Valid monster ID is required']);
    }
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify user is DM
    $session = $db->selectOne(
        "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the DM can create monster instances', 403);
    }
    
    // Get monster template
    $monster = $db->selectOne(
        "SELECT monster_id, name, armor_class, hit_dice, move_ground, move_flying, move_swimming, 
                attacks, damage, no_appearing, save_as, morale, treasure_type, intelligence, 
                alignment, xp_value, description, image_url, monster_type, terrain, load, 
                created_at, updated_at 
         FROM monsters WHERE monster_id = ?",
        [$monsterId]
    );
    
    if (!$monster) {
        Security::sendErrorResponse('Monster type not found', 404);
    }
    
    // Calculate HP from Hit Dice
    function calculateHPFromHitDice($hitDice) {
        // Parse Hit Dice string (e.g., "3*", "11****", "8***", "1+1")
        // Remove asterisks and extract number
        $hdString = preg_replace('/[^0-9+]/', '', $hitDice);
        
        // Handle formats like "1+1" (1d8+1)
        if (strpos($hdString, '+') !== false) {
            $parts = explode('+', $hdString, 2);
            $dice = isset($parts[0]) ? (int) $parts[0] : 1;
            $modifier = isset($parts[1]) ? (int) $parts[1] : 0;
            if ($dice <= 0) {
                $dice = 1;
            }
            return rand($dice, $dice * 8) + $modifier;
        }
        
        // Standard format: just number (e.g., "3" = 3d8)
        $dice = (int) $hdString;
        if ($dice <= 0) {
            $dice = 1; // Minimum 1 HP
        }
        
        // Roll HP: 1d8 per Hit Die
        return rand($dice, $dice * 8);
    }
    
    $baseHP = calculateHPFromHitDice($monster['hit_dice']);
    $customHP = isset($input['custom_hp']) ? max(1, (int) $input['custom_hp']) : null;
    $hp = $customHP ?: $baseHP;
    
    $isNamedBoss = isset($input['is_named_boss']) ? (bool) $input['is_named_boss'] : false;
    $instanceName = isset($input['instance_name']) ? trim($input['instance_name']) : '';
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        $createdInstances = [];
        
        for ($i = 0; $i < $count; $i++) {
            // Determine instance name
            if ($isNamedBoss && $count === 1) {
                // Named boss - use provided name
                if (empty($instanceName)) {
                    throw new Exception('Instance name is required for named boss monsters');
                }
                $finalName = $instanceName;
            } else {
                // Generic instance - auto-generate name
                if (empty($instanceName)) {
                    // Find next number for this monster type in this session
                    $existingCount = $db->selectOne(
                        "SELECT COUNT(*) as count FROM monster_instances 
                         WHERE session_id = ? AND monster_id = ? AND is_named_boss = FALSE",
                        [$sessionId, $monsterId]
                    )['count'];
                    
                    $finalName = $monster['name'] . ' #' . ($existingCount + $i + 1);
                } else {
                    $finalName = $count > 1 ? $instanceName . ' #' . ($i + 1) : $instanceName;
                }
            }
            
            // Create instance
            $instanceId = $db->insert(
                "INSERT INTO monster_instances 
                 (session_id, monster_id, instance_name, is_named_boss, current_hp, max_hp, 
                  armor_class, dexterity, equipment, treasure, spells, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $sessionId,
                    $monsterId,
                    $finalName,
                    $isNamedBoss && $count === 1 ? 1 : 0, // Only first instance can be named boss if count > 1
                    $hp,
                    $hp,
                    $monster['armor_class'],
                    null, // Dexterity can be set later
                    isset($input['equipment']) ? json_encode($input['equipment']) : null,
                    isset($input['treasure']) ? json_encode($input['treasure']) : null,
                    isset($input['spells']) ? json_encode($input['spells']) : null,
                    isset($input['notes']) ? $input['notes'] : null
                ]
            );
            
            $createdInstances[] = [
                'instance_id' => $instanceId,
                'instance_name' => $finalName,
                'monster_id' => $monsterId,
                'monster_name' => $monster['name'],
                'current_hp' => $hp,
                'max_hp' => $hp,
                'is_named_boss' => $isNamedBoss && $count === 1
            ];
        }
        
        $db->commit();
        
        // Log security event
        Security::logSecurityEvent('monster_instances_created', [
            'session_id' => $sessionId,
            'monster_id' => $monsterId,
            'count' => $count
        ]);
        
        // Clear any output before sending response
        while (ob_get_level()) {
            @ob_end_clean();
        }
        
        Security::sendSuccessResponse([
            'instances' => $createdInstances,
            'count' => count($createdInstances)
        ], 'Monster instance(s) created successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Clear any output before sending error response
    while (ob_get_level()) {
        @ob_end_clean();
    }
    
    error_log("Create monster instance error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to create monster instance: ' . $e->getMessage(), 500);
}
?>
