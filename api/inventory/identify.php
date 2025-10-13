<?php
/**
 * Identify Magical Item
 * 
 * Allows characters to identify magical items (usually through spells or abilities)
 */

require_once __DIR__ . '/../../app/core/database.php';
require_once __DIR__ . '/../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

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
    $input = json_decode(file_get_contents('php://input'), true);
    
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    $itemId = isset($input['item_id']) ? (int) $input['item_id'] : 0;
    $identificationMethod = isset($input['method']) ? trim($input['method']) : 'spell'; // 'spell', 'detect_magic', 'legend_lore', etc.
    
    // Validation
    $errors = [];
    if ($characterId <= 0) $errors['character_id'] = 'Valid character ID is required';
    if ($itemId <= 0) $errors['item_id'] = 'Valid item ID is required';
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = Database::getInstance();
    
    // Verify character ownership
    $character = $db->selectOne(
        "SELECT character_id, character_name, user_id
         FROM characters 
         WHERE character_id = ? AND user_id = ? AND is_active = 1",
        [$characterId, $userId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found or access denied', 404);
    }
    
    // Verify item exists in character inventory
    $inventoryItem = $db->selectOne(
        "SELECT ci.*, i.name, i.description, i.is_magical, i.magical_bonus, 
                i.magical_properties, i.special_properties, i.charges
         FROM character_inventory ci
         JOIN items i ON ci.item_id = i.item_id
         WHERE ci.character_id = ? AND ci.item_id = ?",
        [$characterId, $itemId]
    );
    
    if (!$inventoryItem) {
        Security::sendErrorResponse('Item not found in character inventory', 404);
    }
    
    // Check if item is already identified
    if ($inventoryItem['identified']) {
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'Item is already identified',
            'data' => [
                'item' => $inventoryItem,
                'was_already_identified' => true
            ]
        ]);
        exit;
    }
    
    // Check if item is magical (only magical items need identification)
    if (!$inventoryItem['is_magical']) {
        Security::sendErrorResponse('Item is not magical and does not need identification', 400);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Mark item as identified
        $db->execute(
            "UPDATE character_inventory 
             SET identified = 1 
             WHERE character_id = ? AND item_id = ?",
            [$characterId, $itemId]
        );
        
        // Log the identification in character changes
        $changeData = [
            'identification_method' => $identificationMethod,
            'item_name' => $inventoryItem['name'],
            'magical_bonus' => $inventoryItem['magical_bonus'],
            'magical_properties' => $inventoryItem['magical_properties'],
            'special_properties' => $inventoryItem['special_properties']
        ];
        
        $db->execute(
            "INSERT INTO character_changes 
             (character_id, user_id, change_type, field_name, old_value, new_value, change_reason) 
             VALUES (?, ?, 'equipment', 'item_identified', 'unidentified', 'identified', ?)",
            [$characterId, $userId, "Item identified using {$identificationMethod}: " . json_encode($changeData)]
        );
        
        // Commit transaction
        $db->commit();
        
        // Log security event
        Security::logSecurityEvent('item_identified', [
            'character_id' => $characterId,
            'item_id' => $itemId,
            'identification_method' => $identificationMethod,
            'magical_bonus' => $inventoryItem['magical_bonus']
        ]);
        
        // Get updated item data
        $updatedItem = $db->selectOne(
            "SELECT ci.*, i.name, i.description, i.is_magical, i.magical_bonus, 
                    i.magical_properties, i.special_properties, i.charges,
                    i.damage_die, i.damage_type, i.weapon_type, i.ac_bonus, i.armor_type
             FROM character_inventory ci
             JOIN items i ON ci.item_id = i.item_id
             WHERE ci.character_id = ? AND ci.item_id = ?",
            [$characterId, $itemId]
        );
        
        // Parse magical properties for detailed response
        $magicalProperties = null;
        if ($updatedItem['magical_properties']) {
            $magicalProperties = json_decode($updatedItem['magical_properties'], true);
        }
        
        $specialProperties = null;
        if ($updatedItem['special_properties']) {
            $specialProperties = json_decode($updatedItem['special_properties'], true);
        }
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => "Successfully identified {$updatedItem['name']}",
            'data' => [
                'character_id' => $characterId,
                'character_name' => $character['character_name'],
                'item' => [
                    'item_id' => (int)$updatedItem['item_id'],
                    'name' => $updatedItem['name'],
                    'description' => $updatedItem['description'],
                    'custom_name' => $updatedItem['custom_name'],
                    'is_magical' => (bool)$updatedItem['is_magical'],
                    'magical_bonus' => (int)$updatedItem['magical_bonus'],
                    'magical_properties' => $magicalProperties,
                    'special_properties' => $specialProperties,
                    'charges' => $updatedItem['charges'] ? (int)$updatedItem['charges'] : null,
                    'charges_remaining' => $updatedItem['charges_remaining'] ? (int)$updatedItem['charges_remaining'] : null,
                    'identified' => true,
                    'attunement_status' => $updatedItem['attunement_status'],
                    'notes' => $updatedItem['notes']
                ],
                'identification_method' => $identificationMethod,
                'change_logged' => true
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error identifying item: " . $e->getMessage());
    Security::sendErrorResponse('Failed to identify item: ' . $e->getMessage(), 500);
}
