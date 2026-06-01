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
    $data = Security::validateJSONInput();
    
    // Extract error details
    $errorId = isset($data['error_id']) && is_string($data['error_id']) && $data['error_id'] !== ''
        ? substr($data['error_id'], 0, 64)
        : Security::createErrorId();
    $requestId = isset($data['request_id']) && is_string($data['request_id']) && $data['request_id'] !== ''
        ? substr($data['request_id'], 0, 64)
        : Security::getRequestId();
    $message = isset($data['message']) ? substr((string) $data['message'], 0, 500) : 'Unknown error';
    $stack = isset($data['stack']) ? substr((string) $data['stack'], 0, 4000) : '';
    $url = isset($data['url']) ? substr((string) $data['url'], 0, 500) : '';
    $userAgent = isset($data['user_agent']) ? substr((string) $data['user_agent'], 0, 500) : '';
    $contextJson = isset($data['context'])
        ? json_encode($data['context'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        : '{}';
    $apiActivityJson = isset($data['api_activity'])
        ? json_encode($data['api_activity'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        : '[]';
    $userId = Security::getCurrentUserId();

    if ($contextJson === false) {
        $contextJson = '{}';
    }
    if ($apiActivityJson === false) {
        $apiActivityJson = '[]';
    }
    
    // Log to PHP error log
    error_log("=== CLIENT-SIDE ERROR [{$errorId}] [{$requestId}] ===");
    error_log("Message: $message");
    error_log("URL: $url");
    error_log("User Agent: $userAgent");
    error_log("Stack: $stack");
    error_log("Context: " . substr($contextJson, 0, 4000));
    error_log("Recent API Activity: " . substr($apiActivityJson, 0, 4000));
    error_log("=== END CLIENT ERROR ===");

    // Store in database when the optional migration has been applied.
    try {
        $db = getDB();
        $db->insert(
            "INSERT INTO client_errors (
                error_id,
                request_id,
                user_id,
                message,
                stack_trace,
                url,
                user_agent,
                context_json,
                api_activity_json,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [
                $errorId,
                $requestId,
                $userId,
                $message,
                $stack,
                $url,
                $userAgent,
                substr($contextJson, 0, 65535),
                substr($apiActivityJson, 0, 65535)
            ]
        );
    } catch (Exception $persistException) {
        error_log("CLIENT ERROR PERSIST FAILED [{$errorId}]: " . $persistException->getMessage());
    }
    
    Security::sendSuccessResponse([
        'logged' => true,
        'error_id' => $errorId,
        'request_id' => $requestId
    ], 'Error logged');
    
} catch (Exception $e) {
    error_log("Error logging error (meta!): " . $e->getMessage());
    // Don't fail - just return success to avoid recursion
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Error logged']);
}
?>
