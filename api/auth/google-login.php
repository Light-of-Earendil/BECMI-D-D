<?php
/**
 * BECMI D&D Character Manager - Google Login Endpoint
 *
 * Accepts a Google Identity Services credential, verifies it against
 * Google's current signing keys, links or creates a local user, and
 * then starts the normal cookie-backed app session.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/core/constants.php';
require_once '../../app/services/google-auth.php';

if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

while (ob_get_level()) {
    @ob_end_clean();
}

Security::init();
header('Content-Type: application/json; charset=utf-8');

/**
 * Build a repo-valid username from Google profile data.
 */
function buildGoogleUsername(Database $db, array $googleUser): string {
    $candidates = [];

    $emailLocalPart = strstr((string) ($googleUser['email'] ?? ''), '@', true);
    if ($emailLocalPart !== false) {
        $candidates[] = $emailLocalPart;
    }

    $fullName = trim(((string) ($googleUser['given_name'] ?? '')) . '_' . ((string) ($googleUser['family_name'] ?? '')));
    if ($fullName !== '_') {
        $candidates[] = $fullName;
    }

    if (!empty($googleUser['name'])) {
        $candidates[] = (string) $googleUser['name'];
    }

    $candidates[] = 'adventurer';

    foreach ($candidates as $candidate) {
        $normalized = preg_replace('/[^A-Za-z0-9_]+/', '_', strtolower(trim((string) $candidate)));
        $normalized = trim((string) $normalized, '_');

        if ($normalized === '') {
            continue;
        }

        if (strlen($normalized) < 3) {
            $normalized = str_pad($normalized, 3, 'x');
        }

        if (strlen($normalized) > 50) {
            $normalized = substr($normalized, 0, 50);
        }

        if (!Security::validateUsername($normalized)) {
            continue;
        }

        $baseUsername = $normalized;
        $suffix = 1;
        $username = $baseUsername;

        while ($db->selectOne("SELECT user_id FROM users WHERE username = ?", [$username])) {
            $suffixText = '_' . $suffix;
            $maxBaseLength = 50 - strlen($suffixText);
            $username = substr($baseUsername, 0, $maxBaseLength) . $suffixText;
            $suffix++;
        }

        return $username;
    }

    return 'adventurer_' . substr(bin2hex(random_bytes(4)), 0, 8);
}

function upsertGoogleOAuthAccount(Database $db, int $userId, array $googleUser): void {
    $existing = $db->selectOne(
        "SELECT oauth_account_id
         FROM user_oauth_accounts
         WHERE provider = ? AND provider_user_id = ?",
        ['google', $googleUser['sub']]
    );

    $params = [
        $userId,
        $googleUser['email'],
        $googleUser['email_verified'] ? 1 : 0,
        Security::sanitizeInput($googleUser['given_name'] ?? ''),
        Security::sanitizeInput($googleUser['family_name'] ?? ''),
        $googleUser['picture'] ?? ''
    ];

    if ($existing) {
        $db->execute(
            "UPDATE user_oauth_accounts
             SET user_id = ?,
                 provider_email = ?,
                 email_verified = ?,
                 given_name = ?,
                 family_name = ?,
                 picture_url = ?,
                 last_login_at = NOW()
             WHERE oauth_account_id = ?",
            array_merge($params, [$existing['oauth_account_id']])
        );
        return;
    }

    $db->insert(
        "INSERT INTO user_oauth_accounts
         (user_id, provider, provider_user_id, provider_email, email_verified, given_name, family_name, picture_url, last_login_at)
         VALUES (?, 'google', ?, ?, ?, ?, ?, ?, NOW())",
        [
            $userId,
            $googleUser['sub'],
            $googleUser['email'],
            $googleUser['email_verified'] ? 1 : 0,
            Security::sanitizeInput($googleUser['given_name'] ?? ''),
            Security::sanitizeInput($googleUser['family_name'] ?? ''),
            $googleUser['picture'] ?? ''
        ]
    );
}

/**
 * Ensure the Google OAuth account link table exists on deployments
 * where migration 039 has not been applied yet.
 */
function ensureGoogleOAuthSchema(Database $db): void {
    $tableExists = $db->selectOne("SHOW TABLES LIKE 'user_oauth_accounts'");
    if (!$tableExists) {
        $db->execute(
            "CREATE TABLE IF NOT EXISTS user_oauth_accounts (
                oauth_account_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                provider VARCHAR(32) NOT NULL,
                provider_user_id VARCHAR(255) NOT NULL,
                provider_email VARCHAR(255) NULL,
                email_verified BOOLEAN DEFAULT FALSE,
                given_name VARCHAR(100) NULL,
                family_name VARCHAR(100) NULL,
                picture_url TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                UNIQUE KEY uniq_oauth_provider_subject (provider, provider_user_id)
            )"
        );
    }

    $oauthUserIndex = $db->selectOne(
        "SHOW INDEX FROM user_oauth_accounts WHERE Key_name = ?",
        ['idx_user_oauth_user']
    );
    if (!$oauthUserIndex) {
        $db->execute("CREATE INDEX idx_user_oauth_user ON user_oauth_accounts(user_id)");
    }

    $oauthProviderEmailIndex = $db->selectOne(
        "SHOW INDEX FROM user_oauth_accounts WHERE Key_name = ?",
        ['idx_user_oauth_provider_email']
    );
    if (!$oauthProviderEmailIndex) {
        $db->execute("CREATE INDEX idx_user_oauth_provider_email ON user_oauth_accounts(provider, provider_email)");
    }
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    $input = Security::validateJSONInput();
    $credential = trim((string) ($input['credential'] ?? ''));

    if ($credential === '') {
        Security::sendValidationErrorResponse([
            'credential' => 'Google credential is required'
        ]);
    }

    $rateLimitKey = 'google_login_' . Security::getClientIP();
    if (!Security::checkRateLimit($rateLimitKey, RATE_LIMIT_ATTEMPTS, RATE_LIMIT_WINDOW)) {
        Security::logSecurityEvent('rate_limit_exceeded', ['action' => 'google_login']);
        Security::sendErrorResponse('Too many Google login attempts. Please try again later.', 429);
    }

    $googleUser = GoogleAuthService::verifyCredential($credential);
    $db = getDB();
    ensureGoogleOAuthSchema($db);
    $pdo = $db->getConnection();
    $pdo->beginTransaction();

    $user = null;
    $oauthAccount = $db->selectOne(
        "SELECT user_id
         FROM user_oauth_accounts
         WHERE provider = ? AND provider_user_id = ?",
        ['google', $googleUser['sub']]
    );

    if ($oauthAccount) {
        $user = $db->selectOne(
            "SELECT user_id, username, email, first_name, last_name, is_active, is_moderator
             FROM users
             WHERE user_id = ?",
            [$oauthAccount['user_id']]
        );
    }

    if (!$user) {
        $user = $db->selectOne(
            "SELECT user_id, username, email, first_name, last_name, is_active, is_moderator
             FROM users
             WHERE email = ?",
            [$googleUser['email']]
        );
    }

    if ($user && !(bool) $user['is_active']) {
        $pdo->rollBack();
        Security::sendErrorResponse('Account is disabled', 403);
    }

    $isNewAccount = false;
    if (!$user) {
        $username = buildGoogleUsername($db, $googleUser);
        $randomPassword = bin2hex(random_bytes(24));
        $passwordHash = Security::hashPassword($randomPassword);
        $firstName = Security::sanitizeInput($googleUser['given_name'] ?? '');
        $lastName = Security::sanitizeInput($googleUser['family_name'] ?? '');

        $userId = (int) $db->insert(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at, last_login)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())",
            [$username, $googleUser['email'], $passwordHash, $firstName, $lastName]
        );

        $user = [
            'user_id' => $userId,
            'username' => $username,
            'email' => $googleUser['email'],
            'first_name' => $firstName,
            'last_name' => $lastName,
            'is_active' => 1,
            'is_moderator' => 0
        ];
        $isNewAccount = true;
    } else {
        $firstName = Security::sanitizeInput($googleUser['given_name'] ?? '');
        $lastName = Security::sanitizeInput($googleUser['family_name'] ?? '');
        $db->execute(
            "UPDATE users
             SET last_login = NOW(),
                 first_name = CASE
                     WHEN (first_name IS NULL OR first_name = '') AND ? <> '' THEN ?
                     ELSE first_name
                 END,
                 last_name = CASE
                     WHEN (last_name IS NULL OR last_name = '') AND ? <> '' THEN ?
                     ELSE last_name
                 END
             WHERE user_id = ?",
            [$firstName, $firstName, $lastName, $lastName, $user['user_id']]
        );
    }

    upsertGoogleOAuthAccount($db, (int) $user['user_id'], $googleUser);
    $pdo->commit();

    // Rotate the PHP session identifier on authentication to prevent fixation.
    if (session_status() !== PHP_SESSION_ACTIVE || !@session_regenerate_id(true)) {
        Security::sendErrorResponse('Failed to secure session', 500);
    }

    $sessionId = Security::generateSessionId();
    $csrfToken = Security::generateCSRFToken();

    if (!Security::createUserSession($user['user_id'], $sessionId, $csrfToken)) {
        Security::sendErrorResponse('Failed to create session', 500);
    }

    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['session_id'] = $sessionId;
    $_SESSION['csrf_token'] = $csrfToken;

    session_write_close();

    Security::logSecurityEvent('google_login_success', [
        'user_id' => (int) $user['user_id'],
        'is_new_account' => $isNewAccount
    ]);

    while (ob_get_level()) {
        @ob_end_clean();
    }

    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'success',
        'message' => $isNewAccount ? 'Google account created and logged in successfully' : 'Google login successful',
        'request_id' => Security::getRequestId(),
        'data' => [
            'user_id' => (int) $user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'is_moderator' => (bool) ($user['is_moderator'] ?? false),
            'session_id' => $sessionId,
            'csrf_token' => $csrfToken,
            'login_provider' => 'google',
            'is_new_account' => $isNewAccount
        ],
        'csrf_token' => $csrfToken
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
} catch (Exception $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    Security::debugLog('Google login error', [
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);

    $httpCode = (int) $e->getCode();
    if ($httpCode < 400 || $httpCode > 599) {
        if (stripos($e->getMessage(), 'configured') !== false) {
            $httpCode = 503;
        } elseif (stripos($e->getMessage(), 'disabled') !== false) {
            $httpCode = 403;
        } else {
            $httpCode = 401;
        }
    }

    $safeMessage = $httpCode >= 500
        ? 'An error occurred during Google login'
        : $e->getMessage();

    Security::sendErrorResponse($safeMessage, $httpCode);
}
