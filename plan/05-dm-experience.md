# 05 DM Experience

## Goal

Make prep, session control, combat, and follow-up much faster for the DM.

## Current signal

- [public/js/modules/session-management.js:4-4](m:/rpg/BECMI%20VTT/public/js/modules/session-management.js#L4) - the main session module already handles session management and DM dashboard functionality
- [public/js/modules/session-management.js:748-753](m:/rpg/BECMI%20VTT/public/js/modules/session-management.js#L748) - XP award actions are already wired into the session flow
- [public/js/modules/session-management.js:874-890](m:/rpg/BECMI%20VTT/public/js/modules/session-management.js#L874) - monster add and initiative controls already exist in the session screen
- [public/js/modules/session-management.js:2637-3044](m:/rpg/BECMI%20VTT/public/js/modules/session-management.js#L2637) - the DM dashboard and initiative tracker are already rendered inside the session module
- [public/js/modules/dm-dashboard.js:1272-1560](m:/rpg/BECMI%20VTT/public/js/modules/dm-dashboard.js#L1272) - a dedicated XP award modal already exists
- [README.md:232-233](m:/rpg/BECMI%20VTT/README.md#L232) - the repo already presents a `DM dashboard with real-time updates` and a `Combat initiative tracker`
- [README.md:257-262](m:/rpg/BECMI%20VTT/README.md#L257) - DM XP award and live XP updates are already part of the product promise

## Recommended DM operating model

- `1.0` DM flow should center on a single session control surface:
  - prep before the session
  - run combat and maps during the session
  - award XP and write notes after the session
- The DM should not need external spreadsheets for normal session operations

## P0 improvements

- Session prep dashboard:
  - players
  - invited players
  - linked characters
  - map list
  - audio presets
  - encounter list
- Better combat tracker:
  - easier add/remove
  - current turn clarity
  - round controls
  - dead/fled/disabled state handling
- Condition and effect tracking
- Better XP award flow:
  - per encounter
  - per character
  - party split
- DM-only notes per session
- Quicker session-state actions:
  - start session
  - pause session
  - close combat
  - advance time
  - surface unresolved invites or missing maps

## P1 encounter and campaign tools

- Encounter builder from monsters
- saved encounter groups
- encounter import to session map
- monster tactics or notes field
- quick treasure/loot notes
- campaign prep board
- session recap composer
- recurring NPC tracker

## P1 DM automation

- optional-rule controls per campaign
- batch monster HP initialization
- morale/reaction shortcuts
- time advancement shortcuts
- active effect expiration tied to campaign time
- map scene presets for fog, tokens, and audio

## P2 command-center features

- DM screen mode with:
  - current party status
  - next turn
  - rules shortcuts
  - campaign time
  - audio controls
- quick-reference cards from Rules Cyclopedia
- hidden rolls and secret checks
- audit history for important session changes

## P3 stretch ideas

- printable DM handout packs
- random table runner
- treasure generator
- wilderness travel console
- domain management starter tools

## Release gate for this track

- A DM can invite players, open the session, run initiative, place monsters, adjust HP, award XP, and end combat from the platform alone
- Session prep data is visible in one obvious place before play starts
- Combat state changes are fast enough that the tracker feels like a live tool, not a report screen
- After the session, the DM can leave notes and close the loop without improvising a separate workflow

## Definition of done

- A DM can prep, run, and close a session without jumping across too many disconnected screens
- Combat, map, monster, and XP actions feel like one workflow
- DM-only information stays accessible without leaking into the player view
