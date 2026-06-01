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
                alignment, xp_value, description, image_url, monster_type, terrain, `load`, 
                created_at, updated_at 
         FROM monsters WHERE monster_id = ?",
        [$monsterId]
    );
    
    if (!$monster) {
        Security::sendErrorResponse('Monster type not found', 404);
    }
    
    function parseHitDiceSpec($hitDice) {
        $raw = trim((string) $hitDice);
        $lowered = strtolower($raw);

        if ($raw === '') {
            return ['kind' => 'unknown', 'label' => '-', 'note' => 'HD missing'];
        }

        if (strpos($lowered, 'special') !== false) {
            return ['kind' => 'special', 'label' => $raw, 'note' => 'HD is marked as Special'];
        }

        if (strpos($lowered, 'som levende') !== false) {
            return ['kind' => 'special', 'label' => $raw, 'note' => "HD is 'same as living' and needs manual clarification"];
        }

        $normalizedSafe = str_replace(
            [' ', '*', '(', ')'],
            ['', '', '', ''],
            $lowered
        );

        $normalizedSafe = preg_replace('/[\x{2013}\x{2014}]/u', '-', $normalizedSafe);
        $normalizedSafe = str_replace("\u{00BD}", '1/2', $normalizedSafe);

        if ($normalizedSafe === '1hp') {
            return ['kind' => 'fixed', 'label' => $raw, 'value' => 1];
        }

        if ($normalizedSafe === '1-1') {
            return ['kind' => 'dice', 'label' => $raw, 'dice_count' => 1, 'bonus' => -1];
        }

        if (preg_match('/^1\/2(?:\+(\d+))?$/', $normalizedSafe, $matches)) {
            return [
                'kind' => 'half',
                'label' => $raw,
                'bonus' => isset($matches[1]) ? (int) $matches[1] : 0
            ];
        }

        if (preg_match('/^(\d+)\/(\d+)\/(\d+)(?:\+(\d+))?$/', $normalizedSafe, $matches)) {
            return [
                'kind' => 'options',
                'label' => $raw,
                'options' => [(int) $matches[1], (int) $matches[2], (int) $matches[3]],
                'bonus' => isset($matches[4]) ? (int) $matches[4] : 0
            ];
        }

        if (preg_match('/^(\d+)\/(\d+)(?:\+(\d+))?$/', $normalizedSafe, $matches)) {
            return [
                'kind' => 'options',
                'label' => $raw,
                'options' => [(int) $matches[1], (int) $matches[2]],
                'bonus' => isset($matches[3]) ? (int) $matches[3] : 0
            ];
        }

        if (preg_match('/^(\d+)-(\d+)(?:\+(\d+))?$/', $normalizedSafe, $matches)) {
            $min = (int) $matches[1];
            $max = (int) $matches[2];
            if ($min <= $max) {
                return [
                    'kind' => 'range',
                    'label' => $raw,
                    'min' => $min,
                    'max' => $max,
                    'bonus' => isset($matches[3]) ? (int) $matches[3] : 0
                ];
            }
        }

        if (preg_match('/^(\d+)\+(\d+)$/', $normalizedSafe, $matches)) {
            return [
                'kind' => 'dice',
                'label' => $raw,
                'dice_count' => (int) $matches[1],
                'bonus' => (int) $matches[2]
            ];
        }

        if (preg_match('/^(\d+)$/', $normalizedSafe, $matches)) {
            return [
                'kind' => 'dice',
                'label' => $raw,
                'dice_count' => (int) $matches[1],
                'bonus' => 0
            ];
        }

        if (preg_match('/\d+/', $normalizedSafe, $matches)) {
            return [
                'kind' => 'dice',
                'label' => $raw,
                'dice_count' => (int) $matches[0],
                'bonus' => 0,
                'note' => 'Partial HD parse'
            ];
        }

        return ['kind' => 'unknown', 'label' => $raw, 'note' => 'Could not parse HD format'];
    }

    function rollDiceTotal($count, $sides) {
        $total = 0;
        for ($i = 0; $i < $count; $i++) {
            $total += random_int(1, $sides);
        }
        return $total;
    }

    function rollMonsterHPFromSpec(array $spec) {
        if ($spec['kind'] === 'special' || $spec['kind'] === 'unknown') {
            return [
                'hp' => null,
                'formula' => $spec['label'] ?? '-',
                'note' => $spec['note'] ?? 'Unknown HD'
            ];
        }

        if ($spec['kind'] === 'fixed') {
            return [
                'hp' => (int) $spec['value'],
                'formula' => (string) $spec['value'],
                'note' => $spec['note'] ?? ''
            ];
        }

        if ($spec['kind'] === 'half') {
            $bonus = isset($spec['bonus']) ? (int) $spec['bonus'] : 0;
            $total = max(1, random_int(1, 4) + $bonus);
            return [
                'hp' => $total,
                'formula' => '1d4' . ($bonus > 0 ? '+' . $bonus : ($bonus < 0 ? (string) $bonus : '')),
                'note' => $spec['note'] ?? ''
            ];
        }

        $diceCount = 0;
        if ($spec['kind'] === 'dice') {
            $diceCount = (int) ($spec['dice_count'] ?? 0);
        } elseif ($spec['kind'] === 'range') {
            $diceCount = random_int((int) $spec['min'], (int) $spec['max']);
        } elseif ($spec['kind'] === 'options') {
            $options = $spec['options'] ?? [];
            if (!empty($options)) {
                $diceCount = (int) $options[array_rand($options)];
            }
        }

        if ($diceCount <= 0) {
            return [
                'hp' => null,
                'formula' => $spec['label'] ?? '-',
                'note' => 'Invalid HD count'
            ];
        }

        $bonus = isset($spec['bonus']) ? (int) $spec['bonus'] : 0;
        $total = max(1, rollDiceTotal($diceCount, 8) + $bonus);
        return [
            'hp' => $total,
            'formula' => $diceCount . 'd8' . ($bonus > 0 ? '+' . $bonus : ($bonus < 0 ? (string) $bonus : '')),
            'note' => $spec['note'] ?? ''
        ];
    }

    $hpSpec = parseHitDiceSpec($monster['hit_dice']);
    $customHP = (isset($input['custom_hp']) && $input['custom_hp'] !== null && $input['custom_hp'] !== '')
        ? max(1, (int) $input['custom_hp'])
        : null;

    if ($customHP === null && in_array($hpSpec['kind'], ['special', 'unknown'], true)) {
        Security::sendValidationErrorResponse([
            'custom_hp' => 'This monster has a special Hit Dice format. Enter HP manually for this instance.'
        ]);
    }
    
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
            
            $hpRoll = $customHP !== null
                ? ['hp' => $customHP, 'formula' => 'custom', 'note' => '']
                : rollMonsterHPFromSpec($hpSpec);

            if (!isset($hpRoll['hp']) || $hpRoll['hp'] === null || (int) $hpRoll['hp'] < 1) {
                throw new Exception('Could not determine monster HP from Hit Dice. Please enter custom HP.');
            }

            $hp = (int) $hpRoll['hp'];

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
                'hp_formula' => $hpRoll['formula'],
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
