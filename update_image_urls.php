<?php
/**
 * Update image_url in database for items with generated images
 */

require_once __DIR__ . '/app/core/database.php';

$database = Database::getInstance();
$db = $database->getConnection();

// Items that have been generated
$updates = [
    ['item_id' => 1, 'image_url' => '/images/equipment/weapons/equipment_1_dagger.png'],
    ['item_id' => 2, 'image_url' => '/images/equipment/weapons/equipment_2_short_sword.png'],
    ['item_id' => 3, 'image_url' => '/images/equipment/weapons/equipment_3_normal_sword.png'],
    ['item_id' => 5, 'image_url' => '/images/equipment/weapons/equipment_5_mace.png'],
    ['item_id' => 6, 'image_url' => '/images/equipment/weapons/equipment_6_spear.png'],
    ['item_id' => 25, 'image_url' => '/images/equipment/weapons/equipment_25_javelin.png'],
    ['item_id' => 35, 'image_url' => '/images/equipment/weapons/equipment_35_pike.png'],
    ['item_id' => 44, 'image_url' => '/images/equipment/weapons/equipment_44_poleaxe.png'],
];

$stmt = $db->prepare("UPDATE items SET image_url = ? WHERE item_id = ?");

foreach ($updates as $update) {
    $stmt->execute([$update['image_url'], $update['item_id']]);
    echo "Updated item {$update['item_id']} with {$update['image_url']}\n";
}

echo "Done!\n";
