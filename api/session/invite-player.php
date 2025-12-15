<?php
/**
 * BECMI D&D Character Manager - Invite Player to Session Endpoint
 * 
 * Allows a DM to invite a player to their game session.
 * Creates an invitation record in session_players table with status 'invited'.
 * 
 * Request: POST
 * Body: {
 *   "session_id": int,
 *   "user_id": int (player to invite)
 * }
 * 
 * Response: {
 *   "status": "success",
 *   "message": "Player invited successfully",
 *   "data": {
 *     "session_id": int,
 *     "user_id": int,
 *     "username": string,
 *     "status": "invited"
 *   }
 * }
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

/**
 * Send invitation email to player
 */
function sendInvitationEmail($playerUser, $session, $dmUserId) {
    // Get DM username
    $db = getDB();
    $dmUser = $db->selectOne(
        "SELECT username FROM users WHERE user_id = ?",
        [$dmUserId]
    );
    
    if (!$dmUser) {
        error_log("INVITATION EMAIL ERROR: DM user not found for ID {$dmUserId}");
        return false;
    }
    
    $dmUsername = $dmUser['username'];
    $playerEmail = $playerUser['email'];
    $playerUsername = $playerUser['username'];
    
    // Format session datetime
    $sessionDate = 'TBA';
    if (!empty($session['session_datetime'])) {
        $timestamp = strtotime($session['session_datetime']);
        if ($timestamp !== false) {
            $sessionDate = date('l, F j, Y \a\t g:i A', $timestamp);
        }
    }
    
    // Create email content
    $subject = "🎲 You've been invited to a D&D session: " . $session['session_title'];
    
    $message = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; max-width: 600px; margin: 0 auto; }
            .session-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .cta-button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class='header'>
            <h1>🎲 BECMI D&D Virtual Tabletop</h1>
            <h2>You've been invited to a game session!</h2>
        </div>
        
        <div class='content'>
            <p>Hello <strong>{$playerUsername}</strong>,</p>
            
            <p><strong>{$dmUsername}</strong> has invited you to join their D&D session:</p>
            
            <div class='session-info'>
                <h3>🎮 {$session['session_title']}</h3>
                <p><strong>📅 Date & Time:</strong> {$sessionDate}</p>
                <p><strong>📝 Description:</strong> " . htmlspecialchars($session['session_description'] ?? 'No description provided') . "</p>
                <p><strong>👤 Dungeon Master:</strong> {$dmUsername}</p>
            </div>
            
            <p>To accept this invitation and join the session:</p>
            
            <div style='text-align: center;'>
                <a href='https://becmi.snilld-api.dk/public/index.html' class='cta-button'>
                    🚀 Go to BECMI VTT
                </a>
            </div>
            
            <p><strong>Instructions:</strong></p>
            <ol>
                <li>Click the button above to go to the BECMI VTT</li>
                <li>Log in to your account</li>
                <li>Go to the 'Sessions' section</li>
                <li>Find this session and click 'Accept'</li>
                <li>Create your character and start playing!</li>
            </ol>
            
            <p>If you have any questions, please contact {$dmUsername} directly.</p>
            
            <p>Happy gaming!<br>
            <strong>The BECMI VTT Team</strong></p>
        </div>
        
        <div class='footer'>
            <p>This is an automated message from BECMI D&D Virtual Tabletop</p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
    </body>
    </html>
    ";
    
    // Send email with proper HTML headers
    $headers = [
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/html; charset=UTF-8',
        'From' => 'BECMI VTT <noreply@snilld-api.dk>',
        'Reply-To' => $dmUsername . ' <noreply@snilld-api.dk>',
        'X-Mailer' => 'BECMI VTT System'
    ];
    
    $sent = Security::sendEmail($playerEmail, $subject, $message, $headers);
    
    if ($sent) {
        error_log("INVITATION EMAIL: Successfully sent invitation email to {$playerEmail} for session {$session['session_id']}");
    } else {
        error_log("INVITATION EMAIL: Failed to send invitation email to {$playerEmail} for session {$session['session_id']}");
    }
    
    return $sent;
}

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    $sessionId = isset($input['session_id']) ? (int) $input['session_id'] : 0;
    $playerUserId = isset($input['user_id']) ? (int) $input['user_id'] : 0;
    
    if ($sessionId <= 0) {
        $errors['session_id'] = 'Valid session ID is required';
    }
    
    if ($playerUserId <= 0) {
        $errors['user_id'] = 'Valid user ID is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Get current user ID (DM)
    $dmUserId = Security::getCurrentUserId();
    
    // Check if trying to invite self
    if ($playerUserId == $dmUserId) {
        Security::sendValidationErrorResponse(['user_id' => 'You cannot invite yourself to a session']);
    }
    
    // Get database connection
    $db = getDB();
    
    // Verify session exists and user is the DM
    $session = $db->selectOne(
        "SELECT session_id, dm_user_id, session_title, max_players, status
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    if ($session['dm_user_id'] != $dmUserId) {
        Security::sendErrorResponse('You do not have permission to invite players to this session', 403);
    }
    
    // Check if session is cancelled
    if ($session['status'] === 'cancelled') {
        Security::sendValidationErrorResponse(['session_id' => 'Cannot invite players to a cancelled session']);
    }
    
    // Verify the player user exists and is active
    $playerUser = $db->selectOne(
        "SELECT user_id, username, email, is_active 
         FROM users 
         WHERE user_id = ?",
        [$playerUserId]
    );
    
    if (!$playerUser) {
        Security::sendValidationErrorResponse(['user_id' => 'User not found']);
    }
    
    if (!$playerUser['is_active']) {
        Security::sendValidationErrorResponse(['user_id' => 'User account is inactive']);
    }
    
    // Check if player is already invited/accepted/declined
    $existingInvitation = $db->selectOne(
        "SELECT status FROM session_players 
         WHERE session_id = ? AND user_id = ?",
        [$sessionId, $playerUserId]
    );
    
    if ($existingInvitation) {
        $status = $existingInvitation['status'];
        
        if ($status === 'invited') {
            Security::sendValidationErrorResponse(['user_id' => 'Player is already invited to this session']);
        } elseif ($status === 'accepted') {
            Security::sendValidationErrorResponse(['user_id' => 'Player has already accepted invitation to this session']);
        } elseif ($status === 'declined') {
            // Allow re-inviting if previously declined
            error_log("INVITE PLAYER: Re-inviting player {$playerUserId} who previously declined session {$sessionId}");
            
            // Update existing record to 'invited'
            $db->execute(
                "UPDATE session_players 
                 SET status = 'invited', joined_at = NOW() 
                 WHERE session_id = ? AND user_id = ?",
                [$sessionId, $playerUserId]
            );
            
            Security::sendSuccessResponse([
                'session_id' => $sessionId,
                'user_id' => $playerUserId,
                'username' => $playerUser['username'],
                'status' => 'invited'
            ], 'Player re-invited successfully');
        }
    }
    
    // Check if session is full (count accepted players)
    $acceptedPlayers = $db->selectOne(
        "SELECT COUNT(*) as count 
         FROM session_players 
         WHERE session_id = ? AND status = 'accepted'",
        [$sessionId]
    );
    
    $currentPlayers = (int) $acceptedPlayers['count'];
    $maxPlayers = (int) $session['max_players'];
    
    if ($currentPlayers >= $maxPlayers) {
        Security::sendValidationErrorResponse([
            'session_id' => "Session is full ({$currentPlayers}/{$maxPlayers} players)"
        ]);
    }
    
    // Create invitation
    $db->execute(
        "INSERT INTO session_players (session_id, user_id, status, joined_at) 
         VALUES (?, ?, 'invited', NOW())",
        [$sessionId, $playerUserId]
    );
    
    error_log("INVITE PLAYER: User {$dmUserId} invited player {$playerUserId} ({$playerUser['username']}) to session {$sessionId} ({$session['session_title']})");
    
    // Send email notification to player
    sendInvitationEmail($playerUser, $session, $dmUserId);
    
    // Return success with player info
    Security::sendSuccessResponse([
        'session_id' => $sessionId,
        'user_id' => $playerUserId,
        'username' => $playerUser['username'],
        'email' => $playerUser['email'],
        'status' => 'invited',
        'invited_at' => date('Y-m-d H:i:s')
    ], "Player {$playerUser['username']} invited successfully");
    
} catch (Exception $e) {
    error_log("INVITE PLAYER ERROR: " . $e->getMessage());
    error_log("INVITE PLAYER ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to invite player: ' . $e->getMessage(), 500);
}

