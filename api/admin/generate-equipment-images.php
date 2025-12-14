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
    
    // Get overwrite parameter (to regenerate existing images)
    $overwrite = isset($_GET['overwrite']) && $_GET['overwrite'] == '1';
    
    // Fetch items - either all items (if overwrite) or only missing images
    if ($overwrite) {
        $query = "SELECT item_id, name, description, item_type 
                  FROM items 
                  ORDER BY item_type, name
                  LIMIT :limit OFFSET :offset";
    } else {
        $query = "SELECT item_id, name, description, item_type 
                  FROM items 
                  WHERE image_url IS NULL OR image_url = ''
                  ORDER BY item_type, name
                  LIMIT :limit OFFSET :offset";
    }
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
    $negativePrompt = "blurry, low quality, distorted, watermark, text, people, hands, background clutter, shadows, multiple items, cluttered";
    
    // Function to create prompt (matching Python version)
    function createEquipmentPrompt($item) {
        $base = "Photorealistic medieval";
        $quality = "isolated on clean white background, professional product photography, studio lighting, highly detailed, museum quality, 8K resolution, sharp focus, no blur, no distortion, no watermark";
        $itemName = $item['name'];
        $itemType = $item['item_type'];
        $description = !empty($item['description']) ? strtolower($item['description']) : '';
        
        $nameLower = strtolower($itemName);
        
        switch ($itemType) {
            case 'weapon':
                if (strpos($nameLower, 'sword') !== false) {
                    return "{$base} {$itemName}, {$quality}, gleaming steel blade with leather-wrapped grip and ornate crossguard, professional weapon photography";
                } elseif (strpos($nameLower, 'axe') !== false) {
                    return "{$base} {$itemName}, {$quality}, sharp steel axe head with wooden handle, professional weapon photography";
                } elseif (strpos($nameLower, 'bow') !== false) {
                    return "{$base} {$itemName}, {$quality}, curved wooden bow with string, professional weapon photography";
                } elseif (strpos($nameLower, 'crossbow') !== false) {
                    return "{$base} {$itemName}, {$quality}, mechanical crossbow with wooden stock and steel mechanism, professional weapon photography";
                } elseif (strpos($nameLower, 'dagger') !== false) {
                    return "{$base} {$itemName}, {$quality}, small sharp blade with wrapped grip, professional weapon photography";
                } elseif (strpos($nameLower, 'mace') !== false) {
                    return "{$base} {$itemName}, {$quality}, heavy metal mace head with wooden handle, professional weapon photography";
                } elseif (strpos($nameLower, 'hammer') !== false) {
                    return "{$base} {$itemName}, {$quality}, war hammer with steel head and wooden handle, professional weapon photography";
                } elseif (strpos($nameLower, 'spear') !== false) {
                    return "{$base} {$itemName}, {$quality}, long wooden shaft with sharp metal spearhead, professional weapon photography";
                } elseif (strpos($nameLower, 'staff') !== false) {
                    return "{$base} {$itemName}, {$quality}, simple wooden quarterstaff, professional weapon photography";
                } elseif (strpos($nameLower, 'pole') !== false) {
                    return "{$base} {$itemName}, {$quality}, long polearm with metal blade on wooden shaft, professional weapon photography";
                } elseif (strpos($nameLower, 'javelin') !== false) {
                    return "{$base} {$itemName}, {$quality}, throwing spear with metal tip, professional weapon photography";
                } elseif (strpos($nameLower, 'sling') !== false) {
                    return "{$base} leather sling, {$quality}, simple leather strap for throwing stones, professional weapon photography";
                } elseif (strpos($nameLower, 'blowgun') !== false) {
                    return "{$base} {$itemName}, {$quality}, hollow wooden tube for shooting darts, professional weapon photography";
                } elseif (strpos($nameLower, 'club') !== false || strpos($nameLower, 'blackjack') !== false) {
                    return "{$base} {$itemName}, {$quality}, weighted club for striking, professional weapon photography";
                } else {
                    return "{$base} {$itemName} weapon, {$quality}, professional weapon photography, {$description}";
                }
                break;
                
            case 'armor':
                if (strpos($nameLower, 'leather') !== false) {
                    return "{$base} leather armor, {$quality}, hardened leather cuirass with straps and buckles, displayed on mannequin or stand, professional museum display";
                } elseif (strpos($nameLower, 'chain') !== false) {
                    return "{$base} chain mail armor, {$quality}, interlocking metal rings forming protective coat, displayed on mannequin or stand, professional museum display";
                } elseif (strpos($nameLower, 'plate') !== false) {
                    return "{$base} plate armor, {$quality}, polished steel plate armor pieces, displayed on mannequin or stand, professional museum display";
                } elseif (strpos($nameLower, 'scale') !== false) {
                    return "{$base} scale mail armor, {$quality}, overlapping metal scales on leather backing, displayed on mannequin or stand, professional museum display";
                } elseif (strpos($nameLower, 'banded') !== false) {
                    return "{$base} banded mail armor, {$quality}, metal bands on leather backing, displayed on mannequin or stand, professional museum display";
                } elseif (strpos($nameLower, 'suit') !== false) {
                    return "{$base} full plate armor suit, {$quality}, complete medieval knight armor, displayed on mannequin or stand, professional museum display";
                } else {
                    return "{$base} {$itemName}, {$quality}, protective armor piece, displayed on mannequin or stand, professional museum display";
                }
                break;
                
            case 'shield':
                return "{$base} {$itemName}, {$quality}, wooden shield with metal boss and leather straps, displayed on stand, professional museum display";
                
            case 'gear':
                if (strpos($nameLower, 'rope') !== false) {
                    return "{$base} coiled hemp rope, {$quality}, thick twisted rope coil, clean background, professional photography";
                } elseif (strpos($nameLower, 'torch') !== false) {
                    return "{$base} wooden torch with flames, {$quality}, wooden handle with burning oil-soaked cloth, warm firelight, clean background, professional photography";
                } elseif (strpos($nameLower, 'backpack') !== false) {
                    return "{$base} leather backpack, {$quality}, brown leather adventuring pack with straps and buckles, clean background, professional photography";
                } elseif (strpos($nameLower, 'bedroll') !== false) {
                    return "{$base} bedroll, {$quality}, rolled sleeping blanket tied with leather straps, clean background, professional photography";
                } elseif (strpos($nameLower, 'tinderbox') !== false || strpos($nameLower, 'flint') !== false) {
                    return "{$base} tinderbox with flint and steel, {$quality}, small wooden box with flint stone and steel striker and dry tinder, clean background, professional photography";
                } elseif (strpos($nameLower, 'waterskin') !== false || strpos($nameLower, 'wineskin') !== false) {
                    return "{$base} leather waterskin, {$quality}, leather water container with cork stopper, clean background, professional photography";
                } elseif (strpos($nameLower, 'rations') !== false) {
                    return "{$base} travel rations, {$quality}, dried food provisions in cloth wrapping, clean background, professional photography";
                } elseif (strpos($nameLower, 'lantern') !== false) {
                    return "{$base} {$itemName}, {$quality}, metal lantern with glass panes and oil reservoir, clean background, professional photography";
                } elseif (strpos($nameLower, 'pouch') !== false) {
                    return "{$base} leather pouch, {$quality}, small leather belt pouch with drawstring, clean background, professional photography";
                } elseif (strpos($nameLower, 'sack') !== false) {
                    return "{$base} {$itemName}, {$quality}, large cloth or burlap sack, clean background, professional photography";
                } elseif (strpos($nameLower, 'flask') !== false || strpos($nameLower, 'vial') !== false) {
                    return "{$base} glass {$itemName}, {$quality}, small glass container with cork stopper, clean background, professional photography";
                } elseif (strpos($nameLower, 'holy') !== false) {
                    return "{$base} holy symbol, {$quality}, ornate religious symbol on chain, clean background, professional photography";
                } elseif (strpos($nameLower, 'mirror') !== false) {
                    return "{$base} hand mirror, {$quality}, polished metal mirror in decorative frame, clean background, professional photography";
                } elseif (strpos($nameLower, 'crowbar') !== false) {
                    return "{$base} iron crowbar, {$quality}, heavy iron prying tool, clean background, professional photography";
                } elseif (strpos($nameLower, 'spike') !== false) {
                    return "{$base} iron spikes, {$quality}, metal pitons for climbing, clean background, professional photography";
                } elseif (strpos($nameLower, 'grappling') !== false) {
                    return "{$base} grappling hook, {$quality}, metal hook with rope attached, clean background, professional photography";
                } else {
                    return "{$base} {$itemName}, {$quality}, adventuring gear equipment, clean background, professional photography";
                }
                break;
                
            case 'consumable':
                if (strpos($nameLower, 'oil') !== false) {
                    return "{$base} oil flask, {$quality}, glass flask containing lamp oil or burning oil, clean background, professional photography";
                } elseif (strpos($nameLower, 'potion') !== false) {
                    return "{$base} {$itemName}, {$quality}, glass vial with magical liquid, clean background, professional photography";
                } elseif (strpos($nameLower, 'holy water') !== false) {
                    return "{$base} holy water vial, {$quality}, blessed water in ornate glass vial, clean background, professional photography";
                } else {
                    return "{$base} {$itemName}, {$quality}, clean background, professional photography, {$description}";
                }
                break;
                
            default:
                return "{$base} {$itemName}, {$quality}, medieval equipment item, clean background, professional photography, {$description}";
        }
    }
    
    // Function to generate image
    function generateImage($item, $apiKey, $apiUrl, $model, $negativePrompt) {
        $prompt = createEquipmentPrompt($item);
        
        $requestData = [
            'model' => $model,
            'prompt' => $prompt,
            'width' => 1024,
            'height' => 1024,  // Square format better for items
            'steps' => 8,  // Increased for better quality
            'n' => 1,
            'response_format' => 'b64_json',
            'negative_prompt' => $negativePrompt
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
        $imageBase64 = generateImage($item, $apiKey, $apiUrl, $model, $negativePrompt);
        
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
    if ($overwrite) {
        $countQuery = "SELECT COUNT(*) as total FROM items";
    } else {
        $countQuery = "SELECT COUNT(*) as total FROM items WHERE image_url IS NULL OR image_url = ''";
    }
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

