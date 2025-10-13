<?php
/**
 * BECMI D&D Character Manager - Equip/Unequip Item
 * 
 * Toggles equipment status for an item in character's inventory.
 * Handles equipment slots and unequips conflicting items.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

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
    $equip = isset($input['equip']) ? (bool) $input['equip'] : true;
    
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
    $db = getDB();
    
    // Verify character ownership
    $character = $db->selectOne(
        "SELECT user_id FROM characters WHERE character_id = ? AND is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    if ($character['user_id'] != $userId) {
        Security::sendErrorResponse('You do not own this character', 403);
    }
    
    // Get item from inventory
    $inventoryItem = $db->selectOne(
        "SELECT ci.*, i.item_type, i.name, i.weapon_type, i.armor_type
         FROM character_inventory ci
         INNER JOIN items i ON ci.item_id = i.item_id
         WHERE ci.character_id = ? AND ci.item_id = ?",
        [$characterId, $itemId]
    );
    
    if (!$inventoryItem) {
        Security::sendErrorResponse('Item not found in inventory', 404);
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        if ($equip) {
            // Determine equipment slot
            $slot = null;
            $itemType = $inventoryItem['item_type'];
            
            if ($itemType === 'weapon') {
                $slot = 'main_hand';
            } elseif ($itemType === 'armor') {
                $slot = 'armor';
            } elseif ($itemType === 'shield') {
                $slot = 'off_hand';
            }
            
            // Unequip any item in the same slot
            if ($slot) {
                $db->execute(
                    "UPDATE character_inventory 
                     SET is_equipped = 0, equipped_slot = NULL
                     WHERE character_id = ? AND equipped_slot = ?",
                    [$characterId, $slot]
                );
            }
            
            // Equip the item
            $db->execute(
                "UPDATE character_inventory 
                 SET is_equipped = 1, equipped_slot = ?
                 WHERE character_id = ? AND item_id = ?",
                [$slot, $characterId, $itemId]
            );
            
            $action = 'equipped';
            $message = $inventoryItem['name'] . ' equipped successfully';
            
        } else {
            // Unequip the item
            $db->execute(
                "UPDATE character_inventory 
                 SET is_equipped = 0, equipped_slot = NULL
                 WHERE character_id = ? AND item_id = ?",
                [$characterId, $itemId]
            );
            
            $action = 'unequipped';
            $message = $inventoryItem['name'] . ' unequipped successfully';
        }
        
        $db->commit();
        
        // Log security event
        Security::logSecurityEvent('item_' . $action, [
            'character_id' => $characterId,
            'item_id' => $itemId,
            'item_name' => $inventoryItem['name']
        ]);
        
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'item_id' => $itemId,
            'is_equipped' => $equip,
            'action' => $action
        ], $message);
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Equip item error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to equip/unequip item', 500);
}
?>

