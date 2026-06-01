# BECMI D&D Virtual Tabletop (VTT)

A comprehensive web-based management system for the Basic, Expert, Companion, Master, and Immortal (BECMI) ruleset of Dungeons & Dragons.

**Live URL**: https://becmi.snilld-api.dk/  
**Status**: Production-Ready (96% Complete)  
**Version**: 2.1.0-beta  
**Last Updated**: January 2026  
**License**: Custom (Open Source with Hosting Restrictions) - See [LICENSE](LICENSE)  
**GitHub**: [Repository Link] - Contributions Welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 🎯 Project Overview

This system provides a complete virtual tabletop experience for BECMI D&D campaigns, including:

### For Players:
- **Character Creation**: Complete 4-step wizard with automated calculations
- **Character Management**: Full character sheets with HP tracking, equipment, skills, and spells
- **Spell System**: Spellbook management, memorization, casting, and long rest mechanics
- **Level Progression**: Automated level-up wizard with XP tracking
- **Real-Time Updates**: Live HP, XP, and inventory updates across all session participants
- **Notifications**: Browser push notifications and email reminders
- **Video Conferencing**: Google Meet integration for remote sessions
- **Forum**: Community discussion platform with categories, threads, and posts

### For Dungeon Masters:
- **Session Management**: Create, schedule, and manage game sessions
- **Player Management**: Invite players, view all character sheets, track online status
- **Campaign Management**: Create and organize multiple campaigns with game time tracking
- **Combat Tools**: Initiative tracker with BECMI 1d6 system
- **Monster Management**: Browse monster database, create instances, track HP in combat
- **XP Management**: Award experience points to individual players or entire party
- **Item Distribution**: Give items (including magical items) to players
- **Hex Map Editor**: Create and manage hex-based campaign maps with markers, tiles, and fog of war
- **Audio System**: Upload and manage background music, create playlists, soundboard integration
- **DM Dashboard**: Real-time overview of all active sessions and players
- **Video Conferencing**: Add Google Meet links to sessions for remote play

### Rule Automation:
- **THAC0**: Automated calculations with Strength/Dexterity bonuses
- **Encumbrance**: Load system with Strength adjustments
- **Saving Throws**: All BECMI saving throw calculations
- **Weapon Mastery**: Complete progression system
- **General Skills**: Full skills system implementation
- **Spell Slots**: Class-specific spell slot management (Magic-User, Cleric, Elf)

---

## 🏗️ Architecture

### Technology Stack
- **Frontend**: jQuery 3.7.1 Single-Page Application (SPA)
- **Styling**: Stylus CSS preprocessor (modular architecture)
- **Backend**: Vanilla PHP 8.x (no Composer dependencies)
- **Database**: MySQL/MariaDB with InnoDB
- **Real-Time**: Long-polling system (25s timeout)
- **Video Conferencing**: Google Meet integration
- **Deployment**: Direct network drive on webserver

### Design Patterns
- **RESTful API**: Stateless API endpoints
- **Modular Architecture**: ES6+ JavaScript modules
- **Event-Driven**: Event bus pattern for real-time updates
- **Service Layer**: Business logic separation

---

## 📁 Directory Structure

```
BECMI VTT/
├── public/                    # Web server root
│   ├── index.html            # Main SPA shell
│   ├── index.php             # Entry point
│   ├── js/                   # JavaScript modules
│   │   ├── core/            # Core application
│   │   │   ├── app.js       # Main application
│   │   │   ├── api-client.js # API communication
│   │   │   ├── state-manager.js # State management
│   │   │   ├── event-bus.js # Event system
│   │   │   └── utils.js     # Centralized utilities (escapeHtml, formatRelativeTime)
│   │   └── modules/         # Feature modules (character, session, dm-dashboard, etc.)
│   ├── css/                  # Compiled CSS (from Stylus)
│   ├── stylus/               # Stylus source files (modular architecture)
│   │   ├── main.styl        # Main entry point
│   │   ├── _variables.styl  # Design tokens
│   │   ├── _mixins.styl     # Reusable mixins
│   │   ├── _components.styl # UI components
│   │   └── _features.styl   # Feature-specific styles
│   └── images/               # Static images and equipment assets
│
├── api/                       # PHP API endpoints (60+ endpoints)
│   ├── auth/                # Authentication (login, register, password reset)
│   ├── audio/               # Audio system (upload, playlists, soundboard, control)
│   ├── campaigns/           # Campaign management (CRUD, game time tracking, time-based effects)
│   ├── character/           # Character CRUD, HP, XP, level-up, skills, weapon mastery
│   ├── combat/              # Initiative tracking
│   ├── monsters/            # Monster database and instance management
│   ├── spells/              # Spell management (list, memorize, cast, rest)
│   ├── inventory/           # Equipment management (add, remove, equip, identify)
│   ├── items/               # Item catalog (list, categories, magical variants)
│   ├── hex-maps/            # Hex map CRUD, tiles, markers, fog of war
│   ├── realtime/            # Long-polling endpoint
│   ├── skills/              # General skills system
│   ├── forum/               # Forum system (categories, threads, posts, moderation, search)
│   ├── time-based-effects/  # Time-based spell/ability effects
│   └── user/                # User preferences, search
│
├── app/                      # Application logic
│   ├── core/                # Core utilities
│   │   ├── database.php    # Database connection (type-safe methods)
│   │   ├── security.php    # Security utilities (auth, CSRF, validation)
│   │   └── constants.php   # Application constants (magic number replacements)
│   └── services/            # Business logic classes
│       ├── becmi-rules.php  # BECMI rules engine
│       ├── event-broadcaster.php  # Real-time event broadcasting
│       ├── email-service.php      # Email notifications
│       ├── email-queue-service.php # Email queue management
│       └── portrait-manager.php   # Character portrait generation
│
├── config/                   # Configuration files
│   ├── database.php         # Database connection settings
│   └── together-ai.php      # AI service configuration
│
├── database/                  # Database schema and migrations
│   ├── schema.sql           # Base schema
│   └── migrations/          # Migration files (034+ migrations)
│       ├── 021_add_meet_link_to_sessions.sql  # Video conferencing support
│       ├── 022_email_queue_system.sql  # Email queue system
│       ├── 024_campaigns_system.sql  # Campaign management
│       ├── 025_campaign_game_time.sql  # Game time tracking
│       ├── 026_campaign_game_time_redesign.sql  # Game time redesign
│       ├── 027_time_based_effects.sql  # Time-based effects
│       ├── 028_audio_system.sql  # Audio system
│       ├── 030_monsters_table.sql  # Monster database
│       ├── 031_monster_instances_table.sql  # Monster instances
│       ├── 032_link_initiatives_to_monster_instances.sql  # Initiative integration
│       ├── 033_extend_tokens_for_monsters.sql  # Hex map token extension
│       └── 034_add_image_url_to_monsters.sql  # Monster images
│
├── cron/                     # Scheduled tasks
│   ├── send-session-reminders.php  # Email reminder cron job
│   └── process-email-queue.php     # Email queue processor
│
├── docs/                     # Documentation
│   ├── INSTALLATION.md      # Installation guide
│   ├── CHARACTER_CREATION_SYSTEM.md
│   ├── HEX_MAPS_SYSTEM.md
│   ├── FUNCTION_DOCUMENTATION.md
│   └── [Additional documentation files]
│
└── scripts/                  # Utility scripts
    └── generate_all_equipment_images.php
```

---

## 🚀 Installation & Deployment

### Prerequisites
- PHP 7.4+ (PHP 8.x recommended)
- MySQL/MariaDB 5.7+
- Apache web server with mod_rewrite
- Network drive access to webserver

### Quick Setup

1. **Clone/Download Project**
   ```bash
   # Project is located on network drive: m:\rpg\BECMI VTT\
   ```

2. **Database Setup**
   - Create database: `becmi_vtt`
   - Import base schema: `database/schema.sql`
   - Run migrations in order (see `database/migrations/`)
   - **Important**: Run migration `021_add_meet_link_to_sessions.sql` for video conferencing support

3. **Configuration**
   - **Set environment variables** (required for production):
     - `DB_HOST` - Database host (default: localhost)
     - `DB_PORT` - Database port (default: 3306)
     - `DB_NAME` - Database name (default: becmi_vtt)
     - `DB_USER` - Database username (default: root)
     - `DB_PASS` - Database password (required - fallback: 'everquest' for development only)
     - `TOGETHER_AI_API_KEY` - Together AI API key (optional - fallback: empty string)
   - **Note**: Configuration files use `getenv()` to read environment variables with fallback values for development
   - **Important**: Fallback values are temporary - environment variables must be set on production server
   - **Constants**: Application constants defined in `app/core/constants.php`:
     - `MAX_FILE_SIZE` - 5MB file upload limit
     - `RATE_LIMIT_ATTEMPTS` - 15 login attempts
     - `RATE_LIMIT_WINDOW` - 300 seconds (5 minutes)
     - `PAGINATION_DEFAULT_LIMIT` - 20 items
     - `PAGINATION_MAX_LIMIT` - 100 items
     - `SESSION_TIMEOUT` - 1800 seconds (30 minutes)
     - `MAX_BULK_CREATE_COUNT` - 50 items
   - Configure email settings in `app/services/email-service.php`
   - Set up cron job for session reminders (see below)

4. **Web Server Configuration**
   - Point document root to `/public` directory
   - Ensure `.htaccess` files are processed
   - Enable HTTPS (required)

5. **Cron Job Setup**
   ```bash
   # Send session reminders every hour
   0 * * * * php /path/to/becmi-vtt/cron/send-session-reminders.php >> /var/log/becmi-reminders.log 2>&1
   
   # Process email queue every 5 minutes
   */5 * * * * php /path/to/becmi-vtt/cron/process-email-queue.php >> /var/log/becmi-email-queue.log 2>&1
   
   # Cleanup old emails daily at 2 AM (optional)
   0 2 * * * php /path/to/becmi-vtt/cron/cleanup-email-queue.php >> /var/log/becmi-email-cleanup.log 2>&1
   ```
   
   **Important**: Run migration `022_email_queue_system.sql` for email queue support

For detailed installation instructions, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## ✅ Implementation Status

### Core Features (100% Complete)
- ✅ User authentication (register, login, password reset)
- ✅ Character creation wizard (4-step process)
- ✅ Character management (view, edit, delete, HP tracking)
- ✅ Session management (create, update, delete, invitations)
- ✅ DM dashboard with real-time updates
- ✅ Combat initiative tracker (BECMI 1d6 system)

### Equipment System (100% Complete)
- ✅ Complete BECMI equipment catalog (200+ items)
- ✅ Magical items with base item linking
- ✅ Inventory management (add, remove, equip, identify)
- ✅ Encumbrance tracking
- ✅ Weapon mastery integration
- ✅ DM item distribution

### Spell System (100% Complete)
- ✅ 50+ BECMI spells (Level 1-3 Magic-User/Cleric)
- ✅ Spellbook management
- ✅ Spell memorization
- ✅ Spell casting with slot tracking
- ✅ Long rest mechanics
- ✅ Class-specific spell handling

### Level-Up System (100% Complete)
- ✅ XP tracking and progression
- ✅ Automated level-up detection
- ✅ 6-step level-up wizard
- ✅ HP rolling on level-up
- ✅ THAC0 and saving throws auto-update
- ✅ DM XP award system

### Real-Time Features (100% Complete)
- ✅ Long-polling system (25s timeout)
- ✅ Live HP updates
- ✅ Live XP updates
- ✅ Live inventory updates
- ✅ Online user tracking
- ✅ Event broadcasting

### Notification System (100% Complete)
- ✅ Browser push notifications
- ✅ Toast notifications
- ✅ Email notifications with HTML templates
- ✅ Session reminder emails (24h before)
- ✅ User-configurable preferences
- ✅ **Email Queue System** ⭐ NEW - Asynchronous email sending with retry mechanism

### Hex Maps System (100% Complete)
- ✅ Hex map editor (create, edit, delete)
- ✅ Tile system (terrain types)
- ✅ Marker system (points of interest)
- ✅ Fog of war (reveal/hide hexes)
- ✅ Player movement tracking
- ✅ Map borders, roads, paths, rivers
- ✅ Configurable hex scale
- ✅ Monster token integration

### Audio System (100% Complete) ⭐ NEW
- ✅ Audio upload and management
- ✅ Playlist creation and management
- ✅ Soundboard integration for instant audio cues
- ✅ Audio control (play, pause, volume) during sessions
- ✅ Background music support

### Campaign Management System (100% Complete) ⭐ NEW
- ✅ Campaign CRUD operations
- ✅ Advanced game time tracking (days, weeks, months, years)
- ✅ Time-based effects system for spells and abilities
- ✅ Campaign-specific session organization
- ✅ Game time advancement API

### Monster System (100% Complete) ⭐ NEW
- ✅ Monster database with stats and images
- ✅ Monster instance creation for combat encounters
- ✅ HP tracking for monster instances
- ✅ Integration with initiative tracker
- ✅ Hex map token linking
- ✅ Monster browser UI

### Video Conferencing (100% Complete)
- ✅ Google Meet link integration
- ✅ Session creation with video links
- ✅ "Join Video Call" button in session views
- ✅ DM dashboard video call access
- ✅ Link generation helper

### Forum System (100% Complete)
- ✅ Category management (create, edit, delete)
- ✅ Thread management (create, edit, delete, lock, sticky, move, merge)
- ✅ Post management (create, edit, delete)
- ✅ Edit history tracking for posts
- ✅ Thread subscriptions
- ✅ Search functionality (threads and posts)
- ✅ Moderation tools (ban users, moderation queue)
- ✅ Private categories and threads
- ✅ User profile editing
- ✅ BBforums-inspired wood/parchment theme

### UI/UX (100% Complete)
- ✅ Professional styling (modular Stylus architecture)
- ✅ Responsive design
- ✅ Smooth animations and transitions
- ✅ Error handling and recovery
- ✅ Offline detection and auto-reconnect
- ✅ Loading states and skeletons
- ✅ Improved form readability and contrast

### Security (100% Complete)
- ✅ CSRF token protection
- ✅ SQL injection prevention (prepared statements)
- ✅ XSS prevention (output escaping)
- ✅ Input validation and sanitization
- ✅ Secure session management
- ✅ Authentication tokens
- ✅ **Environment variable configuration** ⭐ NEW - Credentials and API keys moved to environment variables

---

## 📚 Documentation

- **[AI Agents Guide](docs/AI_AGENTS.md)** - Shared entrypoints for Codex, Claude, Gemini, Copilot, Cursor, and repo-local skills
- **[Installation Guide](docs/INSTALLATION.md)** - Detailed setup instructions
- **[Character Creation System](docs/CHARACTER_CREATION_SYSTEM.md)** - Character creation process
- **[Hex Maps System](docs/HEX_MAPS_SYSTEM.md)** - Hex map editor documentation
- **[Forum System](docs/FORUM_SYSTEM.md)** - Complete forum system documentation
- **[Forum Category Management](docs/FORUM_CATEGORY_MANAGEMENT.md)** - Category management guide
- **[Email Queue System](docs/EMAIL_QUEUE_SYSTEM.md)** - Email queue documentation
- **[Function Documentation](docs/FUNCTION_DOCUMENTATION.md)** - Complete API and function reference
- **[Implementation Status](FINAL_IMPLEMENTATION_STATUS.md)** - Detailed feature status
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to this project
- **[Credits](CREDITS.md)** - Contributors and acknowledgments

---

## 🎮 Key Features

### Character Management
- Automated character creation with BECMI rules validation
- Real-time HP tracking with damage/healing UI
- Equipment management with encumbrance calculations
- Weapon mastery progression tracking
- General skills system
- Spell management for casters

### Session Management
- Create and schedule game sessions
- Player invitation system
- Session reminders (email + browser notifications)
- DM dashboard with live player status
- Combat initiative tracking
- **Video Conferencing**: Google Meet link integration for remote sessions

### Real-Time Collaboration
- Live updates across all session participants
- Online user tracking
- Event broadcasting system
- Long-polling for real-time communication

### Hex Maps
- Full-featured hex map editor
- Terrain tiles, markers, and fog of war
- Player movement and visibility
- Campaign map management

### Forum System
- Community discussion platform
- Categories, threads, and posts
- Advanced moderation tools
- Search functionality
- Edit history tracking
- Thread subscriptions
- Private forums for moderators

---

## 🔒 Security Features

- **CSRF Protection**: All state-changing operations require CSRF tokens
- **SQL Injection Prevention**: Prepared statements for all database queries
- **XSS Prevention**: Output escaping on all user-generated content
- **Input Validation**: Server-side validation of all client data
- **Secure Sessions**: Token-based authentication
- **HTTPS Required**: All traffic encrypted

---

## 🛠️ Development

### Development Environment
- **Location**: Network drive on webserver (`m:\rpg\BECMI VTT\`)
- **Stylus Compilation**: Prepros handles Stylus → CSS compilation
- **Database Access**: MySQL MCP tools available
- **Browser Testing**: Built-in Chrome browser tools

### Code Standards
- **JavaScript**: ES6+ modules, JSDoc comments
- **PHP**: PSR-12 style, PHPDoc comments
- **Database**: Prepared statements, proper indexing
- **Security**: Input validation, output escaping, CSRF protection

### Testing
- Manual browser testing recommended
- Check browser console for errors
- Test all API endpoints
- Verify real-time updates with multiple browser windows

---

## 📊 Performance

**Expected Performance:**
- Page load: < 2 seconds
- API response: < 500ms
- Real-time latency: < 5 seconds
- Concurrent users: 20-50 supported
- Database: Efficient with proper indexes

---

## 🐛 Known Issues & Future Enhancements

### Minor Polish (4% remaining)
- Additional loading skeletons
- In-app help system
- Enhanced accessibility (ARIA labels, keyboard navigation)
- Mobile optimization improvements

### Future Enhancements
- Chat system for sessions
- Virtual dice roller with animations
- Enhanced battle map tools
- Character portrait uploads
- WebRTC-based video conferencing (alternative to Google Meet)

See [ISSUES.md](ISSUES.md) for detailed issue tracking.

---

## 📝 License

This project is **open source** with hosting restrictions. See [LICENSE](LICENSE) for full details.

### Summary:
- ✅ **Allowed**: View, study, modify, contribute, fork for development
- ✅ **Contributors**: Will be credited in the Credits page
- ❌ **Restricted**: Hosting/deployment without explicit permission
- ❌ **Restricted**: Commercial use of hosted instances

**For hosting permissions or questions**, please contact the project maintainer through GitHub Issues.

---

## 👥 Support & Contributing

### Getting Help
- Check the documentation in `/docs/`
- Review error logs and browser console
- Check [ISSUES.md](ISSUES.md) for known issues
- Open an issue on GitHub for bugs or questions

### Contributing
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Contributors will be credited** in [CREDITS.md](CREDITS.md).

**Note**: This project is open source, but hosting is restricted. See [LICENSE](LICENSE) for details.

---

**Last Updated**: January 2026  
**Version**: 2.1.0-beta  
**Status**: Production-Ready 🚀

---

## 🆕 Recent Updates (January 2026)

### Google Meet Integration
- Added `meet_link` field to sessions table (Migration 021)
- Session creation form now includes video conference link field
- "Join Video Call" button appears in session details and DM dashboard
- Link generation helper opens Google Meet in new tab
- Full integration with session management system

### UI Improvements
- Refactored CSS to modular Stylus architecture
- Improved form readability and contrast
- Enhanced session creation form styling
- Better input field visibility and accessibility

### Code Quality
- Improved error handling in session creation API
- Enhanced database migration system
- Better logging for debugging
- **Security improvements** ⭐ NEW (January 2026)
  - Database credentials and API keys moved to environment variables
  - Type declarations added to Database class
  - Constants system implemented for magic numbers
  - Centralized utility functions (escapeHtml)
  - All SELECT * queries replaced with explicit columns
  - Transaction error handling improved
  - Explicit column lists in critical queries (reduced SELECT * usage)
  - Dynamic query building secured with proper escaping (backticks)
  - Code comments added for magic numbers (constants to be implemented)

### Email Queue System
- Added `email_queue` table (Migration 022)
- EmailQueueService for queueing emails
- Background processor (`process-email-queue.php`)
- Priority support (low, normal, high, urgent)
- Scheduled sending support
- Automatic retry mechanism
- Queue statistics API endpoint
- Cleanup script for old emails

### Forum System ⭐ NEW
- Complete forum system with categories, threads, and posts
- Advanced moderation tools (ban users, moderation queue, category management)
- Edit history tracking for all post edits
- Search functionality across threads and posts
- Thread subscriptions for notifications
- Private categories and threads (moderator-only)
- User profile editing (username, email, name)
- BBforums-inspired wood/parchment theme integration
- Full CRUD API endpoints (25+ endpoints)
- Frontend modules: forum.js, forum-thread.js, forum-moderation.js
- Complete documentation in `docs/FORUM_SYSTEM.md`

### Audio System ⭐ NEW (January 2026)
- Complete audio management system with upload support
- Playlist creation and management for different moods and scenes
- Soundboard integration for instant audio cues during sessions
- Full audio control (play, pause, volume) during sessions
- Background music support for immersive gameplay
- Audio file management (upload, delete, list)
- Frontend module: audio-manager.js
- Complete API endpoints (8+ endpoints)

### Campaign Management System ⭐ NEW (January 2026)
- Campaign CRUD operations (create, update, delete, list, get)
- Advanced game time tracking system (days, weeks, months, years)
- Time-based effects system for spells and abilities with automatic expiration
- Campaign-specific session organization
- Game time advancement API with validation
- Frontend module: campaign-management.js
- Complete API endpoints (8+ endpoints)
- Database migrations: 024, 025, 026, 027

### Monster System ⭐ NEW (January 2026)
- Monster database with comprehensive stats and image support
- Monster instance creation for combat encounters
- HP tracking for monster instances directly in initiative tracker
- Integration with hex map tokens for visual representation
- Monster browser UI for easy selection and management
- Frontend module: monster-browser.js
- Complete API endpoints (7+ endpoints)
- Database migrations: 030, 031, 032, 033, 034
