<?php
require_once __DIR__ . '/app/core/database.php';

$database = Database::getInstance();
$db = $database->getConnection();

$stmt = $db->prepare("UPDATE items SET image_url = ? WHERE item_id = ?");
$stmt->execute(['/images/equipment/shields/equipment_12_shield.png', 12]);

echo "✓ Updated shield (item 12) with /images/equipment/shields/equipment_12_shield.png\n";
