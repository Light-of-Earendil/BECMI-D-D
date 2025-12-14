<?php
/**
 * Password reset request endpoint.
 */

// Start output buffering to prevent any unwanted output
ob_start();

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security (required for CSRF token)
Security::init();

// Clear any output that might have been generated
ob_clean();

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    $input = Security::validateJSONInput();
    $email = isset($input['email']) ? Security::sanitizeInput($input['email']) : '';

    if (empty($email)) {
        Security::sendValidationErrorResponse(['email' => 'Email is required']);
    }

    if (!Security::validateEmail($email)) {
        Security::sendValidationErrorResponse(['email' => 'Please provide a valid email']);
    }

    // Rate limit the endpoint per IP.
    Security::checkRateLimit('password_request_' . Security::getClientIP(), 5, 900);

    $db = getDB();

    $user = $db->selectOne(
        'SELECT user_id, email, username FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
        [$email]
    );

    if ($user) {
        $selector = bin2hex(random_bytes(16));
        $token = bin2hex(random_bytes(32));
        
        // CRITICAL DEBUG: Verify token generation
        error_log("=== PASSWORD RESET TOKEN GENERATION DEBUG ===");
        error_log("Selector length: " . strlen($selector) . " (expected: 32)");
        error_log("Token length: " . strlen($token) . " (expected: 64)");
        error_log("Selector: " . $selector);
        error_log("Token: " . $token);
        
        if (strlen($selector) !== 32) {
            error_log("ERROR: Selector is not 32 characters!");
        }
        if (strlen($token) !== 64) {
            error_log("ERROR: Token is not 64 characters!");
        }
        
        $tokenHash = password_hash($token, PASSWORD_DEFAULT);
        // Expire after 24 hours instead of 1 hour to give users more time
        $expiresAt = date('Y-m-d H:i:s', time() + (24 * 3600));

        // Invalidate previous tokens for the user.
        $db->execute('DELETE FROM password_resets WHERE user_id = ?', [$user['user_id']]);

        $db->insert(
            'INSERT INTO password_resets (user_id, selector, token_hash, requested_by_ip, expires_at) VALUES (?, ?, ?, ?, ?)',
            [
                $user['user_id'],
                $selector,
                $tokenHash,
                Security::getClientIP(),
                $expiresAt
            ]
        );

        $baseUrl = Security::getBaseUrl();
        $resetLink = $baseUrl . '/public/index.html?password-reset=1&selector=' . $selector . '&token=' . $token;
        
        // Log the reset link for debugging
        error_log("PASSWORD RESET LINK LENGTH: " . strlen($resetLink));
        error_log("PASSWORD RESET LINK: " . $resetLink);
        error_log("PASSWORD RESET LINK (urlencode test): " . urlencode($resetLink));

        $subject = 'BECMI Manager Password Reset';
        
        // HTML email with clickable link (prevents line-wrapping issues)
        $htmlMessage = "<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0; font-size: 24px;'>Reset Your Password</h1>
    </div>
    
    <div style='background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;'>
        <p style='font-size: 16px; margin-bottom: 20px;'>Hello <strong>{$user['username']}</strong>,</p>
        
        <p style='font-size: 14px; margin-bottom: 20px;'>We received a request to reset your password for your BECMI Manager account.</p>
        
        <p style='font-size: 14px; margin-bottom: 30px;'>Click the button below to set a new password:</p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{$resetLink}' style='display: inline-block; background: #1e40af; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;'>Reset Password</a>
        </div>
        
        <p style='font-size: 12px; color: #64748b; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;'>
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href='{$resetLink}' style='color: #1e40af; word-break: break-all;'>{$resetLink}</a>
        </p>
        
        <p style='font-size: 12px; color: #64748b; margin-top: 20px;'>
            If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
        </p>
        
        <p style='font-size: 12px; color: #64748b; margin-top: 10px;'>
            <strong>This link will expire in 24 hours.</strong>
        </p>
    </div>
    
    <div style='text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #64748b;'>
        <p>BECMI Manager<br>Powered by BECMI Rules Cyclopedia</p>
    </div>
</body>
</html>";

        // Plain text fallback for email clients that don't support HTML
        $textMessage = "Hello {$user['username']},\n\n" .
            "We received a request to reset your password for your BECMI Manager account.\n\n" .
            "Click the link below to reset your password:\n" .
            "{$resetLink}\n\n" .
            "If you didn't request this password reset, you can safely ignore this email.\n\n" .
            "This link will expire in 24 hours.\n\n" .
            "BECMI Manager";

        // Send HTML email with plain text fallback
        $headers = [
            'MIME-Version' => '1.0',
            'Content-Type' => 'multipart/alternative; boundary="' . md5(time()) . '"'
        ];
        
        $boundary = md5(time());
        $multipartMessage = "--{$boundary}\r\n" .
            "Content-Type: text/plain; charset=UTF-8\r\n" .
            "Content-Transfer-Encoding: 7bit\r\n\r\n" .
            $textMessage . "\r\n\r\n" .
            "--{$boundary}\r\n" .
            "Content-Type: text/html; charset=UTF-8\r\n" .
            "Content-Transfer-Encoding: 7bit\r\n\r\n" .
            $htmlMessage . "\r\n\r\n" .
            "--{$boundary}--";

        Security::sendEmail($user['email'], $subject, $multipartMessage, $headers);
        Security::logSecurityEvent('password_reset_requested', [
            'user_id' => $user['user_id'],
            'selector' => $selector,
            'expires_at' => $expiresAt
        ]);
    }

    // Always respond with success to avoid account enumeration.
    Security::sendSuccessResponse(null, 'If the email exists in our records, a reset link has been sent.');
} catch (Exception $e) {
    error_log('Password reset request error: ' . $e->getMessage());
    Security::sendErrorResponse('Unable to process password reset request', 500);
}
?>
