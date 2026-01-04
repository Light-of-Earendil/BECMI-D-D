<?php
/**
 * BECMI D&D Character Manager - Get Character Inventory
 * 
 * Returns all items in a character's inventory with equipment status.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get character ID
    $characterId = isset($_GET['character_id']) ? (int) $_GET['character_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID is required']);
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
        Security::sendErrorResponse('You do not have permission to view this inventory', 403);
    }
    
    // Get inventory with item details including new magical and extended fields
    $inventory = $db->select(
        "SELECT ci.character_id, ci.item_id, ci.quantity, ci.is_equipped, ci.equipped_slot,
                ci.notes, ci.acquired_at, ci.custom_name, ci.identified, ci.charges_remaining, ci.attunement_status,
                i.name, i.description, i.weight_cn, i.cost_gp, i.item_type, i.item_category,
                i.damage_die, i.damage_type, i.weapon_type, i.range_short, i.range_medium, i.range_long,
                i.ac_bonus, i.armor_type, i.is_magical, i.requires_proficiency,
                i.size_category, i.hands_required, i.ammunition_type, i.ammunition_capacity,
                i.special_properties, i.can_be_thrown, i.class_restrictions,
                i.magical_bonus, i.magical_properties, i.base_item_id, i.charges,
                i.creature_type, i.capacity_cn, i.movement_rate, i.image_url
         FROM character_inventory ci
         INNER JOIN items i ON ci.item_id = i.item_id
         WHERE ci.character_id = ?
         ORDER BY 
            CASE 
                WHEN ci.is_equipped = 1 THEN 0 
                ELSE 1 
            END,
            i.item_type,
            i.name",
        [$characterId]
    );
    
    // Format inventory data
    $formattedInventory = array_map(function($item) {
        return [
            'item_id' => (int) $item['item_id'],
            'name' => $item['name'],
            'description' => $item['description'],
            'quantity' => (int) $item['quantity'],
            'is_equipped' => (bool) $item['is_equipped'],
            'equipped_slot' => $item['equipped_slot'],
            'notes' => $item['notes'],
            'acquired_at' => $item['acquired_at'],
            
            // New inventory fields
            'custom_name' => $item['custom_name'],
            'identified' => (bool) $item['identified'],
            'charges_remaining' => (int) $item['charges_remaining'],
            'attunement_status' => $item['attunement_status'],
            
            // Item properties
            'item_type' => $item['item_type'],
            'item_category' => $item['item_category'],
            'weight_cn' => (int) $item['weight_cn'],
            'cost_gp' => (float) $item['cost_gp'],
            'total_weight_cn' => (int) $item['weight_cn'] * (int) $item['quantity'],
            
            // Weapon properties
            'damage_die' => $item['damage_die'],
            'damage_type' => $item['damage_type'],
            'weapon_type' => $item['weapon_type'],
            'range_short' => $item['range_short'] ? (int) $item['range_short'] : null,
            'range_medium' => $item['range_medium'] ? (int) $item['range_medium'] : null,
            'range_long' => $item['range_long'] ? (int) $item['range_long'] : null,
            
            // Armor properties
            'ac_bonus' => $item['ac_bonus'] ? (int) $item['ac_bonus'] : 0,
            'armor_type' => $item['armor_type'],
            
            // Extended properties
            'size_category' => $item['size_category'],
            'hands_required' => (int) $item['hands_required'],
            'ammunition_type' => $item['ammunition_type'],
            'ammunition_capacity' => (int) $item['ammunition_capacity'],
            'special_properties' => $item['special_properties'] ? json_decode($item['special_properties'], true) : null,
            'can_be_thrown' => (bool) $item['can_be_thrown'],
            'class_restrictions' => $item['class_restrictions'],
            
            // Magical properties
            'is_magical' => (bool) $item['is_magical'],
            'magical_bonus' => (int) $item['magical_bonus'],
            'magical_properties' => $item['magical_properties'] ? json_decode($item['magical_properties'], true) : null,
            'base_item_id' => (int) $item['base_item_id'],
            'charges' => (int) $item['charges'],
            
            // Creature/vehicle properties
            'creature_type' => $item['creature_type'],
            'capacity_cn' => (int) $item['capacity_cn'],
            'movement_rate' => (int) $item['movement_rate'],
            
            // Image
            'image_url' => $item['image_url'],
            
            // Legacy properties
            'requires_proficiency' => (bool) $item['requires_proficiency']
        ];
    }, $inventory);
    
    // Calculate total weight
    $totalWeight = array_reduce($formattedInventory, function($sum, $item) {
        return $sum + $item['total_weight_cn'];
    }, 0);
    
    // Count equipped items
    $equippedCount = count(array_filter($formattedInventory, function($item) {
        return $item['is_equipped'];
    }));
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'inventory' => $formattedInventory,
        'total_items' => count($formattedInventory),
        'total_weight_cn' => $totalWeight,
        'equipped_count' => $equippedCount
    ], 'Inventory retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get inventory error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to get inventory', 500);
}
?>

