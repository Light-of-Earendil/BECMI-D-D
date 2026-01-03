<?php
/**
 * BECMI D&D Character Manager - Forum Thread Create Endpoint
 * 
 * Creates a new thread in a category
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
    $isModerator = Security::isModerator();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (empty($data['category_id'])) {
        $errors['category_id'] = 'Category ID is required';
    }
    
    if (empty($data['thread_title'])) {
        $errors['thread_title'] = 'Thread title is required';
    } elseif (strlen($data['thread_title']) > 255) {
        $errors['thread_title'] = 'Thread title must be 255 characters or less';
    }
    
    if (empty($data['post_content'])) {
        $errors['post_content'] = 'Post content is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $categoryId = (int) $data['category_id'];
    $threadTitle = trim($data['thread_title']);
    $postContent = Security::sanitizeForumHtml(trim($data['post_content']));
    $isPrivate = isset($data['is_private']) && $data['is_private'] && $isModerator;
    
    // Check if category exists and user has access
    $category = $db->selectOne(
        "SELECT category_id, is_private, requires_permission 
         FROM forum_categories 
         WHERE category_id = ?",
        [$categoryId]
    );
    
    if (!$category) {
        Security::sendErrorResponse('Category not found', 404);
    }
    
    // Check private category access
    if ($category['is_private'] && !$isModerator) {
        Security::sendErrorResponse('Access denied to private category', 403);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Create thread
        $threadId = $db->insert(
            "INSERT INTO forum_threads 
             (category_id, user_id, thread_title, is_private, created_at, updated_at)
             VALUES (?, ?, ?, ?, NOW(), NOW())",
            [$categoryId, $userId, $threadTitle, $isPrivate ? 1 : 0]
        );
        
        // Create first post
        $postId = $db->insert(
            "INSERT INTO forum_posts 
             (thread_id, user_id, post_content, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())",
            [$threadId, $userId, $postContent]
        );
        
        // Update thread with first post info
        $db->execute(
            "UPDATE forum_threads 
             SET last_post_id = ?, last_post_at = NOW(), post_count = 1
             WHERE thread_id = ?",
            [$postId, $threadId]
        );
        
        // Update category stats
        $db->execute(
            "UPDATE forum_categories 
             SET thread_count = thread_count + 1, 
                 post_count = post_count + 1,
                 last_post_id = ?,
                 last_post_at = NOW()
             WHERE category_id = ?",
            [$postId, $categoryId]
        );
        
        // Handle attachments if provided
        if (!empty($data['attachment_ids']) && is_array($data['attachment_ids'])) {
            foreach ($data['attachment_ids'] as $attachmentData) {
                if (isset($attachmentData['file_path'])) {
                    $db->insert(
                        "INSERT INTO forum_post_attachments 
                         (post_id, file_path, file_name, file_size, mime_type, uploaded_at)
                         VALUES (?, ?, ?, ?, ?, NOW())",
                        [
                            $postId,
                            $attachmentData['file_path'],
                            $attachmentData['file_name'] ?? basename($attachmentData['file_path']),
                            $attachmentData['file_size'] ?? 0,
                            $attachmentData['mime_type'] ?? 'image/jpeg'
                        ]
                    );
                }
            }
        }
        
        // Commit transaction
        $db->commit();
        
        // Get created thread
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
                u.username
             FROM forum_threads t
             JOIN users u ON t.user_id = u.user_id
             WHERE t.thread_id = ?",
            [$threadId]
        );
        
        $formatted = [
            'thread_id' => (int) $thread['thread_id'],
            'category_id' => (int) $thread['category_id'],
            'author' => [
                'user_id' => (int) $thread['user_id'],
                'username' => $thread['username']
            ],
            'thread_title' => $thread['thread_title'],
            'is_sticky' => (bool) $thread['is_sticky'],
            'is_locked' => (bool) $thread['is_locked'],
            'is_private' => (bool) $thread['is_private'],
            'view_count' => (int) $thread['view_count'],
            'post_count' => (int) $thread['post_count'],
            'created_at' => $thread['created_at']
        ];
        
        Security::sendSuccessResponse($formatted, 'Thread created successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum thread create error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while creating thread', 500);
}