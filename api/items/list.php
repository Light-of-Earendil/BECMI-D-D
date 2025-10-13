<?php
/**
 * Get all available equipment items
 * 
 * Returns comprehensive list of all equipment items from database
 * with all stats needed for character creation and shopping
 * 
 * @return JSON Array of all items
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
    
    // Get optional filters from query params
    $itemType = isset($_GET['item_type']) ? $_GET['item_type'] : null;
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    $magical = isset($_GET['magical']) ? $_GET['magical'] === 'true' : null;
    $size = isset($_GET['size']) ? $_GET['size'] : null;
    $sort = isset($_GET['sort']) ? $_GET['sort'] : 'cost';
    
    // Build query
    $query = "
        SELECT 
            item_id,
            name,
            image_url,
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
            stackable
        FROM items
        WHERE 1=1
    ";
    
    $params = [];
    
    // Apply filters
    if ($itemType) {
        $query .= " AND item_type = ?";
        $params[] = $itemType;
    }
    
    if ($category) {
        $query .= " AND item_category = ?";
        $params[] = $category;
    }
    
    if ($magical !== null) {
        $query .= " AND is_magical = ?";
        $params[] = $magical ? 1 : 0;
    }
    
    if ($size) {
        $query .= " AND size_category = ?";
        $params[] = $size;
    }
    
    // Apply sorting
    $orderBy = "FIELD(item_type, 'weapon', 'armor', 'shield', 'gear', 'consumable', 'treasure', 'mount', 'vehicle', 'ship', 'siege_weapon')";
    
    switch ($sort) {
        case 'name':
            $orderBy = "name ASC";
            break;
        case 'magical_bonus':
            $orderBy = "magical_bonus DESC, name ASC";
            break;
        case 'cost':
        default:
            $orderBy = "FIELD(item_type, 'weapon', 'armor', 'shield', 'gear', 'consumable', 'treasure', 'mount', 'vehicle', 'ship', 'siege_weapon'), cost_gp ASC, name ASC";
            break;
    }
    
    $query .= " ORDER BY " . $orderBy;
    
    $items = $db->select($query, $params);
    
    // Transform for frontend
    $formattedItems = array_map(function($item) {
        // Add category field for frontend compatibility
        $category = 'gear';
        if ($item['item_type'] === 'weapon') {
            $category = 'weapon';
        } elseif ($item['item_type'] === 'armor' || $item['item_type'] === 'shield') {
            $category = 'armor';
        } elseif ($item['item_type'] === 'consumable') {
            $category = 'consumable';
        } elseif ($item['item_type'] === 'treasure') {
            $category = 'treasure';
        }
        
        return [
            'item_id' => (int)$item['item_id'],
            'name' => $item['name'],
            'image_url' => $item['image_url'],
            'description' => $item['description'],
            'weight_cn' => (int)$item['weight_cn'],
            'cost_gp' => (float)$item['cost_gp'],
            'category' => $category,
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
            
            // Creature/vehicle properties
            'creature_type' => $item['creature_type'],
            'capacity_cn' => $item['capacity_cn'] ? (int)$item['capacity_cn'] : null,
            'movement_rate' => $item['movement_rate'] ? (int)$item['movement_rate'] : null,
            
            // Item properties
            'requires_proficiency' => (bool)$item['requires_proficiency'],
            'stackable' => (bool)$item['stackable']
        ];
    }, $items);
    
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'items' => $formattedItems,
            'count' => count($formattedItems)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error fetching items: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch items'
    ]);
}

