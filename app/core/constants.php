<?php
/**
 * BECMI D&D Character Manager - Application Constants
 * 
 * Centralized constants to replace magic numbers throughout the codebase.
 */

// File upload limits
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB in bytes

// Rate limiting constants
define('RATE_LIMIT_ATTEMPTS', 15); // Maximum attempts
define('RATE_LIMIT_WINDOW', 300); // Time window in seconds (5 minutes)

// Pagination defaults
define('PAGINATION_DEFAULT_LIMIT', 20);
define('PAGINATION_MAX_LIMIT', 100);

// Session timeout
define('SESSION_TIMEOUT', 1800); // 30 minutes in seconds

// Bulk operation limits
define('MAX_BULK_CREATE_COUNT', 50);

?>
