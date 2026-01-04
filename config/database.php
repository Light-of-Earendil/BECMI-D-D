<?php
/**
 * BECMI D&D Character Manager - Database Configuration
 * 
 * Configuration file for XAMPP environment
 */

// Database configuration for production server
// SECURITY: Credentials loaded from environment variables to prevent exposure
// TODO: Set environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS) and remove fallback values
return [
    'host' => getenv('DB_HOST') ?: 'localhost',
    'port' => getenv('DB_PORT') ?: '3306',
    'database' => getenv('DB_NAME') ?: 'becmi_vtt',
    'username' => getenv('DB_USER') ?: 'root',
    'password' => getenv('DB_PASS') ?: 'everquest', // TEMPORARY FALLBACK - MUST BE REPLACED WITH ENV VAR
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, 
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]
];
?>
