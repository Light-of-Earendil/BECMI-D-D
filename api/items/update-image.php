<?php
/**
 * BECMI D&D Character Manager - Update Item Image
 * 
 * API endpoint to update an item's image_url
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
    $database = Database::getInstance();
    $db = $database->getConnection();
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['item_id']) || !isset($input['image_url'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields: item_id and image_url']);
        exit();
    }
    
    $itemId = intval($input['item_id']);
    $imageUrl = trim($input['image_url']);
    
    // Update item image
    $query = "UPDATE items SET image_url = :image_url WHERE item_id = :item_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':image_url', $imageUrl);
    $stmt->bindParam(':item_id', $itemId, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Item image updated successfully',
            'item_id' => $itemId,
            'image_url' => $imageUrl
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update item image']);
    }
    
} catch (Exception $e) {
    error_log("Error updating item image: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

