#!/usr/bin/env php
<?php
/**
 * Script to generate all equipment images using Together AI
 * Run from command line: php scripts/generate_all_equipment_images.php
 */

// Set working directory to project root
chdir(__DIR__ . '/../');

require_once 'app/core/database.php';
require_once 'config/together-ai.php';

// Output status
echo "Starting equipment image generation...\n";
echo "===========================================\n\n";

// Get database connection
$db = Database::getInstance();
$conn = $db->getConnection();

// Get all items without images
$query = "SELECT item_id, name, description, item_type FROM items 
          WHERE (image_url IS NULL OR image_url = '') 
          ORDER BY item_type, name";
$stmt = $conn->prepare($query);
$stmt->execute();
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($items) . " items to generate images for.\n\n";

// Together AI API configuration
$apiUrl = 'https://api.together.xyz/v1/images/generations';
$model = 'black-forest-labs/FLUX.1-schnell-Free';

$successCount = 0;
$failCount = 0;

foreach ($items as $index => $item) {
    echo "[" . ($index + 1) . "/" . count($items) . "] Processing: {$item['name']}...\n";
    
    // Create prompt
    $prompt = "Photorealistic medieval {$item['name']}, highly detailed {$item['item_type']} on dark wooden surface, dramatic lighting, museum quality photography, 8K resolution, sharp focus";
    if (!empty($item['description'])) {
        $prompt .= ", " . $item['description'];
    }
    
    // Determine subfolder
    $subfolder = 'gear';
    if ($item['item_type'] === 'weapon') {
        $subfolder = 'weapons';
    } elseif ($item['item_type'] === 'armor') {
        $subfolder = 'armor';
    } elseif ($item['item_type'] === 'shield') {
        $subfolder = 'shields';
    } elseif ($item['item_type'] === 'consumable') {
        $subfolder = 'consumables';
    }
    
    // Create filename
    $safeName = preg_replace('/[^a-z0-9]+/i', '_', strtolower($item['name']));
    $filename = "equipment_{$item['item_id']}_{$safeName}.png";
    $relativePath = "images/equipment/{$subfolder}/{$filename}";
    $absolutePath = __DIR__ . "/../public/{$relativePath}";
    
    // Call Together AI API
    $data = [
        'model' => $model,
        'prompt' => $prompt,
        'width' => 1024,
        'height' => 768,
        'steps' => 4,
        'n' => 1
    ];
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $together_AI_api_key,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        
        if (isset($result['data'][0]['b64_json'])) {
            // Decode and save image
            $imageData = base64_decode($result['data'][0]['b64_json']);
            file_put_contents($absolutePath, $imageData);
            chmod($absolutePath, 0644);
            
            // Update database
            $updateQuery = "UPDATE items SET image_url = ? WHERE item_id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->execute([$relativePath, $item['item_id']]);
            
            echo "  ✓ Image generated and saved to: {$relativePath}\n";
            $successCount++;
        } else {
            echo "  ✗ No image data in response\n";
            $failCount++;
        }
    } elseif ($httpCode === 429) {
        echo "  ⚠ Rate limit hit. Waiting 30 seconds...\n";
        sleep(30);
        // Retry this item by decrementing the index
        $index--;
        $failCount++;
    } else {
        echo "  ✗ API error: HTTP {$httpCode}\n";
        $failCount++;
    }
    
    // Wait between requests to avoid rate limiting
    if (($index + 1) < count($items)) {
        echo "  Waiting 12 seconds before next image...\n\n";
        sleep(12);
    }
}

echo "\n===========================================\n";
echo "Generation complete!\n";
echo "Success: {$successCount}\n";
echo "Failed: {$failCount}\n";
echo "Total: " . count($items) . "\n";

