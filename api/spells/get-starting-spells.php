<?php
/**
 * BECMI D&D Character Manager - Get Starting Spells
 * 
 * Returns 1st level Magic-User spells suitable for starting characters
 * Rules Cyclopedia Chapter 3
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
    
    // Get all 1st level magic-user spells
    // These are the spells a Magic-User teacher would have available
    $spells = $db->select(
        "SELECT 
            spell_id,
            spell_name,
            spell_level,
            spell_type,
            range_text,
            duration_text,
            description,
            components,
            reversible,
            reverse_name,
            reverse_description
         FROM spells
         WHERE spell_type = 'magic_user' 
         AND spell_level = 1
         ORDER BY spell_name ASC"
    );
    
    // Format spells for frontend
    $formattedSpells = array_map(function($spell) {
        return [
            'spell_id' => (int) $spell['spell_id'],
            'spell_name' => $spell['spell_name'],
            'spell_level' => (int) $spell['spell_level'],
            'spell_type' => $spell['spell_type'],
            'range' => $spell['range_text'],
            'duration' => $spell['duration_text'],
            'description' => $spell['description'],
            'components' => $spell['components'],
            'reversible' => (bool) $spell['reversible'],
            'reverse_name' => $spell['reverse_name'],
            'reverse_description' => $spell['reverse_description']
        ];
    }, $spells);
    
    Security::sendSuccessResponse([
        'spells' => $formattedSpells,
        'count' => count($formattedSpells)
    ], 'Starting spells retrieved successfully');
    
} catch (Exception $e) {
    error_log("Error fetching starting spells: " . $e->getMessage());
    Security::sendErrorResponse('Failed to fetch starting spells: ' . $e->getMessage(), 500);
}
?>

