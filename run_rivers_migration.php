<?php
/**
 * Run the rivers migration for hex_tiles table
 * This script adds the rivers column to the hex_tiles table
 */

require_once __DIR__ . '/app/core/database.php';

try {
    $db = getDB();
    
    // Check if column already exists
    $columnCheck = $db->selectOne(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'hex_tiles' 
         AND COLUMN_NAME = 'rivers'"
    );
    
    if ($columnCheck !== null) {
        echo "✓ Rivers column already exists in hex_tiles table.\n";
        exit(0);
    }
    
    // Run the migration
    echo "Running migration: Adding rivers column to hex_tiles table...\n";
    
    $db->execute(
        "ALTER TABLE hex_tiles 
         ADD COLUMN rivers JSON NULL 
         COMMENT 'River/stream information: {\"0\": \"river\", \"3\": \"stream\"} means edge 0 has a river and edge 3 has a stream'"
    );
    
    echo "✓ Migration completed successfully! Rivers column has been added to hex_tiles table.\n";
    
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>


