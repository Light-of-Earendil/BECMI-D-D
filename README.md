# BECMI D&D Virtual Tabletop (VTT)

A comprehensive web-based management system for the Basic, Expert, Companion, Master, and Immortal (BECMI) ruleset of Dungeons & Dragons.

**Live URL**: https://becmi.snilld-api.dk/  
**Status**: Production-Ready (96% Complete)  
**Version**: 2.1.0-beta  
**Last Updated**: January 2026

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

### For Dungeon Masters:
- **Session Management**: Create, schedule, and manage game sessions
- **Player Management**: Invite players, view all character sheets, track online status
- **Combat Tools**: Initiative tracker with BECMI 1d6 system
- **XP Management**: Award experience points to individual players or entire party
- **Item Distribution**: Give items (including magical items) to players
- **Hex Map Editor**: Create and manage hex-based campaign maps with markers, tiles, and fog of war
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
│   │   ├── core/            # Core application (app, api-client, state-manager, event-bus)
│   │   ├── modules/         # Feature modules (character, session, dm-dashboard, etc.)
│   │   └── utils/           # Utility functions
│   ├── css/                  # Compiled CSS (from Stylus)
│   ├── stylus/               # Stylus source files (modular architecture)
│   │   ├── main.styl        # Main entry point
│   │   ├── _variables.styl  # Design tokens
│   │   ├── _mixins.styl     # Reusable mixins
│   │   ├── _components.styl # UI components
│   │   └── _features.styl   # Feature-specific styles
│   └── images/               # Static images and equipment assets
│
├── api/                       # PHP API endpoints (40+ endpoints)
│   ├── auth/                # Authentication (login, register, password reset)
│   ├── character/           # Character CRUD, HP, XP, level-up, skills, weapon mastery
│   ├── session/             # Session management, invitations, DM dashboard
│   ├── combat/              # Initiative tracking
│   ├── spells/              # Spell management (list, memorize, cast, rest)
│   ├── inventory/           # Equipment management (add, remove, equip, identify)
│   ├── items/               # Item catalog (list, categories, magical variants)
│   ├── hex-maps/            # Hex map CRUD, tiles, markers, fog of war
│   ├── realtime/            # Long-polling endpoint
│   ├── skills/              # General skills system
│   └── user/                # User preferences, search
│
├── app/                      # Application logic
│   ├── core/                # Database connection, security utilities
│   └── services/            # Business logic classes
│       ├── becmi-rules.php  # BECMI rules engine
│       ├── event-broadcaster.php  # Real-time event broadcasting
│       ├── email-service.php      # Email notifications
│       └── portrait-manager.php   # Character portrait generation
│
├── config/                   # Configuration files
│   ├── database.php         # Database connection settings
│   └── together-ai.php      # AI service configuration
│
├── database/                  # Database schema and migrations
│   ├── schema.sql           # Base schema
│   └── migrations/          # Migration files (021+ migrations)
│       └── 021_add_meet_link_to_sessions.sql  # Video conferencing support
│
├── cron/                     # Scheduled tasks
│   └── send-session-reminders.php  # Email reminder cron job
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
   - Update `config/database.php` with database credentials
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
   ```

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

### Hex Maps System (100% Complete)
- ✅ Hex map editor (create, edit, delete)
- ✅ Tile system (terrain types)
- ✅ Marker system (points of interest)
- ✅ Fog of war (reveal/hide hexes)
- ✅ Player movement tracking
- ✅ Map borders, roads, paths, rivers
- ✅ Configurable hex scale

### Video Conferencing (100% Complete)
- ✅ Google Meet link integration
- ✅ Session creation with video links
- ✅ "Join Video Call" button in session views
- ✅ DM dashboard video call access
- ✅ Link generation helper

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

---

## 📚 Documentation

- **[Installation Guide](docs/INSTALLATION.md)** - Detailed setup instructions
- **[Character Creation System](docs/CHARACTER_CREATION_SYSTEM.md)** - Character creation process
- **[Hex Maps System](docs/HEX_MAPS_SYSTEM.md)** - Hex map editor documentation
- **[Function Documentation](docs/FUNCTION_DOCUMENTATION.md)** - Complete API and function reference
- **[Implementation Status](FINAL_IMPLEMENTATION_STATUS.md)** - Detailed feature status

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
- Monster database and combat tracking
- Virtual dice roller with animations
- Enhanced battle map tools
- Character portrait uploads
- WebRTC-based video conferencing (alternative to Google Meet)

See [FEJL_OG_MANGLER.md](FEJL_OG_MANGLER.md) for detailed issue tracking.

---

## 📝 License

This project is proprietary software developed for BECMI D&D campaigns.

---

## 👥 Support

For issues, questions, or contributions:
1. Check the documentation in `/docs/`
2. Review error logs and browser console
3. Check [FEJL_OG_MANGLER.md](FEJL_OG_MANGLER.md) for known issues

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
