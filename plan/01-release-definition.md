# 01 Release Definition

## Goal

Turn the project into a clearly defined `1.0` product with a recommended release model, an explicit scope boundary, and a hard release gate.

## Current signal

- [public/index.php:6-18](m:/rpg/BECMI%20VTT/public/index.php#L6) - the shell still presents the app as "`BECMI D&D Character & Session Manager`" and "`Loading BECMI Manager...`"
- [public/index.php:28-29](m:/rpg/BECMI%20VTT/public/index.php#L28) - the header brand still says "`BECMI Manager`"
- [public/index.php:71-73](m:/rpg/BECMI%20VTT/public/index.php#L71) - the dashboard welcome copy still says "`Welcome to your BECMI Manager`"
- [README.md:6-7](m:/rpg/BECMI%20VTT/README.md#L6) - the repo currently declares "`Production-Ready (96% Complete)`" and "`Version: 2.1.0-beta`"
- [README.md:259-335](m:/rpg/BECMI%20VTT/README.md#L259) - multiple major systems are already marked "`100% Complete`"
- [ISSUES.md:519-533](m:/rpg/BECMI%20VTT/ISSUES.md#L519) - the status board also presents the platform as "`Production-Ready`"
- [docs/ARCHITECTURE.md:297-298](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L297) - testing is still documented as "`Manual testing checklist for UI flows`"
- [docs/ARCHITECTURE.md:351-351](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L351) - performance monitoring is still listed as future work

## Recommended default for 1.0

- Product name: `BECMI VTT`
- Product promise: run a real BECMI campaign online using Rules Cyclopedia as the primary rules source and optional rules as explicit campaign configuration
- Monster content baseline: Rules Cyclopedia plus DMR2-tagged expansion content
- Release model: `closed public beta` followed by `1.0` when the release gates below are green
- Support model: `pilot group support`
- Target table size: `4-6 players plus 1 DM`

## 1.0 is in scope

- Account creation, login, logout, and authenticated session access
- Character creation, progression, and character sheet play flow
- Session creation, invite, join, and shared session play
- BECMI rules calculations that are exposed in UI or API
- Optional-rules configuration when the rules are implemented and verified
- Core DM tools needed to run a session:
  - encounters
  - initiative
  - maps
  - monsters
  - audio
- Basic onboarding so a new user can get from account to active session without external help
- Release operations:
  - backup and rollback checklist
  - known-issues list
  - smoke-test gate

## 1.0 is out of scope

- WebSocket migration
- PWA or offline support
- plugin or extension ecosystem
- public content marketplace
- broad homebrew rules editor
- advanced AI-assisted DM tooling
- any automation that is not verified against Rules Cyclopedia or an explicitly approved source

## Later, not now

- full chat system expansion
- richer fog-of-war and advanced visibility modes
- campaign journals, recaps, and shared notes beyond the minimum needed for play
- content-pack import pipeline beyond Rules Cyclopedia and DMR2
- mobile-first redesign
- large-table optimization for `6-8+` players

## P0 release decisions to lock

- Confirm the public product name used in UI, docs, release notes, and screenshots
- Confirm that `1.0` means:
  - stable online campaign play
  - BECMI rules trustworthiness
  - explicit optional-rules handling
  - enough DM tooling to run a full session without external spreadsheets
- Confirm the first supported deployment story:
  - self-hosted private install
  - managed pilot hosting
  - both
- Confirm the first public audience:
  - existing group pilots only
  - invite beta
  - open sign-up

## P1 product framing work

- Replace "`Manager`" language with "`VTT`" language across shell, onboarding, docs, and release notes
- Create one short product pitch for each audience:
  - players
  - DMs
  - campaign organizers
- Make the official positioning consistent everywhere:
  - BECMI-first
  - Rules Cyclopedia grounded
  - optional-rules aware
  - old-school campaign support
  - DMR2 monster expansion path

## P1 release gates

- No known P0 bugs in:
  - auth
  - session join
  - maps
  - combat
  - level-up
- No exposed rules calculation disagrees between server and client
- No sensitive production logs remain in active code paths
- A pilot campaign can run for 3 sessions without manual DB repair
- A first-time user can:
  - create an account
  - create a character
  - join a session
  - complete a basic combat round
- Release notes, known issues, rollback steps, and smoke-test instructions exist in the repo

## Release artifacts to produce

- `1.0` scope statement with `in`, `out`, and `later`
- release candidate checklist
- known issues template
- support triage template
- migration, backup, and rollback checklist
- pilot feedback template

## Definition of done

- A `1.0` scope document exists and is specific enough to reject out-of-scope work
- The release model and support model are explicitly chosen
- UI copy reflects the actual product identity instead of "`Manager`"
- The team can point to a release candidate checklist and say exactly what is missing
- The next plan files can be judged against this scope without reopening product-definition debates
