<?php
/**
 * BECMI D&D Character Manager - Forum Thread Merge Endpoint
 * 
 * Merges two threads (moderator only)
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
    Security::requireModerator();
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    $db = getDB();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (empty($data['source_thread_id'])) {
        $errors['source_thread_id'] = 'Source thread ID is required';
    }
    
    if (empty($data['target_thread_id'])) {
        $errors['target_thread_id'] = 'Target thread ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $sourceThreadId = (int) $data['source_thread_id'];
    $targetThreadId = (int) $data['target_thread_id'];
    
    // Don't merge thread with itself
    if ($sourceThreadId == $targetThreadId) {
        Security::sendErrorResponse('Cannot merge thread with itself', 400);
    }
    
    // Get threads
    $sourceThread = $db->selectOne(
        "SELECT thread_id, category_id, post_count FROM forum_threads WHERE thread_id = ?",
        [$sourceThreadId]
    );
    
    $targetThread = $db->selectOne(
        "SELECT thread_id, category_id, post_count FROM forum_threads WHERE thread_id = ?",
        [$targetThreadId]
    );
    
    if (!$sourceThread) {
        Security::sendErrorResponse('Source thread not found', 404);
    }
    
    if (!$targetThread) {
        Security::sendErrorResponse('Target thread not found', 404);
    }
    
    $sourcePostCount = (int) $sourceThread['post_count'];
    $targetPostCount = (int) $targetThread['post_count'];
    $sourceCategoryId = (int) $sourceThread['category_id'];
    $targetCategoryId = (int) $targetThread['category_id'];
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Move all posts from source to target thread
        $db->execute(
            "UPDATE forum_posts 
             SET thread_id = ?, updated_at = NOW()
             WHERE thread_id = ?",
            [$targetThreadId, $sourceThreadId]
        );
        
        // Move subscriptions from source to target (avoid duplicates)
        $db->execute(
            "INSERT IGNORE INTO forum_thread_subscriptions (thread_id, user_id, subscribed_at)
             SELECT ?, user_id, subscribed_at
             FROM forum_thread_subscriptions
             WHERE thread_id = ?",
            [$targetThreadId, $sourceThreadId]
        );
        
        // Delete source thread subscriptions
        $db->execute(
            "DELETE FROM forum_thread_subscriptions WHERE thread_id = ?",
            [$sourceThreadId]
        );
        
        // Update target thread stats
        $db->execute(
            "UPDATE forum_threads 
             SET post_count = post_count + ?,
                 last_post_at = COALESCE(
                     (SELECT MAX(created_at) FROM forum_posts WHERE thread_id = ?),
                     last_post_at
                 ),
                 last_post_id = COALESCE(
                     (SELECT MAX(post_id) FROM forum_posts WHERE thread_id = ?),
                     last_post_id
                 ),
                 updated_at = NOW()
             WHERE thread_id = ?",
            [$sourcePostCount, $targetThreadId, $targetThreadId, $targetThreadId]
        );
        
        // Delete source thread
        $db->execute(
            "DELETE FROM forum_threads WHERE thread_id = ?",
            [$sourceThreadId]
        );
        
        // Update source category stats
        $db->execute(
            "UPDATE forum_categories 
             SET thread_count = GREATEST(0, thread_count - 1),
                 post_count = GREATEST(0, post_count - ?)
             WHERE category_id = ?",
            [$sourcePostCount, $sourceCategoryId]
        );
        
        // Update target category stats
        $db->execute(
            "UPDATE forum_categories 
             SET post_count = post_count + ?
             WHERE category_id = ?",
            [$sourcePostCount, $targetCategoryId]
        );
        
        // Update source category last_post if needed
        $lastPostSource = $db->selectOne(
            "SELECT post_id, created_at 
             FROM forum_posts 
             WHERE thread_id IN (
                 SELECT thread_id FROM forum_threads WHERE category_id = ?
             )
             ORDER BY created_at DESC 
             LIMIT 1",
            [$sourceCategoryId]
        );
        
        if ($lastPostSource) {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = ?, last_post_at = ?
                 WHERE category_id = ?",
                [$lastPostSource['post_id'], $lastPostSource['created_at'], $sourceCategoryId]
            );
        } else {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = NULL, last_post_at = NULL
                 WHERE category_id = ?",
                [$sourceCategoryId]
            );
        }
        
        // Update target category last_post
        $lastPostTarget = $db->selectOne(
            "SELECT post_id, created_at 
             FROM forum_posts 
             WHERE thread_id = ?
             ORDER BY created_at DESC 
             LIMIT 1",
            [$targetThreadId]
        );
        
        if ($lastPostTarget) {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = ?, last_post_at = ?
                 WHERE category_id = ?",
                [$lastPostTarget['post_id'], $lastPostTarget['created_at'], $targetCategoryId]
            );
        }
        
        // Commit transaction
        $db->commit();
        
        // Get merged thread
        $mergedThread = $db->selectOne(
            "SELECT 
                t.thread_id,
                t.category_id,
                t.thread_title,
                t.post_count,
                c.category_name
             FROM forum_threads t
             JOIN forum_categories c ON t.category_id = c.category_id
             WHERE t.thread_id = ?",
            [$targetThreadId]
        );
        
        Security::sendSuccessResponse([
            'thread_id' => (int) $mergedThread['thread_id'],
            'thread_title' => $mergedThread['thread_title'],
            'post_count' => (int) $mergedThread['post_count'],
            'category' => [
                'category_id' => (int) $mergedThread['category_id'],
                'category_name' => $mergedThread['category_name']
            ]
        ], 'Threads merged successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum thread merge error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while merging threads', 500);
}