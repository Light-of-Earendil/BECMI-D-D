<?php
/**
 * BECMI D&D Character Manager - Forum Thread Delete Endpoint
 * 
 * Deletes a thread (author or moderator only)
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
    
    // Get thread_id from query parameters or JSON body
    $threadId = null;
    
    if (isset($_GET['thread_id'])) {
        $threadId = (int) $_GET['thread_id'];
    } else {
        $data = Security::validateJSONInput();
        if (isset($data['thread_id'])) {
            $threadId = (int) $data['thread_id'];
        }
    }
    
    if (!$threadId) {
        Security::sendValidationErrorResponse(['thread_id' => 'Thread ID is required']);
    }
    
    // Get thread
    $thread = $db->selectOne(
        "SELECT thread_id, user_id, category_id, post_count
         FROM forum_threads 
         WHERE thread_id = ?",
        [$threadId]
    );
    
    if (!$thread) {
        Security::sendErrorResponse('Thread not found', 404);
    }
    
    // Check permissions (author or moderator)
    if ($thread['user_id'] != $userId && !$isModerator) {
        Security::sendErrorResponse('You do not have permission to delete this thread', 403);
    }
    
    $categoryId = $thread['category_id'];
    $postCount = (int) $thread['post_count'];
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Delete thread subscriptions
        $db->execute(
            "DELETE FROM forum_thread_subscriptions WHERE thread_id = ?",
            [$threadId]
        );
        
        // Delete post edit history (cascade should handle this, but being explicit)
        $db->execute(
            "DELETE pe FROM forum_post_edits pe
             INNER JOIN forum_posts p ON pe.post_id = p.post_id
             WHERE p.thread_id = ?",
            [$threadId]
        );
        
        // Delete posts (this will cascade to attachments if they exist)
        $db->execute(
            "DELETE FROM forum_posts WHERE thread_id = ?",
            [$threadId]
        );
        
        // Delete thread
        $db->execute(
            "DELETE FROM forum_threads WHERE thread_id = ?",
            [$threadId]
        );
        
        // Update category stats
        $db->execute(
            "UPDATE forum_categories 
             SET thread_count = GREATEST(0, thread_count - 1),
                 post_count = GREATEST(0, post_count - ?)
             WHERE category_id = ?",
            [$postCount, $categoryId]
        );
        
        // Update category last_post if needed
        $lastPost = $db->selectOne(
            "SELECT post_id, created_at 
             FROM forum_posts 
             WHERE thread_id IN (
                 SELECT thread_id FROM forum_threads WHERE category_id = ?
             )
             ORDER BY created_at DESC 
             LIMIT 1",
            [$categoryId]
        );
        
        if ($lastPost) {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = ?, last_post_at = ?
                 WHERE category_id = ?",
                [$lastPost['post_id'], $lastPost['created_at'], $categoryId]
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
        
        Security::sendSuccessResponse(null, 'Thread deleted successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum thread delete error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting thread', 500);
}