<?php
/**
 * BECMI D&D Character Manager - Forum Category Delete Endpoint
 * 
 * Deletes a category (moderator only)
 */

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    Security::requireModerator();
    
    // Check if user is banned
    if (Security::isBanned()) {
        Security::sendErrorResponse('You are banned from the forum', 403);
    }

    $db = getDB();
    
    // Get category_id from query parameters or JSON body
    $categoryId = null;
    
    if (isset($_GET['category_id'])) {
        $categoryId = (int) $_GET['category_id'];
    } else {
        $data = Security::validateJSONInput();
        if (isset($data['category_id'])) {
            $categoryId = (int) $data['category_id'];
        }
    }
    
    if (!$categoryId) {
        Security::sendValidationErrorResponse(['category_id' => 'Category ID is required']);
    }
    
    // Get category
    $category = $db->selectOne(
        "SELECT category_id, thread_count, post_count 
         FROM forum_categories 
         WHERE category_id = ?",
        [$categoryId]
    );
    
    if (!$category) {
        Security::sendErrorResponse('Category not found', 404);
    }
    
    // Check if category has threads
    if ($category['thread_count'] > 0) {
        Security::sendErrorResponse('Cannot delete category with existing threads. Please move or delete threads first.', 400);
    }
    
    // Check if category has child categories
    $childCategories = $db->selectOne(
        "SELECT COUNT(*) as count FROM forum_categories WHERE parent_category_id = ?",
        [$categoryId]
    );
    
    if ($childCategories['count'] > 0) {
        Security::sendErrorResponse('Cannot delete category with child categories. Please delete or move child categories first.', 400);
    }
    
    // Delete category
    $db->execute(
        "DELETE FROM forum_categories WHERE category_id = ?",
        [$categoryId]
    );
    
    Security::sendSuccessResponse(null, 'Category deleted successfully');
    
} catch (Exception $e) {
    error_log('Forum category delete error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting category', 500);
}