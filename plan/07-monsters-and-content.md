# 07 Monsters And Content

## Goal

Turn the content layer into a real campaign asset, not just a list of records.

## Current signal

- [api/monsters/list.php:49-95](m:/rpg/BECMI%20VTT/api/monsters/list.php#L49) - monster listing already supports filtering by `monster_type` and `terrain` and returns full stat blocks
- [api/monsters/create-instance.php:86-190](m:/rpg/BECMI%20VTT/api/monsters/create-instance.php#L86) - monster instances are already created from monster templates for live sessions
- [README.md:300-302](m:/rpg/BECMI%20VTT/README.md#L300) - the repo already promises a `Monster database with stats and images` and monster instance combat support
- [README.md:576-581](m:/rpg/BECMI%20VTT/README.md#L576) - monster browsing and instance creation are already framed as part of the platform feature set
- Ikke bekraeftet endnu: explicit source tagging for `Rules Cyclopedia`, `DMR2`, or `custom` is not verified in the current monster schema or endpoints. Next verificerbare skridt er schema- og endpoint-audit foer importmodel eller admin-UI designes.

## Recommended content stance

- `1.0` content should be curated and source-traceable, not just bulk-imported
- Every monster used in prep or combat should have:
  - source tag
  - review status
  - usable combat data
  - enough metadata to be found quickly
- DMR2 should be treated as the first structured expansion source after Rules Cyclopedia

## P0 monster improvements

- Define source tags:
  - Rules Cyclopedia
  - DMR2
  - custom
- Create ingestion workflow for DMR2 monsters
- Add review status:
  - imported
  - verified
  - needs manual review
- Improve monster search and filtering:
  - source
  - terrain
  - HD
  - alignment
  - treasure type
  - type/family
- Add encounter-ready monster cards with the minimum information needed for a DM to act immediately
- Define a manual-review workflow for imported or uncertain monster records before they are treated as trusted session content

## P1 monster usability

- encounter-ready cards
- batch add to session
- save monster groups
- monster notes, tactics, and variants
- monster image consistency pass
- source citation display in admin/debug mode

## P1 broader content layer

- spell compendium browsing
- item compendium browsing
- reusable handouts and journals
- campaign lore pages
- rules reference cards

## P2 prep and publishing tools

- import/export for monsters and content packs
- compendium pack structure
- starter campaign content bundle
- region packs and map packs
- sample encounters

## P3 stretch ideas

- domain and faction compendium
- treasure and magic item tables
- random encounter generator
- encounter difficulty estimator

## Release gate for this track

- A DM can find a monster by useful filters, trust its source, and add it to a live session quickly
- Monster records show enough metadata to distinguish verified content from uncertain content
- DMR2 exists as a planned or implemented first-class source instead of an external PDF only
- Monster content supports prep and combat, not just browsing

## Definition of done

- Monster content is searchable, source-tagged, and reusable in actual session prep
- DMR2 is a first-class expansion source, not an external PDF only
- Content quality is explicit enough that a DM knows what is verified and what still needs review
