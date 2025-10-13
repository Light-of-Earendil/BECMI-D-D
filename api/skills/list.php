<?php
/**
 * BECMI D&D Character Manager - Skills List Endpoint
 * 
 * Returns all available general skills from the database.
 * Used during character creation for skill selection.
 * 
 * @return JSON Array of all skills with ability information
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

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
    
    // Get database connection
    $db = getDB();
    
    // Fetch all skills ordered by ability and name
    $skills = $db->select(
        "SELECT skill_id, skill_name, governing_ability, description
         FROM general_skills
         ORDER BY governing_ability, skill_name"
    );
    
    // Group skills by governing ability for easier frontend handling
    $groupedSkills = [];
    foreach ($skills as $skill) {
        $ability = $skill['governing_ability'];
        if (!isset($groupedSkills[$ability])) {
            $groupedSkills[$ability] = [];
        }
        $groupedSkills[$ability][] = [
            'skill_id' => (int) $skill['skill_id'],
            'skill_name' => $skill['skill_name'],
            'governing_ability' => $skill['governing_ability'],
            'description' => $skill['description']
        ];
    }
    
    Security::sendSuccessResponse([
        'skills' => $skills,
        'grouped_skills' => $groupedSkills,
        'total_count' => count($skills)
    ]);
    
} catch (Exception $e) {
    error_log("Skills list error: " . $e->getMessage());
    error_log("Skills list error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to fetch skills', 500);
}
?>

