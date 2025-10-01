<?php
/**
 * BECMI D&D Character Manager - User Registration Endpoint
 * 
 * Handles new user registration with validation and security checks.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security (starts session)
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
    
    // Debug: Log input data
    error_log("Registration attempt - Input data: " . json_encode($input));
    
    // Validate required fields
    $errors = [];
    
    if (empty($input['username'])) {
        $errors['username'] = 'Username is required';
    }
    
    if (empty($input['email'])) {
        $errors['email'] = 'Email is required';
    }
    
    if (empty($input['password'])) {
        $errors['password'] = 'Password is required';
    }
    
    if (empty($input['confirm_password'])) {
        $errors['confirm_password'] = 'Password confirmation is required';
    }
    
    if (!empty($errors)) {
        error_log("Registration required field errors: " . json_encode($errors));
        Security::sendValidationErrorResponse($errors);
    }
    
    // Sanitize input
    $username = Security::sanitizeInput($input['username']);
    $email = Security::sanitizeInput($input['email']);
    $password = $input['password'];
    $confirmPassword = $input['confirm_password'];
    
    // Validate username format
    if (!Security::validateUsername($username)) {
        $errors['username'] = 'Username must be 3-50 characters, alphanumeric and underscores only';
    }
    
    // Validate email format
    if (!Security::validateEmail($email)) {
        $errors['email'] = 'Invalid email format';
    }
    
    // Validate password strength
    if (!Security::validatePassword($password)) {
        $errors['password'] = 'Password must be at least 8 characters with letters and numbers';
    }
    
    // Check password confirmation
    if ($password !== $confirmPassword) {
        $errors['confirm_password'] = 'Passwords do not match';
    }
    
    if (!empty($errors)) {
        error_log("Registration validation errors: " . json_encode($errors));
        Security::sendValidationErrorResponse($errors);
    }
    
    // Check rate limiting (more lenient for development)
    $rateLimitKey = "register_" . Security::getClientIP();
    if (!Security::checkRateLimit($rateLimitKey, 10, 300)) { // 10 attempts per 5 minutes
        Security::logSecurityEvent('rate_limit_exceeded', ['action' => 'register']);
        Security::sendErrorResponse('Too many registration attempts. Please try again later.', 429);
    }
    
    // Get database connection
    $db = getDB();
    
    // Check if username already exists
    $existingUser = $db->selectOne(
        "SELECT user_id FROM users WHERE username = ?",
        [$username]
    );
    
    if ($existingUser) {
        Security::logSecurityEvent('register_failed', ['username' => $username, 'reason' => 'username_exists']);
        Security::sendValidationErrorResponse(['username' => 'Username already exists']);
    }
    
    // Check if email already exists
    $existingEmail = $db->selectOne(
        "SELECT user_id FROM users WHERE email = ?",
        [$email]
    );
    
    if ($existingEmail) {
        Security::logSecurityEvent('register_failed', ['email' => $email, 'reason' => 'email_exists']);
        Security::sendValidationErrorResponse(['email' => 'Email already exists']);
    }
    
    // Hash password
    $passwordHash = Security::hashPassword($password);
    
    // Create user account
    $userId = $db->insert(
        "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, NOW())",
        [$username, $email, $passwordHash]
    );
    
    if (!$userId) {
        Security::logSecurityEvent('register_failed', ['username' => $username, 'reason' => 'database_error']);
        Security::sendErrorResponse('Failed to create account', 500);
    }
    
    // Log successful registration
    Security::logSecurityEvent('register_success', ['username' => $username, 'user_id' => $userId]);
    
    // Return success response
    Security::sendSuccessResponse([
        'user_id' => $userId,
        'username' => $username,
        'email' => $email
    ], 'Account created successfully');
    
} catch (Exception $e) {
    error_log("Registration error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred during registration', 500);
}
?>
