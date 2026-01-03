<?php
/**
 * BECMI D&D Character Manager - Forum Post Create Endpoint
 * 
 * Creates a new post in a thread
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
    
    if (empty($data['thread_id'])) {
        $errors['thread_id'] = 'Thread ID is required';
    }
    
    if (empty($data['post_content'])) {
        $errors['post_content'] = 'Post content is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $threadId = (int) $data['thread_id'];
    $postContent = Security::sanitizeForumHtml(trim($data['post_content']));
    
    // Check if thread exists and is accessible
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
    
    // Check if thread is locked (moderators can still post)
    if ($thread['is_locked'] && !$isModerator) {
        Security::sendErrorResponse('Thread is locked', 403);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Create post
        $postId = $db->insert(
            "INSERT INTO forum_posts 
             (thread_id, user_id, post_content, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())",
            [$threadId, $userId, $postContent]
        );
        
        // Update thread stats
        $db->execute(
            "UPDATE forum_threads 
             SET last_post_id = ?, 
                 last_post_at = NOW(), 
                 post_count = post_count + 1,
                 updated_at = NOW()
             WHERE thread_id = ?",
            [$postId, $threadId]
        );
        
        // Update category stats
        $db->execute(
            "UPDATE forum_categories 
             SET post_count = post_count + 1,
                 last_post_id = ?,
                 last_post_at = NOW()
             WHERE category_id = ?",
            [$postId, $thread['category_id']]
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
        
        // Get created post
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
                u.username
             FROM forum_posts p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.post_id = ?",
            [$postId]
        );
        
        $formatted = [
            'post_id' => (int) $post['post_id'],
            'thread_id' => (int) $post['thread_id'],
            'author' => [
                'user_id' => (int) $post['user_id'],
                'username' => $post['username']
            ],
            'post_content' => $post['post_content'],
            'is_edited' => (bool) $post['is_edited'],
            'edited_at' => $post['edited_at'],
            'edit_reason' => $post['edit_reason'],
            'created_at' => $post['created_at'],
            'updated_at' => $post['updated_at']
        ];
        
        Security::sendSuccessResponse($formatted, 'Post created successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum post create error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while creating post', 500);
}