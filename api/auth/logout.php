<?php
/**
 * BECMI D&D Character Manager - Logout Endpoint
 * 
 * Handles user logout and session cleanup.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security so the current PHP session is actually available.
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Check if user is authenticated
    if (!Security::isAuthenticated()) {
        Security::sendSuccessResponse(null, 'Already logged out');
    }

    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get current user ID and session ID
    $userId = Security::getCurrentUserId();
    $sessionId = $_SESSION['session_id'] ?? null;
    
    // Get database connection
    $db = getDB();
    
    // Remove session from database
    if ($sessionId) {
        try {
            $db = getDB();
            $db->execute(
                "DELETE FROM user_sessions WHERE session_id = ? AND user_id = ?",
                [$sessionId, $userId]
            );
        } catch (Exception $e) {
            error_log("Failed to remove session from database: " . $e->getMessage());
        }
    }
    
    // Log logout event
    Security::logSecurityEvent('logout_success', ['user_id' => $userId]);

    // Clear the active PHP session and expire the browser cookie.
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $cookieParams = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookieParams['path'] ?: '/',
            'domain' => $cookieParams['domain'] ?: '',
            'secure' => !empty($cookieParams['secure']),
            'httponly' => !empty($cookieParams['httponly']),
            'samesite' => $cookieParams['samesite'] ?? 'Lax'
        ]);
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
    
    // Return success response
    Security::sendSuccessResponse(null, 'Logout successful');
    
} catch (Exception $e) {
    error_log("Logout error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred during logout', 500);
}
?>
