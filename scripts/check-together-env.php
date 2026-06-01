<?php
/**
 * One-off diagnostic: verify Together AI env loading (no secrets printed).
 */
require_once dirname(__DIR__) . '/config/together-ai.php';

$getenvVal = getenv('TOGETHER_AI_API_KEY');
$envFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
$envFileExists = is_file($envFile);

echo "together-ai.php key length: " . strlen($together_AI_api_key ?? '') . PHP_EOL;
echo "getenv(TOGETHER_AI_API_KEY): " . ($getenvVal !== false && $getenvVal !== '' ? strlen($getenvVal) : 'empty/missing') . PHP_EOL;
echo ".env file exists: " . ($envFileExists ? 'yes' : 'no') . PHP_EOL;

if ($envFileExists) {
    $hasKeyLine = false;
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), 'TOGETHER_AI_API_KEY=')) {
            $hasKeyLine = true;
            break;
        }
    }
    echo ".env contains TOGETHER_AI_API_KEY line: " . ($hasKeyLine ? 'yes' : 'no') . PHP_EOL;
}
