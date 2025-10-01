<?php
/**
 * BECMI D&D Character Manager - Get Session Players Endpoint
 * 
 * Returns list of players for a session with their invitation status.
 * Accessible by DM and accepted players.
 * 
 * Request: GET
 * Query params: ?session_id=int
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "session_id": int,
 *     "session_title": string,
 *     "dm_user_id": int,
 *     "dm_username": string,
 *     "players": [
 *       {
 *         "user_id": int,
 *         "username": string,
 *         "email": string,
 *         "status": "invited|accepted|declined",
 *         "joined_at": string,
 *         "character_count": int
 *       }
 *     ]
 *   }
 * }
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
    
    // Get session ID from query parameters
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : 0;
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get session details
    $session = $db->selectOne(
        "SELECT gs.session_id, gs.session_title, gs.dm_user_id, gs.status,
                u.username as dm_username
         FROM game_sessions gs
         JOIN users u ON gs.dm_user_id = u.user_id
         WHERE gs.session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Check if user has access to view players
    $hasAccess = false;
    
    // DM has access
    if ($session['dm_user_id'] == $userId) {
        $hasAccess = true;
    }
    
    // Accepted players have access
    if (!$hasAccess) {
        $playerStatus = $db->selectOne(
            "SELECT status FROM session_players 
             WHERE session_id = ? AND user_id = ?",
            [$sessionId, $userId]
        );
        
        if ($playerStatus && $playerStatus['status'] === 'accepted') {
            $hasAccess = true;
        }
    }
    
    if (!$hasAccess) {
        Security::sendErrorResponse('You do not have permission to view players for this session', 403);
    }
    
    // Get all players for the session
    $players = $db->select(
        "SELECT sp.user_id, sp.status, sp.joined_at,
                u.username, u.email,
                COUNT(c.character_id) as character_count
         FROM session_players sp
         JOIN users u ON sp.user_id = u.user_id
         LEFT JOIN characters c ON c.user_id = sp.user_id 
                               AND c.session_id = sp.session_id 
                               AND c.is_active = 1
         WHERE sp.session_id = ?
         GROUP BY sp.user_id, sp.status, sp.joined_at, u.username, u.email
         ORDER BY sp.joined_at ASC",
        [$sessionId]
    );
    
    // Format player data
    $formattedPlayers = array_map(function($player) {
        return [
            'user_id' => (int) $player['user_id'],
            'username' => $player['username'],
            'email' => $player['email'],
            'status' => $player['status'],
            'joined_at' => $player['joined_at'],
            'character_count' => (int) $player['character_count']
        ];
    }, $players);
    
    // Count players by status
    $invitedCount = 0;
    $acceptedCount = 0;
    $declinedCount = 0;
    
    foreach ($players as $player) {
        switch ($player['status']) {
            case 'invited':
                $invitedCount++;
                break;
            case 'accepted':
                $acceptedCount++;
                break;
            case 'declined':
                $declinedCount++;
                break;
        }
    }
    
    // Return success with player list
    Security::sendSuccessResponse([
        'session_id' => (int) $session['session_id'],
        'session_title' => $session['session_title'],
        'session_status' => $session['status'],
        'dm_user_id' => (int) $session['dm_user_id'],
        'dm_username' => $session['dm_username'],
        'players' => $formattedPlayers,
        'player_counts' => [
            'invited' => $invitedCount,
            'accepted' => $acceptedCount,
            'declined' => $declinedCount,
            'total' => count($players)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("GET PLAYERS ERROR: " . $e->getMessage());
    error_log("GET PLAYERS ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to get players: ' . $e->getMessage(), 500);
}

