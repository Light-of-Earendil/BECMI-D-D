<?php
/**
 * BECMI D&D Character Manager - Remove Item from Inventory
 * 
 * Removes an item (or reduces quantity) from character's inventory.
 */

require_once '../app/core/database.php';
require_once '../app/core/security.php';

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
    $quantity = isset($input['quantity']) ? (int) $input['quantity'] : 1;
    $removeAll = isset($input['remove_all']) ? (bool) $input['remove_all'] : false;
    
    // Validation
    $errors = [];
    if ($characterId <= 0) $errors['character_id'] = 'Valid character ID is required';
    if ($itemId <= 0) $errors['item_id'] = 'Valid item ID is required';
    if ($quantity < 1 && !$removeAll) $errors['quantity'] = 'Quantity must be at least 1';
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify character ownership or DM access
    $character = $db->selectOne(
        "SELECT c.user_id, c.session_id, gs.dm_user_id
         FROM characters c
         LEFT JOIN game_sessions gs ON c.session_id = gs.session_id
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check if user owns character or is DM of the session
    $isOwner = $character['user_id'] == $userId;
    $isDM = $character['session_id'] && $character['dm_user_id'] == $userId;
    
    if (!$isOwner && !$isDM) {
        Security::sendErrorResponse('You do not have permission to modify this inventory', 403);
    }
    
    // Get item from inventory
    $inventoryItem = $db->selectOne(
        "SELECT ci.quantity, i.name
         FROM character_inventory ci
         INNER JOIN items i ON ci.item_id = i.item_id
         WHERE ci.character_id = ? AND ci.item_id = ?",
        [$characterId, $itemId]
    );
    
    if (!$inventoryItem) {
        Security::sendErrorResponse('Item not found in inventory', 404);
    }
    
    $currentQuantity = (int) $inventoryItem['quantity'];
    
    if ($removeAll || $quantity >= $currentQuantity) {
        // Remove item completely
        $db->execute(
            "DELETE FROM character_inventory WHERE character_id = ? AND item_id = ?",
            [$characterId, $itemId]
        );
        
        $message = "Removed all {$inventoryItem['name']} from inventory";
        $remainingQuantity = 0;
        
    } else {
        // Reduce quantity
        $newQuantity = $currentQuantity - $quantity;
        
        $db->execute(
            "UPDATE character_inventory SET quantity = ? WHERE character_id = ? AND item_id = ?",
            [$newQuantity, $characterId, $itemId]
        );
        
        $message = "Removed {$quantity} {$inventoryItem['name']} (remaining: {$newQuantity})";
        $remainingQuantity = $newQuantity;
    }
    
    // Log security event
    Security::logSecurityEvent('item_removed', [
        'character_id' => $characterId,
        'item_id' => $itemId,
        'item_name' => $inventoryItem['name'],
        'quantity_removed' => $removeAll ? $currentQuantity : $quantity
    ]);
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'item_id' => $itemId,
        'quantity_removed' => $removeAll ? $currentQuantity : $quantity,
        'remaining_quantity' => $remainingQuantity
    ], $message);
    
} catch (Exception $e) {
    error_log("Remove item error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to remove item from inventory', 500);
}
?>

