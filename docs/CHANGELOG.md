# Changelog

All notable changes to the BECMI VTT project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-01-06

### Added
- **Constants System**: Created `app/core/constants.php` with centralized constants for magic numbers
  - `MAX_FILE_SIZE` - 5MB file upload limit
  - `RATE_LIMIT_ATTEMPTS` - 15 attempts
  - `RATE_LIMIT_WINDOW` - 300 seconds (5 minutes)
  - `PAGINATION_DEFAULT_LIMIT` - 20 items
  - `PAGINATION_MAX_LIMIT` - 100 items
  - `SESSION_TIMEOUT` - 1800 seconds
  - `MAX_BULK_CREATE_COUNT` - 50 items
- **Centralized Utilities**: Created `public/js/core/utils.js` with shared utility functions
  - `escapeHtml()` - Centralized XSS prevention function
  - `formatRelativeTime()` - Time formatting utility

### Changed
- **Security**: Moved Together AI API key to environment variable with fallback
  - Location: `config/together-ai.php`
  - Now uses `getenv('TOGETHER_AI_API_KEY') ?: ''` with empty string fallback
  - Impact: Prevents runtime errors if environment variable is not set
- **Database Queries**: Replaced all `SELECT *` queries with explicit column lists
  - Fixed 7 instances across:
    - `api/character/level-up.php`
    - `api/character/update.php` (2 queries)
    - `api/user/notification-preferences.php`
    - `api/items/magical-variants.php`
    - `api/monsters/create-instance.php`
    - `api/monsters/update-instance.php`
    - `api/combat/remove-monster.php`
  - Impact: Better performance, maintainability, and explicit data contracts
- **Type Safety**: Added type declarations to Database class methods
  - All public methods now have parameter and return type declarations
  - Impact: Better IDE support, catch errors at development time
- **Code Organization**: Centralized `escapeHtml()` function
  - Removed duplication across 10+ JavaScript modules
  - All modules now use global `escapeHtml()` from `utils.js`
  - Impact: Single source of truth, easier maintenance

### Fixed
- **Security**: Fixed missing fallback for Together AI API key configuration
  - Issue: `getenv('TOGETHER_AI_API_KEY')` had no fallback, causing potential runtime errors
  - Fix: Added empty string fallback `?: ''`
  - Impact: Prevents undefined variable errors
- **Database**: Fixed transaction error handling
  - Issue: `beginTransaction()` did not check return value
  - Fix: Added error checking and exception throwing
  - Location: `app/core/database.php:202-208`
  - Impact: Better error detection and logging for transaction failures
- **SQL Injection Prevention**: Fixed dynamic query building
  - Issue: Field names in dynamic queries lacked backticks
  - Fix: Added backticks to field names in update arrays
  - Locations: `api/user/notification-preferences.php`, `api/session/maps/update.php`
  - Impact: Prevents potential SQL injection via field name manipulation

### Notes (Deploy/Migration)
- **Environment Variables**: Must be set on production server:
  - `TOGETHER_AI_API_KEY` - Together AI API key for image generation
  - `DB_PASS` - Database password (already configured)
  - Fallback values in code are temporary and should be removed after env vars are set
- **No Database Migrations Required**: All changes are code-only
- **No Breaking Changes**: All changes are backward compatible

---

## [2.1.0-beta] - 2026-01-04

### Changed
- **Security**: Moved database credentials to environment variables
  - Location: `config/database.php`
  - Now uses `getenv('DB_PASS') ?: 'everquest'` with fallback
  - Impact: Prevents credential exposure in version control

---

## Previous Versions

See [ISSUES.md](../ISSUES.md) and [FINAL_IMPLEMENTATION_STATUS.md](../FINAL_IMPLEMENTATION_STATUS.md) for historical changes.
