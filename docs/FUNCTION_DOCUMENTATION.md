# BECMI VTT - Complete Function Documentation

This document provides comprehensive documentation for all JavaScript and PHP functions in the BECMI VTT system.

**Last Updated:** 2025-01-XX  
**Documentation Standard:** JSDoc (JavaScript) / PHPDoc (PHP)

---

## Table of Contents

1. [JavaScript Modules](#javascript-modules)
   - [Hex Map Editor Module](#hex-map-editor-module)
   - [Hex Map Play Module](#hex-map-play-module)
   - [Character Creation Module](#character-creation-module)
   - [Character Sheet Module](#character-sheet-module)
   - [DM Dashboard Module](#dm-dashboard-module)
   - [Session Management Module](#session-management-module)
   - [Equipment Module](#equipment-module)
   - [Level Up Wizard](#level-up-wizard)
   - [Other Modules](#other-modules)

2. [PHP API Endpoints](#php-api-endpoints)
   - [Hex Maps API](#hex-maps-api)
   - [Character API](#character-api)
   - [Session API](#session-api)
   - [Spells API](#spells-api)
   - [Inventory API](#inventory-api)
   - [Combat API](#combat-api)
   - [Items API](#items-api)
   - [Auth API](#auth-api)

3. [PHP Service Classes](#php-service-classes)
   - [BECMI Rules Engine](#becmi-rules-engine)
   - [Event Broadcaster](#event-broadcaster)
   - [Portrait Manager](#portrait-manager)
   - [Email Service](#email-service)

---

## JavaScript Modules

### Hex Map Editor Module

**File:** `public/js/modules/hex-map-editor.js`  
**Class:** `HexMapEditorModule`  
**Purpose:** Provides DM with tools to create and edit hex maps with full CRUD support.

#### Constructor

```javascript
constructor(app)
```

**Description:** Initializes the hex map editor module with all necessary state and configuration.

**Parameters:**
- `app` (Object) - Main application instance containing API client and other modules

**Returns:** `HexMapEditorModule` instance

**Called From:** Main application initialization (`app.js`)

**State Initialized:**
- `this.tiles` - Map of "q,r" -> tile data
- `this.markers` - Map of "q,r" -> marker data
- `this.selectedTool` - Current tool ('paint', 'erase', 'place_road', etc.)
- `this.terrainImageScales` - Map of terrain types to their zoom scales
- Canvas rendering state (zoom, offset, pan)

---

#### loadTerrainImages()

```javascript
loadTerrainImages()
```

**Description:** Preloads all terrain icon images into memory cache for fast rendering.

**Parameters:** None

**Returns:** `void`

**Called From:** Constructor

**Side Effects:**
- Creates `Image` objects for each terrain type
- Stores images in `this.terrainImages` Map
- Images are loaded from `/images/terrain-icons/` directory

**Terrain Types Loaded:**
- Jungle (rainforest, hills, mountains)
- Plains/grasslands
- Hills (grassy, regular)
- Mountains (regular, peak, high, high peak)
- Swamp/marsh
- Beach/dunes
- Desert (regular, rocky, hills, mountains)
- Forests (light/heavy, deciduous/coniferous, forested hills/mountains)
- Farmland

---

#### renderEditor(mapId)

```javascript
async renderEditor(mapId = null)
```

**Description:** Renders the hex map editor interface. If `mapId` is provided, loads that map; otherwise shows map list.

**Parameters:**
- `mapId` (number|null, optional) - ID of map to load, or null to show list

**Returns:** `Promise<void>`

**Called From:**
- Route handler when navigating to `/hex-map-editor/:mapId`
- Map list item click handler

**API Calls:**
- `GET /api/hex-maps/list.php` - Fetches all maps for list view
- `GET /api/hex-maps/get.php?id={mapId}` - Fetches specific map data

**UI Elements Created:**
- Canvas for hex grid rendering
- Terrain palette
- Tool buttons (paint, erase, place road, etc.)
- Border tools
- Settlement placement tools

---

#### renderMapList(maps)

```javascript
renderMapList(maps)
```

**Description:** Renders the list of available hex maps in a grid layout.

**Parameters:**
- `maps` (Array<Object>) - Array of map objects with metadata

**Returns:** `string` - HTML string for map list

**Called From:** `renderEditor()` when no `mapId` is provided

**UI Elements:**
- Map cards with name, description, dimensions
- Edit and Play buttons for each map
- Session badge if map is linked to a session

---

#### renderEditorCanvas()

```javascript
renderEditorCanvas()
```

**Description:** Renders the editor interface HTML including sidebar and canvas container.

**Parameters:** None

**Returns:** `string` - HTML string for editor interface

**Called From:** `renderEditor()` when `mapId` is provided

**UI Sections:**
- Map Properties (name, description, dimensions, hex size)
- Terrain Palette (all terrain types)
- Tools (paint, erase, select)
- Settlements (village, town, city, castle, fort, ruins)
- Borders (local, regional, national, erase)
- Roads (place, erase)
- Canvas with zoom controls

---

#### renderTerrainPalette()

```javascript
renderTerrainPalette()
```

**Description:** Renders the terrain type selection palette with icons and colors.

**Parameters:** None

**Returns:** `string` - HTML string for terrain palette

**Called From:** `renderEditorCanvas()`

**Terrain Types Included:**
- Basic: plains, farmland, hills, mountains
- Jungle: rainforest, jungle-hills, jungle-mountains
- Forest: light/heavy deciduous/coniferous, forested hills/mountains
- Desert: regular, rocky, desert-hills, desert-mountains
- Water/Wetlands: swamp, marsh, beach-dunes
- High elevation: mountain-peak, high-mountains, high-mountain-peak

**Each terrain item includes:**
- Color swatch
- Font Awesome icon
- Terrain name
- Click handler to select terrain

---

#### loadMarkers()

```javascript
async loadMarkers()
```

**Description:** Loads all markers (settlements, POIs) for the current map.

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:**
- `renderEditor()` after loading map
- After placing new marker
- After deleting marker

**API Calls:**
- `GET /api/hex-maps/markers/list.php?map_id={mapId}`

**Side Effects:**
- Populates `this.markers` Map with marker data
- Key format: `"q,r"` -> marker object

---

#### setupEventListeners()

```javascript
setupEventListeners()
```

**Description:** Sets up all event listeners for the editor interface.

**Parameters:** None

**Returns:** `void`

**Called From:** `renderEditor()` after rendering canvas

**Event Handlers:**
- Map selector change
- New map button
- Edit map button
- Delete marker (right-click)
- Play map button
- Save map button
- Terrain selection
- Tool selection
- Settlement placement
- Border tools
- Road tools
- Canvas interactions (handled in `initCanvas()`)

---

#### initCanvas()

```javascript
initCanvas()
```

**Description:** Initializes the canvas element and sets up all mouse/wheel event handlers.

**Parameters:** None

**Returns:** `void`

**Called From:** `renderEditor()` after canvas is created

**Initialization:**
- Sets canvas size to container dimensions
- Centers map on first load
- Sets up resize handler
- Configures mouse events (mousedown, mousemove, mouseup, mouseleave)
- Configures wheel zoom
- Sets up hex size input handler
- Sets up coordinate display toggle

**Mouse Events:**
- Middle button or Shift+left: Pan
- Left click: Paint/place/erase based on selected tool
- Right click: Delete marker (context menu)
- Mouse wheel: Zoom

---

#### handleWheelZoom(e, canvas)

```javascript
handleWheelZoom(e, canvas)
```

**Description:** Handles mouse wheel zoom with zoom-towards-mouse-position behavior.

**Parameters:**
- `e` (WheelEvent) - Mouse wheel event
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `void`

**Called From:** Canvas wheel event listener

**Behavior:**
- Scroll up: Zoom in (1.1x)
- Scroll down: Zoom out (0.9x)
- Adjusts offset to zoom towards mouse cursor position
- Respects `minZoom` and `maxZoom` limits

**Algorithm:**
1. Calculates mouse position in canvas coordinates
2. Calculates zoom point in world coordinates
3. Applies zoom factor
4. Adjusts offset to keep zoom point under cursor

---

#### updateCanvasInfo()

```javascript
updateCanvasInfo()
```

**Description:** Updates the canvas info display with current zoom level.

**Parameters:** None

**Returns:** `void`

**Called From:**
- `zoomIn()`
- `zoomOut()`
- `resetView()`
- `handleWheelZoom()`

**Display Format:**
- `"Zoom: 144% | Shift+Drag to pan | Mouse wheel to zoom"`

---

#### hexRound(q, r)

```javascript
hexRound(q, r)
```

**Description:** Rounds fractional hex coordinates to nearest valid hex using axial coordinate rounding algorithm.

**Parameters:**
- `q` (number) - Fractional hex column coordinate
- `r` (number) - Fractional hex row coordinate

**Returns:** `Object` - `{q: number, r: number}` rounded hex coordinates

**Called From:** `pixelToHex()` after coordinate conversion

**Algorithm:**
1. Calculates third coordinate `s = -q - r`
2. Rounds all three coordinates
3. Checks which coordinate has largest rounding error
4. Recalculates that coordinate from the other two to maintain constraint `q + r + s = 0`

**Purpose:** Ensures pixel clicks always map to valid hex coordinates

---

#### drawEdgeHoverFeedback(ctx, q, r, edge)

```javascript
drawEdgeHoverFeedback(ctx, q, r, edge)
```

**Description:** Draws visual feedback highlighting a hex edge when hovering with border/road tools.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate
- `edge` (number) - Edge index (0-5)

**Returns:** `void`

**Called From:** `drawHexGrid()` when hover hex and edge are detected

**Visual Feedback:**
- Erase tools: Red highlight
- Place road: Brown highlight
- Draw border: Color based on selected border type
- Line width scales with zoom

---

#### handleMouseDown(e, canvas)

```javascript
handleMouseDown(e, canvas)
```

**Description:** Handles mouse down events on canvas, routing to appropriate tool handler.

**Parameters:**
- `e` (MouseEvent) - Mouse event
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `void`

**Called From:** Canvas mousedown event listener (left click only)

**Tool Routing:**
- `place_settlement` → `placeSettlement()`
- `erase` → `eraseHex()`
- `draw_border` / `erase_border` → `toggleBorder()` (after edge detection)
- `place_road` → `handleRoadPlacement()`
- `erase_road` → `eraseRoadFromHex()`
- `paint` → `paintHex()` (sets `isDrawing = true` for drag painting)

**Coordinate Conversion:**
- Converts mouse pixel coordinates to canvas coordinates
- Accounts for canvas scaling
- Converts to hex coordinates via `pixelToHex()`

---

#### showNewMapDialog()

```javascript
showNewMapDialog()
```

**Description:** Shows dialog to create a new hex map (simple prompt implementation).

**Parameters:** None

**Returns:** `void`

**Called From:** "New Map" button click handler

**Behavior:**
- Prompts for map name
- Creates map with default dimensions (20x20 hexes)
- Calls `createMap()` with entered data

**Future Enhancement:** Replace with proper modal dialog

---

#### loadMap(mapId)

```javascript
async loadMap(mapId)
```

**Description:** Loads a hex map and all its tiles and markers from the API.

**Parameters:**
- `mapId` (number) - ID of the map to load

**Returns:** `Promise<void>`

**Called From:**
- `renderEditor()` when `mapId` is provided
- Map selection from list

**API Calls:**
- `GET /api/hex-maps/get.php?id={mapId}` - Fetches map metadata and tiles
- `GET /api/hex-maps/markers/list.php?map_id={mapId}` - Fetches all markers

**Data Parsing:**
- Converts JSON string borders/roads to objects if needed
- Populates `this.tiles` Map with tile data
- Populates `this.markers` Map with marker data
- Tracks initial tile keys in `this.initialTileKeys` for deletion detection

**Side Effects:**
- Clears existing tiles and markers
- Triggers canvas redraw via `drawHexGrid()`

---

#### pixelToHex(x, y)

```javascript
pixelToHex(x, y)
```

**Description:** Converts pixel coordinates to hex grid coordinates (axial system).

**Parameters:**
- `x` (number) - Pixel X coordinate (canvas space)
- `y` (number) - Pixel Y coordinate (canvas space)

**Returns:** `Object` - `{q: number, r: number}` hex coordinates

**Called From:**
- Mouse click handlers
- Mouse move handlers
- All canvas interaction functions

**Algorithm:**
1. Adjusts for canvas offset and zoom
2. Uses axial coordinate conversion formula
3. Rounds to nearest hex using `hexRound()`

**Coordinate System:**
- Uses axial coordinates (q, r) for hex grids
- q = column-like coordinate
- r = row-like coordinate

---

#### hexToPixel(q, r)

```javascript
hexToPixel(q, r)
```

**Description:** Converts hex grid coordinates to pixel coordinates (canvas space).

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate

**Returns:** `Object` - `{x: number, y: number}` pixel coordinates

**Called From:**
- `drawHex()` - To position hex shapes
- `drawMarker()` - To position markers
- `drawRoads()` - To draw road lines
- All rendering functions

**Algorithm:**
- Uses pointy-top hex layout formula
- Accounts for zoom and offset
- Returns center point of hex

---

#### drawHexGrid(ctx)

```javascript
drawHexGrid(ctx)
```

**Description:** Main rendering function that draws the entire hex map grid with all tiles, terrain, roads, borders, and markers.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context

**Returns:** `void`

**Called From:**
- Canvas initialization
- After any map modification (paint, erase, road placement, etc.)
- After zoom/pan operations
- After loading map data

**Rendering Order:**
1. Background (dark color)
2. Empty hexes (grid outline only)
3. Painted hexes with terrain images
4. Roads (center-to-center connections)
5. Borders (colored lines on edges)
6. Markers (settlements, POIs)
7. Hover feedback (if applicable)

**Performance:**
- Only draws hexes visible in viewport
- Uses efficient Map iteration
- Caches terrain images

---

#### drawHex(ctx, q, r, tile)

```javascript
drawHex(ctx, q, r, tile)
```

**Description:** Draws a single hex cell with terrain image, borders, and optional coordinates.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate
- `tile` (Object|null) - Tile data object or null for empty hex

**Returns:** `void`

**Called From:** `drawHexGrid()`

**Rendering Steps:**
1. Draws hex path (6-sided polygon)
2. If tile has terrain_type:
   - Clips canvas to hex shape
   - Draws terrain image with configurable scale
   - Restores context
3. Draws borders on edges (if present)
4. Draws coordinate text (if debug mode enabled)

**Terrain Image Scaling:**
- Uses `terrainImageScales` Map for per-terrain-type scaling
- Falls back to `terrainImageScaleDefault`
- Respects `terrainImageMaxSize` to prevent overflow

---

#### drawRoads(ctx, q, r, roads)

```javascript
drawRoads(ctx, q, r, roads)
```

**Description:** Draws roads connecting hex centers. Roads are stored as neighbor indices.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate
- `roads` (Object) - Road data object: `{neighborIndex: true, ...}`

**Returns:** `void`

**Called From:** `drawHexGrid()`

**Road Storage:**
- Roads are stored as `{0: true, 1: true}` where keys are neighbor indices
- Neighbor 0 = top, 1 = top-right, 2 = bottom-right, 3 = bottom, 4 = bottom-left, 5 = top-left
- Each road connects from hex center to neighbor hex center

**Rendering:**
- Draws brown lines from center to center
- If neighbor doesn't exist, draws from center to edge
- Line width scales with zoom

---

#### handleRoadPlacement(q, r)

```javascript
async handleRoadPlacement(q, r)
```

**Description:** Handles two-click road placement system. First click sets start hex, second click connects to neighbor.

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate

**Returns:** `Promise<void>`

**Called From:** Canvas click handler when `selectedTool === 'place_road'`

**Behavior:**
- First click: Sets `this.roadStartHex = {q, r}` and highlights hex
- Second click on same hex: Cancels placement
- Second click on non-neighbor: Sets new start hex
- Second click on neighbor: Calls `connectRoads()` to create road connection

**Visual Feedback:**
- Highlights start hex with brown outline
- Shows dashed preview line to hover hex (if neighbor)

---

#### connectRoads(q1, r1, q2, r2, neighborIndex)

```javascript
async connectRoads(q1, r1, q2, r2, neighborIndex)
```

**Description:** Creates a bidirectional road connection between two hexes.

**Parameters:**
- `q1` (number) - Start hex column
- `r1` (number) - Start hex row
- `q2` (number) - End hex column
- `r2` (number) - End hex row
- `neighborIndex` (number) - Neighbor index from hex1's perspective (0-5)

**Returns:** `Promise<void>`

**Called From:** `handleRoadPlacement()` when user clicks neighbor hex

**Road Storage:**
- Hex1: `roads[neighborIndex] = true`
- Hex2: `roads[(neighborIndex + 3) % 6] = true` (opposite direction)

**API Calls:**
- `POST /api/hex-maps/tiles/create.php` - Saves both tiles with road data

**Side Effects:**
- Creates tiles if they don't exist
- Updates `this.initialTileKeys` to track tiles in database
- Triggers canvas redraw

---

#### eraseRoadFromHex(q, r)

```javascript
async eraseRoadFromHex(q, r)
```

**Description:** Removes all roads from a hex and updates neighbors accordingly.

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate

**Returns:** `Promise<void>`

**Called From:** Canvas click handler when `selectedTool === 'erase_road'`

**Behavior:**
- Removes all roads from current hex
- Removes corresponding roads from all neighbors (opposite direction)
- Deletes tile from database if it becomes completely empty
- Updates neighbors in database

**API Calls:**
- `POST /api/hex-maps/tiles/create.php` - Updates tiles with remaining data
- `POST /api/hex-maps/tiles/delete.php` - Deletes empty tiles

---

#### toggleBorder(q, r, edge)

```javascript
async toggleBorder(q, r, edge)
```

**Description:** Toggles a border on a hex edge (local, regional, or national).

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate
- `edge` (number) - Edge index (0-5)

**Returns:** `Promise<void>`

**Called From:** Canvas click handler when `selectedTool === 'draw_border'` or `'erase_border'`

**Border Types:**
- `'local'` - Local borders (yellow)
- `'regional'` - Regional borders (orange)
- `'national'` - National borders (red)

**Storage:**
- Borders stored as `{edgeIndex: borderType}` in tile.borders JSON

**API Calls:**
- `POST /api/hex-maps/tiles/create.php` - Saves tile with border data

---

#### paintHex(q, r)

```javascript
paintHex(q, r)
```

**Description:** Paints a hex with the currently selected terrain type.

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate

**Returns:** `void`

**Called From:** Canvas click handler when `selectedTool === 'paint'`

**Behavior:**
- Updates or creates tile with `selectedTerrain` type
- Stores in `this.tiles` Map
- Immediately redraws hex for visual feedback
- Tile is saved to database when `saveMap()` is called

**Side Effects:**
- Updates local tile state
- Triggers immediate hex redraw

---

#### eraseHex(q, r)

```javascript
async eraseHex(q, r)
```

**Description:** Erases a hex (removes terrain) and optionally deletes markers.

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate

**Returns:** `Promise<void>`

**Called From:** Canvas click handler when `selectedTool === 'erase'`

**Behavior:**
- Removes terrain type from tile
- Attempts to delete marker if present
- If tile becomes empty and exists in database, marks for deletion
- Tile is deleted when `saveMap()` is called

**API Calls:**
- `POST /api/hex-maps/markers/delete.php` - If marker exists

---

#### placeSettlement(q, r)

```javascript
async placeSettlement(q, r)
```

**Description:** Places a settlement marker (village, town, city, castle, fort, or ruins) on a hex.

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate

**Returns:** `Promise<void>`

**Called From:** Canvas click handler when `selectedTool === 'place_settlement'`

**Settlement Types:**
- `'village'` - Small settlement
- `'town'` - Medium settlement
- `'city'` - Large settlement
- `'castle'` - Fortified structure
- `'fort'` - Military fortification
- `'ruins'` - Abandoned structure

**API Calls:**
- `POST /api/hex-maps/markers/create.php` - Creates marker in database

**Side Effects:**
- Adds marker to `this.markers` Map
- Triggers canvas redraw

---

#### saveMap()

```javascript
async saveMap()
```

**Description:** Saves all map changes to the database (tiles, deletions, markers).

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:** Save button click handler

**Save Process:**
1. Identifies tiles to delete (in `initialTileKeys` but not in `this.tiles`)
2. Deletes orphaned tiles via API
3. Saves all modified/new tiles via batch API
4. Shows success/error message

**API Calls:**
- `POST /api/hex-maps/tiles/delete.php` - For each deleted tile
- `POST /api/hex-maps/tiles/batch.php` - Batch save all tiles

**Error Handling:**
- Shows error message if save fails
- Logs errors to console

---

#### getHexNeighbors(q, r)

```javascript
getHexNeighbors(q, r)
```

**Description:** Returns array of 6 neighboring hex coordinates in axial system.

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate

**Returns:** `Array<Object>` - Array of 6 neighbor objects: `[{q, r}, ...]`

**Called From:**
- `connectRoads()` - To find neighbor for road connection
- `drawRoads()` - To find neighbor hexes for road drawing
- `eraseRoadFromHex()` - To update neighbor roads
- `handleRoadPlacement()` - To check if clicked hex is neighbor

**Neighbor Order (pointy-top hexes):**
- 0: Top (q, r-1)
- 1: Top-right (q+1, r-1)
- 2: Bottom-right (q+1, r)
- 3: Bottom (q, r+1)
- 4: Bottom-left (q-1, r+1)
- 5: Top-left (q-1, r)

---

#### getEdgeAtPoint(q, r, pixelX, pixelY)

```javascript
getEdgeAtPoint(q, r, pixelX, pixelY)
```

**Description:** Determines which hex edge was clicked based on pixel coordinates.

**Parameters:**
- `q` (number) - Hex column coordinate
- `r` (number) - Hex row coordinate
- `pixelX` (number) - Click X coordinate (canvas space)
- `pixelY` (number) - Click Y coordinate (canvas space)

**Returns:** `number|null` - Edge index (0-5) or null if click too close to center

**Called From:**
- Canvas click handler for border/road tools
- Hover feedback for edge tools

**Algorithm:**
1. Calculates distance from hex center
2. Rejects clicks within 40% of radius (too close to center)
3. Calculates angle from center
4. Finds closest edge angle
5. Returns edge index if within 90° tolerance

**Edge Angles (pointy-top):**
- 0: -90° (top)
- 1: -30° (top-right)
- 2: 30° (bottom-right)
- 3: 90° (bottom)
- 4: 150° (bottom-left)
- 5: 210° (top-left)

---

#### zoomIn(canvas)

```javascript
zoomIn(canvas)
```

**Description:** Increases zoom level by 10% (up to maxZoom).

**Parameters:**
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `void`

**Called From:**
- Zoom in button click
- Mouse wheel handler

**Side Effects:**
- Updates `this.zoom`
- Redraws canvas
- Updates zoom info display

---

#### zoomOut(canvas)

```javascript
zoomOut(canvas)
```

**Description:** Decreases zoom level by 10% (down to minZoom).

**Parameters:**
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `void`

**Called From:**
- Zoom out button click
- Mouse wheel handler

---

#### resetView(canvas)

```javascript
resetView(canvas)
```

**Description:** Resets zoom to 1.0 and centers map at origin.

**Parameters:**
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `void`

**Called From:** Reset view button click

---

#### startPan(e, canvas)

```javascript
startPan(e, canvas)
```

**Description:** Initiates panning operation (middle mouse button or Shift+left click).

**Parameters:**
- `e` (MouseEvent) - Mouse event
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `void`

**Called From:** Mouse down handler

**Side Effects:**
- Sets `this.isPanning = true`
- Stores initial mouse position and offset

---

#### handlePan(e, canvas)

```javascript
handlePan(e, canvas)
```

**Description:** Updates pan offset based on mouse movement.

**Parameters:**
- `e` (MouseEvent) - Mouse event
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `void`

**Called From:** Mouse move handler when `isPanning === true`

**Side Effects:**
- Updates `this.offsetX` and `this.offsetY`
- Redraws canvas

---

#### stopPan()

```javascript
stopPan()
```

**Description:** Stops panning operation.

**Parameters:** None

**Returns:** `void`

**Called From:**
- Mouse up handler
- Mouse leave handler

**Side Effects:**
- Sets `this.isPanning = false`
- Redraws canvas

---

### Hex Map Play Module

**File:** `public/js/modules/hex-map-play.js`  
**Class:** `HexMapPlayModule`  
**Purpose:** Provides play mode for hex maps with fog of war and visibility system.

#### Constructor

```javascript
constructor(app)
```

**Description:** Initializes the hex map play module for viewing maps during sessions.

**Parameters:**
- `app` (Object) - Main application instance

**Returns:** `HexMapPlayModule` instance

**State Initialized:**
- `this.visibleHexes` - Map of visible hexes with visibility levels
- `this.isDM` - Boolean indicating if user is DM
- `this.playerPosition` - Current character position
- `this.terrainImageScales` - Per-terrain-type image scaling

---

#### renderPlayView(mapId)

```javascript
async renderPlayView(mapId)
```

**Description:** Renders the play mode interface with fog of war.

**Parameters:**
- `mapId` (number) - ID of map to display

**Returns:** `Promise<void>`

**Called From:** Route handler when navigating to `/hex-map-play/:mapId`

**API Calls:**
- `GET /api/hex-maps/get.php?id={mapId}` - Fetches map metadata
- `GET /api/hex-maps/play/get-visible.php?map_id={mapId}` - Fetches visible hexes
- `GET /api/hex-maps/markers/list.php?map_id={mapId}` - Fetches markers

**Visibility Levels:**
- 0: Hidden (fog of war)
- 1: Partial (neighbor visibility - terrain only)
- 2: Full (current hex or DM-revealed)

---

#### loadVisibleHexes()

```javascript
async loadVisibleHexes()
```

**Description:** Loads all visible hexes for current player/DM with visibility levels.

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:**
- `renderPlayView()` - Initial load
- Auto-refresh interval (every 5 seconds)

**API Calls:**
- `GET /api/hex-maps/play/get-visible.php?map_id={mapId}`

**Side Effects:**
- Updates `this.visibleHexes` Map
- Triggers canvas redraw

---

#### drawPlayHex(ctx, hex)

```javascript
drawPlayHex(ctx, hex)
```

**Description:** Draws a hex in play mode with fog of war opacity.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `hex` (Object) - Hex data with visibility_level

**Returns:** `void`

**Called From:** `drawPlayCanvas()`

**Rendering:**
- Applies opacity based on `hex.visibility_level`
- Draws terrain image with per-terrain scaling
- Shows player position indicator
- Shows character markers (DM view only)

**Opacity Levels:**
- Level 0: 0.2 (very dim, fog of war)
- Level 1: 0.6 (partial visibility)
- Level 2: 1.0 (full visibility)

---

#### loadMap(mapId)

```javascript
async loadMap(mapId)
```

**Description:** Loads hex map metadata (without tiles, which are loaded via `loadVisibleHexes()`).

**Parameters:**
- `mapId` (number) - Map ID to load

**Returns:** `Promise<void>`

**Called From:** `renderPlayView()`

**API Calls:**
- `GET /api/hex-maps/get.php?map_id={mapId}&include_tiles=false`

**Side Effects:**
- Sets `this.currentMap` and `this.currentMapId`
- Sets `this.hexSize` from map data
- Loads markers via `loadMarkers()`

---

#### renderSidebar()

```javascript
renderSidebar()
```

**Description:** Renders the sidebar for play mode with map info and DM/player tools.

**Parameters:** None

**Returns:** `string` - HTML string for sidebar

**Called From:** `renderPlayView()`

**Content:**
- Map name and description
- Player position (if available)
- DM tools section (if DM)
- Visibility info (if player)

---

#### setupEventListeners()

```javascript
setupEventListeners()
```

**Description:** Sets up event listeners for play mode interface.

**Parameters:** None

**Returns:** `void`

**Called From:** `renderPlayView()` after rendering

**Event Handlers:**
- Refresh view button
- Reveal hexes button (DM only)
- Edit map button (DM only)
- Zoom controls
- Canvas click handler

---

#### initPlayCanvas()

```javascript
initPlayCanvas()
```

**Description:** Initializes the play mode canvas with event handlers.

**Parameters:** None

**Returns:** `void`

**Called From:** `renderPlayView()` after canvas is created

**Initialization:**
- Sets canvas size to container
- Centers map
- Sets up resize handler
- Configures click handler for character movement/reveal

---

#### drawPlayCanvas()

```javascript
drawPlayCanvas()
```

**Description:** Main rendering function for play mode canvas with fog of war.

**Parameters:** None

**Returns:** `void`

**Called From:**
- Canvas initialization
- After visibility updates
- After character movement
- Auto-refresh interval

**Rendering Order:**
1. Background
2. Visible hexes (with opacity based on visibility level)
3. Markers (filtered by visibility)
4. Player position indicator
5. Character markers (DM view only)

---

#### drawPlayMarker(ctx, marker)

```javascript
drawPlayMarker(ctx, marker)
```

**Description:** Draws a marker in play mode with visibility filtering.

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `marker` (Object) - Marker data object

**Returns:** `void`

**Called From:** `drawPlayCanvas()`

**Visibility:**
- DM: Sees all markers
- Player: Only sees markers with `is_visible_to_players === true`

**Rendering:**
- Same as editor mode but respects visibility settings

---

#### pixelToHex(x, y)

```javascript
pixelToHex(x, y)
```

**Description:** Converts pixel coordinates to hex coordinates (play mode version).

**Parameters:**
- `x` (number) - Pixel X coordinate
- `y` (number) - Pixel Y coordinate

**Returns:** `Object` - `{q: number, r: number}` hex coordinates

**Called From:** `handleCanvasClick()`

**Note:** Uses different formula than editor mode (accounts for zoom differently)

---

#### hexRound(q, r)

```javascript
hexRound(q, r)
```

**Description:** Rounds fractional hex coordinates (same algorithm as editor mode).

**Parameters:**
- `q` (number) - Fractional hex column
- `r` (number) - Fractional hex row

**Returns:** `Object` - `{q: number, r: number}` rounded coordinates

**Called From:** `pixelToHex()`

---

#### hexToPixel(q, r)

```javascript
hexToPixel(q, r)
```

**Description:** Converts hex coordinates to pixel coordinates (play mode version).

**Parameters:**
- `q` (number) - Hex column
- `r` (number) - Hex row

**Returns:** `Object` - `{x: number, y: number}` pixel coordinates

**Called From:**
- `drawPlayHex()`
- `drawPlayMarker()`

---

#### handleCanvasClick(e, canvas)

```javascript
async handleCanvasClick(e, canvas)
```

**Description:** Handles canvas clicks in play mode (move character or reveal hexes).

**Parameters:**
- `e` (MouseEvent) - Mouse click event
- `canvas` (HTMLCanvasElement) - Canvas element

**Returns:** `Promise<void>`

**Called From:** Canvas click event listener

**Behavior:**
- DM: Shows reveal dialog for clicked hex
- Player: Moves character to clicked hex (if character exists)

---

#### moveCharacter(q, r)

```javascript
async moveCharacter(q, r)
```

**Description:** Moves player character to new hex position.

**Parameters:**
- `q` (number) - Target hex column
- `r` (number) - Target hex row

**Returns:** `Promise<void>`

**Called From:** `handleCanvasClick()` (player mode)

**API Calls:**
- `POST /api/hex-maps/play/move.php` - Moves character and updates visibility

**Side Effects:**
- Updates `this.playerPosition`
- Triggers visibility refresh via `loadVisibleHexes()`
- Shows success message
- Broadcasts real-time event

---

#### showRevealDialog(hexes)

```javascript
showRevealDialog(hexes = [])
```

**Description:** Shows dialog for DM to reveal hexes to players.

**Parameters:**
- `hexes` (Array<Object>, optional) - Array of `{q, r}` objects. If empty, prompts for input.

**Returns:** `void`

**Called From:** `handleCanvasClick()` (DM mode)

**Input Format:**
- Single hex: `"q,r"`
- Multiple hexes: `"q1,r1;q2,r2;..."`

**Future Enhancement:** Replace prompt with proper modal dialog

---

#### revealHexes(hexes)

```javascript
async revealHexes(hexes)
```

**Description:** Reveals hexes to players via API.

**Parameters:**
- `hexes` (Array<Object>) - Array of `{q, r}` hex coordinates

**Returns:** `Promise<void>`

**Called From:** `showRevealDialog()`

**API Calls:**
- `POST /api/hex-maps/play/reveal.php` - Reveals hexes to all players in session

**Side Effects:**
- Reloads visible hexes
- Shows success message
- Broadcasts real-time event

---

#### startRealtimeUpdates()

```javascript
startRealtimeUpdates()
```

**Description:** Starts listening for real-time events (player movement, hex reveals).

**Parameters:** None

**Returns:** `void`

**Called From:** `renderPlayView()` after map is loaded

**Event Listeners:**
- `hex_map_player_moved` - Reloads visible hexes
- `hex_map_hexes_revealed` - Reloads visible hexes

**Note:** Uses existing realtime client from app if available

---

#### updateCanvasInfo()

```javascript
updateCanvasInfo()
```

**Description:** Updates canvas info display with current zoom level.

**Parameters:** None

**Returns:** `void`

**Called From:** Zoom operations

**Display Format:** `"Zoom: 144%"`

---

#### cleanup()

```javascript
cleanup()
```

**Description:** Cleans up resources when leaving play view (stops auto-refresh interval).

**Parameters:** None

**Returns:** `void`

**Called From:** View cleanup in `app.js` (should be called but currently missing)

**Side Effects:**
- Clears `this.refreshInterval`
- Prevents memory leaks from accumulating intervals

---

### Character Creation Module

**File:** `public/js/modules/character-creation.js`  
**Class:** `CharacterCreationModule`  
**Purpose:** 11-step character creation wizard following BECMI Rules Cyclopedia.

#### Constructor

```javascript
constructor(app)
```

**Description:** Initializes character creation wizard.

**Parameters:**
- `app` (Object) - Main application instance

**Returns:** `CharacterCreationModule` instance

**State:**
- `this.currentStep` - Current wizard step (1-11)
- `this.characterData` - Character data being built
- `this.goldCalculator` - Starting gold calculator instance
- `this.equipmentCart` - Equipment shopping cart instance

---

#### showWizard()

```javascript
showWizard()
```

**Description:** Shows character creation modal and resets to step 1.

**Parameters:** None

**Returns:** `void`

**Called From:** "Create Character" button click

---

#### nextStep()

```javascript
async nextStep()
```

**Description:** Validates current step and advances to next step.

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:** "Next" button click

**Validation:**
- Step 1: Ability scores rolled
- Step 2: Class selected
- Step 3: Ability adjustments valid
- Step 4: Hit points rolled
- Step 5: Starting gold calculated
- Step 6: Equipment purchased (optional)
- Step 7: Starting spells selected (if applicable)
- Step 8: Weapon masteries selected
- Step 9: General skills selected
- Step 10: Physical details entered
- Step 11: Review and create

---

#### previousStep()

```javascript
previousStep()
```

**Description:** Returns to previous wizard step.

**Parameters:** None

**Returns:** `void`

**Called From:** "Previous" button click

---

#### createCharacter()

```javascript
async createCharacter()
```

**Description:** Finalizes character creation and saves to database.

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:** "Create Character" button on final step

**API Calls:**
- `POST /api/character/create.php` - Creates character with all data

**Side Effects:**
- Closes wizard modal
- Navigates to character sheet
- Shows success message

---

### Character Sheet Module

**File:** `public/js/modules/character-sheet.js`  
**Class:** `CharacterSheetModule`  
**Purpose:** Displays and manages character sheet with real-time calculations.

#### loadCharacter(characterId)

```javascript
async loadCharacter(characterId)
```

**Description:** Loads character data and renders character sheet.

**Parameters:**
- `characterId` (number) - ID of character to load

**Returns:** `Promise<void>`

**Called From:**
- Route handler when navigating to `/character/:characterId`
- Character list item click

**API Calls:**
- `GET /api/character/get.php?id={characterId}` - Fetches character data
- `GET /api/character/get-skills.php?character_id={characterId}` - Fetches skills
- `GET /api/character/get-weapon-masteries.php?character_id={characterId}` - Fetches weapon masteries

---

#### updateCharacter(field, value)

```javascript
async updateCharacter(field, value)
```

**Description:** Updates a character field and saves to database.

**Parameters:**
- `field` (string) - Field name to update
- `value` (any) - New value

**Returns:** `Promise<void>`

**Called From:** Form input change handlers

**API Calls:**
- `POST /api/character/update.php` - Updates character data

---

### DM Dashboard Module

**File:** `public/js/modules/dm-dashboard.js`  
**Class:** `DMDashboardModule`  
**Purpose:** Provides DM with comprehensive party overview.

#### loadDashboard(sessionId)

```javascript
async loadDashboard(sessionId)
```

**Description:** Loads all party data for DM view.

**Parameters:**
- `sessionId` (number) - Session ID

**Returns:** `Promise<Object>` - Dashboard data

**Called From:** Route handler when navigating to `/dm-dashboard/:sessionId`

**API Calls:**
- `GET /api/session/get-dm-dashboard.php?session_id={sessionId}`

**Data Returned:**
- All player characters with stats
- Current HP/status
- Equipment
- Spells memorized
- Initiative order

---

#### refreshDashboard()

```javascript
async refreshDashboard()
```

**Description:** Refreshes dashboard data (auto-called every 10 seconds).

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:** Auto-refresh interval

---

### Session Management Module

**File:** `public/js/modules/session-management.js`  
**Class:** `SessionManagementModule`  
**Purpose:** Manages game sessions (create, edit, invite players, etc.).

#### createSession(sessionData)

```javascript
async createSession(sessionData)
```

**Description:** Creates a new game session.

**Parameters:**
- `sessionData` (Object) - Session data (name, description, etc.)

**Returns:** `Promise<Object>` - Created session data

**Called From:** "Create Session" form submit

**API Calls:**
- `POST /api/session/create.php`

---

#### invitePlayer(sessionId, userId)

```javascript
async invitePlayer(sessionId, userId)
```

**Description:** Sends invitation to player to join session.

**Parameters:**
- `sessionId` (number) - Session ID
- `userId` (number) - User ID to invite

**Returns:** `Promise<void>`

**Called From:** Invite player button click

**API Calls:**
- `POST /api/session/invite-player.php`

---

### Equipment Module

**File:** `public/js/modules/equipment.js`  
**Class:** `EquipmentModule`  
**Purpose:** Manages equipment catalog and item management.

#### loadEquipment(category)

```javascript
async loadEquipment(category = null)
```

**Description:** Loads equipment items, optionally filtered by category.

**Parameters:**
- `category` (string|null, optional) - Equipment category filter

**Returns:** `Promise<void>`

**Called From:**
- Route handler when navigating to `/equipment`
- Category filter click

**API Calls:**
- `GET /api/items/list.php` - All items
- `GET /api/items/get-by-category.php?category={category}` - Filtered by category

---

### Level Up Wizard

**File:** `public/js/modules/level-up-wizard.js`  
**Class:** `LevelUpWizard`  
**Purpose:** Handles character level-up process.

#### showWizard(characterId)

```javascript
showWizard(characterId)
```

**Description:** Shows level-up wizard for character.

**Parameters:**
- `characterId` (number) - Character ID

**Returns:** `void`

**Called From:** "Level Up" button on character sheet

---

#### processLevelUp()

```javascript
async processLevelUp()
```

**Description:** Processes level-up and updates character.

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:** "Complete Level Up" button

**API Calls:**
- `POST /api/character/level-up.php`

**Level-Up Process:**
1. Validates sufficient XP
2. Rolls new hit points
3. Updates level
4. Applies level-based bonuses
5. Saves to database

---

## PHP API Endpoints

### Hex Maps API

#### POST /api/hex-maps/create.php

**Description:** Creates a new hex map.

**Authentication:** Required

**Request Body:**
```json
{
  "map_name": "string (required, 3-100 chars)",
  "map_description": "string (optional)",
  "session_id": "integer (optional)",
  "width_hexes": "integer (default: 20, 1-200)",
  "height_hexes": "integer (default: 20, 1-200)",
  "hex_size_pixels": "integer (default: 50, 10-200)",
  "background_image_url": "string (optional)"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Hex map created successfully",
  "data": {
    "map_id": 1,
    "map_name": "My Map",
    ...
  }
}
```

**Called From:**
- `HexMapEditorModule.createMap()`

**Database:**
- Inserts into `hex_maps` table
- Sets `created_by_user_id` to current user
- Links to session if `session_id` provided

---

#### GET /api/hex-maps/get.php

**Description:** Retrieves hex map data including all tiles.

**Authentication:** Required (must be map creator, session DM, or session player)

**Query Parameters:**
- `id` (integer, required) - Map ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "map_id": 1,
    "map_name": "My Map",
    "tiles": [...],
    ...
  }
}
```

**Called From:**
- `HexMapEditorModule.loadMap()`
- `HexMapPlayModule.renderPlayView()`

**Database:**
- Selects from `hex_maps` table
- Joins `hex_tiles` for all tiles
- Filters by access permissions

---

#### POST /api/hex-maps/tiles/create.php

**Description:** Creates or updates a single hex tile.

**Authentication:** Required (must be map creator or session DM)

**Request Body:**
```json
{
  "map_id": "integer (required)",
  "q": "integer (required)",
  "r": "integer (required)",
  "terrain_type": "string (optional, default: 'plains')",
  "terrain_name": "string (optional)",
  "description": "string (optional)",
  "borders": "object (optional, JSON: {edge: type})",
  "roads": "object (optional, JSON: {neighborIndex: true})",
  ...
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "tile_id": 1,
    ...
  }
}
```

**Called From:**
- `HexMapEditorModule.connectRoads()`
- `HexMapEditorModule.toggleBorder()`
- `HexMapEditorModule.eraseRoadFromHex()`

**Database:**
- Uses `INSERT ... ON DUPLICATE KEY UPDATE` on `hex_tiles`
- Stores borders and roads as JSON

---

#### POST /api/hex-maps/tiles/batch.php

**Description:** Batch creates/updates multiple tiles.

**Authentication:** Required

**Request Body:**
```json
{
  "map_id": "integer (required)",
  "tiles": [
    {
      "q": 0,
      "r": 0,
      "terrain_type": "plains",
      ...
    },
    ...
  ]
}
```

**Called From:**
- `HexMapEditorModule.saveMap()`

**Database:**
- Batch inserts/updates using transactions

---

#### POST /api/hex-maps/tiles/delete.php

**Description:** Deletes a hex tile.

**Authentication:** Required

**Request Body:**
```json
{
  "map_id": "integer (required)",
  "q": "integer (required)",
  "r": "integer (required)"
}
```

**Called From:**
- `HexMapEditorModule.saveMap()` - For deleted tiles
- `HexMapEditorModule.eraseRoadFromHex()` - For empty tiles

---

#### POST /api/hex-maps/markers/create.php

**Description:** Creates a marker (settlement, POI) on a hex.

**Authentication:** Required

**Request Body:**
```json
{
  "map_id": "integer (required)",
  "q": "integer (required)",
  "r": "integer (required)",
  "marker_type": "string (required: village|town|city|castle|fort|ruins)",
  "marker_name": "string (optional)",
  "description": "string (optional)",
  "is_visible_to_players": "boolean (default: true)"
}
```

**Called From:**
- `HexMapEditorModule.placeSettlement()`

---

#### POST /api/hex-maps/markers/delete.php

**Description:** Deletes a marker.

**Authentication:** Required

**Request Body:**
```json
{
  "marker_id": "integer (required)"
}
```

**Called From:**
- `HexMapEditorModule.deleteMarker()`
- `HexMapEditorModule.eraseHex()`

---

#### GET /api/hex-maps/play/get-visible.php

**Description:** Gets all visible hexes for current player/DM with visibility levels.

**Authentication:** Required

**Query Parameters:**
- `map_id` (integer, required) - Map ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "hexes": [
      {
        "q": 0,
        "r": 0,
        "terrain_type": "plains",
        "visibility_level": 2,
        ...
      },
      ...
    ]
  }
}
```

**Called From:**
- `HexMapPlayModule.loadVisibleHexes()`

**Visibility Logic:**
- DM: All hexes at level 2
- Player: Current hex at level 2, neighbors at level 1, others at level 0
- Revealed hexes: Level 2

---

#### POST /api/hex-maps/play/move.php

**Description:** Moves character to new hex position.

**Authentication:** Required

**Request Body:**
```json
{
  "map_id": "integer (required)",
  "character_id": "integer (required)",
  "q": "integer (required)",
  "r": "integer (required)"
}
```

**Called From:**
- `HexMapPlayModule.moveCharacter()`

**Side Effects:**
- Updates character position
- Updates visibility for moved character
- Broadcasts real-time event

---

#### POST /api/hex-maps/play/reveal.php

**Description:** DM reveals hexes to players.

**Authentication:** Required (must be session DM)

**Request Body:**
```json
{
  "map_id": "integer (required)",
  "character_ids": "array (optional, if empty reveals to all)",
  "hexes": [
    {"q": 0, "r": 0},
    ...
  ]
}
```

**Called From:** DM reveal tool in play mode

---

### Character API

#### GET /api/character/get.php

**Description:** Retrieves character data.

**Query Parameters:**
- `id` (integer, required) - Character ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "character_id": 1,
    "character_name": "Aragorn",
    "class": "fighter",
    "level": 5,
    ...
  }
}
```

**Called From:**
- `CharacterSheetModule.loadCharacter()`

---

#### POST /api/character/create.php

**Description:** Creates a new character.

**Request Body:**
```json
{
  "character_name": "string (required)",
  "class": "string (required)",
  "strength": "integer (required)",
  "dexterity": "integer (required)",
  "constitution": "integer (required)",
  "intelligence": "integer (required)",
  "wisdom": "integer (required)",
  "charisma": "integer (required)",
  "level": "integer (default: 1)",
  "hit_points": "integer (required)",
  "starting_gold": "integer (required)",
  ...
}
```

**Called From:**
- `CharacterCreationModule.createCharacter()`

---

#### POST /api/character/update.php

**Description:** Updates character data.

**Request Body:**
```json
{
  "character_id": "integer (required)",
  "field_name": "value",
  ...
}
```

**Called From:**
- `CharacterSheetModule.updateCharacter()`

---

#### POST /api/character/level-up.php

**Description:** Processes character level-up.

**Request Body:**
```json
{
  "character_id": "integer (required)"
}
```

**Called From:**
- `LevelUpWizard.processLevelUp()`

**Process:**
1. Validates sufficient XP
2. Rolls new hit points
3. Updates level
4. Applies level bonuses

---

### Session API

#### POST /api/session/create.php

**Description:** Creates a new game session.

**Request Body:**
```json
{
  "session_name": "string (required)",
  "session_description": "string (optional)",
  "dm_user_id": "integer (auto-set to current user)"
}
```

**Called From:**
- `SessionManagementModule.createSession()`

---

#### POST /api/session/invite-player.php

**Description:** Invites a player to join session.

**Request Body:**
```json
{
  "session_id": "integer (required)",
  "user_id": "integer (required)"
}
```

**Called From:**
- `SessionManagementModule.invitePlayer()`

---

#### GET /api/session/get-dm-dashboard.php

**Description:** Gets comprehensive dashboard data for DM.

**Query Parameters:**
- `session_id` (integer, required) - Session ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "session": {...},
    "characters": [...],
    "initiative": [...],
    ...
  }
}
```

**Called From:**
- `DMDashboardModule.loadDashboard()`

---

### Spells API

#### GET /api/spells/list.php

**Description:** Lists all available spells.

**Query Parameters:**
- `class` (string, optional) - Filter by class
- `level` (integer, optional) - Filter by spell level

**Called From:** Spell selection interfaces

---

#### POST /api/spells/memorize.php

**Description:** Memorizes a spell for a character.

**Request Body:**
```json
{
  "character_id": "integer (required)",
  "spell_id": "integer (required)",
  "spell_level": "integer (required)"
}
```

---

#### POST /api/spells/cast.php

**Description:** Casts a memorized spell.

**Request Body:**
```json
{
  "character_id": "integer (required)",
  "spell_id": "integer (required)"
}
```

**Side Effects:**
- Removes spell from memorized list
- Updates spell slots used

---

### Inventory API

#### POST /api/inventory/add.php

**Description:** Adds item to character inventory.

**Request Body:**
```json
{
  "character_id": "integer (required)",
  "item_id": "integer (required)",
  "quantity": "integer (default: 1)"
}
```

---

#### POST /api/inventory/equip.php

**Description:** Equips an item on a character.

**Request Body:**
```json
{
  "character_id": "integer (required)",
  "item_id": "integer (required)",
  "equipment_slot": "string (required)"
}
```

---

#### POST /api/inventory/remove.php

**Description:** Removes item from inventory.

**Request Body:**
```json
{
  "character_id": "integer (required)",
  "item_id": "integer (required)",
  "quantity": "integer (default: 1)"
}
```

---

### Combat API

#### POST /api/combat/roll-initiative.php

**Description:** Rolls initiative for all characters in session.

**Request Body:**
```json
{
  "session_id": "integer (required)"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "initiative_order": [
      {"character_id": 1, "initiative": 18, ...},
      ...
    ]
  }
}
```

---

#### POST /api/combat/next-turn.php

**Description:** Advances to next turn in initiative order.

**Request Body:**
```json
{
  "session_id": "integer (required)"
}
```

---

#### GET /api/combat/get-initiative.php

**Description:** Gets current initiative order.

**Query Parameters:**
- `session_id` (integer, required) - Session ID

---

### Items API

#### GET /api/items/list.php

**Description:** Lists all equipment items.

**Query Parameters:**
- `category` (string, optional) - Filter by category

**Called From:**
- `EquipmentModule.loadEquipment()`

---

#### GET /api/items/get-by-category.php

**Description:** Gets items filtered by category.

**Query Parameters:**
- `category` (string, required) - Item category

---

### Auth API

#### POST /api/auth/login.php

**Description:** Authenticates user and creates session.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "token": "session_token"
  }
}
```

---

#### POST /api/auth/register.php

**Description:** Registers a new user.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "display_name": "string (required)"
}
```

---

#### POST /api/auth/logout.php

**Description:** Logs out current user.

**Authentication:** Required

---

## PHP Service Classes

### BECMI Rules Engine

**File:** `app/services/becmi-rules.php`  
**Class:** `BECMIRulesEngine`  
**Purpose:** Implements all BECMI rule calculations.

#### calculateTHAC0(character)

```php
public static function calculateTHAC0($character)
```

**Description:** Calculates THAC0 (To Hit Armor Class 0) for a character.

**Parameters:**
- `$character` (array) - Character data array

**Returns:** `array` - THAC0 data:
```php
[
  'base' => 19,              // Base THAC0 (only value)
  'strength_bonus' => 1,     // Melee bonus
  'dexterity_bonus' => 0,    // Ranged bonus
  'mastery_bonus' => 0       // Weapon mastery bonus
]
```

**Called From:**
- Character sheet rendering
- Combat calculations
- API endpoints that return character stats

**Rules:**
- Base THAC0 from official BECMI table by class and level
- Strength bonus applies to melee attacks only
- Dexterity bonus applies to ranged attacks only
- Weapon mastery bonus applies if weapon has mastery

---

#### calculateSavingThrows(character)

```php
public static function calculateSavingThrows($character)
```

**Description:** Calculates all saving throws for a character.

**Parameters:**
- `$character` (array) - Character data array

**Returns:** `array` - Saving throw values:
```php
[
  'death_ray' => 10,
  'magic_wand' => 11,
  'paralysis' => 12,
  'dragon_breath' => 13,
  'spells' => 14
]
```

**Rules:**
- Based on class and level from official BECMI table
- Dwarves get +4 vs. magic, poison, and spells
- Halflings get +4 vs. magic and poison

---

#### calculateEncumbrance(character)

```php
public static function calculateEncumbrance($character)
```

**Description:** Calculates encumbrance based on carried weight.

**Parameters:**
- `$character` (array) - Character data array

**Returns:** `array` - Encumbrance data:
```php
[
  'total_weight' => 45.5,
  'encumbrance_level' => 'moderate',
  'movement_rate' => 90,
  'max_carry' => 100
]
```

**Encumbrance Levels:**
- Unencumbered: 0-25% of max
- Light: 26-50%
- Moderate: 51-75%
- Heavy: 76-100%
- Overloaded: >100%

**Movement Rates:**
- Unencumbered: 120' (40')
- Light: 90' (30')
- Moderate: 60' (20')
- Heavy: 30' (10')
- Overloaded: 0' (0')

---

#### getBaseTHAC0(class, level)

```php
private static function getBaseTHAC0($class, $level)
```

**Description:** Gets base THAC0 from official BECMI table.

**Parameters:**
- `$class` (string) - Character class
- `$level` (integer) - Character level

**Returns:** `integer` - Base THAC0 value

**Called From:** `calculateTHAC0()`

**THAC0 Tables:**
- Fighter/Elf/Halfling: Faster progression (19 at level 1, down to 1 at level 36)
- Cleric/Thief/Dwarf: Medium progression
- Magic-User: Slower progression

---

### Event Broadcaster

**File:** `app/services/event-broadcaster.php`  
**Class:** `EventBroadcaster`  
**Purpose:** Broadcasts real-time events to connected clients.

#### broadcast(eventType, data, sessionId)

```php
public static function broadcast($eventType, $data, $sessionId = null)
```

**Description:** Broadcasts an event to all connected clients in a session.

**Parameters:**
- `$eventType` (string) - Event type identifier
- `$data` (array) - Event data payload
- `$sessionId` (integer|null) - Session ID (null = broadcast to all)

**Returns:** `void`

**Called From:**
- Character movement (`hex_map_player_moved`)
- Hex reveal (`hex_map_hexes_revealed`)
- Initiative changes
- HP updates
- Spell casting

**Event Types:**
- `hex_map_player_moved` - Player moved on hex map
- `hex_map_hexes_revealed` - DM revealed hexes
- `character_hp_updated` - Character HP changed
- `spell_cast` - Spell was cast
- `initiative_updated` - Initiative order changed

---

### Portrait Manager

**File:** `app/services/portrait-manager.php`  
**Class:** `PortraitManager`  
**Purpose:** Manages character portrait generation and storage.

#### generatePortrait(characterId, prompt)

```php
public static function generatePortrait($characterId, $prompt = null)
```

**Description:** Generates a character portrait using AI image generation.

**Parameters:**
- `$characterId` (integer) - Character ID
- `$prompt` (string|null) - Custom prompt (optional)

**Returns:** `string` - URL of generated portrait

**Called From:**
- Character creation (step 10)
- Portrait regeneration button

**API:**
- Uses Together AI image generation
- Stores portrait in `/images/portraits/`
- Updates character record with portrait URL

---

### Email Service

**File:** `app/services/email-service.php`  
**Class:** `EmailService`  
**Purpose:** Sends transactional emails.

#### sendInvitation(email, sessionName, inviteUrl)

```php
public static function sendInvitation($email, $sessionName, $inviteUrl)
```

**Description:** Sends session invitation email.

**Parameters:**
- `$email` (string) - Recipient email
- `$sessionName` (string) - Session name
- `$inviteUrl` (string) - Invitation acceptance URL

**Returns:** `boolean` - Success status

**Called From:**
- `POST /api/session/invite-player.php`

---

#### sendPasswordReset(email, resetToken)

```php
public static function sendPasswordReset($email, $resetToken)
```

**Description:** Sends password reset email.

**Parameters:**
- `$email` (string) - Recipient email
- `$resetToken` (string) - Password reset token

**Returns:** `boolean` - Success status

**Called From:**
- `POST /api/auth/request-password-reset.php`

---

## Function Call Graph

### Hex Map Editor Flow

```
renderEditor()
  ├─> loadMap()
  │     ├─> GET /api/hex-maps/get.php
  │     └─> loadMarkers()
  │           └─> GET /api/hex-maps/markers/list.php
  │
  ├─> initCanvas()
  │     └─> drawHexGrid()
  │           ├─> drawHex() (for each hex)
  │           ├─> drawRoads() (for each hex with roads)
  │           └─> drawMarker() (for each marker)
  │
  └─> setupEventListeners()
        ├─> handleMouseDown() -> paintHex() / eraseHex() / handleRoadPlacement()
        ├─> handleMouseMove() -> drawHexGrid() (with hover feedback)
        └─> saveMap()
              ├─> POST /api/hex-maps/tiles/delete.php (for deleted tiles)
              └─> POST /api/hex-maps/tiles/batch.php (for all tiles)
```

### Hex Map Play Flow

```
renderPlayView()
  ├─> GET /api/hex-maps/get.php
  ├─> loadVisibleHexes()
  │     └─> GET /api/hex-maps/play/get-visible.php
  └─> drawPlayCanvas()
        └─> drawPlayHex() (for each visible hex)
              └─> (applies fog of war opacity)
```

### Character Creation Flow

```
showWizard()
  └─> renderStep(1)
        └─> nextStep()
              ├─> validateStep()
              └─> renderStep(2)
                    └─> ... (repeat for 11 steps)
                          └─> createCharacter()
                                └─> POST /api/character/create.php
```

---

## Notes

- All JavaScript functions use async/await for API calls
- All PHP endpoints require authentication (except login/register)
- All database operations use prepared statements
- Real-time events use polling system (`/api/realtime/poll.php`)
- Terrain images are preloaded for performance
- Hex coordinates use axial system (q, r) throughout

---

---

### Dashboard Module

**File:** `public/js/modules/dashboard.js`  
**Class:** `DashboardModule`  
**Purpose:** Main dashboard view with character and session overview.

#### Constructor

```javascript
constructor(app)
```

**Description:** Initializes the dashboard module.

**Parameters:**
- `app` (Object) - Main application instance

**Returns:** `DashboardModule` instance

---

#### render()

```javascript
async render()
```

**Description:** Renders the main dashboard with statistics and overview cards.

**Parameters:** None

**Returns:** `Promise<string>` - HTML string for dashboard

**Called From:** Route handler when navigating to `/dashboard`

**Dashboard Sections:**
- Welcome header
- Statistics cards (characters, sessions, upcoming, active)
- Recent characters list
- Upcoming sessions list
- Quick actions
- Character status overview

---

#### calculateDashboardStats(characters, sessions)

```javascript
calculateDashboardStats(characters, sessions)
```

**Description:** Calculates dashboard statistics from character and session data.

**Parameters:**
- `characters` (Array<Object>) - Array of character objects
- `sessions` (Array<Object>) - Array of session objects

**Returns:** `Object` - Statistics object with:
- `totalCharacters` (number)
- `totalSessions` (number)
- `upcomingSessions` (number) - Next 7 days
- `activeCharacters` (number) - HP > 0
- `recentActivity` (number) - Updated in last 7 days

**Called From:** `render()`

---

#### generateDashboardHTML(user, characters, sessions, stats)

```javascript
generateDashboardHTML(user, characters, sessions, stats)
```

**Description:** Generates the complete dashboard HTML structure.

**Parameters:**
- `user` (Object) - Current user data
- `characters` (Array<Object>) - Character array
- `sessions` (Array<Object>) - Session array
- `stats` (Object) - Statistics from `calculateDashboardStats()`

**Returns:** `string` - Complete dashboard HTML

**Called From:** `render()`

---

#### renderRecentCharacters(characters)

```javascript
renderRecentCharacters(characters)
```

**Description:** Renders the recent characters section (up to 3 most recent).

**Parameters:**
- `characters` (Array<Object>) - Character array

**Returns:** `string` - HTML for recent characters section

**Called From:** `generateDashboardHTML()`

**Displays:**
- Character avatar/portrait
- Character name and level/class
- HP bar with percentage
- View button

---

#### renderUpcomingSessions(sessions)

```javascript
renderUpcomingSessions(sessions)
```

**Description:** Renders upcoming sessions and pending invitations.

**Parameters:**
- `sessions` (Array<Object>) - Session array

**Returns:** `string` - HTML for upcoming sessions section

**Called From:** `generateDashboardHTML()`

**Shows:**
- Pending invitations (if any)
- Upcoming scheduled sessions (next 3)
- Session date, time, title
- View button

---

#### renderInvitationCard(session)

```javascript
renderInvitationCard(session)
```

**Description:** Renders a single invitation card for pending session invitations.

**Parameters:**
- `session` (Object) - Session object with invitation data

**Returns:** `string` - HTML for invitation card

**Called From:** `renderUpcomingSessions()`

**Card Includes:**
- Session title
- DM username
- Session date/time
- Accept/Decline buttons

---

#### renderQuickActions()

```javascript
renderQuickActions()
```

**Description:** Renders quick action buttons section.

**Parameters:** None

**Returns:** `string` - HTML for quick actions

**Called From:** `generateDashboardHTML()`

**Actions:**
- Create Character
- Create Session
- View Calendar

---

#### renderCharacterStatus(characters)

```javascript
renderCharacterStatus(characters)
```

**Description:** Renders character status overview with health categories.

**Parameters:**
- `characters` (Array<Object>) - Character array

**Returns:** `string` - HTML for status grid

**Called From:** `generateDashboardHTML()`

**Status Categories:**
- Healthy (HP ≥ 75%)
- Wounded (HP 25-74%)
- Critical (HP 1-24%)
- Unconscious (HP = 0)

---

#### setupEventHandlers()

```javascript
setupEventHandlers()
```

**Description:** Sets up all dashboard event handlers.

**Parameters:** None

**Returns:** `void`

**Called From:** `init()`

**Event Handlers:**
- Create character button
- Create session button
- View character button
- View session button
- Accept/decline invitation buttons

---

#### init()

```javascript
init()
```

**Description:** Initializes the dashboard module.

**Parameters:** None

**Returns:** `void`

**Called From:** App initialization

**Side Effects:**
- Calls `setupEventHandlers()`
- Logs initialization

---

### Notifications Module

**File:** `public/js/modules/notifications.js`  
**Class:** `NotificationsModule`  
**Purpose:** Handles user notifications and alerts throughout the application.

#### Constructor

```javascript
constructor(app)
```

**Description:** Initializes the notifications module.

**Parameters:**
- `app` (Object) - Main application instance

**Returns:** `NotificationsModule` instance

**State:**
- `this.notifications` - Array of active notifications
- `this.maxNotifications` - Maximum notifications to show (default: 5)
- `this.defaultDuration` - Default auto-remove duration (default: 5000ms)

---

#### show(message, type, duration)

```javascript
show(message, type = 'info', duration = null)
```

**Description:** Shows a notification with specified type and duration.

**Parameters:**
- `message` (string) - Notification message
- `type` (string) - Notification type: 'success', 'error', 'warning', 'info' (default: 'info')
- `duration` (number|null) - Auto-remove duration in ms (null = no auto-remove)

**Returns:** `void`

**Called From:** Convenience methods (`success()`, `error()`, etc.)

**Side Effects:**
- Creates notification object
- Renders notification element
- Sets auto-remove timer if duration > 0
- Cleans up old notifications

---

#### success(message, duration)

```javascript
success(message, duration = null)
```

**Description:** Shows a success notification (green).

**Parameters:**
- `message` (string) - Success message
- `duration` (number|null) - Auto-remove duration

**Returns:** `void`

**Called From:** Throughout application for success feedback

---

#### error(message, duration)

```javascript
error(message, duration = null)
```

**Description:** Shows an error notification (red).

**Parameters:**
- `message` (string) - Error message
- `duration` (number|null) - Auto-remove duration

**Returns:** `void`

**Called From:** Throughout application for error feedback

---

#### warning(message, duration)

```javascript
warning(message, duration = null)
```

**Description:** Shows a warning notification (yellow).

**Parameters:**
- `message` (string) - Warning message
- `duration` (number|null) - Auto-remove duration

**Returns:** `void`

---

#### info(message, duration)

```javascript
info(message, duration = null)
```

**Description:** Shows an info notification (blue).

**Parameters:**
- `message` (string) - Info message
- `duration` (number|null) - Auto-remove duration

**Returns:** `void`

---

#### remove(notificationId)

```javascript
remove(notificationId)
```

**Description:** Removes a notification by ID.

**Parameters:**
- `notificationId` (string) - Notification ID

**Returns:** `void`

**Called From:**
- Auto-remove timer
- Close button click
- Click-to-dismiss

**Side Effects:**
- Fades out notification element
- Removes from `this.notifications` array

---

#### clear()

```javascript
clear()
```

**Description:** Removes all active notifications.

**Parameters:** None

**Returns:** `void`

---

#### renderNotification(notification)

```javascript
renderNotification(notification)
```

**Description:** Renders a notification element and appends to DOM.

**Parameters:**
- `notification` (Object) - Notification object with id, message, type, duration

**Returns:** `void`

**Called From:** `show()`

**Notification Structure:**
- Icon based on type
- Message text
- Close button
- Progress bar (if duration > 0)

---

#### getNotificationIcon(type)

```javascript
getNotificationIcon(type)
```

**Description:** Returns Font Awesome icon HTML for notification type.

**Parameters:**
- `type` (string) - Notification type

**Returns:** `string` - Icon HTML

**Icon Mapping:**
- success: `fa-check-circle`
- error: `fa-exclamation-circle`
- warning: `fa-exclamation-triangle`
- info: `fa-info-circle`

---

#### generateNotificationId()

```javascript
generateNotificationId()
```

**Description:** Generates a unique notification ID.

**Parameters:** None

**Returns:** `string` - Unique ID (timestamp + random)

---

#### cleanupOldNotifications()

```javascript
cleanupOldNotifications()
```

**Description:** Removes oldest notifications if count exceeds `maxNotifications`.

**Parameters:** None

**Returns:** `void`

**Called From:** `show()`

---

#### showLoading(message)

```javascript
showLoading(message = 'Loading...')
```

**Description:** Shows a loading notification (spinner, no auto-remove).

**Parameters:**
- `message` (string) - Loading message

**Returns:** `string` - Notification ID (for later removal)

**Called From:** Before async operations

---

#### hideLoading(notificationId)

```javascript
hideLoading(notificationId)
```

**Description:** Hides a loading notification.

**Parameters:**
- `notificationId` (string) - Notification ID from `showLoading()`

**Returns:** `void`

**Called From:** After async operations complete

---

#### confirm(message, onConfirm, onCancel)

```javascript
confirm(message, onConfirm, onCancel = null)
```

**Description:** Shows a confirmation dialog notification.

**Parameters:**
- `message` (string) - Confirmation message
- `onConfirm` (Function) - Callback when user confirms
- `onCancel` (Function|null) - Callback when user cancels

**Returns:** `string` - Notification ID

**Called From:** Before destructive actions

---

#### toast(message, type, duration)

```javascript
toast(message, type = 'info', duration = 3000)
```

**Description:** Shows a small toast notification (less intrusive).

**Parameters:**
- `message` (string) - Toast message
- `type` (string) - Notification type
- `duration` (number) - Auto-remove duration (default: 3000ms)

**Returns:** `string` - Toast ID

**Called From:** For minor notifications

---

#### setupEventHandlers()

```javascript
setupEventHandlers()
```

**Description:** Sets up global AJAX error/success handlers.

**Parameters:** None

**Returns:** `void`

**Called From:** `init()`

**Handlers:**
- Global AJAX error handler (401, 403, 404, 500+)
- Global AJAX success handler (for POST/PUT/DELETE)

---

#### init()

```javascript
init()
```

**Description:** Initializes the notifications module.

**Parameters:** None

**Returns:** `void`

**Called From:** App initialization

---

### Calendar Module

**File:** `public/js/modules/calendar.js`  
**Class:** `CalendarModule`  
**Purpose:** Handles calendar view for session scheduling and management.

#### Constructor

```javascript
constructor(app)
```

**Description:** Initializes the calendar module.

**Parameters:**
- `app` (Object) - Main application instance

**Returns:** `CalendarModule` instance

**State:**
- `this.currentDate` - Currently displayed month/year

---

#### render()

```javascript
async render()
```

**Description:** Renders the calendar view with session indicators.

**Parameters:** None

**Returns:** `Promise<string>` - HTML string for calendar

**Called From:** Route handler when navigating to `/calendar`

**Calendar Includes:**
- Month/year header
- Navigation controls (prev/next month, today)
- Calendar grid (Monday-first, European standard)
- Session indicators on days
- Legend for session statuses

---

#### renderCalendarGrid(sessions)

```javascript
renderCalendarGrid(sessions)
```

**Description:** Renders the calendar grid with days and session indicators.

**Parameters:**
- `sessions` (Array<Object>) - Array of session objects

**Returns:** `string` - HTML for calendar grid

**Called From:** `render()`

**Grid Structure:**
- Header row (Mon-Sun)
- Day cells with:
  - Day number
  - Session indicators (colored by status)
  - Today highlighting
  - Past day styling

---

#### renderCalendarDay(day, sessions, date)

```javascript
renderCalendarDay(day, sessions, date)
```

**Description:** Renders a single calendar day cell.

**Parameters:**
- `day` (number) - Day number (1-31)
- `sessions` (Array<Object>) - Sessions for this day
- `date` (Date) - Date object for this day

**Returns:** `string` - HTML for day cell

**Called From:** `renderCalendarGrid()`

---

#### getSessionsForDay(sessions, date)

```javascript
getSessionsForDay(sessions, date)
```

**Description:** Filters sessions for a specific day.

**Parameters:**
- `sessions` (Array<Object>) - All sessions
- `date` (Date) - Target date

**Returns:** `Array<Object>` - Sessions for the day

**Called From:** `renderCalendarGrid()`

---

#### isToday(date)

```javascript
isToday(date)
```

**Description:** Checks if a date is today.

**Parameters:**
- `date` (Date) - Date to check

**Returns:** `boolean` - True if date is today

**Called From:** `renderCalendarDay()`

---

#### getCurrentMonthYear()

```javascript
getCurrentMonthYear()
```

**Description:** Returns formatted current month and year string.

**Parameters:** None

**Returns:** `string` - Formatted month/year (e.g., "January 2025")

**Called From:** `render()`, `refreshCalendar()`

---

#### setupEventHandlers()

```javascript
setupEventHandlers()
```

**Description:** Sets up calendar event handlers.

**Parameters:** None

**Returns:** `void`

**Called From:** `init()`, `refreshCalendar()`

**Event Handlers:**
- Previous month button
- Next month button
- Today button
- Session indicator clicks
- Day cell clicks

---

#### refreshCalendar()

```javascript
async refreshCalendar()
```

**Description:** Refreshes the calendar display after navigation.

**Parameters:** None

**Returns:** `Promise<void>`

**Called From:** Month navigation buttons

**Side Effects:**
- Re-renders calendar HTML
- Updates month/year display
- Re-attaches event handlers

---

#### showDayDetails(date)

```javascript
showDayDetails(date)
```

**Description:** Shows a modal with sessions for a specific day.

**Parameters:**
- `date` (string) - Date string (ISO format)

**Returns:** `void`

**Called From:** Day cell click handler

**Modal Shows:**
- Date
- List of sessions with times
- Session titles

---

#### init()

```javascript
init()
```

**Description:** Initializes the calendar module.

**Parameters:** None

**Returns:** `void`

**Called From:** App initialization

---

### Auth Module

**File:** `public/js/modules/auth.js`  
**Class:** `AuthModule`  
**Purpose:** Handles user authentication, registration, and session management.

#### Constructor

```javascript
constructor(app)
```

**Description:** Initializes the authentication module.

**Parameters:**
- `app` (Object) - Main application instance

**Returns:** `AuthModule` instance

---

#### handleLogin(event)

```javascript
async handleLogin(event)
```

**Description:** Handles login form submission.

**Parameters:**
- `event` (Event) - Form submit event

**Returns:** `Promise<void>`

**Called From:** Login form submit handler

**Process:**
1. Validates form data
2. Calls login API
3. Stores auth token
4. Updates app state
5. Loads user data
6. Navigates to dashboard

**API Calls:**
- `POST /api/auth/login.php`

**Side Effects:**
- Sets `localStorage.auth_token`
- Updates `app.state.user`
- Updates `app.state.csrfToken`
- Emits `user:login` event

---

#### handleRegister(event)

```javascript
async handleRegister(event)
```

**Description:** Handles registration form submission.

**Parameters:**
- `event` (Event) - Form submit event

**Returns:** `Promise<void>`

**Called From:** Registration form submit handler

**Validation:**
- Password match check
- Password strength validation
- Username format validation
- Email format validation

**API Calls:**
- `POST /api/auth/register.php`

**Side Effects:**
- Shows success message
- Switches to login modal
- Emits `user:register` event

---

#### handleForgotPassword(event)

```javascript
async handleForgotPassword(event)
```

**Description:** Handles password reset request.

**Parameters:**
- `event` (Event) - Form submit event

**Returns:** `Promise<void>`

**Called From:** Forgot password form submit handler

**API Calls:**
- `POST /api/auth/request-password-reset.php`

---

#### handlePasswordReset(event)

```javascript
async handlePasswordReset(event)
```

**Description:** Handles password reset with selector/token.

**Parameters:**
- `event` (Event) - Form submit event

**Returns:** `Promise<void>`

**Called From:** Password reset form submit handler

**Validation:**
- Password match check
- Password strength validation
- Token/selector validation

**API Calls:**
- `POST /api/auth/reset-password.php`

---

#### showForgotPasswordModal()

```javascript
showForgotPasswordModal()
```

**Description:** Shows the forgot password modal.

**Parameters:** None

**Returns:** `void`

**Called From:** "Forgot Password" link click

---

#### showPasswordResetModal(selector, token)

```javascript
showPasswordResetModal(selector = '', token = '')
```

**Description:** Shows the password reset modal with token.

**Parameters:**
- `selector` (string) - Reset selector from URL
- `token` (string) - Reset token from URL

**Returns:** `void`

**Called From:** `checkForPasswordResetToken()`

---

#### checkForPasswordResetToken()

```javascript
checkForPasswordResetToken()
```

**Description:** Checks URL parameters for password reset token and shows modal if present.

**Parameters:** None

**Returns:** `void`

**Called From:** `init()`

**URL Format:**
- `?password-reset=1&selector=...&token=...`

---

#### clearFormFeedback(form)

```javascript
clearFormFeedback(form)
```

**Description:** Clears all error/success messages from a form.

**Parameters:**
- `form` (HTMLElement) - Form element

**Returns:** `void`

**Called From:** Before showing new feedback

---

#### validateUsername(username)

```javascript
validateUsername(username)
```

**Description:** Validates username format (3-50 chars, alphanumeric + underscore).

**Parameters:**
- `username` (string) - Username to validate

**Returns:** `boolean` - True if valid

**Regex:** `/^[a-zA-Z0-9_]{3,50}$/`

---

#### validateEmail(email)

```javascript
validateEmail(email)
```

**Description:** Validates email format.

**Parameters:**
- `email` (string) - Email to validate

**Returns:** `boolean` - True if valid

**Regex:** `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

---

#### validatePassword(password)

```javascript
validatePassword(password)
```

**Description:** Validates password strength.

**Parameters:**
- `password` (string) - Password to validate

**Returns:** `Object` - `{valid: boolean, message: string}`

**Requirements:**
- Minimum 8 characters
- At least one letter
- At least one number

---

#### setFormLoading(form, isLoading)

```javascript
setFormLoading(form, isLoading)
```

**Description:** Sets form loading state (disables submit button, changes text).

**Parameters:**
- `form` (HTMLElement) - Form element
- `isLoading` (boolean) - Loading state

**Returns:** `void`

**Called From:** Before/after async operations

---

#### showFormError(form, message)

```javascript
showFormError(form, message)
```

**Description:** Shows an error message on a form.

**Parameters:**
- `form` (HTMLElement) - Form element
- `message` (string) - Error message

**Returns:** `void`

---

#### showFormSuccess(form, message)

```javascript
showFormSuccess(form, message)
```

**Description:** Shows a success message on a form.

**Parameters:**
- `form` (HTMLElement) - Form element
- `message` (string) - Success message

**Returns:** `void`

---

#### setupFormValidation()

```javascript
setupFormValidation()
```

**Description:** Sets up real-time form validation for all auth forms.

**Parameters:** None

**Returns:** `void`

**Called From:** `init()`

**Validates:**
- Username format
- Email format
- Password strength
- Password match (registration)

---

#### validatePasswordMatch(self)

```javascript
validatePasswordMatch(self = this)
```

**Description:** Validates that password and confirm password match.

**Parameters:**
- `self` (Object) - AuthModule instance (for context)

**Returns:** `void`

**Called From:** Password input change handlers

---

#### showFieldError(field, message)

```javascript
showFieldError(field, message)
```

**Description:** Shows an error message for a specific form field.

**Parameters:**
- `field` (HTMLElement) - Input field
- `message` (string) - Error message

**Returns:** `void`

**Side Effects:**
- Adds error element below field
- Changes field border color

---

#### clearFieldError(field)

```javascript
clearFieldError(field)
```

**Description:** Clears error message for a specific form field.

**Parameters:**
- `field` (HTMLElement) - Input field

**Returns:** `void`

---

#### init()

```javascript
init()
```

**Description:** Initializes the authentication module.

**Parameters:** None

**Returns:** `void`

**Called From:** App initialization

**Initialization:**
- Sets up form validation
- Attaches form submit handlers
- Attaches modal navigation handlers
- Checks for password reset token

---

## PHP API Endpoints (Continued)

### Hex Maps API (Continued)

#### GET /api/hex-maps/list.php

**Description:** Returns a list of hex maps accessible to the current user.

**Request:** GET  
**Query Parameters:**
- `session_id` (optional, int) - Filter by session ID
- `include_inactive` (optional, boolean) - Include inactive maps (default: false)

**Response:**
```json
{
  "status": "success",
  "data": {
    "maps": [...],
    "total_count": int
  }
}
```

**Access Control:**
- Maps created by user
- Maps linked to sessions where user is DM
- Maps linked to sessions where user is accepted player

**Called From:**
- `HexMapEditorModule.renderEditor()` - When no mapId provided

---

#### POST /api/hex-maps/update.php

**Description:** Updates hex map metadata (name, description, dimensions, etc.).

**Request:** POST  
**Body:**
```json
{
  "map_id": int (required),
  "map_name": string (optional),
  "map_description": string (optional),
  "width_hexes": int (optional),
  "height_hexes": int (optional),
  "hex_size_pixels": int (optional),
  "background_image_url": string (optional),
  "is_active": boolean (optional)
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Hex map updated successfully",
  "data": {
    "map_id": int,
    "map_name": string,
    ...
  }
}
```

**Permissions:**
- Map creator
- Session DM (if map linked to session)

**Called From:**
- `HexMapEditorModule.saveMap()` - Updates map metadata

---

#### POST /api/hex-maps/delete.php

**Description:** Deletes a hex map and all associated data (cascade delete).

**Request:** POST  
**Body:**
```json
{
  "map_id": int (required)
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Hex map deleted successfully",
  "data": {
    "map_id": int
  }
}
```

**Permissions:**
- Map creator
- Session DM (if map linked to session)

**Cascade Deletes:**
- All tiles
- All markers
- All visibility data
- All character positions

---

#### GET /api/hex-maps/markers/list.php

**Description:** Returns all markers for a specific map.

**Request:** GET  
**Query Parameters:**
- `map_id` (required, int) - Map ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "markers": [...]
  }
}
```

**Visibility Filtering:**
- DM: Sees all markers
- Player: Only sees markers with `is_visible_to_players = true`

**Called From:**
- `HexMapEditorModule.loadMarkers()`
- `HexMapPlayModule.loadMarkers()`

---

## PHP Service Classes (Continued)

### BECMI Rules Engine (Continued)

#### calculateMovementRates(character)

```php
public static function calculateMovementRates($character)
```

**Description:** Calculates movement rates based on encumbrance (BECMI Chapter 6).

**Parameters:**
- `$character` (array) - Character data with strength and inventory

**Returns:** `array` - Movement rates with:
- `normal` (int) - Normal movement rate
- `encounter` (int) - Encounter movement rate
- `running` (int) - Running movement rate
- `status` (string) - Encumbrance status
- `weight` (int) - Total weight
- `limit` (int) - Weight limit for current status

**Encumbrance Levels:**
- Unencumbered: ≤ 400 cn
- Lightly encumbered: 401-800 cn
- Heavily encumbered: 801-1200 cn
- Severely encumbered: 1201-1600 cn
- Overloaded: 1601-2400 cn
- Immobile: > 2400 cn

**Called From:**
- Character sheet calculations
- Movement validation

---

#### getSpellSlots(class, level)

```php
public static function getSpellSlots($class, $level)
```

**Description:** Gets spell slots for a character class and level.

**Parameters:**
- `$class` (string) - Character class
- `$level` (int) - Character level

**Returns:** `array` - Associative array with spell level as key, count as value

**Supported Classes:**
- `cleric`, `druid` - Cleric spell progression
- `magic_user`, `elf` - Magic-user spell progression
- Others - Returns empty slots

**Called From:**
- Character creation
- Level up wizard
- Spell memorization validation

---

### Event Broadcaster Service

**File:** `app/services/event-broadcaster.php`  
**Class:** `EventBroadcaster`  
**Purpose:** Broadcasts events to session_events table for real-time updates.

#### Constructor

```php
public function __construct()
```

**Description:** Initializes EventBroadcaster with database connection.

**Parameters:** None

**Returns:** `EventBroadcaster` instance

---

#### broadcastEvent(sessionId, eventType, eventData, createdByUserId)

```php
public function broadcastEvent($sessionId, $eventType, $eventData, $createdByUserId = null)
```

**Description:** Broadcasts an event to all participants in a session.

**Parameters:**
- `$sessionId` (int) - Session ID
- `$eventType` (string) - Event type (e.g., 'hp_change', 'item_given', 'hex_map_player_moved')
- `$eventData` (array) - Event data (will be JSON encoded)
- `$createdByUserId` (int|null) - User who triggered the event

**Returns:** `bool` - Success status

**Called From:**
- API endpoints after state changes
- Helper function `broadcastEvent()`

**Database:**
- Inserts into `session_events` table
- Sets `processed = FALSE` for polling clients

---

#### getEvents(sessionId, lastEventId)

```php
public function getEvents($sessionId, $lastEventId = 0)
```

**Description:** Gets unprocessed events for a session since a specific event ID.

**Parameters:**
- `$sessionId` (int) - Session ID
- `$lastEventId` (int) - Last event ID received by client (default: 0)

**Returns:** `array` - Array of event objects with:
- `event_id` (int)
- `event_type` (string)
- `event_data` (array) - Decoded JSON
- `created_at` (string)

**Called From:**
- `/api/realtime/poll.php` - Long-polling endpoint

**Limit:** Maximum 50 events per request

---

#### markEventsProcessed(eventIds)

```php
public function markEventsProcessed($eventIds)
```

**Description:** Marks events as processed.

**Parameters:**
- `$eventIds` (array) - Array of event IDs

**Returns:** `void`

**Called From:**
- After events are delivered to clients

**Side Effects:**
- Sets `processed = TRUE`
- Sets `processed_at = NOW()`

---

#### updateUserActivity(userId, sessionId, lastEventId)

```php
public function updateUserActivity($userId, $sessionId, $lastEventId = 0)
```

**Description:** Updates user activity for a session (for online status tracking).

**Parameters:**
- `$userId` (int) - User ID
- `$sessionId` (int) - Session ID
- `$lastEventId` (int) - Last event ID seen

**Returns:** `void`

**Called From:**
- `/api/realtime/poll.php` - On each poll

**Side Effects:**
- Updates `user_session_activity` table
- Sets `is_online = TRUE`
- Updates `last_poll_at = NOW()`

---

#### getOnlineUsers(sessionId)

```php
public function getOnlineUsers($sessionId)
```

**Description:** Gets online users in a session (polled within last 30 seconds).

**Parameters:**
- `$sessionId` (int) - Session ID

**Returns:** `array` - Array of user objects with:
- `user_id` (int)
- `username` (string)

**Called From:**
- DM dashboard
- Session management

---

#### Helper Function: broadcastEvent()

```php
function broadcastEvent($sessionId, $eventType, $eventData, $userId = null)
```

**Description:** Helper function for easy event broadcasting from API endpoints.

**Parameters:**
- `$sessionId` (int) - Session ID
- `$eventType` (string) - Event type
- `$eventData` (array) - Event data
- `$userId` (int|null) - User ID

**Returns:** `bool` - Success status

**Usage:**
```php
broadcastEvent($sessionId, 'hp_change', ['character_id' => 1, 'new_hp' => 50], $userId);
```

---

### Portrait Manager Service

**File:** `app/services/portrait-manager.php`  
**Class:** `PortraitManager`  
**Purpose:** Handles downloading and managing AI-generated character portraits.

#### downloadPortrait(imageUrl, characterId, characterName)

```php
public static function downloadPortrait($imageUrl, $characterId, $characterName = '')
```

**Description:** Downloads image from URL and saves to local server.

**Parameters:**
- `$imageUrl` (string) - Image URL to download
- `$characterId` (int) - Character ID
- `$characterName` (string) - Character name (for filename)

**Returns:** `string|false` - Relative URL path on success, false on failure

**Called From:**
- `/api/character/generate-portrait.php` - After AI generation

**Process:**
1. Validates URL
2. Fetches image data
3. Validates image format
4. Generates filename
5. Saves to `public/images/portraits/`
6. Returns relative URL

---

### Email Service

**File:** `app/services/email-service.php`  
**Class:** `EmailService`  
**Purpose:** Handles sending email notifications to users.

#### sendSessionReminder(user, session)

```php
public function sendSessionReminder($user, $session)
```

**Description:** Sends session reminder email.

**Parameters:**
- `$user` (array) - User data with email
- `$session` (array) - Session data

**Returns:** `bool` - Success status

**Called From:**
- Cron job (`send-session-reminders.php`)

---

#### sendSessionCancelled(user, session)

```php
public function sendSessionCancelled($user, $session)
```

**Description:** Sends session cancelled notification email.

**Parameters:**
- `$user` (array) - User data
- `$session` (array) - Session data

**Returns:** `bool` - Success status

**Called From:**
- Session deletion/update endpoints

---

#### sendXPAwarded(user, xpAmount, reason, canLevelUp)

```php
public function sendXPAwarded($user, $xpAmount, $reason, $canLevelUp = false)
```

**Description:** Sends XP awarded notification email.

**Parameters:**
- `$user` (array) - User data
- `$xpAmount` (int) - XP amount awarded
- `$reason` (string) - Reason for XP
- `$canLevelUp` (bool) - Whether character can level up

**Returns:** `bool` - Success status

**Called From:**
- `/api/character/grant-xp.php` - After XP is granted

---

#### sendEmail(to, subject, body)

```php
private function sendEmail($to, $subject, $body)
```

**Description:** Sends email using PHP mail() function.

**Parameters:**
- `$to` (string) - Recipient email
- `$subject` (string) - Email subject
- `$body` (string) - Email body (HTML)

**Returns:** `bool` - Success status

**Called From:**
- All public email methods

**Headers:**
- From: BECMI Manager <no-reply@becmi.snilld-api.dk>
- Content-Type: text/html; charset=UTF-8

---

**End of Documentation**
