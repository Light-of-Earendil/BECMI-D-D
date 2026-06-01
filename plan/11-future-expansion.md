# 11 Future Expansion

## Goal

Capture high-value ideas without letting them distract from 1.0.

## Current signal

- [docs/ARCHITECTURE.md:350-357](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L350) - automated testing, performance monitoring, caching, WebSocket support, and PWA features are already identified as future work
- [README.md:450-457](m:/rpg/BECMI%20VTT/README.md#L450) - help, accessibility, dice, battle maps, and portraits are still listed as upcoming work
- [ISSUES.md:549-551](m:/rpg/BECMI%20VTT/ISSUES.md#L549) - accessibility and in-app help are still immediate backlog items, so not every attractive feature belongs in post-`1.0`

## Recommended expansion rule

- Nothing moves from this file into `1.0` unless a real release blocker or pilot failure proves it belongs there
- Promote future work based on:
  - repeated pilot demand
  - measured support cost
  - verified technical dependency
  - clear differentiation value for BECMI play
- Keep large technical bets isolated from live release work unless they unblock stability or trust

## P1.1 candidates

- session chat
- better dice roller with saved macros
- shared party journal
- loot distribution flow
- player notes pinned to sessions
- improved encounter builder

## P1.2 candidates

- richer condition and active effect engine
- compendium browser with packs
- map scene system
- handout reveals
- faction and rumor tools
- travel helper and wilderness procedures

## P2 larger bets

- WebSocket-based realtime
- PWA support
- offline-first character reference
- campaign export/import bundle
- reusable content packs
- print/PDF export

## P3 speculative ideas

- voice note support
- AI-assisted prep tools
- random table runner
- faction simulation
- domain management toolkit
- solo referee mode

## Keep out of 1.0 unless a real need appears

- full marketplace
- massive plugin system
- full 3D maps
- broad non-BECMI rules support
- social feed features

## Promotion rules

- `1.1` items should improve normal table play without reopening core architecture
- `1.2` items can deepen content and campaign tooling once `1.0` is stable
- `P2` large bets need a separate decision memo before implementation starts
- `P3` speculative ideas stay parked until they have a concrete user case

## Definition of done

- These ideas stay visible, but do not block release-critical work
- The roadmap after `1.0` has a place to grow without contaminating the release scope
