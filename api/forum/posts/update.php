<?php
/**
 * BECMI D&D Character Manager - Forum Post Update Endpoint
 * 
 * Updates a post (author or moderator only) with edit history tracking
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
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
    if (empty($data['post_id'])) {
        Security::sendValidationErrorResponse(['post_id' => 'Post ID is required']);
    }
    
    if (empty($data['post_content'])) {
        Security::sendValidationErrorResponse(['post_content' => 'Post content is required']);
    }
    
    $postId = (int) $data['post_id'];
    $newContent = Security::sanitizeForumHtml(trim($data['post_content']));
    $editReason = isset($data['edit_reason']) ? trim($data['edit_reason']) : null;
    
    // Get post
    $post = $db->selectOne(
        "SELECT post_id, user_id, post_content, thread_id, is_edited
         FROM forum_posts 
         WHERE post_id = ?",
        [$postId]
    );
    
    if (!$post) {
        Security::sendErrorResponse('Post not found', 404);
    }
    
    // Check permissions (author or moderator)
    if ($post['user_id'] != $userId && !$isModerator) {
        Security::sendErrorResponse('You do not have permission to update this post', 403);
    }
    
    // Check if content actually changed
    if ($post['post_content'] === $newContent) {
        Security::sendErrorResponse('Post content unchanged', 400);
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Save old content to edit history
        $db->insert(
            "INSERT INTO forum_post_edits 
             (post_id, user_id, old_content, edit_reason, edited_at)
             VALUES (?, ?, ?, ?, NOW())",
            [$postId, $userId, $post['post_content'], $editReason]
        );
        
        // Update post
        $db->execute(
            "UPDATE forum_posts 
             SET post_content = ?,
                 is_edited = TRUE,
                 edited_at = NOW(),
                 edit_reason = ?,
                 updated_at = NOW()
             WHERE post_id = ?",
            [$newContent, $editReason, $postId]
        );
        
        // Commit transaction
        $db->commit();
        
        // Get updated post
        $updatedPost = $db->selectOne(
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
            'post_id' => (int) $updatedPost['post_id'],
            'thread_id' => (int) $updatedPost['thread_id'],
            'author' => [
                'user_id' => (int) $updatedPost['user_id'],
                'username' => $updatedPost['username']
            ],
            'post_content' => $updatedPost['post_content'],
            'is_edited' => (bool) $updatedPost['is_edited'],
            'edited_at' => $updatedPost['edited_at'],
            'edit_reason' => $updatedPost['edit_reason'],
            'created_at' => $updatedPost['created_at'],
            'updated_at' => $updatedPost['updated_at']
        ];
        
        Security::sendSuccessResponse($formatted, 'Post updated successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum post update error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while updating post', 500);
}