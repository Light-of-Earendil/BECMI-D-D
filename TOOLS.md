# TOOLS.md

## Formaal

Dette dokument beskriver verificerede, sikre tool- og kommandomonstre for Codex-arbejde i BECMI VTT-repoet.

## Trust zones

| Zone | Eksempler | Brug |
| --- | --- | --- |
| Lokal read-only | `rg`, `Get-Content`, `git diff`, statisk filinspektion | Standard startpunkt |
| Lokal mutating | `apply_patch`, path-afgraensede renames, formatters, codegen | Kun naar maal og filer er klare |
| Ekstern read-only | Web/docs/GitHub read | Kun ved aktuelle eller ubekraeftede fakta |
| Ekstern mutating | PR, deploy, email, database write, public posts | Kraever eksplicit scope og accept |
| Produktion | Live site, live DB, brugerdata, availability | Kraever saerlig varsomhed og tydelig verifikation |

## Verificerede lokale kommandoer

- Soeg filer: `rg --files`
- Soeg tekst: `rg -n "<pattern>" <path>`
- Scoped git diff: `git diff -- <path>`
- Scoped tracked-file check: `git ls-files -- <path>`
- Stylus compile workflow: `public/stylus/compile.bat`
- Stylus CLI workflow: `cd public/stylus` efterfulgt af `stylus main.styl -o ../css/main.css`

## Harness filtest

```powershell
rg --files | rg "^(AGENTS|PLAN|MEMORY|SOUL|USER|TOOLS|HEARTBEAT)\.md$|^memory/2026-05-29\.md$|^skills/becmi-vtt-project-context/"
```

Forventet output: Alle harness-filer og Codex-skill-filer vises.

## Harness-scope validator

Stock-validatoren scanner hele repoets Markdown og er ikke egnet som full-root gate i dette repo uden exclude-support. Brug denne harness-scope procedure:

```powershell
$root = (Resolve-Path -LiteralPath '.').Path
$tmp = Join-Path $env:TEMP ("becmi-vtt-harness-validation-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tmp | Out-Null
foreach ($file in @('AGENTS.md','PLAN.md','MEMORY.md','SOUL.md','USER.md','TOOLS.md','HEARTBEAT.md')) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination $tmp
}
New-Item -ItemType Directory -Path (Join-Path $tmp 'memory') | Out-Null
Copy-Item -LiteralPath (Join-Path $root 'memory\2026-05-29.md') -Destination (Join-Path $tmp 'memory')
python 'C:\Users\info\.codex\skills\agent-harness-architect\scripts\validate_harness.py' --root $tmp --format markdown
```

Forventet output: `Resultat: PASS`.

## Secret-scan for harness-filer

```powershell
rg -n --hidden "(sk-(proj-)?[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH |DSA |)?PRIVATE KEY|(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*['\"]?[^<\s'\"]{8,})" AGENTS.md PLAN.md MEMORY.md SOUL.md USER.md TOOLS.md HEARTBEAT.md memory skills/becmi-vtt-project-context
```

Forventet output: Ingen live credential hits. Hvis kommandoen finder en placeholder eller tool-dokumentation, skal hittet vurderes og ikke automatisk ignoreres.

## Begransninger

- `docs/rules/rules_cyclopedia.md` er eksisterende UTF-16LE Markdown og blokerer stock-validatorens full-root scan.
- `.cursor/` og `.env` kan indeholde lokal adgangskonfig og skal ikke citeres i harness-filer.
- Der er ingen verificeret root `package.json` eller `composer.json`; opfind ikke npm- eller Composer-workflows.
