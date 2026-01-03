<?php
/**
 * BECMI D&D Character Manager - Email Queue Service
 * 
 * Service for adding emails to the queue for asynchronous sending.
 * 
 * @package app/services
 * @since 2.1.0
 */

require_once __DIR__ . '/../core/database.php';
require_once __DIR__ . '/email-service.php';

class EmailQueueService {
    
    /**
     * Add an email to the queue
     * 
     * @param string $recipientEmail Recipient email address
     * @param string $subject Email subject
     * @param string $bodyHtml HTML email body
     * @param string|null $bodyText Plain text email body (optional)
     * @param string $priority Priority: 'low', 'normal', 'high', 'urgent' (default: 'normal')
     * @param string|null $recipientName Recipient name (optional)
     * @param DateTime|null $scheduledAt Schedule email for specific time (null = send immediately)
     * @param int $maxAttempts Maximum send attempts (default: 3)
     * @return int|false Queue ID on success, false on failure
     * 
     * @example
     * $queueService = new EmailQueueService();
     * $queueId = $queueService->queueEmail(
     *     'user@example.com',
     *     'Welcome!',
     *     '<html><body><h1>Welcome!</h1></body></html>',
     *     'Welcome!',
     *     'normal',
     *     'John Doe',
     *     null, // Send immediately
     *     3
     * );
     */
    public function queueEmail(
        $recipientEmail,
        $subject,
        $bodyHtml,
        $bodyText = null,
        $priority = 'normal',
        $recipientName = null,
        $scheduledAt = null,
        $maxAttempts = 3
    ) {
        try {
            $db = getDB();
            
            // Validate priority
            $validPriorities = ['low', 'normal', 'high', 'urgent'];
            if (!in_array($priority, $validPriorities)) {
                $priority = 'normal';
            }
            
            // Format scheduled_at if provided
            $scheduledAtFormatted = null;
            if ($scheduledAt instanceof DateTime) {
                $scheduledAtFormatted = $scheduledAt->format('Y-m-d H:i:s');
            } elseif (is_string($scheduledAt)) {
                $scheduledAtFormatted = $scheduledAt;
            }
            
            // Insert into queue
            $queueId = $db->insert(
                "INSERT INTO email_queue (
                    recipient_email,
                    recipient_name,
                    subject,
                    body_html,
                    body_text,
                    priority,
                    status,
                    max_attempts,
                    scheduled_at,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())",
                [
                    $recipientEmail,
                    $recipientName,
                    $subject,
                    $bodyHtml,
                    $bodyText,
                    $priority,
                    $maxAttempts,
                    $scheduledAtFormatted
                ]
            );
            
            error_log("Email queued: ID {$queueId}, To: {$recipientEmail}, Subject: {$subject}");
            
            return $queueId;
            
        } catch (Exception $e) {
            error_log("Failed to queue email: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Queue a session reminder email
     * 
     * @param array $user User data with email and username
     * @param array $session Session data
     * @param DateTime|null $scheduledAt When to send (default: now)
     * @return int|false Queue ID on success, false on failure
     */
    public function queueSessionReminder($user, $session, $scheduledAt = null) {
        $emailService = new EmailService();
        
        // Use EmailService to generate the HTML template
        $reflection = new ReflectionClass($emailService);
        $method = $reflection->getMethod('renderSessionReminderTemplate');
        $method->setAccessible(true);
        $bodyHtml = $method->invoke($emailService, $user, $session);
        
        $subject = "Session Reminder: {$session['session_title']}";
        
        return $this->queueEmail(
            $user['email'],
            $subject,
            $bodyHtml,
            null, // No plain text version
            'normal',
            $user['username'] ?? null,
            $scheduledAt
        );
    }
    
    /**
     * Queue a session cancelled email
     * 
     * @param array $user User data
     * @param array $session Session data
     * @return int|false Queue ID on success, false on failure
     */
    public function queueSessionCancelled($user, $session) {
        $emailService = new EmailService();
        
        $reflection = new ReflectionClass($emailService);
        $method = $reflection->getMethod('renderSessionCancelledTemplate');
        $method->setAccessible(true);
        $bodyHtml = $method->invoke($emailService, $user, $session);
        
        $subject = "Session Cancelled: {$session['session_title']}";
        
        return $this->queueEmail(
            $user['email'],
            $subject,
            $bodyHtml,
            null,
            'normal',
            $user['username'] ?? null
        );
    }
    
    /**
     * Queue an XP awarded email
     * 
     * @param array $user User data
     * @param int $xpAmount XP amount
     * @param string $reason Reason for XP
     * @param bool $canLevelUp Whether character can level up
     * @return int|false Queue ID on success, false on failure
     */
    public function queueXPAwarded($user, $xpAmount, $reason, $canLevelUp = false) {
        $emailService = new EmailService();
        
        $reflection = new ReflectionClass($emailService);
        $method = $reflection->getMethod('renderXPAwardedTemplate');
        $method->setAccessible(true);
        $bodyHtml = $method->invoke($emailService, $user, $xpAmount, $reason, $canLevelUp);
        
        $subject = $canLevelUp ? 'Ready to Level Up!' : 'XP Awarded';
        $priority = $canLevelUp ? 'high' : 'normal';
        
        return $this->queueEmail(
            $user['email'],
            $subject,
            $bodyHtml,
            null,
            $priority,
            $user['username'] ?? null
        );
    }
    
    /**
     * Get queue statistics
     * 
     * @return array Statistics about the email queue
     */
    public function getQueueStats() {
        try {
            $db = getDB();
            
            $stats = $db->selectOne(
                "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN priority = 'urgent' AND status = 'pending' THEN 1 ELSE 0 END) as urgent_pending
                 FROM email_queue"
            );
            
            return [
                'total' => (int) ($stats['total'] ?? 0),
                'pending' => (int) ($stats['pending'] ?? 0),
                'processing' => (int) ($stats['processing'] ?? 0),
                'sent' => (int) ($stats['sent'] ?? 0),
                'failed' => (int) ($stats['failed'] ?? 0),
                'urgent_pending' => (int) ($stats['urgent_pending'] ?? 0)
            ];
            
        } catch (Exception $e) {
            error_log("Failed to get queue stats: " . $e->getMessage());
            return [
                'total' => 0,
                'pending' => 0,
                'processing' => 0,
                'sent' => 0,
                'failed' => 0,
                'urgent_pending' => 0
            ];
        }
    }
    
    /**
     * Clean up old sent/failed emails from queue
     * 
     * @param int $daysOld Delete emails older than this many days (default: 30)
     * @return int Number of emails deleted
     */
    public function cleanupOldEmails($daysOld = 30) {
        try {
            $db = getDB();
            
            $deleted = $db->execute(
                "DELETE FROM email_queue 
                 WHERE status IN ('sent', 'failed')
                 AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
                [$daysOld]
            );
            
            error_log("Cleaned up {$deleted} old emails from queue");
            
            return $deleted;
            
        } catch (Exception $e) {
            error_log("Failed to cleanup old emails: " . $e->getMessage());
            return 0;
        }
    }
}

