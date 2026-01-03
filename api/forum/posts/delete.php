<?php
/**
 * BECMI D&D Character Manager - Forum Post Delete Endpoint
 * 
 * Deletes a post (author or moderator only)
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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
    
    // Get post_id from query parameters or JSON body
    $postId = null;
    
    if (isset($_GET['post_id'])) {
        $postId = (int) $_GET['post_id'];
    } else {
        $data = Security::validateJSONInput();
        if (isset($data['post_id'])) {
            $postId = (int) $data['post_id'];
        }
    }
    
    if (!$postId) {
        Security::sendValidationErrorResponse(['post_id' => 'Post ID is required']);
    }
    
    // Get post with thread info
    $post = $db->selectOne(
        "SELECT p.post_id, p.user_id, p.thread_id, t.category_id, t.post_count
         FROM forum_posts p
         JOIN forum_threads t ON p.thread_id = t.thread_id
         WHERE p.post_id = ?",
        [$postId]
    );
    
    if (!$post) {
        Security::sendErrorResponse('Post not found', 404);
    }
    
    // Check permissions (author or moderator)
    if ($post['user_id'] != $userId && !$isModerator) {
        Security::sendErrorResponse('You do not have permission to delete this post', 403);
    }
    
    $threadId = (int) $post['thread_id'];
    $categoryId = (int) $post['category_id'];
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Delete post edit history
        $db->execute(
            "DELETE FROM forum_post_edits WHERE post_id = ?",
            [$postId]
        );
        
        // Delete post (attachments would cascade here if implemented)
        $db->execute(
            "DELETE FROM forum_posts WHERE post_id = ?",
            [$postId]
        );
        
        // Update thread stats
        $db->execute(
            "UPDATE forum_threads 
             SET post_count = GREATEST(0, post_count - 1),
                 updated_at = NOW()
             WHERE thread_id = ?",
            [$threadId]
        );
        
        // Update thread last_post if this was the last post
        $lastPost = $db->selectOne(
            "SELECT post_id, created_at 
             FROM forum_posts 
             WHERE thread_id = ?
             ORDER BY created_at DESC 
             LIMIT 1",
            [$threadId]
        );
        
        if ($lastPost) {
            $db->execute(
                "UPDATE forum_threads 
                 SET last_post_id = ?, last_post_at = ?
                 WHERE thread_id = ?",
                [$lastPost['post_id'], $lastPost['created_at'], $threadId]
            );
        } else {
            // No posts left in thread
            $db->execute(
                "UPDATE forum_threads 
                 SET last_post_id = NULL, last_post_at = NULL
                 WHERE thread_id = ?",
                [$threadId]
            );
        }
        
        // Update category stats
        $db->execute(
            "UPDATE forum_categories 
             SET post_count = GREATEST(0, post_count - 1)
             WHERE category_id = ?",
            [$categoryId]
        );
        
        // Update category last_post if needed
        $lastPostCategory = $db->selectOne(
            "SELECT p.post_id, p.created_at 
             FROM forum_posts p
             JOIN forum_threads t ON p.thread_id = t.thread_id
             WHERE t.category_id = ?
             ORDER BY p.created_at DESC 
             LIMIT 1",
            [$categoryId]
        );
        
        if ($lastPostCategory) {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = ?, last_post_at = ?
                 WHERE category_id = ?",
                [$lastPostCategory['post_id'], $lastPostCategory['created_at'], $categoryId]
            );
        } else {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = NULL, last_post_at = NULL
                 WHERE category_id = ?",
                [$categoryId]
            );
        }
        
        // Commit transaction
        $db->commit();
        
        Security::sendSuccessResponse(null, 'Post deleted successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum post delete error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting post', 500);
}