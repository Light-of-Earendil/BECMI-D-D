#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract all monster names from docs/rules/monsters.md
"""
import re

def extract_monster_names(filename):
    """Extract monster names - lines that are followed by 'Armor Class:'"""
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    monster_names = []
    skip_words = {
        'Monster', 'Monsters', 'Chapter', 'How', 'Just', 'Some', 'This', 'The', 
        'If', 'When', 'A', 'An', 'All', 'Normal', 'Planar', 'Human', 'Dragon',
        'Construct', 'Undead', 'Lowlife', 'Giant', 'Animal', 'Humanoid',
        'Demihuman', 'Enchanted', 'Determine', 'Type', 'Description', 'Terrain',
        'Load', 'Barding', 'Abbreviated', 'Listings', 'Special', 'Attacks',
        'Acid', 'Blindness', 'Charge', 'Charm', 'Disease', 'Paralysis',
        'Petrification', 'Poison', 'Swallow', 'Swoop', 'Trample', 'Weapons',
        'Lawful', 'Neutral', 'Chaotic', 'Monster', 'Frequency', 'List',
        'Amir', 'Sec', 'See', 'Level', 'Hit', 'Dice', 'Clerical', 'Move',
        'Summoning', 'Save', 'As', 'Air', 'Earth', 'Fire', 'Variable',
        'Small', 'Large', 'Huge', 'Needed', 'Unknown'
    }
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Skip empty lines, code blocks, headers
        if not stripped or stripped.startswith('```') or stripped.startswith('#'):
            continue
        
        # Check if this line is followed by "Armor Class:" within next 3 lines
        is_monster = False
        for j in range(i+1, min(i+4, len(lines))):
            if 'Armor Class:' in lines[j] or lines[j].strip().startswith('Armor Class:'):
                is_monster = True
                break
        
        if is_monster:
            # Clean up the name
            name = stripped
            # Remove trailing asterisks (for enchanted monsters)
            name = name.rstrip('*').strip()
            # Remove parenthetical notes but keep them for reference
            base_name = re.sub(r'\s*\([^)]+\)\s*', '', name).strip()
            
            # Skip if it's a known skip word
            first_word = base_name.split()[0] if base_name.split() else ''
            if first_word in skip_words or len(base_name) < 2:
                continue
            
            # Skip if it looks like a stat value (numbers, single letters)
            if re.match(r'^[\d\s\+\-\*\/\(\)]+$', base_name) or len(base_name) == 1:
                continue
            
            monster_names.append({
                'full_name': name,
                'base_name': base_name,
                'line': i+1
            })
    
    return monster_names

if __name__ == '__main__':
    names = extract_monster_names('docs/rules/monsters.md')
    
    print(f"Found {len(names)} potential monster names\n")
    print("First 50 monsters:")
    for i, m in enumerate(names[:50], 1):
        print(f"{i:3}. {m['base_name']:30} (line {m['line']:5}) - {m['full_name']}")
