# GEMINI.md

Use `AGENTS.md` as the canonical instruction file for this repository.

## Read Order

1. `AGENTS.md`
2. `memory.md`
3. `docs/AI_AGENTS.md`

## Repo-Specific Rules

- Confirm the real feature flow before changing code:
  `public/js/modules|core -> public/js/core/api-client.js -> api/... -> app/core|services -> database/schema.sql|database/migrations`
- If the task touches BECMI rules or calculations, inspect both `app/services/becmi-rules.php` and `public/js/becmi/`.
- If the task touches styling, edit `public/stylus/*.styl` and use the existing Stylus compilation guidance.
- Do not invent npm, Composer, or localhost-only workflows.
- For deeper context, use `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`, and `docs/INSTALLATION.md`.

