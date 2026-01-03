<?php
/**
 * BECMI D&D Character Manager - Forum Moderation Approve Post Endpoint
 * 
 * Approves a pending post (moderator only)
 * Note: This endpoint is prepared for future implementation where posts
 * might require approval before being visible. Currently, all posts are
 * immediately visible, but this endpoint can be extended when a status
 * field is added to the forum_posts table.
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
    $moderatorId = Security::getCurrentUserId();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    // Validate required fields
    if (empty($data['post_id'])) {
        Security::sendValidationErrorResponse(['post_id' => 'Post ID is required']);
    }
    
    $postId = (int) $data['post_id'];
    $approve = isset($data['approve']) ? (bool) $data['approve'] : true;
    $moderationNote = isset($data['moderation_note']) ? trim($data['moderation_note']) : null;
    
    // Get post
    $post = $db->selectOne(
        "SELECT post_id, thread_id, user_id, post_content, created_at
         FROM forum_posts 
         WHERE post_id = ?",
        [$postId]
    );
    
    if (!$post) {
        Security::sendErrorResponse('Post not found', 404);
    }
    
    // Note: Currently, all posts are immediately visible.
    // This endpoint is prepared for future implementation where posts
    // might have a status field (pending, approved, rejected).
    // For now, we'll just log the approval action.
    
    // In a future implementation, you would:
    // 1. Check if post has a status field
    // 2. Update status to 'approved' or 'rejected'
    // 3. If approved and was hidden, make it visible
    // 4. Update thread/category stats if needed
    
    // For now, we'll just return success with the post info
    // and log the moderation action
    
    error_log("Moderation: Post {$postId} " . ($approve ? "approved" : "rejected") . " by moderator {$moderatorId}. Note: {$moderationNote}");
    
    // Get post with author info
    $postWithAuthor = $db->selectOne(
        "SELECT 
            p.post_id,
            p.thread_id,
            p.user_id,
            p.post_content,
            p.created_at,
            u.username,
            t.thread_title
         FROM forum_posts p
         JOIN users u ON p.user_id = u.user_id
         JOIN forum_threads t ON p.thread_id = t.thread_id
         WHERE p.post_id = ?",
        [$postId]
    );
    
    Security::sendSuccessResponse([
        'post' => [
            'post_id' => (int) $postWithAuthor['post_id'],
            'thread_id' => (int) $postWithAuthor['thread_id'],
            'thread_title' => $postWithAuthor['thread_title'],
            'author' => [
                'user_id' => (int) $postWithAuthor['user_id'],
                'username' => $postWithAuthor['username']
            ],
            'post_content_preview' => mb_substr($postWithAuthor['post_content'], 0, 200),
            'created_at' => $postWithAuthor['created_at']
        ],
        'moderation' => [
            'approved' => $approve,
            'moderated_by' => $moderatorId,
            'moderation_note' => $moderationNote,
            'moderated_at' => date('Y-m-d H:i:s')
        ],
        'note' => 'Post approval system is prepared for future implementation. Currently all posts are immediately visible.'
    ], $approve ? 'Post approved successfully' : 'Post rejected successfully');
    
} catch (Exception $e) {
    error_log('Forum approve post error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while approving post', 500);
}