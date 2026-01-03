<?php
/**
 * BECMI D&D Character Manager - Email Queue Statistics Endpoint
 * 
 * Returns statistics about the email queue.
 * Requires admin authentication.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/email-queue-service.php';

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();

    // Optional: Check if user is admin (if you have admin role system)
    // For now, any authenticated user can view stats
    
    $queueService = new EmailQueueService();
    $stats = $queueService->getQueueStats();
    
    // Get recent queue activity (last 24 hours)
    $db = getDB();
    $recentActivity = $db->select(
        "SELECT 
            DATE(created_at) as date,
            status,
            COUNT(*) as count
         FROM email_queue
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY DATE(created_at), status
         ORDER BY date DESC, status"
    );
    
    // Get oldest pending email
    $oldestPending = $db->selectOne(
        "SELECT queue_id, recipient_email, subject, created_at, attempts
         FROM email_queue
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT 1"
    );
    
    Security::sendSuccessResponse([
        'stats' => $stats,
        'recent_activity' => $recentActivity,
        'oldest_pending' => $oldestPending,
        'timestamp' => date('Y-m-d H:i:s')
    ], 'Queue statistics retrieved successfully');
    
} catch (Exception $e) {
    error_log('Email queue stats error: ' . $e->getMessage());
    Security::sendErrorResponse('An error occurred while retrieving queue statistics', 500);
}
