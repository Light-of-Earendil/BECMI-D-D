# MEMORY.md

## Formaal

Dette er kurateret langtidshukommelse for Codex-arbejde i `M:\rpg\BECMI VTT`. Filen er repo-committable efter brugerbeslutning 2026-05-29 og maa derfor kun indeholde projektfakta, beslutninger og workflow-regler, der kan deles i repoet.

## Privacy og scope

- Ingen live credentials, tokens, passwords, private keys, session cookies, kundedata eller foelsomme personoplysninger.
- Lokale filer som `.env` og `.cursor/` behandles som adgangskonfig og maa ikke citeres i memory.
- Usikre oplysninger markeres som `Ikke bekraeftet endnu` med naeste verificerbare skridt.
- `AGENTS.md` er den primaere kontrakt, naar denne fil overlapper med andre instruktioner.

## Stable project facts

- Frontend app shell lives in `public/index.html` and `public/index.php`.
- Frontend bootstrap starts in `public/js/main.js`.
- Core frontend infrastructure lives in `public/js/core/`.
- Feature modules live in `public/js/modules/`.
- The API client auto-prefixes endpoints with `/api` in `public/js/core/api-client.js`.
- BECMI rules logic exists in both `app/services/becmi-rules.php` and `public/js/becmi/`.
- Backend endpoints live under `api/`, with shared backend helpers in `app/core/` and `app/services/`.
- Database truth lives in `database/schema.sql` and `database/migrations/`.
- Stylus sources live in `public/stylus/`, and compiled CSS is written to `public/css/main.css`.
- No verified `package.json` or `composer.json` exists in the repo root.
- `config/together-ai.php` reads the `TOGETHER_AI_API_KEY` env key.
- Frontend debug gating is in `public/js/main.js` via `?debug=1` or `localStorage.setItem('becmi_debug', '1')`.

## Investigation order

1. Confirm the exact feature flow:
   `public/js/modules|core -> public/js/core/api-client.js -> api/... -> app/core|services -> database/schema.sql|database/migrations`
2. Load only task-relevant docs:
   - `docs/ARCHITECTURE.md`
   - `docs/API.md`
   - `docs/DATABASE.md`
   - `docs/INSTALLATION.md`
3. For BECMI rules, progression, calculations or automation, compare server and client rule logic before proposing changes.
4. For styling, work from `public/stylus/*.styl` and use documented Stylus compilation guidance.
5. For database work, inspect `database/schema.sql` and current files in `database/migrations/` before selecting a migration approach.

## Decisions

- 2026-05-29: Agent harness target is Codex-only. Existing Claude, Gemini, Copilot and Cursor wrappers are outside this implementation scope.
- 2026-05-29: Harness files are repo-committable, so `USER.md`, `SOUL.md`, `MEMORY.md` and daily memory contain only project-safe context.
- 2026-05-29: Existing local `.cursor` secrets are out of scope for this harness task and are not copied, quoted or modified.

## Lessons learned

- The stock harness validator scans all Markdown under the root. In this repo, full-root validation is blocked by `docs/rules/rules_cyclopedia.md` being UTF-16LE and by broad rulebook/docs wording. Use harness-scope validation for this harness unless the validator gains exclude support.
- On Windows, case-only filename changes need a two-step rename. `memory.md` was normalized to `MEMORY.md` for the canonical harness name.

## Maintenance

Sidst gennemgaaet: 2026-05-29

Naeste gennemgang:
- Fjern foraeldet projektkontekst.
- Promover varige beslutninger fra `memory/YYYY-MM-DD.md`.
- Kontroller at harness-filer stadig er secret-free og repo-egnede.
