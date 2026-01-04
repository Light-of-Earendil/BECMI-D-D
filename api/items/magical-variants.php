<?php
/**
 * Get magical variants of a base item
 * 
 * Returns all magical versions of a base weapon/item
 * 
 * @return JSON Array of magical variants
 */

require_once __DIR__ . '/../../app/core/database.php';
require_once __DIR__ . '/../../app/core/security.php';

header('Content-Type: application/json');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed'
    ]);
    exit;
}

try {
    $db = Database::getInstance();
    
    // Get base_item_id from query params
    $baseItemId = isset($_GET['base_item_id']) ? (int)$_GET['base_item_id'] : 0;
    $baseItemName = isset($_GET['base_item_name']) ? trim($_GET['base_item_name']) : '';
    
    if ($baseItemId <= 0 && empty($baseItemName)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'base_item_id or base_item_name parameter is required'
        ]);
        exit;
    }
    
    // Build query
    $query = "
        SELECT 
            item_id,
            name,
            description,
            weight_cn,
            cost_gp,
            item_type,
            item_category,
            size_category,
            damage_die,
            damage_type,
            weapon_type,
            range_short,
            range_medium,
            range_long,
            hands_required,
            ammunition_type,
            ammunition_capacity,
            special_properties,
            can_be_thrown,
            class_restrictions,
            magical_bonus,
            magical_properties,
            base_item_id,
            charges,
            creature_type,
            capacity_cn,
            movement_rate,
            ac_bonus,
            armor_type,
            is_magical,
            requires_proficiency,
            stackable,
            image_url
        FROM items
        WHERE is_magical = 1
    ";
    
    $params = [];
    
    if ($baseItemId > 0) {
        $query .= " AND base_item_id = ?";
        $params[] = $baseItemId;
    } elseif (!empty($baseItemName)) {
        // Find base item by name first
        $baseItemQuery = "SELECT item_id FROM items WHERE name = ? AND is_magical = 0";
        $baseItem = $db->selectOne($baseItemQuery, [$baseItemName]);
        
        if (!$baseItem) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Base item not found: ' . $baseItemName
            ]);
            exit;
        }
        
        $query .= " AND base_item_id = ?";
        $params[] = $baseItem['item_id'];
    }
    
    $query .= " ORDER BY magical_bonus ASC, name ASC";
    
    $items = $db->select($query, $params);
    
    // Also get the base item for reference
    $baseItemQuery = "SELECT item_id, name, description, weight_cn, cost_gp, item_type, item_category, size_category, damage_die, damage_type, weapon_type, range_short, range_medium, range_long, hands_required, ammunition_type, ammunition_capacity, can_be_thrown, ac_bonus, armor_type, is_magical, requires_proficiency, stackable, magical_bonus, magical_properties, base_item_id, charges, special_properties, class_restrictions, image_url, creature_type, capacity_cn, movement_rate, created_at, updated_at FROM items WHERE item_id = ?";
    $baseItem = $db->selectOne($baseItemQuery, [$params[0]]);
    
    // Transform for frontend
    $formattedItems = array_map(function($item) {
        return [
            'item_id' => (int)$item['item_id'],
            'name' => $item['name'],
            'description' => $item['description'],
            'weight_cn' => (int)$item['weight_cn'],
            'cost_gp' => (float)$item['cost_gp'],
            'item_type' => $item['item_type'],
            'item_category' => $item['item_category'],
            'size_category' => $item['size_category'],
            
            // Weapon properties
            'damage_die' => $item['damage_die'],
            'damage_type' => $item['damage_type'],
            'weapon_type' => $item['weapon_type'],
            'range_short' => $item['range_short'] ? (int)$item['range_short'] : null,
            'range_medium' => $item['range_medium'] ? (int)$item['range_medium'] : null,
            'range_long' => $item['range_long'] ? (int)$item['range_long'] : null,
            'hands_required' => $item['hands_required'] ? (int)$item['hands_required'] : null,
            'ammunition_type' => $item['ammunition_type'],
            'ammunition_capacity' => $item['ammunition_capacity'] ? (int)$item['ammunition_capacity'] : null,
            'can_be_thrown' => (bool)$item['can_be_thrown'],
            
            // Armor properties
            'ac_bonus' => $item['ac_bonus'] ? (int)$item['ac_bonus'] : null,
            'armor_type' => $item['armor_type'],
            
            // Magical properties
            'is_magical' => (bool)$item['is_magical'],
            'magical_bonus' => $item['magical_bonus'] ? (int)$item['magical_bonus'] : 0,
            'magical_properties' => $item['magical_properties'] ? json_decode($item['magical_properties'], true) : null,
            'base_item_id' => $item['base_item_id'] ? (int)$item['base_item_id'] : null,
            'charges' => $item['charges'] ? (int)$item['charges'] : null,
            
            // Special properties
            'special_properties' => $item['special_properties'] ? json_decode($item['special_properties'], true) : null,
            'class_restrictions' => $item['class_restrictions'] ? json_decode($item['class_restrictions'], true) : null,
            
            // Image
            'image_url' => $item['image_url'],
            
            // Creature/vehicle properties
            'creature_type' => $item['creature_type'],
            'capacity_cn' => $item['capacity_cn'] ? (int)$item['capacity_cn'] : null,
            'movement_rate' => $item['movement_rate'] ? (int)$item['movement_rate'] : null,
            
            // Item properties
            'requires_proficiency' => (bool)$item['requires_proficiency'],
            'stackable' => (bool)$item['stackable']
        ];
    }, $items);
    
    // Format base item
    $formattedBaseItem = null;
    if ($baseItem) {
        $formattedBaseItem = [
            'item_id' => (int)$baseItem['item_id'],
            'name' => $baseItem['name'],
            'description' => $baseItem['description'],
            'weight_cn' => (int)$baseItem['weight_cn'],
            'cost_gp' => (float)$baseItem['cost_gp'],
            'item_type' => $baseItem['item_type'],
            'item_category' => $baseItem['item_category'],
            'size_category' => $baseItem['size_category'],
            
            // Weapon properties
            'damage_die' => $baseItem['damage_die'],
            'damage_type' => $baseItem['damage_type'],
            'weapon_type' => $baseItem['weapon_type'],
            'range_short' => $baseItem['range_short'] ? (int)$baseItem['range_short'] : null,
            'range_medium' => $baseItem['range_medium'] ? (int)$baseItem['range_medium'] : null,
            'range_long' => $baseItem['range_long'] ? (int)$baseItem['range_long'] : null,
            'hands_required' => $baseItem['hands_required'] ? (int)$baseItem['hands_required'] : null,
            'ammunition_type' => $baseItem['ammunition_type'],
            'ammunition_capacity' => $baseItem['ammunition_capacity'] ? (int)$baseItem['ammunition_capacity'] : null,
            'can_be_thrown' => (bool)$baseItem['can_be_thrown'],
            
            // Armor properties
            'ac_bonus' => $baseItem['ac_bonus'] ? (int)$baseItem['ac_bonus'] : null,
            'armor_type' => $baseItem['armor_type'],
            
            // Magical properties
            'is_magical' => (bool)$baseItem['is_magical'],
            'magical_bonus' => 0,
            'magical_properties' => null,
            'base_item_id' => null,
            'charges' => $baseItem['charges'] ? (int)$baseItem['charges'] : null,
            
            // Special properties
            'special_properties' => $baseItem['special_properties'] ? json_decode($baseItem['special_properties'], true) : null,
            'class_restrictions' => $baseItem['class_restrictions'] ? json_decode($baseItem['class_restrictions'], true) : null,
            
            // Creature/vehicle properties
            'creature_type' => $baseItem['creature_type'],
            'capacity_cn' => $baseItem['capacity_cn'] ? (int)$baseItem['capacity_cn'] : null,
            'movement_rate' => $baseItem['movement_rate'] ? (int)$baseItem['movement_rate'] : null,
            
            // Image
            'image_url' => $baseItem['image_url'],
            
            // Item properties
            'requires_proficiency' => (bool)$baseItem['requires_proficiency'],
            'stackable' => (bool)$baseItem['stackable']
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'base_item' => $formattedBaseItem,
            'magical_variants' => $formattedItems,
            'count' => count($formattedItems)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error fetching magical variants: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch magical variants'
    ]);
}
