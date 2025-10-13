<?php
/**
 * BECMI D&D Character Manager - Generate Equipment Images
 * 
 * Admin script to generate photorealistic images for equipment items
 * Run via: https://becmi.snilld-api.dk/api/admin/generate-equipment-images.php?batch=1
 */

// Allow longer execution time
set_time_limit(300); // 5 minutes

// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once __DIR__ . '/../../app/core/database.php';
require_once __DIR__ . '/../../app/core/security.php';

// Initialize security
Security::init();

// Check authentication
Security::requireAuth();

try {
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    // Get batch parameter (how many items to process)
    $batchSize = isset($_GET['batch']) ? intval($_GET['batch']) : 5;
    $batchSize = min(max($batchSize, 1), 10); // Between 1 and 10
    
    // Get offset parameter (for pagination)
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    
    // Fetch items without images
    $query = "SELECT item_id, name, description, item_type 
              FROM items 
              WHERE image_url IS NULL OR image_url = ''
              ORDER BY item_type, name
              LIMIT :limit OFFSET :offset";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':limit', $batchSize, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($items)) {
        echo json_encode([
            'success' => true,
            'message' => 'No more items to process',
            'processed' => 0,
            'offset' => $offset
        ]);
        exit();
    }
    
    // Together AI API configuration
    $configFile = __DIR__ . '/../../config/together-ai.php';
    if (!file_exists($configFile)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Together AI config file not found']);
        exit();
    }
    
    require_once $configFile;
    
    if (!isset($together_AI_api_key) || empty($together_AI_api_key)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'TOGETHER_API_KEY not configured']);
        exit();
    }
    
    $apiKey = $together_AI_api_key;
    
    $apiUrl = 'https://api.together.xyz/v1/images/generations';
    $model = 'black-forest-labs/FLUX.1-schnell-Free';
    
    // Function to create prompt
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
        
        if (!empty($item['description'])) {
            $basePrompt .= ", " . strtolower($item['description']);
        }
        
        return $basePrompt;
    }
    
    // Function to generate image
    function generateImage($item, $apiKey, $apiUrl, $model) {
        $prompt = createEquipmentPrompt($item);
        
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
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error || $httpCode !== 200) {
            error_log("Image generation failed for {$item['name']}: HTTP {$httpCode}, Error: {$error}");
            return null;
        }
        
        $responseData = json_decode($response, true);
        
        if (!isset($responseData['data'][0]['b64_json'])) {
            error_log("No image data in response for {$item['name']}");
            return null;
        }
        
        return $responseData['data'][0]['b64_json'];
    }
    
    // Process items
    $results = [];
    $successCount = 0;
    $failCount = 0;
    
    foreach ($items as $index => $item) {
        $result = ['item_id' => $item['item_id'], 'name' => $item['name']];
        
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
        $uploadDir = __DIR__ . "/../../public/images/equipment/{$subdir}/";
        $fullPath = $uploadDir . $filename;
        $dbPath = "images/equipment/{$subdir}/{$filename}";
        
        // Create directory if it doesn't exist
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        // Generate image
        $imageBase64 = generateImage($item, $apiKey, $apiUrl, $model);
        
        if ($imageBase64 === null) {
            $result['success'] = false;
            $result['message'] = 'Failed to generate image';
            $failCount++;
        } else {
            // Decode and save
            $imageData = base64_decode($imageBase64);
            if (file_put_contents($fullPath, $imageData) === false) {
                $result['success'] = false;
                $result['message'] = 'Failed to save image';
                $failCount++;
            } else {
                chmod($fullPath, 0644);
                
                // Update database
                $updateQuery = "UPDATE items SET image_url = :image_url WHERE item_id = :item_id";
                $updateStmt = $db->prepare($updateQuery);
                $updateStmt->bindParam(':image_url', $dbPath);
                $updateStmt->bindParam(':item_id', $item['item_id'], PDO::PARAM_INT);
                
                if ($updateStmt->execute()) {
                    $result['success'] = true;
                    $result['message'] = 'Image generated and saved';
                    $result['image_url'] = $dbPath;
                    $successCount++;
                } else {
                    $result['success'] = false;
                    $result['message'] = 'Failed to update database';
                    $failCount++;
                }
            }
        }
        
        $results[] = $result;
        
        // Rate limiting - wait 3 seconds between requests
        if ($index < count($items) - 1) {
            sleep(3);
        }
    }
    
    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM items WHERE image_url IS NULL OR image_url = ''";
    $countStmt = $db->prepare($countQuery);
    $countStmt->execute();
    $totalRemaining = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    echo json_encode([
        'success' => true,
        'message' => "Processed {$batchSize} items",
        'processed' => count($items),
        'successful' => $successCount,
        'failed' => $failCount,
        'total_remaining' => $totalRemaining,
        'next_offset' => $offset + $batchSize,
        'results' => $results
    ]);
    
} catch (Exception $e) {
    error_log("Error generating equipment images: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

