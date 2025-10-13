<?php
/**
 * BECMI D&D Character Manager - Session Reminder Cron Job
 * 
 * Sends email reminders for upcoming sessions.
 * Run this script via cron every hour:
 * 0 * * * * php /path/to/cron/send-session-reminders.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../app/core/database.php';
require_once __DIR__ . '/../app/services/email-service.php';

echo "[" . date('Y-m-d H:i:s') . "] Starting session reminder cron job...\n";

try {
    // Get database connection
    $db = getDB();
    $emailService = new EmailService();
    
    // Find sessions starting within next 24 hours that haven't been reminded yet
    $upcomingSessions = $db->select(
        "SELECT gs.*, sr.reminder_id
         FROM game_sessions gs
         LEFT JOIN session_reminders sr ON gs.session_id = sr.session_id 
             AND sr.reminder_sent_at IS NOT NULL
         WHERE gs.status = 'scheduled'
         AND gs.session_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
         AND sr.reminder_id IS NULL"
    );
    
    echo "Found " . count($upcomingSessions) . " sessions needing reminders\n";
    
    foreach ($upcomingSessions as $session) {
        $sessionId = $session['session_id'];
        echo "\nProcessing session: {$session['session_title']} (ID: $sessionId)\n";
        
        // Get all accepted players for this session
        $players = $db->select(
            "SELECT u.user_id, u.username, u.email, u.first_name
             FROM session_players sp
             JOIN users u ON sp.user_id = u.user_id
             WHERE sp.session_id = ? AND sp.status = 'accepted' AND u.is_active = 1",
            [$sessionId]
        );
        
        echo "  Found " . count($players) . " players to notify\n";
        
        $remindersSent = 0;
        
        foreach ($players as $player) {
            // Check user notification preferences
            $prefs = $db->selectOne(
                "SELECT email_session_reminders
                 FROM user_notification_preferences
                 WHERE user_id = ?",
                [$player['user_id']]
            );
            
            // Send if user has enabled email reminders (or no preference set, default is TRUE)
            $sendReminder = !$prefs || $prefs['email_session_reminders'];
            
            if ($sendReminder) {
                echo "  Sending reminder to {$player['username']} ({$player['email']})...";
                
                $success = $emailService->sendSessionReminder($player, $session);
                
                if ($success) {
                    echo " ✓ Sent\n";
                    $remindersSent++;
                } else {
                    echo " ✗ Failed\n";
                }
            } else {
                echo "  Skipping {$player['username']} (email reminders disabled)\n";
            }
        }
        
        // Mark reminder as sent in database
        $db->execute(
            "INSERT INTO session_reminders (session_id, reminder_sent_at, recipients_count)
             VALUES (?, NOW(), ?)
             ON DUPLICATE KEY UPDATE reminder_sent_at = NOW(), recipients_count = ?",
            [$sessionId, $remindersSent, $remindersSent]
        );
        
        echo "  ✓ Session reminder complete: $remindersSent email(s) sent\n";
    }
    
    echo "\n[" . date('Y-m-d H:i:s') . "] Session reminder cron job completed\n";
    echo "Total sessions processed: " . count($upcomingSessions) . "\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    error_log("Session reminder cron error: " . $e->getMessage());
    exit(1);
}

exit(0);
?>

