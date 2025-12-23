# Hex Maps System Documentation

## Overview

The Hex Maps System provides a complete solution for creating, editing, and playing hex-based maps in the BECMI VTT. It includes:

- Full CRUD operations for hex maps
- Hex tile editing with terrain types
- Fog of war system for players
- Real-time synchronization during play
- DM tools for revealing hexes

## Database Schema

### Tables

1. **hex_maps** - Map metadata
   - `map_id`, `map_name`, `map_description`
   - `created_by_user_id`, `session_id` (optional)
   - `width_hexes`, `height_hexes`, `hex_size_pixels`
   - `background_image_url`, `is_active`

2. **hex_tiles** - Individual hex data
   - `tile_id`, `map_id`, `q`, `r` (axial coordinates)
   - `terrain_type`, `terrain_name`, `description`, `notes`
   - `image_url`, `elevation`, `is_passable`, `movement_cost`

3. **hex_visibility** - Player visibility tracking
   - `visibility_id`, `map_id`, `user_id`, `q`, `r`
   - `visibility_level` (0=hidden, 1=partial, 2=full)
   - `discovered_at`, `last_viewed_at`

4. **hex_player_positions** - Character positions
   - `position_id`, `map_id`, `character_id`, `q`, `r`

5. **hex_map_markers** - Map markers/notes
   - `marker_id`, `map_id`, `q`, `r`
   - `marker_type`, `marker_name`, `marker_description`
   - `is_visible_to_players`

## API Endpoints

### Map Management

- `POST /api/hex-maps/create.php` - Create new map
- `GET /api/hex-maps/list.php` - List accessible maps
- `GET /api/hex-maps/get.php` - Get map details
- `POST /api/hex-maps/update.php` - Update map metadata
- `POST /api/hex-maps/delete.php` - Delete map

### Tile Management

- `POST /api/hex-maps/tiles/create.php` - Create/update tile
- `POST /api/hex-maps/tiles/batch.php` - Batch create/update tiles
- `POST /api/hex-maps/tiles/delete.php` - Delete tile

### Play Mode

- `GET /api/hex-maps/play/get-visible.php` - Get visible hexes
- `POST /api/hex-maps/play/move.php` - Move character
- `POST /api/hex-maps/play/reveal.php` - DM reveals hexes

## Visibility System

### Visibility Levels

- **0 (Hidden)**: Fog of war - hex is not visible
- **1 (Partial)**: Neighbor visibility - player can see terrain type but not details
- **2 (Full)**: Current hex or revealed - player sees all details

### Visibility Rules

1. **Current Hex**: Always fully visible (level 2)
2. **Neighboring Hexes**: Automatically get partial visibility (level 1) when player is adjacent
3. **DM Reveal**: DM can reveal any hex to any player(s) at full visibility
4. **Travel Inference**: If player travels on two sides of a hex, they can infer the middle hex (future enhancement)

## Coordinate System

Uses **axial coordinates** (q, r) for hex grids:
- `q` = column-like coordinate
- `r` = row-like coordinate
- Distance formula: `(abs(q1-q2) + abs(q1+r1-q2-r2) + abs(r1-r2)) / 2`

## Real-Time Events

The system broadcasts events via the existing real-time system:

- `hex_map_player_moved` - When a character moves
- `hex_map_hexes_revealed` - When DM reveals hexes

## Frontend Modules

### HexMapEditorModule
- Map creation and editing
- Tile painting tools
- Terrain type selection
- Batch operations

### HexMapPlayModule
- Play mode viewer
- Fog of war rendering
- Character movement
- Real-time updates

## Future Enhancements

1. **Travel Inference**: Automatically reveal middle hex when traveling on two sides
2. **Line of Sight**: Calculate visibility based on terrain and elevation
3. **Map Markers**: Visual markers for points of interest
4. **Map Export/Import**: Save and load map files
5. **Hex Templates**: Pre-made terrain patterns
6. **Measurement Tools**: Distance and area calculation
