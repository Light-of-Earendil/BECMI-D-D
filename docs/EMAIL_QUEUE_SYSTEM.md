# Email Queue System

## Overview

The BECMI VTT includes a robust email queue system for asynchronous email sending. This allows emails to be queued and sent in the background without blocking the main application flow.

## Features

- ✅ **Asynchronous sending**: Emails are queued and sent by a background process
- ✅ **Priority support**: Emails can be prioritized (low, normal, high, urgent)
- ✅ **Scheduled sending**: Emails can be scheduled for specific times
- ✅ **Retry mechanism**: Failed emails are automatically retried (configurable max attempts)
- ✅ **Error tracking**: Failed emails store error messages for debugging
- ✅ **Statistics**: Queue statistics available via API
- ✅ **Cleanup**: Old sent/failed emails can be automatically cleaned up

## Database Schema

The `email_queue` table stores all queued emails with the following fields:

- `queue_id`: Unique identifier
- `recipient_email`: Email address
- `recipient_name`: Optional recipient name
- `subject`: Email subject
- `body_html`: HTML email body
- `body_text`: Optional plain text body
- `priority`: Priority level (low, normal, high, urgent)
- `status`: Current status (pending, processing, sent, failed)
- `attempts`: Number of send attempts
- `max_attempts`: Maximum retry attempts (default: 3)
- `error_message`: Error message if sending failed
- `scheduled_at`: When to send (NULL = immediately)
- `sent_at`: When email was successfully sent
- `created_at`: When email was queued
- `updated_at`: Last update timestamp

## Usage

### Basic Usage

```php
require_once 'app/services/email-queue-service.php';

$queueService = new EmailQueueService();

// Queue a simple email
$queueId = $queueService->queueEmail(
    'user@example.com',           // Recipient
    'Welcome to BECMI VTT!',      // Subject
    '<html><body><h1>Welcome!</h1></body></html>', // HTML body
    'Welcome!',                    // Plain text (optional)
    'normal',                      // Priority
    'John Doe',                    // Recipient name (optional)
    null,                          // Scheduled time (null = now)
    3                              // Max attempts
);
```

### Queue Session Reminder

```php
$queueService = new EmailQueueService();

// Queue a session reminder
$queueId = $queueService->queueSessionReminder(
    ['email' => 'user@example.com', 'username' => 'John'],
    ['session_title' => 'Adventure Session', 'session_datetime' => '2026-01-10 19:00:00'],
    new DateTime('2026-01-09 19:00:00') // Send 24h before session
);
```

### Queue XP Awarded Email

```php
$queueService = new EmailQueueService();

$queueId = $queueService->queueXPAwarded(
    ['email' => 'user@example.com', 'username' => 'John'],
    500,                           // XP amount
    'Defeated dragon',             // Reason
    true                           // Can level up (high priority)
);
```

### Scheduled Emails

```php
// Schedule email for specific time
$scheduledTime = new DateTime('2026-01-10 09:00:00');

$queueId = $queueService->queueEmail(
    'user@example.com',
    'Daily Report',
    '<html>...</html>',
    null,
    'normal',
    null,
    $scheduledTime  // Will be sent at this time
);
```

## Queue Processing

### Cron Job Setup

Add to your crontab:

```bash
# Process email queue every 5 minutes
*/5 * * * * php /path/to/becmi-vtt/cron/process-email-queue.php >> /var/log/becmi-email-queue.log 2>&1
```

Or every minute for faster processing:

```bash
*/1 * * * * php /path/to/becmi-vtt/cron/process-email-queue.php >> /var/log/becmi-email-queue.log 2>&1
```

### URL Access (Optional)

If the cron directory is web-accessible, you can also call it via URL:

```
https://becmi.snilld-api.dk/cron/process-email-queue.php
```

### Processing Behavior

- Processes up to 10 emails per run (configurable)
- Prioritizes by: urgent → high → normal → low
- Then by creation time (oldest first)
- Automatically retries failed emails (up to max_attempts)
- Marks as failed after max attempts
- Respects scheduled_at times

## Queue Statistics

### Get Queue Stats

```php
$queueService = new EmailQueueService();
$stats = $queueService->getQueueStats();

// Returns:
// [
//     'total' => 150,
//     'pending' => 5,
//     'processing' => 1,
//     'sent' => 140,
//     'failed' => 4,
//     'urgent_pending' => 1
// ]
```

### API Endpoint

```http
GET /api/admin/email-queue-stats.php
```

Returns queue statistics and recent activity.

## Cleanup

### Manual Cleanup

```php
$queueService = new EmailQueueService();

// Delete emails older than 30 days
$deleted = $queueService->cleanupOldEmails(30);
```

### Automated Cleanup

Add to cron:

```bash
# Cleanup old emails daily at 2 AM
0 2 * * * php /path/to/becmi-vtt/cron/cleanup-email-queue.php
```

## Integration Examples

### Replace Direct Email Sending

**Before:**
```php
$emailService = new EmailService();
$emailService->sendSessionReminder($user, $session);
```

**After:**
```php
$queueService = new EmailQueueService();
$queueService->queueSessionReminder($user, $session);
```

### Bulk Email Sending

```php
$queueService = new EmailQueueService();

foreach ($users as $user) {
    $queueService->queueEmail(
        $user['email'],
        'Newsletter',
        $newsletterHtml,
        null,
        'low',  // Low priority for newsletters
        $user['username']
    );
}
```

## Error Handling

Failed emails are automatically retried. After `max_attempts`, the email is marked as `failed` with an error message stored in `error_message`.

Check failed emails:

```sql
SELECT queue_id, recipient_email, subject, error_message, attempts
FROM email_queue
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

## Best Practices

1. **Use appropriate priorities**: 
   - `urgent`: Critical notifications (level up, session starting)
   - `high`: Important updates (XP awarded, session changes)
   - `normal`: Regular notifications (session reminders)
   - `low`: Newsletters, bulk emails

2. **Schedule appropriately**: Use `scheduled_at` for time-sensitive emails (e.g., reminders 24h before session)

3. **Monitor the queue**: Check queue stats regularly to ensure emails are being processed

4. **Cleanup regularly**: Remove old sent/failed emails to keep the table size manageable

5. **Handle failures**: Monitor failed emails and investigate error messages

## Troubleshooting

### Emails not sending

1. Check queue status: `GET /api/admin/email-queue-stats.php`
2. Check cron job is running: `tail -f /var/log/becmi-email-queue.log`
3. Check for failed emails: Query `email_queue` table with `status = 'failed'`
4. Verify EmailService configuration

### Queue growing too large

1. Increase cron frequency (every 1 minute instead of 5)
2. Increase batch size in `process-email-queue.php`
3. Check for stuck emails with `status = 'processing'` (should auto-reset)

### Performance

- Queue processing is designed to be fast
- Processes 10 emails per run by default
- Max 4 minutes processing time per run
- Indexes on status, priority, scheduled_at for fast queries

---

**Last Updated**: January 2026  
**Version**: 2.1.0

