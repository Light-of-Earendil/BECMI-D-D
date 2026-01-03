<?php
/**
 * BECMI D&D Character Manager - Email Queue Processor
 * 
 * Processes pending emails from the email queue.
 * Run this script via cron every 1-5 minutes:
 * 
 * Every minute:
 * */1 * * * * php /path/to/cron/process-email-queue.php >> /var/log/becmi-email-queue.log 2>&1
 * 
 * Every 5 minutes:
 * */5 * * * * php /path/to/cron/process-email-queue.php >> /var/log/becmi-email-queue.log 2>&1
 * 
 * Or call via URL (if web-accessible):
 * https://becmi.snilld-api.dk/cron/process-email-queue.php
 */

require_once __DIR__ . '/../app/core/database.php';
require_once __DIR__ . '/../app/services/email-service.php';

// Set execution time limit (5 minutes)
set_time_limit(300);

// Output buffering for web access
if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

$startTime = microtime(true);
$logPrefix = "[" . date('Y-m-d H:i:s') . "] ";

echo $logPrefix . "Starting email queue processor...\n";

try {
    $db = getDB();
    $emailService = new EmailService();
    
    // Configuration
    $batchSize = 10; // Process max 10 emails per run
    $maxProcessingTime = 240; // Max 4 minutes processing time
    
    // Get pending emails that are ready to send
    // (status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= NOW()))
    $pendingEmails = $db->select(
        "SELECT queue_id, recipient_email, recipient_name, subject, body_html, body_text,
                priority, attempts, max_attempts, scheduled_at
         FROM email_queue
         WHERE status = 'pending'
         AND (scheduled_at IS NULL OR scheduled_at <= NOW())
         ORDER BY 
             CASE priority
                 WHEN 'urgent' THEN 1
                 WHEN 'high' THEN 2
                 WHEN 'normal' THEN 3
                 WHEN 'low' THEN 4
             END ASC,
             created_at ASC
         LIMIT ?",
        [$batchSize]
    );
    
    $totalFound = count($pendingEmails);
    echo $logPrefix . "Found {$totalFound} pending email(s) to process\n";
    
    if ($totalFound === 0) {
        echo $logPrefix . "No emails to process. Exiting.\n";
        exit(0);
    }
    
    $processed = 0;
    $sent = 0;
    $failed = 0;
    
    foreach ($pendingEmails as $email) {
        // Check if we're running out of time
        $elapsed = microtime(true) - $startTime;
        if ($elapsed > $maxProcessingTime) {
            echo $logPrefix . "Max processing time reached. Stopping.\n";
            break;
        }
        
        $queueId = $email['queue_id'];
        $recipientEmail = $email['recipient_email'];
        $recipientName = $email['recipient_name'];
        $subject = $email['subject'];
        $bodyHtml = $email['body_html'];
        $bodyText = $email['body_text'];
        $attempts = (int) $email['attempts'];
        $maxAttempts = (int) $email['max_attempts'];
        
        echo $logPrefix . "Processing email #{$queueId} to {$recipientEmail}...\n";
        
        // Mark as processing
        $db->execute(
            "UPDATE email_queue 
             SET status = 'processing', 
                 attempts = attempts + 1,
                 updated_at = NOW()
             WHERE queue_id = ?",
            [$queueId]
        );
        
        try {
            // Send email using EmailService's public sendEmail method
            $success = $emailService->sendEmail(
                $recipientEmail,
                $subject,
                $bodyHtml
            );
            
            if ($success) {
                // Mark as sent
                $db->execute(
                    "UPDATE email_queue 
                     SET status = 'sent',
                         sent_at = NOW(),
                         updated_at = NOW()
                     WHERE queue_id = ?",
                    [$queueId]
                );
                
                echo $logPrefix . "  ✓ Email #{$queueId} sent successfully\n";
                $sent++;
            } else {
                // Mark as failed if max attempts reached
                if ($attempts + 1 >= $maxAttempts) {
                    $db->execute(
                        "UPDATE email_queue 
                         SET status = 'failed',
                             error_message = 'Max attempts reached',
                             updated_at = NOW()
                         WHERE queue_id = ?",
                        [$queueId]
                    );
                    echo $logPrefix . "  ✗ Email #{$queueId} failed (max attempts reached)\n";
                    $failed++;
                } else {
                    // Reset to pending for retry
                    $db->execute(
                        "UPDATE email_queue 
                         SET status = 'pending',
                             error_message = 'Send failed, will retry',
                             updated_at = NOW()
                         WHERE queue_id = ?",
                        [$queueId]
                    );
                    echo $logPrefix . "  ⚠ Email #{$queueId} failed, will retry (attempt {$attempts}/{$maxAttempts})\n";
                }
            }
            
        } catch (Exception $e) {
            $errorMessage = substr($e->getMessage(), 0, 500); // Limit error message length
            
            // Mark as failed if max attempts reached
            if ($attempts + 1 >= $maxAttempts) {
                $db->execute(
                    "UPDATE email_queue 
                     SET status = 'failed',
                         error_message = ?,
                         updated_at = NOW()
                     WHERE queue_id = ?",
                    [$errorMessage, $queueId]
                );
                echo $logPrefix . "  ✗ Email #{$queueId} failed with error: {$errorMessage}\n";
                $failed++;
            } else {
                // Reset to pending for retry
                $db->execute(
                    "UPDATE email_queue 
                     SET status = 'pending',
                         error_message = ?,
                         updated_at = NOW()
                     WHERE queue_id = ?",
                    [$errorMessage, $queueId]
                );
                echo $logPrefix . "  ⚠ Email #{$queueId} error, will retry: {$errorMessage}\n";
            }
        }
        
        $processed++;
    }
    
    $elapsed = round(microtime(true) - $startTime, 2);
    
    echo "\n" . $logPrefix . "Email queue processing completed\n";
    echo $logPrefix . "Summary:\n";
    echo $logPrefix . "  - Total found: {$totalFound}\n";
    echo $logPrefix . "  - Processed: {$processed}\n";
    echo $logPrefix . "  - Sent: {$sent}\n";
    echo $logPrefix . "  - Failed: {$failed}\n";
    echo $logPrefix . "  - Time elapsed: {$elapsed}s\n";
    
    exit(0);
    
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    echo $logPrefix . "ERROR: {$errorMessage}\n";
    error_log("Email queue processor error: {$errorMessage}");
    exit(1);
}

