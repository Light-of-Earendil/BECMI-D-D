<?php
/**
 * BECMI D&D Character Manager - Generate Character Portrait (Temporary/Pre-Creation)
 * 
 * Uses Together AI's FLUX.1-schnell-Free model to generate character portraits
 * This version is for characters not yet created (during character creation wizard)
 * 
 * @return JSON Success/error response with image URL
 */

// Disable error display to prevent HTML output
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once '../../app/core/security.php';
require_once '../../app/services/portrait-manager.php';
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
    
    // Build portrait prompt from character details
    $prompt = buildPortraitPrompt($data);
    
    // Call Together AI API
    $imageData = generatePortraitWithTogetherAI($prompt, $together_AI_api_key);
    
    if (!$imageData || !isset($imageData['url'])) {
        Security::sendErrorResponse('Failed to generate portrait from Together AI', 500);
    }
    
    // Download the portrait to local server (using temporary ID)
    $tempId = 'temp_' . time() . '_' . rand(1000, 9999);
    $localPortraitUrl = PortraitManager::downloadPortrait(
        $imageData['url'], 
        $tempId, 
        $data['character_name'] ?? 'temp_character'
    );
    
    if (!$localPortraitUrl) {
        Security::sendErrorResponse('Failed to download portrait to local server', 500);
    }
    
    Security::sendSuccessResponse([
        'portrait_url' => $localPortraitUrl,
        'prompt_used' => $prompt,
        'model' => $imageData['model']
    ], 'Portrait generated and saved successfully');
    
} catch (Exception $e) {
    error_log("Generate portrait temp error: " . $e->getMessage());
    error_log("Generate portrait temp error file: " . $e->getFile() . " line " . $e->getLine());
    error_log("Generate portrait temp error trace: " . $e->getTraceAsString());
    
    Security::sendErrorResponse('Failed to generate portrait: ' . $e->getMessage(), 500);
}

/**
 * Build a descriptive prompt for character portrait generation
 */
function buildPortraitPrompt($data) {
    $parts = [];
    
    // Start with basic description
    $parts[] = "Fotorealistic Medieval Low-fantasy realistic gritty character portrait";
    
    // Add gender if available
    if (!empty($data['gender'])) {
        $parts[] = strtolower($data['gender']);
    }
    
    // Add class/race description
    $classDescriptions = [
        'fighter' => 'warrior in armor holding sword',
        'magic_user' => 'wizard in flowing robes with mystical aura',
        'cleric' => 'holy priest with religious symbols and divine light',
        'thief' => 'cunning rogue in leather armor with daggers',
        'dwarf' => 'stout dwarven warrior with thick beard',
        'elf' => 'elegant elven adventurer with pointed ears and graceful features',
        'halfling' => 'cheerful halfling adventurer',
        'druid' => 'nature priest with wooden staff surrounded by natural elements',
        'mystic' => 'martial artist monk in simple robes with peaceful expression'
    ];
    
    if (!empty($data['class']) && isset($classDescriptions[$data['class']])) {
        $parts[] = $classDescriptions[$data['class']];
    }
    
    // Add physical details
    if (!empty($data['hair_color'])) {
        $parts[] = "with " . strtolower($data['hair_color']) . " hair";
    }
    
    if (!empty($data['eye_color'])) {
        $parts[] = strtolower($data['eye_color']) . " eyes";
    }
    
    // Add age hint
    if (!empty($data['age'])) {
        $age = (int)$data['age'];
        if ($age < 20) {
            $parts[] = "youthful appearance";
        } elseif ($age > 50) {
            $parts[] = "mature and weathered features";
        }
    }
    
    // Style instructions for better quality
    $parts[] = "professional fantasy art style";
    $parts[] = "detailed facial features";
    $parts[] = "dramatic lighting";
    $parts[] = "head and shoulders portrait";
    $parts[] = "looking at viewer";
    $parts[] = "Dungeons and Dragons character art";
    $parts[] = "heroic pose";
    
    return implode(', ', $parts);
}

/**
 * Call Together AI API to generate portrait
 */
function generatePortraitWithTogetherAI($prompt, $apiKey) {
    $url = 'https://api.together.xyz/v1/images/generations';
    
    $data = [
        'model' => 'black-forest-labs/FLUX.1-schnell-Free',
        'prompt' => $prompt,
        'width' => 512,
        'height' => 512,
        'steps' => 4,
        'n' => 1
    ];
    
    error_log("Together AI request - Prompt: " . $prompt);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
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
        error_log("Together AI API curl error: " . $error);
        throw new Exception("Network error connecting to Together AI: " . $error);
    }
    
    error_log("Together AI response - HTTP $httpCode: " . substr($response, 0, 500));
    
    if ($httpCode !== 200) {
        error_log("Together AI API error - HTTP $httpCode: $response");
        throw new Exception("Together AI API returned HTTP $httpCode");
    }
    
    $result = json_decode($response, true);
    
    if (!$result || !isset($result['data']) || empty($result['data'])) {
        error_log("Together AI API invalid response structure: " . $response);
        throw new Exception("Invalid response from Together AI");
    }
    
    // Get the first image URL
    $imageUrl = $result['data'][0]['url'] ?? null;
    
    if (!$imageUrl) {
        error_log("Together AI API no image URL in response");
        throw new Exception("No image URL in Together AI response");
    }
    
    return [
        'url' => $imageUrl,
        'model' => $data['model'],
        'prompt' => $prompt
    ];
}

?>

