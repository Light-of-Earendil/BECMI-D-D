# Hex Map Editor - Input Fields Reference

## Map Properties Section

### 1. Map Name
- **Type**: Text input
- **Purpose**: The name/title of your hex map
- **Examples**: "Wilderness Map", "Dungeon Level 1", "Thornmark"
- **Required**: Yes
- **Character Limit**: 100 characters
- **Usage**: This is the primary identifier for your map

### 2. Description
- **Type**: Textarea (multi-line text)
- **Purpose**: Optional description or notes about the map
- **Examples**: "The main wilderness area north of the capital", "First level of the ancient dungeon"
- **Required**: No
- **Usage**: Helpful for organizing multiple maps or providing context

### 3. Width (hexes)
- **Type**: Number input
- **Purpose**: Number of hexes horizontally across the map
- **Range**: 1-200 hexes
- **Default**: 20
- **Usage**: Determines how wide your map is. Larger maps take longer to paint but offer more space.

### 4. Height (hexes)
- **Type**: Number input
- **Purpose**: Number of hexes vertically down the map
- **Range**: 1-200 hexes
- **Default**: 20
- **Usage**: Determines how tall your map is. Combined with width, this sets the total map size.

### 5. Hex Size (pixels)
- **Type**: Number input
- **Purpose**: Size of each individual hex in pixels
- **Range**: 10-200 pixels
- **Default**: 50 pixels
- **Usage**: 
  - Smaller values (10-30): More hexes visible, less detail per hex
  - Medium values (40-60): Good balance for most maps
  - Larger values (70-200): Fewer hexes visible, more detail per hex, better for close-up work
- **Note**: Changing this affects how the map displays but doesn't change the actual map data

## Terrain Types Section

This section shows available terrain types you can paint on the map. Each terrain has:
- **Color indicator**: Shows what color the terrain will appear on the map
- **Name**: The terrain type name
- **Selection**: Click to select (highlighted in green when active)

Available terrain types:
- **Plains**: Light green - Open grasslands, fields
- **Forest**: Dark green - Dense woodland
- **Mountain**: Gray - Rocky peaks, impassable terrain
- **Water**: Blue - Rivers, lakes, oceans
- **Desert**: Tan/Sandy - Arid wasteland
- **Swamp**: Dark green-brown - Marshland, difficult terrain
- **Hill**: Brown - Rolling hills, elevated ground
- **Road**: Beige - Paths, roads, trails

## Tools Section

Three tools for editing:
- **Paint**: Click/drag to paint selected terrain type on hexes
- **Erase**: Click/drag to remove terrain from hexes (makes them empty)
- **Select**: Click hexes to select them (for future batch operations)
