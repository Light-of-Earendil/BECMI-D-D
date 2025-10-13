<?php
/**
 * Get equipment items grouped by category
 * 
 * Returns items organized by category for better UI organization
 * 
 * @return JSON Object with categorized items
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
    
    // Get all items
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
            stackable
        FROM items
        ORDER BY 
            FIELD(item_type, 'weapon', 'armor', 'shield', 'gear', 'consumable', 'treasure', 'mount', 'vehicle', 'ship', 'siege_weapon'),
            cost_gp ASC,
            name ASC
    ";
    
    $items = $db->select($query);
    
    // Group items by category
    $categorizedItems = [
        'weapons' => [
            'melee' => [],
            'ranged' => [],
            'ammunition' => []
        ],
        'armor' => [
            'armor' => [],
            'shields' => []
        ],
        'gear' => [
            'containers' => [],
            'light' => [],
            'tools' => [],
            'camping' => [],
            'food' => [],
            'miscellaneous' => [],
            'instruments' => []
        ],
        'mounts' => [],
        'vehicles' => [],
        'ships' => [],
        'siege_weapons' => []
    ];
    
    foreach ($items as $item) {
        // Format item data
        $formattedItem = [
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
            
            // Creature/vehicle properties
            'creature_type' => $item['creature_type'],
            'capacity_cn' => $item['capacity_cn'] ? (int)$item['capacity_cn'] : null,
            'movement_rate' => $item['movement_rate'] ? (int)$item['movement_rate'] : null,
            
            // Item properties
            'requires_proficiency' => (bool)$item['requires_proficiency'],
            'stackable' => (bool)$item['stackable']
        ];
        
        // Categorize items
        switch ($item['item_type']) {
            case 'weapon':
                if ($item['item_category'] === 'ammunition') {
                    $categorizedItems['weapons']['ammunition'][] = $formattedItem;
                } elseif ($item['weapon_type'] === 'ranged') {
                    $categorizedItems['weapons']['ranged'][] = $formattedItem;
                } else {
                    $categorizedItems['weapons']['melee'][] = $formattedItem;
                }
                break;
                
            case 'armor':
                $categorizedItems['armor']['armor'][] = $formattedItem;
                break;
                
            case 'shield':
                $categorizedItems['armor']['shields'][] = $formattedItem;
                break;
                
            case 'gear':
                switch ($item['item_category']) {
                    case 'container':
                        $categorizedItems['gear']['containers'][] = $formattedItem;
                        break;
                    case 'light':
                        $categorizedItems['gear']['light'][] = $formattedItem;
                        break;
                    case 'tool':
                        $categorizedItems['gear']['tools'][] = $formattedItem;
                        break;
                    case 'camping':
                        $categorizedItems['gear']['camping'][] = $formattedItem;
                        break;
                    case 'food':
                        $categorizedItems['gear']['food'][] = $formattedItem;
                        break;
                    case 'instrument':
                        $categorizedItems['gear']['instruments'][] = $formattedItem;
                        break;
                    default:
                        $categorizedItems['gear']['miscellaneous'][] = $formattedItem;
                        break;
                }
                break;
                
            case 'mount':
                $categorizedItems['mounts'][] = $formattedItem;
                break;
                
            case 'vehicle':
                $categorizedItems['vehicles'][] = $formattedItem;
                break;
                
            case 'ship':
                $categorizedItems['ships'][] = $formattedItem;
                break;
                
            case 'siege_weapon':
                $categorizedItems['siege_weapons'][] = $formattedItem;
                break;
                
            case 'consumable':
                if ($item['item_category'] === 'ammunition') {
                    $categorizedItems['weapons']['ammunition'][] = $formattedItem;
                } else {
                    $categorizedItems['gear']['food'][] = $formattedItem;
                }
                break;
                
            default:
                $categorizedItems['gear']['miscellaneous'][] = $formattedItem;
                break;
        }
    }
    
    // Add counts for each category
    $categoryCounts = [
        'weapons' => [
            'melee' => count($categorizedItems['weapons']['melee']),
            'ranged' => count($categorizedItems['weapons']['ranged']),
            'ammunition' => count($categorizedItems['weapons']['ammunition']),
            'total' => count($categorizedItems['weapons']['melee']) + count($categorizedItems['weapons']['ranged']) + count($categorizedItems['weapons']['ammunition'])
        ],
        'armor' => [
            'armor' => count($categorizedItems['armor']['armor']),
            'shields' => count($categorizedItems['armor']['shields']),
            'total' => count($categorizedItems['armor']['armor']) + count($categorizedItems['armor']['shields'])
        ],
        'gear' => [
            'containers' => count($categorizedItems['gear']['containers']),
            'light' => count($categorizedItems['gear']['light']),
            'tools' => count($categorizedItems['gear']['tools']),
            'camping' => count($categorizedItems['gear']['camping']),
            'food' => count($categorizedItems['gear']['food']),
            'miscellaneous' => count($categorizedItems['gear']['miscellaneous']),
            'instruments' => count($categorizedItems['gear']['instruments']),
            'total' => count($categorizedItems['gear']['containers']) + count($categorizedItems['gear']['light']) + count($categorizedItems['gear']['tools']) + count($categorizedItems['gear']['camping']) + count($categorizedItems['gear']['food']) + count($categorizedItems['gear']['miscellaneous']) + count($categorizedItems['gear']['instruments'])
        ],
        'mounts' => count($categorizedItems['mounts']),
        'vehicles' => count($categorizedItems['vehicles']),
        'ships' => count($categorizedItems['ships']),
        'siege_weapons' => count($categorizedItems['siege_weapons'])
    ];
    
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'items' => $categorizedItems,
            'counts' => $categoryCounts,
            'total_items' => count($items)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error fetching categorized items: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch categorized items'
    ]);
}
