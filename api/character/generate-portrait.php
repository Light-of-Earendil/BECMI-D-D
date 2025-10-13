<?php
/**
 * BECMI D&D Character Manager - Generate Character Portrait
 * 
 * Uses Together AI's FLUX.1-schnell-Free model to generate character portraits
 * 
 * @return JSON Success/error response with image URL
 */

// Disable error display to prevent HTML output
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once '../../app/core/database.php';
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
                c.age, c.height, c.weight, c.hair_color, c.eye_color
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
    
    // Build portrait prompt from character details
    $prompt = buildPortraitPrompt($character);
    
    // Call Together AI API
    $imageData = generatePortraitWithTogetherAI($prompt, $together_AI_api_key);
    
    if (!$imageData || !isset($imageData['url'])) {
        Security::sendErrorResponse('Failed to generate portrait', 500);
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
    
    // Delete old portrait if it exists
    if ($character['portrait_url']) {
        PortraitManager::deletePortrait($character['portrait_url']);
    }
    
    // Update character with local portrait URL
    $db->execute(
        "UPDATE characters 
         SET portrait_url = ?
         WHERE character_id = ?",
        [$localPortraitUrl, $characterId]
    );
    
    // Log the change
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
    
    Security::sendSuccessResponse([
        'character_id' => $characterId,
        'portrait_url' => $localPortraitUrl,
        'prompt_used' => $prompt
    ], 'Portrait generated and saved successfully');
    
} catch (Exception $e) {
    error_log("Generate portrait error: " . $e->getMessage());
    error_log("Generate portrait error file: " . $e->getFile() . " line " . $e->getLine());
    error_log("Generate portrait error trace: " . $e->getTraceAsString());
    
    Security::sendErrorResponse('Failed to generate portrait: ' . $e->getMessage(), 500);
}

/**
 * Build a descriptive prompt for character portrait generation
 */
function buildPortraitPrompt($character) {
    $parts = [];
    
    // Start with basic description
    $parts[] = "Fotorealistic Medieval Low-fantasy realistic gritty character portrait";
    
    // Add gender if available
    if (!empty($character['gender'])) {
        $parts[] = $character['gender'];
    }
    
    // Add class/race description
    $classDescriptions = [
        'fighter' => 'warrior in armor',
        'magic_user' => 'wizard with robes and mystical aura',
        'cleric' => 'holy priest with religious symbols',
        'thief' => 'rogue with leather armor and daggers',
        'dwarf' => 'stout dwarven warrior with beard',
        'elf' => 'elegant elven adventurer with pointed ears',
        'halfling' => 'small halfling with cheerful expression',
        'druid' => 'nature priest with wooden staff and natural clothing',
        'mystic' => 'martial artist monk in simple robes'
    ];
    
    if (isset($classDescriptions[$character['class']])) {
        $parts[] = $classDescriptions[$character['class']];
    }
    
    // Add physical details
    if (!empty($character['hair_color'])) {
        $parts[] = "with " . strtolower($character['hair_color']) . " hair";
    }
    
    if (!empty($character['eye_color'])) {
        $parts[] = strtolower($character['eye_color']) . " eyes";
    }
    
    // Add age hint
    if (!empty($character['age'])) {
        $age = (int)$character['age'];
        if ($age < 20) {
            $parts[] = "youthful appearance";
        } elseif ($age > 50) {
            $parts[] = "mature and weathered";
        }
    }
    
    // Style instructions
    $parts[] = "fotorealistic style";
    $parts[] = "detailed face";
    $parts[] = "dramatic lighting";
    $parts[] = "dungeons and dragons character";

    if (!empty($character['backstory'])) {
        $parts[] = strtolower("backstory " . $character['backstory']);
    }
    
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
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        error_log("Together AI API curl error: " . $error);
        return false;
    }
    
    if ($httpCode !== 200) {
        error_log("Together AI API error - HTTP $httpCode: $response");
        return false;
    }
    
    $result = json_decode($response, true);
    
    if (!$result || !isset($result['data']) || empty($result['data'])) {
        error_log("Together AI API invalid response: " . $response);
        return false;
    }
    
    // Get the first image URL
    $imageUrl = $result['data'][0]['url'] ?? null;
    
    if (!$imageUrl) {
        error_log("Together AI API no image URL in response");
        return false;
    }
    
    return [
        'url' => $imageUrl,
        'model' => $data['model'],
        'prompt' => $prompt
    ];
}

?>

