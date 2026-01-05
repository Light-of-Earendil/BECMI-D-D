<?php
/**
 * BECMI D&D Character Manager - Authentication Login Endpoint
 * 
 * Handles user authentication and session creation.
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
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (empty($input['username'])) {
        $errors['username'] = 'Username or email is required';
    }
    
    if (empty($input['password'])) {
        $errors['password'] = 'Password is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Sanitize input
    $loginIdentifier = Security::sanitizeInput($input['username']);
    $password = $input['password'];
    
    error_log("LOGIN ATTEMPT: Identifier: $loginIdentifier, Password length: " . strlen($password));
    
    // Check rate limiting (more lenient for development)
    // SECURITY: Use named constants instead of magic numbers
    // RATE_LIMIT_ATTEMPTS = 15, RATE_LIMIT_WINDOW = 300 (5 minutes)
    $rateLimitKey = "login_" . Security::getClientIP();
    if (!Security::checkRateLimit($rateLimitKey, 15, 300)) { // 15 attempts per 5 minutes
        Security::logSecurityEvent('rate_limit_exceeded', ['action' => 'login']);
        Security::sendErrorResponse('Too many login attempts. Please try again later.', 429);
    }
    
    // Get database connection
    $db = getDB();
    
    // Determine if identifier is email or username
    $isEmail = Security::validateEmail($loginIdentifier);
    
    // Find user by username or email (include is_moderator)
    if ($isEmail) {
        $user = $db->selectOne(
            "SELECT user_id, username, email, password_hash, is_active, is_moderator FROM users WHERE email = ?",
            [$loginIdentifier]
        );
        error_log("LOGIN: Searching by email: $loginIdentifier");
    } else {
        // Validate username format if it's not an email
        if (!Security::validateUsername($loginIdentifier)) {
            error_log("LOGIN FAILED: Invalid username format for: $loginIdentifier");
            Security::sendValidationErrorResponse(['username' => 'Invalid username format']);
        }
        $user = $db->selectOne(
            "SELECT user_id, username, email, password_hash, is_active, is_moderator FROM users WHERE username = ?",
            [$loginIdentifier]
        );
        error_log("LOGIN: Searching by username: $loginIdentifier");
    }
    
    if (!$user) {
        error_log("LOGIN FAILED: User not found: $loginIdentifier");
        Security::logSecurityEvent('login_failed', ['identifier' => $loginIdentifier, 'reason' => 'user_not_found']);
        Security::sendErrorResponse('Invalid username/email or password', 401);
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
        error_log("LOGIN FAILED: Invalid password for identifier: $loginIdentifier (user_id: {$user['user_id']})");
        Security::logSecurityEvent('login_failed', ['identifier' => $loginIdentifier, 'reason' => 'invalid_password']);
        Security::sendErrorResponse('Invalid username/email or password', 401);
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
    $db->execute(
        "UPDATE users SET last_login = NOW() WHERE user_id = ?",
        [$user['user_id']]
    );
    
    // Set session variables
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['session_id'] = $sessionId;
    $_SESSION['csrf_token'] = $csrfToken;
    
    // CRITICAL: Write session data before sending response
    // Don't close session yet - let PHP handle it automatically after response is sent
    // This ensures the session cookie is properly set
    session_write_close();
    
    // Log successful login (after session is written)
    Security::logSecurityEvent('login_success', ['username' => $user['username'], 'identifier' => $loginIdentifier]);
    
    // Clear output buffer
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Send response manually (don't use sendSuccessResponse as it closes session again)
    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Login successful',
        'data' => [
            'user_id' => $user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'is_moderator' => (bool) ($user['is_moderator'] ?? false),
            'session_id' => $sessionId,
            'csrf_token' => $csrfToken
        ],
        'csrf_token' => $csrfToken
    ]);
    exit;
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    Security::sendErrorResponse('An error occurred during login', 500);
}
?>
