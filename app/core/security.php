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
            // CRITICAL: Check if headers are already sent - if so, we CANNOT start a session
            if (headers_sent($file, $line)) {
                // Headers already sent - log error and return without starting session
                error_log("SECURITY ERROR: Cannot start session - headers already sent. File: {$file}, Line: {$line}");
                return;
            }
            
            // Start output buffering before session start to prevent output issues
            if (!ob_get_level()) {
                ob_start();
            }
            
            // Check if there's already a session cookie - if so, try to use it WITHOUT changing cookie params
            $hasExistingSession = isset($_COOKIE[session_name()]) && !empty($_COOKIE[session_name()]);
            
            if ($hasExistingSession) {
                // There's an existing session cookie - try to restore it WITHOUT changing cookie params
                // This is critical: if we change cookie params, session_start() will fail to restore the session
                $sessionId = $_COOKIE[session_name()];
                
                // #region agent log
                $logData = [
                    'location' => 'security.php:26',
                    'message' => 'Attempting to restore existing session',
                    'data' => [
                        'session_id_from_cookie' => $sessionId,
                        'has_output' => ob_get_level() > 0 ? ob_get_length() : 0,
                        'headers_sent' => headers_sent($file, $line) ? ['file' => $file, 'line' => $line] : false
                    ],
                    'timestamp' => round(microtime(true) * 1000),
                    'sessionId' => 'debug-session',
                    'runId' => 'run1',
                    'hypothesisId' => 'E'
                ];
                $logPath = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
                $logDir = dirname($logPath);
                if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
                @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
                // #endregion
                
                session_id($sessionId);
                
                // Try to start session with existing cookie params (don't change them)
                $sessionStarted = @session_start();
                
                // #region agent log
                $logData = [
                    'location' => 'security.php:47',
                    'message' => 'After session_start() attempt',
                    'data' => [
                        'session_start_returned' => $sessionStarted,
                        'session_status' => session_status(),
                        'session_id' => session_id() ?: 'NO SESSION',
                        'has_user_id' => isset($_SESSION['user_id']),
                        'user_id' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET'
                    ],
                    'timestamp' => round(microtime(true) * 1000),
                    'sessionId' => 'debug-session',
                    'runId' => 'run1',
                    'hypothesisId' => 'E'
                ];
                @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
                // #endregion
                
                // If session started successfully and has user_id, we're done
                if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['user_id'])) {
                    // Session restored successfully - update CSRF token if needed
                    if (!isset($_SESSION['csrf_token'])) {
                        $_SESSION['csrf_token'] = self::generateCSRFToken();
                    }
                    self::$csrfToken = $_SESSION['csrf_token'];
                    return;
                }
                
                // Session didn't start or doesn't have user_id - close it and start fresh
                if (session_status() === PHP_SESSION_ACTIVE) {
                    session_write_close();
                }
            }
            
            // No existing session or restore failed - set up new session with proper cookie params
            // Set session cookie parameters to ensure cookies are sent with cross-origin requests
            // SameSite=None requires Secure flag (HTTPS)
            $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
            $sameSite = $isSecure ? 'None' : 'Lax'; // None requires Secure, Lax is safer for non-HTTPS
            
            // Get current cookie parameters
            $cookieParams = session_get_cookie_params();
            
            // Set cookie parameters BEFORE session_start (must be called before)
            session_set_cookie_params([
                'lifetime' => $cookieParams['lifetime'] ?: 0, // 0 = until browser closes
                'path' => $cookieParams['path'] ?: '/',
                'domain' => $cookieParams['domain'] ?: '',
                'secure' => $isSecure,
                'httponly' => true,
                'samesite' => $sameSite
            ]);
            
            // Also set via ini_set for compatibility
            ini_set('session.cookie_httponly', 1);
            ini_set('session.cookie_secure', $isSecure ? 1 : 0);
            ini_set('session.use_strict_mode', 1);
            ini_set('session.cookie_samesite', $sameSite);
            
            // Start session
            @session_start();
            
            // #region agent log
            $logData = [
                'location' => 'security.php:27',
                'message' => 'After session_start()',
                'data' => [
                    'session_id' => session_id() ?: 'NO SESSION',
                    'session_status' => session_status(),
                    'cookie_params' => session_get_cookie_params(),
                    'user_id_in_session' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET',
                    'session_keys' => isset($_SESSION) ? array_keys($_SESSION) : [],
                    'cookie_header' => isset($_SERVER['HTTP_COOKIE']) ? substr($_SERVER['HTTP_COOKIE'], 0, 200) : 'NOT SET'
                ],
                'timestamp' => round(microtime(true) * 1000),
                'sessionId' => 'debug-session',
                'runId' => 'run1',
                'hypothesisId' => 'C'
            ];
            $logPath = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
            $logDir = dirname($logPath);
            if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
            @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
            // #endregion
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
     * Sanitize HTML content for forum posts
     * Allows safe HTML tags and attributes
     */
    public static function sanitizeForumHtml($html) {
        if (empty($html)) {
            return '';
        }
        
        // Remove null bytes
        $html = str_replace("\0", '', $html);
        
        // Allowed HTML tags
        $allowedTags = '<p><br><strong><b><em><i><u><ul><ol><li><h1><h2><h3><h4><h5><h6><pre><code><a><blockquote>';
        
        // Strip disallowed tags
        $html = strip_tags($html, $allowedTags);
        
        // Clean up attributes - only allow href and target on links
        $html = preg_replace_callback('/<a\s+([^>]*)>/i', function($matches) {
            $attrs = $matches[1];
            $href = '';
            $target = '';
            
            // Extract href
            if (preg_match('/href=["\']([^"\']*)["\']/i', $attrs, $hrefMatch)) {
                $url = $hrefMatch[1];
                // Validate URL
                if (filter_var($url, FILTER_VALIDATE_URL) || preg_match('/^\/|^#/', $url)) {
                    $href = 'href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '"';
                }
            }
            
            // Extract target if present
            if (preg_match('/target=["\']([^"\']*)["\']/i', $attrs, $targetMatch)) {
                $targetValue = strtolower($targetMatch[1]);
                if (in_array($targetValue, ['_blank', '_self', '_parent', '_top'])) {
                    $target = 'target="' . htmlspecialchars($targetValue, ENT_QUOTES, 'UTF-8') . '" rel="noopener"';
                }
            } else if ($href) {
                // If href exists but no target, add target="_blank" for external links
                if (preg_match('/^https?:\/\//', $href)) {
                    $target = 'target="_blank" rel="noopener"';
                }
            }
            
            $result = '<a';
            if ($href) $result .= ' ' . $href;
            if ($target) $result .= ' ' . $target;
            $result .= '>';
            
            return $result;
        }, $html);
        
        // Remove any remaining attributes from other tags
        $html = preg_replace('/<(?!a\s)([a-z]+)\s+[^>]*>/i', '<$1>', $html);
        
        return trim($html);
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
        // Normalize header keys to handle both 'Content-Type' and 'Content-type'
        $normalizedHeaders = [];
        foreach ($headers as $key => $value) {
            $normalizedKey = ucwords(strtolower(str_replace('-', '-', $key)), '-');
            // Handle special case for Content-Type
            if (stripos($key, 'content-type') !== false || stripos($key, 'content-type') !== false) {
                $normalizedKey = 'Content-Type';
            }
            $normalizedHeaders[$normalizedKey] = $value;
        }
        
        $defaultHeaders = [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'From' => $_ENV['MAIL_FROM'] ?? 'no-reply@' . (explode(':', $_SERVER['HTTP_HOST'] ?? 'localhost')[0])
        ];

        // Merge with normalized headers (normalized headers take precedence)
        $merged = array_merge($defaultHeaders, $normalizedHeaders);
        
        // If Content-Type contains 'html', ensure it's set correctly
        if (isset($merged['Content-Type']) && stripos($merged['Content-Type'], 'html') !== false) {
            $merged['Content-Type'] = 'text/html; charset=UTF-8';
        }
        
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
        $result = isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
        
        // #region agent log
        $logData = [
            'location' => 'security.php:254',
            'message' => 'isAuthenticated() check',
            'data' => [
                'result' => $result,
                'has_user_id_key' => isset($_SESSION['user_id']),
                'user_id_value' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET',
                'user_id_empty' => isset($_SESSION['user_id']) ? empty($_SESSION['user_id']) : 'N/A',
                'session_id' => session_id() ?: 'NO SESSION',
                'session_keys' => isset($_SESSION) ? array_keys($_SESSION) : []
            ],
            'timestamp' => round(microtime(true) * 1000),
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'D'
        ];
        file_put_contents('M:\\rpg\\BECMI VTT\\.cursor\\debug.log', json_encode($logData) . "\n", FILE_APPEND);
        // #endregion
        
        return $result;
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
     * Check if current user is a moderator
     * 
     * @return bool True if user is authenticated and is a moderator
     */
    public static function isModerator() {
        if (!self::isAuthenticated()) {
            return false;
        }
        
        $userId = self::getCurrentUserId();
        if (!$userId) {
            return false;
        }
        
        try {
            require_once __DIR__ . '/database.php';
            $db = getDB();
            
            $user = $db->selectOne(
                "SELECT is_moderator FROM users WHERE user_id = ? AND is_active = 1",
                [$userId]
            );
            
            return $user && (bool) $user['is_moderator'];
        } catch (Exception $e) {
            error_log("Error checking moderator status: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Require moderator status
     * Sends 403 Forbidden response if user is not a moderator
     */
    public static function requireModerator() {
        if (!self::isModerator()) {
            self::sendForbiddenResponse();
        }
    }
    
    /**
     * Check if current user is banned
     * 
     * @return bool True if user is banned (and ban hasn't expired)
     */
    public static function isBanned() {
        if (!self::isAuthenticated()) {
            return false;
        }
        
        $userId = self::getCurrentUserId();
        if (!$userId) {
            return false;
        }
        
        try {
            require_once __DIR__ . '/database.php';
            $db = getDB();
            
            $user = $db->selectOne(
                "SELECT is_banned, ban_expires_at FROM users WHERE user_id = ?",
                [$userId]
            );
            
            if (!$user || !$user['is_banned']) {
                return false;
            }
            
            // Check if ban has expired
            if ($user['ban_expires_at']) {
                $expiresAt = new DateTime($user['ban_expires_at']);
                $now = new DateTime();
                if ($expiresAt < $now) {
                    // Ban expired, update user record
                    $db->execute(
                        "UPDATE users SET is_banned = FALSE, ban_expires_at = NULL WHERE user_id = ?",
                        [$userId]
                    );
                    return false;
                }
            }
            
            return true;
        } catch (Exception $e) {
            error_log("Error checking ban status: " . $e->getMessage());
            return false;
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
        // Clear any output buffers first
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        
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
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    /**
     * Send error response
     */
    public static function sendErrorResponse($message = 'An error occurred', $code = 500) {
        // Clear any output buffers first
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => $message,
            'code' => 'ERROR'
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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