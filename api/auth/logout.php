<?php
/**
 * BECMI D&D Character Manager - Logout Endpoint
 * 
 * Handles user logout and session cleanup.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Check if user is authenticated
    if (!Security::isAuthenticated()) {
        Security::sendSuccessResponse(null, 'Already logged out');
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
    
    // Destroy session
    session_destroy();
    
    // Return success response
    Security::sendSuccessResponse(null, 'Logout successful');
    
} catch (Exception $e) {
    error_log("Logout error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred during logout', 500);
}
?>
