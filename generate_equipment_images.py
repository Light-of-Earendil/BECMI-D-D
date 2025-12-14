#!/usr/bin/env python3
"""
BECMI VTT Equipment Image Generator
Generates photorealistic medieval images for all equipment items using Together AI API.
"""

import os
import sys
import time
import json
import base64
import requests
import mysql.connector
from pathlib import Path
from typing import Dict, List, Optional

# Configuration
WORKSPACE_ROOT = Path(__file__).parent
IMAGE_BASE_DIR = WORKSPACE_ROOT / "public" / "images" / "equipment"
CONFIG_FILE = WORKSPACE_ROOT / "config" / "together-ai.php"

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'snilld_dk_db',
    'password': 'UbqMz8JW4vPG3A',
    'database': 'becmi_vtt'
}

# Together AI API
TOGETHER_API_URL = "https://api.together.xyz/v1/images/generations"
MODEL = "black-forest-labs/FLUX.1-schnell-Free"
DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1024  # Square format better for items
DEFAULT_STEPS = 8  # Increased for better quality
RATE_LIMIT_DELAY = 3  # seconds between requests

# Negative prompt to avoid unwanted elements
NEGATIVE_PROMPT = "blurry, low quality, distorted, watermark, text, people, hands, background clutter, shadows, multiple items, cluttered"


def get_api_key() -> str:
    """Read Together AI API key from config file."""
    try:
        with open(CONFIG_FILE, 'r') as f:
            content = f.read()
            # Extract API key from PHP file
            for line in content.split('\n'):
                if 'together_AI_api_key' in line and '=' in line:
                    key = line.split('=')[1].strip().strip('";\'')
                    return key
    except Exception as e:
        print(f"Error reading API key: {e}")
        sys.exit(1)
    
    print("API key not found in config file")
    sys.exit(1)


def get_db_connection():
    """Create database connection."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as e:
        print(f"Database connection error: {e}")
        sys.exit(1)


def get_items_without_images() -> List[Dict]:
    """Fetch all items without images from database."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT item_id, name, description, item_type, item_category, 
               weapon_type, armor_type, size_category
        FROM items 
        WHERE image_url IS NULL OR image_url = ''
        ORDER BY item_id
    """
    
    cursor.execute(query)
    items = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return items


def get_all_items() -> List[Dict]:
    """Fetch ALL items from database (for regeneration)."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT item_id, name, description, item_type, item_category, 
               weapon_type, armor_type, size_category, image_url
        FROM items 
        ORDER BY item_id
    """
    
    cursor.execute(query)
    items = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return items


def generate_prompt(item: Dict) -> str:
    """
    Generate detailed prompt for equipment image.
    This is where we have full control over image generation.
    """
    item_type = item['item_type']
    item_name = item['name']
    description = item.get('description', '')
    
    # Base prompt elements
    base = "Photorealistic medieval"
    quality = "isolated on clean white background, professional product photography, studio lighting, highly detailed, museum quality, 8K resolution, sharp focus, no blur, no distortion, no watermark"
    
    # Type-specific prompts
    if item_type == 'weapon':
        weapon_type = item.get('weapon_type', '')
        
        # Specific weapon prompts
        if 'sword' in item_name.lower():
            return f"{base} {item_name}, {quality}, gleaming steel blade with leather-wrapped grip and ornate crossguard, professional weapon photography"
        elif 'axe' in item_name.lower():
            return f"{base} {item_name}, {quality}, sharp steel axe head with wooden handle, professional weapon photography"
        elif 'bow' in item_name.lower():
            return f"{base} {item_name}, {quality}, curved wooden bow with string, professional weapon photography"
        elif 'crossbow' in item_name.lower():
            return f"{base} {item_name}, {quality}, mechanical crossbow with wooden stock and steel mechanism, professional weapon photography"
        elif 'dagger' in item_name.lower():
            return f"{base} {item_name}, {quality}, small sharp blade with wrapped grip, professional weapon photography"
        elif 'mace' in item_name.lower():
            return f"{base} {item_name}, {quality}, heavy metal mace head with wooden handle, professional weapon photography"
        elif 'hammer' in item_name.lower():
            return f"{base} {item_name}, {quality}, war hammer with steel head and wooden handle, professional weapon photography"
        elif 'spear' in item_name.lower():
            return f"{base} {item_name}, {quality}, long wooden shaft with sharp metal spearhead, professional weapon photography"
        elif 'staff' in item_name.lower():
            return f"{base} {item_name}, {quality}, simple wooden quarterstaff, professional weapon photography"
        elif 'pole' in item_name.lower():
            return f"{base} {item_name}, {quality}, long polearm with metal blade on wooden shaft, professional weapon photography"
        elif 'javelin' in item_name.lower():
            return f"{base} {item_name}, {quality}, throwing spear with metal tip, professional weapon photography"
        elif 'sling' in item_name.lower():
            return f"{base} leather sling, {quality}, simple leather strap for throwing stones, professional weapon photography"
        elif 'blowgun' in item_name.lower():
            return f"{base} {item_name}, {quality}, hollow wooden tube for shooting darts, professional weapon photography"
        elif 'club' in item_name.lower() or 'blackjack' in item_name.lower():
            return f"{base} {item_name}, {quality}, weighted club for striking, professional weapon photography"
        else:
            return f"{base} {item_name} weapon, {quality}, professional weapon photography, {description}"
    
    elif item_type == 'armor':
        armor_type = item.get('armor_type', '')
        
        if 'leather' in item_name.lower():
            return f"{base} leather armor, {quality}, hardened leather cuirass with straps and buckles, displayed on mannequin or stand, professional museum display"
        elif 'chain' in item_name.lower():
            return f"{base} chain mail armor, {quality}, interlocking metal rings forming protective coat, displayed on mannequin or stand, professional museum display"
        elif 'plate' in item_name.lower():
            return f"{base} plate armor, {quality}, polished steel plate armor pieces, displayed on mannequin or stand, professional museum display"
        elif 'scale' in item_name.lower():
            return f"{base} scale mail armor, {quality}, overlapping metal scales on leather backing, displayed on mannequin or stand, professional museum display"
        elif 'banded' in item_name.lower():
            return f"{base} banded mail armor, {quality}, metal bands on leather backing, displayed on mannequin or stand, professional museum display"
        elif 'suit' in item_name.lower():
            return f"{base} full plate armor suit, {quality}, complete medieval knight armor, displayed on mannequin or stand, professional museum display"
        else:
            return f"{base} {item_name}, {quality}, protective armor piece, displayed on mannequin or stand, professional museum display"
    
    elif item_type == 'shield':
        return f"{base} {item_name}, {quality}, wooden shield with metal boss and leather straps, displayed on stand, professional museum display"
    
    elif item_type == 'gear':
        # Specific gear prompts
        if 'rope' in item_name.lower():
            return f"{base} coiled hemp rope, {quality}, thick twisted rope coil, clean background, professional photography"
        elif 'torch' in item_name.lower():
            return f"{base} wooden torch with flames, {quality}, wooden handle with burning oil-soaked cloth, warm firelight, clean background, professional photography"
        elif 'backpack' in item_name.lower():
            return f"{base} leather backpack, {quality}, brown leather adventuring pack with straps and buckles, clean background, professional photography"
        elif 'bedroll' in item_name.lower():
            return f"{base} bedroll, {quality}, rolled sleeping blanket tied with leather straps, clean background, professional photography"
        elif 'tinderbox' in item_name.lower() or 'flint' in item_name.lower():
            return f"{base} tinderbox with flint and steel, {quality}, small wooden box with flint stone and steel striker and dry tinder, clean background, professional photography"
        elif 'waterskin' in item_name.lower() or 'wineskin' in item_name.lower():
            return f"{base} leather waterskin, {quality}, leather water container with cork stopper, clean background, professional photography"
        elif 'rations' in item_name.lower():
            return f"{base} travel rations, {quality}, dried food provisions in cloth wrapping, clean background, professional photography"
        elif 'lantern' in item_name.lower():
            return f"{base} {item_name}, {quality}, metal lantern with glass panes and oil reservoir, clean background, professional photography"
        elif 'pouch' in item_name.lower():
            return f"{base} leather pouch, {quality}, small leather belt pouch with drawstring, clean background, professional photography"
        elif 'sack' in item_name.lower():
            return f"{base} {item_name}, {quality}, large cloth or burlap sack, clean background, professional photography"
        elif 'flask' in item_name.lower() or 'vial' in item_name.lower():
            return f"{base} glass {item_name}, {quality}, small glass container with cork stopper, clean background, professional photography"
        elif 'holy' in item_name.lower():
            return f"{base} holy symbol, {quality}, ornate religious symbol on chain, clean background, professional photography"
        elif 'mirror' in item_name.lower():
            return f"{base} hand mirror, {quality}, polished metal mirror in decorative frame, clean background, professional photography"
        elif 'crowbar' in item_name.lower():
            return f"{base} iron crowbar, {quality}, heavy iron prying tool, clean background, professional photography"
        elif 'spike' in item_name.lower():
            return f"{base} iron spikes, {quality}, metal pitons for climbing, clean background, professional photography"
        elif 'grappling' in item_name.lower():
            return f"{base} grappling hook, {quality}, metal hook with rope attached, clean background, professional photography"
        else:
            return f"{base} {item_name}, {quality}, adventuring gear equipment, clean background, professional photography"
    
    elif item_type == 'consumable':
        if 'oil' in item_name.lower():
            return f"{base} oil flask, {quality}, glass flask containing lamp oil or burning oil, clean background, professional photography"
        elif 'potion' in item_name.lower():
            return f"{base} {item_name}, {quality}, glass vial with magical liquid, clean background, professional photography"
        elif 'holy water' in item_name.lower():
            return f"{base} holy water vial, {quality}, blessed water in ornate glass vial, clean background, professional photography"
        else:
            return f"{base} {item_name}, {quality}, clean background, professional photography, {description}"
    
    # Default fallback
    return f"{base} {item_name}, {quality}, medieval equipment item, clean background, professional photography, {description}"


def get_image_subdirectory(item_type: str) -> str:
    """Get subdirectory for item type."""
    subdirs = {
        'weapon': 'weapons',
        'armor': 'armor',
        'shield': 'shields',
        'gear': 'gear',
        'consumable': 'consumables'
    }
    return subdirs.get(item_type, 'gear')


def generate_image(item: Dict, api_key: str) -> Optional[str]:
    """
    Generate image using Together AI API.
    Returns the image path if successful, None otherwise.
    """
    item_id = item['item_id']
    item_type = item['item_type']
    item_name = item['name']
    
    # Generate prompt
    prompt = generate_prompt(item)
    
    print(f"\n{'='*80}")
    print(f"Generating image for: {item_name} (ID: {item_id})")
    print(f"Type: {item_type}")
    print(f"Prompt: {prompt}")
    print(f"{'='*80}")
    
    # Prepare API request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "width": DEFAULT_WIDTH,
        "height": DEFAULT_HEIGHT,
        "steps": DEFAULT_STEPS,
        "n": 1,
        "response_format": "b64_json",
        "negative_prompt": NEGATIVE_PROMPT
    }
    
    try:
        # Make API request
        response = requests.post(TOGETHER_API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract base64 image
        if 'data' in data and len(data['data']) > 0:
            b64_image = data['data'][0]['b64_json']
            
            # Decode and save image
            image_data = base64.b64decode(b64_image)
            
            # Determine save path
            subdir = get_image_subdirectory(item_type)
            image_dir = IMAGE_BASE_DIR / subdir
            image_dir.mkdir(parents=True, exist_ok=True)
            
            # Sanitize filename
            safe_name = item_name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace("'", '')
            filename = f"equipment_{item_id}_{safe_name}.png"
            filepath = image_dir / filename
            
            # Save image
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            # Return relative URL path
            relative_path = f"/images/equipment/{subdir}/{filename}"
            
            print(f"✓ Image saved: {filepath}")
            print(f"✓ URL: {relative_path}")
            
            return relative_path
        else:
            print(f"✗ No image data in response")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"✗ API request failed: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return None
    except Exception as e:
        print(f"✗ Error: {e}")
        return None


def update_item_image_url(item_id: int, image_url: str) -> bool:
    """Update item's image_url in database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "UPDATE items SET image_url = %s WHERE item_id = %s"
        cursor.execute(query, (image_url, item_id))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        print(f"✓ Database updated for item {item_id}")
        return True
        
    except mysql.connector.Error as e:
        print(f"✗ Database error: {e}")
        return False


def main():
    """Main execution function."""
    print("="*80)
    print("BECMI VTT Equipment Image Generator")
    print("="*80)
    
    # Get API key
    api_key = get_api_key()
    print(f"✓ API key loaded")
    
    # Get items without images
    items = get_items_without_images()
    total_items = len(items)
    
    print(f"\n✓ Found {total_items} items without images\n")
    
    if total_items == 0:
        print("No items need images. All done!")
        return
    
    # Ask for confirmation
    print("Items to generate:")
    for i, item in enumerate(items[:10], 1):
        print(f"  {i}. {item['name']} (ID: {item['item_id']}, Type: {item['item_type']})")
    
    if total_items > 10:
        print(f"  ... and {total_items - 10} more")
    
    print(f"\nThis will generate {total_items} images.")
    print(f"Estimated time: {total_items * RATE_LIMIT_DELAY / 60:.1f} minutes")
    
    response = input("\nProceed? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return
    
    # Process each item
    success_count = 0
    error_count = 0
    
    for i, item in enumerate(items, 1):
        print(f"\n[{i}/{total_items}] Processing: {item['name']}...")
        
        # Generate image
        image_url = generate_image(item, api_key)
        
        if image_url:
            # Update database
            if update_item_image_url(item['item_id'], image_url):
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1
        
        # Rate limiting - wait between requests
        if i < total_items:
            print(f"Waiting {RATE_LIMIT_DELAY} seconds before next request...")
            time.sleep(RATE_LIMIT_DELAY)
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total items: {total_items}")
    print(f"Success: {success_count}")
    print(f"Errors: {error_count}")
    print("="*80)


def regenerate_all():
    """Regenerate images for ALL items (even those with existing images)."""
    print("="*80)
    print("REGENERATE ALL EQUIPMENT IMAGES")
    print("="*80)
    print("\n⚠️  WARNING: This will regenerate ALL equipment images!")
    print("This will overwrite existing images.\n")
    
    response = input("Are you sure? (yes/no): ")
    if response.lower() != 'yes':
        print("Cancelled.")
        return
    
    # Get API key
    api_key = get_api_key()
    print(f"✓ API key loaded")
    
    # Get ALL items
    items = get_all_items()
    total_items = len(items)
    
    print(f"\n✓ Found {total_items} total items\n")
    
    # Process each item
    success_count = 0
    error_count = 0
    
    for i, item in enumerate(items, 1):
        print(f"\n[{i}/{total_items}] Processing: {item['name']}...")
        
        # Generate image
        image_url = generate_image(item, api_key)
        
        if image_url:
            # Update database
            if update_item_image_url(item['item_id'], image_url):
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1
        
        # Rate limiting
        if i < total_items:
            print(f"Waiting {RATE_LIMIT_DELAY} seconds...")
            time.sleep(RATE_LIMIT_DELAY)
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total items: {total_items}")
    print(f"Success: {success_count}")
    print(f"Errors: {error_count}")
    print("="*80)


def test_single_item(item_id: int):
    """Test image generation for a single item."""
    print(f"Testing image generation for item ID: {item_id}")
    
    # Get API key
    api_key = get_api_key()
    
    # Get item from database
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT item_id, name, description, item_type, item_category, 
               weapon_type, armor_type, size_category
        FROM items 
        WHERE item_id = %s
    """
    
    cursor.execute(query, (item_id,))
    item = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if not item:
        print(f"Item {item_id} not found")
        return
    
    # Generate image
    image_url = generate_image(item, api_key)
    
    if image_url:
        # Update database
        update_item_image_url(item['item_id'], image_url)
        print(f"\n✓ Success! Image URL: {image_url}")
    else:
        print(f"\n✗ Failed to generate image")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "regenerate":
            regenerate_all()
        elif command == "test" and len(sys.argv) > 2:
            item_id = int(sys.argv[2])
            test_single_item(item_id)
        else:
            print("Usage:")
            print("  python generate_equipment_images.py           - Generate missing images")
            print("  python generate_equipment_images.py regenerate - Regenerate ALL images")
            print("  python generate_equipment_images.py test <id>  - Test single item")
    else:
        main()

