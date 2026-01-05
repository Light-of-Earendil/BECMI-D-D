# BECMI VTT - Architecture Documentation

**Last Updated**: 2026-01-06  
**Version**: 2.1.0-beta

---

## Overview

BECMI VTT is a single-page application (SPA) built with vanilla PHP backend and jQuery frontend. The architecture emphasizes security, maintainability, and separation of concerns.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  jQuery SPA (public/index.php)                      │   │
│  │  - Core modules (app.js, api-client.js)            │   │
│  │  - Feature modules (character, session, forum, etc.)│   │
│  │  - Utilities (utils.js - escapeHtml, etc.)          │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/JSON
                        │ CSRF Token
                        │ Session Cookie
┌───────────────────────▼─────────────────────────────────────┐
│              PHP Backend (api/*.php)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Security Layer (app/core/security.php)             │   │
│  │  - Authentication                                    │   │
│  │  - CSRF Protection                                   │   │
│  │  - Input Validation                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database Layer (app/core/database.php)              │   │
│  │  - PDO with prepared statements                      │   │
│  │  - Transaction management                           │   │
│  │  - Type-safe methods                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Business Logic (app/services/*.php)                 │   │
│  │  - BECMI Rules Engine                                │   │
│  │  - Event Broadcasting                                │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ SQL (Prepared Statements)
┌───────────────────────▼─────────────────────────────────────┐
│              MySQL Database (becmi_vtt)                      │
│  - InnoDB tables with foreign keys                          │
│  - Indexed queries for performance                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Modules and Responsibilities

### Frontend Modules (`public/js/`)

#### Core Modules (`public/js/core/`)
- **app.js**: Main application initialization, routing, authentication state
- **api-client.js**: Centralized AJAX communication with backend
- **state-manager.js**: Client-side state management
- **event-bus.js**: Event-driven communication between modules
- **utils.js**: Shared utility functions (escapeHtml, formatRelativeTime)

#### Feature Modules (`public/js/modules/`)
- **character-sheet.js**: Character display and editing
- **session-management.js**: Session CRUD and player management
- **dm-dashboard.js**: DM tools and real-time monitoring
- **forum.js**: Forum browsing and posting
- **campaign-management.js**: Campaign creation and game time tracking
- **monster-browser.js**: Monster database browsing
- **session-map-scratchpad.js**: Hex map editor and player view

### Backend Modules (`api/`)

#### Authentication (`api/auth/`)
- **login.php**: User authentication
- **register.php**: User registration
- **password-reset.php**: Password reset flow

#### Character Management (`api/character/`)
- **create.php**: Character creation wizard
- **update.php**: Character updates
- **level-up.php**: Level progression
- **update-hp.php**: HP tracking

#### Session Management (`api/session/`)
- **create.php**: Session creation
- **update.php**: Session updates
- **invite-player.php**: Player invitations
- **get-dm-dashboard.php**: DM dashboard data

#### Forum (`api/forum/`)
- **posts/create.php**: Post creation
- **threads/create.php**: Thread creation
- **moderation/*.php**: Moderation tools

### Core Services (`app/core/`)

#### Security (`app/core/security.php`)
- Authentication and authorization
- CSRF token generation and validation
- Input sanitization and validation
- Rate limiting
- Security event logging

#### Database (`app/core/database.php`)
- Singleton database connection
- Prepared statement execution
- Transaction management
- Type-safe query methods

#### Constants (`app/core/constants.php`)
- Centralized application constants
- Magic number replacements
- Configuration values

### Business Logic (`app/services/`)

#### BECMI Rules Engine (`app/services/becmi-rules.php`)
- THAC0 calculations
- Saving throw calculations
- Encumbrance calculations
- Spell slot management

#### Event Broadcaster (`app/services/event-broadcaster.php`)
- Real-time event broadcasting
- Long-polling support

---

## Data Flow

### Example: Character HP Update

1. **User Action**: User clicks "Take Damage" button in character sheet
2. **Frontend**: `character-sheet.js` calls `APIClient.post('/api/character/update-hp.php', {character_id, damage})`
3. **API Client**: Adds CSRF token, sends JSON request
4. **Backend**: `api/character/update-hp.php`
   - Validates CSRF token (`Security::checkCSRFToken()`)
   - Authenticates user (`Security::requireAuth()`)
   - Validates input (`Security::validateJSONInput()`)
   - Updates database (`Database::update()` with prepared statement)
   - Broadcasts event (`EventBroadcaster::broadcast()`)
5. **Database**: Executes prepared statement, updates row
6. **Backend**: Returns JSON response `{success: true, data: {...}}`
7. **Frontend**: Updates UI, shows success message
8. **Real-time**: Other connected clients receive event via long-polling

### Example: File Upload

1. **User Action**: User uploads forum post image
2. **Frontend**: Form submission with file
3. **Backend**: `api/forum/posts/upload-image.php`
   - Validates file size (`MAX_FILE_SIZE` constant)
   - Validates MIME type (`finfo`)
   - Generates safe filename
   - Saves to disk
4. **Response**: Returns image URL
5. **Frontend**: Inserts image into post editor

---

## External Dependencies

### Services
- **Together AI API**: Image generation for character portraits
  - Endpoint: `https://api.together.xyz/v1/images/generations`
  - Config: `config/together-ai.php` (uses `TOGETHER_AI_API_KEY` env var)
  - Failure behavior: Returns error, user can retry

### Libraries
- **jQuery 3.7.1**: DOM manipulation and AJAX
- **Font Awesome 6.0.0**: Icons
- **Google Meet**: Video conferencing (external link)

---

## Failure Modes and Error Handling

### Network Failures
- **AJAX Timeout**: 30 seconds default, retries 3 times
- **Response**: Error message shown to user, request can be retried

### Database Failures
- **Connection Loss**: Exception thrown, logged, user sees generic error
- **Transaction Failures**: Automatic rollback, error logged
- **Query Failures**: Exception with SQL logged (not exposed to user)

### Authentication Failures
- **Session Expired**: Redirect to login
- **CSRF Token Invalid**: 403 error, user must refresh page
- **Rate Limit Exceeded**: 429 error, user must wait

### File Upload Failures
- **Size Limit**: Error message with max size
- **Invalid Type**: Error message with allowed types
- **Disk Full**: Server error logged, generic error to user

---

## Security Architecture

### Authentication
- Session-based authentication
- Secure session cookies (HttpOnly, SameSite)
- Session timeout: 30 minutes

### Authorization
- Role-based: User, Moderator, DM
- Endpoint-level checks: `Security::requireAuth()`, `Security::requireModerator()`

### CSRF Protection
- Token generation: `random_bytes(32)`
- Token validation: `hash_equals()` (timing-safe)
- Required for all state-changing operations

### Input Validation
- All inputs sanitized: `Security::sanitizeInput()`
- Type validation: Email, username, numeric IDs
- Length validation: Where applicable
- File validation: MIME type, size, extension

### SQL Injection Prevention
- All queries use prepared statements
- PDO with `ATTR_EMULATE_PREPARES => false`
- Dynamic queries use whitelisted field names with backticks

### XSS Prevention
- Server-side: `htmlspecialchars()` in `Security::sanitizeInput()`
- Client-side: `escapeHtml()` function in `utils.js`
- All user-generated content escaped before rendering

---

## Configuration

### Environment Variables
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 3306)
- `DB_NAME`: Database name (default: becmi_vtt)
- `DB_USER`: Database user (default: root)
- `DB_PASS`: Database password (required)
- `TOGETHER_AI_API_KEY`: Together AI API key (optional, for image generation)

### Configuration Files
- `config/database.php`: Database connection settings
- `config/together-ai.php`: Together AI API key
- `app/core/constants.php`: Application constants

---

## Performance Considerations

### Database
- All queries use indexes (foreign keys)
- Explicit column lists (no `SELECT *`)
- Pagination for large result sets
- Transactions for multi-step operations

### Frontend
- Event delegation for dynamic content
- Long-polling with 25s timeout
- Lazy loading of modules
- Centralized utility functions to reduce duplication

### Caching
- **Status**: Not implemented
- **Future**: Consider caching for:
  - Item catalog
  - Spell lists
  - Skill descriptions
  - Forum categories

---

## Development Guidelines

### Code Organization
- **PHP**: snake_case for variables, PascalCase for classes
- **JavaScript**: camelCase for variables, PascalCase for classes
- **SQL**: snake_case for tables and columns

### Type Safety
- Database class methods have type declarations
- JavaScript uses JSDoc for documentation
- PHP uses DocBlocks for public methods

### Error Handling
- All errors logged server-side
- User-friendly error messages (no stack traces)
- Consistent error response format: `Security::sendErrorResponse()`

### Testing
- Manual testing checklist for UI flows
- Database queries verified with EXPLAIN
- Security testing: CSRF, XSS, SQL injection

---

## Deployment

### Prerequisites
- PHP 8.x
- MySQL/MariaDB 5.7+
- Web server (Apache/Nginx)
- Network drive access (for direct deployment)

### Deployment Steps
1. Set environment variables on server
2. Upload files to network drive
3. Run database migrations (if any)
4. Verify database connection
5. Test authentication flow
6. Monitor error logs

### Rollback
- Restore previous version from backup
- Revert database migrations (if any)
- Clear application cache (if implemented)

---

## Monitoring and Debugging

### Logs
- **PHP Errors**: `error_log()` output (configured in php.ini)
- **Security Events**: Logged via `Security::logSecurityEvent()`
- **Database Errors**: Logged with SQL and parameters

### Debugging
- **Browser**: Network tab for AJAX requests, Console for JavaScript errors
- **Server**: Check error_log file, review stack traces
- **Database**: Run EXPLAIN on slow queries, check connection status

### Common Issues
- **Session Issues**: Check session directory permissions
- **Database Connection**: Verify environment variables
- **CSRF Errors**: Check token generation and validation
- **File Uploads**: Check directory permissions and PHP limits

---

## Future Enhancements

### Planned
- Automated testing (unit, integration, security)
- Performance monitoring (query timing, N+1 detection)
- Caching strategy (Redis/Memcached)
- Code analysis tools (PHPStan, ESLint)

### Under Consideration
- WebSocket support (replace long-polling)
- Progressive Web App (PWA) features
- Mobile app (React Native)
- Advanced analytics

---

## References

- [Code Review Report](../CODE_REVIEW_REPORT.md)
- [API Documentation](API.md)
- [Database Documentation](DATABASE.md)
- [Function Documentation](FUNCTION_DOCUMENTATION.md)
