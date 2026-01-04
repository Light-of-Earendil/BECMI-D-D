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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    $input = Security::validateJSONInput();
    
    // CRITICAL: DO NOT sanitize selector and token - they are hex strings that must match exactly!
    $selector = isset($input['selector']) ? trim($input['selector']) : '';
    $token = isset($input['token']) ? trim($input['token']) : '';
    $newPassword = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';

    $errors = [];

    if (empty($selector)) {
        $errors['selector'] = 'Reset selector is required';
    } elseif (!preg_match('/^[a-f0-9]{32}$/i', $selector)) {
        $errors['selector'] = 'Invalid reset selector format';
    }
    
    if (empty($token)) {
        $errors['token'] = 'Reset token is required';
    } elseif (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
        $tokenLength = strlen($token);
        if ($tokenLength < 64) {
            $errors['token'] = 'Reset token is incomplete (received ' . $tokenLength . ' characters, expected 64). The link may have been broken across multiple lines in the email. Please copy the ENTIRE link.';
        } else {
            $errors['token'] = 'Invalid reset token format';
        }
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

    $db = getDB();

    $resetRecord = $db->selectOne(
        'SELECT pr.reset_id, pr.user_id, pr.token_hash, pr.expires_at, pr.used_at
         FROM password_resets pr
         WHERE pr.selector = ?
         LIMIT 1',
        [$selector]
    );

    if (!$resetRecord || !empty($resetRecord['used_at']) || strtotime($resetRecord['expires_at']) < time()) {
        Security::sendErrorResponse('Reset link is invalid or has expired', 400);
    }

    if (!password_verify($token, $resetRecord['token_hash'])) {
        Security::sendErrorResponse('Reset link is invalid or has expired', 400);
    }
    
    // Hash password and update database in one transaction for speed
    $passwordHash = Security::hashPassword($newPassword);
    
    // Begin transaction for atomic update
    $db->beginTransaction();
    
    try {
        // Update password - this is the critical operation that must be fast
        $db->execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?', [$passwordHash, $resetRecord['user_id']]);
        
        // Mark token as used
        $db->execute('UPDATE password_resets SET used_at = NOW() WHERE reset_id = ?', [$resetRecord['reset_id']]);
        
        // Delete user sessions (non-critical, so we don't fail if table doesn't exist)
        try {
            $db->execute('DELETE FROM user_sessions WHERE user_id = ?', [$resetRecord['user_id']]);
        } catch (Exception $e) {
            // Session table may not exist - not critical
        }
        
        // Commit transaction
        $db->commit();
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }

    // Log security event asynchronously (don't block response)
    try {
        Security::logSecurityEvent('password_reset_completed', [
            'user_id' => $resetRecord['user_id'],
            'selector' => $selector
        ]);
    } catch (Exception $e) {
        // Logging failure should not block the response
    }

    Security::sendSuccessResponse(null, 'Password updated successfully. You can now log in with your new password.');
} catch (Exception $e) {
    error_log('PASSWORD RESET ERROR: ' . $e->getMessage());
    Security::sendErrorResponse('Unable to reset password', 500);
}
?>
