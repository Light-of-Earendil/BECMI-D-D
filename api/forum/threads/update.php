<?php
/**
 * BECMI D&D Character Manager - Forum Thread Update Endpoint
 * 
 * Updates a thread (author or moderator only)
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
    if (empty($data['thread_id'])) {
        Security::sendValidationErrorResponse(['thread_id' => 'Thread ID is required']);
    }
    
    $threadId = (int) $data['thread_id'];
    
    // Get thread
    $thread = $db->selectOne(
        "SELECT thread_id, user_id, category_id, thread_title, is_private
         FROM forum_threads 
         WHERE thread_id = ?",
        [$threadId]
    );
    
    if (!$thread) {
        Security::sendErrorResponse('Thread not found', 404);
    }
    
    // Check permissions (author or moderator)
    if ($thread['user_id'] != $userId && !$isModerator) {
        Security::sendErrorResponse('You do not have permission to update this thread', 403);
    }
    
    // Build update fields
    $updates = [];
    $params = [];
    
    if (isset($data['thread_title'])) {
        $threadTitle = trim($data['thread_title']);
        if (empty($threadTitle)) {
            Security::sendValidationErrorResponse(['thread_title' => 'Thread title cannot be empty']);
        }
        if (strlen($threadTitle) > 255) {
            Security::sendValidationErrorResponse(['thread_title' => 'Thread title must be 255 characters or less']);
        }
        $updates[] = "thread_title = ?";
        $params[] = $threadTitle;
    }
    
    // Only moderators can change is_private
    if (isset($data['is_private']) && $isModerator) {
        $updates[] = "is_private = ?";
        $params[] = $data['is_private'] ? 1 : 0;
    }
    
    if (empty($updates)) {
        Security::sendValidationErrorResponse(['message' => 'No valid fields to update']);
    }
    
    // Add updated_at
    $updates[] = "updated_at = NOW()";
    $params[] = $threadId;
    
    // Update thread
    $db->execute(
        "UPDATE forum_threads 
         SET " . implode(', ', $updates) . "
         WHERE thread_id = ?",
        $params
    );
    
    // Get updated thread
    $updatedThread = $db->selectOne(
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
            t.last_post_at,
            t.created_at,
            t.updated_at,
            u.username
         FROM forum_threads t
         JOIN users u ON t.user_id = u.user_id
         WHERE t.thread_id = ?",
        [$threadId]
    );
    
    $formatted = [
        'thread_id' => (int) $updatedThread['thread_id'],
        'category_id' => (int) $updatedThread['category_id'],
        'author' => [
            'user_id' => (int) $updatedThread['user_id'],
            'username' => $updatedThread['username']
        ],
        'thread_title' => $updatedThread['thread_title'],
        'is_sticky' => (bool) $updatedThread['is_sticky'],
        'is_locked' => (bool) $updatedThread['is_locked'],
        'is_private' => (bool) $updatedThread['is_private'],
        'view_count' => (int) $updatedThread['view_count'],
        'post_count' => (int) $updatedThread['post_count'],
        'last_post_at' => $updatedThread['last_post_at'],
        'created_at' => $updatedThread['created_at'],
        'updated_at' => $updatedThread['updated_at']
    ];
    
    Security::sendSuccessResponse($formatted, 'Thread updated successfully');
    
} catch (Exception $e) {
    error_log('Forum thread update error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while updating thread', 500);
}