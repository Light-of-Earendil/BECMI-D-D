# BECMI Character Creation System

## Overview

Complete 11-step character creation wizard following Rules Cyclopedia Chapter 1.

## Steps

### 1. Roll Ability Scores
- Roll 3d6 for each ability (STR, DEX, CON, INT, WIS, CHA)
- Arrange scores to taste
- Display modifiers for each score

### 2. Choose Character Class  
- Select from: Fighter, Cleric, Magic-User, Thief, Dwarf, Elf, Halfling, Mystic
- Druid disabled (must reach level 9 as Neutral Cleric first)
- Class requirements validated:
  - Dwarf: CON 9+
  - Elf: INT 9+
  - Halfling: DEX 9+, CON 9+
  - Mystic: WIS 13+, DEX 13+

### 3. Adjust Ability Scores (Optional)
**NEW FEATURE** - Rules Cyclopedia Chapter 1, page 227-268

Trade 2 points from an ability to raise prime requisite by 1 point.

**Rules:**
- Cannot lower any ability below 9
- Cannot lower Constitution or Charisma
- Cannot lower Dexterity (except Thief/Halfling)
- Can only raise prime requisites

**Prime Requisites by Class:**
- Fighter: Strength
- Cleric: Wisdom
- Magic-User: Intelligence
- Thief: Dexterity
- Dwarf: Strength
- Elf: Strength + Intelligence
- Halfling: Strength + Dexterity
- Mystic: Strength + Dexterity

**Implementation:**
- Interactive +/- buttons for each ability
- Real-time validation
- Visual highlighting of prime requisites
- Adjustment summary showing total points lowered/raised
- Reset button to restore original scores

### 4. Roll Hit Points
**NEW FEATURE** - Rules Cyclopedia Chapter 1, page 269-302

Roll hit die for starting HP.

**Hit Dice by Class:**
- Fighter, Dwarf: d8
- Cleric, Elf, Halfling, Druid, Mystic: d6
- Magic-User, Thief: d4

Constitution modifier applies (minimum 1 HP).

### 5. Roll Starting Gold
All characters roll 3d6 × 10 gold pieces.

### 6. Buy Equipment
- Browse complete BECMI equipment catalog
- Categorized by type (weapons, armor, gear, etc.)
- Real-time encumbrance tracking
- Gold tracking

### 7. Select Starting Spells (Magic-User/Elf only)
**NEW FEATURE** - Rules Cyclopedia Chapter 3, page 1967-2012

- Magic-Users: 2 starting 1st level spells
- Elves: 1 starting 1st level spell
- Other classes: Skip this step

Spells are given by the character's teacher and added to their spellbook.

### 8. Select Weapon Masteries
Choose weapon specializations based on class.

### 9. Select General Skills
Select skills based on Intelligence modifier.

### 10. Physical Details & Background
- Age, height, weight, hair color, eye color
- **NEW:** Personality field
- **NEW:** Background story field

### 11. Review & Create
Final review of all choices before creating character.

## Database Schema

### New Fields in `characters` table:

```sql
ability_adjustments JSON       -- Records adjustments made in Step 3
original_strength INT          -- Original rolled scores before adjustments
original_dexterity INT
original_constitution INT
original_intelligence INT
original_wisdom INT
original_charisma INT
personality TEXT               -- Character personality
background TEXT                -- Character background story
```

### New Fields in `character_spells` table:

```sql
is_starting_spell BOOLEAN      -- True if spell was granted at character creation
```

## Backend Validation

### BECMIRulesEngine Functions

- `validateClassRequirements($class, $abilities)` - Validates minimum ability scores
- `validateAbilityAdjustmentRules($original, $adjusted, $class)` - Validates 2-for-1 trading
- `getClassPrimeRequisites($class)` - Returns prime requisite abilities
- `getStartingSpellsForClass($class, $level)` - Returns number of starting spells
- `getHitDieForClass($class)` - Returns hit die size
- `getExperienceBonus($class, $abilities)` - Calculates XP multiplier

### API Endpoints

- `POST /api/character/create.php` - Creates character with validation
- `GET /api/spells/get-starting-spells.php` - Returns available 1st level spells

## Frontend Components

### JavaScript Modules

- `public/js/modules/character-creation.js` - Main wizard (2100+ lines)
- `public/js/becmi/class-data.js` - Class definitions and requirements
- `public/js/modules/character-creation-equipment.js` - Equipment cart
- `public/js/modules/character-creation-gold.js` - Gold calculator

### CSS Styling

- Ability adjustment UI with prime requisite highlighting
- HP roll animation with heartbeat effect
- Starting spells card grid with selection state
- Skip step message for conditional steps
- Progress bars showing all 11 steps

## Testing Checklist

- [ ] Roll ability scores (3d6 method)
- [ ] Select each class and verify requirements
- [ ] Test ability adjustments:
  - [ ] Cannot lower below 9
  - [ ] Cannot lower CON/CHA
  - [ ] Cannot lower DEX (except Thief/Halfling)
  - [ ] Can only raise prime requisites
  - [ ] 2-for-1 ratio enforced
- [ ] Roll HP for each class with different CON scores
- [ ] Roll starting gold
- [ ] Buy equipment
- [ ] Select starting spells (Magic-User: 2, Elf: 1)
- [ ] Select weapon masteries
- [ ] Select skills
- [ ] Enter physical details and background
- [ ] Review and create character
- [ ] Verify database has all new fields populated

## Future Enhancements

- [ ] Add Druid transformation at level 9
- [ ] Add more starting gold formulas for optional rules
- [ ] Add equipment sets/packages for quick purchase
- [ ] Add spell recommendations based on class/playstyle
- [ ] Add character portrait upload
- [ ] Add dice rolling animation
- [ ] Add character name generator
- [ ] Add alignment description tooltips

