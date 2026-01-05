<?php
/**
 * BECMI D&D Character Manager - List Monster Types
 * 
 * Returns list of all monster types (templates) with pagination and filtering.
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
    
    // Get database connection
    $db = getDB();
    
    // Get query parameters
    $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 50;
    $offset = ($page - 1) * $limit;
    
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $monsterType = isset($_GET['monster_type']) ? trim($_GET['monster_type']) : '';
    $terrain = isset($_GET['terrain']) ? trim($_GET['terrain']) : '';
    
    // Build WHERE clause
    $whereConditions = [];
    $params = [];
    
    if ($search) {
        $whereConditions[] = "(name LIKE ? OR description LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    if ($monsterType) {
        $whereConditions[] = "monster_type LIKE ?";
        $params[] = "%{$monsterType}%";
    }
    
    if ($terrain) {
        $whereConditions[] = "terrain LIKE ?";
        $params[] = "%{$terrain}%";
    }
    
    $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
    
    // Get total count
    $totalCount = $db->selectOne(
        "SELECT COUNT(*) as count FROM monsters {$whereClause}",
        $params
    )['count'];
    
    // Get monsters
    $monsters = $db->select(
        "SELECT monster_id, name, armor_class, hit_dice, move_ground, move_flying, move_swimming,
                attacks, damage, no_appearing, save_as, morale, treasure_type, intelligence,
                alignment, xp_value, description, image_url, monster_type, terrain, `load`,
                created_at, updated_at
         FROM monsters
         {$whereClause}
         ORDER BY name ASC
         LIMIT ? OFFSET ?",
        array_merge($params, [$limit, $offset])
    );
    
    Security::sendSuccessResponse([
        'monsters' => $monsters,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int) $totalCount,
            'total_pages' => (int) ceil($totalCount / $limit)
        ]
    ], 'Monsters retrieved successfully');
    
} catch (Exception $e) {
    error_log("List monsters error: " . $e->getMessage());
    Security::sendErrorResponse('Failed to retrieve monsters', 500);
}
?>
