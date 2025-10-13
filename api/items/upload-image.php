<?php
/**
 * BECMI D&D Character Manager - Upload Item Image
 * 
 * API endpoint to upload equipment images
 */

// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../app/core/database.php';
require_once __DIR__ . '/../../app/core/security.php';

// Initialize security
Security::init();

// Check authentication
Security::requireAuth();

try {
    // Check if this is a multipart/form-data request (file upload)
    if (isset($_FILES['image']) && isset($_POST['item_id']) && isset($_POST['item_type'])) {
        $itemId = intval($_POST['item_id']);
        $itemType = $_POST['item_type'];
        $file = $_FILES['image'];
        
        // Validate file
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid file type']);
            exit();
        }
        
        if ($file['size'] > 5 * 1024 * 1024) { // 5MB limit
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'File too large (max 5MB)']);
            exit();
        }
        
        // Determine subdirectory
        $subdir = match($itemType) {
            'weapon' => 'weapons',
            'armor' => 'armor',
            'shield' => 'shields',
            'gear' => 'gear',
            'consumable' => 'consumables',
            default => 'gear'
        };
        
        // Create safe filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = "equipment_{$itemId}_" . time() . ".{$extension}";
        
        // Create directory if it doesn't exist
        $uploadDir = __DIR__ . "/../../public/images/equipment/{$subdir}/";
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $fullPath = $uploadDir . $filename;
        $dbPath = "images/equipment/{$subdir}/{$filename}";
        
        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $fullPath)) {
            chmod($fullPath, 0644);
            
            // Update database
            $database = Database::getInstance();
            $db = $database->getConnection();
            
            $query = "UPDATE items SET image_url = :image_url WHERE item_id = :item_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':image_url', $dbPath);
            $stmt->bindParam(':item_id', $itemId, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Image uploaded successfully',
                    'item_id' => $itemId,
                    'image_url' => $dbPath
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update database']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save uploaded file']);
        }
    } 
    // Check if this is a base64 image upload (JSON)
    else {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['item_id']) || !isset($input['item_type']) || !isset($input['image_data'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields: item_id, item_type, and image_data']);
            exit();
        }
        
        $itemId = intval($input['item_id']);
        $itemType = $input['item_type'];
        $imageData = $input['image_data'];
        
        // Decode base64
        if (strpos($imageData, 'data:image') === 0) {
            // Remove data:image/xxx;base64, prefix
            $imageData = preg_replace('/^data:image\/\w+;base64,/', '', $imageData);
        }
        
        $decodedImage = base64_decode($imageData);
        if ($decodedImage === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid base64 image data']);
            exit();
        }
        
        // Validate image
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->buffer($decodedImage);
        if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid image type']);
            exit();
        }
        
        // Determine subdirectory
        $subdir = match($itemType) {
            'weapon' => 'weapons',
            'armor' => 'armor',
            'shield' => 'shields',
            'gear' => 'gear',
            'consumable' => 'consumables',
            default => 'gear'
        };
        
        // Create safe filename
        $extension = match($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            default => 'png'
        };
        
        $filename = "equipment_{$itemId}_" . time() . ".{$extension}";
        
        // Create directory if it doesn't exist
        $uploadDir = __DIR__ . "/../../public/images/equipment/{$subdir}/";
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $fullPath = $uploadDir . $filename;
        $dbPath = "images/equipment/{$subdir}/{$filename}";
        
        // Save image
        if (file_put_contents($fullPath, $decodedImage) !== false) {
            chmod($fullPath, 0644);
            
            // Update database
            $database = Database::getInstance();
            $db = $database->getConnection();
            
            $query = "UPDATE items SET image_url = :image_url WHERE item_id = :item_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':image_url', $dbPath);
            $stmt->bindParam(':item_id', $itemId, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Image uploaded successfully',
                    'item_id' => $itemId,
                    'image_url' => $dbPath
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update database']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to save image file']);
        }
    }
    
} catch (Exception $e) {
    error_log("Error uploading item image: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

