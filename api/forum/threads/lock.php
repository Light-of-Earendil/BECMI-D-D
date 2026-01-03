<?php
/**
 * BECMI D&D Character Manager - Forum Thread Lock Endpoint
 * 
 * Locks or unlocks a thread (moderator only)
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
    if (empty($data['thread_id'])) {
        Security::sendValidationErrorResponse(['thread_id' => 'Thread ID is required']);
    }
    
    $threadId = (int) $data['thread_id'];
    $isLocked = isset($data['is_locked']) ? (bool) $data['is_locked'] : true;
    
    // Get thread
    $thread = $db->selectOne(
        "SELECT thread_id, is_locked FROM forum_threads WHERE thread_id = ?",
        [$threadId]
    );
    
    if (!$thread) {
        Security::sendErrorResponse('Thread not found', 404);
    }
    
    // Update lock status
    $db->execute(
        "UPDATE forum_threads 
         SET is_locked = ?, updated_at = NOW()
         WHERE thread_id = ?",
        [$isLocked ? 1 : 0, $threadId]
    );
    
    // Get updated thread
    $updatedThread = $db->selectOne(
        "SELECT 
            t.thread_id,
            t.thread_title,
            t.is_locked,
            t.is_sticky,
            t.updated_at
         FROM forum_threads t
         WHERE t.thread_id = ?",
        [$threadId]
    );
    
    Security::sendSuccessResponse([
        'thread_id' => (int) $updatedThread['thread_id'],
        'thread_title' => $updatedThread['thread_title'],
        'is_locked' => (bool) $updatedThread['is_locked'],
        'is_sticky' => (bool) $updatedThread['is_sticky'],
        'updated_at' => $updatedThread['updated_at']
    ], $isLocked ? 'Thread locked successfully' : 'Thread unlocked successfully');
    
} catch (Exception $e) {
    error_log('Forum thread lock error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while locking/unlocking thread', 500);
}