<?php
/**
 * BECMI D&D Character Manager - User Profile API
 * 
 * GET: Retrieve current user's profile information
 * PUT: Update current user's profile information
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Require authentication
    Security::requireAuth();
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user profile
        $user = $db->selectOne(
            "SELECT user_id, username, email, first_name, last_name, created_at, last_login, is_active 
             FROM users 
             WHERE user_id = ?",
            [$userId]
        );
        
        if (!$user) {
            Security::sendErrorResponse('User not found', 404);
        }
        
        Security::sendSuccessResponse([
            'profile' => [
                'user_id' => (int) $user['user_id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'created_at' => $user['created_at'],
                'last_login' => $user['last_login'],
                'is_active' => (bool) $user['is_active']
            ]
        ], 'Profile retrieved successfully');
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'PATCH') {
        // Update user profile
        $data = Security::validateJSONInput();
        
        // Build update fields
        $updates = [];
        $params = [];
        
        // Validate and add username if provided
        if (isset($data['username'])) {
            $username = trim($data['username']);
            if (empty($username)) {
                Security::sendValidationErrorResponse(['username' => 'Username cannot be empty']);
            }
            if (!Security::validateUsername($username)) {
                Security::sendValidationErrorResponse(['username' => 'Username must be 3-50 characters, alphanumeric and underscores only']);
            }
            
            // Check if username is already taken by another user
            $existingUser = $db->selectOne(
                "SELECT user_id FROM users WHERE username = ? AND user_id != ?",
                [$username, $userId]
            );
            
            if ($existingUser) {
                Security::sendValidationErrorResponse(['username' => 'Username already taken']);
            }
            
            $updates[] = "username = ?";
            $params[] = $username;
        }
        
        // Validate and add email if provided
        if (isset($data['email'])) {
            $email = trim($data['email']);
            if (empty($email)) {
                Security::sendValidationErrorResponse(['email' => 'Email cannot be empty']);
            }
            if (!Security::validateEmail($email)) {
                Security::sendValidationErrorResponse(['email' => 'Invalid email format']);
            }
            
            // Check if email is already taken by another user
            $existingEmail = $db->selectOne(
                "SELECT user_id FROM users WHERE email = ? AND user_id != ?",
                [$email, $userId]
            );
            
            if ($existingEmail) {
                Security::sendValidationErrorResponse(['email' => 'Email already taken']);
            }
            
            $updates[] = "email = ?";
            $params[] = $email;
        }
        
        // Add first_name if provided
        if (isset($data['first_name'])) {
            $firstName = trim($data['first_name']);
            if (strlen($firstName) > 50) {
                Security::sendValidationErrorResponse(['first_name' => 'First name must be 50 characters or less']);
            }
            $updates[] = "first_name = ?";
            $params[] = $firstName ?: null;
        }
        
        // Add last_name if provided
        if (isset($data['last_name'])) {
            $lastName = trim($data['last_name']);
            if (strlen($lastName) > 50) {
                Security::sendValidationErrorResponse(['last_name' => 'Last name must be 50 characters or less']);
            }
            $updates[] = "last_name = ?";
            $params[] = $lastName ?: null;
        }
        
        if (empty($updates)) {
            Security::sendValidationErrorResponse(['message' => 'No valid fields to update']);
        }
        
        // Add updated_at
        $updates[] = "updated_at = NOW()";
        $params[] = $userId;
        
        // Update user profile
        $db->execute(
            "UPDATE users 
             SET " . implode(', ', $updates) . "
             WHERE user_id = ?",
            $params
        );
        
        // Get updated user profile
        $updatedUser = $db->selectOne(
            "SELECT user_id, username, email, first_name, last_name, created_at, last_login, is_active 
             FROM users 
             WHERE user_id = ?",
            [$userId]
        );
        
        Security::sendSuccessResponse([
            'profile' => [
                'user_id' => (int) $updatedUser['user_id'],
                'username' => $updatedUser['username'],
                'email' => $updatedUser['email'],
                'first_name' => $updatedUser['first_name'],
                'last_name' => $updatedUser['last_name'],
                'created_at' => $updatedUser['created_at'],
                'last_login' => $updatedUser['last_login'],
                'is_active' => (bool) $updatedUser['is_active']
            ]
        ], 'Profile updated successfully');
        
    } else {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log('User profile error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while processing profile request', 500);
}
?>
