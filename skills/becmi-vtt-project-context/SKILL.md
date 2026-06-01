---
name: becmi-vtt-project-context
description: Use when working inside the BECMI VTT repository to load the Codex read order, verified architecture, investigation order, tool policy, memory rules, and repo-specific change constraints before editing code or documentation.
---

# BECMI VTT Project Context

Use this skill for Codex tasks in `M:\rpg\BECMI VTT` when an agent needs repo-specific context before making changes.

## Quick Start

1. Read `AGENTS.md`.
2. Read `PLAN.md`.
3. Read `MEMORY.md`.
4. Read `TOOLS.md`.
5. Read `SOUL.md` and `USER.md` only when role or user preference context is relevant.
6. Read `memory/YYYY-MM-DD.md` when an active daily log exists.

## Core Workflow

- Confirm the affected feature flow first:
  `public/js/modules|core -> public/js/core/api-client.js -> api/... -> app/core|services -> database/schema.sql|database/migrations`
- For BECMI rules, progression, or calculations, inspect both:
  - `app/services/becmi-rules.php`
  - `public/js/becmi/`
- For styling changes, edit `public/stylus/*.styl` first and use the existing Stylus compilation guidance in:
  - `public/stylus/README.md`
  - `public/stylus/compile.bat`
- Reuse existing helpers and service layers instead of inventing parallel abstractions.
- Do not invent npm or Composer workflows.
- Treat `.env` and `.cursor/` as local access config; do not quote or move their values into harness files.

## Read These Files As Needed

- `docs/ARCHITECTURE.md` for stack and data flow
- `docs/API.md` for endpoint behavior
- `docs/DATABASE.md` and `database/schema.sql` for schema verification
- `docs/INSTALLATION.md` for environment setup
- `public/stylus/README.md` and `public/stylus/compile.bat` for styling compilation
