<?php
/**
 * BECMI D&D Character Manager - Forum Post Attachments
 * 
 * API endpoint to manage post attachments (list, create, delete)
 */

require_once __DIR__ . '/../../../app/core/database.php';
require_once __DIR__ . '/../../../app/core/security.php';

Security::init();
header('Content-Type: application/json');

try {
    $db = getDB();
    $userId = Security::getCurrentUserId();
    $isModerator = Security::isModerator();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // List attachments for a post
        Security::requireAuth();
        
        if (empty($_GET['post_id'])) {
            Security::sendErrorResponse('Post ID is required', 400);
        }
        
        $postId = (int) $_GET['post_id'];
        
        // Verify post exists and user has access
        $post = $db->selectOne(
            "SELECT p.post_id, p.user_id, t.category_id, c.is_private as category_is_private
             FROM forum_posts p
             JOIN forum_threads t ON p.thread_id = t.thread_id
             JOIN forum_categories c ON t.category_id = c.category_id
             WHERE p.post_id = ?",
            [$postId]
        );
        
        if (!$post) {
            Security::sendErrorResponse('Post not found', 404);
        }
        
        // Check private category access
        if ($post['category_is_private'] && !$isModerator) {
            Security::sendErrorResponse('Access denied', 403);
        }
        
        // Get attachments
        $attachments = $db->select(
            "SELECT 
                attachment_id,
                post_id,
                file_path,
                file_name,
                file_size,
                mime_type,
                uploaded_at
             FROM forum_post_attachments
             WHERE post_id = ?
             ORDER BY uploaded_at ASC",
            [$postId]
        );
        
        $formatted = array_map(function($att) {
            return [
                'attachment_id' => (int) $att['attachment_id'],
                'post_id' => (int) $att['post_id'],
                'file_path' => $att['file_path'],
                'file_name' => $att['file_name'],
                'file_size' => (int) $att['file_size'],
                'mime_type' => $att['mime_type'],
                'uploaded_at' => $att['uploaded_at']
            ];
        }, $attachments);
        
        Security::sendSuccessResponse($formatted);
        
    } elseif ($method === 'POST') {
        // Associate uploaded image with post
        Security::requireAuth();
        
        if (Security::isBanned()) {
            Security::sendErrorResponse('You are banned from the forum', 403);
        }
        
        $data = Security::validateJSONInput();
        
        if (empty($data['post_id'])) {
            Security::sendValidationErrorResponse(['post_id' => 'Post ID is required']);
        }
        
        if (empty($data['file_path'])) {
            Security::sendValidationErrorResponse(['file_path' => 'File path is required']);
        }
        
        $postId = (int) $data['post_id'];
        $filePath = trim($data['file_path']);
        $fileName = isset($data['file_name']) ? trim($data['file_name']) : basename($filePath);
        $fileSize = isset($data['file_size']) ? (int) $data['file_size'] : 0;
        $mimeType = isset($data['mime_type']) ? trim($data['mime_type']) : 'image/jpeg';
        
        // Verify post exists and user is author or moderator
        $post = $db->selectOne(
            "SELECT post_id, user_id FROM forum_posts WHERE post_id = ?",
            [$postId]
        );
        
        if (!$post) {
            Security::sendErrorResponse('Post not found', 404);
        }
        
        // Check permissions (author or moderator)
        if ($post['user_id'] != $userId && !$isModerator) {
            Security::sendErrorResponse('You do not have permission to add attachments to this post', 403);
        }
        
        // Verify file exists
        $fullPath = __DIR__ . '/../../../public/' . $filePath;
        if (!file_exists($fullPath)) {
            Security::sendErrorResponse('File not found', 404);
        }
        
        // Get actual file size if not provided
        if ($fileSize === 0) {
            $fileSize = filesize($fullPath);
        }
        
        // Create attachment record
        $attachmentId = $db->insert(
            "INSERT INTO forum_post_attachments 
             (post_id, file_path, file_name, file_size, mime_type, uploaded_at)
             VALUES (?, ?, ?, ?, ?, NOW())",
            [$postId, $filePath, $fileName, $fileSize, $mimeType]
        );
        
        $attachment = $db->selectOne(
            "SELECT 
                attachment_id,
                post_id,
                file_path,
                file_name,
                file_size,
                mime_type,
                uploaded_at
             FROM forum_post_attachments
             WHERE attachment_id = ?",
            [$attachmentId]
        );
        
        $formatted = [
            'attachment_id' => (int) $attachment['attachment_id'],
            'post_id' => (int) $attachment['post_id'],
            'file_path' => $attachment['file_path'],
            'file_name' => $attachment['file_name'],
            'file_size' => (int) $attachment['file_size'],
            'mime_type' => $attachment['mime_type'],
            'uploaded_at' => $attachment['uploaded_at']
        ];
        
        Security::sendSuccessResponse($formatted, 'Attachment created successfully');
        
    } elseif ($method === 'DELETE') {
        // Delete attachment
        Security::requireAuth();
        
        if (empty($_GET['attachment_id'])) {
            Security::sendErrorResponse('Attachment ID is required', 400);
        }
        
        $attachmentId = (int) $_GET['attachment_id'];
        
        // Get attachment
        $attachment = $db->selectOne(
            "SELECT a.attachment_id, a.post_id, a.file_path, p.user_id
             FROM forum_post_attachments a
             JOIN forum_posts p ON a.post_id = p.post_id
             WHERE a.attachment_id = ?",
            [$attachmentId]
        );
        
        if (!$attachment) {
            Security::sendErrorResponse('Attachment not found', 404);
        }
        
        // Check permissions (author or moderator)
        if ($attachment['user_id'] != $userId && !$isModerator) {
            Security::sendErrorResponse('You do not have permission to delete this attachment', 403);
        }
        
        // Delete file
        $fullPath = __DIR__ . '/../../../public/' . $attachment['file_path'];
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
        
        // Delete attachment record
        $db->execute(
            "DELETE FROM forum_post_attachments WHERE attachment_id = ?",
            [$attachmentId]
        );
        
        Security::sendSuccessResponse(null, 'Attachment deleted successfully');
        
    } else {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log('Forum attachments error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred', 500);
}
