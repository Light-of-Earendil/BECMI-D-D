<?php
/**
 * BECMI D&D Character Manager - Character Update Endpoint
 * 
 * Handles character updates with field tracking and audit logging.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/becmi-rules.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow PUT requests
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $rawInput = file_get_contents('php://input');
    error_log("CHARACTER UPDATE - Raw input: " . substr($rawInput, 0, 500));
    
    $input = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("CHARACTER UPDATE - JSON decode error: " . json_last_error_msg());
        Security::sendErrorResponse('Invalid JSON input', 400);
    }
    
    // Validate character_id
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get existing character
    $existingCharacter = $db->selectOne(
        "SELECT * FROM characters WHERE character_id = ? AND is_active = 1",
        [$characterId]
    );
    
    if (!$existingCharacter) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Verify user owns this character OR is the DM
    $hasAccess = false;
    
    if ($existingCharacter['user_id'] == $userId) {
        $hasAccess = true;
    }
    
    // Check if user is DM of the session
    if (!$hasAccess) {
        $session = $db->selectOne(
            "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
            [$existingCharacter['session_id']]
        );
        
        if ($session && $session['dm_user_id'] == $userId) {
            $hasAccess = true;
        }
    }
    
    if (!$hasAccess) {
        Security::sendErrorResponse('Access denied - you do not own this character', 403);
    }
    
    // Sanitize input
    $updateData = Security::sanitizeInput($input);
    
    error_log("CHARACTER UPDATE - Character ID: $characterId");
    error_log("CHARACTER UPDATE - Update fields: " . implode(', ', array_keys($updateData)));
    
    // Track changes for audit log
    $changes = [];
    
    // Define updatable fields
    $simpleFields = [
        'character_name',
        'alignment',
        'gender',
        'age',
        'height',
        'weight',
        'hair_color',
        'eye_color',
        'background',
        'current_hp',
        'gold_pieces',
        'silver_pieces',
        'copper_pieces',
        'portrait_url'
    ];
    
    $abilityFields = [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma'
    ];
    
    $needsRecalculation = false;
    
    // Build UPDATE query dynamically based on provided fields
    $updateFields = [];
    $updateValues = [];
    
    // Process simple fields
    foreach ($simpleFields as $field) {
        if (isset($updateData[$field]) && $updateData[$field] !== $existingCharacter[$field]) {
            $updateFields[] = "$field = ?";
            $updateValues[] = $updateData[$field];
            
            $changes[] = [
                'field' => $field,
                'old' => $existingCharacter[$field],
                'new' => $updateData[$field]
            ];
            
            error_log("CHARACTER UPDATE - Field change: $field from '{$existingCharacter[$field]}' to '{$updateData[$field]}'");
        }
    }
    
    // Process ability scores (triggers recalculation)
    foreach ($abilityFields as $field) {
        if (isset($updateData[$field])) {
            $newValue = (int) $updateData[$field];
            
            // Validate ability score range
            if ($newValue < 3 || $newValue > 18) {
                Security::sendValidationErrorResponse([$field => 'Ability score must be between 3 and 18']);
            }
            
            if ($newValue !== (int) $existingCharacter[$field]) {
                $updateFields[] = "$field = ?";
                $updateValues[] = $newValue;
                
                $changes[] = [
                    'field' => $field,
                    'old' => $existingCharacter[$field],
                    'new' => $newValue
                ];
                
                $needsRecalculation = true;
                error_log("CHARACTER UPDATE - Ability score change: $field from {$existingCharacter[$field]} to $newValue (recalculation needed)");
            }
        }
    }
    
    // If no changes, return early
    if (empty($updateFields)) {
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'message' => 'No changes detected'
        ], 'Character already up to date');
    }
    
    // If ability scores changed, recalculate derived stats
    if ($needsRecalculation) {
        error_log("CHARACTER UPDATE - Recalculating derived stats...");
        
        // Merge updated values with existing character data
        $characterData = array_merge($existingCharacter, $updateData);
        
        // Calculate new derived statistics
        $calculatedStats = calculateCharacterStats($characterData, null);
        
        // Add derived stats to update
        $updateFields[] = "armor_class = ?";
        $updateValues[] = $calculatedStats['armor_class'];
        
        $updateFields[] = "thac0_melee = ?";
        $updateValues[] = $calculatedStats['thac0']['melee'];
        
        $updateFields[] = "thac0_ranged = ?";
        $updateValues[] = $calculatedStats['thac0']['ranged'];
        
        $updateFields[] = "movement_rate_normal = ?";
        $updateValues[] = $calculatedStats['movement']['normal'];
        
        $updateFields[] = "movement_rate_encounter = ?";
        $updateValues[] = $calculatedStats['movement']['encounter'];
        
        $updateFields[] = "encumbrance_status = ?";
        $updateValues[] = $calculatedStats['movement']['status'];
        
        $updateFields[] = "save_death_ray = ?";
        $updateValues[] = $calculatedStats['saving_throws']['death_ray'];
        
        $updateFields[] = "save_magic_wand = ?";
        $updateValues[] = $calculatedStats['saving_throws']['magic_wand'];
        
        $updateFields[] = "save_paralysis = ?";
        $updateValues[] = $calculatedStats['saving_throws']['paralysis'];
        
        $updateFields[] = "save_dragon_breath = ?";
        $updateValues[] = $calculatedStats['saving_throws']['dragon_breath'];
        
        $updateFields[] = "save_spells = ?";
        $updateValues[] = $calculatedStats['saving_throws']['spells'];
        
        // Update max HP if constitution changed
        if (isset($updateData['constitution']) && $updateData['constitution'] !== $existingCharacter['constitution']) {
            $updateFields[] = "max_hp = ?";
            $updateValues[] = $calculatedStats['max_hp'];
            
            error_log("CHARACTER UPDATE - Max HP recalculated: {$existingCharacter['max_hp']} -> {$calculatedStats['max_hp']}");
        }
    }
    
    // Add updated_at timestamp
    $updateFields[] = "updated_at = NOW()";
    
    // Add character_id for WHERE clause
    $updateValues[] = $characterId;
    
    // Build final UPDATE query
    $sql = "UPDATE characters SET " . implode(', ', $updateFields) . " WHERE character_id = ?";
    
    error_log("CHARACTER UPDATE - SQL: $sql");
    error_log("CHARACTER UPDATE - Values: " . json_encode($updateValues));
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Execute update
        $db->execute($sql, $updateValues);
        
        // Log each change
        foreach ($changes as $change) {
            $db->insert(
                "INSERT INTO character_changes (character_id, user_id, change_type, field_name, old_value, new_value, change_reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    $characterId,
                    $userId,
                    'other',
                    $change['field'],
                    $change['old'],
                    $change['new'],
                    'Character updated via edit interface'
                ]
            );
        }
        
        // Commit transaction
        $db->commit();
        
        error_log("CHARACTER UPDATE - Success! Updated " . count($changes) . " fields");
        
        // Get updated character
        $updatedCharacter = $db->selectOne(
            "SELECT * FROM characters WHERE character_id = ?",
            [$characterId]
        );
        
        // Log security event
        Security::logSecurityEvent('character_updated', [
            'character_id' => $characterId,
            'character_name' => $updatedCharacter['character_name'],
            'fields_changed' => count($changes),
            'recalculated' => $needsRecalculation
        ]);
        
        // Return success response
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'character' => $updatedCharacter,
            'fields_updated' => count($changes),
            'recalculated' => $needsRecalculation
        ], 'Character updated successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("=== CHARACTER UPDATE ERROR ===");
    error_log("Error message: " . $e->getMessage());
    error_log("Error code: " . $e->getCode());
    error_log("Error file: " . $e->getFile() . " (line " . $e->getLine() . ")");
    error_log("Stack trace: " . $e->getTraceAsString());
    error_log("=== END ERROR ===");
    
    Security::sendErrorResponse('Failed to update character: ' . $e->getMessage(), 500);
}

/**
 * Calculate character statistics
 */
function calculateCharacterStats($characterData, $inventory = null) {
    $stats = [];
    
    // Calculate hit points
    $stats['max_hp'] = BECMIRulesEngine::calculateHitPoints($characterData);
    
    // Calculate THAC0
    $stats['thac0'] = BECMIRulesEngine::calculateTHAC0($characterData);
    
    // Calculate movement rates
    $stats['movement'] = BECMIRulesEngine::calculateMovementRates($characterData);
    
    // Calculate saving throws
    $stats['saving_throws'] = BECMIRulesEngine::calculateSavingThrows($characterData);
    
    // Calculate armor class (with inventory data)
    $stats['armor_class'] = BECMIRulesEngine::calculateArmorClass($characterData, $inventory);
    
    return $stats;
}
?>

