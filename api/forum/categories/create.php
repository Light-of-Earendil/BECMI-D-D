<?php
/**
 * BECMI D&D Character Manager - Forum Category Create Endpoint
 * 
 * Creates a new category (moderator only)
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
    $errors = [];
    
    if (empty($data['category_name'])) {
        $errors['category_name'] = 'Category name is required';
    } elseif (strlen($data['category_name']) > 100) {
        $errors['category_name'] = 'Category name must be 100 characters or less';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $categoryName = trim($data['category_name']);
    $categoryDescription = isset($data['category_description']) ? trim($data['category_description']) : null;
    $parentCategoryId = isset($data['parent_category_id']) ? (int) $data['parent_category_id'] : null;
    $displayOrder = isset($data['display_order']) ? (int) $data['display_order'] : 0;
    $isPrivate = isset($data['is_private']) ? (bool) $data['is_private'] : false;
    $requiresPermission = isset($data['requires_permission']) ? trim($data['requires_permission']) : null;
    
    // Validate parent category if provided
    if ($parentCategoryId) {
        $parentCategory = $db->selectOne(
            "SELECT category_id FROM forum_categories WHERE category_id = ?",
            [$parentCategoryId]
        );
        
        if (!$parentCategory) {
            Security::sendValidationErrorResponse(['parent_category_id' => 'Parent category not found']);
        }
    }
    
    // Create category
    $categoryId = $db->insert(
        "INSERT INTO forum_categories 
         (parent_category_id, category_name, category_description, display_order, 
          is_private, requires_permission, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
            $parentCategoryId,
            $categoryName,
            $categoryDescription,
            $displayOrder,
            $isPrivate ? 1 : 0,
            $requiresPermission
        ]
    );
    
    // Get created category
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
            created_at,
            updated_at
         FROM forum_categories
         WHERE category_id = ?",
        [$categoryId]
    );
    
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
        'created_at' => $category['created_at'],
        'updated_at' => $category['updated_at']
    ];
    
    Security::sendSuccessResponse($formatted, 'Category created successfully');
    
} catch (Exception $e) {
    error_log('Forum category create error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while creating category', 500);
}