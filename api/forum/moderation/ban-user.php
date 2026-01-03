<?php
/**
 * BECMI D&D Character Manager - Forum Moderation Ban User Endpoint
 * 
 * Bans or unbans a user (moderator only)
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
    $moderatorId = Security::getCurrentUserId();
    
    // Get JSON input
    $data = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    if (empty($data['user_id'])) {
        $errors['user_id'] = 'User ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $targetUserId = (int) $data['user_id'];
    $isBanned = isset($data['is_banned']) ? (bool) $data['is_banned'] : true;
    $banReason = isset($data['ban_reason']) ? trim($data['ban_reason']) : null;
    $banExpiresAt = isset($data['ban_expires_at']) ? $data['ban_expires_at'] : null;
    
    // Don't allow banning yourself
    if ($targetUserId == $moderatorId) {
        Security::sendErrorResponse('You cannot ban yourself', 400);
    }
    
    // Check if target user exists
    $targetUser = $db->selectOne(
        "SELECT user_id, username, is_banned FROM users WHERE user_id = ?",
        [$targetUserId]
    );
    
    if (!$targetUser) {
        Security::sendErrorResponse('User not found', 404);
    }
    
    // Validate ban expiration date if provided
    $banExpiresAtFormatted = null;
    if ($banExpiresAt) {
        try {
            $expiresDate = new DateTime($banExpiresAt);
            $now = new DateTime();
            if ($expiresDate < $now) {
                Security::sendValidationErrorResponse(['ban_expires_at' => 'Ban expiration date must be in the future']);
            }
            $banExpiresAtFormatted = $expiresDate->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            Security::sendValidationErrorResponse(['ban_expires_at' => 'Invalid date format']);
        }
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Update user ban status
        $db->execute(
            "UPDATE users 
             SET is_banned = ?,
                 ban_reason = ?,
                 ban_expires_at = ?
             WHERE user_id = ?",
            [
                $isBanned ? 1 : 0,
                $banReason,
                $banExpiresAtFormatted,
                $targetUserId
            ]
        );
        
        // Log ban action in forum_user_bans table
        if ($isBanned) {
            $db->insert(
                "INSERT INTO forum_user_bans 
                 (user_id, banned_by_user_id, ban_reason, ban_expires_at, created_at)
                 VALUES (?, ?, ?, ?, NOW())",
                [$targetUserId, $moderatorId, $banReason, $banExpiresAtFormatted]
            );
        }
        
        // Commit transaction
        $db->commit();
        
        // Get updated user info
        $updatedUser = $db->selectOne(
            "SELECT user_id, username, is_banned, ban_reason, ban_expires_at
             FROM users 
             WHERE user_id = ?",
            [$targetUserId]
        );
        
        Security::sendSuccessResponse([
            'user' => [
                'user_id' => (int) $updatedUser['user_id'],
                'username' => $updatedUser['username'],
                'is_banned' => (bool) $updatedUser['is_banned'],
                'ban_reason' => $updatedUser['ban_reason'],
                'ban_expires_at' => $updatedUser['ban_expires_at']
            ],
            'banned_by' => [
                'user_id' => $moderatorId
            ]
        ], $isBanned ? 'User banned successfully' : 'User unbanned successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Forum ban user error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while banning/unbanning user', 500);
}