# 04 Player Experience

## Goal

Make the first 30 minutes for a new player fast, understandable, and fun.

## Current signal

- [public/js/modules/character-creation.js:5-15](m:/rpg/BECMI%20VTT/public/js/modules/character-creation.js#L5) - character creation is already a multi-step guided flow with steps through review and creation
- [public/js/modules/character-creation.js:1116-1168](m:/rpg/BECMI%20VTT/public/js/modules/character-creation.js#L1116) - General Skills are already exposed during creation, including rules-reference copy
- [public/js/modules/character-sheet.js:498-498](m:/rpg/BECMI%20VTT/public/js/modules/character-sheet.js#L498) - the character sheet already has a visible `General Skills` section
- [public/js/modules/character-sheet.js:2459-2460](m:/rpg/BECMI%20VTT/public/js/modules/character-sheet.js#L2459) - players can already trigger skill rolls from the character sheet
- [ISSUES.md:45-46](m:/rpg/BECMI%20VTT/ISSUES.md#L45) - `In-app help system` and `Enhanced accessibility` are still open backlog items
- [ISSUES.md:444-444](m:/rpg/BECMI%20VTT/ISSUES.md#L444) - `Better mobile navigation` is already identified as needed
- [ISSUES.md:477-477](m:/rpg/BECMI%20VTT/ISSUES.md#L477) - a `Virtual dice roller with animations` is already on the idea list

## Recommended player promise

- A first-time player should be able to:
  - understand what the platform is
  - create or join a character
  - enter a session
  - make the first important rolls
  - survive the first combat round without needing external docs
- Mobile support for `1.0` should be good enough for in-session reference and lightweight play, not a full mobile-native redesign

## P0 improvements

- First-run onboarding flow:
  - what this platform is
  - how to create a character
  - how to join a session
  - where to find maps, dice, and session tools
- Character creation review step:
  - recap of class, stats, gear, and rules implications
- Better error messages inside forms
- Strong mobile layout for:
  - login
  - character list
  - character sheet
  - session view
- Built-in dice roller:
  - public rolls
  - GM/private rolls
  - simple formulas
  - roll history
- Better empty states and next-step guidance when:
  - a player has no character
  - a player is invited but not joined
  - a session has no active combat or map
- Accessibility baseline for:
  - keyboard navigation
  - labels and field help
  - modal focus handling
  - readable error messages

## P1 quality-of-life

- Quick character summary card for in-session play
- pinned spell list or prepared spell panel
- compact inventory mode
- quick equipment actions
- quick HP and conditions panel
- better notifications with context and click-through
- session recap view for players
- player journal or notes

## P1 onboarding and learnability

- in-app help panel
- contextual tooltips for rules-driven values
- "why is this number like this?" explanations
- glossary of BECMI terms
- campaign rules profile summary visible to players

## P2 social and retention features

- party roster view
- player handouts and journal sharing
- player-safe campaign map notes
- downtime planner
- session recap acknowledgements

## P3 stretch ideas

- character portrait upload and cropper
- printable quick sheet
- optional ambient UI themes
- keyboard shortcuts help overlay

## Release gate for this track

- A new player can complete account -> character -> session join -> first roll without leaving the app
- The main player flows work at desktop width and at a narrow mobile width
- Rules-driven numbers have enough explanation that players are not guessing what they mean
- Dice, HP, spells, inventory, and skill actions are reachable without hunting through unrelated views

## Definition of done

- A new player can understand the platform without external docs
- The most common player actions fit on desktop and mobile
- Core play actions are at most a few clicks away
- Players can answer "what do I do next?" from inside the interface
