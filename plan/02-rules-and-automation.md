# 02 Rules And Automation

## Goal

Make the rules layer trustworthy, campaign-configurable, and anchored to Rules Cyclopedia plus optional rules.

## Current signal

- [app/services/becmi-rules.php:318-321](m:/rpg/BECMI%20VTT/app/services/becmi-rules.php#L318) - weapon mastery bonus is still a placeholder: "`return 0`"
- [app/services/becmi-rules.php:427-430](m:/rpg/BECMI%20VTT/app/services/becmi-rules.php#L427) - server weight calculation is still a placeholder: "`return 0`"
- [public/js/becmi/rules-engine.js:288-295](m:/rpg/BECMI%20VTT/public/js/becmi/rules-engine.js#L288) - client-side engine already calculates total inventory weight
- [tests/api-test.php:81-85](m:/rpg/BECMI%20VTT/tests/api-test.php#L81) - THAC0 test expectations still reference older output fields
- [database/schema.sql:180-189](m:/rpg/BECMI%20VTT/database/schema.sql#L180) - general skills exist in schema as "`Character skills (General Skills system)`"
- [public/js/modules/character-creation.js:1116-1168](m:/rpg/BECMI%20VTT/public/js/modules/character-creation.js#L1116) - character creation already includes "`STEP 9: Select General Skills`"
- [public/js/main.js:323-340](m:/rpg/BECMI%20VTT/public/js/main.js#L323) - skill rolls exist in UI, but the implementation currently adds an extra modifier before comparing to ability score
- [docs/rules/rules_cyclopedia.md:20492-20499](m:/rpg/BECMI%20VTT/docs/rules/rules_cyclopedia.md#L20492) - extracted Rules Cyclopedia text defines a skill roll as `1d20 <= ability score`, with `20` always failing

## Recommended rules authority

- Source priority for `1.0`:
  - Rules Cyclopedia core text
  - Rules Cyclopedia optional rules when explicitly enabled
  - DMR2 for extra monster content only
  - project-specific house rules only when they are named and scoped per campaign
- Recommended implementation direction:
  - server is authoritative for any exposed calculation that affects state, persistence, or multiplayer consistency
  - client may mirror the calculation for UX responsiveness, but must match the server fixture-for-fixture
  - no hidden rule variation by screen, module, or endpoint

## P0 rules work

- Build a Rules Cyclopedia rules matrix:
  - rule name
  - chapter/page reference
  - optional or core
  - server implementation status
  - client implementation status
  - verified or not verified
- Create a rules fixture pack that covers at least:
  - THAC0 by class and level bands
  - saving throws by class and level bands
  - encumbrance and movement thresholds
  - weapon mastery ranks
  - General Skills success and failure cases
- Decide campaign profiles:
  - strict Rules Cyclopedia core
  - Rules Cyclopedia core plus optional rules
  - custom house-rule profile
- Make one source of truth for exposed calculations:
  - THAC0
  - weapon mastery
  - encumbrance
  - movement
  - saving throws
  - spell progression
  - initiative
- Audit General Skills against Rules Cyclopedia:
  - skill slot acquisition
  - full skill list coverage
  - governing abilities
  - optional-rules gating
  - exact skill-roll behavior
  - hidden/DM-only rolls where the rules expect secrecy
- Replace stale rule tests with fixture-based assertions that match the current contract instead of older output fields
- Add source references to every disputed or non-obvious rule branch before calling it release-ready

## P1 rules features

- Optional rules toggles at campaign level
- Character sheet badges for enabled optional rules
- Rule explanations in UI for non-obvious values
- Audit trail for recalculated values
- Rule mismatch detector for client/server drift in debug mode

## P1 implementation artifacts

- A checked rules matrix document in the repo
- Shared fixtures for PHP and JavaScript rule tests
- A campaign rule-profile definition with explicit enabled and disabled rule sets
- A short developer note that states where rule changes must be made:
  - server
  - client mirror
  - tests
  - source reference

## P1 BECMI systems to review

- Weapon mastery attack and damage progression
- Encumbrance and movement
- General Skills, including skill-roll behavior and any current mismatch with Rules Cyclopedia
- morale and reaction handling
- pursuit and evasion
- overland movement and travel pacing
- retainers and followers
- domain and stronghold prep hooks
- class-specific edge cases
- spellcasting restrictions and memorization edge cases
- level caps, race/class interactions, and high-level progression

## P1 monster rules work

- Validate monster stats and special cases against Rules Cyclopedia
- Extend monster source tagging:
  - Rules Cyclopedia
  - DMR2
  - custom
- Flag uncertain monster data for manual review

## P2 automation improvements

- Condition engine for reusable effects
- time-based effect automation tied to campaign time
- encounter XP calculator
- treasure and morale helpers
- travel and watch helpers
- procedural DM reference cards

## Release gate for this track

- A named rule can be traced from source text to implementation to test fixture
- The same character data produces the same visible rule result in PHP and JavaScript
- Optional rules only change behavior when the campaign profile says they should
- No rule placeholder remains in a user-visible or API-visible calculation path

## Definition of done

- Every exposed rules calculation maps to a verified source
- Server and client give the same result for the same test fixtures
- General Skills and skill rolls match Rules Cyclopedia behavior exactly, including optional-rules handling
- Optional rules are explicitly configured, not implied
- Monster sources are tagged and traceable
- A future rule change can be made without guessing which layer is authoritative
