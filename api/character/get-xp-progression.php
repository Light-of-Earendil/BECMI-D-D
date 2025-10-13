<?php
/**
 * BECMI D&D Character Manager - Get XP Progression
 * 
 * Returns XP requirements for character's class progression.
 * 
 * @return JSON XP progression data
 */

require_once __DIR__ . '/../../app/core/database.php';
require_once __DIR__ . '/../../app/core/security.php';
require_once __DIR__ . '/../../app/services/becmi-rules.php';

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
    
    // Get character ID from query string
    $characterId = isset($_GET['character_id']) ? (int) $_GET['character_id'] : null;
    
    if (!$characterId) {
        Security::sendErrorResponse('Character ID is required', 400);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get character
    $character = $db->selectOne(
        "SELECT character_id, character_name, class, level, experience_points, user_id, session_id 
         FROM characters 
         WHERE character_id = ?",
        [$characterId]
    );
    
    if (!$character) {
        Security::sendErrorResponse('Character not found', 404);
    }
    
    // Check permissions (owner or DM)
    $isOwner = $character['user_id'] === $userId;
    $isDM = false;
    
    if ($character['session_id']) {
        $session = $db->selectOne(
            "SELECT dm_user_id FROM game_sessions WHERE session_id = ?",
            [$character['session_id']]
        );
        $isDM = $session && $session['dm_user_id'] === $userId;
    }
    
    if (!$isOwner && !$isDM) {
        Security::sendErrorResponse('You do not have permission to view this character', 403);
    }
    
    // Get XP progression for the character's class
    $xpProgression = [];
    $maxLevel = 36; // Most classes can go to 36
    
    for ($level = 1; $level <= $maxLevel; $level++) {
        $requiredXp = BECMIRulesEngine::getExperienceForNextLevel($character['class'], $level);
        
        if ($requiredXp === null) {
            break; // Max level reached
        }
        
        $xpProgression[$level + 1] = $requiredXp;
    }
    
    // Get current XP and next level requirement
    $currentLevel = $character['level'];
    $currentXp = $character['experience_points'];
    $nextLevel = $currentLevel + 1;
    $xpForNextLevel = $xpProgression[$nextLevel] ?? null;
    
    // Calculate progress
    $xpProgress = 0;
    $canLevelUp = false;
    
    if ($xpForNextLevel !== null) {
        $xpProgress = min(($currentXp / $xpForNextLevel) * 100, 100);
        $canLevelUp = $currentXp >= $xpForNextLevel;
    }
    
    // Get spell slots for current level
    $spellSlots = BECMIRulesEngine::getSpellSlots($character['class'], $currentLevel);
    
    // Get spell slots for next level
    $nextLevelSpellSlots = null;
    if ($nextLevel <= $maxLevel) {
        $nextLevelSpellSlots = BECMIRulesEngine::getSpellSlots($character['class'], $nextLevel);
    }
    
    $response = [
        'success' => true,
        'data' => [
            'character_id' => $characterId,
            'class' => $character['class'],
            'current_level' => $currentLevel,
            'current_xp' => $currentXp,
            'next_level' => $nextLevel,
            'xp_for_next_level' => $xpForNextLevel,
            'xp_progress_percent' => round($xpProgress, 1),
            'can_level_up' => $canLevelUp,
            'xp_progression' => $xpProgression,
            'current_spell_slots' => $spellSlots,
            'next_level_spell_slots' => $nextLevelSpellSlots,
            'max_level' => $maxLevel
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("XP Progression Error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to get XP progression: ' . $e->getMessage(), 500);
}