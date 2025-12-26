<?php
/**
 * BECMI D&D Character Manager - Batch Create/Update Hex Tiles Endpoint
 * 
 * Creates or updates multiple hex tiles in a single request.
 * Useful for bulk operations like painting terrain or saving entire maps.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for efficient batch operations.
 * 
 * **Request:** POST
 * 
 * **Body Parameters:**
 * - `map_id` (int, required) - Map ID
 * - `tiles` (array, required) - Array of tile objects (1-1000 tiles per request)
 *   Each tile object has same structure as single tile endpoint:
 *   - `q` (int, required) - Hex column coordinate
 *   - `r` (int, required) - Hex row coordinate
 *   - `terrain_type` (string, optional) - Terrain type
 *   - `borders` (object, optional) - Borders JSON object
 *   - `roads` (object, optional) - Roads JSON object
 *   - Other tile properties (optional)
 * 
 * **Response:**
 * ```json
 * {
 *   "status": "success",
 *   "message": "Tiles saved successfully",
 *   "data": {
 *     "saved_count": int,
 *     "tiles": [...]
 *   }
 * }
 * ```
 * 
 * **Limits:**
 * - Maximum 1000 tiles per batch operation
 * - Minimum 1 tile required
 * 
 * **Permissions:**
 * - Map creator: Can batch create/update tiles
 * - Session DM: Can batch create/update tiles
 * - Others: 403 Forbidden
 * 
 * **Data Cleaning:**
 * - Removes database-only fields (tile_id, created_at, updated_at)
 * - Converts empty borders/roads objects/arrays to NULL
 * - Ensures only serializable data is sent
 * 
 * **Called From:**
 * - `HexMapEditorModule.saveMap()` - Saves all tiles in batch when saving map
 * 
 * **Side Effects:**
 * - Creates or updates rows in `hex_tiles` table
 * - Logs security event `hex_tiles_batch_saved`
 * 
 * **Performance:**
 * - Much more efficient than individual tile saves
 * - Single database transaction for all tiles
 * 
 * @package api/hex-maps/tiles
 * @api POST /api/hex-maps/tiles/batch.php
 * @since 1.0.0
 */

// Suppress error display to prevent HTML output
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../../../app/core/database.php';
require_once '../../../app/core/security.php';

// Initialize security (same as update.php - no output buffering manipulation before this)
Security::init();

// Set content type
header('Content-Type: application/json');

// #region agent log
$logData = [
    'location' => 'batch.php:79',
    'message' => 'After Security::init()',
    'data' => [
        'session_status' => session_status(),
        'session_id' => session_id() ?: 'NO SESSION',
        'user_id_in_session' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET',
        'session_keys' => isset($_SESSION) ? array_keys($_SESSION) : [],
        'cookie_header' => isset($_SERVER['HTTP_COOKIE']) ? substr($_SERVER['HTTP_COOKIE'], 0, 200) : 'NOT SET',
        'has_phpsessid' => isset($_SERVER['HTTP_COOKIE']) && strpos($_SERVER['HTTP_COOKIE'], 'PHPSESSID') !== false
    ],
    'timestamp' => round(microtime(true) * 1000),
    'sessionId' => 'debug-session',
    'runId' => 'run1',
    'hypothesisId' => 'B'
];
$logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
$logDir = dirname($logPath);
if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
@file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
// #endregion

// Debug: Check session state after init
error_log(sprintf(
    '[BATCH.PHP] After Security::init() - session_status: %d, session_id: %s, user_id in session: %s',
    session_status(),
    session_id(),
    isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET'
));

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Debug: Log authentication state before requireAuth
    $userId = Security::getCurrentUserId();
    $isAuth = Security::isAuthenticated();
    $sessionId = session_id();
    $sessionUserId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'NOT SET';
    $cookieHeader = isset($_SERVER['HTTP_COOKIE']) ? substr($_SERVER['HTTP_COOKIE'], 0, 200) : 'NOT SET';
    
    // #region agent log
    $logData = [
        'location' => 'batch.php:108',
        'message' => 'Before requireAuth check',
        'data' => [
            'user_id' => $userId ?: 'NULL',
            'isAuthenticated' => $isAuth,
            'session_id' => $sessionId ?: 'NO SESSION',
            'session_user_id' => $sessionUserId,
            'cookie_header' => $cookieHeader,
            'session_keys' => isset($_SESSION) ? array_keys($_SESSION) : [],
            'session_data' => isset($_SESSION) ? $_SESSION : []
        ],
        'timestamp' => round(microtime(true) * 1000),
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'B'
    ];
    $logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
    @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
    // #endregion
    
    error_log(sprintf(
        '[BATCH.PHP] Auth check - user_id: %s, isAuthenticated: %s, session_id: %s, session[user_id]: %s, cookie header: %s',
        $userId ? $userId : 'NULL',
        $isAuth ? 'true' : 'false',
        $sessionId ? $sessionId : 'NO SESSION',
        $sessionUserId,
        $cookieHeader
    ));
    
    // Require authentication
    if (!Security::isAuthenticated()) {
        // #region agent log
        $logData = [
            'location' => 'batch.php:125',
            'message' => 'Authentication FAILED - sending 401',
            'data' => [
                'user_id' => $userId ?: 'NULL',
                'isAuthenticated' => $isAuth,
                'session_id' => $sessionId ?: 'NO SESSION',
                'session_user_id' => $sessionUserId,
                'cookie_header' => $cookieHeader,
                'session_dump' => isset($_SESSION) ? $_SESSION : []
            ],
            'timestamp' => round(microtime(true) * 1000),
            'sessionId' => 'debug-session',
            'runId' => 'run1',
            'hypothesisId' => 'B'
        ];
        $logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
    @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
        // #endregion
        error_log('[BATCH.PHP] Authentication failed - sending 401 response');
        error_log(sprintf('[BATCH.PHP] Session dump: %s', json_encode($_SESSION ?? [])));
        Security::requireAuth(); // This will send 401 and exit
    }
    
    // #region agent log
    $logData = [
        'location' => 'batch.php:130',
        'message' => 'Authentication PASSED - continuing',
        'data' => [
            'user_id' => $userId,
            'isAuthenticated' => $isAuth
        ],
        'timestamp' => round(microtime(true) * 1000),
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'B'
    ];
    $logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
    @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
    // #endregion
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    // #region agent log
    $sampleTile = isset($input['tiles']) && is_array($input['tiles']) && count($input['tiles']) > 0 ? $input['tiles'][0] : null;
    $logData = [
        'location' => 'batch.php:213',
        'message' => 'Received JSON input',
        'data' => [
            'map_id' => isset($input['map_id']) ? $input['map_id'] : 'NOT SET',
            'tiles_count' => isset($input['tiles']) && is_array($input['tiles']) ? count($input['tiles']) : 0,
            'sample_tile' => $sampleTile ? [
                'q' => $sampleTile['q'] ?? 'NOT SET',
                'r' => $sampleTile['r'] ?? 'NOT SET',
                'terrain_type' => $sampleTile['terrain_type'] ?? 'NOT SET',
                'borders_type' => isset($sampleTile['borders']) ? gettype($sampleTile['borders']) : 'NOT SET',
                'borders_value' => isset($sampleTile['borders']) ? (is_string($sampleTile['borders']) ? substr($sampleTile['borders'], 0, 100) : json_encode($sampleTile['borders'])) : 'NOT SET',
                'roads_type' => isset($sampleTile['roads']) ? gettype($sampleTile['roads']) : 'NOT SET',
                'roads_value' => isset($sampleTile['roads']) ? (is_string($sampleTile['roads']) ? substr($sampleTile['roads'], 0, 100) : json_encode($sampleTile['roads'])) : 'NOT SET'
            ] : null
        ],
        'timestamp' => round(microtime(true) * 1000),
        'sessionId' => 'debug-session',
        'runId' => 'run2',
        'hypothesisId' => 'C'
    ];
    $logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
    @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
    // #endregion
    
    // Validate required fields
    $mapId = isset($input['map_id']) ? (int) $input['map_id'] : 0;
    $tiles = isset($input['tiles']) && is_array($input['tiles']) ? $input['tiles'] : [];
    
    $errors = [];
    
    if ($mapId <= 0) {
        $errors['map_id'] = 'Valid map ID is required';
    }
    
    if (empty($tiles)) {
        $errors['tiles'] = 'At least one tile is required';
    }
    
    if (count($tiles) > 1000) {
        $errors['tiles'] = 'Maximum 1000 tiles per batch operation';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Verify map exists and user has edit permissions
    $map = $db->selectOne(
        "SELECT hm.map_id, hm.created_by_user_id, hm.session_id, gs.dm_user_id as session_dm_user_id
         FROM hex_maps hm
         LEFT JOIN game_sessions gs ON hm.session_id = gs.session_id
         WHERE hm.map_id = ?",
        [$mapId]
    );
    
    if (!$map) {
        Security::sendErrorResponse('Hex map not found', 404);
    }
    
    // Check permissions: creator or session DM can edit tiles
    $canEdit = false;
    if ($map['created_by_user_id'] == $userId) {
        $canEdit = true;
    } elseif ($map['session_id'] && $map['session_dm_user_id'] == $userId) {
        $canEdit = true;
    }
    
    if (!$canEdit) {
        Security::sendErrorResponse('You do not have permission to edit tiles on this map', 403);
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        $processedTiles = [];
        $createdCount = 0;
        $updatedCount = 0;
        
        foreach ($tiles as $tileData) {
            $q = isset($tileData['q']) ? (int) $tileData['q'] : null;
            $r = isset($tileData['r']) ? (int) $tileData['r'] : null;
            
            if ($q === null || $r === null) {
                continue; // Skip invalid tiles
            }
            
            $terrainType = Security::sanitizeInput($tileData['terrain_type'] ?? 'plains');
            $terrainName = Security::sanitizeInput($tileData['terrain_name'] ?? '');
            $description = Security::sanitizeInput($tileData['description'] ?? '');
            $notes = Security::sanitizeInput($tileData['notes'] ?? '');
            $imageUrl = Security::sanitizeInput($tileData['image_url'] ?? '');
            $elevation = isset($tileData['elevation']) ? (int) $tileData['elevation'] : 0;
            $isPassable = isset($tileData['is_passable']) ? (bool) $tileData['is_passable'] : true;
            $movementCost = isset($tileData['movement_cost']) ? (int) $tileData['movement_cost'] : 1;
            
            // Handle borders JSON
            $borders = null;
            if (isset($tileData['borders']) && $tileData['borders'] !== null) {
                if (is_array($tileData['borders'])) {
                    // Array - encode if not empty
                    if (count($tileData['borders']) > 0) {
                        $borders = json_encode($tileData['borders']);
                    }
                } elseif (is_object($tileData['borders'])) {
                    // Object - encode if not empty
                    $bordersArray = (array) $tileData['borders'];
                    if (count($bordersArray) > 0) {
                        $borders = json_encode($tileData['borders']);
                    }
                } elseif (is_string($tileData['borders']) && trim($tileData['borders']) !== '') {
                    // Already JSON string, validate it
                    $decoded = json_decode($tileData['borders'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $borders = $tileData['borders'];
                    }
                }
            }
            
            // Handle roads JSON
            $roads = null;
            if (isset($tileData['roads']) && $tileData['roads'] !== null) {
                if (is_array($tileData['roads'])) {
                    // Array - encode if not empty
                    if (count($tileData['roads']) > 0) {
                        $roads = json_encode($tileData['roads']);
                    }
                } elseif (is_object($tileData['roads'])) {
                    // Object - encode if not empty
                    $roadsArray = (array) $tileData['roads'];
                    if (count($roadsArray) > 0) {
                        $roads = json_encode($tileData['roads']);
                    }
                } elseif (is_string($tileData['roads']) && trim($tileData['roads']) !== '') {
                    // Already JSON string, validate it
                    $decoded = json_decode($tileData['roads'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $roads = $tileData['roads'];
                    }
                }
            }
            
            if ($movementCost < 1) {
                $movementCost = 1;
            }
            
            // Check if tile exists
            $existingTile = $db->selectOne(
                "SELECT tile_id FROM hex_tiles WHERE map_id = ? AND q = ? AND r = ?",
                [$mapId, $q, $r]
            );
            
            // #region agent log
            $logData = [
                'location' => 'batch.php:349',
                'message' => 'Before save tile to database',
                'data' => [
                    'q' => $q,
                    'r' => $r,
                    'terrain_type' => $terrainType,
                    'borders' => $borders ? (is_string($borders) ? substr($borders, 0, 100) : json_encode($borders)) : 'NULL',
                    'roads' => $roads ? (is_string($roads) ? substr($roads, 0, 100) : json_encode($roads)) : 'NULL',
                    'has_existing_tile' => !empty($existingTile)
                ],
                'timestamp' => round(microtime(true) * 1000),
                'sessionId' => 'debug-session',
                'runId' => 'run2',
                'hypothesisId' => 'A'
            ];
            $logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
    @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
            // #endregion
            
            if ($existingTile) {
                // Update
                $tileId = $existingTile['tile_id'];
                $db->update(
                    "UPDATE hex_tiles SET
                        terrain_type = ?,
                        terrain_name = ?,
                        description = ?,
                        notes = ?,
                        image_url = ?,
                        elevation = ?,
                        is_passable = ?,
                        movement_cost = ?,
                        borders = ?,
                        roads = ?,
                        updated_at = NOW()
                     WHERE tile_id = ?",
                    [
                        $terrainType,
                        $terrainName ?: null,
                        $description ?: null,
                        $notes ?: null,
                        $imageUrl ?: null,
                        $elevation,
                        $isPassable,
                        $movementCost,
                        $borders,
                        $roads,
                        $tileId
                    ]
                );
                $updatedCount++;
            } else {
                // Create
                $tileId = $db->insert(
                    "INSERT INTO hex_tiles (
                        map_id, q, r, terrain_type, terrain_name, description, notes,
                        image_url, elevation, is_passable, movement_cost, borders, roads,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
                    [
                        $mapId,
                        $q,
                        $r,
                        $terrainType,
                        $terrainName ?: null,
                        $description ?: null,
                        $notes ?: null,
                        $imageUrl ?: null,
                        $elevation,
                        $isPassable,
                        $movementCost,
                        $borders,
                        $roads
                    ]
                );
                $createdCount++;
            }
            
            // Get the tile
            $tile = $db->selectOne(
                "SELECT tile_id, map_id, q, r, terrain_type, terrain_name, description, notes,
                        image_url, elevation, is_passable, movement_cost, borders, roads,
                        created_at, updated_at
                 FROM hex_tiles
                 WHERE tile_id = ?",
                [$tileId]
            );
            
            // #region agent log
            $logData = [
                'location' => 'batch.php:417',
                'message' => 'After save - tile read from database',
                'data' => [
                    'tile_id' => $tileId,
                    'q' => $q,
                    'r' => $r,
                    'terrain_type' => $tile['terrain_type'] ?? 'NOT SET',
                    'borders_from_db' => isset($tile['borders']) ? (is_string($tile['borders']) ? substr($tile['borders'], 0, 100) : json_encode($tile['borders'])) : 'NULL',
                    'borders_type' => isset($tile['borders']) ? gettype($tile['borders']) : 'NULL',
                    'roads_from_db' => isset($tile['roads']) ? (is_string($tile['roads']) ? substr($tile['roads'], 0, 100) : json_encode($tile['roads'])) : 'NULL',
                    'roads_type' => isset($tile['roads']) ? gettype($tile['roads']) : 'NULL'
                ],
                'timestamp' => round(microtime(true) * 1000),
                'sessionId' => 'debug-session',
                'runId' => 'run2',
                'hypothesisId' => 'A'
            ];
            $logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
    @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
            // #endregion
            
            $processedTiles[] = [
                'tile_id' => (int) $tile['tile_id'],
                'map_id' => (int) $tile['map_id'],
                'q' => (int) $tile['q'],
                'r' => (int) $tile['r'],
                'terrain_type' => $tile['terrain_type'],
                'terrain_name' => $tile['terrain_name'],
                'description' => $tile['description'],
                'notes' => $tile['notes'],
                'image_url' => $tile['image_url'],
                'elevation' => (int) $tile['elevation'],
                'is_passable' => (bool) $tile['is_passable'],
                'movement_cost' => (int) $tile['movement_cost'],
                'borders' => $tile['borders'], // Include borders JSON
                'roads' => $tile['roads'] ?? null, // Include roads JSON
                'created_at' => $tile['created_at'],
                'updated_at' => $tile['updated_at']
            ];
        }
        
        // Commit transaction
        $db->commit();
        
        // #region agent log
        $logData = [
            'location' => 'batch.php:507',
            'message' => 'Transaction committed - sending response',
            'data' => [
                'map_id' => $mapId,
                'total_processed' => count($processedTiles),
                'created' => $createdCount,
                'updated' => $updatedCount,
                'returned_tiles_count' => count($processedTiles),
                'sample_returned_tile' => count($processedTiles) > 0 ? [
                    'q' => $processedTiles[0]['q'] ?? 'NOT SET',
                    'r' => $processedTiles[0]['r'] ?? 'NOT SET',
                    'terrain_type' => $processedTiles[0]['terrain_type'] ?? 'NOT SET',
                    'borders' => isset($processedTiles[0]['borders']) ? (is_string($processedTiles[0]['borders']) ? substr($processedTiles[0]['borders'], 0, 100) : json_encode($processedTiles[0]['borders'])) : 'NULL',
                    'roads' => isset($processedTiles[0]['roads']) ? (is_string($processedTiles[0]['roads']) ? substr($processedTiles[0]['roads'], 0, 100) : json_encode($processedTiles[0]['roads'])) : 'NULL'
                ] : null
            ],
            'timestamp' => round(microtime(true) * 1000),
            'sessionId' => 'debug-session',
            'runId' => 'run2',
            'hypothesisId' => 'E'
        ];
        $logPath = dirname(dirname(dirname(__DIR__))) . DIRECTORY_SEPARATOR . '.cursor' . DIRECTORY_SEPARATOR . 'debug.log';
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) { @mkdir($logDir, 0755, true); }
    @file_put_contents($logPath, json_encode($logData) . "\n", FILE_APPEND);
        // #endregion
        
        Security::logSecurityEvent('hex_tiles_batch_updated', [
            'map_id' => $mapId,
            'tile_count' => count($processedTiles),
            'created' => $createdCount,
            'updated' => $updatedCount,
            'user_id' => $userId
        ]);
        
        Security::sendSuccessResponse([
            'tiles' => $processedTiles,
            'total_processed' => count($processedTiles),
            'created' => $createdCount,
            'updated' => $updatedCount
        ], 'Hex tiles processed successfully');
        
    } catch (Exception $e) {
        // Rollback transaction if it was started
        try {
            if ($db->inTransaction()) {
                $db->rollback();
            }
        } catch (Exception $rollbackError) {
            error_log('Failed to rollback transaction: ' . $rollbackError->getMessage());
        }
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Hex tiles batch error: ' . $e->getMessage());
    error_log('Hex tiles batch trace: ' . $e->getTraceAsString());
    Security::sendErrorResponse('An error occurred while processing hex tiles: ' . $e->getMessage(), 500);
}
?>
