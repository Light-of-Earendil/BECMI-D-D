# Monster Database Update Report

## Status: Delvist gennemført

### Gennemført
1. ✅ Analyserede wikien: https://dungeonsdragons.fandom.com/wiki/List_of_Basic_Dungeons_%26_Dragons_monsters
2. ✅ Tilføjede 3 manglende monstre til databasen:
   - **Actaeon** (11**, 2700 XP) - fra Master Rules (BECMI) 1985
   - **Adaptor** (8*, 1200 XP) - fra Master Rules (BECMI) 1985
   - **Aerial Servant** (16**, 3250 XP) - fra Companion Rules (BECMI) 1984

### Eksisterende monstre i databasen
- Total: 192 monstre (opdateret fra 189)
- De fleste grundlæggende monstre fra Basic D&D er til stede
- Alle farver af drager (Black, Blue, Gold, Green, Red, White) i tre størrelser
- Alle elementarer (Air, Earth, Fire, Water)
- Alle kæmper (Cloud, Fire, Frost, Hill, Stone, Storm)
- Standard humanoider (Goblin, Orc, Kobold, Hobgoblin, Gnoll, Bugbear)
- Standard undead (Zombie, Skeleton, Ghoul, Wraith, Wight, Spectre, Vampire, Lich)
- Standard monstre (Troll, Ogre, Minotaur, Gargoyle, etc.)

### XP Værdi Verifikation
- Actaeon: ✅ Matcher (2700 XP)
- Adaptor: ✅ Matcher (1200 XP)
- Aerial Servant: ⚠️ Forskellig fra Rules Cyclopedia (wiki: 3250, RC: 4050) - brugt wiki værdi

### Kendte manglende monstre fra wikien
Baseret på wikien mangler der stadig mange monstre. Her er nogle eksempler:

#### Fra Master Rules (BECMI):
- Agarat (4+3*, 200 XP)
- Aketheti (16**********, 12850 XP)

#### Fra Creature Catalogue (AC9):
- Amber lotus flower (1/2, 6 XP)
- Amoeba, giant (10 to 15, 1000+ XP)
- Animal, Herd (1 to 4, 10,20,35,+ XP)
- Animal, prehistoric (mange varianter)
- Mange flere...

#### Fra andre kilder:
- Mange monstre fra forskellige adventure moduler
- Mange monstre fra Gazetteer serien
- Mange monstre fra Hollow World Campaign Set

### Næste skridt
1. **Identificere prioritetsmonstre**: Fokusere på de mest almindelige/brugte monstre først
2. **Finde stats**: For hvert manglende monster skal alle stats findes (AC, Move, Attacks, Damage, etc.)
3. **Tilføje systematisk**: Tilføje monstre i batches baseret på kilde eller type

### Noter
- Wikien viser kun navn, HD og XP værdi - ikke alle stats
- Fuld stats skal findes i Rules Cyclopedia eller andre kilder
- Nogle monstre kan have varierende XP værdier afhængigt af kilde
- Migration fil oprettet: `database/migrations/035_add_missing_monsters_from_wiki.sql`

### Anbefaling
For at tilføje flere monstre systematisk:
1. Identificer de mest vigtige manglende monstre
2. Find deres fulde stats i Rules Cyclopedia eller dokumentation
3. Tilføj dem i batches via migration filer
4. Verificer XP værdier mod wikien
