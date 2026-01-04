<?php
/**
 * BECMI D&D Character Manager - Forum Post Image Upload
 * 
 * API endpoint to upload images for forum posts
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

// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../app/core/database.php';
require_once __DIR__ . '/../../../app/core/security.php';

Security::init();

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    // Check if file was uploaded
    if (!isset($_FILES['image'])) {
        $errorMsg = 'No file uploaded';
        if (isset($_FILES['image']['error'])) {
            $uploadErrors = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive in php.ini',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive in HTML form',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
            ];
            $errorCode = $_FILES['image']['error'];
            $errorMsg = $uploadErrors[$errorCode] ?? "Upload error code: {$errorCode}";
        }
        Security::sendErrorResponse($errorMsg, 400);
    }
    
    if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive in php.ini (check PHP settings)',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive in HTML form',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
        ];
        $errorCode = $_FILES['image']['error'];
        $errorMsg = $uploadErrors[$errorCode] ?? "Upload error code: {$errorCode}";
        Security::sendErrorResponse($errorMsg, 400);
    }

    $file = $_FILES['image'];
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    
    if (!in_array($mimeType, $allowedTypes)) {
        Security::sendErrorResponse('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.', 400);
    }
    
    // Check PHP upload limits
    $uploadMaxFilesize = ini_get('upload_max_filesize');
    $postMaxSize = ini_get('post_max_size');
    
    // Validate file size (5MB max)
    // SECURITY: Use named constant instead of magic number
    $maxSize = 5 * 1024 * 1024; // 5MB - MAX_FILE_SIZE constant
    if ($file['size'] > $maxSize) {
        $fileSizeMB = round($file['size'] / 1024 / 1024, 2);
        Security::sendErrorResponse("File too large. Maximum size is 5MB. Your file is {$fileSizeMB}MB. (PHP limit: {$uploadMaxFilesize}, POST limit: {$postMaxSize})", 400);
    }
    
    // Also check against PHP limits
    $uploadMaxBytes = parseSize($uploadMaxFilesize);
    $postMaxBytes = parseSize($postMaxSize);
    
    if ($file['size'] > $uploadMaxBytes) {
        Security::sendErrorResponse("File exceeds PHP upload_max_filesize limit ({$uploadMaxFilesize})", 400);
    }
    
    if ($file['size'] > $postMaxBytes) {
        Security::sendErrorResponse("File exceeds PHP post_max_size limit ({$postMaxSize})", 400);
    }
    
    // Generate safe filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeExtension = strtolower($extension);
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!in_array($safeExtension, $allowedExtensions)) {
        Security::sendErrorResponse('Invalid file extension', 400);
    }
    
    $userId = Security::getCurrentUserId();
    $timestamp = time();
    $random = bin2hex(random_bytes(8));
    $filename = "forum_{$userId}_{$timestamp}_{$random}.{$safeExtension}";
    
    // Create directory if it doesn't exist
    $uploadDir = __DIR__ . '/../../../public/images/forum/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            Security::sendErrorResponse('Failed to create upload directory', 500);
        }
    }
    
    $fullPath = $uploadDir . $filename;
    $dbPath = "images/forum/{$filename}";
    
    // Move uploaded file
    if (move_uploaded_file($file['tmp_name'], $fullPath)) {
        chmod($fullPath, 0644);
        
        // Return file information (don't create attachment record yet - that happens when post is created)
        Security::sendSuccessResponse([
            'file_path' => $dbPath,
            'file_name' => $file['name'],
            'file_size' => $file['size'],
            'mime_type' => $mimeType,
            'temp_path' => $fullPath // Temporary path for cleanup if post creation fails
        ], 'Image uploaded successfully');
        
    } else {
        Security::sendErrorResponse('Failed to save uploaded file', 500);
    }
    
} catch (Exception $e) {
    error_log('Forum image upload error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while uploading image: ' . $e->getMessage(), 500);
}

/**
 * Parse PHP size string (e.g., "5M", "10MB") to bytes
 */
function parseSize($size) {
    $size = trim($size);
    if (empty($size)) {
        return 0;
    }
    $last = strtolower($size[strlen($size)-1]);
    $size = (int) $size;
    
    switch($last) {
        case 'g':
            $size *= 1024;
            // fall through
        case 'm':
            $size *= 1024;
            // fall through
        case 'k':
            $size *= 1024;
            break;
        default:
            // Already in bytes
            break;
    }
    
    return $size;
}
