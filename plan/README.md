# BECMI VTT Plan Folder

This folder is the working backlog for getting the platform ready for release.

The plan assumes:
- BECMI rules are validated against `docs/rules/RulesCyclopedia-Basic.pdf`
- extra monster content can be sourced from `docs/rules/DMR2_Creature_Catalog_(Basic).pdf`
- we want a real VTT release, not just a "manager"

## How to use this folder

Work top-down unless a dependency forces a different order.

1. `01-release-definition.md`
2. `02-rules-and-automation.md`
3. `03-platform-hardening.md`
4. `08-testing-and-quality.md`
5. `04-player-experience.md`
6. `05-dm-experience.md`
7. `06-maps-combat-and-audio.md`
8. `07-monsters-and-content.md`
9. `09-performance-and-observability.md`
10. `10-go-live-and-post-launch.md`
11. `11-future-expansion.md`

## Priority scale

- `P0`: blocks release or creates trust risk
- `P1`: should be in 1.0
- `P2`: strong 1.1 candidate
- `P3`: nice-to-have or experimental

## Why this backlog exists

The current repo signals "almost done", but the platform still needs release work:

- [README.md:16-47](m:/rpg/BECMI%20VTT/README.md#L16) - broad product promise, including "`Character Creation`", "`Real-Time Updates`", "`Combat Tools`", "`Hex Map Editor`", and "`Audio System`"
- [README.md:259-342](m:/rpg/BECMI%20VTT/README.md#L259) - several systems are marked "`100% Complete`"
- [ISSUES.md:43-47](m:/rpg/BECMI%20VTT/ISSUES.md#L43) - current backlog only calls out "`Additional loading skeletons`", "`In-app help system`", "`Enhanced accessibility`", and "`Mobile optimization improvements`"
- [docs/ARCHITECTURE.md:270-277](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L270) - "`Caching`" is still "`Not implemented`"
- [docs/ARCHITECTURE.md:349-357](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L349) - automated testing, performance monitoring, caching strategy, and WebSocket/PWA work are still planned, not closed

## First recommended slice

If we want the fastest path to a release candidate, start here:

1. Define what `1.0` means
2. Close rules parity gaps
3. Harden auth, realtime, and logging
4. Build a real smoke test gate
5. Improve onboarding, dice, and DM combat flow

## Candidate work order for the first 10 tasks

1. Create the `1.0` release definition and scope freeze
2. Build a Rules Cyclopedia rules matrix
3. Unify server and client rule calculations
4. Fix stale tests and add smoke tests
5. Remove sensitive logging and tighten auth flow
6. Stabilize realtime polling and event indexing
7. Add a built-in dice roller with public, private, and GM rolls
8. Improve first-session onboarding and in-app help
9. Improve DM initiative, conditions, and encounter workflow
10. Build a DMR2 monster ingestion and tagging plan
