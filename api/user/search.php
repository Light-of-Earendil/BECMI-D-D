<?php
/**
 * BECMI D&D Character Manager - User Search Endpoint
 * 
 * Search for users by email or username for invitations.
 * Excludes the current user from results.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get search query
    $searchQuery = isset($_GET['q']) ? trim($_GET['q']) : '';
    
    if (strlen($searchQuery) < 2) {
        Security::sendSuccessResponse([
            'users' => [],
            'total' => 0
        ], 'Search query too short (minimum 2 characters)');
        exit;
    }
    
    // Get current user ID (to exclude from results)
    $currentUserId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Search for users by username or email
    // Use LIKE for partial matching
    $searchPattern = '%' . $searchQuery . '%';
    
    $users = $db->select(
        "SELECT user_id, username, email, created_at
         FROM users
         WHERE (username LIKE ? OR email LIKE ?)
           AND user_id != ?
           AND is_active = 1
         ORDER BY username ASC
         LIMIT 20",
        [$searchPattern, $searchPattern, $currentUserId]
    );
    
    // Format user data (hide full email for privacy)
    $formattedUsers = array_map(function($user) {
        // Obfuscate email partially (show first 3 chars and domain)
        $email = $user['email'];
        $emailParts = explode('@', $email);
        $obfuscatedEmail = substr($emailParts[0], 0, 3) . '***@' . $emailParts[1];
        
        return [
            'user_id' => (int) $user['user_id'],
            'username' => $user['username'],
            'email' => $email, // Full email for exact matching
            'email_display' => $obfuscatedEmail, // Obfuscated for display
            'member_since' => date('Y-m-d', strtotime($user['created_at']))
        ];
    }, $users);
    
    Security::sendSuccessResponse([
        'users' => $formattedUsers,
        'total' => count($formattedUsers),
        'query' => $searchQuery
    ], 'User search completed');
    
} catch (Exception $e) {
    error_log("User search error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred while searching for users', 500);
}
?>

