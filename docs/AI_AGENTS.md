# AI Agents Guide

This repository already uses `AGENTS.md` as the canonical agent contract. This document adds a shared index for AI-specific entrypoints so Codex, Claude, Gemini, Copilot, and Cursor-based workflows start from the same verified project context.

## Canonical Read Order

1. `AGENTS.md`
2. `memory.md`
3. This file
4. `docs/ARCHITECTURE.md`
5. `docs/API.md`
6. `docs/DATABASE.md`
7. `docs/INSTALLATION.md`
8. `.cursor/rules/general-project-rules.mdc` when Cursor/browser/database assumptions matter

## Available Agent Entrypoints

- `AGENTS.md` - shared repo contract for agent work in this codebase
- `memory.md` - compact project memory for recurring AI sessions
- `CLAUDE.md` - Anthropic/Claude-facing wrapper around the shared rules
- `GEMINI.md` - Gemini-facing wrapper around the shared rules
- `.github/copilot-instructions.md` - GitHub Copilot instructions
- `.cursor/rules/general-project-rules.mdc` - existing Cursor-specific rules already present in the repo
- `skills/becmi-vtt-project-context/SKILL.md` - repo-local reusable skill scaffold

## Shared Workflow

- Confirm the affected feature flow before changing anything:
  `public/js/modules|core -> public/js/core/api-client.js -> api/... -> app/core|services -> database/schema.sql|database/migrations`
- For BECMI rules, progression, calculations, or automation, inspect both:
  - `app/services/becmi-rules.php`
  - `public/js/becmi/`
- For styling changes, edit `public/stylus/*.styl` first and only describe compilation via:
  - `public/stylus/compile.bat`
  - Stylus CLI documented in `public/stylus/README.md`
- Do not invent npm or Composer workflows for this repository.
- Confirm schema and migrations before proposing database changes.
- Reuse existing API, Security, and Database helpers instead of inventing parallel abstractions.

## Notes For Tooling

- Cursor already has project rules in `.cursor/rules/general-project-rules.mdc`.
- The repo also contains `.cursor/mcp.json` and `.cursor/plans/`, but those are not substitutes for the shared repo contract in `AGENTS.md`.
- The current image-generation integration in code uses `config/together-ai.php` and the `TOGETHER_AI_API_KEY` environment variable.

## Recommended First Reads By Task Type

- Architecture or debugging: `docs/ARCHITECTURE.md`
- Endpoint work: `docs/API.md`
- Database work: `docs/DATABASE.md` plus `database/schema.sql`
- Styling work: `public/stylus/README.md`
- Installation or environment questions: `docs/INSTALLATION.md`

