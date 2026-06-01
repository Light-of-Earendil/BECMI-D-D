<?php
/**
 * Google Identity Services helper.
 *
 * Verifies Google ID tokens locally against Google's current JWK set
 * and exposes the minimal public config required by the frontend.
 */

class GoogleAuthService {
    private const GOOGLE_DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration';
    private const GOOGLE_ALLOWED_ISSUERS = [
        'https://accounts.google.com',
        'accounts.google.com'
    ];

    private static ?array $config = null;

    public static function getConfig(): array {
        if (self::$config !== null) {
            return self::$config;
        }

        $configFile = __DIR__ . '/../../config/google-oauth.php';
        if (file_exists($configFile)) {
            $config = require $configFile;
            if (is_array($config)) {
                self::$config = $config;
                return self::$config;
            }
        }

        self::$config = [
            'enabled' => (getenv('GOOGLE_LOGIN_ENABLED') ?: '1') !== '0',
            'client_id' => getenv('GOOGLE_CLIENT_ID') ?: ''
        ];

        return self::$config;
    }

    public static function getPublicConfig(): array {
        $config = self::getConfig();
        $clientId = trim((string) ($config['client_id'] ?? ''));
        $enabled = !empty($clientId) && (($config['enabled'] ?? true) !== false);

        return [
            'enabled' => $enabled,
            'clientId' => $enabled ? $clientId : ''
        ];
    }

    public static function isEnabled(): bool {
        $publicConfig = self::getPublicConfig();
        return $publicConfig['enabled'] === true;
    }

    /**
     * Verify a Google Identity Services credential payload.
     *
     * @throws Exception
     */
    public static function verifyCredential(string $credential): array {
        $credential = trim($credential);
        if ($credential === '') {
            throw new Exception('Google credential is required');
        }

        $config = self::getPublicConfig();
        if (!$config['enabled']) {
            throw new Exception('Google Login is not configured');
        }

        $parts = explode('.', $credential);
        if (count($parts) !== 3) {
            throw new Exception('Invalid Google credential format');
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $header = self::decodeJwtSegment($encodedHeader);
        $payload = self::decodeJwtSegment($encodedPayload);
        $signature = self::base64UrlDecode($encodedSignature);

        if (($header['alg'] ?? '') !== 'RS256') {
            throw new Exception('Unsupported Google credential algorithm');
        }

        $kid = trim((string) ($header['kid'] ?? ''));
        if ($kid === '') {
            throw new Exception('Google credential is missing key identifier');
        }

        $jwks = self::fetchGoogleJwks();
        $matchingJwk = null;
        foreach ($jwks as $jwk) {
            if (($jwk['kid'] ?? '') === $kid) {
                $matchingJwk = $jwk;
                break;
            }
        }

        if ($matchingJwk === null) {
            throw new Exception('Google signing key not found');
        }

        $signingInput = $encodedHeader . '.' . $encodedPayload;
        if (!self::verifySignature($signingInput, $signature, $matchingJwk)) {
            throw new Exception('Google credential signature verification failed');
        }

        $issuer = trim((string) ($payload['iss'] ?? ''));
        if (!in_array($issuer, self::GOOGLE_ALLOWED_ISSUERS, true)) {
            throw new Exception('Google credential issuer is invalid');
        }

        $audience = $payload['aud'] ?? '';
        if ($audience !== $config['clientId']) {
            throw new Exception('Google credential audience mismatch');
        }

        $now = time();
        $expiresAt = isset($payload['exp']) ? (int) $payload['exp'] : 0;
        if ($expiresAt <= 0 || $expiresAt < ($now - 60)) {
            throw new Exception('Google credential has expired');
        }

        $issuedAt = isset($payload['iat']) ? (int) $payload['iat'] : 0;
        if ($issuedAt > ($now + 300)) {
            throw new Exception('Google credential issued-at time is invalid');
        }

        $subject = trim((string) ($payload['sub'] ?? ''));
        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        $emailVerified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ($subject === '' || $email === '') {
            throw new Exception('Google credential is missing required identity claims');
        }

        if (!$emailVerified) {
            throw new Exception('Google account email must be verified');
        }

        return [
            'sub' => $subject,
            'email' => $email,
            'email_verified' => true,
            'name' => trim((string) ($payload['name'] ?? '')),
            'given_name' => trim((string) ($payload['given_name'] ?? '')),
            'family_name' => trim((string) ($payload['family_name'] ?? '')),
            'picture' => trim((string) ($payload['picture'] ?? ''))
        ];
    }

    private static function fetchGoogleJwks(): array {
        $discovery = self::fetchJson(self::GOOGLE_DISCOVERY_URL);
        $jwksUri = trim((string) ($discovery['jwks_uri'] ?? ''));
        if ($jwksUri === '') {
            throw new Exception('Google discovery metadata did not provide jwks_uri');
        }

        $jwksResponse = self::fetchJson($jwksUri);
        $keys = $jwksResponse['keys'] ?? null;
        if (!is_array($keys) || empty($keys)) {
            throw new Exception('Google JWK response did not include signing keys');
        }

        return $keys;
    }

    private static function fetchJson(string $url): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Accept: application/json']
        ]);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            throw new Exception('Failed to contact Google: ' . $curlError);
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new Exception('Google returned HTTP ' . $httpCode);
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            throw new Exception('Google response was not valid JSON');
        }

        return $decoded;
    }

    private static function decodeJwtSegment(string $segment): array {
        $decoded = self::base64UrlDecode($segment);
        $json = json_decode($decoded, true);
        if (!is_array($json)) {
            throw new Exception('Invalid Google credential segment');
        }

        return $json;
    }

    private static function base64UrlDecode(string $value): string {
        $remainder = strlen($value) % 4;
        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw new Exception('Invalid base64url encoding');
        }

        return $decoded;
    }

    private static function verifySignature(string $signingInput, string $signature, array $jwk): bool {
        $pem = self::buildPemFromJwk($jwk);
        $publicKey = openssl_pkey_get_public($pem);
        if ($publicKey === false) {
            return false;
        }

        $result = openssl_verify($signingInput, $signature, $publicKey, OPENSSL_ALGO_SHA256);

        if (PHP_VERSION_ID < 80000 && is_resource($publicKey)) {
            openssl_free_key($publicKey);
        }

        return $result === 1;
    }

    private static function buildPemFromJwk(array $jwk): string {
        $modulus = self::base64UrlDecode((string) ($jwk['n'] ?? ''));
        $exponent = self::base64UrlDecode((string) ($jwk['e'] ?? ''));

        $rsaPublicKey = self::derSequence(
            self::derInteger($modulus),
            self::derInteger($exponent)
        );

        $algorithmIdentifier = hex2bin('300d06092a864886f70d0101010500');
        $subjectPublicKeyInfo = self::derSequence(
            $algorithmIdentifier,
            self::derBitString($rsaPublicKey)
        );

        return "-----BEGIN PUBLIC KEY-----\n"
            . chunk_split(base64_encode($subjectPublicKeyInfo), 64, "\n")
            . "-----END PUBLIC KEY-----\n";
    }

    private static function derInteger(string $value): string {
        if ($value === '') {
            $value = "\x00";
        }

        if (ord($value[0]) > 0x7f) {
            $value = "\x00" . $value;
        }

        return "\x02" . self::derLength(strlen($value)) . $value;
    }

    private static function derBitString(string $value): string {
        return "\x03" . self::derLength(strlen($value) + 1) . "\x00" . $value;
    }

    private static function derSequence(string ...$elements): string {
        $body = implode('', $elements);
        return "\x30" . self::derLength(strlen($body)) . $body;
    }

    private static function derLength(int $length): string {
        if ($length < 0x80) {
            return chr($length);
        }

        $binary = '';
        while ($length > 0) {
            $binary = chr($length & 0xff) . $binary;
            $length >>= 8;
        }

        return chr(0x80 | strlen($binary)) . $binary;
    }
}
