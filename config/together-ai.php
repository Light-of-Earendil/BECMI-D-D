<?php
/**
 * BECMI D&D Character Manager - Together AI Configuration
 *
 * SECURITY: API key loaded from environment or repo-root .env file.
 */
require_once __DIR__ . '/env.php';

$together_AI_api_key = becmiEnv('TOGETHER_AI_API_KEY', '');
?>
