<?php
/**
 * BECMI D&D Character Manager - Together AI Configuration
 * 
 * SECURITY: API key loaded from environment variable to prevent exposure
 * TODO: Set TOGETHER_AI_API_KEY environment variable and remove fallback
 */
$together_AI_api_key = getenv('TOGETHER_AI_API_KEY') ?: 'tgp_v1_QX1LOZ4wgPk_cAEeJg3_J3ZnNAUMM71GA1TVKH6DHD0'; // TEMPORARY FALLBACK - MUST BE REPLACED WITH ENV VAR
?>
