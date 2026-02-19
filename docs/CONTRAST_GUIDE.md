# Kontrast Guide - BECMI VTT

## Kritiske regler for tekstfarver

### Tekstfarve variabler (ALDRIG opfind nye!)
- `--text-strong: #f6f0dc` - Primær tekst på mørk baggrund (høj kontrast)
- `--text-soft: #efe6cd` - Sekundær tekst på mørk baggrund (god kontrast)
- `--text-dim: #d9ccab` - Dæmpet tekst på mørk baggrund (mindre kontrast)
- `--text-ink: #20130e` - Mørk tekst på lys baggrund (pergament)

### Kontrast regler

**På mørk brun baggrund (wood-600 til wood-900):**
- Primær tekst: `var(--text-strong)` eller `var(--text-soft)`
- Sekundær tekst: `var(--text-soft)` eller `var(--text-dim)`
- ALDRIG brug: `--text-ink`, `--wood-*` farver som tekstfarve

**På lys baggrund (parchment-100 til parchment-400):**
- Primær tekst: `var(--text-ink)`
- Sekundær tekst: `var(--text-ink)` med opacity eller `--wood-900`
- ALDRIG brug: `--text-strong`, `--text-soft` (for lys)

**På brass/gul baggrund (brass-300 til brass-600):**
- Primær tekst: `var(--text-ink)` eller `var(--wood-900)`
- ALDRIG brug: `--text-strong`, `--text-soft` (for lys)

### Checklist før commit
- [ ] Alle tekstfarver bruger korrekte CSS variabler
- [ ] Ingen `--text-light` (findes ikke!)
- [ ] Kontrast tjek: mørk baggrund = lys tekst, lys baggrund = mørk tekst
- [ ] Test visuelt at tekst er læsbar

### Eksempler

✅ **Korrekt:**
```css
/* Mørk brun baggrund */
background: linear-gradient(180deg, var(--wood-600), var(--wood-800));
color: var(--text-strong); /* Lys tekst på mørk baggrund */
```

✅ **Korrekt:**
```css
/* Lys pergament baggrund */
background: var(--parchment-200);
color: var(--text-ink); /* Mørk tekst på lys baggrund */
```

❌ **Forkert:**
```css
/* Mørk brun baggrund */
background: var(--wood-600);
color: var(--text-light); /* EKSISTERER IKKE! */
```

❌ **Forkert:**
```css
/* Mørk brun baggrund */
background: var(--wood-600);
color: var(--wood-900); /* Brun på brun = dårlig kontrast! */
```
