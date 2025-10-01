<?php
/**
 * Complete a password reset using a selector/token pair.
 */

// Start output buffering to prevent any unwanted output
if (!ob_get_level()) {
    ob_start();
}

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Clear any output that might have been generated BEFORE initializing security
if (ob_get_level()) {
    ob_clean();
}

// Initialize security (CRITICAL: required for CSRF token generation and session)
// Must be called AFTER ob_clean() to ensure session headers are sent correctly
Security::init();

header('Content-Type: application/json');

try {
    // Log that we're starting the password reset process
    error_log("PASSWORD RESET: Starting password reset process");
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        error_log("PASSWORD RESET: Method not allowed - " . $_SERVER['REQUEST_METHOD']);
        Security::sendErrorResponse('Method not allowed', 405);
    }

    $input = Security::validateJSONInput();
    
    // CRITICAL: DO NOT sanitize selector and token - they are hex strings that must match exactly!
    // Sanitizing them with htmlspecialchars() will break the password_verify() comparison
    $selector = isset($input['selector']) ? trim($input['selector']) : '';
    $token = isset($input['token']) ? trim($input['token']) : '';
    $newPassword = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';
    
    // Log received data for debugging
    error_log("PASSWORD RESET RECEIVED - Selector: " . $selector . ", Token: " . $token);
    error_log("PASSWORD RESET - Selector length: " . strlen($selector) . ", Token length: " . strlen($token));

    $errors = [];

    if (empty($selector)) {
        $errors['selector'] = 'Reset selector is required';
    } elseif (!preg_match('/^[a-f0-9]{32}$/i', $selector)) {
        // Validate that selector is a 32-character hex string
        $errors['selector'] = 'Invalid reset selector format';
        error_log("PASSWORD RESET ERROR - Invalid selector format: " . $selector);
    }
    
    if (empty($token)) {
        $errors['token'] = 'Reset token is required';
    } elseif (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
        // Validate that token is a 64-character hex string
        $tokenLength = strlen($token);
        if ($tokenLength < 64) {
            $errors['token'] = 'Reset token is incomplete (received ' . $tokenLength . ' characters, expected 64). The link may have been broken across multiple lines in the email. Please copy the ENTIRE link.';
        } else {
            $errors['token'] = 'Invalid reset token format';
        }
        error_log("PASSWORD RESET ERROR - Invalid token format, length: " . $tokenLength . ", token: " . $token);
    }
    if (empty($newPassword)) {
        $errors['password'] = 'Password is required';
    }
    if ($newPassword !== $confirmPassword) {
        $errors['confirm_password'] = 'Passwords do not match';
    }
    if (!empty($newPassword) && !Security::validatePassword($newPassword)) {
        $errors['password'] = 'Password must be at least 8 characters with letters and numbers';
    }

    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }

    error_log("PASSWORD RESET: Getting database connection");
    $db = getDB();
    error_log("PASSWORD RESET: Database connection successful");

    $resetRecord = $db->selectOne(
        'SELECT pr.reset_id, pr.user_id, pr.token_hash, pr.expires_at, pr.used_at, u.username, u.email
         FROM password_resets pr
         INNER JOIN users u ON u.user_id = pr.user_id
         WHERE pr.selector = ?
         LIMIT 1',
        [$selector]
    );
    
    // Log database query result
    error_log("PASSWORD RESET RECORD: " . ($resetRecord ? "FOUND" : "NOT FOUND"));
    if ($resetRecord) {
        error_log("Reset record details - used_at: " . ($resetRecord['used_at'] ?? 'NULL') . ", expires_at: " . $resetRecord['expires_at']);
    }

    if (!$resetRecord || !empty($resetRecord['used_at']) || strtotime($resetRecord['expires_at']) < time()) {
        Security::sendErrorResponse('Reset link is invalid or has expired', 400);
    }

    if (!password_verify($token, $resetRecord['token_hash'])) {
        error_log("PASSWORD RESET: Token verification failed");
        Security::sendErrorResponse('Reset link is invalid or has expired', 400);
    }

    error_log("PASSWORD RESET: Token verified, proceeding with password update");
    
    try {
        $passwordHash = Security::hashPassword($newPassword);
        error_log("PASSWORD RESET: Password hashed successfully");
    } catch (Exception $e) {
        error_log("PASSWORD RESET FATAL: hashPassword failed: " . $e->getMessage());
        throw $e;
    }
    
    try {
        $db->execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?', [$passwordHash, $resetRecord['user_id']]);
        error_log("PASSWORD RESET: User password updated in database");
    } catch (Exception $e) {
        error_log("PASSWORD RESET FATAL: UPDATE users failed: " . $e->getMessage());
        throw $e;
    }

    // Invalidate token and existing sessions.
    try {
        $db->execute('UPDATE password_resets SET used_at = NOW() WHERE reset_id = ?', [$resetRecord['reset_id']]);
        error_log("PASSWORD RESET: Token marked as used");
    } catch (Exception $e) {
        error_log("PASSWORD RESET FATAL: UPDATE password_resets failed: " . $e->getMessage());
        throw $e;
    }
    
    try {
        $db->execute('DELETE FROM user_sessions WHERE user_id = ?', [$resetRecord['user_id']]);
        error_log("PASSWORD RESET: User sessions deleted");
    } catch (Exception $e) {
        // Session table may not exist yet - this is not critical, just log warning
        error_log("PASSWORD RESET WARNING: Could not delete user_sessions (table may not exist): " . $e->getMessage());
        // Don't throw - this is not a critical error
    }

    try {
        Security::logSecurityEvent('password_reset_completed', [
            'user_id' => $resetRecord['user_id'],
            'selector' => $selector
        ]);
        error_log("PASSWORD RESET: Security event logged");
    } catch (Exception $e) {
        error_log("PASSWORD RESET FATAL: logSecurityEvent failed: " . $e->getMessage());
        throw $e;
    }

    error_log("PASSWORD RESET: Sending success response");
    Security::sendSuccessResponse(null, 'Password updated successfully. You can now log in with your new password.');
} catch (Exception $e) {
    error_log('PASSWORD RESET ERROR: ' . $e->getMessage());
    error_log('PASSWORD RESET ERROR STACK TRACE: ' . $e->getTraceAsString());
    Security::sendErrorResponse('Unable to reset password', 500);
}
?>
