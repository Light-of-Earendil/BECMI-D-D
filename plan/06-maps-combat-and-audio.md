# 06 Maps Combat And Audio

## Goal

Push the table feel closer to a real VTT session, especially for live play.

## Current signal

- [public/js/modules/session-map-scratchpad.js:4-4](m:/rpg/BECMI%20VTT/public/js/modules/session-map-scratchpad.js#L4) - the map module already provides multiplayer map drawing and token placement
- [public/js/modules/session-map-scratchpad.js:123-146](m:/rpg/BECMI%20VTT/public/js/modules/session-map-scratchpad.js#L123) - map load already pulls map data, drawings, and tokens for live play
- [public/js/modules/session-map-scratchpad.js:296-341](m:/rpg/BECMI%20VTT/public/js/modules/session-map-scratchpad.js#L296) - campaign library map import and scope messaging already exist
- [public/js/modules/session-map-scratchpad.js:1874-1929](m:/rpg/BECMI%20VTT/public/js/modules/session-map-scratchpad.js#L1874) - token add and move flows are already implemented
- [public/js/modules/session-management.js:947-1006](m:/rpg/BECMI%20VTT/public/js/modules/session-management.js#L947) - monster entries in initiative can already be placed as map tokens
- [public/js/modules/session-management.js:2778-2880](m:/rpg/BECMI%20VTT/public/js/modules/session-management.js#L2778) - shared audio controls, uploads, and soundboard UI already exist in the session view
- [README.md:276-288](m:/rpg/BECMI%20VTT/README.md#L276) - the repo already promises fog of war, player movement tracking, monster tokens, playlists, and soundboard support

## Recommended table-feel target

- `1.0` should feel like a fast 2D tabletop:
  - map visible
  - tokens usable
  - combat state obvious
  - audio supportive, not distracting
- Avoid heavy `1.0` scope creep such as advanced line-of-sight or cinematic systems unless normal live play still feels blocked without them

## P0 improvements

- Token UX polish:
  - easier placement
  - cleaner drag behavior
  - snap options
  - clearer ownership and selection
- Map layers:
  - base map
  - drawings
  - tokens
  - DM-only notes layer
- Better fog and reveal controls
- Distance and range helpers
- Ping or spotlight tool
- Audio scene presets per map or encounter
- Better active map switching cues so players know when the scene changed
- Clearer failure handling when map image, audio file, or realtime sync fails mid-session

## P1 combat-on-map features

- initiative-linked token highlighting
- next actor focus
- dead/unconscious token state
- monster group placement
- movement ruler
- turn-based movement markers
- template overlays for areas and cones
- token status icons

## P1 map content management

- campaign map library improvements
- source map lineage viewer
- import and duplicate flows
- thumbnail browser
- active map switching UX
- player-safe map handout mode

## P2 audio improvements

- volume groups
- fade in and fade out
- crossfade between tracks
- scene-linked ambiance
- hotkey soundboard
- recently used sounds

## P2 session immersion

- reveal handouts on trigger
- map-linked journal entries
- encounter-triggered audio
- dramatic pause and blackout controls

## P3 stretch ideas

- line-of-sight experiments
- shared fog modes
- animated weather overlays
- cinematic transitions between maps

## Release gate for this track

- A DM can open a map, place tokens, run a basic combat, and control audio without external tools
- Players can reliably see the active map state, token positions, and combat changes
- Audio state changes are understandable and do not create confusion about what is currently playing
- Map and combat actions stay responsive enough for live play

## Definition of done

- Maps, combat, and audio feel synchronized enough that the DM does not need external tools for normal sessions
- The map surface communicates state clearly to both DM and players
