# PLAN.md

## Goal og status

Aktuelt goal: Vedligehold et Codex-fokuseret agent file-harness for BECMI VTT, saa fremtidige Codex-opgaver starter med verificeret repo-kontekst, klare succeskriterier, tool-regler, memory-regler og rollback-principper.

Status: Aktiv.

Success criteria:
- `AGENTS.md`, `PLAN.md`, `MEMORY.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md` og mindst en `memory/YYYY-MM-DD.md` findes.
- Codex-skillen i `skills/becmi-vtt-project-context/` peger paa Codex read order.
- Harness-scope validator-korsel passer uden manglende required eller recommended filer.
- Secret-scan paa harness-filer finder ingen live credentials.

## Scope og ikke-maal

Scope:
- Markdown-instruktioner, repo-memory, tool policy og lokal Codex-skill.
- Verificerede BECMI VTT repo-fakta fra eksisterende filer.
- Konkrete test- og rollbackprocedurer for agentarbejde.

Ikke-maal:
- Ingen appkode, schema, migration, CSS, assets, deploy eller produktionstilstand.
- Ingen Claude/Gemini/Copilot wrapper-synk i denne plan.
- Ingen aendring af lokal `.cursor`-config eller `.env`.

## Kendt og ukendt

Kendt:
- Repoet bruger PHP backend under `api/`, delt PHP-logik under `app/core/` og `app/services/`, frontend under `public/`, Stylus under `public/stylus/` og databasefiler under `database/`.
- `public/js/core/api-client.js` er frontendens API-klient og prefixer `/api`.
- BECMI-regler findes baade i `app/services/becmi-rules.php` og `public/js/becmi/`.
- `public/stylus/README.md` og `public/stylus/compile.bat` dokumenterer Stylus compilation.

Ukendt:
- Full-root validator PASS er `Ikke bekraeftet endnu`, fordi stock-validatoren scanner hele repoets Markdown og ikke haandterer den eksisterende UTF-16LE rulebook-fil. Naeste verificerbare skridt er at give validatoren exclude-support eller konvertere den specifikke regelbogsfil i en separat opgave.

## Beslutninger

- 2026-05-29: Harnesset er Codex-only.
- 2026-05-29: Alle harness-filer er repo-committable og maa derfor ikke indeholde private brugerdata eller live credentials.
- 2026-05-29: `.cursor`-hemmeligheder ignoreres lokalt og indgaar ikke i denne opgave.

## Implementeringsplan

- Hold `AGENTS.md` som kort, kanonisk agentkontrakt.
- Hold `MEMORY.md` som kurateret langtidshukommelse.
- Brug `memory/YYYY-MM-DD.md` til raa daglig log og kandidater til langtidshukommelse.
- Brug `TOOLS.md` til verificerede kommandoer, trust zones og validatorbegransninger.
- Brug `SOUL.md` og `USER.md` til repo-egnet rolle og brugerpræferencer uden private data.
- Brug `skills/becmi-vtt-project-context/` som Codex-skill-entrypoint.

## Test og verifikation

Kommandoer/procedurer:
- `rg --files | rg "^(AGENTS|PLAN|MEMORY|SOUL|USER|TOOLS|HEARTBEAT)\\.md$|^memory/2026-05-29\\.md$|^skills/becmi-vtt-project-context/"`
- Secret-scan kun paa harness-filer.
- Harness-scope validator via temp-kopi som dokumenteret i `TOOLS.md`.
- Scoped status/diff paa de aftalte harness paths.

Forventet output:
- Alle harness-filer vises i filtesten.
- Secret-scan giver ingen live credential hits.
- Harness-scope validator viser `Resultat: PASS`.
- Regressionstjek viser kun aftalte harness paths.

## Rollback

- Brug diffen for de konkrete harness-filer som rollbackgrundlag.
- For nye filer: fjern kun de navngivne harness-filer efter path-verifikation.
- For `MEMORY.md`: hvis case-normaliseringen skal fortrydes, brug en to-trins rename og bevar filindholdet.
