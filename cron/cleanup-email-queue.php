<?php
/**
 * BECMI D&D Character Manager - Email Queue Cleanup
 * 
 * Removes old sent/failed emails from the queue.
 * Run this script daily via cron:
 * 
 * Daily at 2 AM:
 * 0 2 * * * php /path/to/cron/cleanup-email-queue.php >> /var/log/becmi-email-cleanup.log 2>&1
 */

require_once __DIR__ . '/../app/core/database.php';
require_once __DIR__ . '/../app/services/email-queue-service.php';

$logPrefix = "[" . date('Y-m-d H:i:s') . "] ";

echo $logPrefix . "Starting email queue cleanup...\n";

try {
    $queueService = new EmailQueueService();
    
    // Clean up emails older than 30 days
    $daysOld = 30;
    $deleted = $queueService->cleanupOldEmails($daysOld);
    
    echo $logPrefix . "Cleanup completed: {$deleted} email(s) deleted (older than {$daysOld} days)\n";
    
    exit(0);
    
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    echo $logPrefix . "ERROR: {$errorMessage}\n";
    error_log("Email queue cleanup error: {$errorMessage}");
    exit(1);
}
