#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Compare monsters from Rules Cyclopedia with database
"""
import re
import subprocess
import json

def get_db_monsters():
    """Get list of monsters from database"""
    # Return known monsters from database query
    return [
            'Actaeon', 'Adaptor', 'Aerial Servant', 'Air Elemental', 'Amber Golem',
            'Ankheg', 'Ape', 'Assassin', 'Bandit', 'Basilisk', 'Bear', 'Berserker',
            'Bison', 'Black Dragon - Huge', 'Black Dragon - Large', 'Black Dragon - Small',
            'Black Hag', 'Black Pudding', 'Blue Dragon - Huge', 'Blue Dragon - Large',
            'Blue Dragon - Small', 'Boar', 'Bone Golem', 'Brigand', 'Bronze Golem',
            'Bugbear', 'Bulette', 'Carrion Crawler', 'Centaur', 'Cloud Giant',
            'Cockatrice', 'Crocodile', 'Cultist', 'Cyclops', 'Deer', 'Dire Wolf',
            'Displacer Beast', 'Draft Horse', 'Dryad', 'Eagle', 'Earth Elemental',
            'Elephant', 'Elk', 'Ettin', 'Fire Elemental', 'Fire Giant', 'Frost Giant',
            'Gargoyle', 'Gelatinous Cube', 'Ghoul', 'Giant', 'Giant Ant', 'Giant Bat',
            'Giant Bee', 'Giant Centipede', 'Giant Crocodile', 'Giant Eagle', 'Giant Frog',
            'Giant Leech', 'Giant Octopus', 'Giant Rat', 'Giant Scorpion', 'Giant Shark',
            'Giant Slug', 'Giant Snake', 'Giant Spider', 'Giant Squid', 'Giant Tick',
            'Giant Toad', 'Giant Wasp', 'Gnoll', 'Goblin', 'Goblin King', 'Gold Dragon - Huge',
            'Gold Dragon - Large', 'Gold Dragon - Small', 'Gorgon', 'Gorilla', 'Gray Ooze',
            'Green Dragon - Huge', 'Green Dragon - Large', 'Green Dragon - Small',
            'Green Slime', 'Griffon', 'Guard', 'Harpy', 'Hawk', 'Hill Giant',
            'Hippocampus', 'Hippogriff', 'Hobgoblin', 'Imp', 'Invisible Stalker', 'Kobold',
            'Kraken', 'Leviathan', 'Lich', 'Lion', 'Lurker Above', 'Medusa', 'Merchant',
            'Mimic', 'Minotaur', 'Moose', 'Mud Golem', 'Mummy', 'Nixie', 'Noble', 'Nymph',
            'Obsidian Golem', 'Ochre Jelly', 'Ogre', 'Orc', 'Orc Chieftain', 'Owl',
            'Owlbear', 'Pegasus', 'Phoenix', 'Piercer', 'Pirate', 'Pixie', 'Pony',
            'Purple Worm', 'Python', 'Red Dragon - Huge', 'Red Dragon - Large',
            'Red Dragon - Small', 'Remorhaz', 'Rhinoceros', 'Riding Horse', 'Roc',
            'Roper', 'Rust Monster', 'Satyr', 'Sea Hag', 'Sea Serpent', 'Shadow',
            'Shambling Mound', 'Shark', 'Skeleton', 'Skeleton Warrior', 'Spectre',
            'Sprite', 'Stirge', 'Stone Giant', 'Storm Giant', 'Strangle Weed', 'Succubus',
            'Thief', 'Thoul', 'Tiger', 'Titan', 'Trapper', 'Treant', 'Troll', 'Umber Hulk',
            'Unicorn', 'Vampire', 'War Horse', 'Water Elemental', 'Werebear', 'Wererat',
            'Werewolf', 'White Dragon - Huge', 'White Dragon - Large', 'White Dragon - Small',
            'Wight', 'Wild Boar', 'Wolf', 'Wood Golem', 'Wraith', 'Yellow Mold', 'Zombie',
            'Zombie Lord'
        ]

def normalize_name(name):
    """Normalize monster name for comparison"""
    # Remove parenthetical notes
    name = re.sub(r'\s*\([^)]+\)\s*', '', name)
    # Remove trailing asterisks
    name = name.rstrip('*').strip()
    # Convert to lowercase for comparison
    return name.lower()

def extract_monster_names_from_file(filename):
    """Extract monster names from Rules Cyclopedia file"""
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    monster_names = []
    skip_patterns = [
        r'^XP Value:', r'^Armor Class:', r'^Hit Dice:', r'^Move:', r'^Attacks:',
        r'^Damage:', r'^No\. Appearing:', r'^Save As:', r'^Morale:', r'^Treasure Type:',
        r'^Intelligence:', r'^Alignment:', r'^Monster Type:', r'^Terrain:', r'^Load:',
        r'^Barding', r'^Chapter', r'^How to', r'^Just as', r'^Some', r'^This', r'^The ',
        r'^If ', r'^When ', r'^A ', r'^An ', r'^All ', r'^Normal ', r'^Planar ',
        r'^Human ', r'^Dragon ', r'^Construct', r'^Undead', r'^Lowlife', r'^Giant ',
        r'^Animal ', r'^Humanoid', r'^Demihuman', r'^Enchanted', r'^Determine',
        r'^Type ', r'^Description', r'^Special', r'^Acid', r'^Blindness', r'^Charge',
        r'^Charm', r'^Disease', r'^Paralysis', r'^Petrification', r'^Poison',
        r'^Swallow', r'^Swoop', r'^Trample', r'^Weapons', r'^Lawful', r'^Neutral',
        r'^Chaotic', r'^Monster Frequency', r'^Monster List', r'^Amir', r'^Sec ',
        r'^See ', r'^Level', r'^Hit ', r'^Dice', r'^Clerical', r'^Move ', r'^Summoning',
        r'^Save ', r'^As ', r'^Air ', r'^Earth ', r'^Fire ', r'^Variable', r'^Small',
        r'^Large', r'^Huge', r'^Needed', r'^Unknown', r'^Varies', r'^on ', r'^above',
        r'^Tem\.in:', r'^lion', r'^Mountain$', r'^Lama', r'^Patriarch', r'^\d+',
        r'^[A-Z][a-z]+$', r'^[A-Z][a-z]+\s+[A-Z]', r'^[a-z]+\s+[a-z]+', r'^[A-Z]$',
        r'^[A-Z][a-z]+\s+[A-Z][a-z]+$'
    ]
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        if not stripped or stripped.startswith('```') or stripped.startswith('#'):
            continue
        
        # Check if followed by "Armor Class:" within next 3 lines
        is_monster = False
        for j in range(i+1, min(i+4, len(lines))):
            if 'Armor Class:' in lines[j] or lines[j].strip().startswith('Armor Class:'):
                is_monster = True
                break
        
        if is_monster:
            name = stripped.rstrip('*').strip()
            
            # Skip if matches skip patterns
            skip = False
            for pattern in skip_patterns:
                if re.match(pattern, name, re.IGNORECASE):
                    skip = True
                    break
            
            if skip or len(name) < 2:
                continue
            
            # Skip if it's clearly not a monster (numbers, single letters, etc)
            if re.match(r'^[\d\s\+\-\*\/\(\)]+$', name) or len(name.split()) > 5:
                continue
            
            monster_names.append({
                'name': name,
                'normalized': normalize_name(name),
                'line': i+1
            })
    
    return monster_names

if __name__ == '__main__':
    rc_monsters = extract_monster_names_from_file('docs/rules/monsters.md')
    db_monsters = get_db_monsters()
    
    # Normalize database names
    db_normalized = {normalize_name(m): m for m in db_monsters}
    
    print(f"Found {len(rc_monsters)} monsters in Rules Cyclopedia")
    print(f"Found {len(db_monsters)} monsters in database\n")
    
    # Find missing monsters
    missing = []
    for rc_monster in rc_monsters:
        norm_name = rc_monster['normalized']
        if norm_name not in db_normalized:
            missing.append(rc_monster)
    
    print(f"Missing monsters: {len(missing)}\n")
    print("First 50 missing monsters:")
    for i, m in enumerate(missing[:50], 1):
        print(f"{i:3}. {m['name']:40} (line {m['line']:5})")
