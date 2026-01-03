<?php
/**
 * BECMI D&D Character Manager - Forum Search Endpoint
 * 
 * Searches threads and posts
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
    $query = isset($_GET['q']) ? trim($_GET['q']) : '';
    $type = isset($_GET['type']) ? $_GET['type'] : 'all'; // 'all', 'threads', 'posts'
    $categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : null;
    $authorId = isset($_GET['author_id']) ? (int) $_GET['author_id'] : null;
    $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
    $perPage = isset($_GET['per_page']) ? min(100, max(1, (int) $_GET['per_page'])) : 20;
    
    // Validate search query
    if (empty($query) && !$categoryId && !$authorId) {
        Security::sendValidationErrorResponse(['q' => 'Search query, category ID, or author ID is required']);
    }
    
    if (strlen($query) < 2 && !empty($query)) {
        Security::sendValidationErrorResponse(['q' => 'Search query must be at least 2 characters']);
    }
    
    $results = [
        'threads' => [],
        'posts' => [],
        'pagination' => []
    ];
    
    // Build search conditions
    $searchConditions = [];
    $params = [];
    
    if (!empty($query)) {
        $searchConditions[] = "(t.thread_title LIKE ? OR p.post_content LIKE ?)";
        $searchTerm = '%' . $query . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    if ($categoryId) {
        $searchConditions[] = "t.category_id = ?";
        $params[] = $categoryId;
    }
    
    if ($authorId) {
        $searchConditions[] = "(t.user_id = ? OR p.user_id = ?)";
        $params[] = $authorId;
        $params[] = $authorId;
    }
    
    $whereClause = !empty($searchConditions) ? "WHERE " . implode(" AND ", $searchConditions) : "";
    
    // Search threads
    if ($type === 'all' || $type === 'threads') {
        // Build thread search query
        $threadWhere = [];
        $threadParams = [];
        
        if (!empty($query)) {
            $threadWhere[] = "t.thread_title LIKE ?";
            $threadParams[] = '%' . $query . '%';
        }
        
        if ($categoryId) {
            $threadWhere[] = "t.category_id = ?";
            $threadParams[] = $categoryId;
        }
        
        if ($authorId) {
            $threadWhere[] = "t.user_id = ?";
            $threadParams[] = $authorId;
        }
        
        // Filter private categories if not moderator
        if (!$isModerator) {
            $threadWhere[] = "c.is_private = FALSE";
        }
        
        $threadWhereClause = !empty($threadWhere) ? "WHERE " . implode(" AND ", $threadWhere) : "";
        
        // Get total count
        $threadCount = $db->selectOne(
            "SELECT COUNT(*) as count 
             FROM forum_threads t
             JOIN forum_categories c ON t.category_id = c.category_id
             {$threadWhereClause}",
            $threadParams
        )['count'];
        
        // Calculate pagination
        $threadOffset = ($page - 1) * $perPage;
        $threadTotalPages = ceil($threadCount / $perPage);
        
        // Get threads
        $threads = $db->select(
            "SELECT 
                t.thread_id,
                t.category_id,
                t.user_id,
                t.thread_title,
                t.is_sticky,
                t.is_locked,
                t.view_count,
                t.post_count,
                t.last_post_at,
                t.created_at,
                u.username,
                c.category_name
             FROM forum_threads t
             JOIN users u ON t.user_id = u.user_id
             JOIN forum_categories c ON t.category_id = c.category_id
             {$threadWhereClause}
             ORDER BY t.is_sticky DESC, t.last_post_at DESC
             LIMIT ? OFFSET ?",
            array_merge($threadParams, [$perPage, $threadOffset])
        );
        
        $results['threads'] = array_map(function($thread) {
            return [
                'thread_id' => (int) $thread['thread_id'],
                'category' => [
                    'category_id' => (int) $thread['category_id'],
                    'category_name' => $thread['category_name']
                ],
                'thread_title' => $thread['thread_title'],
                'author' => [
                    'user_id' => (int) $thread['user_id'],
                    'username' => $thread['username']
                ],
                'is_sticky' => (bool) $thread['is_sticky'],
                'is_locked' => (bool) $thread['is_locked'],
                'view_count' => (int) $thread['view_count'],
                'post_count' => (int) $thread['post_count'],
                'last_post_at' => $thread['last_post_at'],
                'created_at' => $thread['created_at']
            ];
        }, $threads);
        
        $results['pagination']['threads'] = [
            'page' => $page,
            'per_page' => $perPage,
            'total' => (int) $threadCount,
            'total_pages' => $threadTotalPages
        ];
    }
    
    // Search posts
    if ($type === 'all' || $type === 'posts') {
        // Build post search query
        $postWhere = [];
        $postParams = [];
        
        if (!empty($query)) {
            $postWhere[] = "p.post_content LIKE ?";
            $postParams[] = '%' . $query . '%';
        }
        
        if ($categoryId) {
            $postWhere[] = "t.category_id = ?";
            $postParams[] = $categoryId;
        }
        
        if ($authorId) {
            $postWhere[] = "p.user_id = ?";
            $postParams[] = $authorId;
        }
        
        // Filter private categories if not moderator
        if (!$isModerator) {
            $postWhere[] = "c.is_private = FALSE";
        }
        
        $postWhereClause = !empty($postWhere) ? "WHERE " . implode(" AND ", $postWhere) : "";
        
        // Get total count
        $postCount = $db->selectOne(
            "SELECT COUNT(*) as count 
             FROM forum_posts p
             JOIN forum_threads t ON p.thread_id = t.thread_id
             JOIN forum_categories c ON t.category_id = c.category_id
             {$postWhereClause}",
            $postParams
        )['count'];
        
        // Calculate pagination
        $postOffset = ($page - 1) * $perPage;
        $postTotalPages = ceil($postCount / $perPage);
        
        // Get posts
        $posts = $db->select(
            "SELECT 
                p.post_id,
                p.thread_id,
                p.user_id,
                p.post_content,
                p.is_edited,
                p.created_at,
                u.username,
                t.thread_title,
                t.category_id,
                c.category_name
             FROM forum_posts p
             JOIN users u ON p.user_id = u.user_id
             JOIN forum_threads t ON p.thread_id = t.thread_id
             JOIN forum_categories c ON t.category_id = c.category_id
             {$postWhereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?",
            array_merge($postParams, [$perPage, $postOffset])
        );
        
        $results['posts'] = array_map(function($post) {
            // Highlight search term in content preview
            $contentPreview = mb_substr($post['post_content'], 0, 300);
            
            return [
                'post_id' => (int) $post['post_id'],
                'thread' => [
                    'thread_id' => (int) $post['thread_id'],
                    'thread_title' => $post['thread_title'],
                    'category' => [
                        'category_id' => (int) $post['category_id'],
                        'category_name' => $post['category_name']
                    ]
                ],
                'author' => [
                    'user_id' => (int) $post['user_id'],
                    'username' => $post['username']
                ],
                'post_content_preview' => $contentPreview,
                'is_edited' => (bool) $post['is_edited'],
                'created_at' => $post['created_at']
            ];
        }, $posts);
        
        $results['pagination']['posts'] = [
            'page' => $page,
            'per_page' => $perPage,
            'total' => (int) $postCount,
            'total_pages' => $postTotalPages
        ];
    }
    
    Security::sendSuccessResponse([
        'query' => $query,
        'type' => $type,
        'results' => $results
    ], 'Search completed successfully');
    
} catch (Exception $e) {
    error_log('Forum search error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while searching', 500);
}