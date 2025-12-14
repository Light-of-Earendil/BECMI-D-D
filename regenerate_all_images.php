<?php
/**
 * Regenerate all equipment images - Database updater
 * This script updates the database with all generated image URLs
 */

require_once __DIR__ . '/app/core/database.php';

$database = Database::getInstance();
$db = $database->getConnection();

// Function to sanitize filename
function sanitizeFilename($name) {
    return strtolower(preg_replace('/[^a-z0-9_]/', '_', $name));
}

// Function to get subdirectory
function getSubdirectory($itemType) {
    $subdirs = [
        'weapon' => 'weapons',
        'armor' => 'armor',
        'shield' => 'shields',
        'gear' => 'gear',
        'consumable' => 'consumables'
    ];
    return $subdirs[$itemType] ?? 'gear';
}

// Get all items from database
$stmt = $db->query("SELECT item_id, name, item_type FROM items ORDER BY item_id");
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

$updates = [];
foreach ($items as $item) {
    $itemId = $item['item_id'];
    $itemName = $item['name'];
    $itemType = $item['item_type'];
    
    $safeName = sanitizeFilename($itemName);
    $subdir = getSubdirectory($itemType);
    $filename = "equipment_{$itemId}_{$safeName}.png";
    $imageUrl = "/images/equipment/{$subdir}/{$filename}";
    
    // Check if file exists
    $filePath = __DIR__ . "/public/images/equipment/{$subdir}/{$filename}";
    if (file_exists($filePath)) {
        $updates[] = [
            'item_id' => $itemId,
            'image_url' => $imageUrl,
            'name' => $itemName
        ];
    }
}

// Update database
$updateStmt = $db->prepare("UPDATE items SET image_url = ? WHERE item_id = ?");
$successCount = 0;
$errorCount = 0;

foreach ($updates as $update) {
    try {
        $updateStmt->execute([$update['image_url'], $update['item_id']]);
        echo "✓ Updated item {$update['item_id']} ({$update['name']}) with {$update['image_url']}\n";
        $successCount++;
    } catch (Exception $e) {
        echo "✗ Failed to update item {$update['item_id']}: {$e->getMessage()}\n";
        $errorCount++;
    }
}

echo "\n";
echo "Summary:\n";
echo "  Total items found: " . count($items) . "\n";
echo "  Images found: " . count($updates) . "\n";
echo "  Successfully updated: {$successCount}\n";
echo "  Errors: {$errorCount}\n";
echo "Done!\n";
