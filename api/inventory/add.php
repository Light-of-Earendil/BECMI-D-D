<?php
/**
 * BECMI D&D Character Manager - Add Item to Inventory
 * 
 * Adds an item to character's inventory (for treasure, loot, purchases).
 * Note: Initial equipment is added during character creation.
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
    $quantity = isset($input['quantity']) ? (int) $input['quantity'] : 1;
    $notes = isset($input['notes']) ? trim($input['notes']) : null;
    
    // Validation
    $errors = [];
    if ($characterId <= 0) $errors['character_id'] = 'Valid character ID is required';
    if ($itemId <= 0) $errors['item_id'] = 'Valid item ID is required';
    if ($quantity < 1) $errors['quantity'] = 'Quantity must be at least 1';
    
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
    
    // Verify item exists
    $item = $db->selectOne(
        "SELECT item_id, name FROM items WHERE item_id = ?",
        [$itemId]
    );
    
    if (!$item) {
        Security::sendErrorResponse('Item not found', 404);
    }
    
    // Check if item already in inventory
    $existingItem = $db->selectOne(
        "SELECT quantity FROM character_inventory WHERE character_id = ? AND item_id = ?",
        [$characterId, $itemId]
    );
    
    if ($existingItem) {
        // Update quantity
        $newQuantity = (int) $existingItem['quantity'] + $quantity;
        
        $db->execute(
            "UPDATE character_inventory SET quantity = ? WHERE character_id = ? AND item_id = ?",
            [$newQuantity, $characterId, $itemId]
        );
        
        $message = "Added {$quantity} {$item['name']} to inventory (total: {$newQuantity})";
        
    } else {
        // Insert new item
        $db->insert(
            "INSERT INTO character_inventory (character_id, item_id, quantity, notes)
             VALUES (?, ?, ?, ?)",
            [$characterId, $itemId, $quantity, $notes]
        );
        
        $message = "Added {$quantity} {$item['name']} to inventory";
    }
    
    // Log security event
    Security::logSecurityEvent('item_added', [
        'character_id' => $characterId,
        'item_id' => $itemId,
        'item_name' => $item['name'],
        'quantity' => $quantity
    ]);
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'item_id' => $itemId,
        'quantity' => $quantity
    ], $message);
    
} catch (Exception $e) {
    error_log("Add item error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to add item to inventory', 500);
}
?>

