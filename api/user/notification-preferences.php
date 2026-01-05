<?php
/**
 * BECMI D&D Character Manager - Notification Preferences API
 * 
 * GET: Retrieve user's notification preferences
 * POST: Update user's notification preferences
 */

// Disable output compression and clear buffers to prevent JSON parse errors
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);
while (ob_get_level()) {
    ob_end_clean();
}

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

try {
    // Require authentication
    Security::requireAuth();
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get preferences
        $prefs = $db->selectOne(
            "SELECT user_id, email_session_reminders, email_session_cancelled, email_xp_awarded, browser_hp_critical, browser_xp_awarded, browser_item_received, browser_session_starting, created_at, updated_at, prefer_dm_dashboard FROM user_notification_preferences WHERE user_id = ?",
            [$userId]
        );
        
        // If no preferences exist, create defaults
        if (!$prefs) {
            $db->execute(
                "INSERT INTO user_notification_preferences (user_id) VALUES (?)",
                [$userId]
            );
            
            $prefs = $db->selectOne(
                "SELECT user_id, email_session_reminders, email_session_cancelled, email_xp_awarded, browser_hp_critical, browser_xp_awarded, browser_item_received, browser_session_starting, created_at, updated_at, prefer_dm_dashboard FROM user_notification_preferences WHERE user_id = ?",
                [$userId]
            );
        }
        
        Security::sendSuccessResponse([
            'preferences' => [
                'email_session_reminders' => (bool) $prefs['email_session_reminders'],
                'email_session_cancelled' => (bool) $prefs['email_session_cancelled'],
                'email_xp_awarded' => (bool) $prefs['email_xp_awarded'],
                'browser_hp_critical' => (bool) $prefs['browser_hp_critical'],
                'browser_xp_awarded' => (bool) $prefs['browser_xp_awarded'],
                'browser_item_received' => (bool) $prefs['browser_item_received'],
                'browser_session_starting' => (bool) $prefs['browser_session_starting'],
                'prefer_dm_dashboard' => (bool) ($prefs['prefer_dm_dashboard'] ?? false)
            ]
        ], 'Notification preferences retrieved');
        
    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Update preferences
        $data = Security::validateJSONInput();
        
        // Build UPDATE query for provided fields
        $updates = [];
        $params = [];
        
        $allowedFields = [
            'email_session_reminders',
            'email_session_cancelled',
            'email_xp_awarded',
            'browser_hp_critical',
            'browser_xp_awarded',
            'browser_item_received',
            'browser_session_starting',
            'prefer_dm_dashboard'
        ];
        
        // SECURITY: Use explicit whitelist and backticks for field names
        // Put userId first for INSERT, then field values for UPDATE
        $params = [$userId];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                // Use backticks for safety and explicit field validation
                $updates[] = "`{$field}` = ?";
                $params[] = (bool) $data[$field];
            }
        }
        
        if (empty($updates)) {
            Security::sendErrorResponse('No valid preferences provided', 400);
        }
        
        $db->execute(
            "INSERT INTO user_notification_preferences (user_id) VALUES (?)
             ON DUPLICATE KEY UPDATE " . implode(', ', $updates),
            $params
        );
        
        // Get updated preferences
        $updatedPrefs = $db->selectOne(
            "SELECT user_id, email_session_reminders, email_session_cancelled, email_xp_awarded, browser_hp_critical, browser_xp_awarded, browser_item_received, browser_session_starting, created_at, updated_at, prefer_dm_dashboard FROM user_notification_preferences WHERE user_id = ?",
            [$userId]
        );
        
        Security::sendSuccessResponse([
            'preferences' => [
                'email_session_reminders' => (bool) $updatedPrefs['email_session_reminders'],
                'email_session_cancelled' => (bool) $updatedPrefs['email_session_cancelled'],
                'email_xp_awarded' => (bool) $updatedPrefs['email_xp_awarded'],
                'browser_hp_critical' => (bool) $updatedPrefs['browser_hp_critical'],
                'browser_xp_awarded' => (bool) $updatedPrefs['browser_xp_awarded'],
                'browser_item_received' => (bool) $updatedPrefs['browser_item_received'],
                'browser_session_starting' => (bool) $updatedPrefs['browser_session_starting'],
                'prefer_dm_dashboard' => (bool) ($updatedPrefs['prefer_dm_dashboard'] ?? false)
            ]
        ], 'Notification preferences updated');
        
    } else {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Notification preferences error: " . $e->getMessage());
    error_log("Notification preferences error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to handle notification preferences', 500);
}
?>

