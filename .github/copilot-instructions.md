# GitHub Copilot Instructions

Treat `AGENTS.md` as the canonical repo contract and `memory.md` as the shared project memory.

## Start Here

1. Read `AGENTS.md`.
2. Read `memory.md`.
3. Use `docs/AI_AGENTS.md` for the shared AI documentation map.

## Required Repo Rules

- Confirm the actual feature flow before editing:
  `public/js/modules|core -> public/js/core/api-client.js -> api/... -> app/core|services -> database/schema.sql|database/migrations`
- For BECMI rules or calculation work, inspect both `app/services/becmi-rules.php` and `public/js/becmi/`.
- For styling work, edit `public/stylus/*.styl` and follow `public/stylus/README.md` or `public/stylus/compile.bat` for compilation guidance.
- Reuse existing `Security`, `Database`, and `APIClient` flows.
- Do not invent npm, Composer, or localhost-only workflows for this repository.

