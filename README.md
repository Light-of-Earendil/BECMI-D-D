# BECMI D&D Character and Session Management System

A comprehensive web-based management system for the Basic, Expert, Companion, Master, and Immortal (BECMI) ruleset of Dungeons & Dragons.

## Project Overview

This system provides:
- **Player Tools**: Character creation wizard, interactive character sheets with automated calculations
- **DM Tools**: Session management, player character viewing, scheduling with automated reminders
- **Rule Automation**: THAC0, encumbrance, saving throws, and all BECMI optional rules

## Architecture

- **Frontend**: jQuery 3.x Single-Page Application (SPA)
- **Backend**: Vanilla PHP 8.x data providers (stateless API endpoints)
- **Database**: MySQL/MariaDB
- **Environment**: XAMPP on Windows

## Directory Structure

```
/public/                 # Web server root
    index.html           # Main SPA shell
    /js/                 # JavaScript modules
    /css/                # Compiled CSS
/api/                    # PHP API endpoints
    /auth/              # Authentication
    /character/          # Character management
    /session/            # Session management
/app/                    # Application logic
    /core/              # Database connection, security
    /services/           # Business logic classes
/database/              # SQL schema and migrations
/docs/                  # Documentation
```

## Installation

1. Place project in `C:\xampp\htdocs\becmi-vtt\`
2. Configure virtual host pointing to `/public` directory
3. Import database schema from `/database/schema.sql`
4. Configure email settings for reminders

## Development Status

- [x] Project structure and documentation
- [ ] Database schema implementation
- [ ] PHP API endpoints
- [ ] jQuery SPA foundation
- [ ] Character sheet module
- [ ] Session management
- [ ] Testing and validation

## BECMI Rules Implementation

The system implements all core BECMI rules including:
- THAC0 calculations with Strength/Dexterity bonuses
- Encumbrance (Load) system with Strength adjustments
- Saving throws with optional rule modifications
- All 10 specified optional rules modules
- Weapon mastery progression
- General skills system

## Security Features

- CSRF token protection on all state-changing operations
- Server-side validation of all client data
- Secure session management
- Input sanitization and SQL injection prevention
