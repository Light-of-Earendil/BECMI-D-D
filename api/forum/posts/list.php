<?php
/**
 * BECMI D&D Character Manager - Forum Posts List Endpoint
 * 
 * Lists posts in a thread with pagination
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
    
    // Get query parameters
    $threadId = isset($_GET['thread_id']) ? (int) $_GET['thread_id'] : null;
    $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
    $perPage = isset($_GET['per_page']) ? min(100, max(1, (int) $_GET['per_page'])) : 20;
    
    // Validate thread_id
    if (!$threadId) {
        Security::sendValidationErrorResponse(['thread_id' => 'Thread ID is required']);
    }
    
    // Check if thread exists and user has access
    $thread = $db->selectOne(
        "SELECT t.thread_id, t.is_locked, t.category_id, c.is_private as category_is_private
         FROM forum_threads t
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
    
    // Get total count
    $totalCount = $db->selectOne(
        "SELECT COUNT(*) as count FROM forum_posts WHERE thread_id = ?",
        [$threadId]
    )['count'];
    
    // Calculate pagination
    $offset = ($page - 1) * $perPage;
    $totalPages = ceil($totalCount / $perPage);
    
    // Get posts (ordered by creation time, oldest first)
    $posts = $db->select(
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
            u.user_id as author_user_id
         FROM forum_posts p
         JOIN users u ON p.user_id = u.user_id
         WHERE p.thread_id = ?
         ORDER BY p.created_at ASC
         LIMIT ? OFFSET ?",
        [$threadId, $perPage, $offset]
    );
    
    // Format posts
    $formattedPosts = array_map(function($post) use ($userId, $isModerator) {
        return [
            'post_id' => (int) $post['post_id'],
            'thread_id' => (int) $post['thread_id'],
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
            'can_delete' => $post['author_user_id'] == $userId || $isModerator,
            'attachments' => [] // Will be loaded separately
        ];
    }, $posts);
    
    Security::sendSuccessResponse([
        'posts' => $formattedPosts,
        'thread' => [
            'thread_id' => (int) $thread['thread_id'],
            'is_locked' => (bool) $thread['is_locked']
        ],
        'pagination' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => (int) $totalCount,
            'total_pages' => $totalPages
        ]
    ], 'Posts retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum posts list error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving posts', 500);
}