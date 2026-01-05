<?php
/**
 * BECMI D&D Character Manager - Together AI Configuration
 * 
 * SECURITY: API key loaded from environment variable to prevent exposure
 * TODO: Set TOGETHER_AI_API_KEY environment variable and remove fallback
 */
$together_AI_api_key = getenv('TOGETHER_AI_API_KEY') ?: ''; // TEMPORARY FALLBACK - MUST BE REPLACED WITH ENV VAR
?>
