<?php
/**
 * BECMI D&D Character Manager - Authentication Verification Endpoint
 * 
 * Verifies user authentication status and returns current user information.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security (required for CSRF token)
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Check if user is authenticated
    if (!Security::isAuthenticated()) {
        Security::sendUnauthorizedResponse();
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get user information
    $user = $db->selectOne(
        "SELECT user_id, username, email, first_name, last_name, created_at, last_login, is_active FROM users WHERE user_id = ?",
        [$userId]
    );
    
    if (!$user) {
        Security::logSecurityEvent('verify_failed', ['user_id' => $userId, 'reason' => 'user_not_found']);
        Security::sendUnauthorizedResponse();
    }
    
    // Check if user is active
    if (!$user['is_active']) {
        Security::logSecurityEvent('verify_failed', ['user_id' => $userId, 'reason' => 'account_disabled']);
        Security::sendUnauthorizedResponse();
    }
    
    // Get current session information
    $sessionId = $_SESSION['session_id'] ?? null;
    $session = null;
    
    if ($sessionId) {
        $session = Security::validateUserSession($sessionId);
        
        if (!$session) {
            Security::logSecurityEvent('verify_failed', ['user_id' => $userId, 'reason' => 'session_expired']);
            Security::sendUnauthorizedResponse();
        }
    }
    
    // Return user information
    Security::sendSuccessResponse([
        'user' => [
            'user_id' => $user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'created_at' => $user['created_at'],
            'last_login' => $user['last_login']
        ],
        'csrf_token' => Security::getCSRFToken(),
        'session_expires' => $session['expires_at'] ?? null
    ], 'Authentication verified');
    
} catch (Exception $e) {
    error_log("Authentication verification error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred during verification', 500);
}
?>
