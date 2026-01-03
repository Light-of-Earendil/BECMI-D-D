<?php
/**
 * BECMI D&D Character Manager - Forum Post Get Endpoint
 * 
 * Gets a single post with full details
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
    
    // Get post_id from query parameters
    $postId = isset($_GET['post_id']) ? (int) $_GET['post_id'] : null;
    
    if (!$postId) {
        Security::sendValidationErrorResponse(['post_id' => 'Post ID is required']);
    }
    
    // Get post with thread and category info
    $post = $db->selectOne(
        "SELECT 
            p.post_id,
            p.thread_id,
            p.user_id,
            p.post_content,
            p.is_edited,
            p.edited_at,
            p.edit_reason,
            p.created_at,
            p.updated_at,
            u.username,
            u.user_id as author_user_id,
            t.thread_title,
            t.is_locked,
            t.category_id,
            c.is_private as category_is_private
         FROM forum_posts p
         JOIN users u ON p.user_id = u.user_id
         JOIN forum_threads t ON p.thread_id = t.thread_id
         JOIN forum_categories c ON t.category_id = c.category_id
         WHERE p.post_id = ?",
        [$postId]
    );
    
    if (!$post) {
        Security::sendErrorResponse('Post not found', 404);
    }
    
    // Check private category access
    if ($post['category_is_private'] && !$isModerator) {
        Security::sendErrorResponse('Access denied to private category', 403);
    }
    
    // Format response
    $formatted = [
        'post_id' => (int) $post['post_id'],
        'thread' => [
            'thread_id' => (int) $post['thread_id'],
            'thread_title' => $post['thread_title'],
            'is_locked' => (bool) $post['is_locked']
        ],
        'author' => [
            'user_id' => (int) $post['author_user_id'],
            'username' => $post['username']
        ],
        'post_content' => $post['post_content'],
        'is_edited' => (bool) $post['is_edited'],
        'edited_at' => $post['edited_at'],
        'edit_reason' => $post['edit_reason'],
        'created_at' => $post['created_at'],
        'updated_at' => $post['updated_at'],
        'can_edit' => $post['author_user_id'] == $userId || $isModerator,
        'can_delete' => $post['author_user_id'] == $userId || $isModerator
    ];
    
    Security::sendSuccessResponse($formatted, 'Post retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum post get error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving post', 500);
}