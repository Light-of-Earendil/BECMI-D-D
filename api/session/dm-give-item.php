<?php
/**
 * DM Give Item to Player
 * 
 * Allows DM to give items (including magical ones) to players during sessions
 * with custom properties like custom names, magical bonuses, etc.
 */

require_once __DIR__ . '/../../app/core/database.php';
require_once __DIR__ . '/../../app/core/security.php';
require_once __DIR__ . '/../../app/services/event-broadcaster.php';

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
    
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    $characterId = isset($input['character_id']) ? (int) $input['character_id'] : 0;
    $itemId = isset($input['item_id']) ? (int) $input['item_id'] : 0;
    $quantity = isset($input['quantity']) ? (int) $input['quantity'] : 1;
    $customName = isset($input['custom_name']) ? trim($input['custom_name']) : null;
    $isMagical = isset($input['is_magical']) ? (bool) $input['is_magical'] : false;
    $magicalBonus = isset($input['magical_bonus']) ? (int) $input['magical_bonus'] : 0;
    $notes = isset($input['notes']) ? trim($input['notes']) : null;
    $charges = isset($input['charges']) ? (int) $input['charges'] : null;
    $identified = isset($input['identified']) ? (bool) $input['identified'] : true;
    
    // Validation
    $errors = [];
    if ($sessionId <= 0) $errors['session_id'] = 'Valid session ID is required';
    if ($characterId <= 0) $errors['character_id'] = 'Valid character ID is required';
    if ($itemId <= 0) $errors['item_id'] = 'Valid item ID is required';
    if ($quantity < 1) $errors['quantity'] = 'Quantity must be at least 1';
    if ($magicalBonus < 0) $errors['magical_bonus'] = 'Magical bonus cannot be negative';
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = Database::getInstance();
    
    // Verify session exists and user is DM
    $session = $db->selectOne(
        "SELECT session_id, dm_user_id, session_title 
         FROM game_sessions 
         WHERE session_id = ? AND dm_user_id = ?",
        [$sessionId, $userId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found or you are not the DM', 404);
    }
    
    // Verify character belongs to session
    $character = $db->selectOne(
        "SELECT c.character_id, c.character_name, c.user_id, u.username
         FROM characters c
         JOIN users u ON c.user_id = u.user_id
         WHERE c.character_id = ? AND c.session_id = ? AND c.is_active = 1",
        [$characterId, $sessionId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found in this session', 404);
    }
    
    // Verify item exists
    $item = $db->selectOne(
        "SELECT item_id, name, description, weight_cn, cost_gp, item_type, 
                damage_die, damage_type, weapon_type, ac_bonus, armor_type,
                magical_bonus as base_magical_bonus, charges as base_charges,
                special_properties, magical_properties
         FROM items 
         WHERE item_id = ?",
        [$itemId]
    );
    
    if (!$item) {
        Security::sendErrorResponse('Item not found', 404);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Check if item already in character inventory
        $existingItem = $db->selectOne(
            "SELECT quantity, custom_name, charges_remaining, identified, attunement_status
             FROM character_inventory 
             WHERE character_id = ? AND item_id = ?",
            [$characterId, $itemId]
        );
        
        if ($existingItem) {
            // Update quantity for existing item
            $newQuantity = (int) $existingItem['quantity'] + $quantity;
            
            $db->execute(
                "UPDATE character_inventory 
                 SET quantity = ?, 
                     custom_name = COALESCE(?, custom_name),
                     charges_remaining = COALESCE(?, charges_remaining),
                     identified = ?,
                     notes = COALESCE(?, notes)
                 WHERE character_id = ? AND item_id = ?",
                [$newQuantity, $customName, $charges, $identified ? 1 : 0, $notes, $characterId, $itemId]
            );
            
            $action = 'updated';
            $message = "Updated {$quantity} {$item['name']} in {$character['character_name']}'s inventory (total: {$newQuantity})";
            
        } else {
            // Insert new item
            $db->execute(
                "INSERT INTO character_inventory 
                 (character_id, item_id, quantity, custom_name, identified, charges_remaining, notes, attunement_status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'none')",
                [$characterId, $itemId, $quantity, $customName, $identified ? 1 : 0, $charges, $notes]
            );
            
            $action = 'added';
            $message = "Added {$quantity} {$item['name']} to {$character['character_name']}'s inventory";
        }
        
        // Log the item gift in character changes
        $changeData = [
            'action' => $action,
            'item_name' => $item['name'],
            'quantity' => $quantity,
            'custom_name' => $customName,
            'is_magical' => $isMagical,
            'magical_bonus' => $magicalBonus,
            'charges' => $charges,
            'identified' => $identified,
            'notes' => $notes
        ];
        
        $db->execute(
            "INSERT INTO character_changes 
             (character_id, user_id, change_type, field_name, old_value, new_value, change_reason) 
             VALUES (?, ?, 'equipment', 'item_given', '', ?, ?)",
            [$characterId, $userId, json_encode($changeData), "DM gave item during session: {$session['session_title']}"]
        );
        
        // Commit transaction
        $db->commit();
        
        // Log security event
        Security::logSecurityEvent('dm_gave_item', [
            'session_id' => $sessionId,
            'character_id' => $characterId,
            'item_id' => $itemId,
            'quantity' => $quantity,
            'custom_name' => $customName,
            'is_magical' => $isMagical,
            'magical_bonus' => $magicalBonus
        ]);
        
        // Broadcast real-time event
        broadcastEvent($sessionId, 'item_given', [
            'character_id' => $characterId,
            'character_name' => $character['character_name'],
            'item_id' => $itemId,
            'item_name' => $customName ?: $item['name'],
            'quantity' => $quantity,
            'is_magical' => $isMagical
        ], $userId);
        
        // Get updated inventory for response
        $updatedInventory = $db->selectOne(
            "SELECT ci.*, i.name, i.description, i.weight_cn, i.cost_gp, i.item_type, 
                    i.damage_die, i.damage_type, i.ac_bonus, i.weapon_type, i.range_short, i.range_long,
                    i.magical_bonus as base_magical_bonus, i.special_properties, i.magical_properties
             FROM character_inventory ci 
             JOIN items i ON ci.item_id = i.item_id 
             WHERE ci.character_id = ? AND ci.item_id = ?
             ORDER BY ci.is_equipped DESC, i.item_type, i.name",
            [$characterId, $itemId]
        );
        
        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => [
                'session_id' => $sessionId,
                'character_id' => $characterId,
                'character_name' => $character['character_name'],
                'item' => $updatedInventory,
                'action' => $action,
                'change_logged' => true
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error in DM give item: " . $e->getMessage());
    Security::sendErrorResponse('Failed to give item: ' . $e->getMessage(), 500);
}
