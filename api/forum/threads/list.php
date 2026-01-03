<?php
/**
 * BECMI D&D Character Manager - Forum Threads List Endpoint
 * 
 * Lists threads in a category with pagination and sorting
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
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    $db = getDB();
    $userId = Security::getCurrentUserId();
    $isModerator = Security::isModerator();
    
    // Get query parameters
    $categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : null;
    $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
    $perPage = isset($_GET['per_page']) ? min(100, max(1, (int) $_GET['per_page'])) : 20;
    $sortBy = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'last_post_at'; // last_post_at, created_at, post_count, view_count
    $sortOrder = isset($_GET['sort_order']) && strtoupper($_GET['sort_order']) === 'ASC' ? 'ASC' : 'DESC';
    
    // Validate category_id
    if (!$categoryId) {
        Security::sendValidationErrorResponse(['category_id' => 'Category ID is required']);
    }
    
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
    
    // Build WHERE clause
    $whereClause = "WHERE t.category_id = ?";
    $params = [$categoryId];
    
    // Build ORDER BY clause
    $validSortFields = [
        'last_post_at' => 't.last_post_at',
        'created_at' => 't.created_at',
        'post_count' => 't.post_count',
        'view_count' => 't.view_count',
        'thread_title' => 't.thread_title'
    ];
    
    $sortField = $validSortFields[$sortBy] ?? $validSortFields['last_post_at'];
    $orderBy = "ORDER BY t.is_sticky DESC, {$sortField} {$sortOrder}";
    
    // Get total count
    $totalCount = $db->selectOne(
        "SELECT COUNT(*) as count FROM forum_threads t {$whereClause}",
        $params
    )['count'];
    
    // Calculate pagination
    $offset = ($page - 1) * $perPage;
    $totalPages = ceil($totalCount / $perPage);
    
    // Get threads
    $threads = $db->select(
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
            u.username,
            u.user_id as author_user_id
         FROM forum_threads t
         JOIN users u ON t.user_id = u.user_id
         {$whereClause}
         {$orderBy}
         LIMIT ? OFFSET ?",
        array_merge($params, [$perPage, $offset])
    );
    
    // Format threads with additional info
    $formattedThreads = array_map(function($thread) use ($db, $userId) {
        $formatted = [
            'thread_id' => (int) $thread['thread_id'],
            'category_id' => (int) $thread['category_id'],
            'author' => [
                'user_id' => (int) $thread['author_user_id'],
                'username' => $thread['username']
            ],
            'thread_title' => $thread['thread_title'],
            'is_sticky' => (bool) $thread['is_sticky'],
            'is_locked' => (bool) $thread['is_locked'],
            'is_private' => (bool) $thread['is_private'],
            'view_count' => (int) $thread['view_count'],
            'post_count' => (int) $thread['post_count'],
            'last_post_at' => $thread['last_post_at'],
            'created_at' => $thread['created_at']
        ];
        
        // Get last post info if exists
        if ($thread['last_post_id']) {
            $lastPost = $db->selectOne(
                "SELECT p.post_id, p.created_at, u.username, u.user_id
                 FROM forum_posts p
                 JOIN users u ON p.user_id = u.user_id
                 WHERE p.post_id = ?",
                [$thread['last_post_id']]
            );
            
            if ($lastPost) {
                $formatted['last_post'] = [
                    'post_id' => (int) $lastPost['post_id'],
                    'created_at' => $lastPost['created_at'],
                    'author' => [
                        'user_id' => (int) $lastPost['user_id'],
                        'username' => $lastPost['username']
                    ]
                ];
            }
        }
        
        // Check if user is subscribed
        $subscription = $db->selectOne(
            "SELECT subscription_id FROM forum_thread_subscriptions 
             WHERE thread_id = ? AND user_id = ?",
            [$thread['thread_id'], $userId]
        );
        $formatted['is_subscribed'] = !empty($subscription);
        
        return $formatted;
    }, $threads);
    
    Security::sendSuccessResponse([
        'threads' => $formattedThreads,
        'pagination' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => (int) $totalCount,
            'total_pages' => $totalPages
        ]
    ], 'Threads retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum threads list error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving threads', 500);
}