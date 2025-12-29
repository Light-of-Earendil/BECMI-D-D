/**
 * BECMI D&D Character Manager - Hex Map Editor Module
 * 
 * Provides DM with tools to create and edit hex maps.
 * Supports tile painting, terrain selection, and batch operations.
 * 
 * @module HexMapEditorModule
 */

class HexMapEditorModule {
    /**
     * Creates a new HexMapEditorModule instance
     * 
     * @constructor
     * @param {Object} app - Main application instance
     */
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentMapId = null;
        this.currentMap = null;
        this.tiles = new Map(); // Map of "q,r" -> tile data
        this.initialTileKeys = new Set(); // Track which tiles existed when map was loaded (for detecting deletions)
        this.markers = new Map(); // Map of "q,r" -> marker data
        this.selectedTerrain = 'plains';
        this.selectedTool = 'paint'; // paint, erase, select, place_settlement, draw_border, erase_border, draw_river, erase_river, place_road, erase_road, place_path, erase_path, place_area_label
        this.selectedSettlementType = 'village'; // village, town, city
        this.selectedBorderType = null; // null, 'local', 'regional', 'national'
        this.selectedRiverType = null; // null, 'river', 'stream'
        this.isDrawing = false;
        this.isPanning = false; // For pan/drag functionality
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartOffsetX = 0;
        this.panStartOffsetY = 0;
        this.hoverHex = null; // For border hover feedback
        this.hoverPixelX = null;
        this.hoverPixelY = null;
        this.roadStartHex = null; // For road placement: {q, r} of the starting hex
        this.hexSize = 50;
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1.0;
        this.minZoom = 0.2;
        this.maxZoom = 5.0;
        this.showCoordinates = false; // Debug mode for coordinates
        
        // Terrain image zoom/scale settings per terrain type
        // Controls how large terrain icons are rendered relative to hex size
        // 1.0 = 100% (same as hex radius), 3.0 = 300% (default), etc.
        // Set to a high value (e.g., 10.0) to zoom in on terrain details
        // Each terrain type can have its own scale, or use the default
        this.terrainImageScales = new Map([
            // Add specific scales for terrain types here, e.g.:
            // ['plains', 2.5],
            // ['hills', 3.0],
            // ['mountains', 4.0],
        ]);
        this.terrainImageScaleDefault = 2.75; // Default scale for terrain types not in the map above
        
        // Maximum image size limit (as percentage of hex diameter)
        // Prevents overflow beyond hex bounds. Set to null to disable limit.
        // 0.95 = 95% of diameter (default), 1.0 = 100% (full diameter), null = no limit
        // Can also be set per terrain type in terrainImageMaxSizes map
        this.terrainImageMaxSizes = new Map([
            // Add specific max sizes for terrain types here, e.g.:
            // ['plains', 1.0],
            // ['hills', 1.5],
        ]);
        this.terrainImageMaxSizeDefault = 1.5; // Default max size for terrain types not in the map above
        
        // Terrain type to image mapping
        this.terrainImages = new Map();
        this.loadTerrainImages();
        
        console.log('Hex Map Editor Module initialized');
    }
    
    /**
     * Load terrain images into cache for efficient rendering.
     * Preloads all terrain type images and stores them in this.terrainImages Map.
     * Images are loaded from /images/terrain-icons/ directory.
     * 
     * @returns {void}
     * 
     * @example
     * // Called automatically in constructor
     * this.loadTerrainImages();
     */
    loadTerrainImages() {
        const terrainImageMap = {
            'jungle-rainforest': 'jungle-rainforest.png',
            'jungle-hills': 'jungle-hills.png',
            'jungle-mountains': 'jungle-mountains.png',
            'grasslands-plains': 'grasslands-plains.png',
            'plains': 'grasslands-plains.png', // Alias
            'farmland': 'farmland.png',
            'grassy-hills': 'grassy-hills.png',
            'hills': 'hills.png',
            'hill': 'hills.png', // Alias
            'mountains': 'mountains.png',
            'mountain': 'mountains.png', // Alias
            'mountain-peak': 'mountain-peak.png',
            'high-mountains': 'high-mountains.png',
            'high-mountain-peak': 'high-mountain-peak.png',
            'water': 'water.png',
            'lake': 'lake.png',
            'ocean': 'ocean.png',
            'swamp': 'swamp.png',
            'marsh': 'marsh.png',
            'beach-dunes': 'beach-dunes.png',
            'desert': 'desert.png',
            'rocky-desert': 'rocky-desert.png',
            'desert-hills': 'desert-hills.png',
            'desert-mountains': 'desert-mountains.png',
            'light-forest-deciduous': 'light-forest-deciduous.png',
            'heavy-forest-deciduous': 'heavy-forest-deciduous.png',
            'forest': 'heavy-forest-deciduous.png', // Alias
            'forested-hills-deciduous': 'forested-hills-deciduous.png',
            'forested-mountains-deciduous': 'forested-mountains-deciduous.png',
            'light-forest-coniferous': 'light-forest-coniferous.png',
            'heavy-forest-coniferous': 'heavy-forest-coniferous.png',
            'forested-hills-coniferous': 'forested-hills-coniferous.png',
            'forested-mountains-coniferous': 'forested-mountains-coniferous.png'
        };
        
        // Preload images
        Object.entries(terrainImageMap).forEach(([terrainType, filename]) => {
            const img = new Image();
            img.src = `/images/terrain-icons/${filename}`;
            this.terrainImages.set(terrainType, img);
        });
    }
    
    /**
     * Render the hex map editor view.
     * Loads available maps and optionally loads a specific map for editing.
     * Returns HTML for either the map list (if no map selected) or the editor canvas.
     * 
     * @param {number|null} [mapId=null] - Optional map ID to load immediately
     * @returns {Promise<string>} HTML string for the editor view
     * 
     * @throws {Error} If map loading fails
     * 
     * @example
     * // Render editor without loading a map
     * const html = await hexMapEditor.renderEditor();
     * 
     * // Render editor and load map ID 5
     * const html = await hexMapEditor.renderEditor(5);
     * 
     * @see loadMap() - For loading map data
     * @see renderMapList() - For rendering map list view
     * @see renderEditorCanvas() - For rendering editor interface
     */
    async renderEditor(mapId = null) {
        try {
            let maps = [];
            
            // Load maps list
            try {
                const mapsResponse = await this.apiClient.get('/api/hex-maps/list.php');
                if (mapsResponse.status === 'success') {
                    maps = mapsResponse.data.maps || [];
                }
            } catch (error) {
                console.error('Failed to load maps list:', error);
            }
            
            // Load travel multipliers configuration
            await this.loadTravelMultipliers();
            
            // If mapId provided, load it
            if (mapId) {
                await this.loadMap(mapId);
            }
            
            return `
                <div class="hex-map-editor">
                    <div class="editor-header">
                        <h1><i class="fas fa-map"></i> Hex Map Editor</h1>
                        <div class="editor-actions">
                            <button class="btn btn-primary" id="new-map-btn">
                                <i class="fas fa-plus"></i> New Map
                            </button>
                            <select class="form-control" id="map-selector" style="display: inline-block; width: auto; margin-left: 10px;">
                                <option value="">Select Map...</option>
                                ${maps.map(map => `
                                    <option value="${map.map_id}" ${map.map_id == mapId ? 'selected' : ''}>
                                        ${map.map_name}${map.session_title ? ` (${map.session_title})` : ''}
                                    </option>
                                `).join('')}
                            </select>
                            ${this.currentMap ? `
                                <button class="btn btn-success" id="save-map-btn">
                                    <i class="fas fa-save"></i> Save
                                </button>
                                <button class="btn btn-info" id="play-map-btn">
                                    <i class="fas fa-play"></i> Play Mode
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${this.currentMap ? this.renderEditorCanvas() : this.renderMapList(maps)}
                </div>
            `;
        } catch (error) {
            console.error('Failed to render hex map editor:', error);
            return `<div class="alert alert-danger">Error loading editor: ${error.message}</div>`;
        }
    }
    
    /**
     * Render the map list view showing all available hex maps.
     * Displays maps in a grid layout with edit and play buttons.
     * Shows empty state if no maps exist.
     * 
     * @param {Array<Object>} maps - Array of map objects with metadata
     * @returns {string} HTML string for the map list view
     * 
     * @example
     * const maps = [
     *   { map_id: 1, map_name: "Wilderness", width_hexes: 20, height_hexes: 20, ... }
     * ];
     * const html = this.renderMapList(maps);
     * 
     * @see renderEditor() - Calls this when no map is selected
     */
    renderMapList(maps) {
        if (maps.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-map fa-3x"></i>
                    <h2>No Hex Maps</h2>
                    <p>Create your first hex map to get started</p>
                    <button class="btn btn-primary" id="new-map-btn-empty">
                        <i class="fas fa-plus"></i> Create Map
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="maps-grid">
                ${maps.map(map => `
                    <div class="map-card" data-map-id="${map.map_id}">
                        <div class="map-card-header">
                            <h3>${map.map_name}</h3>
                            ${map.session_title ? `<span class="badge badge-info">${map.session_title}</span>` : ''}
                        </div>
                        <div class="map-card-body">
                            <p>${map.map_description || 'No description'}</p>
                            <div class="map-meta">
                                <span><i class="fas fa-expand-arrows-alt"></i> ${map.width_hexes} × ${map.height_hexes}</span>
                                <span><i class="fas fa-user"></i> ${map.created_by_username}</span>
                            </div>
                        </div>
                        <div class="map-card-actions">
                            <button class="btn btn-sm btn-primary edit-map-btn" data-map-id="${map.map_id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-info play-map-btn" data-map-id="${map.map_id}">
                                <i class="fas fa-play"></i> Play
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render the editor canvas interface with sidebar and canvas container.
     * Includes map properties, terrain palette, tools, settlements, borders, and roads sections.
     * 
     * @returns {string} HTML string for the editor canvas interface
     * 
     * @example
     * const html = this.renderEditorCanvas();
     * // Returns complete editor UI with sidebar and canvas container
     * 
     * @see renderEditor() - Calls this when a map is loaded
     * @see renderTerrainPalette() - For terrain selection UI
     */
    renderEditorCanvas() {
        return `
            <div class="editor-container">
                <div class="editor-sidebar">
                    <div class="sidebar-section">
                        <h3>Map Properties</h3>
                        <div class="form-group">
                            <label>Map Name</label>
                            <input type="text" class="form-control" id="map-name-input" value="${this.currentMap.map_name}" placeholder="Enter map name">
                            <small class="form-text text-muted">The name of your hex map (e.g., "Wilderness Map", "Dungeon Level 1")</small>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea class="form-control" id="map-description-input" rows="3" placeholder="Optional description">${this.currentMap.map_description || ''}</textarea>
                            <small class="form-text text-muted">Optional description or notes about this map</small>
                        </div>
                        <div class="form-group">
                            <label>Width (hexes)</label>
                            <input type="number" class="form-control" id="map-width-input" value="${this.currentMap.width_hexes}" min="1" max="200">
                            <small class="form-text text-muted">Number of hexes horizontally (1-200)</small>
                        </div>
                        <div class="form-group">
                            <label>Height (hexes)</label>
                            <input type="number" class="form-control" id="map-height-input" value="${this.currentMap.height_hexes}" min="1" max="200">
                            <small class="form-text text-muted">Number of hexes vertically (1-200)</small>
                        </div>
                        <div class="form-group">
                            <label>Hex Size (pixels)</label>
                            <input type="number" class="form-control" id="hex-size-input" value="${this.currentMap.hex_size_pixels || 50}" min="10" max="200">
                            <small class="form-text text-muted">Size of each hex in pixels (10-200). Larger = bigger hexes. Recommended: 40-60 for normal view</small>
                        </div>
                        <div class="form-group">
                            <label>Scale (distance per hex)</label>
                            <input type="number" class="form-control" id="map-scale-input" value="${this.currentMap.scale || ''}" min="0" step="0.01" placeholder="e.g., 5.0">
                            <small class="form-text text-muted">Distance from center of one hex to center of the next (in any unit - specify unit in notes). Leave empty if not applicable.</small>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="show-coords-checkbox" ${this.showCoordinates ? 'checked' : ''}>
                                Show Coordinates (Debug)
                            </label>
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Terrain Types</h3>
                        <div class="terrain-palette" id="terrain-palette">
                            ${this.renderTerrainPalette()}
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Tools</h3>
                        <div class="tool-buttons">
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'paint' ? 'active' : ''}" id="paint-tool-btn" data-tool="paint">
                                <i class="fas fa-paint-brush"></i> Paint
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'erase' ? 'active' : ''}" id="erase-tool-btn" data-tool="erase">
                                <i class="fas fa-eraser"></i> Erase
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'select' ? 'active' : ''}" id="select-tool-btn" data-tool="select">
                                <i class="fas fa-mouse-pointer"></i> Select
                            </button>
                        </div>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Settlements</h3>
                        <div class="settlement-buttons">
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_settlement' && this.selectedSettlementType === 'village' ? 'active' : ''}" 
                                    id="place-village-btn" data-settlement="village" data-tool="place_settlement">
                                <i class="fas fa-home"></i> Village
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_settlement' && this.selectedSettlementType === 'town' ? 'active' : ''}" 
                                    id="place-town-btn" data-settlement="town" data-tool="place_settlement">
                                <i class="fas fa-city"></i> Town
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_settlement' && this.selectedSettlementType === 'city' ? 'active' : ''}" 
                                    id="place-city-btn" data-settlement="city" data-tool="place_settlement">
                                <i class="fas fa-building"></i> City
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_settlement' && this.selectedSettlementType === 'castle' ? 'active' : ''}" 
                                    id="place-castle-btn" data-settlement="castle" data-tool="place_settlement">
                                <i class="fas fa-chess-rook"></i> Castle
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_settlement' && this.selectedSettlementType === 'fort' ? 'active' : ''}" 
                                    id="place-fort-btn" data-settlement="fort" data-tool="place_settlement">
                                <i class="fas fa-shield-alt"></i> Fort
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_settlement' && this.selectedSettlementType === 'ruins' ? 'active' : ''}" 
                                    id="place-ruins-btn" data-settlement="ruins" data-tool="place_settlement">
                                <i class="fas fa-monument"></i> Ruins
                            </button>
                        </div>
                        <small class="form-text text-muted">Click on a hex to place a settlement</small>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Borders</h3>
                        <div class="border-buttons">
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'draw_border' && this.selectedBorderType === 'local' ? 'active' : ''}" 
                                    id="border-local-btn" data-border="local" data-tool="draw_border">
                                <i class="fas fa-border-style"></i> Local
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'draw_border' && this.selectedBorderType === 'regional' ? 'active' : ''}" 
                                    id="border-regional-btn" data-border="regional" data-tool="draw_border">
                                <i class="fas fa-border-all"></i> Regional
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'draw_border' && this.selectedBorderType === 'national' ? 'active' : ''}" 
                                    id="border-national-btn" data-border="national" data-tool="draw_border">
                                <i class="fas fa-flag"></i> National
                            </button>
                            <button class="btn btn-sm btn-secondary" id="border-erase-btn" data-tool="erase_border">
                                <i class="fas fa-eraser"></i> Erase Border
                            </button>
                        </div>
                        <small class="form-text text-muted">Click on a hex edge to draw a border. Click again to remove.</small>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Rivers & Streams</h3>
                        <div class="river-buttons border-buttons">
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'draw_river' && this.selectedRiverType === 'river' ? 'active' : ''}" 
                                    id="river-river-btn" data-river="river" data-tool="draw_river">
                                <i class="fas fa-water"></i> River
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'draw_river' && this.selectedRiverType === 'stream' ? 'active' : ''}" 
                                    id="river-stream-btn" data-river="stream" data-tool="draw_river">
                                <i class="fas fa-stream"></i> Stream
                            </button>
                            <button class="btn btn-sm btn-secondary" id="river-erase-btn" data-tool="erase_river">
                                <i class="fas fa-eraser"></i> Erase River
                            </button>
                        </div>
                        <small class="form-text text-muted">Click on a hex edge to draw a river or stream. Click again to remove.</small>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Roads</h3>
                        <div class="border-buttons">
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_road' ? 'active' : ''}" 
                                    id="place-road-btn" data-tool="place_road">
                                <i class="fas fa-road"></i> Place Road
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'erase_road' ? 'active' : ''}" 
                                    id="erase-road-btn" data-tool="erase_road">
                                <i class="fas fa-eraser"></i> Erase Road
                            </button>
                        </div>
                        <small class="form-text text-muted">Click a hex to start a road, then click a neighboring hex to connect them. Click the same hex again to cancel.</small>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Paths</h3>
                        <div class="border-buttons">
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_path' ? 'active' : ''}" 
                                    id="place-path-btn" data-tool="place_path">
                                <i class="fas fa-walking"></i> Place Path
                            </button>
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'erase_path' ? 'active' : ''}" 
                                    id="erase-path-btn" data-tool="erase_path">
                                <i class="fas fa-eraser"></i> Erase Path
                            </button>
                        </div>
                        <small class="form-text text-muted">Click a hex to start a path, then click a neighboring hex to connect them. Paths are drawn as dashed lines.</small>
                    </div>
                    
                    <div class="sidebar-section">
                        <h3>Area Labels</h3>
                        <div class="tool-buttons">
                            <button class="btn btn-sm btn-secondary ${this.selectedTool === 'place_area_label' ? 'active' : ''}" 
                                    id="place-area-label-btn" data-tool="place_area_label">
                                <i class="fas fa-sign"></i> Place Area Name
                            </button>
                        </div>
                        <small class="form-text text-muted">Click on a hex to place an area/region name label.</small>
                    </div>
                </div>
                
                <div class="editor-main">
                    <div class="canvas-wrapper">
                        <div class="canvas-container" id="hex-canvas-container">
                            <canvas id="hex-canvas"></canvas>
                        </div>
                        <div class="canvas-controls">
                            <button class="btn btn-sm btn-secondary" id="zoom-in-btn" title="Zoom In">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="zoom-out-btn" title="Zoom Out">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="reset-view-btn" title="Reset View">
                                <i class="fas fa-home"></i> Reset
                            </button>
                            <span class="canvas-info" id="canvas-info">Zoom: ${Math.round(this.zoom * 100)}% | Shift+Drag to pan | Mouse wheel to zoom</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render terrain palette with icons
     */
    renderTerrainPalette() {
        const terrains = [
            // Basic terrains
            { type: 'plains', name: 'Plains', color: '#90EE90', icon: 'fa-seedling' },
            { type: 'farmland', name: 'Farmland', color: '#9ACD32', icon: 'fa-wheat-awn' },
            { type: 'hills', name: 'Hills', color: '#8B7355', icon: 'fa-hill-rockslide' },
            { type: 'grassy-hills', name: 'Grassy Hills', color: '#7CB342', icon: 'fa-hill-rockslide' },
            { type: 'mountains', name: 'Mountains', color: '#808080', icon: 'fa-mountain' },
            { type: 'mountain-peak', name: 'Mountain Peak', color: '#9E9E9E', icon: 'fa-mountain' },
            { type: 'high-mountains', name: 'High Mountains', color: '#616161', icon: 'fa-mountain' },
            { type: 'high-mountain-peak', name: 'High Mountain Peak', color: '#424242', icon: 'fa-mountain' },
            // Forests
            { type: 'light-forest-deciduous', name: 'Light Forest (Deciduous)', color: '#66BB6A', icon: 'fa-tree' },
            { type: 'heavy-forest-deciduous', name: 'Heavy Forest (Deciduous)', color: '#228B22', icon: 'fa-tree' },
            { type: 'forested-hills-deciduous', name: 'Forested Hills (Deciduous)', color: '#558B2F', icon: 'fa-tree' },
            { type: 'forested-mountains-deciduous', name: 'Forested Mountains (Deciduous)', color: '#33691E', icon: 'fa-tree' },
            { type: 'light-forest-coniferous', name: 'Light Forest (Coniferous)', color: '#4CAF50', icon: 'fa-tree' },
            { type: 'heavy-forest-coniferous', name: 'Heavy Forest (Coniferous)', color: '#1B5E20', icon: 'fa-tree' },
            { type: 'forested-hills-coniferous', name: 'Forested Hills (Coniferous)', color: '#558B2F', icon: 'fa-tree' },
            { type: 'forested-mountains-coniferous', name: 'Forested Mountains (Coniferous)', color: '#2E7D32', icon: 'fa-tree' },
            // Jungles
            { type: 'jungle-rainforest', name: 'Jungle/Rainforest', color: '#2E7D32', icon: 'fa-tree' },
            { type: 'jungle-hills', name: 'Jungle Hills', color: '#1B5E20', icon: 'fa-tree' },
            { type: 'jungle-mountains', name: 'Jungle Mountains', color: '#0D4A1A', icon: 'fa-tree' },
            // Water and wetlands
            { type: 'water', name: 'Water', color: '#4169E1', icon: 'fa-water' },
            { type: 'lake', name: 'Lake', color: '#1E90FF', icon: 'fa-water' },
            { type: 'ocean', name: 'Ocean', color: '#000080', icon: 'fa-water' },
            { type: 'swamp', name: 'Swamp', color: '#556B2F', icon: 'fa-frog' },
            { type: 'marsh', name: 'Marsh', color: '#6B8E23', icon: 'fa-frog' },
            { type: 'beach-dunes', name: 'Beach/Dunes', color: '#F5DEB3', icon: 'fa-water' },
            // Deserts
            { type: 'desert', name: 'Desert', color: '#F4A460', icon: 'fa-sun' },
            { type: 'rocky-desert', name: 'Rocky Desert', color: '#CD853F', icon: 'fa-sun' },
            { type: 'desert-hills', name: 'Desert Hills', color: '#DEB887', icon: 'fa-sun' },
            { type: 'desert-mountains', name: 'Desert Mountains', color: '#BC8F8F', icon: 'fa-sun' }
        ];
        
        return terrains.map(terrain => `
            <div class="terrain-item ${this.selectedTerrain === terrain.type ? 'selected' : ''}" 
                 data-terrain="${terrain.type}" 
                 style="background-color: ${terrain.color};">
                <i class="fas ${terrain.icon}"></i>
                <span>${terrain.name}</span>
            </div>
        `).join('');
    }
    
    /**
     * Normalize borders data for loading from API.
     * Converts JSON string to object, or returns empty object for null/empty.
     * 
     * @param {string|object|null} borders - Borders data from API (JSON string, object, or null)
     * @returns {object} Normalized borders object (empty object if null/empty)
     * 
     * @private
     */
    normalizeBordersForLoad(borders) {
        if (borders === null || borders === undefined) {
            return {};
        }
        if (typeof borders === 'string') {
            if (borders.trim() === '') {
                return {};
            }
            try {
                const parsed = JSON.parse(borders);
                return (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) ? parsed : {};
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse borders JSON:', e);
                return {};
            }
        }
        if (typeof borders === 'object') {
            return Object.keys(borders).length > 0 ? borders : {};
        }
        return {};
    }
    
    /**
     * Normalize roads data for loading from API.
     * Converts JSON string to object, or returns empty object for null/empty.
     * 
     * @param {string|object|null} roads - Roads data from API (JSON string, object, or null)
     * @returns {object} Normalized roads object (empty object if null/empty)
     * 
     * @private
     */
    normalizeRoadsForLoad(roads) {
        if (roads === null || roads === undefined) {
            return {};
        }
        if (typeof roads === 'string') {
            if (roads.trim() === '') {
                return {};
            }
            try {
                const parsed = JSON.parse(roads);
                return (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) ? parsed : {};
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse roads JSON:', e);
                return {};
            }
        }
        if (typeof roads === 'object') {
            return Object.keys(roads).length > 0 ? roads : {};
        }
        return {};
    }
    
    /**
     * Normalize borders data for saving to API.
     * Converts object to object (for JSON encoding), or null if empty.
     * 
     * @param {object|string|null} borders - Borders data (object, JSON string, or null)
     * @returns {object|null} Normalized borders (object if has content, null if empty)
     * 
     * @private
     */
    normalizeBordersForSave(borders) {
        if (borders === null || borders === undefined) {
            return null;
        }
        // If string, try to parse it
        if (typeof borders === 'string') {
            if (borders.trim() === '') {
                return null;
            }
            try {
                const parsed = JSON.parse(borders);
                if (parsed && typeof parsed === 'object') {
                    return Object.keys(parsed).length > 0 ? parsed : null;
                }
                return null;
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse borders JSON for save:', e);
                return null;
            }
        }
        // If object/array, check if it has content
        if (typeof borders === 'object') {
            return Object.keys(borders).length > 0 ? borders : null;
        }
        return null;
    }
    
    /**
     * Normalize roads data for saving to API.
     * Converts object to object (for JSON encoding), or null if empty.
     * 
     * @param {object|string|null} roads - Roads data (object, JSON string, or null)
     * @returns {object|null} Normalized roads (object if has content, null if empty)
     * 
     * @private
     */
    normalizeRoadsForSave(roads) {
        if (roads === null || roads === undefined) {
            return null;
        }
        // If string, try to parse it
        if (typeof roads === 'string') {
            if (roads.trim() === '') {
                return null;
            }
            try {
                const parsed = JSON.parse(roads);
                if (parsed && typeof parsed === 'object') {
                    return Object.keys(parsed).length > 0 ? parsed : null;
                }
                return null;
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse roads JSON for save:', e);
                return null;
            }
        }
        // If object/array, check if it has content
        if (typeof roads === 'object') {
            return Object.keys(roads).length > 0 ? roads : null;
        }
        return null;
    }
    
    /**
     * Normalize paths data for saving to API.
     * Converts object to object (for JSON encoding), or null if empty.
     * 
     * @param {object|string|null} paths - Paths data (object, JSON string, or null)
     * @returns {object|null} Normalized paths (object if has content, null if empty)
     * 
     * @private
     */
    normalizePathsForSave(paths) {
        if (paths === null || paths === undefined) {
            return null;
        }
        // If string, try to parse it
        if (typeof paths === 'string') {
            if (paths.trim() === '') {
                return null;
            }
            try {
                const parsed = JSON.parse(paths);
                if (parsed && typeof parsed === 'object') {
                    return Object.keys(parsed).length > 0 ? parsed : null;
                }
                return null;
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse paths JSON for save:', e);
                return null;
            }
        }
        // If object/array, check if it has content
        if (typeof paths === 'object') {
            return Object.keys(paths).length > 0 ? paths : null;
        }
        return null;
    }
    
    /**
     * Normalize paths data for loading from API.
     * Converts JSON string to object, or returns empty object if null/undefined.
     * 
     * @param {object|string|null} paths - Paths data (object, JSON string, or null)
     * @returns {object} Normalized paths (always an object, empty if no data)
     * 
     * @private
     */
    normalizePathsForLoad(paths) {
        if (paths === null || paths === undefined) {
            return {};
        }
        if (typeof paths === 'string') {
            if (paths.trim() === '') {
                return {};
            }
            try {
                const parsed = JSON.parse(paths);
                return (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) ? parsed : {};
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse paths JSON for load:', e);
                return {};
            }
        }
        if (typeof paths === 'object') {
            return Object.keys(paths).length > 0 ? paths : {};
        }
        return {};
    }
    
    /**
     * Normalize rivers data for saving to API.
     * Converts object to object (for JSON encoding), or null if empty.
     * 
     * @param {object|string|null} rivers - Rivers data (object, JSON string, or null)
     * @returns {object|null} Normalized rivers (object if has content, null if empty)
     * 
     * @private
     */
    normalizeRiversForSave(rivers) {
        if (rivers === null || rivers === undefined) {
            return null;
        }
        // If string, try to parse it
        if (typeof rivers === 'string') {
            if (rivers.trim() === '') {
                return null;
            }
            try {
                const parsed = JSON.parse(rivers);
                if (parsed && typeof parsed === 'object') {
                    const keys = Object.keys(parsed);
                    if (keys.length > 0) {
                        console.log(`[HEX MAP EDITOR] normalizeRiversForSave: Parsed string with ${keys.length} keys:`, keys);
                        return parsed;
                    }
                }
                return null;
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse rivers JSON for save:', e);
                return null;
            }
        }
        // If object/array, check if it has content
        if (typeof rivers === 'object') {
            const keys = Object.keys(rivers);
            if (keys.length > 0) {
                console.log(`[HEX MAP EDITOR] normalizeRiversForSave: Object with ${keys.length} keys:`, keys, 'values:', rivers);
                return rivers;
            } else {
                console.log('[HEX MAP EDITOR] normalizeRiversForSave: Object is empty');
            }
        }
        return null;
    }
    
    /**
     * Normalize rivers data for loading from API.
     * Converts JSON string to object, or returns empty object if null/empty.
     * 
     * @param {object|string|null} rivers - Rivers data (object, JSON string, or null)
     * @returns {object} Normalized rivers (object, never null)
     * 
     * @private
     */
    normalizeRiversForLoad(rivers) {
        if (rivers === null || rivers === undefined) {
            return {};
        }
        if (typeof rivers === 'string') {
            if (rivers.trim() === '') {
                return {};
            }
            try {
                const parsed = JSON.parse(rivers);
                return (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) ? parsed : {};
            } catch (e) {
                console.warn('[HEX MAP EDITOR] Failed to parse rivers JSON for load:', e);
                return {};
            }
        }
        if (typeof rivers === 'object') {
            return Object.keys(rivers).length > 0 ? rivers : {};
        }
        return {};
    }
    
    /**
     * Load travel multipliers configuration from API.
     * Populates terrainTravelMultipliers Map and sets road/path multipliers.
     * 
     * @returns {Promise<void>}
     * 
     * @throws {Error} If API request fails or configuration is invalid
     * 
     * @example
     * // Load multipliers on editor initialization
     * await this.loadTravelMultipliers();
     * 
     * **Process:**
     * 1. Fetches multipliers from API endpoint
     * 2. Populates terrainTravelMultipliers Map with terrain type => multiplier mappings
     * 3. Sets roadTravelMultiplier and pathTravelMultiplier
     * 4. Sets baseTravelTimeHours
     * 
     * **Default Values:**
     * - If API fails, uses default values (road: 0.5, path: 0.7, base: 1.0)
     * - Terrain multipliers default to 1.0 if not found
     * 
     * @see terrainTravelMultipliers - Map storing terrain multipliers
     * @see roadTravelMultiplier - Road travel multiplier
     * @see pathTravelMultiplier - Path travel multiplier
     * @see baseTravelTimeHours - Base travel time per hex in hours
     * 
     * @api GET /api/hex-maps/travel-multipliers.php
     */
    async loadTravelMultipliers() {
        try {
            const response = await this.apiClient.get('/api/hex-maps/travel-multipliers.php');
            
            if (response.status === 'success' && response.data) {
                // Load terrain multipliers into Map
                this.terrainTravelMultipliers.clear();
                if (response.data.terrain && typeof response.data.terrain === 'object') {
                    Object.entries(response.data.terrain).forEach(([terrainType, multiplier]) => {
                        if (terrainType !== 'default' && typeof multiplier === 'number') {
                            this.terrainTravelMultipliers.set(terrainType, multiplier);
                        }
                    });
                }
                
                // Load road and path multipliers
                if (typeof response.data.road === 'number') {
                    this.roadTravelMultiplier = response.data.road;
                }
                if (typeof response.data.path === 'number') {
                    this.pathTravelMultiplier = response.data.path;
                }
                if (typeof response.data.base_time_hours === 'number') {
                    this.baseTravelTimeHours = response.data.base_time_hours;
                }
                
                console.log(`[HEX MAP EDITOR] Loaded ${this.terrainTravelMultipliers.size} terrain multipliers, road: ${this.roadTravelMultiplier}, path: ${this.pathTravelMultiplier}, base time: ${this.baseTravelTimeHours}h`);
            } else {
                console.warn('[HEX MAP EDITOR] Failed to load travel multipliers, using defaults');
            }
        } catch (error) {
            console.warn('[HEX MAP EDITOR] Error loading travel multipliers, using defaults:', error);
            // Use default values if API fails
        }
    }
    
    /**
     * Load a hex map and all its tiles and markers from the API.
     * Parses JSON data for borders and roads, and tracks initial tile state for deletion detection.
     * 
     * @param {number} mapId - The ID of the map to load
     * @returns {Promise<Object>} The loaded map object
     * 
     * @throws {Error} If map ID is invalid or API request fails
     * 
     * @example
     * // Load map ID 5
     * const map = await this.loadMap(5);
     * console.log(`Loaded map: ${map.map_name}`);
     * 
     * @see loadMarkers() - Called after map is loaded
     * @see initialTileKeys - Tracks tiles that existed when map was loaded
     * @see normalizeBordersForLoad() - Normalizes borders data
     * @see normalizeRoadsForLoad() - Normalizes roads data
     * 
     * @api GET /api/hex-maps/get.php?map_id={mapId}&include_tiles=true
     */
    async loadMap(mapId) {
        try {
            console.log(`Loading hex map ${mapId}...`);
            
            const response = await this.apiClient.get(`/api/hex-maps/get.php?map_id=${mapId}&include_tiles=true`);
            
            if (response.status === 'success') {
                this.currentMap = response.data.map;
                this.currentMapId = mapId;
                this.hexSize = this.currentMap.hex_size_pixels || 50;
                
                // Load tiles into map
                this.tiles.clear();
                this.initialTileKeys.clear(); // Reset initial tile tracking
                if (response.data.tiles) {
                    response.data.tiles.forEach(tile => {
                        const key = `${tile.q},${tile.r}`;
                        // Normalize borders, roads, paths, and rivers using utility functions
                        tile.borders = this.normalizeBordersForLoad(tile.borders);
                        tile.roads = this.normalizeRoadsForLoad(tile.roads);
                        tile.paths = this.normalizePathsForLoad(tile.paths);
                        // Use normalizeRiversForLoad if available, otherwise return empty object
                        tile.rivers = (typeof this.normalizeRiversForLoad === 'function') 
                            ? this.normalizeRiversForLoad(tile.rivers) 
                            : (tile.rivers && typeof tile.rivers === 'object' ? tile.rivers : {});
                        this.tiles.set(key, tile);
                        this.initialTileKeys.add(key); // Track that this tile existed when loaded
                    });
                    console.log(`[HEX MAP EDITOR] Loaded ${this.tiles.size} tiles into memory`);
                }
                
                // Load markers
                await this.loadMarkers();
                
                console.log(`Map loaded: ${this.tiles.size} tiles, ${this.markers.size} markers`);
                return this.currentMap;
            } else {
                throw new Error(response.message || 'Failed to load map');
            }
        } catch (error) {
            console.error('Failed to load hex map:', error);
            throw error;
        }
    }
    
    /**
     * Load all markers (settlements, POIs) for the current map.
     * Stores markers in this.markers Map with key format "q,r".
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * // Load markers for current map
     * await this.loadMarkers();
     * console.log(`Loaded ${this.markers.size} markers`);
     * 
     * @see loadMap() - Called after map is loaded
     * @see markers - Map storing marker data
     * 
     * @api GET /api/hex-maps/markers/list.php?map_id={mapId}
     */
    async loadMarkers() {
        if (!this.currentMapId) return;
        
        try {
            const response = await this.apiClient.get(`/api/hex-maps/markers/list.php?map_id=${this.currentMapId}`);
            
            if (response.status === 'success') {
                this.markers.clear();
                if (response.data.markers) {
                    response.data.markers.forEach(marker => {
                        const key = `${marker.q},${marker.r}`;
                        this.markers.set(key, marker);
                    });
                }
                console.log(`Loaded ${this.markers.size} markers`);
            }
        } catch (error) {
            console.error('Failed to load markers:', error);
        }
    }
    
    /**
     * Setup all event listeners for the editor interface.
     * Handles map selection, tool selection, terrain selection, settlement placement,
     * border tools, road tools, save operations, and canvas interactions.
     * 
     * @returns {void}
     * 
     * @example
     * // Called after rendering editor canvas
     * this.setupEventListeners();
     * 
     * @see initCanvas() - Called after a delay to initialize canvas
     * @see renderEditor() - Calls this after rendering
     */
    setupEventListeners() {
        // Map selector
        $(document).on('change', '#map-selector', async (e) => {
            const mapId = parseInt(e.target.value);
            if (mapId) {
                await this.loadMap(mapId);
                await this.app.navigate(`/hex-map-editor/${mapId}`);
            }
        });
        
        // New map button
        $(document).on('click', '#new-map-btn, #new-map-btn-empty', () => {
            this.showNewMapDialog();
        });
        
        // Edit map button
        $(document).on('click', '.edit-map-btn', async (e) => {
            const mapId = parseInt($(e.currentTarget).data('map-id'));
            await this.loadMap(mapId);
            await this.loadMarkers();
            await this.app.navigate(`/hex-map-editor/${mapId}`);
        });
        
        // Delete marker (right-click or context menu)
        $(document).on('contextmenu', '#hex-canvas', async (e) => {
            e.preventDefault();
            const canvas = document.getElementById('hex-canvas');
            if (!canvas) return;
            
            const rect = canvas.getBoundingClientRect();
            // Get mouse position relative to canvas (accounting for canvas scaling)
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            // pixelToHex will handle the offset internally
            const hex = this.pixelToHex(x, y);
            const key = `${hex.q},${hex.r}`;
            const marker = this.markers.get(key);
            
            if (marker && marker.marker_id) {
                if (confirm(`Delete ${marker.marker_name || marker.marker_type}?`)) {
                    await this.deleteMarker(marker.marker_id);
                }
            }
        });
        
        // Play map button
        $(document).on('click', '#play-map-btn, .play-map-btn', async (e) => {
            const mapId = $(e.currentTarget).data('map-id') || this.currentMapId;
            if (mapId) {
                await this.app.navigate(`/hex-map-play/${mapId}`);
            }
        });
        
        // Save map button
        $(document).on('click', '#save-map-btn', () => {
            this.saveMap();
        });
        
        // Terrain selection
        $(document).on('click', '.terrain-item', (e) => {
            $('.terrain-item').removeClass('selected');
            $(e.currentTarget).addClass('selected');
            this.selectedTerrain = $(e.currentTarget).data('terrain');
            // Switch back to paint tool when selecting terrain
            this.selectedTool = 'paint';
            $('.tool-buttons .btn').removeClass('active');
            $('#paint-tool-btn').addClass('active');
        });
        
        // Tool selection
        $(document).on('click', '.tool-buttons .btn', (e) => {
            const tool = $(e.currentTarget).data('tool');
            if (tool) {
                // Reset road start hex when switching away from road tool
                if (this.selectedTool === 'place_road' && tool !== 'place_road') {
                    this.roadStartHex = null;
                }
                // Reset path start hex when switching away from path tool
                if (this.selectedTool === 'place_path' && tool !== 'place_path') {
                    this.pathStartHex = null;
                }
                this.selectedTool = tool;
                $('.tool-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
                
                // Redraw to clear any road placement feedback
                const canvas = document.getElementById('hex-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    this.drawHexGrid(ctx);
                }
            }
        });
        
        // Settlement placement
        $(document).on('click', '.settlement-buttons .btn', (e) => {
            const settlement = $(e.currentTarget).data('settlement');
            const tool = $(e.currentTarget).data('tool');
            if (settlement && tool) {
                this.selectedSettlementType = settlement;
                this.selectedTool = tool;
                this.selectedBorderType = null;
                $('.settlement-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.border-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
            }
        });
        
        // Border tool selection
        $(document).on('click', '.border-buttons .btn', (e) => {
            const border = $(e.currentTarget).data('border');
            const tool = $(e.currentTarget).data('tool');
            if (tool === 'erase_border') {
                this.selectedTool = 'erase_border';
                this.selectedBorderType = null;
                this.selectedRiverType = null;
                $('.border-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.settlement-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
            } else if (tool === 'place_road' || tool === 'erase_road') {
                // Handle road tools (they don't have data-border, only data-tool)
                // Reset road start hex when switching tools
                if (this.selectedTool === 'place_road' && tool !== 'place_road') {
                    this.roadStartHex = null;
                }
                this.selectedTool = tool;
            } else if (tool === 'place_path' || tool === 'erase_path') {
                // Handle path tools (they don't have data-border, only data-tool)
                // Reset path start hex when switching tools
                if (this.selectedTool === 'place_path' && tool !== 'place_path') {
                    this.pathStartHex = null;
                }
                this.selectedTool = tool;
                this.selectedBorderType = null;
                this.selectedRiverType = null;
                this.roadStartHex = null; // Reset road start when switching tools
                this.pathStartHex = null; // Reset path start when switching tools
                $('.border-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.settlement-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
                
                // Redraw to clear any road placement feedback
                const canvas = document.getElementById('hex-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    this.drawHexGrid(ctx);
                }
            } else if (border && tool) {
                // Handle border tools (they have both data-border and data-tool)
                this.selectedBorderType = border;
                this.selectedTool = tool;
                this.selectedRiverType = null;
                $('.border-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.settlement-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
            }
        });
        
        // River tool selection
        $(document).on('click', '.river-buttons .btn, [data-river]', (e) => {
            const river = $(e.currentTarget).data('river');
            const tool = $(e.currentTarget).data('tool');
            if (tool === 'erase_river') {
                this.selectedTool = 'erase_river';
                this.selectedRiverType = null;
                this.selectedBorderType = null;
                $('.border-buttons .btn').removeClass('active');
                $('.river-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.settlement-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
            } else if (river && tool) {
                // Handle river tools (they have both data-river and data-tool)
                this.selectedRiverType = river;
                this.selectedTool = tool;
                this.selectedBorderType = null;
                $('.border-buttons .btn').removeClass('active');
                $('.river-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.settlement-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
            }
        });
        
        // Canvas initialization (deferred until canvas is rendered)
        setTimeout(() => {
            this.initCanvas();
        }, 100);
    }
    
    /**
     * Initialize the hex canvas element and set up all mouse/wheel event handlers.
     * Configures canvas size, centers map, sets up pan/zoom, and handles all mouse interactions.
     * 
     * @returns {void}
     * 
     * @example
     * // Called after canvas is created in DOM
     * this.initCanvas();
     * 
     * @see setupEventListeners() - Calls this after a delay
     * @see drawHexGrid() - Called to render the initial grid
     * 
     * **Mouse Events Configured:**
     * - Middle button or Shift+left: Pan
     * - Left click: Paint/place/erase based on selected tool
     * - Right click: Delete marker (context menu)
     * - Mouse wheel: Zoom towards cursor
     * - Mouse move: Tool-specific hover feedback
     */
    initCanvas() {
        const canvas = document.getElementById('hex-canvas');
        if (!canvas) return;
        
        const container = document.getElementById('hex-canvas-container');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size and center map
        const updateCanvasSize = () => {
            // Use full container size
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            canvas.width = containerWidth;
            canvas.height = containerHeight;
            
            // Center the map on first load or resize
            this.offsetX = canvas.width / 2;
            this.offsetY = canvas.height / 2;
            
            this.drawHexGrid(ctx);
        };
        
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        
        // Mouse events - consolidated handler
        canvas.addEventListener('mousedown', (e) => {
            // Middle mouse button (button 1) or shift+left click for panning
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                e.preventDefault();
                this.startPan(e, canvas);
            } else if (e.button === 0) {
                // Regular left click for painting/placing
                this.handleMouseDown(e, canvas);
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.handlePan(e, canvas);
            } else {
                this.handleMouseMove(e, canvas);
                // Show border edge feedback when hovering
                if (this.selectedTool === 'draw_border' || this.selectedTool === 'erase_border') {
                    this.handleMouseMoveBorder(e, canvas);
                } else if (this.selectedTool === 'draw_river' || this.selectedTool === 'erase_river') {
                    // Show river edge feedback when hovering (same as borders)
                    this.handleMouseMoveBorder(e, canvas);
                } else if (this.selectedTool === 'place_road') {
                    // Show visual feedback for road placement
                    this.handleMouseMoveRoad(e, canvas);
                }
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                this.stopPan();
            } else if (e.button === 0) {
                this.isDrawing = false;
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.isDrawing = false;
            this.stopPan(); // Stop panning if mouse leaves
            // Clear hover feedback
            this.hoverHex = null;
            this.hoverPixelX = null;
            this.hoverPixelY = null;
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        });
        
        // Update hex size when input changes
        $(document).on('change', '#hex-size-input', (e) => {
            const newSize = parseInt(e.target.value);
            if (newSize >= 10 && newSize <= 200) {
                this.hexSize = newSize;
                // Recalculate center
                this.offsetX = canvas.width / 2;
                this.offsetY = canvas.height / 2;
                this.drawHexGrid(ctx);
            }
        });
        
        // Toggle coordinate display
        $(document).on('change', '#show-coords-checkbox', (e) => {
            this.showCoordinates = e.target.checked;
            this.drawHexGrid(ctx);
        });
        
        // Zoom controls
        $(document).on('click', '#zoom-in-btn', () => {
            this.zoomIn(canvas);
        });
        
        $(document).on('click', '#zoom-out-btn', () => {
            this.zoomOut(canvas);
        });
        
        $(document).on('click', '#reset-view-btn', () => {
            this.resetView(canvas);
        });
        
        // Mouse wheel zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleWheelZoom(e, canvas);
        });
        
        // Prevent context menu on middle click (but allow right-click for marker deletion)
        canvas.addEventListener('contextmenu', (e) => {
            // Only prevent if it's a middle click, allow right-click for marker deletion
            if (e.button === 1) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Zoom in on the canvas by 20% (multiply zoom by 1.2).
     * Respects maxZoom limit and updates canvas info display.
     * 
     * @param {HTMLCanvasElement} canvas - Canvas element to zoom
     * @returns {void}
     * 
     * @example
     * // Zoom in on canvas
     * this.zoomIn(canvas);
     * 
     * @see zoomOut() - For zooming out
     * @see handleWheelZoom() - For mouse wheel zoom
     * @see updateCanvasInfo() - Updates zoom display
     */
    zoomIn(canvas) {
        const oldZoom = this.zoom;
        this.zoom = Math.min(this.zoom * 1.2, this.maxZoom);
        this.updateCanvasInfo();
        const ctx = canvas.getContext('2d');
        this.drawHexGrid(ctx);
    }
    
    /**
     * Zoom out on the canvas by 20% (divide zoom by 1.2).
     * Respects minZoom limit and updates canvas info display.
     * 
     * @param {HTMLCanvasElement} canvas - Canvas element to zoom
     * @returns {void}
     * 
     * @example
     * // Zoom out on canvas
     * this.zoomOut(canvas);
     * 
     * @see zoomIn() - For zooming in
     * @see handleWheelZoom() - For mouse wheel zoom
     * @see updateCanvasInfo() - Updates zoom display
     */
    zoomOut(canvas) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.zoom / 1.2, this.minZoom);
        this.updateCanvasInfo();
        const ctx = canvas.getContext('2d');
        this.drawHexGrid(ctx);
    }
    
    /**
     * Reset view to center and default zoom level (1.0).
     * Centers the map in the canvas viewport.
     * 
     * @param {HTMLCanvasElement} canvas - Canvas element to reset
     * @returns {void}
     * 
     * @example
     * // Reset view to default
     * this.resetView(canvas);
     * 
     * @see zoomIn() - For zooming in
     * @see zoomOut() - For zooming out
     * @see updateCanvasInfo() - Updates zoom display
     */
    resetView(canvas) {
        this.zoom = 1.0;
        this.offsetX = canvas.width / 2;
        this.offsetY = canvas.height / 2;
        this.updateCanvasInfo();
        const ctx = canvas.getContext('2d');
        this.drawHexGrid(ctx);
    }
    
    /**
     * Handle mouse wheel zoom with zoom-towards-mouse-position behavior.
     * Adjusts offset to keep the point under the cursor in the same position after zoom.
     * 
     * @param {WheelEvent} e - Mouse wheel event
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {void}
     * 
     * @example
     * // Called automatically by canvas wheel event listener
     * canvas.addEventListener('wheel', (e) => this.handleWheelZoom(e, canvas));
     * 
     * **Zoom Behavior:**
     * - Scroll up: Zoom in (1.1x multiplier)
     * - Scroll down: Zoom out (0.9x multiplier)
     * - Adjusts offset to zoom towards mouse cursor position
     * - Respects minZoom and maxZoom limits
     * 
     * @see zoomIn() - For button-based zoom in
     * @see zoomOut() - For button-based zoom out
     * @see updateCanvasInfo() - Updates zoom display
     */
    handleWheelZoom(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Get mouse position in canvas coordinates
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = mouseX * scaleX;
        const canvasY = mouseY * scaleY;
        
        // Calculate zoom point (where mouse is pointing)
        const zoomPointX = (canvasX - this.offsetX) / this.zoom;
        const zoomPointY = (canvasY - this.offsetY) / this.zoom;
        
        // Apply zoom
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));
        
        if (newZoom !== this.zoom) {
            // Adjust offset to zoom towards mouse position
            this.offsetX = canvasX - zoomPointX * newZoom;
            this.offsetY = canvasY - zoomPointY * newZoom;
            this.zoom = newZoom;
            
            this.updateCanvasInfo();
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Start panning operation (drag to move map).
     * Stores initial mouse position and current offset for pan calculation.
     * 
     * @param {MouseEvent} e - Mouse event (mousedown)
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {void}
     * 
     * @example
     * // Called on middle mouse button or Shift+left click
     * canvas.addEventListener('mousedown', (e) => {
     *   if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
     *     this.startPan(e, canvas);
     *   }
     * });
     * 
     * @see handlePan() - Called during mouse move while panning
     * @see stopPan() - Called on mouse up to stop panning
     */
    startPan(e, canvas) {
        this.isPanning = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        this.panStartX = (e.clientX - rect.left) * scaleX;
        this.panStartY = (e.clientY - rect.top) * scaleY;
        this.panStartOffsetX = this.offsetX;
        this.panStartOffsetY = this.offsetY;
        canvas.style.cursor = 'grabbing';
        canvas.classList.add('panning');
    }
    
    /**
     * Handle panning operation (update offset based on mouse movement).
     * Calculates delta from pan start position and updates canvas offset.
     * 
     * @param {MouseEvent} e - Mouse event (mousemove)
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {void}
     * 
     * @example
     * // Called during mouse move while isPanning is true
     * canvas.addEventListener('mousemove', (e) => {
     *   if (this.isPanning) {
     *     this.handlePan(e, canvas);
     *   }
     * });
     * 
     * @see startPan() - Called to start panning
     * @see stopPan() - Called to stop panning
     */
    handlePan(e, canvas) {
        if (!this.isPanning) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        
        const deltaX = currentX - this.panStartX;
        const deltaY = currentY - this.panStartY;
        
        this.offsetX = this.panStartOffsetX + deltaX;
        this.offsetY = this.panStartOffsetY + deltaY;
        
        const ctx = canvas.getContext('2d');
        this.drawHexGrid(ctx);
    }
    
    /**
     * Stop panning operation and reset cursor style.
     * Called when mouse button is released or mouse leaves canvas.
     * 
     * @returns {void}
     * 
     * @example
     * // Called on mouse up or mouse leave
     * canvas.addEventListener('mouseup', () => this.stopPan());
     * canvas.addEventListener('mouseleave', () => this.stopPan());
     * 
     * @see startPan() - Called to start panning
     * @see handlePan() - Called during panning
     */
    stopPan() {
        this.isPanning = false;
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            canvas.style.cursor = 'crosshair';
            canvas.classList.remove('panning');
        }
    }
    
    /**
     * Update the canvas info display with current zoom level.
     * Displays zoom percentage and control hints.
     * 
     * @returns {void}
     * 
     * @example
     * // Called after zoom operations
     * this.zoomIn(canvas);
     * this.updateCanvasInfo(); // Updates "Zoom: 120%" display
     * 
     * @see zoomIn() - Calls this after zooming
     * @see zoomOut() - Calls this after zooming
     * @see handleWheelZoom() - Calls this after zooming
     * @see resetView() - Calls this after resetting
     */
    updateCanvasInfo() {
        const infoEl = document.getElementById('canvas-info');
        if (infoEl) {
            infoEl.textContent = `Zoom: ${Math.round(this.zoom * 100)}%`;
        }
    }
    
    /**
     * Convert pixel coordinates to hex coordinates (pointy-top hexes)
     * Accounts for zoom level
     */
    pixelToHex(x, y) {
        // Adjust for offset
        x -= this.offsetX;
        y -= this.offsetY;
        
        // Account for zoom - divide by zoom to get actual hex size
        const size = this.hexSize * this.zoom;
        
        // Pointy-top hex coordinate conversion
        const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
        const r = (2 / 3 * y) / size;
        return this.hexRound(q, r);
    }
    
    /**
     * Round fractional hex coordinates to nearest valid hex using axial coordinate rounding algorithm.
     * Ensures pixel clicks always map to valid hex coordinates by maintaining constraint q + r + s = 0.
     * 
     * @param {number} q - Fractional hex column coordinate
     * @param {number} r - Fractional hex row coordinate
     * @returns {Object} Rounded hex coordinates `{q: number, r: number}`
     * 
     * @example
     * // Round fractional coordinates from pixelToHex
     * const fractional = this.pixelToHex(x, y);
     * const rounded = this.hexRound(fractional.q, fractional.r);
     * 
     * **Algorithm:**
     * 1. Calculates third coordinate `s = -q - r`
     * 2. Rounds all three coordinates
     * 3. Checks which coordinate has largest rounding error
     * 4. Recalculates that coordinate from the other two to maintain constraint
     * 
     * @see pixelToHex() - Called after coordinate conversion
     */
    hexRound(q, r) {
        const s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        const rs = Math.round(s);
        
        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);
        
        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        }
        
        return { q: rq, r: rr };
    }
    
    /**
     * Convert hex coordinates to pixel coordinates using pointy-top hex layout.
     * Accounts for zoom level and canvas offset.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Object} Pixel coordinates `{x: number, y: number}`
     * 
     * @example
     * // Get pixel position of hex center
     * const pixel = this.hexToPixel(5, 3);
     * ctx.arc(pixel.x, pixel.y, 10, 0, Math.PI * 2);
     * 
     * **Formula (Pointy-top hexes):**
     * - x = size * (√3 * q + √3/2 * r) + offsetX
     * - y = size * (3/2 * r) + offsetY
     * 
     * @see pixelToHex() - Inverse operation (pixel to hex)
     * @see drawHex() - Uses this to position hex rendering
     */
    hexToPixel(q, r) {
        // Pointy-top hex layout - scale by zoom
        const size = this.hexSize * this.zoom;
        const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + this.offsetX;
        const y = size * (3 / 2 * r) + this.offsetY;
        return { x, y };
    }
    
    /**
     * Draw hex grid
     */
    drawHexGrid(ctx) {
        if (!this.currentMap) return;
        
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw background - dark theme to make hexes pop
        const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
        gradient.addColorStop(0, '#1a1a1a');
        gradient.addColorStop(1, '#2d2d2d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Center the map on canvas
        const mapWidth = this.currentMap.width_hexes;
        const mapHeight = this.currentMap.height_hexes;
        const hexWidth = this.hexSize * Math.sqrt(3);
        const hexHeight = this.hexSize * 2;
        
        // Calculate center offset if not set (only on first load)
        // Don't reset offset if user has panned the map
        if (this.offsetX === 0 && this.offsetY === 0 && !this.isPanning) {
            this.offsetX = ctx.canvas.width / 2;
            this.offsetY = ctx.canvas.height / 2;
        }
        
        // Draw all hexes (both tiles and empty grid)
        const hexesToDraw = new Set();
        
        // Add all tiles
        this.tiles.forEach((tile, key) => {
            hexesToDraw.add(`${tile.q},${tile.r}`);
        });
        
        // Add grid hexes
        for (let q = -Math.floor(mapWidth / 2); q <= Math.floor(mapWidth / 2); q++) {
            for (let r = -Math.floor(mapHeight / 2); r <= Math.floor(mapHeight / 2); r++) {
                hexesToDraw.add(`${q},${r}`);
            }
        }
        
        // Draw all hexes - draw empty hexes first, then painted ones on top
        const emptyHexes = [];
        const paintedHexes = [];
        
        hexesToDraw.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const tile = this.tiles.get(key);
            if (tile && tile.terrain_type) {
                paintedHexes.push({ q, r, tile });
            } else {
                emptyHexes.push({ q, r, tile: null });
            }
        });
        
        // Draw empty hexes first (background)
        emptyHexes.forEach(({ q, r, tile }) => {
            this.drawHex(ctx, q, r, tile);
        });
        
        // Draw painted hexes on top (foreground)
        paintedHexes.forEach(({ q, r, tile }) => {
            this.drawHex(ctx, q, r, tile);
        });
        
        // Draw rivers and streams FIRST (lowest layer - under roads, paths, markers, and borders)
        // Rivers are part of the terrain, so they should be drawn before infrastructure
        this.tiles.forEach((tile, key) => {
            if (tile.rivers && Object.keys(tile.rivers).length > 0) {
                this.drawRivers(ctx, tile.q, tile.r, tile.rivers);
            }
        });
        
        // Draw roads on top of rivers (but below markers)
        // Roads connect hex centers, so draw them after all hexes are drawn
        this.tiles.forEach((tile, key) => {
            if (tile.roads && Object.keys(tile.roads).length > 0) {
                this.drawRoads(ctx, tile.q, tile.r, tile.roads);
            }
        });
        
        // Draw paths on top of roads (but below markers)
        // Paths connect hex centers, drawn as dotted lines
        this.tiles.forEach((tile, key) => {
            if (tile.paths && Object.keys(tile.paths).length > 0) {
                this.drawPaths(ctx, tile.q, tile.r, tile.paths);
            }
        });
        
        // Draw markers on top of hexes, rivers, roads, and paths
        // Markers include villages, towns, cities, forts, castles, ruins, and area labels
        this.markers.forEach((marker, key) => {
            this.drawMarker(ctx, marker);
        });
        
        // Draw borders (local/regional/national) on top of everything
        // This ensures borders are always visible, even over markers, roads, and paths
        this.tiles.forEach((tile, key) => {
            if (tile.borders && Object.keys(tile.borders).length > 0) {
                this.drawBorders(ctx, tile.q, tile.r, tile.borders);
            }
        });
        
        // Draw hover feedback LAST so it's always on top
        // Draw border hover feedback if applicable
        if (this.hoverHex && (this.selectedTool === 'draw_border' || this.selectedTool === 'erase_border')) {
            const edge = this.getEdgeAtPoint(this.hoverHex.q, this.hoverHex.r, this.hoverPixelX, this.hoverPixelY);
            if (edge !== null) {
                this.drawEdgeHoverFeedback(ctx, this.hoverHex.q, this.hoverHex.r, edge);
            }
        }
        
        // Draw river hover feedback if applicable (drawn after borders to be on top)
        if (this.hoverHex && (this.selectedTool === 'draw_river' || this.selectedTool === 'erase_river')) {
            const edge = this.getEdgeAtPoint(this.hoverHex.q, this.hoverHex.r, this.hoverPixelX, this.hoverPixelY);
            if (edge !== null) {
                this.drawEdgeHoverFeedback(ctx, this.hoverHex.q, this.hoverHex.r, edge);
            }
        }
        
        // Draw road placement feedback
        if (this.selectedTool === 'place_road' && this.roadStartHex && this.hoverHex) {
            const startCenter = this.hexToPixel(this.roadStartHex.q, this.roadStartHex.r);
            const hoverCenter = this.hexToPixel(this.hoverHex.q, this.hoverHex.r);
            
            // Check if hover hex is a neighbor
            const neighbors = this.getHexNeighbors(this.roadStartHex.q, this.roadStartHex.r);
            let isNeighbor = false;
            for (let i = 0; i < 6; i++) {
                if (neighbors[i].q === this.hoverHex.q && neighbors[i].r === this.hoverHex.r) {
                    isNeighbor = true;
                    break;
                }
            }
            
            if (isNeighbor) {
                // Draw preview line from start to hover
                ctx.beginPath();
                ctx.moveTo(startCenter.x, startCenter.y);
                ctx.lineTo(hoverCenter.x, hoverCenter.y);
                ctx.strokeStyle = 'rgba(139, 69, 19, 0.6)'; // Semi-transparent brown
                ctx.lineWidth = Math.max(4 * this.zoom, 3);
                ctx.lineCap = 'round';
                ctx.setLineDash([5, 5]); // Dashed line for preview
                ctx.stroke();
                ctx.setLineDash([]); // Reset
            }
            
            // Highlight start hex
            const size = this.hexSize * this.zoom;
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)'; // Brown
            ctx.lineWidth = 4 * this.zoom;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3 * i) - (Math.PI / 2);
                const x = startCenter.x + size * Math.cos(angle);
                const y = startCenter.y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // Draw path placement feedback
        if (this.selectedTool === 'place_path' && this.pathStartHex && this.hoverHex) {
            const startCenter = this.hexToPixel(this.pathStartHex.q, this.pathStartHex.r);
            const hoverCenter = this.hexToPixel(this.hoverHex.q, this.hoverHex.r);
            
            // Check if hover hex is a neighbor
            const neighbors = this.getHexNeighbors(this.pathStartHex.q, this.pathStartHex.r);
            let isNeighbor = false;
            for (let i = 0; i < 6; i++) {
                if (neighbors[i].q === this.hoverHex.q && neighbors[i].r === this.hoverHex.r) {
                    isNeighbor = true;
                    break;
                }
            }
            
            if (isNeighbor) {
                // Draw preview line from start to hover as dotted line
                const dx = hoverCenter.x - startCenter.x;
                const dy = hoverCenter.y - startCenter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const dotRadius = Math.max(2 * this.zoom, 1.5);
                const dotSpacing = Math.max(6 * this.zoom, 5); // Space between dot centers
                
                ctx.fillStyle = 'rgba(160, 82, 45, 0.6)'; // Semi-transparent sienna
                
                // Draw dots along the path
                const numDots = Math.floor(distance / dotSpacing);
                for (let i = 0; i <= numDots; i++) {
                    const t = i / Math.max(numDots, 1);
                    const dotX = startCenter.x + dx * t;
                    const dotY = startCenter.y + dy * t;
                    
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // Highlight start hex
            const size = this.hexSize * this.zoom;
            ctx.strokeStyle = 'rgba(160, 82, 45, 0.8)'; // Sienna
            ctx.lineWidth = 3 * this.zoom;
            ctx.setLineDash([3, 3]); // Dashed outline
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3 * i) - (Math.PI / 2);
                const x = startCenter.x + size * Math.cos(angle);
                const y = startCenter.y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]); // Reset
        }
    }
    
    /**
     * Draw visual feedback highlighting a hex edge when hovering with border/road tools.
     * Shows which edge will be affected when clicking.
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @param {number} edge - Edge index (0-5) to highlight
     * @returns {void}
     * 
     * @example
     * // Highlight top edge of hex (5, 3) when hovering
     * this.drawEdgeHoverFeedback(ctx, 5, 3, 0);
     * 
     * **Visual Feedback Colors:**
     * - Erase tools: Red highlight
     * - Place road: Brown highlight
     * - Draw border: Yellow highlight (or color based on selected border type)
     * 
     * **Edge Indices:**
     * - 0: Top
     * - 1: Top-right
     * - 2: Bottom-right
     * - 3: Bottom
     * - 4: Bottom-left
     * - 5: Top-left
     * 
     * @see drawHexGrid() - Calls this when hover hex and edge are detected
     * @see getEdgeAtPoint() - Used to detect which edge is being hovered
     */
    drawEdgeHoverFeedback(ctx, q, r, edge) {
        const center = this.hexToPixel(q, r);
        const size = this.hexSize * this.zoom;
        
        const edgeAngles = [
            -Math.PI / 2,      // 0: top
            -Math.PI / 6,      // 1: top-right
            Math.PI / 6,       // 2: bottom-right
            Math.PI / 2,       // 3: bottom
            5 * Math.PI / 6,   // 4: bottom-left
            7 * Math.PI / 6    // 5: top-left
        ];
        
        const angle1 = edgeAngles[edge];
        const angle2 = edgeAngles[(edge + 1) % 6];
        
        const x1 = center.x + size * Math.cos(angle1);
        const y1 = center.y + size * Math.sin(angle1);
        const x2 = center.x + size * Math.cos(angle2);
        const y2 = center.y + size * Math.sin(angle2);
        
        // Draw highlight on edge
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        
        // Different colors for different tools - make them more visible
        if (this.selectedTool === 'erase_border' || this.selectedTool === 'erase_river' || this.selectedTool === 'erase_road') {
            ctx.strokeStyle = 'rgba(255, 0, 0, 1.0)'; // Bright red for erase tools (fully opaque)
        } else if (this.selectedTool === 'place_road') {
            ctx.strokeStyle = 'rgba(139, 69, 19, 1.0)'; // Brown for roads (fully opaque)
        } else if (this.selectedTool === 'draw_river') {
            // Bright blue highlight for rivers (matches river color, fully opaque for visibility)
            if (this.selectedRiverType === 'river') {
                ctx.strokeStyle = 'rgba(30, 144, 255, 1.0)'; // Deep blue (DodgerBlue) for rivers - fully opaque
            } else if (this.selectedRiverType === 'stream') {
                ctx.strokeStyle = 'rgba(135, 206, 235, 1.0)'; // Light blue (SkyBlue) for streams - fully opaque
            } else {
                ctx.strokeStyle = 'rgba(30, 144, 255, 1.0)'; // Default to river blue - fully opaque
            }
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 0, 1.0)'; // Bright yellow for borders (fully opaque)
        }
        
        // Make hover feedback very visible - thicker line with glow effect
        ctx.lineWidth = Math.max(8 * this.zoom, 6); // Even thicker line for better visibility
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw a glow effect (draw slightly thicker line with lower opacity first)
        ctx.shadowBlur = 10 * this.zoom;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.stroke();
        
        // Draw main line on top
        ctx.shadowBlur = 0;
        ctx.lineWidth = Math.max(6 * this.zoom, 4);
        ctx.stroke();
    }
    
    /**
     * Draw a single hex with terrain, borders, and roads.
     * Renders hex shape, terrain image/color, borders on edges, and roads to neighbors.
     * Uses per-terrain-type image scaling for optimal visual appearance.
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @param {Object|null} tile - Tile data object or null for empty hex
     * @returns {void}
     * 
     * @example
     * // Draw a hex with terrain
     * const tile = { q: 5, r: 3, terrain_type: 'forest', borders: {0: 'local'}, roads: {1: true} };
     * this.drawHex(ctx, 5, 3, tile);
     * 
     * **Rendering Features:**
     * - Terrain images with per-type scaling (from terrainImageScales Map)
     * - Maximum size limits (from terrainImageMaxSizes Map) to prevent overflow
     * - Color fallback if image not loaded
     * - Border lines on edges (local/regional/national)
     * - Roads drawn to neighbor centers
     * - Coordinate display (if showCoordinates enabled and zoom > 1.5)
     * 
     * @see drawHexGrid() - Calls this for each hex
     * @see drawRoads() - Called to draw roads for this hex
     * @see terrainImageScales - Per-terrain-type image scaling
     * @see terrainImageMaxSizes - Per-terrain-type maximum size limits
     */
    drawHex(ctx, q, r, tile) {
        const center = this.hexToPixel(q, r);
        const size = this.hexSize * this.zoom;
        
        // Draw hex shape (pointy-top: starts at top point)
        // For pointy-top hexes, we start at the top (angle = -90° or -π/2)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            // Pointy-top: start at top, go clockwise
            const angle = (Math.PI / 3 * i) - (Math.PI / 2);
            const x = center.x + size * Math.cos(angle);
            const y = center.y + size * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        
        // Fill with terrain image or color fallback
        if (tile && tile.terrain_type) {
            // Try to use terrain image
            const terrainImg = this.terrainImages.get(tile.terrain_type);
            if (terrainImg && terrainImg.complete && terrainImg.naturalWidth > 0) {
                // Save context state
                ctx.save();
                
                // Clip to hex shape (path is already defined above)
                ctx.clip();
                
                // Calculate image size using configurable scale (per terrain type)
                // Hex size is the distance from center to corner, so diameter is 2 * size
                // Get terrain-specific scale or use default
                const terrainScale = this.terrainImageScales.get(tile.terrain_type) || this.terrainImageScaleDefault;
                const hexDiameter = size * 2; // Distance across hex (corner to corner)
                // Scale according to terrain-specific or default scale
                const imgSizeScaled = size * terrainScale;
                // Get terrain-specific max size or use default
                const terrainMaxSize = this.terrainImageMaxSizes.get(tile.terrain_type) ?? this.terrainImageMaxSizeDefault;
                // Apply max size limit if configured (to prevent overflow beyond hex bounds)
                const imgSize = terrainMaxSize !== null 
                    ? Math.min(imgSizeScaled, hexDiameter * terrainMaxSize)
                    : imgSizeScaled;
                const imgX = center.x - imgSize / 2;
                const imgY = center.y - imgSize / 2;
                
                // Draw terrain image
                ctx.drawImage(terrainImg, imgX, imgY, imgSize, imgSize);
                
                // Restore context
                ctx.restore();
                
                // Redraw hex path for border (clip was consumed)
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3 * i) - (Math.PI / 2);
                    const x = center.x + size * Math.cos(angle);
                    const y = center.y + size * Math.sin(angle);
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
            } else {
                // Fallback to color if image not loaded
                const terrainColors = {
                    // Basic terrains
                    'plains': '#90EE90',      // Light green - bright grasslands
                    'grasslands-plains': '#90EE90',
                    'farmland': '#9ACD32',    // Yellow green - cultivated fields
                    'hill': '#8B7355',        // Dark khaki - rolling hills
                    'hills': '#8B7355',
                    'grassy-hills': '#7CB342', // Medium green - grassy hills
                    'mountain': '#696969',    // Dim gray - rocky peaks
                    'mountains': '#696969',
                    'mountain-peak': '#9E9E9E', // Light gray - peak
                    'high-mountains': '#616161', // Dark gray - high mountains
                    'high-mountain-peak': '#424242', // Very dark gray - high peak
                    // Forests
                    'light-forest-deciduous': '#66BB6A', // Light green - light forest
                    'heavy-forest-deciduous': '#228B22', // Forest green - dense woodland
                    'forest': '#228B22',
                    'forested-hills-deciduous': '#558B2F', // Olive green - forested hills
                    'forested-mountains-deciduous': '#33691E', // Dark green - forested mountains
                    'light-forest-coniferous': '#4CAF50', // Medium green - light coniferous
                    'heavy-forest-coniferous': '#1B5E20', // Very dark green - heavy coniferous
                    'forested-mountains-coniferous': '#2E7D32', // Dark green - coniferous mountains
                    // Jungles
                    'jungle-rainforest': '#2E7D32', // Dark green - jungle
                    'jungle-hills': '#1B5E20', // Very dark green - jungle hills
                    'jungle-mountains': '#0D4A1A', // Almost black green - jungle mountains
                    // Water and wetlands
                    'water': '#1E90FF',       // Dodger blue - clear water
                    'swamp': '#556B2F',       // Dark olive - murky swamp
                    'marsh': '#6B8E23',       // Olive drab - marsh
                    'beach-dunes': '#F5DEB3', // Wheat - beach/dunes
                    // Deserts
                    'desert': '#DEB887',      // Burlywood - sandy desert
                    'rocky-desert': '#CD853F', // Peru - rocky desert
                    'desert-hills': '#DEB887', // Burlywood - desert hills
                    'desert-mountains': '#BC8F8F', // Rosy brown - desert mountains
                    'road': '#F5DEB3'         // Wheat - light path/road
                };
                const color = terrainColors[tile.terrain_type] || '#90EE90';
                ctx.fillStyle = color;
                ctx.fill();
            }
        } else {
            // Empty hex - very dark gray, barely visible grid
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
        }
        
        // Draw border - distinct borders for painted vs empty hexes
        if (tile && tile.terrain_type) {
            // Painted hexes get a darker, more visible border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
        } else {
            // Empty hexes get a very subtle border
            ctx.strokeStyle = '#0a0a0a';
            ctx.lineWidth = 0.5;
        }
        ctx.stroke();
        
        // Draw borders (local/regional/national) on edges
        if (tile && tile.borders && Object.keys(tile.borders).length > 0) {
            const borderColors = {
                'local': '#FFD700',      // Bright yellow (high contrast)
                'regional': '#4169E1',   // Royal blue
                'national': '#B33A2B'     // Red
            };
            
            const borderWidths = {
                'local': 2,
                'regional': 3,
                'national': 4
            };
            
            // Draw each border edge
            Object.keys(tile.borders).forEach(edgeStr => {
                const edge = parseInt(edgeStr);
                const borderType = tile.borders[edge];
                
                if (borderColors[borderType]) {
                    // Calculate edge start and end points
                    const edgeAngles = [
                        -Math.PI / 2,      // 0: top
                        -Math.PI / 6,      // 1: top-right
                        Math.PI / 6,       // 2: bottom-right
                        Math.PI / 2,       // 3: bottom
                        5 * Math.PI / 6,   // 4: bottom-left
                        7 * Math.PI / 6    // 5: top-left
                    ];
                    
                    const angle1 = edgeAngles[edge];
                    const angle2 = edgeAngles[(edge + 1) % 6];
                    
                    const x1 = center.x + size * Math.cos(angle1);
                    const y1 = center.y + size * Math.sin(angle1);
                    const x2 = center.x + size * Math.cos(angle2);
                    const y2 = center.y + size * Math.sin(angle2);
                    
                    // Draw border line
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = borderColors[borderType];
                    ctx.lineWidth = borderWidths[borderType] * this.zoom;
                    ctx.stroke();
                }
            });
        }
        
        // Terrain images are now drawn as backgrounds, so no need for emoji icons
        // Removed emoji icon drawing - images serve as both background and icon
        
        // Coordinates are hidden by default for a clean, professional look
        // To enable coordinate display for debugging, set this.showCoordinates = true
        if (this.showCoordinates && this.zoom > 1.5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${q},${r}`, center.x, center.y);
        }
    }
    
    /**
     * Draw borders (local/regional/national) on hex edges.
     * Called after markers to ensure borders are always visible on top.
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @param {Object} borders - Borders object with edge numbers as keys and border types as values
     * @returns {void}
     * 
     * @example
     * // Draw borders on a hex
     * const borders = { 0: 'local', 1: 'regional' };
     * this.drawBorders(ctx, 5, 3, borders);
     * 
     * **Border Types:**
     * - local: Bright yellow (#FFD700), width 2
     * - regional: Royal blue (#4169E1), width 3
     * - national: Red (#B33A2B), width 4
     * 
     * **Edge Numbers:**
     * - 0: top
     * - 1: top-right
     * - 2: bottom-right
     * - 3: bottom
     * - 4: bottom-left
     * - 5: top-left
     * 
     * @see drawHexGrid() - Calls this after markers to ensure borders are on top
     */
    drawBorders(ctx, q, r, borders) {
        const center = this.hexToPixel(q, r);
        const size = this.hexSize * this.zoom;
        
        const borderColors = {
            'local': '#FFD700',      // Bright yellow (high contrast)
            'regional': '#4169E1',   // Royal blue
            'national': '#B33A2B'     // Red
        };
        
        const borderWidths = {
            'local': 2,
            'regional': 3,
            'national': 4
        };
        
        // Edge angles for pointy-top hexes
        const edgeAngles = [
            -Math.PI / 2,      // 0: top
            -Math.PI / 6,      // 1: top-right
            Math.PI / 6,       // 2: bottom-right
            Math.PI / 2,       // 3: bottom
            5 * Math.PI / 6,   // 4: bottom-left
            7 * Math.PI / 6    // 5: top-left
        ];
        
        // Draw each border edge
        Object.keys(borders).forEach(edgeStr => {
            const edge = parseInt(edgeStr);
            const borderType = borders[edge];
            
            if (borderColors[borderType]) {
                const angle1 = edgeAngles[edge];
                const angle2 = edgeAngles[(edge + 1) % 6];
                
                const x1 = center.x + size * Math.cos(angle1);
                const y1 = center.y + size * Math.sin(angle1);
                const x2 = center.x + size * Math.cos(angle2);
                const y2 = center.y + size * Math.sin(angle2);
                
                // Draw border line
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = borderColors[borderType];
                ctx.lineWidth = borderWidths[borderType] * this.zoom;
                ctx.stroke();
            }
        });
    }
    
    /**
     * Draw rivers and streams on hex edges.
     * Similar to drawBorders() but uses blue colors and draws wavy lines.
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @param {Object} rivers - Rivers object: {edge_index: "river_type", ...}
     * @returns {void}
     * 
     * @example
     * // Draw rivers on a hex
     * const rivers = { 1: 'river', 3: 'stream' };
     * this.drawRivers(ctx, 5, 3, rivers);
     * 
     * **River Types:**
     * - river: Deep blue (#1E90FF), width 4
     * - stream: Light blue (#87CEEB), width 2
     * 
     * **Rendering:**
     * - Draws wavy lines along hex edges
     * - Rivers are thicker and darker than streams
     * - Uses same edge indexing as borders (0-5)
     * 
     * @see drawBorders() - Similar function for borders
     * @see toggleRiver() - Called to place/remove rivers
     */
    drawRivers(ctx, q, r, rivers) {
        const center = this.hexToPixel(q, r);
        const size = this.hexSize * this.zoom;
        
        const riverColors = {
            'river': '#1E90FF',      // Deep blue (DodgerBlue)
            'stream': '#87CEEB'      // Light blue (SkyBlue)
        };
        
        const riverWidths = {
            'river': 4,
            'stream': 2
        };
        
        // Edge angles for pointy-top hexes
        const edgeAngles = [
            -Math.PI / 2,      // 0: top
            -Math.PI / 6,      // 1: top-right
            Math.PI / 6,       // 2: bottom-right
            Math.PI / 2,       // 3: bottom
            5 * Math.PI / 6,   // 4: bottom-left
            7 * Math.PI / 6    // 5: top-left
        ];
        
        // Draw each river edge
        Object.keys(rivers).forEach(edgeStr => {
            const edge = parseInt(edgeStr);
            const riverType = rivers[edge];
            
            if (riverColors[riverType]) {
                const angle1 = edgeAngles[edge];
                const angle2 = edgeAngles[(edge + 1) % 6];
                
                const x1 = center.x + size * Math.cos(angle1);
                const y1 = center.y + size * Math.sin(angle1);
                const x2 = center.x + size * Math.cos(angle2);
                const y2 = center.y + size * Math.sin(angle2);
                
                // Draw wavy river line
                ctx.beginPath();
                const dx = x2 - x1;
                const dy = y2 - y1;
                const length = Math.sqrt(dx * dx + dy * dy);
                const segments = Math.max(Math.floor(length / 8), 4); // More segments for smoother wave
                const waveAmplitude = riverWidths[riverType] * 0.5; // Wave height
                
                // Calculate perpendicular vector for wave offset
                const perpX = -dy / length;
                const perpY = dx / length;
                
                ctx.moveTo(x1, y1);
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const baseX = x1 + dx * t;
                    const baseY = y1 + dy * t;
                    const waveOffset = Math.sin(t * Math.PI * 3) * waveAmplitude; // 3 waves along edge
                    const waveX = baseX + perpX * waveOffset;
                    const waveY = baseY + perpY * waveOffset;
                    
                    if (i === 0) {
                        ctx.moveTo(waveX, waveY);
                    } else {
                        ctx.lineTo(waveX, waveY);
                    }
                }
                
                ctx.strokeStyle = riverColors[riverType];
                ctx.lineWidth = riverWidths[riverType] * this.zoom;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        });
    }
    
    /**
     * Draw a marker (settlement, POI, etc.) on a hex.
     * Renders marker icon, background circle, and name (if zoomed in enough).
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} marker - Marker data object with q, r, marker_type, marker_name, marker_color, etc.
     * @returns {void}
     * 
     * @example
     * // Draw a village marker
     * const marker = { q: 5, r: 3, marker_type: 'village', marker_name: 'Riverside', marker_color: '#8B7355' };
     * this.drawMarker(ctx, marker);
     * 
     * **Marker Rendering:**
     * - Icon: Font Awesome emoji based on marker_type
     * - Background: Colored circle (marker_color or default red)
     * - Border: White stroke
     * - Name: Displayed if zoom > 0.5 and marker_name exists
     * - Position: Above hex center
     * 
     * **Marker Types:**
     * - village: 🏘️
     * - town: 🏙️
     * - city: 🏛️
     * - castle: 🏰
     * - fort: 🏯
     * - ruins: 🏚️
     * - poi: 📍
     * - encounter: ⚔️
     * - treasure: 💰
     * - note: 📝
     * 
     * @see drawHexGrid() - Calls this for each marker
     * @see placeSettlement() - Creates markers
     */
    drawMarker(ctx, marker) {
        const center = this.hexToPixel(marker.q, marker.r);
        const size = this.hexSize * this.zoom;
        
        // Draw marker icon
        const iconSize = size * 0.4;
        const iconY = center.y - size * 0.2; // Position above center
        
        // Draw marker background circle
        //ctx.fillStyle = marker.marker_color || '#FF0000';
        //ctx.beginPath();
        //ctx.arc(center.x, iconY, iconSize * 0.6, 0, Math.PI * 2);
        //ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw icon symbol (using emoji for now, can be enhanced with Font Awesome)
        // Special handling for area labels - render as text only, no icon
        if (marker.marker_type === 'area_label') {
            // Draw area label as large text with background
            if (marker.marker_name) {
                const fontSize = Math.max(size * 0.4, 14); // Larger font for area labels
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Measure text for background
                const metrics = ctx.measureText(marker.marker_name);
                const textWidth = metrics.width;
                const textHeight = fontSize;
                const padding = fontSize * 0.3;
                
                // Draw background rectangle with rounded corners effect
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Semi-transparent black background
                ctx.fillRect(
                    center.x - textWidth / 2 - padding,
                    center.y - textHeight / 2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
                
                // Draw text with outline for readability
                ctx.strokeStyle = '#000';
                ctx.lineWidth = Math.max(fontSize * 0.15, 2);
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.fillStyle = '#FFD700'; // Gold color for area labels
                
                ctx.strokeText(marker.marker_name, center.x, center.y);
                ctx.fillText(marker.marker_name, center.x, center.y);
            }
            return; // Don't draw icon for area labels
        }
        
        const settlementSymbols = {
            'village': '🏘️',
            'town': '🏙️',
            'city': '🏛️',
            'castle': '🏰',
            'fort': '🏯',
            'ruins': '🏚️',
            'poi': '📍',
            'encounter': '⚔️',
            'treasure': '💰',
            'note': '📝'
        };
        
        const symbol = settlementSymbols[marker.marker_type] || '📍';
        ctx.fillStyle = '#fff';
        ctx.font = `${iconSize * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, center.x, iconY);
        
        // Draw marker name if zoomed in enough
        if (marker.marker_name && this.zoom > 0.5) {
            ctx.fillStyle = '#fff';
            // Much larger font size - make names clearly readable
            const fontSize = Math.max(size * 0.25, 10); // At least 10px, scale with hex size
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = Math.max(fontSize * 0.15, 2); // Thicker outline for larger text
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            
            // Draw text with outline for readability
            const textY = center.y + size * 0.4;
            ctx.strokeText(marker.marker_name, center.x, textY);
            ctx.fillText(marker.marker_name, center.x, textY);
        }
    }
    
    /**
     * Handle mouse down events on canvas, routing to appropriate tool handler.
     * Converts mouse pixel coordinates to hex coordinates and calls the appropriate action.
     * 
     * @param {MouseEvent} e - Mouse event (mousedown)
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {void}
     * 
     * @example
     * // Called automatically by canvas mousedown event listener
     * canvas.addEventListener('mousedown', (e) => {
     *   if (e.button === 0) {
     *     this.handleMouseDown(e, canvas);
     *   }
     * });
     * 
     * **Tool Routing:**
     * - `place_settlement` → `placeSettlement()`
     * - `erase` → `eraseHex()`
     * - `draw_border` / `erase_border` → `toggleBorder()` (after edge detection)
     * - `place_road` → `handleRoadPlacement()`
     * - `erase_road` → `eraseRoadFromHex()`
     * - `paint` → `paintHex()` (sets `isDrawing = true` for drag painting)
     * 
     * **Coordinate Conversion:**
     * - Converts mouse pixel coordinates to canvas coordinates
     * - Accounts for canvas scaling
     * - Converts to hex coordinates via `pixelToHex()`
     * 
     * @see pixelToHex() - Converts pixel to hex coordinates
     * @see getEdgeAtPoint() - Used for border tool edge detection
     */
    handleMouseDown(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        // Get mouse position relative to canvas (accounting for canvas scaling)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // pixelToHex will handle the offset internally
        const hex = this.pixelToHex(x, y);
        
        if (this.selectedTool === 'place_settlement') {
            this.placeSettlement(hex.q, hex.r);
        } else if (this.selectedTool === 'erase') {
            this.eraseHex(hex.q, hex.r).catch(error => {
                console.error('Error erasing hex:', error);
            });
        } else if (this.selectedTool === 'draw_border' || this.selectedTool === 'erase_border') {
            // Find which edge was clicked
            const edge = this.getEdgeAtPoint(hex.q, hex.r, x, y);
            if (edge !== null) {
                this.toggleBorder(hex.q, hex.r, edge);
            }
        } else if (this.selectedTool === 'draw_river' || this.selectedTool === 'erase_river') {
            // Find which edge was clicked
            const edge = this.getEdgeAtPoint(hex.q, hex.r, x, y);
            if (edge !== null) {
                this.toggleRiver(hex.q, hex.r, edge);
            }
        } else if (this.selectedTool === 'place_road') {
            // Road placement: click hex to start, click neighbor to connect
            this.handleRoadPlacement(hex.q, hex.r).catch(error => {
                console.error('[Road Placement] Error in handleRoadPlacement:', error);
            });
        } else if (this.selectedTool === 'erase_road') {
            // Erase road: click a hex to remove all roads from it
            this.eraseRoadFromHex(hex.q, hex.r);
        } else if (this.selectedTool === 'place_path') {
            // Path placement: click hex to start, click neighbor to connect
            this.handlePathPlacement(hex.q, hex.r).catch(error => {
                console.error('[Path Placement] Error in handlePathPlacement:', error);
            });
        } else if (this.selectedTool === 'erase_path') {
            // Erase path: click a hex to remove all paths from it
            this.erasePathFromHex(hex.q, hex.r);
        } else if (this.selectedTool === 'place_area_label') {
            this.placeAreaLabel(hex.q, hex.r);
        } else if (this.selectedTool === 'paint') {
            this.paintHex(hex.q, hex.r);
            this.isDrawing = true;
        }
    }
    
    /**
     * Get which edge of a hex was clicked (0-5, or null if center).
     * Uses angle calculation to determine which edge is closest to the click point.
     * More forgiving edge detection with larger hit area (accepts clicks within 90° of an edge).
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @param {number} pixelX - Pixel X coordinate of click
     * @param {number} pixelY - Pixel Y coordinate of click
     * @returns {number|null} Edge index (0-5) or null if click is too close to center
     * 
     * @example
     * // Detect which edge was clicked
     * const edge = this.getEdgeAtPoint(5, 3, mouseX, mouseY);
     * if (edge !== null) {
     *   console.log(`Clicked edge ${edge} of hex (5, 3)`);
     * }
     * 
     * **Edge Indices (Pointy-top hexes):**
     * - 0: Top (-90° or -π/2)
     * - 1: Top-right (-30° or -π/6)
     * - 2: Bottom-right (30° or π/6)
     * - 3: Bottom (90° or π/2)
     * - 4: Bottom-left (150° or 5π/6)
     * - 5: Top-left (210° or 7π/6)
     * 
     * **Algorithm:**
     * 1. Calculates distance from hex center
     * 2. If too close to center (< 40% of hex radius), returns null
     * 3. Calculates angle from center to click point
     * 4. Finds closest edge angle (within 90° tolerance)
     * 5. Returns edge index or null
     * 
     * @see handleMouseDown() - Calls this for border tool edge detection
     * @see toggleBorder() - Uses edge index to toggle border
     */
    getEdgeAtPoint(q, r, pixelX, pixelY) {
        const center = this.hexToPixel(q, r);
        const size = this.hexSize * this.zoom; // Already accounts for zoom in hexToPixel
        
        // Calculate distance from center
        const dx = pixelX - center.x;
        const dy = pixelY - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // More forgiving: allow clicks anywhere in the outer 60% of the hex
        // This makes it much easier to click on edges
        if (dist < size * 0.4) {
            return null; // Too close to center
        }
        
        // Calculate angle from center
        let angle = Math.atan2(dy, dx);
        // Normalize to 0-2π
        if (angle < 0) angle += Math.PI * 2;
        
        // For pointy-top hexes, edges are at: -90°, -30°, 30°, 90°, 150°, 210° (in radians)
        // Convert to: -π/2, -π/6, π/6, π/2, 5π/6, 7π/6
        const edgeAngles = [
            -Math.PI / 2,      // 0: top
            -Math.PI / 6,      // 1: top-right
            Math.PI / 6,       // 2: bottom-right
            Math.PI / 2,       // 3: bottom
            5 * Math.PI / 6,   // 4: bottom-left
            7 * Math.PI / 6    // 5: top-left
        ];
        
        // Find closest edge
        let minDiff = Infinity;
        let closestEdge = null;
        
        for (let i = 0; i < 6; i++) {
            // Normalize edge angle to 0-2π for comparison
            let edgeAngle = edgeAngles[i];
            if (edgeAngle < 0) edgeAngle += Math.PI * 2;
            
            let diff = Math.abs(angle - edgeAngle);
            // Handle wrap-around
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            
            if (diff < minDiff) {
                minDiff = diff;
                closestEdge = i;
            }
        }
        
        // Much more forgiving: accept clicks within 90° of an edge (was 60°)
        // This makes it much easier to place borders
        if (minDiff < Math.PI / 2) {
            return closestEdge;
        }
        
        return null;
    }
    
    
    /**
     * Toggle border on a hex edge
     */
    async toggleBorder(q, r, edge) {
        const key = `${q},${r}`;
        let tile = this.tiles.get(key);
        
        if (!tile) {
            // Create new tile if it doesn't exist
            tile = {
                q,
                r,
                terrain_type: null,
                is_passable: true,
                movement_cost: 1,
                borders: {}
            };
            this.tiles.set(key, tile);
        }
        
        if (!tile.borders) {
            tile.borders = {};
        }
        
        if (this.selectedTool === 'erase_border') {
            // Remove border
            delete tile.borders[edge];
        } else if (this.selectedTool === 'draw_border' && this.selectedBorderType) {
            // Set border
            tile.borders[edge] = this.selectedBorderType;
        }
        
        // Track tile for batch save (will be saved when user clicks "Save Map")
        // Add to initialTileKeys if it wasn't there (tile now exists in memory)
        if (!this.initialTileKeys.has(key)) {
            this.initialTileKeys.add(key);
        }
        
        // Redraw entire grid to show border properly
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Toggle river/stream on a hex edge.
     * Identical functionality to toggleBorder() but for rivers and streams.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @param {number} edge - Edge index (0-5)
     * @returns {Promise<void>}
     * 
     * @example
     * // Place a river on edge 1 of hex (5, 3)
     * this.selectedTool = 'draw_river';
     * this.selectedRiverType = 'river';
     * await this.toggleRiver(5, 3, 1);
     * 
     * **Behavior:**
     * - If tool is 'erase_river': Removes river/stream from edge
     * - If tool is 'draw_river' and selectedRiverType is set: Places river/stream on edge
     * - Creates tile if it doesn't exist
     * - Redraws canvas after change
     * 
     * @see toggleBorder() - Identical function for borders
     * @see selectedRiverType - Current river type ('river' or 'stream')
     * @see drawRivers() - Called to render rivers on canvas
     */
    async toggleRiver(q, r, edge) {
        const key = `${q},${r}`;
        let tile = this.tiles.get(key);
        
        if (!tile) {
            // Create new tile if it doesn't exist
            tile = {
                q,
                r,
                terrain_type: null,
                is_passable: true,
                movement_cost: 1,
                rivers: {}
            };
            this.tiles.set(key, tile);
        }
        
        if (!tile.rivers) {
            tile.rivers = {};
        }
        
        if (this.selectedTool === 'erase_river') {
            // Remove river (convert edge to string for consistency with JSON)
            delete tile.rivers[String(edge)];
        } else if (this.selectedTool === 'draw_river' && this.selectedRiverType) {
            // Set river (convert edge to string for consistency with JSON)
            tile.rivers[String(edge)] = this.selectedRiverType;
            console.log(`[HEX MAP EDITOR] toggleRiver: Set ${this.selectedRiverType} on edge ${edge} for tile (${q}, ${r}). Rivers object:`, tile.rivers);
        }
        
        // Track tile for batch save (will be saved when user clicks "Save Map")
        // Add to initialTileKeys if it wasn't there (tile now exists in memory)
        if (!this.initialTileKeys.has(key)) {
            this.initialTileKeys.add(key);
        }
        
        // Redraw entire grid to show river properly
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Get all six neighboring hexes for a given hex coordinate.
     * Returns neighbors in order: top, top-right, bottom-right, bottom, bottom-left, top-left.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Array<Object>} Array of 6 neighbor objects, each with `{q: number, r: number}`
     * 
     * @example
     * // Get neighbors of hex (5, 3)
     * const neighbors = this.getHexNeighbors(5, 3);
     * // Returns: [
     * //   {q: 5, r: 2},   // Top
     * //   {q: 6, r: 2},   // Top-right
     * //   {q: 6, r: 3},   // Bottom-right
     * //   {q: 5, r: 4},   // Bottom
     * //   {q: 4, r: 4},   // Bottom-left
     * //   {q: 4, r: 3}    // Top-left
     * // ]
     * 
     * **Neighbor Order (Pointy-top hexes):**
     * - Index 0: Top (q, r-1)
     * - Index 1: Top-right (q+1, r-1)
     * - Index 2: Bottom-right (q+1, r)
     * - Index 3: Bottom (q, r+1)
     * - Index 4: Bottom-left (q-1, r+1)
     * - Index 5: Top-left (q-1, r)
     * 
     * @see connectRoads() - Uses neighbor indices for road connections
     * @see eraseRoadFromHex() - Uses to find neighbors when erasing roads
     * @see handleRoadPlacement() - Uses to check if clicked hex is neighbor
     */
    getHexNeighbors(q, r) {
        // For pointy-top hexes, neighbors are:
        return [
            { q: q, r: r - 1 },      // Top
            { q: q + 1, r: r - 1 },  // Top-right
            { q: q + 1, r: r },      // Bottom-right
            { q: q, r: r + 1 },      // Bottom
            { q: q - 1, r: r + 1 },  // Bottom-left
            { q: q - 1, r: r }       // Top-left
        ];
    }
    
    /**
     * Handle road placement using two-click system (center to center).
     * First click sets the start hex, second click on a neighbor connects them with a road.
     * 
     * @param {number} q - Hex column coordinate of clicked hex
     * @param {number} r - Hex row coordinate of clicked hex
     * @returns {Promise<void>}
     * 
     * @example
     * // First click: sets start hex
     * await this.handleRoadPlacement(5, 3);
     * // Second click on neighbor: connects roads
     * await this.handleRoadPlacement(6, 2);
     * 
     * **Behavior:**
     * - First click: Sets `this.roadStartHex` and highlights hex
     * - Click same hex: Cancels road placement
     * - Click non-neighbor: Sets new start hex
     * - Click neighbor: Calls `connectRoads()` and resets start hex
     * 
     * @see connectRoads() - Called to create road connection
     * @see roadStartHex - Stores starting hex for road placement
     * @see getHexNeighbors() - Used to check if clicked hex is neighbor
     */
    async handleRoadPlacement(q, r) {
        // If no start hex, set this as the start
        if (!this.roadStartHex) {
            this.roadStartHex = { q, r };
            // Visual feedback: highlight the start hex
            const canvas = document.getElementById('hex-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                this.drawHexGrid(ctx);
            }
            return;
        }
        
        // If clicking the same hex, cancel
        if (this.roadStartHex.q === q && this.roadStartHex.r === r) {
            this.roadStartHex = null;
            const canvas = document.getElementById('hex-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                this.drawHexGrid(ctx);
            }
            return;
        }
        
        // Check if clicked hex is a neighbor of start hex
        const neighbors = this.getHexNeighbors(this.roadStartHex.q, this.roadStartHex.r);
        let neighborIndex = -1;
        for (let i = 0; i < 6; i++) {
            if (neighbors[i].q === q && neighbors[i].r === r) {
                neighborIndex = i;
                break;
            }
        }
        
        if (neighborIndex === -1) {
            // Not a neighbor - set new start hex
            this.roadStartHex = { q, r };
            const canvas = document.getElementById('hex-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                this.drawHexGrid(ctx);
            }
            return;
        }
        
        // Connect the two hexes with a road
        await this.connectRoads(this.roadStartHex.q, this.roadStartHex.r, q, r, neighborIndex);
        
        // Reset start hex
        this.roadStartHex = null;
        
        // Redraw
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Connect two hexes with a bidirectional road (center to center).
     * Creates road connection on both tiles using neighbor indices.
     * Creates tiles if they don't exist and saves to database.
     * 
     * @param {number} q1 - First hex column coordinate
     * @param {number} r1 - First hex row coordinate
     * @param {number} q2 - Second hex column coordinate
     * @param {number} r2 - Second hex row coordinate
     * @param {number} neighborIndex - Neighbor index from hex1 to hex2 (0-5)
     * @returns {Promise<void>}
     * 
     * @example
     * // Connect hex (5,3) to neighbor 1 (which is hex 6,2)
     * await this.connectRoads(5, 3, 6, 2, 1);
     * 
     * **Road Storage:**
     * - Hex1: `roads[neighborIndex] = true` (road to neighbor at index)
     * - Hex2: `roads[(neighborIndex + 3) % 6] = true` (road back to hex1)
     * - Both tiles saved to database via API
     * 
     * @see handleRoadPlacement() - Calls this when neighbor is clicked
     * @see getHexNeighbors() - Used to find neighbor index
     * 
     * @api POST /api/hex-maps/tiles/create.php - Saves both tiles
     */
    async connectRoads(q1, r1, q2, r2, neighborIndex) {
        const key1 = `${q1},${r1}`;
        const key2 = `${q2},${r2}`;
        
        // Get or create tiles
        let tile1 = this.tiles.get(key1);
        if (!tile1) {
            tile1 = {
                q: q1,
                r: r1,
                terrain_type: null,
                is_passable: true,
                movement_cost: 1,
                roads: {}
            };
            this.tiles.set(key1, tile1);
        }
        if (!tile1.roads) {
            tile1.roads = {};
        }
        
        let tile2 = this.tiles.get(key2);
        if (!tile2) {
            tile2 = {
                q: q2,
                r: r2,
                terrain_type: null,
                is_passable: true,
                movement_cost: 1,
                roads: {}
            };
            this.tiles.set(key2, tile2);
        }
        if (!tile2.roads) {
            tile2.roads = {};
        }
        
        // Add road from hex1 to neighbor (neighborIndex)
        tile1.roads[neighborIndex] = true;
        
        // Add road from hex2 back to hex1 (opposite neighbor: (neighborIndex + 3) % 6)
        const oppositeNeighbor = (neighborIndex + 3) % 6;
        tile2.roads[oppositeNeighbor] = true;
        
        // Track tiles for batch save (will be saved when user clicks "Save Map")
        // Add to initialTileKeys if they weren't there (tiles now exist in memory)
        if (!this.initialTileKeys.has(key1)) {
            this.initialTileKeys.add(key1);
        }
        if (!this.initialTileKeys.has(key2)) {
            this.initialTileKeys.add(key2);
        }
    }
    
    /**
     * Erase all roads from a hex and remove corresponding roads from neighbors.
     * Removes bidirectional road connections and saves/deletes tiles as needed.
     * Deletes tiles from database if they become completely empty after road removal.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Promise<void>}
     * 
     * @example
     * // Erase all roads from hex (5, 3)
     * await this.eraseRoadFromHex(5, 3);
     * 
     * **Process:**
     * 1. Gets tile and checks if it has roads
     * 2. Removes all roads from current hex
     * 3. For each road connection:
     *    - Finds neighbor hex
     *    - Removes opposite road connection from neighbor
     *    - Saves neighbor if it has other data, or deletes if empty
     * 4. Deletes current tile from database if it becomes empty
     * 5. Removes from `this.tiles` and `this.initialTileKeys` if deleted
     * 6. Redraws canvas
     * 
     * **Empty Tile Detection:**
     * - Tile is empty if it has no terrain_type, no roads, and no borders
     * - Empty tiles are deleted from database if they existed when map was loaded
     * 
     * @see getHexNeighbors() - Used to find neighbors when removing roads
     * @see initialTileKeys - Tracks tiles that existed when map was loaded
     * 
     * @api POST /api/hex-maps/tiles/create.php - Updates neighbors with remaining data
     * @api POST /api/hex-maps/tiles/delete.php - Deletes empty tiles
     */
    async eraseRoadFromHex(q, r) {
        const key = `${q},${r}`;
        const tile = this.tiles.get(key);
        
        if (!tile || !tile.roads || Object.keys(tile.roads).length === 0) {
            return; // No roads to erase
        }
        
        // Remove roads from this hex and from neighbors
        const neighbors = this.getHexNeighbors(q, r);
        const roadsToRemove = Object.keys(tile.roads).map(neighborIndexStr => parseInt(neighborIndexStr));
        
        // Remove from this hex
        tile.roads = {};
        
        // Remove from neighbors (opposite direction)
        for (const neighborIndex of roadsToRemove) {
            const neighbor = neighbors[neighborIndex];
            if (neighbor) {
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                const neighborTile = this.tiles.get(neighborKey);
                if (neighborTile && neighborTile.roads) {
                    const oppositeNeighbor = (neighborIndex + 3) % 6;
                    delete neighborTile.roads[oppositeNeighbor];
                    // Neighbor tile will be saved when user clicks "Save Map"
                }
            }
        }
        
        // Check if current tile becomes empty after road removal
        const currentTileHasData = tile.terrain_type || Object.keys(tile.roads || {}).length > 0 || Object.keys(tile.borders || {}).length > 0 || Object.keys(tile.paths || {}).length > 0;
        
        if (!currentTileHasData) {
            // Current tile is empty - remove from local tiles map
            // It will be deleted from database when user clicks "Save Map"
            this.tiles.delete(key);
            // Keep in initialTileKeys if it existed - saveMap() will handle deletion
        }
        // If tile has data, it will be saved when user clicks "Save Map"
        
        // Redraw
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Handle path placement: click hex to start, click neighbor to connect.
     * Similar to road placement but creates paths (dotted lines) instead.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Promise<void>}
     * 
     * @example
     * // Start path placement
     * await this.handlePathPlacement(5, 3);
     * // Click neighbor to connect
     * await this.handlePathPlacement(6, 2);
     * 
     * **Path Placement Process:**
     * 1. First click: Sets start hex (pathStartHex)
     * 2. Second click on neighbor: Connects with path
     * 3. Clicking same hex: Cancels placement
     * 4. Clicking non-neighbor: Sets new start hex
     * 
     * @see handleRoadPlacement() - Similar function for roads
     * @see connectPaths() - Called to create path connection
     */
    async handlePathPlacement(q, r) {
        // If no start hex, set this as the start
        if (!this.pathStartHex) {
            this.pathStartHex = { q, r };
            // Visual feedback: highlight the start hex
            const canvas = document.getElementById('hex-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                this.drawHexGrid(ctx);
            }
            return;
        }
        
        // If clicking the same hex, cancel
        if (this.pathStartHex.q === q && this.pathStartHex.r === r) {
            this.pathStartHex = null;
            const canvas = document.getElementById('hex-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                this.drawHexGrid(ctx);
            }
            return;
        }
        
        // Check if clicked hex is a neighbor of start hex
        const neighbors = this.getHexNeighbors(this.pathStartHex.q, this.pathStartHex.r);
        let neighborIndex = -1;
        for (let i = 0; i < 6; i++) {
            if (neighbors[i].q === q && neighbors[i].r === r) {
                neighborIndex = i;
                break;
            }
        }
        
        if (neighborIndex === -1) {
            // Not a neighbor - set new start hex
            this.pathStartHex = { q, r };
            const canvas = document.getElementById('hex-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                this.drawHexGrid(ctx);
            }
            return;
        }
        
        // Connect the two hexes with a path
        await this.connectPaths(this.pathStartHex.q, this.pathStartHex.r, q, r, neighborIndex);
        
        // Reset start hex
        this.pathStartHex = null;
        
        // Redraw
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Connect two hexes with a bidirectional path (center to center).
     * Creates path connection on both tiles using neighbor indices.
     * Creates tiles if they don't exist and saves to database.
     * 
     * @param {number} q1 - First hex column coordinate
     * @param {number} r1 - First hex row coordinate
     * @param {number} q2 - Second hex column coordinate
     * @param {number} r2 - Second hex row coordinate
     * @param {number} neighborIndex - Neighbor index from hex1 to hex2 (0-5)
     * @returns {Promise<void>}
     * 
     * @example
     * // Connect hex (5,3) to neighbor 1 (which is hex 6,2)
     * await this.connectPaths(5, 3, 6, 2, 1);
     * 
     * **Path Storage:**
     * - Hex1: `paths[neighborIndex] = true` (path to neighbor at index)
     * - Hex2: `paths[(neighborIndex + 3) % 6] = true` (path back to hex1)
     * - Both tiles saved to database via API
     * 
     * @see handlePathPlacement() - Calls this when neighbor is clicked
     * @see getHexNeighbors() - Used to find neighbor index
     * 
     * @api POST /api/hex-maps/tiles/create.php - Saves both tiles
     */
    async connectPaths(q1, r1, q2, r2, neighborIndex) {
        const key1 = `${q1},${r1}`;
        const key2 = `${q2},${r2}`;
        
        // Get or create tiles
        let tile1 = this.tiles.get(key1);
        if (!tile1) {
            tile1 = {
                q: q1,
                r: r1,
                terrain_type: null,
                is_passable: true,
                movement_cost: 1,
                paths: {}
            };
            this.tiles.set(key1, tile1);
        }
        if (!tile1.paths) {
            tile1.paths = {};
        }
        
        let tile2 = this.tiles.get(key2);
        if (!tile2) {
            tile2 = {
                q: q2,
                r: r2,
                terrain_type: null,
                is_passable: true,
                movement_cost: 1,
                paths: {}
            };
            this.tiles.set(key2, tile2);
        }
        if (!tile2.paths) {
            tile2.paths = {};
        }
        
        // Add path from hex1 to neighbor (neighborIndex)
        tile1.paths[neighborIndex] = true;
        
        // Add path from hex2 back to hex1 (opposite neighbor: (neighborIndex + 3) % 6)
        const oppositeNeighbor = (neighborIndex + 3) % 6;
        tile2.paths[oppositeNeighbor] = true;
        
        // Track tiles for batch save (will be saved when user clicks "Save Map")
        // Add to initialTileKeys if they weren't there (tiles now exist in memory)
        if (!this.initialTileKeys.has(key1)) {
            this.initialTileKeys.add(key1);
        }
        if (!this.initialTileKeys.has(key2)) {
            this.initialTileKeys.add(key2);
        }
    }
    
    /**
     * Erase all paths from a hex and remove corresponding paths from neighbors.
     * Removes bidirectional path connections and saves/deletes tiles as needed.
     * Deletes tiles from database if they become completely empty after path removal.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Promise<void>}
     * 
     * @example
     * // Erase all paths from hex (5, 3)
     * await this.erasePathFromHex(5, 3);
     * 
     * **Process:**
     * 1. Gets tile and checks if it has paths
     * 2. Removes all paths from current hex
     * 3. For each path connection:
     *    - Finds neighbor hex
     *    - Removes opposite path connection from neighbor
     *    - Saves neighbor if it has other data, or deletes if empty
     * 4. Deletes current tile from database if it becomes empty
     * 5. Removes from `this.tiles` and `this.initialTileKeys` if deleted
     * 6. Redraws canvas
     * 
     * **Empty Tile Detection:**
     * - Tile is empty if it has no terrain_type, no roads, no paths, and no borders
     * - Empty tiles are deleted from database if they existed when map was loaded
     * 
     * @see getHexNeighbors() - Used to find neighbors when removing paths
     * @see initialTileKeys - Tracks tiles that existed when map was loaded
     * 
     * @api POST /api/hex-maps/tiles/create.php - Updates neighbors with remaining data
     * @api POST /api/hex-maps/tiles/delete.php - Deletes empty tiles
     */
    async erasePathFromHex(q, r) {
        const key = `${q},${r}`;
        const tile = this.tiles.get(key);
        
        if (!tile || !tile.paths || Object.keys(tile.paths).length === 0) {
            return; // No paths to erase
        }
        
        // Remove paths from this hex and from neighbors
        const neighbors = this.getHexNeighbors(q, r);
        const pathsToRemove = Object.keys(tile.paths).map(neighborIndexStr => parseInt(neighborIndexStr));
        
        // Remove from this hex
        tile.paths = {};
        
        // Remove from neighbors (opposite direction)
        for (const neighborIndex of pathsToRemove) {
            const neighbor = neighbors[neighborIndex];
            if (neighbor) {
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                const neighborTile = this.tiles.get(neighborKey);
                if (neighborTile && neighborTile.paths) {
                    const oppositeNeighbor = (neighborIndex + 3) % 6;
                    delete neighborTile.paths[oppositeNeighbor];
                    // Neighbor tile will be saved when user clicks "Save Map"
                }
            }
        }
        
        // Check if current tile becomes empty after path removal
        const currentTileHasData = tile.terrain_type || Object.keys(tile.roads || {}).length > 0 || Object.keys(tile.borders || {}).length > 0 || Object.keys(tile.paths || {}).length > 0;
        
        if (!currentTileHasData) {
            // Current tile is empty - remove from local tiles map
            // It will be deleted from database when user clicks "Save Map"
            this.tiles.delete(key);
            // Keep in initialTileKeys if it existed - saveMap() will handle deletion
        }
        // If tile has data, it will be saved when user clicks "Save Map"
        
        // Redraw
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Toggle road on a hex edge (with automatic connection to neighbors) - DEPRECATED, kept for compatibility
     */
    async toggleRoad(q, r, edge) {
        const key = `${q},${r}`;
        let tile = this.tiles.get(key);
        
        if (!tile) {
            // Create new tile if it doesn't exist
            tile = {
                q,
                r,
                terrain_type: null,
                is_passable: true,
                movement_cost: 1,
                roads: {}
            };
            this.tiles.set(key, tile);
        }
        
        if (!tile.roads) {
            tile.roads = {};
        }
        
        if (this.selectedTool === 'erase_road') {
            // Remove road
            const hadRoad = tile.roads[edge] === true;
            delete tile.roads[edge];
            
            // Check if current tile becomes empty after road removal
            const currentTileHasData = tile.terrain_type || Object.keys(tile.roads || {}).length > 0 || Object.keys(tile.borders || {}).length > 0;
            
            // Also remove from neighbor if it exists
            const neighbors = this.getHexNeighbors(q, r);
            const neighbor = neighbors[edge];
            if (neighbor) {
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                const neighborTile = this.tiles.get(neighborKey);
                if (neighborTile && neighborTile.roads) {
                    // Opposite edge (edge + 3 mod 6)
                    const oppositeEdge = (edge + 3) % 6;
                    const neighborHadRoad = neighborTile.roads[oppositeEdge] === true;
                    delete neighborTile.roads[oppositeEdge];
                    
                    // Check if tile has any data left after road deletion
                    const neighborHasOtherData = neighborTile.terrain_type || Object.keys(neighborTile.roads || {}).length > 0 || Object.keys(neighborTile.borders || {}).length > 0;
                    
                    if (!neighborHasOtherData && neighborHadRoad) {
                        // Tile had a road but now has no data - remove from local tiles map
                        // It will be deleted from database when user clicks "Save Map"
                        this.tiles.delete(neighborKey);
                        // Keep in initialTileKeys if it existed - saveMap() will handle deletion
                    }
                    // If neighbor has data, it will be saved when user clicks "Save Map"
                }
            }
            
            // Handle current tile - check if it's empty and remove if so
            if (!currentTileHasData && hadRoad) {
                // Current tile is empty - remove from local tiles map
                // It will be deleted from database when user clicks "Save Map"
                this.tiles.delete(key);
                // Keep in initialTileKeys if it existed - saveMap() will handle deletion
            }
            // If current tile has data, it will be saved when user clicks "Save Map"
        } else if (this.selectedTool === 'place_road') {
            // Place road
            tile.roads[edge] = true;
            
            // Automatically connect to neighbor
            const neighbors = this.getHexNeighbors(q, r);
            const neighbor = neighbors[edge];
            if (neighbor) {
                const neighborKey = `${neighbor.q},${neighbor.r}`;
                let neighborTile = this.tiles.get(neighborKey);
                
                if (!neighborTile) {
                    // Create neighbor tile if it doesn't exist
                    neighborTile = {
                        q: neighbor.q,
                        r: neighbor.r,
                        terrain_type: null,
                        is_passable: true,
                        movement_cost: 1,
                        roads: {}
                    };
                    this.tiles.set(neighborKey, neighborTile);
                }
                
                if (!neighborTile.roads) {
                    neighborTile.roads = {};
                }
                
                // Set opposite edge (edge + 3 mod 6)
                const oppositeEdge = (edge + 3) % 6;
                neighborTile.roads[oppositeEdge] = true;
                
                // Track neighbor tile for batch save (will be saved when user clicks "Save Map")
                // Add to initialTileKeys if it wasn't there (tile now exists in memory)
                if (!this.initialTileKeys.has(neighborKey)) {
                    this.initialTileKeys.add(neighborKey);
                }
            }
            
            // Track current tile for batch save (will be saved when user clicks "Save Map")
            // Add to initialTileKeys if it wasn't there (tile now exists in memory)
            if (!this.initialTileKeys.has(key)) {
                this.initialTileKeys.add(key);
            }
        }
        
        // Redraw entire grid to show roads properly
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Draw roads on a hex (connecting to neighboring hexes)
     */
    drawRoads(ctx, q, r, roads) {
        if (!roads || Object.keys(roads).length === 0) return;
        
        const center = this.hexToPixel(q, r);
        const size = this.hexSize * this.zoom;
        
        // Edge angles for pointy-top hexes (starting from top, going clockwise)
        const edgeAngles = [
            -Math.PI / 2,                    // 0: top
            -Math.PI / 6,                    // 1: top-right
            Math.PI / 6,                     // 2: bottom-right
            Math.PI / 2,                     // 3: bottom
            5 * Math.PI / 6,                 // 4: bottom-left
            -5 * Math.PI / 6                 // 5: top-left
        ];
        
        // Get neighbors
        const neighbors = this.getHexNeighbors(q, r);
        
        // Draw each road edge - connect to neighbor center
        Object.keys(roads).forEach(edgeStr => {
            const edge = parseInt(edgeStr);
            if (roads[edge] && edge >= 0 && edge < 6) {
                const neighbor = neighbors[edge];
                if (neighbor) {
                    const neighborCenter = this.hexToPixel(neighbor.q, neighbor.r);
                    
                    // Draw road line from this hex center to neighbor center
                    ctx.beginPath();
                    ctx.moveTo(center.x, center.y);
                    ctx.lineTo(neighborCenter.x, neighborCenter.y);
                    ctx.strokeStyle = '#8B4513'; // Saddle brown
                    ctx.lineWidth = Math.max(4 * this.zoom, 3);
                    ctx.lineCap = 'round';
                    ctx.stroke();
                } else {
                    // No neighbor - draw from center to edge
                    const angle = edgeAngles[edge];
                    const endX = center.x + size * Math.cos(angle);
                    const endY = center.y + size * Math.sin(angle);
                    
                    ctx.beginPath();
                    ctx.moveTo(center.x, center.y);
                    ctx.lineTo(endX, endY);
                    ctx.strokeStyle = '#8B4513'; // Saddle brown
                    ctx.lineWidth = Math.max(4 * this.zoom, 3);
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
            }
        });
    }
    
    /**
     * Draw paths (dotted lines) connecting hex centers.
     * Similar to roads but drawn as dotted lines to distinguish them.
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @param {Object} paths - Paths object with neighbor indices as keys and true as values
     * @returns {void}
     * 
     * @example
     * // Draw paths on a hex
     * const paths = { 1: true, 3: true };
     * this.drawPaths(ctx, 5, 3, paths);
     * 
     * **Path Rendering:**
     * - Dotted lines (unlike solid roads)
     * - Sienna color (#A0522D)
     * - Thinner than roads (3px vs 4px)
     * - Connects hex centers (same as roads)
     * 
     * @see drawRoads() - Similar function for solid roads
     * @see drawHexGrid() - Calls this for each tile with paths
     */
    drawPaths(ctx, q, r, paths) {
        if (!paths || Object.keys(paths).length === 0) return;
        
        const center = this.hexToPixel(q, r);
        const size = this.hexSize * this.zoom;
        
        // Edge angles for pointy-top hexes (starting from top, going clockwise)
        const edgeAngles = [
            -Math.PI / 2,                    // 0: top
            -Math.PI / 6,                    // 1: top-right
            Math.PI / 6,                     // 2: bottom-right
            Math.PI / 2,                     // 3: bottom
            5 * Math.PI / 6,                 // 4: bottom-left
            -5 * Math.PI / 6                 // 5: top-left
        ];
        
        // Get neighbors
        const neighbors = this.getHexNeighbors(q, r);
        
        // Draw each path edge - connect to neighbor center (as dotted line)
        Object.keys(paths).forEach(edgeStr => {
            const edge = parseInt(edgeStr);
            if (paths[edge] && edge >= 0 && edge < 6) {
                const neighbor = neighbors[edge];
                if (neighbor) {
                    const neighborCenter = this.hexToPixel(neighbor.q, neighbor.r);
                    
                    // Draw path as dotted line from this hex center to neighbor center
                    // Calculate distance and draw dots along the path
                    const dx = neighborCenter.x - center.x;
                    const dy = neighborCenter.y - center.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const dotRadius = Math.max(2 * this.zoom, 1.5);
                    const dotSpacing = Math.max(6 * this.zoom, 5); // Space between dot centers
                    
                    ctx.fillStyle = '#A0522D'; // Sienna (darker than roads)
                    
                    // Draw dots along the path
                    const numDots = Math.floor(distance / dotSpacing);
                    for (let i = 0; i <= numDots; i++) {
                        const t = i / Math.max(numDots, 1);
                        const dotX = center.x + dx * t;
                        const dotY = center.y + dy * t;
                        
                        ctx.beginPath();
                        ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    // No neighbor - draw from center to edge as dotted line
                    const angle = edgeAngles[edge];
                    const endX = center.x + size * Math.cos(angle);
                    const endY = center.y + size * Math.sin(angle);
                    
                    // Calculate distance and draw dots along the path
                    const dx = endX - center.x;
                    const dy = endY - center.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const dotRadius = Math.max(2 * this.zoom, 1.5);
                    const dotSpacing = Math.max(6 * this.zoom, 5); // Space between dot centers
                    
                    ctx.fillStyle = '#A0522D'; // Sienna
                    
                    // Draw dots along the path
                    const numDots = Math.floor(distance / dotSpacing);
                    for (let i = 0; i <= numDots; i++) {
                        const t = i / Math.max(numDots, 1);
                        const dotX = center.x + dx * t;
                        const dotY = center.y + dy * t;
                        
                        ctx.beginPath();
                        ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });
    }
    
    /**
     * Handle mouse move for drag painting (when isDrawing is true).
     * Continuously paints hexes as mouse moves while paint tool is active.
     * 
     * @param {MouseEvent} e - Mouse event (mousemove)
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {void}
     * 
     * @example
     * // Called automatically by canvas mousemove event listener
     * canvas.addEventListener('mousemove', (e) => {
     *   this.handleMouseMove(e, canvas);
     * });
     * 
     * **Behavior:**
     * - Only paints if `this.isDrawing === true` (set on mousedown with paint tool)
     * - Converts mouse position to hex coordinates
     * - Calls `paintHex()` for instant feedback
     * 
     * @see handleMouseDown() - Sets `isDrawing = true` for paint tool
     * @see paintHex() - Called to paint each hex during drag
     */
    handleMouseMove(e, canvas) {
        if (!this.isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        // Get mouse position relative to canvas (accounting for canvas scaling)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // pixelToHex will handle the offset internally
        const hex = this.pixelToHex(x, y);
        this.paintHex(hex.q, hex.r);
    }
    
    /**
     * Handle mouse move for road tool (shows visual feedback).
     * Updates hover hex and redraws canvas to show road placement preview.
     * 
     * @param {MouseEvent} e - Mouse event (mousemove)
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {void}
     * 
     * @example
     * // Called automatically when place_road tool is active
     * if (this.selectedTool === 'place_road') {
     *   this.handleMouseMoveRoad(e, canvas);
     * }
     * 
     * **Visual Feedback:**
     * - Highlights `roadStartHex` (if set)
     * - Draws dashed preview line to hover hex (if neighbor)
     * - Updates `this.hoverHex` for `drawHexGrid()` to use
     * 
     * @see drawHexGrid() - Uses hoverHex to draw road placement preview
     * @see handleRoadPlacement() - Uses roadStartHex for two-click system
     */
    handleMouseMoveRoad(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const hex = this.pixelToHex(x, y);
        this.hoverHex = hex;
        this.hoverPixelX = x;
        this.hoverPixelY = y;
        
        // Redraw to show feedback
        const ctx = canvas.getContext('2d');
        this.drawHexGrid(ctx);
    }
    
    /**
     * Handle mouse move for border tool (shows visual feedback).
     * Updates hover hex and edge, then redraws canvas to show edge highlight.
     * 
     * @param {MouseEvent} e - Mouse event (mousemove)
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {void}
     * 
     * @example
     * // Called automatically when draw_border or erase_border tool is active
     * if (this.selectedTool === 'draw_border' || this.selectedTool === 'erase_border') {
     *   this.handleMouseMoveBorder(e, canvas);
     * }
     * 
     * **Visual Feedback:**
     * - Updates `this.hoverHex` and `this.hoverPixelX/Y`
     * - `drawHexGrid()` uses these to call `getEdgeAtPoint()` and `drawEdgeHoverFeedback()`
     * - Shows which edge will be affected when clicking
     * 
     * @see drawHexGrid() - Uses hoverHex and hoverPixelX/Y to draw edge feedback
     * @see getEdgeAtPoint() - Detects which edge is being hovered
     * @see drawEdgeHoverFeedback() - Draws edge highlight
     */
    handleMouseMoveBorder(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const hex = this.pixelToHex(x, y);
        const ctx = canvas.getContext('2d');
        
        // Store hover state for redraw
        this.hoverHex = hex;
        this.hoverPixelX = x;
        this.hoverPixelY = y;
        
        // Redraw entire grid with hover feedback
        this.drawHexGrid(ctx);
    }
    
    /**
     * Paint a hex with the selected terrain type.
     * Updates existing tile or creates new tile in this.tiles Map.
     * Immediately redraws the hex for instant visual feedback.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {void}
     * 
     * @example
     * // Paint hex (5, 3) with forest terrain
     * this.selectedTerrain = 'forest';
     * this.paintHex(5, 3);
     * 
     * **Behavior:**
     * - If tile exists: Updates `terrain_type` property
     * - If tile doesn't exist: Creates new tile object with default values
     * - Immediately redraws hex and marker (if present) for instant feedback
     * - Tiles are saved to database when `saveMap()` is called
     * 
     * @see selectedTerrain - Terrain type to paint
     * @see drawHex() - Called to redraw the hex
     * @see saveMap() - Saves all painted tiles to database
     */
    paintHex(q, r) {
        const key = `${q},${r}`;
        
        if (this.tiles.has(key)) {
            // Update existing tile
            const tile = this.tiles.get(key);
            tile.terrain_type = this.selectedTerrain;
        } else {
            // Create new tile
            this.tiles.set(key, {
                q,
                r,
                terrain_type: this.selectedTerrain,
                is_passable: true,
                movement_cost: 1
            });
        }
        
        // Immediately redraw the specific hex for instant feedback
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const tile = this.tiles.get(key);
            this.drawHex(ctx, q, r, tile);
            // Redraw marker if exists
            const marker = this.markers.get(key);
            if (marker) {
                this.drawMarker(ctx, marker);
            }
        }
    }
    
    /**
     * Erase a hex by removing terrain and/or markers.
     * Attempts to delete marker from database if present, then removes terrain from local state.
     * Continues with terrain deletion even if marker deletion fails.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Promise<void>}
     * 
     * @example
     * // Erase hex (5, 3)
     * await this.eraseHex(5, 3);
     * 
     * **Behavior:**
     * 1. Checks for marker on hex
     * 2. If marker exists: Attempts to delete via `deleteMarker()`
     * 3. Removes terrain from `this.tiles` Map
     * 4. Redraws hex (and marker if deletion failed)
     * 5. Tile deletion from database happens during `saveMap()`
     * 
     * **Error Handling:**
     * - Marker deletion failures are logged but don't prevent terrain deletion
     * - Failed marker deletions leave marker in `this.markers` and redraw it
     * 
     * @see deleteMarker() - Called to delete marker from database
     * @see saveMap() - Deletes tiles from database that were removed
     * @see initialTileKeys - Tracks tiles that existed when map was loaded
     */
    async eraseHex(q, r) {
        const key = `${q},${r}`;
        
        // Check if there's a marker on this hex
        const marker = this.markers.get(key);
        let markerDeletionFailed = false;
        
        if (marker && marker.marker_id) {
            // Try to delete the marker from the database
            try {
                await this.deleteMarker(marker.marker_id);
                // deleteMarker already removes from this.markers and redraws on success
                // If we get here, marker was successfully deleted
            } catch (error) {
                console.error('Failed to delete marker:', error);
                markerDeletionFailed = true;
                // Don't throw - continue with terrain deletion even if marker deletion fails
                // The marker will remain in this.markers and will be redrawn below
            }
        }
        
        // Delete terrain
        this.tiles.delete(key);
        
        // Redraw
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHex(ctx, q, r, null);
            
            // Redraw marker if it still exists (either deletion failed or no marker was present)
            // Note: If marker deletion succeeded, it was already removed from this.markers
            // by deleteMarker, so this check will be false and marker won't be redrawn
            const remainingMarker = this.markers.get(key);
            if (remainingMarker) {
                this.drawMarker(ctx, remainingMarker);
            }
        }
    }
    
    /**
     * Place a settlement marker (village, town, city, castle, fort, ruins) on a hex.
     * Prompts user for settlement name, then creates marker via API.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Promise<void>}
     * 
     * @example
     * // Place a village on hex (5, 3)
     * this.selectedSettlementType = 'village';
     * await this.placeSettlement(5, 3);
     * 
     * **Settlement Types:**
     * - village: 🏘️ (brown #8B7355)
     * - town: 🏙️ (gold #9C7C38)
     * - city: 🏛️ (darker gold #B08F43)
     * - castle: 🏰 (dark brown #6B4423)
     * - fort: 🏯 (saddle brown #8B4513)
     * - ruins: 🏚️ (gray #696969)
     * 
     * **Process:**
     * 1. Prompts for settlement name
     * 2. Creates marker via API with appropriate icon and color
     * 3. Adds marker to `this.markers` Map
     * 4. Redraws hex and marker
     * 5. Shows success message
     * 
     * @see selectedSettlementType - Settlement type to place
     * @see drawMarker() - Called to render the marker
     * 
     * @api POST /api/hex-maps/markers/create.php - Creates marker in database
     */
    async placeSettlement(q, r) {
        const key = `${q},${r}`;
        const settlementName = prompt(`Enter name for ${this.selectedSettlementType}:`);
        if (!settlementName) return;
        
        try {
            const settlementIcons = {
                'village': 'fa-home',
                'town': 'fa-city',
                'city': 'fa-building',
                'castle': 'fa-chess-rook',
                'fort': 'fa-shield-alt',
                'ruins': 'fa-monument'
            };
            
            const settlementColors = {
                'village': '#8B7355',
                'town': '#9C7C38',
                'city': '#B08F43',
                'castle': '#6B4423',
                'fort': '#8B4513',
                'ruins': '#696969'
            };
            
            const response = await this.apiClient.post('/api/hex-maps/markers/create.php', {
                map_id: this.currentMapId,
                q: q,
                r: r,
                marker_type: this.selectedSettlementType,
                marker_name: settlementName,
                marker_icon: settlementIcons[this.selectedSettlementType] || 'fa-map-marker-alt',
                marker_color: settlementColors[this.selectedSettlementType] || '#FF0000',
                is_visible_to_players: false
            });
            
            if (response.status === 'success') {
                // Add to markers map
                const marker = response.data;
                this.markers.set(key, marker);
                
                // Redraw
                const canvas = document.getElementById('hex-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const tile = this.tiles.get(key);
                    this.drawHex(ctx, q, r, tile);
                    this.drawMarker(ctx, marker);
                }
                
                this.app.showSuccess(`${this.selectedSettlementType} "${settlementName}" placed`);
            }
        } catch (error) {
            console.error('Failed to place settlement:', error);
            this.app.showError('Failed to place settlement: ' + error.message);
        }
    }
    
    /**
     * Place an area/region name label on a hex.
     * Creates a text-only marker (no icon) for naming regions or areas on the map.
     * 
     * @param {number} q - Hex column coordinate
     * @param {number} r - Hex row coordinate
     * @returns {Promise<void>}
     * 
     * @example
     * // Place an area label
     * await this.placeAreaLabel(5, 3);
     * // Prompts for area name, then creates marker with type "area_label"
     * 
     * **Area Label Features:**
     * - Text-only marker (no icon)
     * - Large, readable text with background
     * - Gold color (#FFD700) for high visibility
     * - Semi-transparent black background
     * - Always visible (not affected by zoom threshold)
     * 
     * @see drawMarker() - Renders area labels as text with background
     * @see placeSettlement() - Similar function for settlement markers
     */
    async placeAreaLabel(q, r) {
        const key = `${q},${r}`;
        const areaName = prompt('Enter area/region name:');
        if (!areaName || areaName.trim() === '') return;
        
        try {
            const response = await this.apiClient.post('/api/hex-maps/markers/create.php', {
                map_id: this.currentMapId,
                q: q,
                r: r,
                marker_type: 'area_label',
                marker_name: areaName.trim(),
                marker_icon: 'fa-sign',
                marker_color: '#FFD700', // Gold color for area labels
                is_visible_to_players: true // Area names are visible to players
            });
            
            if (response.status === 'success') {
                // Add to markers map
                const marker = response.data;
                this.markers.set(key, marker);
                
                // Redraw
                const canvas = document.getElementById('hex-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    const tile = this.tiles.get(key);
                    this.drawHex(ctx, q, r, tile);
                    this.drawMarker(ctx, marker);
                }
                
                this.app.showSuccess(`Area label "${areaName}" placed`);
            }
        } catch (error) {
            console.error('Failed to place area label:', error);
            this.app.showError('Failed to place area label: ' + error.message);
        }
    }
    
    /**
     * Save map to database with all changes (metadata, tiles, deletions) in a single request.
     * Uses a unified endpoint that handles everything atomically to avoid session issues.
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * // Save all changes to the map
     * await this.saveMap();
     * // Shows success message: "Map saved successfully"
     * 
     * **Save Process:**
     * 1. Collects map metadata from form inputs
     * 2. Finds deleted tiles (existed in `initialTileKeys` but not in `this.tiles`)
     * 3. Cleans tile data (removes DB-only fields, handles empty borders/roads)
     * 4. Sends everything in ONE request to `/api/hex-maps/save.php`
     * 5. Updates `initialTileKeys` to reflect current state
     * 6. Shows success message
     * 
     * **Data Cleaning:**
     * - Removes `tile_id`, `created_at`, `updated_at` (DB-only fields)
     * - Converts empty borders/roads objects/arrays to `null`
     * - Ensures only serializable data is sent
     * 
     * @see initialTileKeys - Tracks tiles that existed when map was loaded
     * @see tiles - Map of all current tiles
     * 
     * @api POST /api/hex-maps/save.php - Unified save endpoint (metadata + tiles + deletions)
     */
    async saveMap() {
        if (!this.currentMapId) return;
        
        try {
            // Collect map metadata from form inputs
            const mapName = document.getElementById('map-name-input')?.value;
            const mapDescription = document.getElementById('map-description-input')?.value;
            const mapWidth = parseInt(document.getElementById('map-width-input')?.value);
            const mapHeight = parseInt(document.getElementById('map-height-input')?.value);
            const hexSize = parseInt(document.getElementById('hex-size-input')?.value) || this.currentMap.hex_size_pixels;
            
            // Get scale - distance from center of one hex to center of the next
            const scaleInput = document.getElementById('map-scale-input')?.value;
            const scale = scaleInput && scaleInput.trim() !== '' ? parseFloat(scaleInput) : null;
            
            // Find tiles that were deleted (existed initially but don't exist now)
            const currentTileKeys = new Set(this.tiles.keys());
            const deletedTileKeys = Array.from(this.initialTileKeys).filter(key => !currentTileKeys.has(key));
            const deletedTiles = deletedTileKeys.map(key => {
                const [q, r] = key.split(',').map(Number);
                return { q, r };
            });
            
            // Clean tiles data - ensure only serializable data is sent
            const tiles = Array.from(this.tiles.values());
            const cleanTiles = tiles.map(tile => {
                // Normalize borders, roads, paths, and rivers using utility functions
                const borders = this.normalizeBordersForSave(tile.borders);
                const roads = this.normalizeRoadsForSave(tile.roads);
                const paths = this.normalizePathsForSave(tile.paths);
                const rivers = this.normalizeRiversForSave(tile.rivers);
                
                // Debug: Log rivers data for tiles that have rivers
                if (tile.rivers && Object.keys(tile.rivers).length > 0) {
                    console.log(`[HEX MAP EDITOR] Tile (${tile.q}, ${tile.r}) has rivers:`, tile.rivers, 'normalized to:', rivers);
                }
                
                // Return only fields that the API expects (no tile_id, created_at, updated_at)
                const cleanTile = {
                    q: tile.q,
                    r: tile.r,
                    terrain_type: tile.terrain_type || null,
                    terrain_name: tile.terrain_name || null,
                    description: tile.description || null,
                    notes: tile.notes || null,
                    image_url: tile.image_url || null,
                    elevation: tile.elevation || 0,
                    is_passable: tile.is_passable !== undefined ? tile.is_passable : true,
                    movement_cost: tile.movement_cost || 1,
                    borders: borders,
                    roads: roads
                };
                
                // Only include paths and rivers if they're not null (for backward compatibility)
                if (paths !== null) {
                    cleanTile.paths = paths;
                }
                if (rivers !== null) {
                    cleanTile.rivers = rivers;
                    console.log(`[HEX MAP EDITOR] Including rivers in cleanTile for (${tile.q}, ${tile.r}):`, rivers);
                } else if (tile.rivers && Object.keys(tile.rivers).length > 0) {
                    console.error(`[HEX MAP EDITOR] ERROR: Tile (${tile.q}, ${tile.r}) has rivers but normalizeRiversForSave returned null!`, tile.rivers);
                }
                
                return cleanTile;
            });
            
            // Build save payload
            // Include user_id as workaround for session issues
            const userId = this.app?.state?.user?.user_id || null;
            const savePayload = {
                map_id: this.currentMapId,
                user_id: userId, // Workaround: send user_id if session fails
                map_name: mapName,
                map_description: mapDescription,
                width_hexes: mapWidth,
                height_hexes: mapHeight,
                hex_size_pixels: hexSize,
                scale: scale, // Distance from center of one hex to center of the next
                tiles: cleanTiles,
                deleted_tiles: deletedTiles
            };
            
            console.log(`[HEX MAP EDITOR] Saving map: ${cleanTiles.length} tiles, ${deletedTiles.length} deletions`);
            
            // Send everything in ONE request
            const saveResponse = await this.apiClient.post('/api/hex-maps/save.php', savePayload);

            console.log('saveResponse', saveResponse);
            
            // Validate response
            if (!saveResponse) {
                throw new Error('No response from server');
            }
            
            if (saveResponse.status === 'error') {
                const errorMsg = saveResponse.message || 'Save failed';
                console.error('[HEX MAP EDITOR] Save failed with error:', errorMsg);
                throw new Error(errorMsg);
            }
            
            if (saveResponse.status !== 'success') {
                console.error('[HEX MAP EDITOR] Unexpected response status:', saveResponse.status);
                throw new Error(saveResponse.message || 'Save failed - unexpected response status');
            }
            
            if (!saveResponse.data) {
                console.error('[HEX MAP EDITOR] Response missing data field');
                throw new Error('Invalid response from server: missing data');
            }
            
            // Log save results
            const tilesSaved = saveResponse.data.tiles_saved || 0;
            const tilesCreated = saveResponse.data.tiles_created || 0;
            const tilesUpdated = saveResponse.data.tiles_updated || 0;
            const tilesDeleted = saveResponse.data.tiles_deleted || 0;
            
            console.log(`[HEX MAP EDITOR] Save completed: ${tilesSaved} tiles saved (${tilesCreated} created, ${tilesUpdated} updated, ${tilesDeleted} deleted)`);
            
            // Update initialTileKeys to reflect current state after save
            this.initialTileKeys = new Set(this.tiles.keys());
            
            // Update current map with response data
            if (saveResponse.data.map) {
                this.currentMap = saveResponse.data.map;
            }
            
            // Check if rivers data was lost
            if (saveResponse.data.rivers_data_lost) {
                this.app.showError('Map saved, but rivers/streams were not saved because the database migration has not been run. Please run migration 018_hex_map_rivers.sql');
            } else if (!saveResponse.data.rivers_column_exists) {
                console.warn('[HEX MAP EDITOR] Rivers column does not exist in database. Rivers data will not be saved until migration is run.');
            } else {
                this.app.showSuccess('Map saved successfully');
            }
        } catch (error) {
            console.error('[HEX MAP EDITOR] Failed to save map:', error);
            console.error('[HEX MAP EDITOR] Error details:', {
                message: error.message,
                stack: error.stack
            });
            this.app.showError('Failed to save map: ' + error.message);
        }
    }
    
    /**
     * Show dialog to create a new hex map (simple prompt implementation).
     * Prompts for map name and creates map with default dimensions (20x20 hexes).
     * 
     * @returns {void}
     * 
     * @example
     * // Show dialog to create new map
     * this.showNewMapDialog();
     * // User enters "Wilderness Map"
     * // Creates map with name "Wilderness Map", 20x20 hexes
     * 
     * **Default Values:**
     * - Width: 20 hexes
     * - Height: 20 hexes
     * - Description: Empty string
     * 
     * **Future Enhancement:**
     * Replace prompt with proper modal dialog with all map properties.
     * 
     * @see createMap() - Called with entered map name
     */
    showNewMapDialog() {
        // Simple prompt for now - can be enhanced with a modal
        const mapName = prompt('Enter map name:');
        if (!mapName) return;
        
        this.createMap({
            map_name: mapName,
            map_description: '',
            width_hexes: 20,
            height_hexes: 20
        });
    }
    
    /**
     * Create a new hex map via API and load it for editing.
     * Creates map, loads it, loads markers, and navigates to editor view.
     * 
     * @param {Object} mapData - Map data object with:
     *   - `map_name` (string, required) - Map name
     *   - `map_description` (string, optional) - Map description
     *   - `width_hexes` (number, optional) - Map width in hexes (default: 20)
     *   - `height_hexes` (number, optional) - Map height in hexes (default: 20)
     * @returns {Promise<void>}
     * 
     * @example
     * // Create a new map
     * await this.createMap({
     *   map_name: "Wilderness Map",
     *   map_description: "A map of the wilderness",
     *   width_hexes: 30,
     *   height_hexes: 30
     * });
     * 
     * **Process:**
     * 1. Creates map via API
     * 2. Loads map data
     * 3. Loads markers
     * 4. Navigates to editor view for the new map
     * 5. Shows error message if creation fails
     * 
     * @see showNewMapDialog() - Calls this with user input
     * @see loadMap() - Called after map is created
     * @see loadMarkers() - Called after map is loaded
     * 
     * @api POST /api/hex-maps/create.php - Creates map in database
     */
    async createMap(mapData) {
        try {
            const response = await this.apiClient.post('/api/hex-maps/create.php', mapData);
            
            if (response.status === 'success') {
                await this.loadMap(response.data.map_id);
                await this.loadMarkers();
                await this.app.navigate(`/hex-map-editor/${response.data.map_id}`);
            } else {
                throw new Error(response.message || 'Failed to create map');
            }
        } catch (error) {
            console.error('Failed to create map:', error);
            this.app.showError('Failed to create map: ' + error.message);
        }
    }
    
    /**
     * Delete a marker from the map and database.
     * Removes marker from `this.markers` Map and redraws canvas.
     * 
     * @param {number} markerId - Marker ID to delete
     * @returns {Promise<void>}
     * 
     * @example
     * // Delete marker with ID 42
     * await this.deleteMarker(42);
     * 
     * **Process:**
     * 1. Deletes marker via API
     * 2. Removes marker from `this.markers` Map
     * 3. Redraws canvas
     * 4. Shows success message
     * 
     * **Note:**
     * This function is called by `eraseHex()` when erasing a hex with a marker.
     * It's also called directly when right-clicking a marker.
     * 
     * @see eraseHex() - Calls this when erasing a hex with a marker
     * @see drawHexGrid() - Called to redraw canvas after deletion
     * 
     * @api POST /api/hex-maps/markers/delete.php - Deletes marker from database
     */
    async deleteMarker(markerId) {
        if (!this.currentMapId || !markerId) return;
        
        try {
            const response = await this.apiClient.post('/api/hex-maps/markers/delete.php', {
                marker_id: markerId
            });
            
            if (response.status === 'success') {
                // Remove from markers map
                this.markers.forEach((marker, key) => {
                    if (marker.marker_id === markerId) {
                        this.markers.delete(key);
                    }
                });
                
                // Redraw canvas
                const canvas = document.getElementById('hex-canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    this.drawHexGrid(ctx);
                }
                
                this.app.showSuccess('Marker deleted');
            } else {
                throw new Error(response.message || 'Failed to delete marker');
            }
        } catch (error) {
            console.error('Failed to delete marker:', error);
            this.app.showError('Failed to delete marker: ' + error.message);
        }
    }
}

// Export to window for use in app.js
window.HexMapEditorModule = HexMapEditorModule;