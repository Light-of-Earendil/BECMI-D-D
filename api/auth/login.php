<?php
/**
 * BECMI D&D Character Manager - Authentication Login Endpoint
 * 
 * Handles user authentication and session creation.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security (required for CSRF token)
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (empty($input['username'])) {
        $errors['username'] = 'Username is required';
    }
    
    if (empty($input['password'])) {
        $errors['password'] = 'Password is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Sanitize input
    $username = Security::sanitizeInput($input['username']);
    $password = $input['password'];
    
    error_log("LOGIN ATTEMPT: Username: $username, Password length: " . strlen($password));
    
    // Validate username format
    if (!Security::validateUsername($username)) {
        error_log("LOGIN FAILED: Invalid username format for: $username");
        Security::sendValidationErrorResponse(['username' => 'Invalid username format']);
    }
    
    // Check rate limiting (more lenient for development)
    $rateLimitKey = "login_" . Security::getClientIP();
    if (!Security::checkRateLimit($rateLimitKey, 15, 300)) { // 15 attempts per 5 minutes
        Security::logSecurityEvent('rate_limit_exceeded', ['action' => 'login']);
        Security::sendErrorResponse('Too many login attempts. Please try again later.', 429);
    }
    
    // Get database connection
    $db = getDB();
    
    // Find user by username
    $user = $db->selectOne(
        "SELECT user_id, username, email, password_hash, is_active FROM users WHERE username = ?",
        [$username]
    );
    
    if (!$user) {
        error_log("LOGIN FAILED: User not found: $username");
        Security::logSecurityEvent('login_failed', ['username' => $username, 'reason' => 'user_not_found']);
        Security::sendErrorResponse('Invalid username or password', 401);
    }
    
    error_log("LOGIN: User found - user_id: {$user['user_id']}, is_active: {$user['is_active']}");
    error_log("LOGIN: Password hash from DB: " . substr($user['password_hash'], 0, 50) . "...");
    
    // Check if user is active
    if (!$user['is_active']) {
        error_log("LOGIN FAILED: Account disabled for user_id: {$user['user_id']}");
        Security::logSecurityEvent('login_failed', ['username' => $username, 'reason' => 'account_disabled']);
        Security::sendErrorResponse('Account is disabled', 403);
    }
    
    // Verify password
    error_log("LOGIN: Verifying password...");
    $passwordVerified = Security::verifyPassword($password, $user['password_hash']);
    error_log("LOGIN: Password verification result: " . ($passwordVerified ? 'SUCCESS' : 'FAILED'));
    
    if (!$passwordVerified) {
        error_log("LOGIN FAILED: Invalid password for username: $username (user_id: {$user['user_id']})");
        Security::logSecurityEvent('login_failed', ['username' => $username, 'reason' => 'invalid_password']);
        Security::sendErrorResponse('Invalid username or password', 401);
    }
    
    error_log("LOGIN: Password verified successfully for user_id: {$user['user_id']}");
    
    // Create session
    $sessionId = Security::generateSessionId();
    $csrfToken = Security::generateCSRFToken();
    
    // Store session in database using Security class method
    if (!Security::createUserSession($user['user_id'], $sessionId, $csrfToken)) {
        Security::sendErrorResponse('Failed to create session', 500);
    }
    
    // Update user's last login
    $db->update(
        "UPDATE users SET last_login = NOW() WHERE user_id = ?",
        [$user['user_id']]
    );
    
    // Set session variables
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['session_id'] = $sessionId;
    $_SESSION['csrf_token'] = $csrfToken;
    
    // Log successful login
    Security::logSecurityEvent('login_success', ['username' => $username]);
    
    // Return success response
    Security::sendSuccessResponse([
        'user_id' => $user['user_id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'session_id' => $sessionId,
        'csrf_token' => $csrfToken
    ], 'Login successful');
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred during login', 500);
}
?>
