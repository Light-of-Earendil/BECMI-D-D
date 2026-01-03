<?php
/**
 * BECMI D&D Character Manager - Forum Category Update Endpoint
 * 
 * Updates a category (moderator only)
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
    Security::requireModerator();
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    $db = getDB();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    // Validate required fields
    if (empty($data['category_id'])) {
        Security::sendValidationErrorResponse(['category_id' => 'Category ID is required']);
    }
    
    $categoryId = (int) $data['category_id'];
    
    // Get category
    $category = $db->selectOne(
        "SELECT category_id FROM forum_categories WHERE category_id = ?",
        [$categoryId]
    );
    
    if (!$category) {
        Security::sendErrorResponse('Category not found', 404);
    }
    
    // Build update fields
    $updates = [];
    $params = [];
    
    if (isset($data['category_name'])) {
        $categoryName = trim($data['category_name']);
        if (empty($categoryName)) {
            Security::sendValidationErrorResponse(['category_name' => 'Category name cannot be empty']);
        }
        if (strlen($categoryName) > 100) {
            Security::sendValidationErrorResponse(['category_name' => 'Category name must be 100 characters or less']);
        }
        $updates[] = "category_name = ?";
        $params[] = $categoryName;
    }
    
    if (isset($data['category_description'])) {
        $updates[] = "category_description = ?";
        $params[] = trim($data['category_description']);
    }
    
    if (isset($data['display_order'])) {
        $updates[] = "display_order = ?";
        $params[] = (int) $data['display_order'];
    }
    
    if (isset($data['is_private'])) {
        $updates[] = "is_private = ?";
        $params[] = $data['is_private'] ? 1 : 0;
    }
    
    if (isset($data['requires_permission'])) {
        $updates[] = "requires_permission = ?";
        $params[] = trim($data['requires_permission']);
    }
    
    if (isset($data['parent_category_id'])) {
        $parentCategoryId = $data['parent_category_id'] ? (int) $data['parent_category_id'] : null;
        
        // Validate parent category if provided
        if ($parentCategoryId) {
            $parentCategory = $db->selectOne(
                "SELECT category_id FROM forum_categories WHERE category_id = ?",
                [$parentCategoryId]
            );
            
            if (!$parentCategory) {
                Security::sendValidationErrorResponse(['parent_category_id' => 'Parent category not found']);
            }
            
            // Prevent circular reference
            if ($parentCategoryId == $categoryId) {
                Security::sendValidationErrorResponse(['parent_category_id' => 'Category cannot be its own parent']);
            }
        }
        
        $updates[] = "parent_category_id = ?";
        $params[] = $parentCategoryId;
    }
    
    if (empty($updates)) {
        Security::sendValidationErrorResponse(['message' => 'No valid fields to update']);
    }
    
    // Add updated_at
    $updates[] = "updated_at = NOW()";
    $params[] = $categoryId;
    
    // Update category
    $db->execute(
        "UPDATE forum_categories 
         SET " . implode(', ', $updates) . "
         WHERE category_id = ?",
        $params
    );
    
    // Get updated category
    $updatedCategory = $db->selectOne(
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
        'category_id' => (int) $updatedCategory['category_id'],
        'parent_category_id' => $updatedCategory['parent_category_id'] ? (int) $updatedCategory['parent_category_id'] : null,
        'category_name' => $updatedCategory['category_name'],
        'category_description' => $updatedCategory['category_description'],
        'display_order' => (int) $updatedCategory['display_order'],
        'is_private' => (bool) $updatedCategory['is_private'],
        'requires_permission' => $updatedCategory['requires_permission'],
        'thread_count' => (int) $updatedCategory['thread_count'],
        'post_count' => (int) $updatedCategory['post_count'],
        'created_at' => $updatedCategory['created_at'],
        'updated_at' => $updatedCategory['updated_at']
    ];
    
    Security::sendSuccessResponse($formatted, 'Category updated successfully');
    
} catch (Exception $e) {
    error_log('Forum category update error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while updating category', 500);
}