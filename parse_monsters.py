#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to parse monsters from docs/rules/monsters.md and compare with database
"""
import re
import sys

def parse_monsters_from_file(filename):
    """Parse all monsters from the markdown file"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    monsters = []
    lines = content.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Skip empty lines and code blocks
        if not line or line.startswith('```') or line.startswith('#'):
            i += 1
            continue
        
        # Look for monster name - must be followed by "Armor Class:" within next 5 lines
        # Pattern: "Actaeon (Elk Centaur)" or "Aerial Servant (Haoou)*"
        if re.match(r'^[A-Z][a-zA-Z\s\*]+(?:\([^)]+\))?\*?\s*$', line):
            monster_name = line.rstrip('*').strip()
            
            # Skip if it's clearly not a monster name (common false positives)
            skip_patterns = [
                'Monster', 'Monsters', 'Chapter', 'How to', 'Just as', 
                'Some', 'This', 'The', 'If', 'When', 'A', 'An', 'All',
                'Normal', 'Planar', 'Human', 'Dragon', 'Construct',
                'Undead', 'Lowlife', 'Giant', 'Animal', 'Humanoid',
                'Demihuman', 'Enchanted', 'Determine', 'Type of'
            ]
            if any(monster_name.startswith(p) for p in skip_patterns):
                i += 1
                continue
            
            # Look ahead for "Armor Class:" within next 5 lines
            found_ac = False
            for j in range(i + 1, min(i + 6, len(lines))):
                if 'Armor Class:' in lines[j] or lines[j].strip().startswith('Armor Class:'):
                    found_ac = True
                    break
            
            if found_ac:
                monster_data = {'name': monster_name}
                
                # Parse stats starting from the line with "Armor Class:"
                k = j
                while k < min(j + 25, len(lines)):
                    stat_line = lines[k].strip()
                    
                    if stat_line.startswith('Armor Class:'):
                        parts = stat_line.split(':', 1)
                        if len(parts) > 1 and parts[1].strip():
                            monster_data['armor_class'] = parts[1].strip()
                        elif k + 1 < len(lines):
                            next_val = lines[k+1].strip()
                            if next_val and not next_val.startswith('Hit Dice'):
                                monster_data['armor_class'] = next_val
                    
                    elif stat_line.startswith('Hit Dice:'):
                        parts = stat_line.split(':', 1)
                        if len(parts) > 1 and parts[1].strip():
                            hd = parts[1].strip()
                            # Clean up (remove size indicators in parentheses)
                            hd = re.sub(r'\s*\([^)]+\)\s*', '', hd).strip()
                            monster_data['hit_dice'] = hd
                        elif k + 1 < len(lines):
                            hd = lines[k+1].strip()
                            hd = re.sub(r'\s*\([^)]+\)\s*', '', hd).strip()
                            monster_data['hit_dice'] = hd
                    
                    elif stat_line.startswith('XP Value:') or stat_line.startswith('XPValue:'):
                        parts = stat_line.split(':', 1)
                        if len(parts) > 1:
                            xp_str = parts[1].strip()
                            # Clean up XP value (remove commas, spaces, etc)
                            xp_str = re.sub(r'[,\s]', '', xp_str)
                            # Handle cases like "4," which might be incomplete
                            if xp_str and xp_str.replace(',', '').isdigit():
                                xp_str = xp_str.replace(',', '')
                                if xp_str:
                                    monster_data['xp_value'] = int(xp_str)
                        elif k + 1 < len(lines):
                            xp_str = lines[k+1].strip()
                            xp_str = re.sub(r'[,\s]', '', xp_str)
                            if xp_str and xp_str.replace(',', '').isdigit():
                                xp_str = xp_str.replace(',', '')
                                if xp_str:
                                    monster_data['xp_value'] = int(xp_str)
                        # XP Value is usually near the end of stats
                        if 'hit_dice' in monster_data:
                            break
                    
                    k += 1
                
                # Only add if we have at least hit_dice
                if 'hit_dice' in monster_data and monster_data['hit_dice']:
                    monsters.append(monster_data)
        
        i += 1
    
    return monsters

if __name__ == '__main__':
    filename = 'docs/rules/monsters.md'
    monsters = parse_monsters_from_file(filename)
    
    print(f"Found {len(monsters)} monsters")
    print("\nFirst 20 monsters:")
    for m in monsters[:20]:
        name = m.get('name', 'Unknown')
        hd = m.get('hit_dice', '?')
        xp = m.get('xp_value', '?')
        print(f"  {name}: HD={hd}, XP={xp}")
