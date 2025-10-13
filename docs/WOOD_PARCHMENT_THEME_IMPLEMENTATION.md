# Wood + Parchment Theme Implementation

## Oversigt

Dette dokument beskriver implementeringen af det nye middelalder low fantasy RPG tema for BECMI VTT. Temaet er baseret på tre hovedmaterialer:
- **Træ (Wood)** - Til rammer og strukturer
- **Pergament (Parchment)** - Til indholdsområder
- **Messing (Brass)** - Til accenter og fokusmarkeringer

## Implementeringsstatus

✅ **Komplet implementeret** - Alle faser er færdige

### Fase 1: Font Assets og Infrastruktur
- ✅ Fonts importeret via Google Fonts CDN (@import)
- ✅ Directory struktur oprettet (`public/fonts/`, `public/images/textures/`)
- **Fonts brugt:**
  - Cinzel - Overskrifter og titler
  - VT323 - CRT/monospace displays
  - IM Fell English SC - Alternative overskrifter
  - Inter - Brødtekst (fallback til system fonts)

### Fase 2: CSS Token System
- ✅ Alle design tokens implementeret i `:root`
- ✅ Wood palette (900-100): #2a1409 → #d7a573
- ✅ Parchment palette (900-100): #6a5c3b → #f6f0dc  
- ✅ Brass/metals (800-300): #6e4f1f → #caa24a
- ✅ Accent colors: CRT green, teal, red
- ✅ Spacing scale (4px base)
- ✅ Border radii (xs til xl)
- ✅ Z-indices hierarki
- ✅ Shadow og bevel tokens

### Fase 3: Core Komponenter
- ✅ Panel system (`.panel`, `.panel__inner`, `.panel__title`)
- ✅ Button system (alle varianter: primary, secondary, danger, success, ghost)
- ✅ Icon buttons (`.icon-btn`)
- ✅ Form inputs (text, select, textarea, checkbox, radio)
- ✅ Advanced controls (switch, slider, progress bar)
- ✅ CRT panel komponent

### Fase 4: Layout Komponenter
- ✅ App header med wood frame
- ✅ Navigation med brass accents
- ✅ Main content område
- ✅ Footer med wood styling
- ✅ Layout helpers (`.stack`, `.row`, `.grid`, `.container`)

### Fase 5: Modal System
- ✅ Modal backdrop og struktur
- ✅ Modal header, body, footer
- ✅ Auth forms (login, register, forgot password, reset)
- ✅ Character creation modal
- ✅ Session creation modal

### Fase 6: Character System
- ✅ Character sheet med panels
- ✅ Ability scores grid
- ✅ Combat stats (AC, THAC0, HP)
- ✅ Saving throws
- ✅ Money display
- ✅ Equipment grid
- ✅ Weapon masteries
- ✅ General skills
- ✅ Spells & magic

### Fase 7: Character Creation Wizard
- ✅ Step progress indicators
- ✅ Class selection grid
- ✅ Race selection
- ✅ Alignment selection
- ✅ Ability score arrangement
- ✅ Portrait generator section
- ✅ Equipment shopping cart
- ✅ Roll buttons og inputs

### Fase 8: Dashboard & Sessions
- ✅ Dashboard stat cards med CRT numbers
- ✅ Session cards
- ✅ Calendar grid
- ✅ Character list cards

### Fase 9: Specialized Components
- ✅ Tabs system
- ✅ Table component
- ✅ Dropdown menus
- ✅ Tooltip system
- ✅ Toast notifications
- ✅ Level up wizard
- ✅ DM dashboard
- ✅ Initiative tracker

### Fase 10: Responsiveness
- ✅ Mobile breakpoints (640px, 768px, 1024px)
- ✅ Responsive grids
- ✅ Touch-friendly buttons (44x44px minimum)
- ✅ Stack layouts på mobile

### Fase 11: Accessibility
- ✅ WCAG 2.2 AA compliance
- ✅ Focus indicators (brass rings)
- ✅ ARIA support
- ✅ Keyboard navigation
- ✅ Reduced motion support
- ✅ Screen reader support

## CSS Klasser Mapping

For bagudkompatibilitet understøtter CSS'en både nye og gamle klassenavne:

| Gamle klasser | Nye klasser | Beskrivelse |
|--------------|-------------|-------------|
| `.btn-primary` | `.btn.btn--primary` | Primær knap |
| `.btn-secondary` | `.btn.btn--secondary` | Sekundær knap |
| `.btn-error` | `.btn.btn--danger` | Fejl/slet knap |
| `.btn-success` | `.btn.btn--primary` | Success = primary i fantasy |
| `.btn-sm` | `.btn.btn--sm` | Lille knap |
| `.ability-score-item` | `.ability-item` | Ability score display |
| `.combat-stat` | `.stat-item` | Combat stat display |

## Design Tokens Reference

### Farver

**Wood (Træ)**
```css
--wood-900: #2a1409  /* Mørkeste træ */
--wood-800: #3b2412
--wood-700: #4c2e16
--wood-600: #5c371a
--wood-500: #6e4120
--wood-400: #8b5a33
--wood-300: #a46c40
--wood-200: #c1865a
--wood-100: #d7a573  /* Lyseste træ */
```

**Parchment (Pergament)**
```css
--parchment-900: #6a5c3b  /* Mørkeste pergament */
--parchment-800: #8a7a4e
--parchment-700: #a99663
--parchment-600: #c3b07a
--parchment-500: #d7c796
--parchment-400: #e3d5aa
--parchment-300: #eadfbc
--parchment-200: #f0e7cd
--parchment-100: #f6f0dc  /* Lyseste pergament */
```

**Brass (Messing)**
```css
--brass-800: #6e4f1f
--brass-600: #866428
--brass-500: #9c7c38
--brass-400: #b08f43
--brass-300: #caa24a  /* Primær brass accent */
```

**Accenter**
```css
--green-crt: #8ef27e       /* CRT grøn glød */
--green-crt-dim: #4ea94b   /* Dæmpet CRT */
--teal-400: #7bd4d2        /* Teal accent */
--red-500: #b33a2b         /* Danger/error */
```

**Tekst**
```css
--text-strong: #f6f0dc  /* Stærk tekst på træ */
--text-soft: #efe6cd    /* Blød tekst på træ */
--text-dim: #d9ccab     /* Dæmpet tekst */
--text-ink: #20130e     /* Blæk på pergament */
```

### Spacing

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
```

### Border Radius

```css
--radius-xs: 4px
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 18px
--radius-xl: 24px
```

### Shadows og Bevels

```css
--bevel-light: rgba(255, 235, 180, 0.55)
--bevel-dark: rgba(22, 9, 3, 0.6)
--shadow-wood: 0 2px 0 var(--bevel-dark), 
               0 4px 10px rgba(0,0,0,0.35), 
               inset 0 1px 0 var(--bevel-light), 
               inset 0 -1px 0 rgba(0,0,0,0.35)
```

## Komponent Eksempler

### Panel med Parchment Inner

```html
<div class="panel">
    <div class="panel__inner">
        <h2 class="panel__title">Character Sheet</h2>
        <p>Content goes here...</p>
    </div>
</div>
```

### Button Varianter

```html
<button class="btn btn--primary">Primary Action</button>
<button class="btn btn--secondary">Secondary Action</button>
<button class="btn btn--danger">Delete</button>
<button class="btn btn--ghost">Subtle Action</button>
<button class="icon-btn"><i class="fas fa-dice"></i></button>
```

### Stat Display

```html
<div class="stat-item">
    <strong>Strength</strong>
    <div class="value">16</div>
    <small>+2 modifier</small>
</div>
```

### CRT Panel

```html
<div class="crt">
    HP: 25/32
    AC: 5
    XP: 1,250
</div>
```

## Browser Support

- Chrome/Edge (Chromium): ✅ Fuldt understøttet
- Firefox: ✅ Fuldt understøttet
- Safari: ✅ Fuldt understøttet
- Mobile browsers: ✅ Responsive design

## Performance

- CSS bundle størrelse: ~90 KB (unkomprimeret)
- Font loading: Optimeret med `font-display: swap`
- Layout shift: Minimeret med faste dimensioner
- Transitions: Hardware-accelereret hvor muligt

## Fremtidige Forbedringer

### Mulige udvidelser
1. **Lokal font hosting** - Download og host fonts lokalt i stedet for Google Fonts CDN
2. **Teksturer** - Tilføj subtle wood og parchment teksturer som baggrundsbilleder
3. **9-slice sprites** - Brug 9-slice teknik til panel-rammer for at spare på gentagende gradienter
4. **Ikon sprites** - Samle alle ikoner i et SVG sprite-sheet
5. **Dark mode** - "Dark Tavern" variant med mørkere farver
6. **Animation library** - Tilføj flere microinteractions og hover-effekter

### Yderligere komponenter
- Combat grid/map viewer
- Dice roller modal
- Inventory drag-drop system
- Quest log panel
- NPC interaction dialog system

## Testing Checkliste

- [x] Login flow virker med nye stilarter
- [x] Character creation wizard alle steps
- [x] Character sheet display alle sektioner
- [x] Dashboard stat cards
- [x] Session management
- [x] Calendar view
- [x] Equipment grid
- [x] Modal åbning/lukning
- [x] Button alle states (hover, active, focus, disabled)
- [x] Form validation states
- [x] Responsive breakpoints
- [x] Keyboard navigation
- [x] Focus indicators
- [x] Reduced motion respekt

## Support og Dokumentation

For yderligere dokumentation, se:
- [Design Guide](./becmi_vtt_old_wood_parchment_ui_design_guide.md) - Fuld design specifikation
- [Reference CSS](./vtt-wood-theme.css) - Original reference implementering

## Changelog

### Version 1.0.0 - 2025-10-12
- Initial implementering af wood + parchment tema
- Alle core komponenter
- Fuld responsive support
- WCAG 2.2 AA compliance
- Bagudkompatibilitet med eksisterende JavaScript

