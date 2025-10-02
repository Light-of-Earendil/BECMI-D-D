<?php
/**
 * Get all available equipment items
 * 
 * Returns comprehensive list of all equipment items from database
 * with all stats needed for character creation and shopping
 * 
 * @return JSON Array of all items
 */

require_once __DIR__ . '/../config.php';
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
    $db = new Database();
    
    // Get optional filters from query params
    $itemType = isset($_GET['item_type']) ? $_GET['item_type'] : null;
    $category = isset($_GET['category']) ? $_GET['category'] : null;
    
    // Build query
    $query = "
        SELECT 
            item_id,
            name,
            description,
            weight_cn,
            cost_gp,
            item_type,
            damage_die,
            damage_type,
            weapon_type,
            range_short,
            range_long,
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
    
    $query .= " ORDER BY 
        FIELD(item_type, 'weapon', 'armor', 'shield', 'gear', 'consumable', 'treasure'),
        cost_gp ASC,
        name ASC
    ";
    
    $items = $db->query($query, $params);
    
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
            'description' => $item['description'],
            'weight_cn' => (int)$item['weight_cn'],
            'cost_gp' => (float)$item['cost_gp'],
            'category' => $category,
            'item_type' => $item['item_type'],
            
            // Weapon properties
            'damage_die' => $item['damage_die'],
            'damage_type' => $item['damage_type'],
            'weapon_type' => $item['weapon_type'],
            'range_short' => $item['range_short'] ? (int)$item['range_short'] : null,
            'range_long' => $item['range_long'] ? (int)$item['range_long'] : null,
            
            // Armor properties
            'ac_bonus' => $item['ac_bonus'] ? (int)$item['ac_bonus'] : null,
            'armor_type' => $item['armor_type'],
            
            // Item properties
            'is_magical' => (bool)$item['is_magical'],
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

