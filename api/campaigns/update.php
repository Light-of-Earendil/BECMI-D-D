<?php
/**
 * BECMI D&D Character Manager - Update Campaign Endpoint
 * 
 * Allows the campaign DM to update campaign metadata.
 * Updates only the fields provided in the request body.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `campaign_id` (int, required) - Campaign ID to update
 * - `campaign_name` (string, optional) - Campaign name (3-100 characters)
 * - `campaign_description` (string, optional) - Campaign description
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Campaign updated successfully",
 *   "data": {
 *     "campaign_id": int,
 *     "campaign_name": string,
 *     ...
 *   }
 * }
 * ```
 * 
 * **Permissions:**
 * - Campaign DM: Can update campaign metadata
 * - Others: 403 Forbidden
 * 
 * **Validation:**
 * - Campaign name: 3-100 characters
 * - At least one field must be provided for update
 * 
 * @package api/campaigns
 * @api POST /api/campaigns/update.php
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
    
    // Check permissions: only DM can update
    if ($campaign['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to update this campaign', 403);
    }
    
    // Build update query dynamically based on provided fields
    $updateFields = [];
    $updateParams = [];
    
    if (isset($input['campaign_name'])) {
        $campaignName = Security::sanitizeInput($input['campaign_name']);
        if (strlen($campaignName) < 3 || strlen($campaignName) > 100) {
            Security::sendValidationErrorResponse(['campaign_name' => 'Campaign name must be between 3 and 100 characters']);
        }
        $updateFields[] = "campaign_name = ?";
        $updateParams[] = $campaignName;
    }
    
    if (isset($input['campaign_description'])) {
        $updateFields[] = "campaign_description = ?";
        $updateParams[] = Security::sanitizeInput($input['campaign_description']) ?: null;
    }
    
    if (empty($updateFields)) {
        Security::sendValidationErrorResponse(['general' => 'No fields to update']);
    }
    
    // Add updated_at
    $updateFields[] = "updated_at = NOW()";
    
    // Add campaign_id to params
    $updateParams[] = $campaignId;
    
    // Execute update
    $sql = "UPDATE campaigns SET " . implode(", ", $updateFields) . " WHERE campaign_id = ?";
    $db->update($sql, $updateParams);
    
    // Get updated campaign
    $updatedCampaign = $db->selectOne(
        "SELECT campaign_id, campaign_name, campaign_description, dm_user_id,
                created_at, updated_at
         FROM campaigns
         WHERE campaign_id = ?",
        [$campaignId]
    );
    
    Security::logSecurityEvent('campaign_updated', [
        'campaign_id' => $campaignId,
        'user_id' => $userId
    ]);
    
    Security::sendSuccessResponse([
        'campaign_id' => (int) $updatedCampaign['campaign_id'],
        'campaign_name' => $updatedCampaign['campaign_name'],
        'campaign_description' => $updatedCampaign['campaign_description'],
        'dm_user_id' => (int) $updatedCampaign['dm_user_id'],
        'created_at' => $updatedCampaign['created_at'],
        'updated_at' => $updatedCampaign['updated_at']
    ], 'Campaign updated successfully');
    
} catch (Exception $e) {
    error_log('Campaign update error: ' . $e->getMessage());
    error_log('Campaign update trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while updating the campaign', 500);
}
?>
