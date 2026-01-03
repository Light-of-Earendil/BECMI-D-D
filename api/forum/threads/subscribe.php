<?php
/**
 * BECMI D&D Character Manager - Forum Thread Subscribe Endpoint
 * 
 * Subscribes or unsubscribes a user to a thread
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    // Validate required fields
    if (empty($data['thread_id'])) {
        Security::sendValidationErrorResponse(['thread_id' => 'Thread ID is required']);
    }
    
    $threadId = (int) $data['thread_id'];
    $subscribe = isset($data['subscribe']) ? (bool) $data['subscribe'] : true;
    
    // Check if thread exists
    $thread = $db->selectOne(
        "SELECT thread_id FROM forum_threads WHERE thread_id = ?",
        [$threadId]
    );
    
    if (!$thread) {
        Security::sendErrorResponse('Thread not found', 404);
    }
    
    // Check current subscription status
    $subscription = $db->selectOne(
        "SELECT subscription_id FROM forum_thread_subscriptions 
         WHERE thread_id = ? AND user_id = ?",
        [$threadId, $userId]
    );
    
    $isSubscribed = !empty($subscription);
    
    if ($subscribe && !$isSubscribed) {
        // Subscribe
        $db->insert(
            "INSERT INTO forum_thread_subscriptions (thread_id, user_id, subscribed_at)
             VALUES (?, ?, NOW())",
            [$threadId, $userId]
        );
        $message = 'Subscribed to thread successfully';
    } elseif (!$subscribe && $isSubscribed) {
        // Unsubscribe
        $db->execute(
            "DELETE FROM forum_thread_subscriptions 
             WHERE thread_id = ? AND user_id = ?",
            [$threadId, $userId]
        );
        $message = 'Unsubscribed from thread successfully';
    } else {
        // Already in desired state
        $message = $subscribe ? 'Already subscribed to thread' : 'Not subscribed to thread';
    }
    
    Security::sendSuccessResponse([
        'thread_id' => $threadId,
        'is_subscribed' => $subscribe ? true : false
    ], $message);
    
} catch (Exception $e) {
    error_log('Forum thread subscribe error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while subscribing/unsubscribing to thread', 500);
}