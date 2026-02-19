<?php
/**
 * BECMI D&D Character Manager - Authentication Verification Endpoint
 * 
 * Verifies user authentication status and returns current user information.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Disable output compression to avoid encoding issues
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (suppress errors for zlib compression)
while (ob_get_level()) {
    @ob_end_clean();
}

// Initialize security (required for CSRF token)
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    // Optional "soft" mode for pre-auth checks:
    // returns HTTP 200 + {status:"error", code:"UNAUTHORIZED"} instead of HTTP 401
    // to avoid browser console noise on expected unauthenticated startup checks.
    $softAuthCheck = isset($_GET['soft']) && $_GET['soft'] === '1';
    $sendUnauthorized = static function() use ($softAuthCheck) {
        if ($softAuthCheck) {
            if (session_status() === PHP_SESSION_ACTIVE) {
                @session_write_close();
            }
            http_response_code(200);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'status' => 'error',
                'message' => 'Authentication required',
                'code' => 'UNAUTHORIZED'
            ]);
            exit;
        }
        Security::sendUnauthorizedResponse();
    };
    
    // Check if user is authenticated
    if (!Security::isAuthenticated()) {
        $sendUnauthorized();
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get user information including moderator status
    $user = $db->selectOne(
        "SELECT user_id, username, email, first_name, last_name, created_at, last_login, is_active, is_moderator FROM users WHERE user_id = ?",
        [$userId]
    );
    
    if (!$user) {
        Security::logSecurityEvent('verify_failed', ['user_id' => $userId, 'reason' => 'user_not_found']);
        $sendUnauthorized();
    }
    
    // Check if user is active
    if (!$user['is_active']) {
        Security::logSecurityEvent('verify_failed', ['user_id' => $userId, 'reason' => 'account_disabled']);
        $sendUnauthorized();
    }
    
    // Get current session information (optional - don't fail if session validation is slow)
    // SKIP database session validation to prevent timeout - we already have $_SESSION['user_id']
    $sessionId = $_SESSION['session_id'] ?? null;
    $session = null;
    
    // Don't validate session from database - it's slow and causes timeouts
    // We already verified user_id from $_SESSION, which is sufficient
    // Database session validation is only needed for API tokens, not web sessions
    
    // Return user information
    Security::sendSuccessResponse([
        'user' => [
            'user_id' => $user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'created_at' => $user['created_at'],
            'last_login' => $user['last_login'],
            'is_moderator' => (bool) ($user['is_moderator'] ?? false)
        ],
        'csrf_token' => Security::getCSRFToken(),
        'session_expires' => $session['expires_at'] ?? null
    ], 'Authentication verified');
    
} catch (Exception $e) {
    error_log("Authentication verification error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred during verification', 500);
}
?>
