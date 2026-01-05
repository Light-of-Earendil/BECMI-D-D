<?php
/**
 * BECMI D&D Character Manager - Delete Campaign Endpoint
 * 
 * Allows the campaign DM to delete a campaign.
 * This will set campaign_id to NULL for all associated sessions (not delete sessions).
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `campaign_id` (int, required) - Campaign ID to delete
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Campaign deleted successfully",
 *   "data": {
 *     "campaign_id": int
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Campaign DM: Can delete campaign
 * - Others: 403 Forbidden
 * 
 * **Cascade Behavior:**
 * - Sessions: campaign_id set to NULL (sessions are not deleted)
 * - Hex maps: campaign_id set to NULL (maps are not deleted)
 * 
 * **Warning:**
 * This is a destructive operation that cannot be undone.
 * Campaign data is permanently deleted, but sessions and maps remain.
 * 
 * @package api/campaigns
 * @api POST /api/campaigns/delete.php
 * @since 1.0.0
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $campaignId = isset($input['campaign_id']) ? (int) $input['campaign_id'] : 0;
    
    if ($campaignId <= 0) {
        Security::sendValidationErrorResponse(['campaign_id' => 'Valid campaign ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get campaign and verify permissions
    $campaign = $db->selectOne(
        "SELECT campaign_id, campaign_name, dm_user_id
         FROM campaigns
         WHERE campaign_id = ?",
        [$campaignId]
    );
    
    if (!$campaign) {
        Security::sendErrorResponse('Campaign not found', 404);
    }
    
    // Check permissions: only DM can delete
    if ($campaign['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to delete this campaign', 403);
    }
    
    // Delete the campaign (cascade will set campaign_id to NULL for sessions and maps)
    $db->delete("DELETE FROM campaigns WHERE campaign_id = ?", [$campaignId]);
    
    Security::logSecurityEvent('campaign_deleted', [
        'campaign_id' => $campaignId,
        'campaign_name' => $campaign['campaign_name'],
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'campaign_id' => $campaignId
    ], 'Campaign deleted successfully');
    
} catch (Exception $e) {
    error_log('Campaign delete error: ' . $e->getMessage());
    error_log('Campaign delete trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while deleting the campaign', 500);
}
?>
