<?php
/**
 * BECMI D&D Character Manager - Get Monster Type
 * 
 * Returns detailed information about a specific monster type.
 */

// Start output buffering immediately to catch any stray output
ob_start();

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Disable output compression
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers (including the one we just started)
while (ob_get_level()) {
    @ob_end_clean();
}

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json; charset=utf-8');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get monster ID
    $monsterId = isset($_GET['monster_id']) ? (int) $_GET['monster_id'] : 0;
    
    if ($monsterId <= 0) {
        Security::sendValidationErrorResponse(['monster_id' => 'Valid monster ID is required']);
    }
    
    // Get database connection
    $db = getDB();
    
    // Get monster
    $monster = $db->selectOne(
        "SELECT monster_id, name, armor_class, hit_dice, move_ground, move_flying, move_swimming,
                attacks, damage, no_appearing, save_as, morale, treasure_type, intelligence,
                alignment, xp_value, description, image_url, monster_type, terrain, `load`,
                created_at, updated_at
         FROM monsters
         WHERE monster_id = ?",
        [$monsterId]
    );
    
    if (!$monster) {
        Security::sendErrorResponse('Monster not found', 404);
    }
    
    Security::sendSuccessResponse($monster, 'Monster retrieved successfully');
    
} catch (Exception $e) {
    error_log("Get monster error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to retrieve monster', 500);
}
?>
