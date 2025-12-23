# How to Create Hex Maps

## Quick Start Guide

### Step 1: Access the Hex Map Editor

1. **Log in** to the BECMI VTT system
2. Click on **"Hex Maps"** in the main navigation menu
3. You'll see the Hex Map Editor interface

### Step 2: Create a New Map

1. Click the **"New Map"** button (top right or in the empty state)
2. Enter a **map name** (e.g., "Wilderness Map", "Dungeon Level 1")
3. The map will be created with default settings:
   - Width: 20 hexes
   - Height: 20 hexes
   - Hex size: 50 pixels

### Step 3: Edit Map Properties (Optional)

In the left sidebar, you can adjust:
- **Map Name**: Change the name
- **Description**: Add a description
- **Width**: Number of hexes horizontally (1-200)
- **Height**: Number of hexes vertically (1-200)

### Step 4: Paint Terrain

1. **Select a terrain type** from the terrain palette in the sidebar:
   - Plains (green)
   - Forest (dark green)
   - Mountain (gray)
   - Water (blue)
   - Desert (tan)
   - Swamp (dark green)
   - Hill (brown)
   - Road (beige)

2. **Click and drag** on the hex grid to paint terrain
   - Each hex you click will be painted with the selected terrain type
   - You can paint multiple hexes by dragging

3. **Use tools**:
   - **Paint Tool**: Paint terrain (default)
   - **Erase Tool**: Remove terrain from hexes
   - **Select Tool**: Select hexes for detailed editing

### Step 5: Save Your Map

1. Click the **"Save"** button in the top right
2. Your map and all tiles will be saved to the database
3. You can continue editing and save again anytime

### Step 6: Link to Session (Optional)

When creating or editing a map, you can optionally link it to a game session:
- Maps linked to sessions are accessible to all players in that session
- DMs can edit maps linked to their sessions
- Players can view maps in play mode during active sessions

## Advanced Features

### Batch Operations

For large areas, you can use the batch tile API to paint multiple hexes at once. This is useful for:
- Creating large forests
- Painting rivers or roads
- Setting up terrain patterns

### Terrain Properties

Each hex can have:
- **Terrain Type**: Visual appearance
- **Terrain Name**: Optional name (e.g., "Darkwood Forest")
- **Description**: DM notes visible in play mode
- **Elevation**: Height in feet
- **Passable**: Whether characters can move through
- **Movement Cost**: Cost to enter (1 = normal, 2 = difficult, etc.)

### Map Markers

You can add markers to hexes for:
- Points of interest
- Encounter locations
- Treasure locations
- Notes for the DM

## Play Mode

Once your map is created:

1. Click **"Play Mode"** button
2. **DMs** see the entire map with all details
3. **Players** see only:
   - Their current hex (fully visible)
   - Neighboring hexes (terrain type only)
   - Previously revealed hexes

### Moving Characters

- **Players**: Click on a hex to move your character there
- **DMs**: Can move any character by clicking on their position

### Revealing Hexes (DM Only)

1. Click **"Reveal Hexes"** button
2. Enter hex coordinates (format: `q,r` or `q1,r1;q2,r2` for multiple)
3. Hexes will be revealed to all players in the session

## Tips & Best Practices

1. **Start Small**: Begin with a 20x20 map to get familiar with the tools
2. **Plan Your Layout**: Sketch out your map on paper first
3. **Use Terrain Variety**: Mix different terrain types for interesting maps
4. **Save Frequently**: Save your work regularly
5. **Test in Play Mode**: Switch to play mode to see how it looks to players
6. **Link to Sessions**: Link maps to sessions so players can access them

## Troubleshooting

### Map Not Loading
- Check that you're logged in
- Verify you have permission to access the map
- Refresh the page

### Can't Paint Tiles
- Make sure you've selected a terrain type
- Check that the Paint tool is selected
- Try clicking directly on hex centers

### Changes Not Saving
- Check your internet connection
- Look for error messages in the browser console
- Try saving again

## Keyboard Shortcuts

- **Zoom In**: Use zoom controls or mouse wheel
- **Zoom Out**: Use zoom controls or mouse wheel
- **Reset View**: Click "Reset View" button
- **Save**: Click Save button (Ctrl+S support coming soon)

## Next Steps

After creating your map:
1. Link it to a game session
2. Position characters on the map
3. Start playing and revealing hexes as players explore!
