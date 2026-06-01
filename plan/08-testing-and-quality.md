# 08 Testing And Quality

## Goal

Create a real release gate so we stop guessing whether a change is safe.

## Current signal

- [tests/api-test.php:12-38](m:/rpg/BECMI%20VTT/tests/api-test.php#L12) - there is only one broad custom PHP test harness
- [tests/api-test.php:81-85](m:/rpg/BECMI%20VTT/tests/api-test.php#L81) - the current THAC0 test still expects older output fields that no longer match the live contract
- [docs/ARCHITECTURE.md:297-300](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L297) - testing guidance is still mostly manual

## Recommended test contract

- A release candidate should not be judged by intuition or ad-hoc clicking
- `1.0` needs three layers:
  - rules fixtures
  - API smoke tests
  - a short browser workflow smoke pass
- Manual pilot sessions still matter, but they should sit on top of automated checks instead of replacing them

## P0 testing work

- Fix stale tests so they match current API output
- Create a small release smoke suite for:
  - auth
  - character create/get/update
  - session create/list/update
  - map list/get/upload
  - initiative get/roll/advance
  - monster list/create-instance
  - audio list/playlists
- Build a rules fixture suite:
  - THAC0
  - saves
  - movement
  - spell progression
  - weapon mastery
- Add regression cases for optional rules profiles

## P1 UI and workflow testing

- browser smoke tests for:
  - login
  - create character
  - open session
  - use map
  - run initiative
- mobile viewport checks
- accessibility checks for major forms and navigation
- manual pilot checklist for real table sessions

## P1 quality process

- release checklist
- bug severity definitions
- issue templates
- acceptance criteria template for backlog items
- migration verification checklist

## P2 tooling

- fixture seed scripts
- synthetic sample campaign
- test data reset scripts
- debug harness for rules comparison

## Release gate for this track

- Every release candidate passes a documented smoke suite
- Any exposed rules change requires fixture updates or an explicit fixture review
- The team can run the same test flow before pilot sessions and before release candidates
- Migration-sensitive changes have a verification checklist and a rollback note

## Definition of done

- Every release candidate passes the smoke suite
- Rules changes require updated fixtures
- The team has a repeatable pilot and rollback process
- Test failures point to a concrete layer: rules, API, or browser workflow
