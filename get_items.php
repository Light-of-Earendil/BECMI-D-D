<?php
require_once __DIR__ . '/app/core/database.php';
$db = Database::getInstance()->getConnection();
$stmt = $db->query('SELECT item_id, name, description, item_type, item_category, weapon_type, armor_type, size_category FROM items ORDER BY item_id');
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($items, JSON_PRETTY_PRINT);