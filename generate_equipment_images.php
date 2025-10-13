<?php
// generate_equipment_images.php
// Script to generate photorealistic medieval images for all equipment items

require_once __DIR__ . '/app/core/database.php';

// Initialize database connection
$database = Database::getInstance();
$db = $database->getConnection();

// Fetch all equipment items
$query = "SELECT item_id, name, description, item_type FROM items ORDER BY item_type, name";
$stmt = $db->prepare($query);
$stmt->execute();
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($items) . " items to generate images for.\n\n";

// Together AI API configuration
$apiKey = getenv('TOGETHER_API_KEY');
if (!$apiKey) {
    die("ERROR: TOGETHER_API_KEY environment variable not set!\n");
}

$apiUrl = 'https://api.together.xyz/v1/images/generations';
$model = 'black-forest-labs/FLUX.1-schnell-Free';

// Function to create prompt for equipment image
function createEquipmentPrompt($item) {
    $basePrompt = "Photorealistic medieval {$item['name']}, ";
    
    switch ($item['item_type']) {
        case 'weapon':
            $basePrompt .= "highly detailed weapon on dark wooden surface, dramatic lighting, museum quality photography, 8K resolution, sharp focus";
            break;
        case 'armor':
            $basePrompt .= "highly detailed armor piece on display stand, dramatic lighting, museum quality photography, 8K resolution, sharp focus";
            break;
        case 'shield':
            $basePrompt .= "highly detailed shield on display, dramatic lighting, museum quality photography, 8K resolution, sharp focus";
            break;
        case 'gear':
            $basePrompt .= "highly detailed medieval adventuring equipment, dramatic lighting, museum quality photography, 8K resolution, sharp focus";
            break;
        case 'consumable':
            $basePrompt .= "highly detailed medieval consumable item, dramatic lighting, museum quality photography, 8K resolution, sharp focus";
            break;
        default:
            $basePrompt .= "highly detailed medieval item, dramatic lighting, museum quality photography, 8K resolution, sharp focus";
    }
    
    // Add description context if available
    if (!empty($item['description'])) {
        $basePrompt .= ", " . strtolower($item['description']);
    }
    
    return $basePrompt;
}

// Function to download and save image
function downloadImage($imageUrl, $savePath) {
    $ch = curl_init($imageUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $imageData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error || $httpCode !== 200) {
        return false;
    }
    
    // Validate image
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->buffer($imageData);
    if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
        return false;
    }
    
    // Save image
    if (file_put_contents($savePath, $imageData) === false) {
        return false;
    }
    
    chmod($savePath, 0644);
    return true;
}

// Function to generate image via Together AI
function generateEquipmentImage($item, $apiKey, $apiUrl, $model) {
    $prompt = createEquipmentPrompt($item);
    
    echo "Generating image for: {$item['name']}\n";
    echo "Prompt: {$prompt}\n";
    
    $requestData = [
        'model' => $model,
        'prompt' => $prompt,
        'width' => 1024,
        'height' => 768,
        'steps' => 4,
        'n' => 1,
        'response_format' => 'b64_json'
    ];
    
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error || $httpCode !== 200) {
        echo "ERROR: Failed to generate image. HTTP Code: {$httpCode}, Error: {$error}\n";
        if ($response) {
            echo "Response: " . substr($response, 0, 500) . "\n";
        }
        return null;
    }
    
    $responseData = json_decode($response, true);
    
    if (!isset($responseData['data'][0]['b64_json'])) {
        echo "ERROR: No image data in response\n";
        return null;
    }
    
    return $responseData['data'][0]['b64_json'];
}

// Process each item
$successCount = 0;
$failCount = 0;
$updateQuery = "UPDATE items SET image_url = :image_url WHERE item_id = :item_id";
$updateStmt = $db->prepare($updateQuery);

foreach ($items as $index => $item) {
    echo "\n[" . ($index + 1) . "/" . count($items) . "] Processing: {$item['name']}\n";
    
    // Determine subdirectory
    $subdir = match($item['item_type']) {
        'weapon' => 'weapons',
        'armor' => 'armor',
        'shield' => 'shields',
        'gear' => 'gear',
        'consumable' => 'consumables',
        default => 'gear'
    };
    
    // Create safe filename
    $safeFilename = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($item['name']));
    $filename = "equipment_{$item['item_id']}_{$safeFilename}.png";
    $fullPath = __DIR__ . "/public/images/equipment/{$subdir}/{$filename}";
    $dbPath = "images/equipment/{$subdir}/{$filename}";
    
    // Check if image already exists
    if (file_exists($fullPath)) {
        echo "Image already exists, skipping...\n";
        // Update database with existing path
        $updateStmt->execute([
            ':image_url' => $dbPath,
            ':item_id' => $item['item_id']
        ]);
        $successCount++;
        continue;
    }
    
    // Generate image
    $imageBase64 = generateEquipmentImage($item, $apiKey, $apiUrl, $model);
    
    if ($imageBase64 === null) {
        echo "Failed to generate image\n";
        $failCount++;
        continue;
    }
    
    // Decode and save image
    $imageData = base64_decode($imageBase64);
    if (file_put_contents($fullPath, $imageData) === false) {
        echo "ERROR: Failed to save image to {$fullPath}\n";
        $failCount++;
        continue;
    }
    
    chmod($fullPath, 0644);
    
    // Update database
    $updateStmt->execute([
        ':image_url' => $dbPath,
        ':item_id' => $item['item_id']
    ]);
    
    echo "SUCCESS: Image saved to {$dbPath}\n";
    $successCount++;
    
    // Rate limiting - wait 2 seconds between requests
    if ($index < count($items) - 1) {
        echo "Waiting 2 seconds before next request...\n";
        sleep(2);
    }
}

echo "\n\n=== GENERATION COMPLETE ===\n";
echo "Successfully generated: {$successCount}\n";
echo "Failed: {$failCount}\n";
echo "Total: " . count($items) . "\n";

