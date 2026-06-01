# 09 Performance And Observability

## Goal

Make the platform measurable, debuggable, and comfortable under real session load.

## Current signal

- [public/js/core/realtime-client.js:13-19](m:/rpg/BECMI%20VTT/public/js/core/realtime-client.js#L13) - realtime client uses a tight handoff loop with a 25 second long-poll timeout
- [api/realtime/poll.php:129-150](m:/rpg/BECMI%20VTT/api/realtime/poll.php#L129) - polling endpoint loops and refreshes user activity during the request
- [api/error-log.php:62-98](m:/rpg/BECMI%20VTT/api/error-log.php#L62) - client error persistence already exists and can be expanded
- [public/index.php:9-9](m:/rpg/BECMI%20VTT/public/index.php#L9) - CSS assets are cache-busted with `time()`, forcing a fresh asset URL on every request
- [public/index.php:328-361](m:/rpg/BECMI%20VTT/public/index.php#L328) - the JS shell also uses `time()` cache-busting on every script include
- [app/core/security.php:170-185](m:/rpg/BECMI%20VTT/app/core/security.php#L170) - gated backend debug logging already exists and should be reused for timing diagnostics
- [docs/ARCHITECTURE.md:272-272](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L272) - caching is still listed as future work
- [docs/ARCHITECTURE.md:299-299](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L299) - `EXPLAIN` is already part of the documented query verification path

## Recommended measurement stance

- Instrument before optimizing
- Prefer gated timing and query evidence over always-on noisy logs
- Measure a few user-visible flows repeatedly:
  - login
  - character sheet open
  - session open
  - map open
  - realtime update delivery
- `1.0` only needs enough observability to identify slow paths and regressions quickly; it does not need a full APM stack

## P0 performance work

- Profile hot queries with `EXPLAIN`
- Add or verify indexes for:
  - realtime events
  - session lists
  - character lookups
  - monster filters
  - map and audio lists
- Review polling write frequency and event fetch pattern
- Measure page load and main session load
- remove or gate noisy production console logging
- Review the current asset cache-busting strategy and replace `always fresh` behavior with a release-aware versioning approach

## P1 observability work

- request timing logs behind debug flags
- slow query logging for critical endpoints
- per-endpoint error counts
- client-side failure rate tracking
- upload failure tracking
- pilot session incident log

## P1 product targets

- cold page load target
- login target
- character sheet load target
- session open target
- map open target
- realtime sync target

## P2 architecture improvements

- cache stable reference data:
  - items
  - spells
  - skills
  - forum categories
- background processing for heavier tasks
- better asset versioning strategy than always using `time()`
- evaluate whether some long-poll flows should move to lighter incremental checks before a future WebSocket phase

## P3 stretch ideas

- admin diagnostics dashboard
- query heat map
- live session health board
- synthetic uptime checks

## Release gate for this track

- The main live-play flows have measured baseline timings
- Hot queries have been checked with `EXPLAIN` and obvious indexing gaps are closed
- Realtime behavior is understood with evidence, not anecdotes
- Performance diagnostics can be enabled when needed without flooding normal production logs

## Definition of done

- We can identify slow paths with evidence
- Release decisions can be based on measured numbers instead of guesses
- The team knows which performance problems are real `1.0` blockers and which are later-phase optimizations
