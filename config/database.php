<?php
/**
 * BECMI D&D Character Manager - Database Configuration
 * 
 * Configuration file for XAMPP environment
 */

// Database configuration for production server
return [
    'host' => 'localhost',
    'port' => '3306',
    'database' => 'snilld_dk_db',
    'username' => 'root',
    'password' => 'everquest',
    'charset' => 'utf8mb4',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ]
];
?>
