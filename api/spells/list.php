<?php
/**
 * BECMI D&D Character Manager - List Spells
 * 
 * Returns available spells filtered by class and level.
 * Used for spell selection during character creation and level-up.
 * 
 * @return JSON Array of spells
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
    
    // Get filter parameters
    $spellType = isset($_GET['spell_type']) ? $_GET['spell_type'] : null;
    $spellLevel = isset($_GET['spell_level']) ? (int)$_GET['spell_level'] : null;
    $search = isset($_GET['search']) ? trim($_GET['search']) : null;
    
    // Get database connection
    $db = getDB();
    
    // Build query
    $query = "SELECT spell_id, spell_name, spell_level, spell_type, spell_school,
                     casting_time, range_feet, duration, description, components,
                     reversible, reverse_name
              FROM spells
              WHERE 1=1";
    
    $params = [];
    
    // Apply filters
    if ($spellType) {
        $query .= " AND spell_type = ?";
        $params[] = $spellType;
    }
    
    if ($spellLevel !== null && $spellLevel > 0) {
        $query .= " AND spell_level = ?";
        $params[] = $spellLevel;
    }
    
    if ($search) {
        $query .= " AND (spell_name LIKE ? OR description LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
    }
    
    // Order by level and name
    $query .= " ORDER BY spell_level, spell_name";
    
    // Execute query
    $spells = $db->select($query, $params);
    
    // Format response
    $formattedSpells = array_map(function($spell) {
        return [
            'spell_id' => (int) $spell['spell_id'],
            'spell_name' => $spell['spell_name'],
            'spell_level' => (int) $spell['spell_level'],
            'spell_type' => $spell['spell_type'],
            'spell_school' => $spell['spell_school'],
            'casting_time' => $spell['casting_time'],
            'range' => $spell['range_feet'],
            'duration' => $spell['duration'],
            'description' => $spell['description'],
            'components' => $spell['components'],
            'reversible' => (bool) $spell['reversible'],
            'reverse_name' => $spell['reverse_name']
        ];
    }, $spells);
    
    Security::sendSuccessResponse([
        'spells' => $formattedSpells,
        'count' => count($formattedSpells),
        'filters' => [
            'spell_type' => $spellType,
            'spell_level' => $spellLevel,
            'search' => $search
        ]
    ], 'Spells retrieved successfully');
    
} catch (Exception $e) {
    error_log("List spells error: " . $e->getMessage());
    error_log("List spells error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to retrieve spells', 500);
}
?>

