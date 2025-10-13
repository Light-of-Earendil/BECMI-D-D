<?php
/**
 * BECMI D&D Character Manager - Email Service
 * 
 * Handles sending email notifications to users.
 * Uses PHP mail() function with HTML templates.
 */

class EmailService {
    private $fromEmail = 'no-reply@becmi.snilld-api.dk';
    private $fromName = 'BECMI Character Manager';
    
    /**
     * Send session reminder email
     * 
     * @param array $user - User data
     * @param array $session - Session data
     * @return bool Success status
     */
    public function sendSessionReminder($user, $session) {
        $subject = "Session Reminder: {$session['session_title']}";
        
        $body = $this->renderSessionReminderTemplate($user, $session);
        
        return $this->sendEmail($user['email'], $subject, $body);
    }
    
    /**
     * Send session cancelled email
     * 
     * @param array $user - User data
     * @param array $session - Session data
     * @return bool Success status
     */
    public function sendSessionCancelled($user, $session) {
        $subject = "Session Cancelled: {$session['session_title']}";
        
        $body = $this->renderSessionCancelledTemplate($user, $session);
        
        return $this->sendEmail($user['email'], $subject, $body);
    }
    
    /**
     * Send XP awarded notification
     * 
     * @param array $user - User data
     * @param int $xpAmount - XP amount
     * @param string $reason - Reason for XP
     * @param bool $canLevelUp - Whether character can level up
     * @return bool Success status
     */
    public function sendXPAwarded($user, $xpAmount, $reason, $canLevelUp = false) {
        $subject = $canLevelUp ? 'Ready to Level Up!' : 'XP Awarded';
        
        $body = $this->renderXPAwardedTemplate($user, $xpAmount, $reason, $canLevelUp);
        
        return $this->sendEmail($user['email'], $subject, $body);
    }
    
    /**
     * Send email using PHP mail()
     * 
     * @param string $to - Recipient email
     * @param string $subject - Email subject
     * @param string $body - Email body (HTML)
     * @return bool Success status
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
            <p>BECMI Character Manager - Your digital D&D companion</p>
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
            <p>BECMI Character Manager - Your digital D&D companion</p>
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
            <p>BECMI Character Manager - Your digital D&D companion</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
?>

