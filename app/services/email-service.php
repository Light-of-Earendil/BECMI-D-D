<?php
/**
 * BECMI D&D Character Manager - Email Service
 * 
 * Handles sending email notifications to users.
 * Uses PHP mail() function with HTML templates.
 * 
 * @package app/services
 * @since 1.0.0
 */
class EmailService {
    /**
     * @var string From email address
     */
    private $fromEmail = 'no-reply@becmi.snilld-api.dk';
    
    /**
     * @var string From name
     */
    private $fromName = 'BECMI Manager';
    
    /**
     * Send session reminder email to user.
     * 
     * @param array $user User data array with:
     *   - `email` (string) - User email address
     *   - `username` (string) - Username (optional, for personalization)
     * @param array $session Session data array with:
     *   - `session_title` (string) - Session title
     *   - `session_datetime` (string) - Session date/time
     *   - Other session metadata
     * @return bool Success status (true on success, false on failure)
     * 
     * @example
     * // Send reminder for upcoming session
     * $emailService = new EmailService();
     * $success = $emailService->sendSessionReminder($user, $session);
     * 
     * **Email Content:**
     * - Subject: "Session Reminder: {session_title}"
     * - Body: HTML template with session details
     * 
     * **Called From:**
     * - Cron job (`send-session-reminders.php`) - Sends reminders for upcoming sessions
     * 
     * @see renderSessionReminderTemplate() - Generates email HTML
     * @see sendEmail() - Actual email sending implementation
     * 
     * @since 1.0.0
     */
    public function sendSessionReminder($user, $session) {
        $subject = "Session Reminder: {$session['session_title']}";
        
        $body = $this->renderSessionReminderTemplate($user, $session);
        
        return $this->sendEmail($user['email'], $subject, $body);
    }
    
    /**
     * Send session cancelled notification email to user.
     * 
     * @param array $user User data array with:
     *   - `email` (string) - User email address
     *   - `username` (string) - Username (optional)
     * @param array $session Session data array with:
     *   - `session_title` (string) - Session title
     *   - `session_datetime` (string) - Session date/time
     *   - Other session metadata
     * @return bool Success status (true on success, false on failure)
     * 
     * @example
     * // Send cancellation notice
     * $emailService = new EmailService();
     * $success = $emailService->sendSessionCancelled($user, $session);
     * 
     * **Email Content:**
     * - Subject: "Session Cancelled: {session_title}"
     * - Body: HTML template with cancellation notice
     * 
     * **Called From:**
     * - Session deletion/update endpoints - When session is cancelled
     * 
     * @see renderSessionCancelledTemplate() - Generates email HTML
     * @see sendEmail() - Actual email sending implementation
     * 
     * @since 1.0.0
     */
    public function sendSessionCancelled($user, $session) {
        $subject = "Session Cancelled: {$session['session_title']}";
        
        $body = $this->renderSessionCancelledTemplate($user, $session);
        
        return $this->sendEmail($user['email'], $subject, $body);
    }
    
    /**
     * Send XP awarded notification email to user.
     * 
     * @param array $user User data array with:
     *   - `email` (string) - User email address
     *   - `username` (string) - Username (optional)
     * @param int $xpAmount XP amount awarded
     * @param string $reason Reason for XP award (e.g., "Combat victory", "Quest completion")
     * @param bool $canLevelUp Whether character can level up with this XP (default: false)
     * @return bool Success status (true on success, false on failure)
     * 
     * @example
     * // Send XP notification
     * $emailService = new EmailService();
     * $success = $emailService->sendXPAwarded($user, 500, 'Defeated dragon', true);
     * 
     * **Email Content:**
     * - Subject: "Ready to Level Up!" (if canLevelUp) or "XP Awarded"
     * - Body: HTML template with XP amount, reason, and level up information
     * 
     * **Called From:**
     * - `/api/character/grant-xp.php` - After XP is granted to character
     * 
     * @see renderXPAwardedTemplate() - Generates email HTML
     * @see sendEmail() - Actual email sending implementation
     * 
     * @since 1.0.0
     */
    public function sendXPAwarded($user, $xpAmount, $reason, $canLevelUp = false) {
        $subject = $canLevelUp ? 'Ready to Level Up!' : 'XP Awarded';
        
        $body = $this->renderXPAwardedTemplate($user, $xpAmount, $reason, $canLevelUp);
        
        return $this->sendEmail($user['email'], $subject, $body);
    }
    
    /**
     * Send email using PHP mail() function.
     * Private method used by all public email methods.
     * 
     * @param string $to Recipient email address
     * @param string $subject Email subject line
     * @param string $body Email body (HTML format)
     * @return bool Success status (true on success, false on failure)
     * 
     * @example
     * // Called internally by public methods
     * $success = $this->sendEmail('user@example.com', 'Subject', '<html>Body</html>');
     * 
     * **Email Headers:**
     * - From: BECMI Manager <no-reply@becmi.snilld-api.dk>
     * - Reply-To: no-reply@becmi.snilld-api.dk
     * - MIME-Version: 1.0
     * - Content-Type: text/html; charset=UTF-8
     * - X-Mailer: PHP/{version}
     * 
     * **Error Handling:**
     * - Success/failure logged to error_log
     * - Returns boolean success status
     * 
     * @see sendSessionReminder() - Calls this
     * @see sendSessionCancelled() - Calls this
     * @see sendXPAwarded() - Calls this
     * 
     * @since 1.0.0
     */
    private function sendEmail($to, $subject, $body) {
        try {
            $headers = [
                "From: {$this->fromName} <{$this->fromEmail}>",
                "Reply-To: {$this->fromEmail}",
                "MIME-Version: 1.0",
                "Content-Type: text/html; charset=UTF-8",
                "X-Mailer: PHP/" . phpversion()
            ];
            
            $headersString = implode("\r\n", $headers);
            
            $success = mail($to, $subject, $body, $headersString);
            
            if ($success) {
                error_log("Email sent successfully to: $to");
            } else {
                error_log("Failed to send email to: $to");
            }
            
            return $success;
            
        } catch (Exception $e) {
            error_log("Email error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Render session reminder email template
     */
    private function renderSessionReminderTemplate($user, $session) {
        $sessionDate = date('l, F j, Y', strtotime($session['session_datetime']));
        $sessionTime = date('g:i A', strtotime($session['session_datetime']));
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎲 Session Reminder</h1>
        </div>
        <div class="content">
            <h2>Hello {$user['username']},</h2>
            <p>This is a reminder that your D&D session is coming up soon!</p>
            
            <h3>Session Details:</h3>
            <ul>
                <li><strong>Title:</strong> {$session['session_title']}</li>
                <li><strong>Date:</strong> {$sessionDate}</li>
                <li><strong>Time:</strong> {$sessionTime}</li>
                <li><strong>Duration:</strong> {$session['duration_minutes']} minutes</li>
            </ul>
            
            <p>Make sure your character is ready and you have your dice prepared!</p>
            
            <a href="https://becmi.snilld-api.dk/" class="button">View Session</a>
        </div>
        <div class="footer">
            <p>BECMI Manager - Your digital D&D companion</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
    
    /**
     * Render session cancelled email template
     */
    private function renderSessionCancelledTemplate($user, $session) {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Session Cancelled</h1>
        </div>
        <div class="content">
            <h2>Hello {$user['username']},</h2>
            <p>Unfortunately, the following session has been cancelled:</p>
            
            <h3>Session Details:</h3>
            <ul>
                <li><strong>Title:</strong> {$session['session_title']}</li>
                <li><strong>Scheduled Date:</strong> {$session['session_datetime']}</li>
            </ul>
            
            <p>Please check the platform for any updates or rescheduled sessions.</p>
        </div>
        <div class="footer">
            <p>BECMI Manager - Your digital D&D companion</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
    
    /**
     * Render XP awarded email template
     */
    private function renderXPAwardedTemplate($user, $xpAmount, $reason, $canLevelUp) {
        $levelUpSection = $canLevelUp ? <<<HTML
            <div style="background: #059669; color: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h3 style="margin: 0;">🎉 Ready to Level Up!</h3>
                <p style="margin: 10px 0 0 0;">You have enough XP to level up your character!</p>
            </div>
HTML
 : '';
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8fafc; }
        .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⭐ Experience Points Awarded</h1>
        </div>
        <div class="content">
            <h2>Hello {$user['username']},</h2>
            <p>You have been awarded <strong>{$xpAmount} XP</strong>!</p>
            <p><strong>Reason:</strong> {$reason}</p>
            
            {$levelUpSection}
            
            <a href="https://becmi.snilld-api.dk/" class="button">View Your Character</a>
        </div>
        <div class="footer">
            <p>BECMI Manager - Your digital D&D companion</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
?>

