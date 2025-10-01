<?php
/**
 * BECMI D&D Character Manager - Security Functions
 * 
 * Centralized security utilities for authentication, authorization,
 * input validation, and CSRF protection.
 */

class Security {
    private static $csrfToken = null;
    
    /**
     * Initialize security settings
     */
    public static function init() {
        // Set secure session options BEFORE starting session
        if (session_status() === PHP_SESSION_NONE) {
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', isset($_SERVER['HTTPS']));
            ini_set('session.use_strict_mode', 1);
            
            // Start output buffering before session start to prevent output issues
            if (!ob_get_level()) {
                ob_start();
            }
            
            session_start();
        }
        
        // Generate CSRF token if not exists
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = self::generateCSRFToken();
        }
        
        self::$csrfToken = $_SESSION['csrf_token'];
    }
    
    /**
     * Generate a secure CSRF token
     */
    public static function generateCSRFToken() {
        return bin2hex(random_bytes(32));
    }
    
    /**
     * Get current CSRF token
     */
    public static function getCSRFToken() {
        return self::$csrfToken;
    }
    
    /**
     * Validate CSRF token
     */
    public static function validateCSRFToken($token) {
        if (!isset($_SESSION['csrf_token'])) {
            return false;
        }
        
        return hash_equals($_SESSION['csrf_token'], $token);
    }
    
    /**
     * Check CSRF token from request headers
     */
    public static function checkCSRFToken() {
        $token = null;
        
        // Check header first
        if (isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
            $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
        }
        // Check POST data
        elseif (isset($_POST['csrf_token'])) {
            $token = $_POST['csrf_token'];
        }
        
        if (!$token) {
            return false;
        }
        
        return self::validateCSRFToken($token);
    }
    
    /**
     * Hash password securely
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536, // 64 MB
            'time_cost' => 4,       // 4 iterations
            'threads' => 3           // 3 threads
        ]);
    }
    
    /**
     * Verify password
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    /**
     * Generate secure random string
     */
    public static function generateRandomString($length = 32) {
        return bin2hex(random_bytes($length / 2));
    }
    
    /**
     * Sanitize input data
     */
    public static function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }
        
        if (is_string($data)) {
            // Remove null bytes
            $data = str_replace("\0", '', $data);
            
            // Trim whitespace
            $data = trim($data);
            
            // Convert special characters
            $data = htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        
        return $data;
    }
    
    /**
     * Validate email address
     */
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Validate username
     */
    public static function validateUsername($username) {
        // Username must be 3-50 characters, alphanumeric and underscores only
        return preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username);
    }
    
    /**
     * Validate password strength
     */
    public static function validatePassword($password) {
        // Password must be at least 8 characters
        if (strlen($password) < 8) {
            return false;
        }
        
        // Must contain at least one letter and one number
        if (!preg_match('/[a-zA-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
            return false;
        }
        
        return true;
    }

    /**
     * Build an absolute URL for the application.
     */
    public static function getBaseUrl() {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return rtrim($scheme . $host, '/');
    }

    /**
     * Attempt to send an email. Falls back to logging if mail() fails.
     */
    public static function sendEmail($to, $subject, $message, $headers = []) {
        $defaultHeaders = [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'From' => $_ENV['MAIL_FROM'] ?? 'no-reply@' . (explode(':', $_SERVER['HTTP_HOST'] ?? 'localhost')[0])
        ];

        $merged = array_merge($defaultHeaders, $headers);
        $formattedHeaders = '';
        foreach ($merged as $key => $value) {
            $formattedHeaders .= $key . ': ' . $value . "\r\n";
        }

        // Log email attempt (FULL MESSAGE for debugging)
        error_log("EMAIL ATTEMPT: Sending to {$to}, Subject: {$subject}");
        error_log("EMAIL HEADERS: " . $formattedHeaders);
        error_log("EMAIL MESSAGE (first 200 chars): " . substr($message, 0, 200));
        error_log("EMAIL MESSAGE (FULL - for password reset debugging): " . $message);

        $sent = false;
        if (function_exists('mail')) {
            $sent = @mail($to, $subject, $message, $formattedHeaders);
            error_log("EMAIL RESULT: " . ($sent ? 'SUCCESS' : 'FAILED'));
        } else {
            error_log("EMAIL ERROR: mail() function does not exist");
        }

        if (!$sent) {
            self::logSecurityEvent('email_dispatch_fallback', [
                'to' => $to,
                'subject' => $subject,
                'message_preview' => substr($message, 0, 200)
            ]);
        }

        return $sent;
    }
    
    /**
     * Check if user is authenticated
     */
    public static function isAuthenticated() {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }
    
    /**
     * Get current user ID
     */
    public static function getCurrentUserId() {
        return $_SESSION['user_id'] ?? null;
    }
    
    /**
     * Require authentication
     */
    public static function requireAuth() {
        if (!self::isAuthenticated()) {
            self::sendUnauthorizedResponse();
        }
    }
    
    /**
     * Check if user has permission
     */
    public static function hasPermission($permission) {
        if (!self::isAuthenticated()) {
            return false;
        }
        
        // For now, all authenticated users have all permissions
        // This can be extended with role-based permissions
        return true;
    }
    
    /**
     * Require specific permission
     */
    public static function requirePermission($permission) {
        if (!self::hasPermission($permission)) {
            self::sendForbiddenResponse();
        }
    }
    
    /**
     * Rate limiting
     */
    public static function checkRateLimit($key, $maxAttempts = 10, $windowSeconds = 300) {
        $cacheKey = "rate_limit_{$key}";
        
        if (!isset($_SESSION[$cacheKey])) {
            $_SESSION[$cacheKey] = [
                'count' => 0,
                'window_start' => time()
            ];
        }
        
        $rateLimit = $_SESSION[$cacheKey];
        
        // Reset window if expired
        if (time() - $rateLimit['window_start'] > $windowSeconds) {
            $rateLimit = [
                'count' => 0,
                'window_start' => time()
            ];
        }
        
        $rateLimit['count']++;
        $_SESSION[$cacheKey] = $rateLimit;
        
        return $rateLimit['count'] <= $maxAttempts;
    }
    
    /**
     * Log security event
     */
    public static function logSecurityEvent($event, $details = []) {
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'event' => $event,
            'user_id' => self::getCurrentUserId(),
            'ip_address' => self::getClientIP(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'details' => $details
        ];
        
        error_log("SECURITY: " . json_encode($logData));
    }
    
    /**
     * Get client IP address
     */
    public static function getClientIP() {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ips = explode(',', $_SERVER[$key]);
                return trim($ips[0]);
            }
        }
        
        return 'unknown';
    }
    
    /**
     * Send unauthorized response
     */
    public static function sendUnauthorizedResponse() {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Authentication required',
            'code' => 'UNAUTHORIZED'
        ]);
        exit;
    }
    
    /**
     * Send forbidden response
     */
    public static function sendForbiddenResponse() {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Access forbidden',
            'code' => 'FORBIDDEN'
        ]);
        exit;
    }
    
    /**
     * Send validation error response
     */
    public static function sendValidationErrorResponse($errors) {
        http_response_code(422);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => 'Validation failed',
            'errors' => $errors,
            'code' => 'VALIDATION_ERROR'
        ]);
        exit;
    }
    
    /**
     * Send success response
     */
    public static function sendSuccessResponse($data = null, $message = 'Success') {
        http_response_code(200);
        header('Content-Type: application/json');
        
        $response = [
            'status' => 'success',
            'message' => $message
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        // Add CSRF token to response if available
        try {
            $csrfToken = self::getCSRFToken();
            if ($csrfToken !== null && $csrfToken !== '') {
                $response['csrf_token'] = $csrfToken;
            }
        } catch (Exception $e) {
            // If CSRF token generation fails, log it but don't break the response
            error_log("WARNING: Failed to add CSRF token to success response: " . $e->getMessage());
        }
        
        echo json_encode($response);
        exit;
    }
    
    /**
     * Send error response
     */
    public static function sendErrorResponse($message = 'An error occurred', $code = 500) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'error',
            'message' => $message,
            'code' => 'ERROR'
        ]);
        exit;
    }
    
    /**
     * Validate JSON input
     */
    public static function validateJSONInput() {
        $input = file_get_contents('php://input');
        
        if (empty($input)) {
            return [];
        }
        
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            self::sendErrorResponse('Invalid JSON input', 400);
        }
        
        return $data;
    }
    
    /**
     * Escape SQL identifier
     */
    public static function escapeSQLIdentifier($identifier) {
        return '`' . str_replace('`', '``', $identifier) . '`';
    }
    
    /**
     * Generate secure session ID
     */
    public static function generateSessionId() {
        return bin2hex(random_bytes(32));
    }
    
    /**
     * Create user session in database
     */
    public static function createUserSession($userId, $sessionId, $csrfToken) {
        try {
            $db = getDB();
            $expiresAt = date('Y-m-d H:i:s', time() + (24 * 60 * 60)); // 24 hours from now
            
            $db->execute(
                "INSERT INTO user_sessions (session_id, user_id, csrf_token, expires_at, ip_address, user_agent) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                [
                    $sessionId,
                    $userId,
                    $csrfToken,
                    $expiresAt,
                    self::getClientIP(),
                    $_SERVER['HTTP_USER_AGENT'] ?? ''
                ]
            );
            
            return true;
        } catch (Exception $e) {
            error_log("Failed to create user session: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Validate user session from database
     */
    public static function validateUserSession($sessionId) {
        try {
            $db = getDB();
            $result = $db->fetchRow(
                "SELECT user_id, csrf_token, expires_at FROM user_sessions 
                 WHERE session_id = ? AND expires_at > NOW()",
                [$sessionId]
            );
            
            if ($result) {
                // Update last activity
                $db->execute(
                    "UPDATE user_sessions SET last_activity = NOW() WHERE session_id = ?",
                    [$sessionId]
                );
                
                return $result;
            }
            
            return false;
        } catch (Exception $e) {
            error_log("Failed to validate user session: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Clean up old sessions
     */
    public static function cleanupOldSessions() {
        try {
            $db = getDB();
            $db->execute(
                "DELETE FROM user_sessions WHERE expires_at < NOW()"
            );
        } catch (Exception $e) {
            error_log("Failed to cleanup old sessions: " . $e->getMessage());
        }
    }
}

// Initialize security
Security::init();