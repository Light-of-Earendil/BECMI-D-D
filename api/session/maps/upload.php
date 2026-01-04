<?php
/**
 * BECMI D&D Character Manager - Session Map Upload Endpoint
 * 
 * Allows DM to upload map images for a session
 * Supports multipart/form-data and base64 image uploads
 * 
 * Request: POST
 * Content-Type: multipart/form-data or application/json
 * 
 * Multipart:
 * - image: file (JPG, PNG, WebP, max 10MB)
 * - session_id: int
 * - map_name: string
 * 
 * JSON (base64):
 * {
 *   "image": "data:image/jpeg;base64,...",
 *   "session_id": int,
 *   "map_name": string
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "map_id": int,
 *     "map_name": string,
 *     "image_url": string,
 *     "image_width": int,
 *     "image_height": int
 *   }
 * }
 */

// Disable output compression for file uploads to avoid encoding issues
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get session_id and map_name
    $sessionId = null;
    $mapName = null;
    $imageData = null;
    $imageType = null;
    
    // Check if multipart/form-data
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $sessionId = isset($_POST['session_id']) ? (int) $_POST['session_id'] : null;
        $mapName = isset($_POST['map_name']) ? trim($_POST['map_name']) : null;
        
        // Validate file
        $file = $_FILES['image'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $maxSize = 10 * 1024 * 1024; // 10MB
        
        // Verify MIME type using finfo (more secure than trusting $_FILES['type'])
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($file['tmp_name']);
        
        if (!in_array($detectedMime, $allowedTypes)) {
            Security::sendValidationErrorResponse(['image' => 'Invalid file type. Only JPG, PNG, and WebP are allowed']);
        }
        
        // Use detected MIME type
        $file['type'] = $detectedMime;
        
        if ($file['size'] > $maxSize) {
            Security::sendValidationErrorResponse(['image' => 'File too large. Maximum size is 10MB']);
        }
        
        // Read image data
        $imageData = file_get_contents($file['tmp_name']);
        $imageType = $file['type'];
        
    } else {
        // Try JSON input (base64)
        $data = Security::validateJSONInput();
        
        $sessionId = isset($data['session_id']) ? (int) $data['session_id'] : null;
        $mapName = isset($data['map_name']) ? trim($data['map_name']) : null;
        
        if (isset($data['image']) && preg_match('/^data:image\/(jpeg|png|webp);base64,/', $data['image'], $matches)) {
            $imageType = 'image/' . $matches[1];
            $base64Data = substr($data['image'], strpos($data['image'], ',') + 1);
            $imageData = base64_decode($base64Data);
            
            if ($imageData === false) {
                Security::sendValidationErrorResponse(['image' => 'Invalid base64 image data']);
            }
            
            if (strlen($imageData) > 10 * 1024 * 1024) {
                Security::sendValidationErrorResponse(['image' => 'Image too large. Maximum size is 10MB']);
            }
        } else {
            Security::sendValidationErrorResponse(['image' => 'Image is required']);
        }
    }
    
    // Validate required fields
    $errors = [];
    
    if (!$sessionId || $sessionId <= 0) {
        $errors['session_id'] = 'Valid session ID is required';
    }
    
    if (!$mapName || strlen($mapName) === 0) {
        $errors['map_name'] = 'Map name is required';
    } elseif (strlen($mapName) > 100) {
        $errors['map_name'] = 'Map name must be 100 characters or less';
    }
    
    if (!$imageData) {
        $errors['image'] = 'Image is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Verify session exists and user is DM
    $session = $db->selectOne(
        "SELECT session_id, session_title, dm_user_id 
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Only DM can upload maps
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can upload maps', 403);
    }
    
    // Get image dimensions using getimagesizefromstring (standard PHP, no extensions needed)
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    $imageInfo = @getimagesizefromstring($imageData);
    
    if ($imageInfo === false) {
        Security::sendValidationErrorResponse(['image' => 'Invalid image file - could not read image dimensions']);
    }
    
    $imageWidth = $imageInfo[0];
    $imageHeight = $imageInfo[1];
    
    // Verify MIME type matches
    $detectedMime = $imageInfo['mime'];
    if (!in_array($detectedMime, $allowedTypes)) {
        Security::sendValidationErrorResponse(['image' => 'Invalid image file type detected: ' . $detectedMime]);
    }
    
    // Update imageType if detected type differs
    if ($detectedMime !== $imageType) {
        $imageType = $detectedMime;
    }
    
    // Determine file extension from MIME type
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];
    $extension = $extensions[$imageType] ?? 'jpg';
    
    // Create upload directory if it doesn't exist
    $uploadDir = dirname(dirname(dirname(__DIR__))) . '/public/images/session-maps/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $filename = 'map_' . $sessionId . '_' . time() . '_' . uniqid() . '.' . $extension;
    $filePath = $uploadDir . $filename;
    
    // Save image file
    $bytesWritten = @file_put_contents($filePath, $imageData);
    if ($bytesWritten === false || $bytesWritten !== strlen($imageData)) {
        $error = error_get_last();
        error_log("MAP UPLOAD: Failed to save image file. Error: " . ($error ? $error['message'] : 'Unknown error'));
        Security::sendErrorResponse('Failed to save image file', 500);
    }
    
    // Store relative path (from public directory)
    $relativePath = 'images/session-maps/' . $filename;
    
    // Insert map record
    $mapId = $db->insert(
        "INSERT INTO session_maps (session_id, map_name, image_path, image_width, image_height, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)",
        [$sessionId, $mapName, $relativePath, $imageWidth, $imageHeight, $userId]
    );
    
    // If this is the first map for the session, set it as active
    $existingMaps = $db->selectOne(
        "SELECT COUNT(*) as count FROM session_maps WHERE session_id = ?",
        [$sessionId]
    );
    
    $isActive = false;
    if ($existingMaps['count'] == 1) {
        $db->execute(
            "UPDATE session_maps SET is_active = TRUE WHERE map_id = ?",
            [$mapId]
        );
        $isActive = true;
        
        // Broadcast map_refresh event so players reload and see the new active map
        try {
            require_once '../../../app/services/event-broadcaster.php';
            $broadcastResult = broadcastEvent(
                $sessionId,
                'map_refresh',
                [
                    'session_id' => $sessionId
                ],
                $userId
            );
            if (!$broadcastResult) {
                error_log("MAP UPLOAD: Failed to broadcast map_refresh event for session_id: $sessionId");
            }
        } catch (Exception $broadcastError) {
            // Log broadcast error but don't fail the request
            error_log("MAP UPLOAD: Broadcast error: " . $broadcastError->getMessage());
        }
    }
    
    // Return success response
    Security::sendSuccessResponse([
        'map_id' => $mapId,
        'map_name' => $mapName,
        'image_url' => '/' . $relativePath,
        'image_width' => $imageWidth,
        'image_height' => $imageHeight,
        'is_active' => $isActive
    ], 'Map uploaded successfully');
    
} catch (Exception $e) {
    error_log("MAP UPLOAD ERROR: " . $e->getMessage());
    error_log("MAP UPLOAD ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to upload map: ' . $e->getMessage(), 500);
}
?>
