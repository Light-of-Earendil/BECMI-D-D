# Stylus Source Files

This directory contains the Stylus source files for the BECMI VTT CSS.

## Structure

- `main.styl` - Main entry point that imports all modules
- `_variables.styl` - CSS custom properties (design tokens)
- `_reset.styl` - CSS reset styles
- `_base.styl` - Base element styles
- `_utilities.styl` - Utility classes
- `_layout.styl` - Layout helpers
- `_components.styl` - Reusable components (panels, buttons, forms, etc.)
- `_modals.styl` - Modal system and app structure
- `_features.styl` - Feature-specific styles (to be completed)

## Compilation

### Option 1: Using the Batch Script (Windows)

```bash
cd public/stylus
compile.bat
```

### Option 2: Using Stylus CLI Directly

```bash
cd public/stylus
stylus main.styl -o ../css/main.css
```

### Option 3: Watch Mode (Auto-compile on changes)

```bash
cd public/stylus
stylus -w main.styl -o ../css/main.css
```

## Installation

If Stylus is not installed:

```bash
npm install -g stylus
```

## Conversion Status

✅ **Completed:**
- Variables and design tokens
- CSS reset
- Base styles
- Utility classes
- Layout helpers
- Core components (panels, buttons, forms)
- Modal system and app structure

⚠️ **In Progress:**
- Feature-specific styles (character creation, sheets, DM dashboard, hex maps, etc.)

## Notes

- The original `main.css` is 6240+ lines
- Feature-specific styles need to be converted from the original CSS
- Use Stylus nesting, variables, and mixins where appropriate
- Maintain the same output structure as the original CSS

## Stylus Syntax Reference

### Nesting
```stylus
.panel
  padding: 10px
  &::before
    content: ""
```

### Variables
```stylus
$primary-color = #2a1409
.panel
  background: $primary-color
```

### Mixins
```stylus
wood-frame()
  background: linear-gradient(180deg, var(--wood-600), var(--wood-800))
  box-shadow: var(--shadow-wood)

.panel
  wood-frame()
```
