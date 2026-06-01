<?php
/**
 * Get all available equipment items
 * 
 * Returns comprehensive list of all equipment items from database
 * with all stats needed for character creation and shopping
 * 
 * @return JSON Array of all items
 */

// Start output buffering immediately to catch any stray output
ob_start();

require_once __DIR__ . '/../../app/core/database.php';
require_once __DIR__ . '/../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (including the one we just started)
while (ob_get_level()) {
    ob_end_clean();
}

// Initialize security (but don't require authentication for public items list)
Security::init();

// Set headers after clearing buffers
header('Content-Type: application/json; charset=utf-8');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method not allowed'
    ]);
    exit;
}

/**
 * Normalize legacy item names to Rules Cyclopedia BECMI terminology.
 *
 * @param array $item Raw database row
 * @return array
 */
function normalizeBECMIItemRecord(array $item): array {
    $name = $item['name'] ?? null;
    $itemType = $item['item_type'] ?? null;
    $weaponType = $item['weapon_type'] ?? null;
    $damageDie = $item['damage_die'] ?? null;
    $legacyAliases = [];

    if ($name === 'Long Sword' && $itemType === 'weapon' && $weaponType === 'melee' && $damageDie === '1d8') {
        $legacyAliases[] = 'Long Sword';
        $item['name'] = 'Normal Sword';
        $item['description'] = 'Standard one-handed sword';
        $item['cost_gp'] = 10.00;
        $item['weight_cn'] = 60;
        $item['item_category'] = $item['item_category'] ?? 'sword';
        $item['hands_required'] = 1;
    }

    if (
        $itemType === 'weapon' &&
        is_string($name) &&
        preg_match('/^Bastard Sword \((One-Handed|Two-Handed)\)(.*)$/', $name, $matches)
    ) {
        $suffix = trim($matches[2]);
        $legacyAliases[] = $name;
        $item['name'] = $suffix !== '' ? 'Bastard Sword ' . $suffix : 'Bastard Sword';
        $item['description'] = 'Versatile sword; use one-handed or two-handed. Cannot use a shield while wielded two-handed.';
        $item['item_category'] = $item['item_category'] ?? 'sword';
        $item['hands_required'] = 1;
        $item['can_use_two_handed'] = true;
        $item['becmi_hand_mode'] = $matches[1] === 'One-Handed' ? 'one_handed' : 'two_handed';
    }

    $item['legacy_aliases'] = $legacyAliases;
    return $item;
}

function buildBastardSwordDamageDisplay(?string $oneHandedDamage, ?string $twoHandedDamage): ?string {
    if ($oneHandedDamage && $twoHandedDamage) {
        return $oneHandedDamage . ' / ' . $twoHandedDamage;
    }

    return $oneHandedDamage ?: $twoHandedDamage;
}

function mergeBECMIVariantItems(array $items): array {
    $mergedItems = [];
    $indexByKey = [];

    foreach ($items as $item) {
        $isFlexibleBastardSword = !empty($item['can_use_two_handed'])
            && (($item['becmi_hand_mode'] ?? null) === 'one_handed' || ($item['becmi_hand_mode'] ?? null) === 'two_handed')
            && strpos((string) ($item['name'] ?? ''), 'Bastard Sword') === 0;

        if (!$isFlexibleBastardSword) {
            $mergedItems[] = $item;
            continue;
        }

        $key = strtolower((string) $item['name']);

        if (!isset($indexByKey[$key])) {
            $item['alternate_damage_die'] = ($item['becmi_hand_mode'] ?? null) === 'two_handed' ? ($item['damage_die'] ?? null) : null;
            $item['display_damage'] = ($item['becmi_hand_mode'] ?? null) === 'two_handed'
                ? ($item['damage_die'] ?? null)
                : buildBastardSwordDamageDisplay($item['damage_die'] ?? null, null);
            $item['variant_item_ids'] = array_filter([(int) ($item['item_id'] ?? 0)]);
            $item['legacy_aliases'] = array_values(array_unique(array_filter($item['legacy_aliases'] ?? [])));
            $mergedItems[] = $item;
            $indexByKey[$key] = count($mergedItems) - 1;
            continue;
        }

        $existingIndex = $indexByKey[$key];
        $existingItem = $mergedItems[$existingIndex];
        $shouldPromoteVariant = ($item['becmi_hand_mode'] ?? null) === 'one_handed' && ($existingItem['becmi_hand_mode'] ?? null) === 'two_handed';

        if ($shouldPromoteVariant) {
            $promotedItem = $item;
            $promotedItem['alternate_damage_die'] = $existingItem['damage_die'] ?? ($existingItem['alternate_damage_die'] ?? null);
            $promotedItem['variant_item_ids'] = array_values(array_unique(array_filter(array_merge(
                [(int) ($item['item_id'] ?? 0)],
                $existingItem['variant_item_ids'] ?? [],
                [(int) ($existingItem['item_id'] ?? 0)]
            ))));
            $promotedItem['legacy_aliases'] = array_values(array_unique(array_filter(array_merge(
                $item['legacy_aliases'] ?? [],
                $existingItem['legacy_aliases'] ?? []
            ))));
            $promotedItem['display_damage'] = buildBastardSwordDamageDisplay(
                $promotedItem['damage_die'] ?? null,
                $promotedItem['alternate_damage_die'] ?? null
            );
            $mergedItems[$existingIndex] = $promotedItem;
            continue;
        }

        $oneHandedDamage = ($existingItem['becmi_hand_mode'] ?? null) === 'one_handed'
            ? ($existingItem['damage_die'] ?? null)
            : (($item['becmi_hand_mode'] ?? null) === 'one_handed' ? ($item['damage_die'] ?? null) : ($existingItem['damage_die'] ?? null));
        $twoHandedDamage = ($existingItem['becmi_hand_mode'] ?? null) === 'two_handed'
            ? ($existingItem['damage_die'] ?? null)
            : (($item['becmi_hand_mode'] ?? null) === 'two_handed' ? ($item['damage_die'] ?? null) : ($existingItem['alternate_damage_die'] ?? null));

        $existingItem['damage_die'] = $oneHandedDamage ?? ($existingItem['damage_die'] ?? null);
        $existingItem['alternate_damage_die'] = $twoHandedDamage;
        $existingItem['display_damage'] = buildBastardSwordDamageDisplay(
            $existingItem['damage_die'] ?? null,
            $existingItem['alternate_damage_die'] ?? null
        );
        $existingItem['legacy_aliases'] = array_values(array_unique(array_filter(array_merge(
            $existingItem['legacy_aliases'] ?? [],
            $item['legacy_aliases'] ?? []
        ))));
        $existingItem['variant_item_ids'] = array_values(array_unique(array_filter(array_merge(
            $existingItem['variant_item_ids'] ?? [],
            [(int) ($item['item_id'] ?? 0)]
        ))));
        $mergedItems[$existingIndex] = $existingItem;
    }

    return $mergedItems;
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
        SELECT *
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
        $item = normalizeBECMIItemRecord($item);

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
            'item_id' => (int)($item['item_id'] ?? 0),
            'name' => $item['name'] ?? '',
            'image_url' => $item['image_url'] ?? null,
            'description' => $item['description'] ?? null,
            'weight_cn' => (int)($item['weight_cn'] ?? 0),
            'cost_gp' => (float)($item['cost_gp'] ?? 0),
            'category' => $category,
            'item_type' => $item['item_type'] ?? null,
            'item_category' => $item['item_category'] ?? null,
            'size_category' => $item['size_category'] ?? null,
            
            // Weapon properties
            'damage_die' => $item['damage_die'] ?? null,
            'damage_type' => $item['damage_type'] ?? null,
            'weapon_type' => $item['weapon_type'] ?? null,
            'range_short' => !empty($item['range_short']) ? (int)$item['range_short'] : null,
            'range_medium' => !empty($item['range_medium']) ? (int)$item['range_medium'] : null,
            'range_long' => !empty($item['range_long']) ? (int)$item['range_long'] : null,
            'hands_required' => !empty($item['hands_required']) ? (int)$item['hands_required'] : null,
            'can_use_two_handed' => !empty($item['can_use_two_handed']),
            'becmi_hand_mode' => $item['becmi_hand_mode'] ?? null,
            'display_damage' => $item['display_damage'] ?? ($item['damage_die'] ?? null),
            'alternate_damage_die' => $item['alternate_damage_die'] ?? null,
            'legacy_aliases' => $item['legacy_aliases'] ?? [],
            'ammunition_type' => $item['ammunition_type'] ?? null,
            'ammunition_capacity' => !empty($item['ammunition_capacity']) ? (int)$item['ammunition_capacity'] : null,
            'can_be_thrown' => !empty($item['can_be_thrown']),
            
            // Armor properties
            'ac_bonus' => isset($item['ac_bonus']) ? (int)$item['ac_bonus'] : null,
            'armor_type' => $item['armor_type'] ?? null,
            
            // Magical properties
            'is_magical' => !empty($item['is_magical']),
            'magical_bonus' => !empty($item['magical_bonus']) ? (int)$item['magical_bonus'] : 0,
            'magical_properties' => !empty($item['magical_properties']) ? json_decode($item['magical_properties'], true) : null,
            'base_item_id' => !empty($item['base_item_id']) ? (int)$item['base_item_id'] : null,
            'charges' => !empty($item['charges']) ? (int)$item['charges'] : null,
            
            // Special properties
            'special_properties' => !empty($item['special_properties']) ? json_decode($item['special_properties'], true) : null,
            'class_restrictions' => !empty($item['class_restrictions']) ? json_decode($item['class_restrictions'], true) : null,
            
            // Creature/vehicle properties
            'creature_type' => $item['creature_type'] ?? null,
            'capacity_cn' => !empty($item['capacity_cn']) ? (int)$item['capacity_cn'] : null,
            'movement_rate' => !empty($item['movement_rate']) ? (int)$item['movement_rate'] : null,
            
            // Item properties
            'requires_proficiency' => !empty($item['requires_proficiency']),
            'stackable' => array_key_exists('stackable', $item) ? (bool)$item['stackable'] : true
        ];
    }, $items);

    $formattedItems = mergeBECMIVariantItems($formattedItems);
    
    // Clear any output that might have been generated
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'items' => $formattedItems,
            'count' => count($formattedItems)
        ]
    ]);
    exit;
    
} catch (Exception $e) {
    // Clear any output that might have been generated
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    error_log("Error fetching items: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch items'
    ]);
    exit;
}
