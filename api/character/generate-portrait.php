<?php
/**
 * BECMI D&D Character Manager - Generate Character Portrait
 * 
 * Uses Together AI's image generation API to generate character portraits
 * 
 * @return JSON Success/error response with image URL
 */

// Disable error display to prevent HTML output
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/portrait-manager.php';
require_once '../../app/services/portrait-prompt.php';
require_once '../../config/together-ai.php';

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
    
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($data === null) {
        Security::sendErrorResponse('Invalid JSON data', 400);
    }
    
    // Validate required fields
    if (!isset($data['character_id'])) {
        Security::sendErrorResponse('Missing required field: character_id', 400);
    }
    
    $characterId = (int) $data['character_id'];
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify character ownership and get character details
    $character = $db->selectOne(
        "SELECT c.character_id, c.user_id, c.character_name, c.class, c.gender,
                c.age, c.height, c.weight, c.hair_color, c.eye_color,
                c.strength, c.dexterity, c.constitution, c.intelligence, c.wisdom, c.charisma
         FROM characters c
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check permissions (only owner can generate portrait)
    if ($character['user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to modify this character', 403);
    }
    
    // Validate Together AI API key is configured
    if (empty($together_AI_api_key)) {
        error_log("Together AI API key not configured - TOGETHER_AI_API_KEY environment variable is missing or empty");
        Security::sendErrorResponse('Portrait generation is not configured. Please contact the administrator.', 503);
    }
    
    // Build portrait prompt from character details (DB + optional POST overrides)
    $promptData = array_merge($character, is_array($data) ? $data : []);
    $prompt = PortraitPromptBuilder::build($promptData);
    
    // Call Together AI API
    $imageData = generatePortraitWithTogetherAI($prompt, $together_AI_api_key);
    
    if (!$imageData || !isset($imageData['url'])) {
        throw new Exception('Failed to generate portrait from Together AI');
    }
    
    // Save portrait URL to character
    // Update character with portrait URL (will be updated with local URL after download)
    $db->execute(
        "UPDATE characters 
         SET portrait_url = ?
         WHERE character_id = ?",
        [$imageData['url'], $characterId]
    );
    
    // Download the portrait to local server
    $localPortraitUrl = PortraitManager::downloadPortrait(
        $imageData['url'], 
        $characterId, 
        $character['character_name']
    );
    
    if (!$localPortraitUrl) {
        throw new Exception('Failed to download portrait to local server');
    }
    
    // Delete old portrait if it exists (only if it's a local file)
    if (!empty($character['portrait_url']) && strpos($character['portrait_url'], 'images/portraits/') === 0) {
        try {
            PortraitManager::deletePortrait($character['portrait_url']);
        } catch (Exception $e) {
            // Log but don't fail if deletion fails
            error_log("Failed to delete old portrait: " . $e->getMessage());
        }
    }
    
    // Update character with local portrait URL
    $db->execute(
        "UPDATE characters 
         SET portrait_url = ?
         WHERE character_id = ?",
        [$localPortraitUrl, $characterId]
    );
    
    // Log the change (ignore if table doesn't exist or insert fails)
    try {
        $db->execute(
            "INSERT INTO character_changes 
             (character_id, user_id, change_type, field_name, new_value, change_reason)
             VALUES (?, ?, 'portrait', 'portrait_url', ?, 'AI-generated character portrait')",
            [
                $characterId,
                $userId,
                $localPortraitUrl
            ]
        );
    } catch (Exception $e) {
        // Log but don't fail if change logging fails
        error_log("Failed to log character change: " . $e->getMessage());
    }
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'portrait_url' => $localPortraitUrl,
        'prompt_used' => $prompt
    ], 'Portrait generated and saved successfully');
    
} catch (Exception $e) {
    $errorMessage = $e->getMessage();
    $fullErrorDetails = $errorMessage;
    
    error_log("=== GENERATE PORTRAIT ERROR ===");
    error_log("Error message: " . $errorMessage);
    error_log("Error file: " . $e->getFile() . " line " . $e->getLine());
    error_log("Error trace: " . $e->getTraceAsString());
    error_log("=== END GENERATE PORTRAIT ERROR ===");
    
    // Send detailed error response with full error message
    // We'll use a custom response to include full error details
    if (session_status() === PHP_SESSION_ACTIVE) {
        @session_write_close();
    }
    
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    
    $response = [
        'status' => 'error',
        'message' => 'Failed to generate portrait: ' . $errorMessage,
        'code' => 'ERROR',
        'error_details' => $fullErrorDetails,
        'error_type' => get_class($e)
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Call Together AI API to generate portrait
 */
function generatePortraitWithTogetherAI($prompt, $apiKey) {
    $url = 'https://api.together.xyz/v1/images/generations';
    
    $data = [
        'model' => 'black-forest-labs/FLUX.2-pro',
        'prompt' => $prompt,
        'response_format' => 'url'
    ];
    
    // Log full request details for debugging
    $requestDataJson = json_encode($data);
    error_log("=== TOGETHER AI REQUEST ===");
    error_log("URL: $url");
    error_log("Prompt: " . $prompt);
    error_log("Full request data: " . $requestDataJson);
    error_log("API Key present: " . (empty($apiKey) ? 'NO' : 'YES (length: ' . strlen($apiKey) . ')'));
    error_log("API Key first 10 chars: " . (empty($apiKey) ? 'N/A' : substr($apiKey, 0, 10) . '...'));
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $requestDataJson);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60); // 60 second timeout for image generation
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        error_log("=== TOGETHER AI CURL ERROR ===");
        error_log("Curl error: " . $error);
        throw new Exception("Network error connecting to Together AI: " . $error);
    }
    
    // Log full response (no truncation)
    error_log("=== TOGETHER AI RESPONSE ===");
    error_log("HTTP Code: $httpCode");
    error_log("Full response body: " . $response);
    
    if ($httpCode !== 200) {
        // Try to parse error response for detailed error message
        $errorMessage = "Together AI API returned HTTP $httpCode";
        $errorDetails = '';
        
        if (!empty($response)) {
            $errorResponse = json_decode($response, true);
            if ($errorResponse && isset($errorResponse['error'])) {
                // Together AI error format
                if (is_string($errorResponse['error'])) {
                    $errorDetails = $errorResponse['error'];
                } elseif (is_array($errorResponse['error'])) {
                    if (isset($errorResponse['error']['message'])) {
                        $errorDetails = $errorResponse['error']['message'];
                    } elseif (isset($errorResponse['error']['code'])) {
                        $errorDetails = "Code: " . $errorResponse['error']['code'];
                        if (isset($errorResponse['error']['message'])) {
                            $errorDetails .= " - " . $errorResponse['error']['message'];
                        }
                    } else {
                        $errorDetails = json_encode($errorResponse['error']);
                    }
                }
            } elseif (isset($errorResponse['message'])) {
                $errorDetails = $errorResponse['message'];
            } else {
                // If not JSON or no error field, use raw response
                $errorDetails = $response;
            }
        }
        
        $fullErrorMessage = $errorMessage;
        if (!empty($errorDetails)) {
            $fullErrorMessage .= " - " . $errorDetails;
        }
        
        error_log("=== TOGETHER AI ERROR DETAILS ===");
        error_log("HTTP Code: $httpCode");
        error_log("Error message: " . $fullErrorMessage);
        error_log("Full error response: " . $response);
        if (isset($errorResponse)) {
            error_log("Parsed error response: " . json_encode($errorResponse, JSON_PRETTY_PRINT));
        }
        
        throw new Exception($fullErrorMessage);
    }
    
    $result = json_decode($response, true);
    
    if (!$result || !isset($result['data']) || empty($result['data'])) {
        error_log("=== TOGETHER AI INVALID RESPONSE ===");
        error_log("Response structure invalid");
        error_log("Full response: " . $response);
        error_log("Parsed result: " . json_encode($result, JSON_PRETTY_PRINT));
        throw new Exception("Invalid response from Together AI - Response: " . substr($response, 0, 500));
    }
    
    // Get the first image URL
    $imageUrl = $result['data'][0]['url'] ?? null;
    
    if (!$imageUrl) {
        error_log("=== TOGETHER AI NO IMAGE URL ===");
        error_log("Response data: " . json_encode($result, JSON_PRETTY_PRINT));
        throw new Exception("No image URL in Together AI response");
    }
    
    return [
        'url' => $imageUrl,
        'model' => $data['model'],
        'prompt' => $prompt
    ];
}

?>
