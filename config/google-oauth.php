<?php
/**
 * BECMI D&D Character Manager - Google OAuth Configuration
 *
 * Public web client configuration for Google Identity Services.
 * No client secret is required for the current ID-token verification flow.
 */

if (!function_exists('becmiGoogleOAuthEnv')) {
    /**
     * Read config values from real environment first, then local .env as fallback.
     */
    function becmiGoogleOAuthEnv(string $key, string $default = ''): string {
        $envValue = getenv($key);
        if ($envValue !== false && $envValue !== '') {
            return (string) $envValue;
        }

        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return (string) $_ENV[$key];
        }

        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return (string) $_SERVER[$key];
        }

        static $dotenv = null;
        if ($dotenv === null) {
            $dotenv = [];
            $dotenvFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
            if (is_file($dotenvFile) && is_readable($dotenvFile)) {
                $lines = file($dotenvFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                if (is_array($lines)) {
                    foreach ($lines as $line) {
                        $line = trim($line);
                        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                            continue;
                        }

                        [$envKey, $envValue] = explode('=', $line, 2);
                        $envKey = trim($envKey);
                        $envValue = trim($envValue);
                        $envValue = trim($envValue, "\"'");

                        if ($envKey !== '') {
                            $dotenv[$envKey] = $envValue;
                        }
                    }
                }
            }
        }

        if (isset($dotenv[$key]) && $dotenv[$key] !== '') {
            return (string) $dotenv[$key];
        }

        return $default;
    }
}

return [
    'enabled' => becmiGoogleOAuthEnv('GOOGLE_LOGIN_ENABLED', '1') !== '0',
    'client_id' => becmiGoogleOAuthEnv('GOOGLE_CLIENT_ID', '')
];
