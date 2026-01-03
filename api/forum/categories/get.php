<?php
/**
 * BECMI D&D Character Manager - Forum Category Get Endpoint
 * 
 * Gets a single category with stats
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
    
    // Get category_id from query parameters
    $categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : null;
    
    if (!$categoryId) {
        Security::sendValidationErrorResponse(['category_id' => 'Category ID is required']);
    }
    
    // Get category
    $category = $db->selectOne(
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
            created_at,
            updated_at
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
    
    // Format response
    $formatted = [
        'category_id' => (int) $category['category_id'],
        'parent_category_id' => $category['parent_category_id'] ? (int) $category['parent_category_id'] : null,
        'category_name' => $category['category_name'],
        'category_description' => $category['category_description'],
        'display_order' => (int) $category['display_order'],
        'is_private' => (bool) $category['is_private'],
        'requires_permission' => $category['requires_permission'],
        'thread_count' => (int) $category['thread_count'],
        'post_count' => (int) $category['post_count'],
        'last_post_at' => $category['last_post_at'],
        'created_at' => $category['created_at'],
        'updated_at' => $category['updated_at']
    ];
    
    // Get last post info if exists
    if ($category['last_post_id']) {
        $lastPost = $db->selectOne(
            "SELECT p.post_id, p.created_at, u.username, u.user_id
             FROM forum_posts p
             JOIN users u ON p.user_id = u.user_id
             WHERE p.post_id = ?",
            [$category['last_post_id']]
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
    
    Security::sendSuccessResponse($formatted, 'Category retrieved successfully');
    
} catch (Exception $e) {
    error_log('Forum category get error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while retrieving category', 500);
}