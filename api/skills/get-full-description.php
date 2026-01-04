<?php
/**
 * BECMI D&D Character Manager - Get Full Skill Description
 * 
 * Returns the full skill description from Rules Cyclopedia markdown file.
 * 
 * @return JSON Full skill description from Rules Cyclopedia
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
    
    // Get skill name from query parameters
    $skillName = isset($_GET['skill_name']) ? trim($_GET['skill_name']) : '';
    
    if (empty($skillName)) {
        Security::sendValidationErrorResponse(['skill_name' => 'Skill name is required']);
    }
    
    // Path to Rules Cyclopedia markdown file
    $rulesPath = __DIR__ . '/../../docs/rules/rules_cyclopedia.md';
    
    if (!file_exists($rulesPath)) {
        Security::sendErrorResponse('Rules Cyclopedia file not found', 404);
    }
    
    // Read the markdown file
    $content = file_get_contents($rulesPath);
    
    if ($content === false) {
        Security::sendErrorResponse('Failed to read Rules Cyclopedia file', 500);
    }
    
    // Split content into lines for processing
    $lines = explode("\n", $content);
    $fullDescription = '';
    $found = false;
    $descriptionLines = [];
    
    // Normalize skill name - remove parentheses content for matching
    $baseSkillName = preg_replace('/\s*\([^)]*\)\s*/', '', $skillName);
    $baseSkillName = trim($baseSkillName);
    
    // Escape skill names for regex
    $escapedSkillName = preg_quote($skillName, '/');
    $escapedBaseName = preg_quote($baseSkillName, '/');
    
    foreach ($lines as $i => $line) {
        $lineTrimmed = trim($line);
        
        // Check if this line starts with the skill name (case-insensitive)
        // Match patterns like "Bravery:", "Ceremony (choose specific Immortal):", etc.
        $skillPattern = '/^' . $escapedSkillName . '\s*(?:\([^)]+\))?:\s*(.+)$/i';
        $basePattern = '/^' . $escapedBaseName . '\s*(?:\([^)]+\))?:\s*(.+)$/i';
        
        if (preg_match($skillPattern, $lineTrimmed, $match) || preg_match($basePattern, $lineTrimmed, $match)) {
            $found = true;
            // Get the description part after the colon
            if (isset($match[1]) && !empty(trim($match[1]))) {
                $descriptionLines[] = trim($match[1]);
            }
        } elseif ($found) {
            // Continue collecting description lines
            // Stop if we hit another skill definition
            
            if (empty($lineTrimmed)) {
                // Check if next non-empty line is a new skill
                $nextNonEmpty = '';
                for ($j = $i + 1; $j < count($lines) && $j < $i + 3; $j++) {
                    $nextLine = trim($lines[$j]);
                    if (!empty($nextLine)) {
                        $nextNonEmpty = $nextLine;
                        break;
                    }
                }
                // If next line looks like a skill definition (starts with capital and has colon), stop
                if (preg_match('/^[A-Z][^:]+:\s*/', $nextNonEmpty) || preg_match('/^[A-Z][^:]+\s*\(/', $nextNonEmpty)) {
                    break;
                }
            } elseif (preg_match('/^[A-Z][^:]+:\s*/', $lineTrimmed) || preg_match('/^[A-Z][^:]+\s*\(/', $lineTrimmed)) {
                // This looks like a new skill definition, stop collecting
                break;
            } else {
                // Regular description line - clean up and add
                $cleaned = trim($lineTrimmed);
                if (!empty($cleaned)) {
                    $descriptionLines[] = $cleaned;
                }
            }
        }
    }
    
    // Combine description lines into paragraphs
    if (!empty($descriptionLines)) {
        // Join lines, but preserve natural paragraph breaks
        $fullDescription = implode(' ', $descriptionLines);
        // Clean up multiple spaces
        $fullDescription = preg_replace('/\s+/', ' ', $fullDescription);
        $fullDescription = trim($fullDescription);
    }
    
    // If we still don't have a description, return the database description as fallback
    if (empty($fullDescription)) {
        $db = getDB();
        $skill = $db->selectOne(
            "SELECT description FROM general_skills WHERE skill_name = ?",
            [$skillName]
        );
        
        if ($skill) {
            $fullDescription = $skill['description'];
        }
    }
    
    Security::sendSuccessResponse([
        'skill_name' => $skillName,
        'full_description' => $fullDescription,
        'has_full_description' => !empty($fullDescription)
    ]);
    
} catch (Exception $e) {
    error_log("Get full skill description error: " . $e->getMessage());
    error_log("Get full skill description error trace: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to fetch skill description: ' . $e->getMessage(), 500);
}
?>
