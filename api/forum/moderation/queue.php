<?php
/**
 * BECMI D&D Character Manager - Forum Moderation Queue Endpoint
 * 
 * Gets moderation queue (moderator only)
 * Returns posts and threads that may need moderation attention
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    Security::requireModerator();
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    $db = getDB();
    
    // Get query parameters
    $type = isset($_GET['type']) ? $_GET['type'] : 'all'; // 'all', 'recent', 'reported'
    $limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 50;
    
    $queue = [
        'recent_posts' => [],
        'recent_threads' => [],
        'banned_users' => [],
        'recent_edits' => []
    ];
    
    // Get recent posts (last 24 hours) - for review
    $recentPosts = $db->select(
        "SELECT 
            p.post_id,
            p.thread_id,
            p.user_id,
            p.post_content,
            p.created_at,
            u.username,
            t.thread_title,
            c.category_name
         FROM forum_posts p
         JOIN users u ON p.user_id = u.user_id
         JOIN forum_threads t ON p.thread_id = t.thread_id
         JOIN forum_categories c ON t.category_id = c.category_id
         WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY p.created_at DESC
         LIMIT ?",
        [$limit]
    );
    
    $queue['recent_posts'] = array_map(function($post) {
        return [
            'post_id' => (int) $post['post_id'],
            'thread_id' => (int) $post['thread_id'],
            'thread_title' => $post['thread_title'],
            'category_name' => $post['category_name'],
            'author' => [
                'user_id' => (int) $post['user_id'],
                'username' => $post['username']
            ],
            'post_content_preview' => mb_substr($post['post_content'], 0, 200),
            'created_at' => $post['created_at']
        ];
    }, $recentPosts);
    
    // Get recent threads (last 24 hours)
    $recentThreads = $db->select(
        "SELECT 
            t.thread_id,
            t.category_id,
            t.user_id,
            t.thread_title,
            t.post_count,
            t.view_count,
            t.created_at,
            u.username,
            c.category_name
         FROM forum_threads t
         JOIN users u ON t.user_id = u.user_id
         JOIN forum_categories c ON t.category_id = c.category_id
         WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY t.created_at DESC
         LIMIT ?",
        [$limit]
    );
    
    $queue['recent_threads'] = array_map(function($thread) {
        return [
            'thread_id' => (int) $thread['thread_id'],
            'category_id' => (int) $thread['category_id'],
            'category_name' => $thread['category_name'],
            'thread_title' => $thread['thread_title'],
            'author' => [
                'user_id' => (int) $thread['user_id'],
                'username' => $thread['username']
            ],
            'post_count' => (int) $thread['post_count'],
            'view_count' => (int) $thread['view_count'],
            'created_at' => $thread['created_at']
        ];
    }, $recentThreads);
    
    // Get currently banned users
    $bannedUsers = $db->select(
        "SELECT 
            u.user_id,
            u.username,
            u.ban_reason,
            u.ban_expires_at,
            b.banned_by_user_id,
            b.created_at as banned_at,
            mod_user.username as banned_by_username
         FROM users u
         LEFT JOIN forum_user_bans b ON u.user_id = b.user_id
         LEFT JOIN users mod_user ON b.banned_by_user_id = mod_user.user_id
         WHERE u.is_banned = TRUE
         ORDER BY b.created_at DESC
         LIMIT ?",
        [$limit]
    );
    
    $queue['banned_users'] = array_map(function($user) {
        return [
            'user_id' => (int) $user['user_id'],
            'username' => $user['username'],
            'ban_reason' => $user['ban_reason'],
            'ban_expires_at' => $user['ban_expires_at'],
            'banned_by' => [
                'user_id' => $user['banned_by_user_id'] ? (int) $user['banned_by_user_id'] : null,
                'username' => $user['banned_by_username']
            ],
            'banned_at' => $user['banned_at']
        ];
    }, $bannedUsers);
    
    // Get recent post edits (last 7 days) - for review
    $recentEdits = $db->select(
        "SELECT 
            e.edit_id,
            e.post_id,
            e.user_id,
            e.edit_reason,
            e.edited_at,
            u.username,
            p.post_content,
            t.thread_id,
            t.thread_title
         FROM forum_post_edits e
         JOIN users u ON e.user_id = u.user_id
         JOIN forum_posts p ON e.post_id = p.post_id
         JOIN forum_threads t ON p.thread_id = t.thread_id
         WHERE e.edited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY e.edited_at DESC
         LIMIT ?",
        [$limit]
    );
    
    $queue['recent_edits'] = array_map(function($edit) {
        return [
            'edit_id' => (int) $edit['edit_id'],
            'post_id' => (int) $edit['post_id'],
            'thread_id' => (int) $edit['thread_id'],
            'thread_title' => $edit['thread_title'],
            'editor' => [
                'user_id' => (int) $edit['user_id'],
                'username' => $edit['username']
            ],
            'edit_reason' => $edit['edit_reason'],
            'edited_at' => $edit['edited_at'],
            'current_content_preview' => mb_substr($edit['post_content'], 0, 200)
        ];
    }, $recentEdits);
    
    // Get statistics
    $stats = [
        'total_posts_24h' => count($queue['recent_posts']),
        'total_threads_24h' => count($queue['recent_threads']),
        'total_banned_users' => count($queue['banned_users']),
        'total_edits_7d' => count($queue['recent_edits'])
    ];
    
    Security::sendSuccessResponse([
        'queue' => $queue,
        'stats' => $stats
    ], 'Moderation queue retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum moderation queue error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving moderation queue', 500);
}