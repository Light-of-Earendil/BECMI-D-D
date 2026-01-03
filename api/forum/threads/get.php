<?php
/**
 * BECMI D&D Character Manager - Forum Thread Get Endpoint
 * 
 * Gets a single thread with basic information
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    $db = getDB();
    $userId = Security::getCurrentUserId();
    $isModerator = Security::isModerator();
    
    // Get thread_id from query parameters
    $threadId = isset($_GET['thread_id']) ? (int) $_GET['thread_id'] : null;
    
    if (!$threadId) {
        Security::sendValidationErrorResponse(['thread_id' => 'Thread ID is required']);
    }
    
    // Get thread
    $thread = $db->selectOne(
        "SELECT 
            t.thread_id,
            t.category_id,
            t.user_id,
            t.thread_title,
            t.is_sticky,
            t.is_locked,
            t.is_private,
            t.view_count,
            t.post_count,
            t.last_post_id,
            t.last_post_at,
            t.created_at,
            t.updated_at,
            u.username,
            u.user_id as author_user_id,
            c.category_name,
            c.is_private as category_is_private
         FROM forum_threads t
         JOIN users u ON t.user_id = u.user_id
         JOIN forum_categories c ON t.category_id = c.category_id
         WHERE t.thread_id = ?",
        [$threadId]
    );
    
    if (!$thread) {
        Security::sendErrorResponse('Thread not found', 404);
    }
    
    // Check private category access
    if ($thread['category_is_private'] && !$isModerator) {
        Security::sendErrorResponse('Access denied to private category', 403);
    }
    
    // Increment view count
    $db->execute(
        "UPDATE forum_threads SET view_count = view_count + 1 WHERE thread_id = ?",
        [$threadId]
    );
    
    // Check if user is subscribed
    $subscription = $db->selectOne(
        "SELECT subscription_id FROM forum_thread_subscriptions 
         WHERE thread_id = ? AND user_id = ?",
        [$threadId, $userId]
    );
    
    // Format response
    $formatted = [
        'thread_id' => (int) $thread['thread_id'],
        'category' => [
            'category_id' => (int) $thread['category_id'],
            'category_name' => $thread['category_name']
        ],
        'author' => [
            'user_id' => (int) $thread['author_user_id'],
            'username' => $thread['username']
        ],
        'thread_title' => $thread['thread_title'],
        'is_sticky' => (bool) $thread['is_sticky'],
        'is_locked' => (bool) $thread['is_locked'],
        'is_private' => (bool) $thread['is_private'],
        'view_count' => (int) $thread['view_count'] + 1, // Include the increment
        'post_count' => (int) $thread['post_count'],
        'last_post_at' => $thread['last_post_at'],
        'created_at' => $thread['created_at'],
        'updated_at' => $thread['updated_at'],
        'is_subscribed' => !empty($subscription),
        'can_edit' => $thread['author_user_id'] == $userId || $isModerator,
        'can_delete' => $thread['author_user_id'] == $userId || $isModerator
    ];
    
    // Get last post info if exists
    if ($thread['last_post_id']) {
        $lastPost = $db->selectOne(
            "SELECT p.post_id, p.created_at, u.username, u.user_id
             FROM forum_posts p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.post_id = ?",
            [$thread['last_post_id']]
        );
        
        if ($lastPost) {
            $formatted['last_post'] = [
                'post_id' => (int) $lastPost['post_id'],
                'created_at' => $lastPost['created_at'],
                'author' => [
                    'user_id' => (int) $lastPost['user_id'],
                    'username' => $lastPost['username']
                ]
            ];
        }
    }
    
    Security::sendSuccessResponse($formatted, 'Thread retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum thread get error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving thread', 500);
}