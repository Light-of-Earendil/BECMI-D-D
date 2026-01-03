<?php
/**
 * BECMI D&D Character Manager - Forum Post Edit History Endpoint
 * 
 * Gets the edit history for a post
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
    $isModerator = Security::isModerator();
    
    // Get post_id from query parameters
    $postId = isset($_GET['post_id']) ? (int) $_GET['post_id'] : null;
    
    if (!$postId) {
        Security::sendValidationErrorResponse(['post_id' => 'Post ID is required']);
    }
    
    // Get post to check access
    $post = $db->selectOne(
        "SELECT p.post_id, p.user_id, t.category_id, c.is_private as category_is_private
         FROM forum_posts p
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
    
    // Get edit history (ordered by most recent first)
    $editHistory = $db->select(
        "SELECT 
            e.edit_id,
            e.post_id,
            e.user_id,
            e.old_content,
            e.edit_reason,
            e.edited_at,
            u.username
         FROM forum_post_edits e
         JOIN users u ON e.user_id = u.user_id
         WHERE e.post_id = ?
         ORDER BY e.edited_at DESC",
        [$postId]
    );
    
    // Format edit history
    $formattedHistory = array_map(function($edit) {
        return [
            'edit_id' => (int) $edit['edit_id'],
            'post_id' => (int) $edit['post_id'],
            'editor' => [
                'user_id' => (int) $edit['user_id'],
                'username' => $edit['username']
            ],
            'old_content' => $edit['old_content'],
            'edit_reason' => $edit['edit_reason'],
            'edited_at' => $edit['edited_at']
        ];
    }, $editHistory);
    
    // Get current post content
    $currentPost = $db->selectOne(
        "SELECT post_content, is_edited, edited_at, edit_reason, created_at
         FROM forum_posts 
         WHERE post_id = ?",
        [$postId]
    );
    
    Security::sendSuccessResponse([
        'post_id' => $postId,
        'current_content' => $currentPost['post_content'],
        'is_edited' => (bool) $currentPost['is_edited'],
        'last_edited_at' => $currentPost['edited_at'],
        'last_edit_reason' => $currentPost['edit_reason'],
        'created_at' => $currentPost['created_at'],
        'edit_history' => $formattedHistory,
        'edit_count' => count($formattedHistory)
    ], 'Edit history retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum post edit history error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving edit history', 500);
}