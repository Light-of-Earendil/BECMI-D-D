# BECMI VTT – Old Wood + Parchment UI Design Guide

Denne guide er en fuld specifikation til design og implementering af et klassisk BECMI-inspireret VTT UI i træ, pergament og messing. Den kan bruges direkte af både designere og frontend-udviklere. Alt er beskrevet som principper, tokens, komponenter, adfærd og krav til tilgængelighed, ydeevne og QA.

---

## 1. Designmål og reference
- **Stemning**: 80er-90er CRPG, Gold Box og Eye of the Beholder, læsbarhed i fokus, taktil følelse af træ og pergament.
- **Materialer**: Udskåret træ til rammer og struktur. Pergament til indhold. Messing til ringe, beslag og fokusmarkeringer.
- **Modernitet**: Nutidig responsivitet, tydelige tilstande, WCAG 2.2 AA.

---

## 2. Design-tokens
Tokens er det eneste sted farver, spacing og skygger defineres. Koden bruger præcis disse navne.

### 2.1 Palet
**Træ**  
wood-900 #2a1409  
wood-800 #3b2412  
wood-700 #4c2e16  
wood-600 #5c371a  
wood-500 #6e4120  
wood-400 #8b5a33  
wood-300 #a46c40  
wood-200 #c1865a  
wood-100 #d7a573

**Pergament**  
parchment-900 #6a5c3b  
parchment-800 #8a7a4e  
parchment-700 #a99663  
parchment-600 #c3b07a  
parchment-500 #d7c796  
parchment-400 #e3d5aa  
parchment-300 #eadfbc  
parchment-200 #f0e7cd  
parchment-100 #f6f0dc

**Metaller og accenter**  
brass-800 #6e4f1f  
brass-600 #866428  
brass-500 #9c7c38  
brass-400 #b08f43  
brass-300 #caa24a  
crt-green #8ef27e  
crt-green-dim #4ea94b  
teal-400 #7bd4d2  
red-500 #b33a2b

**Tekst**  
text-strong #f6f0dc  
text-soft #efe6cd  
text-dim #d9ccab  
text-ink #20130e

### 2.2 Typografi
- **Overskrifter**: Cinzel eller IM Fell English SC. Fallback Georgia. Brug 600-700 vægt.
- **Brødtekst**: Inter eller Noto Sans. Fallback system-sans.
- **Systemtekst**: VT323 eller monospace til CRT-paneler.
- **Skala**: Base 16 px. Ratio 1.25. Line height 1.35 på overskrifter, 1.5 på brødtekst.
- **Farver**: Tekst på træ bruger text-strong. Tekst på pergament bruger text-ink.

### 2.3 Spacing, radius, skygger
- **Spacing**: 4 px skala. 4, 8, 12, 16, 20, 24, 32, 40, 48.
- **Radii**: xs 4, sm 8, md 12, lg 18, xl 24.
- **Bevel og skygger**:
  - bevel-light rgba(255,235,180,0.55)
  - bevel-dark rgba(22,9,3,0.6)
  - shadow-wood: kombination af ydre skygge og indre bevel for udskåret effekt.

### 2.4 Breakpoints og grid
- Breakpoints: 640, 768, 1024, 1280.
- Grid: 12 kolonner desktop, 6 tablet, 4 mobil.
- Max bredde: 1080 px for primært spillepanel. Sidebars kan være fleksible 280 til 360 px.

### 2.5 Z-indeks
- dropdown 50  
- overlay 100  
- modal 200  
- toast 300

---

## 3. Overflader og baggrunde
- **App-baggrund**: mørke træplanker med diskret plankelinjer og vignet.
- **Panel**: wood-ramme med inner-bevel.
- **Indhold**: pergament med vertikal lys-til-mellem gradient plus svag radial highlight i øverste venstre hjørne.
- **Tekstur**: brug let kornet noise 2 til 3 procent for at undgå banding. Eksportér som WebP i 1x og 2x.
- **9-slice**: brug 9-slice til rammer, så hjørner bevarer detalje.

---

## 4. Ikonografi
- 16 px grid, 2 px stroke, rundede hjørner.
- Stil: simple pictograms. Ingen fotorealisme.
- Farver: udfyldning i text-strong på træ og wood-900 på pergament.
- Levering: symbolske SVG-ikoner i et samlet sprite. Navngivning som `icon-play`, `icon-pause`.

---

## 5. Motion
- Microinteraktioner 120 til 220 ms.
- Hover løfter 1 px. Active presser 1 px ind.
- Ease: standard cubic-bezier(0.2, 0.8, 0.2, 1).
- Respekter `prefers-reduced-motion` ved at deaktivere tranformation og glød.

---

## 6. Lyd
- UI-klik kan bruge dæmpede “wood tap” samples.
- Ingen auto-lyd. Følg global “mute”.
- Korte 30 til 60 ms samples for snappy fornemmelse.

---

## 7. Komponentbibliotek
Hver komponent beskrives med anatomi, tilstande, adfærd og retningslinjer.

### 7.1 Panel og kort
- **Anatomi**: wood frame, indre pergament, titelbjælke optional.
- **Tilstande**: default, highlighted (svag ydre glød), disabled (lav kontrast).
- **Indhold**: brug panel__title med Cinzel og diskret skygge.

### 7.2 Knapper
- **Varianter**: primary, secondary, danger, ghost, icon.
- **Default**: afrundet 999 px hvis det er en chip, ellers md radius 12.
- **Haptik**: hover løft, active press.
- **Fokus**: tydelig messingring.
- **Ikonplacering**: 8 px mellem ikon og tekst.
- **Tilstande**: default, hover, active, focus, disabled. Disabled mister skygge og får 60 procent opacitet.

### 7.3 Formularfelter
- **Text input, textarea, select**: pergamentchip med indre highlight.
- **Label**: altid synlig over feltet. Ingen flydende label.
- **Hjælpetekst**: 12 til 13 px under felt.
- **Validering**:
  - Fejl: rød kant, kort fejltekst, aria-invalid true.
  - Succes: diskret grøn outline.
- **Tastatur**: Tab mellem felter, Enter indsender, Shift Tab går tilbage.

### 7.4 Checkboxes og radio
- **Anatomi**: pergamentchip 20 px.
- **Markering**: checkmark for checkbox, messing-dot for radio.
- **Klikmål**: hele label er klikbar.
- **Tilstande**: default, hover, focused, disabled.

### 7.5 Switch
- **Anatomi**: træslæde, pergamentknop.
- **Adfærd**: klik og Space toggler.
- **ARIA**: role switch, aria-checked, tastatur fokus.

### 7.6 Slider
- **Anatomi**: træslot, messing-fill, pergamentknop.
- **Input**: mouse drag, keyboard piletaster 5 step, Shift pil 10.
- **ARIA**: role slider, aria-valuemin, aria-valuemax, aria-valuenow.

### 7.7 Progressbar
- **Anatomi**: udskåret træslot.
- **Farve**: teal til CRT-grøn.
- **ARIA**: role progressbar med relevante attributter hvis dynamisk.

### 7.8 Tabs
- **Anatomi**: træfaner med aktiv pergament.
- **ARIA**: tablist, tab, aria-selected, aria-controls.
- **Tastatur**: venstre/højre skifter fane, Home og End hopper til start og slut.

### 7.9 Tabellen
- **Tabelhoved**: sticky i træ.
- **Rækker**: zebra på pergament er valgfrit, men hold høj kontrast.
- **Interaktion**: klikrække til valg af entitet, fokus synligt.

### 7.10 Dropdown og menu
- **Overflade**: pergamentkort med svag skygge.
- **Fokusfælde**: ikke nødvendig, men første element får fokus på åbning.
- **Luk**: Escape, klik udenfor, valg.

### 7.11 Modal vindue
- **Anatomi**: wood ramme, indre pergament.
- **Åbning**: body scroll låses. Focus flyttes til første interaktive element.
- **Luk**: ESC, Close-knap, klik på overlay.
- **ARIA**: role dialog, aria-modal true, label via aria-labelledby.

### 7.12 Tooltip
- **Placering**: over elementet, centreret.
- **Tilgængelighed**: vis som `title` fallback for keyboard-brugere eller brug roligi-markup hvis nødvendigt.

### 7.13 Toasts
- **Placering**: nederste højre. Flere toasts stables med 8 px.
- **Varighed**: 4 sekunder default. Pause on hover.

### 7.14 HUD-elementer
- **Stats**: AC, HP, MP i CRT-panel eller pergament-chips.
- **Begrænsning**: brug høje kontraster og store tal.
- **Ikoner**: brug ensartet ikonografi for betingelser som poison, stunned.

### 7.15 Kort og mini-map
- **Container**: wood frame.
- **Overlay**: pergamenttags som pins.
- **Zoom**: ikonknapper i wood peg-stil.

### 7.16 Dialog- og fortællepanel
- **CRT-stil** til systemtekster med grøn glød.
- **Pergament-bokse** til NPC-replikker og quest-tekst. Brug portrætramme i venstre side når muligt.

---

## 8. Tilstande og temaer
- **Tilstande**: default, hover, active, focus-visible, selected, disabled, loading.
- **Temaer**: main tema beskrevet her. Undertema Dark Tavern dæmper pergament 1 til 2 trin, løfter wood til 700 til 900 og øger glød på messing 10 procent.

---

## 9. Tilgængelighed
- Standard WCAG 2.2 AA.
- Kontrast: tekst mod baggrund mindst 4.5 til 1.
- Fokus: synlig og tydelig messingring.
- ARIA mønstre for tabs, dialogs, sliders, switches er obligatoriske.
- Tastatur: alt kan nås og bruges uden mus.
- Reduced motion respekteres.

---

## 10. Internationalisering
- Dansk og engelsk UI-strenge holdes i resource-filer.
- Plads til længere engelske ord i knapper via min 16 px horisontal padding ekstra.
- Tal og datoer formatteres via brugerens locale.

---

## 11. Assets og eksport
- Wood og parchment som tilebare teksturer.  
- Eksportér 1x og 2x WebP eller AVIF.  
- Spritesheet til ikoner.  
- 9-slice PNG til panel-rammer hvis nødvendig.

---

## 12. Ydelse
- CSS-bundle under 50 KB gzip som mål.
- JS til UI-microinteraktioner under 10 KB gzip.
- Font-display swap.
- Forudindlæsning af overskriftsfont.
- Undgå layout shift ved faste dimensioner på assets.

---

## 13. QA-checkliste
- Fokus kan ses på alle interaktive elementer.
- ESC lukker modal.
- Piletaster styrer slider og tabs.
- Kontrast-test på mørke træpaneler og på pergament.
- Mobil: trykflader mindst 44 x 44 px.
- Ingen horizontal scroll på 360 px bredde.

---

## 14. Komponentbibliotek og kodenavne
- Tokens følger navne i denne guide.
- CSS-klasser og JS-roller må gerne mappes i et UI-lag, men beholder samme semantik.
- Eksempel på navngivning: `panel`, `panel__inner`, `btn`, `btn--primary`, `input`, `control`, `switch`, `slider`, `progress`, `tabs`, `tab`, `table`, `toast`, `modal`.

---

## 15. Eksempelsider
- **HUD og kamp**: CRT-statblok til højre, log nederst, actionbar med ikonknapper, inventory som grid i pergament.
- **Bykort**: panel med søgning, faner for butikker, tavernerygter i modal.
- **Karakterark**: dobbeltkolonne pergament, wood-ramme, tabbar for evner, trykfulde inputs med labels.

---

## 16. Handoff
- Designfiler: Figma eller tilsvarende med komponenter og variants for tilstande.
- Assetpakke: teksturer, 9-slice rammer, svg-ikon-sprite.
- Tokenliste: som JSON eller CSS vars.
- Implementering: brug eksisterende CSS og demo som reference.

---

### Bilag A – Token JSON (eksempel)
```json
{
  "color": {
    "wood": {"900":"#2a1409","800":"#3b2412","700":"#4c2e16","600":"#5c371a","500":"#6e4120","400":"#8b5a33","300":"#a46c40","200":"#c1865a","100":"#d7a573"},
    "parchment": {"900":"#6a5c3b","800":"#8a7a4e","700":"#a99663","600":"#c3b07a","500":"#d7c796","400":"#e3d5aa","300":"#eadfbc","200":"#f0e7cd","100":"#f6f0dc"},
    "brass": {"800":"#6e4f1f","600":"#866428","500":"#9c7c38","400":"#b08f43","300":"#caa24a"},
    "accent": {"crt":"#8ef27e","crtDim":"#4ea94b","teal":"#7bd4d2","danger":"#b33a2b"},
    "text": {"strong":"#f6f0dc","soft":"#efe6cd","dim":"#d9ccab","ink":"#20130e"}
  },
  "radius": {"xs":4,"sm":8,"md":12,"lg":18,"xl":24},
  "space": {"1":4,"2":8,"3":12,"4":16,"5":20,"6":24,"8":32,"10":40,"12":48},
  "z": {"dropdown":50,"overlay":100,"modal":200,"toast":300}
}
```

---

Denne guide er kilden. CSS og demo kan bruges som referenceimplementering, men teamet følger principperne her når der skaleres ud i resten af VTT’et.

