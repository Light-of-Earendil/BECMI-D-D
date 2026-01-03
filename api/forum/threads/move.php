<?php
/**
 * BECMI D&D Character Manager - Forum Thread Move Endpoint
 * 
 * Moves a thread to a different category (moderator only)
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
    
    if (empty($data['thread_id'])) {
        $errors['thread_id'] = 'Thread ID is required';
    }
    
    if (empty($data['category_id'])) {
        $errors['category_id'] = 'Category ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $threadId = (int) $data['thread_id'];
    $newCategoryId = (int) $data['category_id'];
    
    // Get thread
    $thread = $db->selectOne(
        "SELECT thread_id, category_id, post_count FROM forum_threads WHERE thread_id = ?",
        [$threadId]
    );
    
    if (!$thread) {
        Security::sendErrorResponse('Thread not found', 404);
    }
    
    $oldCategoryId = (int) $thread['category_id'];
    $postCount = (int) $thread['post_count'];
    
    // Check if new category exists
    $newCategory = $db->selectOne(
        "SELECT category_id FROM forum_categories WHERE category_id = ?",
        [$newCategoryId]
    );
    
    if (!$newCategory) {
        Security::sendErrorResponse('Target category not found', 404);
    }
    
    // Don't move if already in target category
    if ($oldCategoryId == $newCategoryId) {
        Security::sendErrorResponse('Thread is already in this category', 400);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Move thread
        $db->execute(
            "UPDATE forum_threads 
             SET category_id = ?, updated_at = NOW()
             WHERE thread_id = ?",
            [$newCategoryId, $threadId]
        );
        
        // Update old category stats
        $db->execute(
            "UPDATE forum_categories 
             SET thread_count = GREATEST(0, thread_count - 1),
                 post_count = GREATEST(0, post_count - ?)
             WHERE category_id = ?",
            [$postCount, $oldCategoryId]
        );
        
        // Update new category stats
        $db->execute(
            "UPDATE forum_categories 
             SET thread_count = thread_count + 1,
                 post_count = post_count + ?
             WHERE category_id = ?",
            [$postCount, $newCategoryId]
        );
        
        // Update old category last_post if needed
        $lastPostOld = $db->selectOne(
            "SELECT post_id, created_at 
             FROM forum_posts 
             WHERE thread_id IN (
                 SELECT thread_id FROM forum_threads WHERE category_id = ?
             )
             ORDER BY created_at DESC 
             LIMIT 1",
            [$oldCategoryId]
        );
        
        if ($lastPostOld) {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = ?, last_post_at = ?
                 WHERE category_id = ?",
                [$lastPostOld['post_id'], $lastPostOld['created_at'], $oldCategoryId]
            );
        } else {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = NULL, last_post_at = NULL
                 WHERE category_id = ?",
                [$oldCategoryId]
            );
        }
        
        // Update new category last_post if needed
        $lastPostNew = $db->selectOne(
            "SELECT post_id, created_at 
             FROM forum_posts 
             WHERE thread_id IN (
                 SELECT thread_id FROM forum_threads WHERE category_id = ?
             )
             ORDER BY created_at DESC 
             LIMIT 1",
            [$newCategoryId]
        );
        
        if ($lastPostNew) {
            $db->execute(
                "UPDATE forum_categories 
                 SET last_post_id = ?, last_post_at = ?
                 WHERE category_id = ?",
                [$lastPostNew['post_id'], $lastPostNew['created_at'], $newCategoryId]
            );
        }
        
        // Commit transaction
        $db->commit();
        
        // Get updated thread
        $updatedThread = $db->selectOne(
            "SELECT 
                t.thread_id,
                t.category_id,
                t.thread_title,
                c.category_name,
                t.updated_at
             FROM forum_threads t
             JOIN forum_categories c ON t.category_id = c.category_id
             WHERE t.thread_id = ?",
            [$threadId]
        );
        
        Security::sendSuccessResponse([
            'thread_id' => (int) $updatedThread['thread_id'],
            'thread_title' => $updatedThread['thread_title'],
            'category' => [
                'category_id' => (int) $updatedThread['category_id'],
                'category_name' => $updatedThread['category_name']
            ],
            'updated_at' => $updatedThread['updated_at']
        ], 'Thread moved successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum thread move error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while moving thread', 500);
}