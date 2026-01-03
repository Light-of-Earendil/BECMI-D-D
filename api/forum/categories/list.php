<?php
/**
 * BECMI D&D Character Manager - Forum Categories List Endpoint
 * 
 * Lists all forum categories (respects private forums)
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
    
    // Get all categories
    // If not moderator, filter out private categories
    if ($isModerator) {
        $categories = $db->select(
            "SELECT 
                category_id,
                parent_category_id,
                category_name,
                category_description,
                display_order,
                is_private,
                requires_permission,
                thread_count,
                post_count,
                last_post_id,
                last_post_at,
                created_at
             FROM forum_categories
             ORDER BY display_order ASC, category_name ASC"
        );
    } else {
        $categories = $db->select(
            "SELECT 
                category_id,
                parent_category_id,
                category_name,
                category_description,
                display_order,
                is_private,
                requires_permission,
                thread_count,
                post_count,
                last_post_id,
                last_post_at,
                created_at
             FROM forum_categories
             WHERE is_private = FALSE
             ORDER BY display_order ASC, category_name ASC"
        );
    }
    
    // Format categories with last post info
    $formattedCategories = array_map(function($cat) use ($db) {
        $category = [
            'category_id' => (int) $cat['category_id'],
            'parent_category_id' => $cat['parent_category_id'] ? (int) $cat['parent_category_id'] : null,
            'category_name' => $cat['category_name'],
            'category_description' => $cat['category_description'],
            'display_order' => (int) $cat['display_order'],
            'is_private' => (bool) $cat['is_private'],
            'requires_permission' => $cat['requires_permission'],
            'thread_count' => (int) $cat['thread_count'],
            'post_count' => (int) $cat['post_count'],
            'last_post_at' => $cat['last_post_at'],
            'created_at' => $cat['created_at']
        ];
        
        // Get last post info if exists
        if ($cat['last_post_id']) {
            $lastPost = $db->selectOne(
                "SELECT p.post_id, p.created_at, u.username, u.user_id
                 FROM forum_posts p
                 JOIN users u ON p.user_id = u.user_id
                 WHERE p.post_id = ?",
                [$cat['last_post_id']]
            );
            
            if ($lastPost) {
                $category['last_post'] = [
                    'post_id' => (int) $lastPost['post_id'],
                    'created_at' => $lastPost['created_at'],
                    'author' => [
                        'user_id' => (int) $lastPost['user_id'],
                        'username' => $lastPost['username']
                    ]
                ];
            }
        }
        
        return $category;
    }, $categories);
    
    Security::sendSuccessResponse([
        'categories' => $formattedCategories
    ], 'Categories retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum categories list error: ' . $e->getMessage());
    Security::sendErrorResponse('An error occurred while retrieving categories', 500);
}
