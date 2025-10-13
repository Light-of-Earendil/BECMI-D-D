<?php
/**
 * BECMI D&D Character Manager - Client Error Logging
 * 
 * Receives and logs client-side JavaScript errors for debugging.
 */

require_once '../app/core/database.php';
require_once '../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Get POST data
    $data = Security::getJsonInput();
    
    // Extract error details
    $message = isset($data['message']) ? substr($data['message'], 0, 500) : 'Unknown error';
    $stack = isset($data['stack']) ? substr($data['stack'], 0, 2000) : '';
    $url = isset($data['url']) ? substr($data['url'], 0, 500) : '';
    $userAgent = isset($data['user_agent']) ? substr($data['user_agent'], 0, 500) : '';
    $context = isset($data['context']) ? json_encode($data['context']) : '{}';
    
    // Log to PHP error log
    error_log("=== CLIENT-SIDE ERROR ===");
    error_log("Message: $message");
    error_log("URL: $url");
    error_log("User Agent: $userAgent");
    error_log("Stack: $stack");
    error_log("Context: $context");
    error_log("=== END CLIENT ERROR ===");
    
    // Optionally store in database for future analysis
    // (This would require a client_errors table)
    
    Security::sendSuccessResponse([
        'logged' => true
    ], 'Error logged');
    
} catch (Exception $e) {
    error_log("Error logging error (meta!): " . $e->getMessage());
    // Don't fail - just return success to avoid recursion
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Error logged']);
}
?>

