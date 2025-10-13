<?php
/**
 * BECMI D&D Character Manager - Get Character Skills
 * 
 * Returns all general skills for a character with ability modifiers.
 * Used for displaying skills on character sheet.
 * 
 * @return JSON Array of skills with ability scores and modifiers
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/becmi-rules.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get character ID from query parameters
    $characterId = isset($_GET['character_id']) ? (int)$_GET['character_id'] : 0;
    
    if ($characterId <= 0) {
        Security::sendValidationErrorResponse(['character_id' => 'Valid character ID required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get character with abilities for access check and skill modifiers
    $character = $db->selectOne(
        "SELECT c.user_id, c.session_id, c.strength, c.dexterity, c.constitution, 
                c.intelligence, c.wisdom, c.charisma, gs.dm_user_id
         FROM characters c
         LEFT JOIN game_sessions gs ON c.session_id = gs.session_id
         WHERE c.character_id = ? AND c.is_active = 1",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check if user owns character or is DM of the session
    $isOwner = $character['user_id'] == $userId;
    $isDM = $character['session_id'] && $character['dm_user_id'] == $userId;
    
    if (!$isOwner && !$isDM) {
        Security::sendErrorResponse('You do not have permission to view this character', 403);
    }
    
    // Fetch skills
    $skills = $db->select(
        "SELECT cs.skill_name, cs.learned_at_level, 
                COALESCE(gs.governing_ability, 'intelligence') as governing_ability,
                COALESCE(gs.description, '') as description
         FROM character_skills cs
         LEFT JOIN general_skills gs ON cs.skill_name = gs.skill_name
         WHERE cs.character_id = ?
         ORDER BY gs.governing_ability, cs.skill_name",
        [$characterId]
    );
    
    // Add ability scores and modifiers to each skill
    $formattedSkills = array_map(function($skill) use ($character) {
        $governingAbility = $skill['governing_ability'];
        $abilityScore = $character[$governingAbility] ?? 10;
        
        // Calculate ability modifier using BECMI rules
        $modifier = BECMIRulesEngine::getAbilityModifier($abilityScore);
        
        return [
            'skill_name' => $skill['skill_name'],
            'governing_ability' => $governingAbility,
            'description' => $skill['description'],
            'learned_at_level' => (int) $skill['learned_at_level'],
            'ability_score' => (int) $abilityScore,
            'ability_modifier' => $modifier
        ];
    }, $skills);
    
    Security::sendSuccessResponse([
        'skills' => $formattedSkills,
        'count' => count($formattedSkills)
    ]);
    
} catch (Exception $e) {
    error_log("Get skills error: " . $e->getMessage());
    error_log("Get skills error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to fetch skills', 500);
}
?>

