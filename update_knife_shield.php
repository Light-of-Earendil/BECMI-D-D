<?php
require_once __DIR__ . '/app/core/database.php';

$database = Database::getInstance();
$db = $database->getConnection();

$stmt = $db->prepare("UPDATE items SET image_url = ? WHERE item_id = ?");
$stmt->execute(['/images/equipment/weapons/equipment_46_knife_shield.png', 46]);

echo "✓ Updated Knife Shield (item 46) with /images/equipment/weapons/equipment_46_knife_shield.png\n";
















