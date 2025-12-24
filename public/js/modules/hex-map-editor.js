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
        this.selectedTool = 'paint'; // paint, erase, select, place_settlement, draw_border, place_road, erase_road
        this.selectedSettlementType = 'village'; // village, town, city
        this.selectedBorderType = null; // null, 'local', 'regional', 'national'
        this.isDrawing = false;
        this.isPanning = false; // For pan/drag functionality
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartOffsetX = 0;
        this.panStartOffsetY = 0;
        this.hoverHex = null; // For border hover feedback
        this.hoverPixelX = null;
        this.hoverPixelY = null;
        this.hexSize = 50;
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1.0;
        this.minZoom = 0.2;
        this.maxZoom = 5.0;
        this.showCoordinates = false; // Debug mode for coordinates
        
        console.log('Hex Map Editor Module initialized');
    }
    
    /**
     * Render the hex map editor view
     * 
     * @param {number} mapId - Optional map ID to load
     * @returns {Promise<string>} HTML for editor
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
     * Render map list view
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
     * Render editor canvas
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
                        <small class="form-text text-muted">Click on a hex edge to place a road. Roads automatically connect to neighboring roads.</small>
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
            { type: 'plains', name: 'Plains', color: '#90EE90', icon: 'fa-seedling' },
            { type: 'forest', name: 'Forest', color: '#228B22', icon: 'fa-tree' },
            { type: 'mountain', name: 'Mountain', color: '#808080', icon: 'fa-mountain' },
            { type: 'water', name: 'Water', color: '#4169E1', icon: 'fa-water' },
            { type: 'desert', name: 'Desert', color: '#F4A460', icon: 'fa-sun' },
            { type: 'swamp', name: 'Swamp', color: '#556B2F', icon: 'fa-frog' },
            { type: 'hill', name: 'Hill', color: '#8B7355', icon: 'fa-hill-rockslide' }
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
     * Load a map
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
                        // Parse borders JSON if it exists
                        if (tile.borders && typeof tile.borders === 'string') {
                            try {
                                tile.borders = JSON.parse(tile.borders);
                            } catch (e) {
                                tile.borders = {};
                            }
                        } else if (!tile.borders) {
                            tile.borders = {};
                        }
                        // Parse roads JSON if it exists
                        if (tile.roads && typeof tile.roads === 'string') {
                            try {
                                tile.roads = JSON.parse(tile.roads);
                            } catch (e) {
                                tile.roads = {};
                            }
                        } else if (!tile.roads) {
                            tile.roads = {};
                        }
                        this.tiles.set(key, tile);
                        this.initialTileKeys.add(key); // Track that this tile existed when loaded
                    });
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
     * Load markers for current map
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
     * Setup event listeners
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
                this.selectedTool = tool;
                $('.tool-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
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
                $('.border-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.settlement-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
            } else if (tool === 'place_road' || tool === 'erase_road') {
                // Handle road tools (they don't have data-border, only data-tool)
                this.selectedTool = tool;
                this.selectedBorderType = null;
                $('.border-buttons .btn').removeClass('active');
                $('.tool-buttons .btn').removeClass('active');
                $('.settlement-buttons .btn').removeClass('active');
                $(e.currentTarget).addClass('active');
            } else if (border && tool) {
                // Handle border tools (they have both data-border and data-tool)
                this.selectedBorderType = border;
                this.selectedTool = tool;
                $('.border-buttons .btn').removeClass('active');
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
     * Initialize hex canvas
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
                // Show border/road edge feedback when hovering
                if (this.selectedTool === 'draw_border' || this.selectedTool === 'erase_border' ||
                    this.selectedTool === 'place_road' || this.selectedTool === 'erase_road') {
                    this.handleMouseMoveBorder(e, canvas);
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
     * Zoom in
     */
    zoomIn(canvas) {
        const oldZoom = this.zoom;
        this.zoom = Math.min(this.zoom * 1.2, this.maxZoom);
        this.updateCanvasInfo();
        const ctx = canvas.getContext('2d');
        this.drawHexGrid(ctx);
    }
    
    /**
     * Zoom out
     */
    zoomOut(canvas) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.zoom / 1.2, this.minZoom);
        this.updateCanvasInfo();
        const ctx = canvas.getContext('2d');
        this.drawHexGrid(ctx);
    }
    
    /**
     * Reset view to center and default zoom
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
     * Handle mouse wheel zoom
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
     * Start panning
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
     * Handle panning
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
     * Stop panning
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
     * Update canvas info display
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
     * Round fractional hex coordinates to nearest hex
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
     * Convert hex coordinates to pixel coordinates (pointy-top hexes)
     * Accounts for zoom level
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
        
        // Draw roads on top of terrain (but below markers)
        // Roads connect hex centers, so draw them after all hexes are drawn
        this.tiles.forEach((tile, key) => {
            if (tile.roads && Object.keys(tile.roads).length > 0) {
                this.drawRoads(ctx, tile.q, tile.r, tile.roads);
            }
        });
        
        // Draw markers on top of hexes and roads
        this.markers.forEach((marker, key) => {
            this.drawMarker(ctx, marker);
        });
        
        // Draw border/road hover feedback if applicable
        if (this.hoverHex && (this.selectedTool === 'draw_border' || this.selectedTool === 'erase_border' ||
            this.selectedTool === 'place_road' || this.selectedTool === 'erase_road')) {
            const edge = this.getEdgeAtPoint(this.hoverHex.q, this.hoverHex.r, this.hoverPixelX, this.hoverPixelY);
            if (edge !== null) {
                this.drawEdgeHoverFeedback(ctx, this.hoverHex.q, this.hoverHex.r, edge);
            }
        }
    }
    
    /**
     * Draw visual feedback for edge hover
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
        
        // Different colors for different tools
        if (this.selectedTool === 'erase_border' || this.selectedTool === 'erase_road') {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        } else if (this.selectedTool === 'place_road') {
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)'; // Brown for roads
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'; // Yellow for borders
        }
        
        ctx.lineWidth = 5 * this.zoom;
        ctx.stroke();
    }
    
    /**
     * Draw a single hex (pointy-top orientation)
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
        
        // Fill color based on terrain - vibrant, game-like colors
        if (tile && tile.terrain_type) {
            const terrainColors = {
                'plains': '#90EE90',      // Light green - bright grasslands
                'forest': '#228B22',      // Forest green - dense woodland
                'mountain': '#696969',    // Dim gray - rocky peaks
                'water': '#1E90FF',       // Dodger blue - clear water
                'desert': '#DEB887',      // Burlywood - sandy desert
                'swamp': '#556B2F',       // Dark olive - murky swamp
                'hill': '#8B7355',        // Dark khaki - rolling hills
                'road': '#F5DEB3'         // Wheat - light path/road
            };
            const color = terrainColors[tile.terrain_type] || '#90EE90';
            ctx.fillStyle = color;
        } else {
            // Empty hex - very dark gray, barely visible grid
            ctx.fillStyle = '#1a1a1a';
        }
        ctx.fill();
        
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
                'local': '#8B7355',      // Brown
                'regional': '#9C7C38',   // Darker brown
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
        
        // Draw terrain icon if zoomed in enough
        if (tile && tile.terrain_type && this.zoom > 0.4) {
            const terrainIcons = {
                'plains': '🌱',
                'forest': '🌲',
                'mountain': '⛰️',
                'water': '💧',
                'desert': '☀️',
                'swamp': '🐸',
                'hill': '⛰️'
            };
            
            const symbol = terrainIcons[tile.terrain_type];
            if (symbol && this.zoom > 0.6) {
                ctx.fillStyle = '#fff';
                ctx.font = `${size * 0.4}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(symbol, center.x, center.y - size * 0.15);
            }
        }
        
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
     * Draw a marker (settlement, POI, etc.) on a hex
     */
    drawMarker(ctx, marker) {
        const center = this.hexToPixel(marker.q, marker.r);
        const size = this.hexSize * this.zoom;
        
        // Draw marker icon
        const iconSize = size * 0.4;
        const iconY = center.y - size * 0.2; // Position above center
        
        // Draw marker background circle
        ctx.fillStyle = marker.marker_color || '#FF0000';
        ctx.beginPath();
        ctx.arc(center.x, iconY, iconSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw icon symbol (using emoji for now, can be enhanced with Font Awesome)
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
        ctx.font = `${iconSize * 0.8}px Arial`;
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
     * Handle mouse down
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
        } else if (this.selectedTool === 'place_road' || this.selectedTool === 'erase_road') {
            // Find which edge was clicked
            const edge = this.getEdgeAtPoint(hex.q, hex.r, x, y);
            if (edge !== null) {
                this.toggleRoad(hex.q, hex.r, edge);
            }
        } else if (this.selectedTool === 'paint') {
            this.paintHex(hex.q, hex.r);
            this.isDrawing = true;
        }
    }
    
    /**
     * Get which edge of a hex was clicked (0-5, or null if center)
     * Edge indices: 0=top, 1=top-right, 2=bottom-right, 3=bottom, 4=bottom-left, 5=top-left
     * Improved: More forgiving edge detection with larger hit area
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
        
        // Save border immediately - include both borders and roads to prevent data loss
        try {
            await this.apiClient.post('/api/hex-maps/tiles/create.php', {
                map_id: this.currentMapId,
                q: q,
                r: r,
                terrain_type: tile.terrain_type || null,
                borders: tile.borders,
                roads: tile.roads || null  // Include roads to prevent overwriting existing roads
            });
        } catch (error) {
            console.error('Failed to save border:', error);
        }
        
        // Redraw entire grid to show border properly
        const canvas = document.getElementById('hex-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawHexGrid(ctx);
        }
    }
    
    /**
     * Get neighboring hexes
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
     * Toggle road on a hex edge (with automatic connection to neighbors)
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
                    
                    // Always save neighbor when we modify its roads to keep database in sync
                    // Check if tile has any data left after road deletion
                    const neighborHasOtherData = neighborTile.terrain_type || Object.keys(neighborTile.roads || {}).length > 0 || Object.keys(neighborTile.borders || {}).length > 0;
                    
                    if (neighborHasOtherData) {
                        // Save updated tile with remaining data
                        try {
                            await this.apiClient.post('/api/hex-maps/tiles/create.php', {
                                map_id: this.currentMapId,
                                q: neighbor.q,
                                r: neighbor.r,
                                terrain_type: neighborTile.terrain_type || null,
                                borders: neighborTile.borders || null,  // Include borders to prevent overwriting existing borders
                                roads: neighborTile.roads || null
                            });
                            // Add to initialTileKeys if it wasn't there (tile now exists in database)
                            if (!this.initialTileKeys.has(neighborKey)) {
                                this.initialTileKeys.add(neighborKey);
                            }
                        } catch (error) {
                            console.error('Failed to save neighbor road removal:', error);
                        }
                    } else if (neighborHadRoad) {
                        // Tile had a road but now has no data - delete it from database
                        // Check if tile exists in database (either in initialTileKeys or was saved during this session)
                        if (this.initialTileKeys.has(neighborKey)) {
                            // Tile exists in database - delete it
                            try {
                                await this.apiClient.post('/api/hex-maps/tiles/delete.php', {
                                    map_id: this.currentMapId,
                                    q: neighbor.q,
                                    r: neighbor.r
                                });
                            } catch (error) {
                                console.error('Failed to delete empty neighbor tile:', error);
                            }
                        }
                        // Remove from local tiles map and initialTileKeys since it's empty
                        this.tiles.delete(neighborKey);
                        this.initialTileKeys.delete(neighborKey);
                    }
                }
            }
            
            // Handle current tile - check if it's empty and delete if so
            if (!currentTileHasData && hadRoad) {
                // Current tile is empty - delete it from database if it exists there
                if (this.initialTileKeys.has(key)) {
                    // Tile exists in database - delete it
                    try {
                        await this.apiClient.post('/api/hex-maps/tiles/delete.php', {
                            map_id: this.currentMapId,
                            q: q,
                            r: r
                        });
                    } catch (error) {
                        console.error('Failed to delete empty current tile:', error);
                    }
                }
                // Remove from local tiles map and initialTileKeys since it's empty
                this.tiles.delete(key);
                this.initialTileKeys.delete(key);
            } else if (currentTileHasData) {
                // Current tile has data - save it
                try {
                    await this.apiClient.post('/api/hex-maps/tiles/create.php', {
                        map_id: this.currentMapId,
                        q: q,
                        r: r,
                        terrain_type: tile.terrain_type || null,
                        borders: tile.borders || null,  // Include borders to prevent overwriting existing borders
                        roads: tile.roads || null
                    });
                    // Add to initialTileKeys if it wasn't there (tile now exists in database)
                    if (!this.initialTileKeys.has(key)) {
                        this.initialTileKeys.add(key);
                    }
                } catch (error) {
                    console.error('Failed to save current tile after road removal:', error);
                }
            }
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
                
                // Save neighbor - include both borders and roads to prevent data loss
                try {
                    await this.apiClient.post('/api/hex-maps/tiles/create.php', {
                        map_id: this.currentMapId,
                        q: neighbor.q,
                        r: neighbor.r,
                        terrain_type: neighborTile.terrain_type || null,
                        borders: neighborTile.borders || null,  // Include borders to prevent overwriting existing borders
                        roads: neighborTile.roads || null
                    });
                    // Add to initialTileKeys if it wasn't there (tile now exists in database)
                    if (!this.initialTileKeys.has(neighborKey)) {
                        this.initialTileKeys.add(neighborKey);
                    }
                } catch (error) {
                    console.error('Failed to save neighbor road connection:', error);
                }
            }
            
            // Save current tile immediately - include both borders and roads to prevent data loss
            try {
                await this.apiClient.post('/api/hex-maps/tiles/create.php', {
                    map_id: this.currentMapId,
                    q: q,
                    r: r,
                    terrain_type: tile.terrain_type || null,
                    borders: tile.borders || null,  // Include borders to prevent overwriting existing borders
                    roads: tile.roads || null
                });
                // Add to initialTileKeys if it wasn't there (tile now exists in database)
                if (!this.initialTileKeys.has(key)) {
                    this.initialTileKeys.add(key);
                }
            } catch (error) {
                console.error('Failed to save road:', error);
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
     * Handle mouse move
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
     * Handle mouse move for border tool (shows visual feedback)
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
     * Paint a hex
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
     * Erase a hex (remove terrain and/or markers)
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
     * Place a settlement marker
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
     * Save map
     */
    async saveMap() {
        if (!this.currentMapId) return;
        
        try {
            // Update map metadata
            const mapName = document.getElementById('map-name-input')?.value;
            const mapDescription = document.getElementById('map-description-input')?.value;
            const mapWidth = parseInt(document.getElementById('map-width-input')?.value);
            const mapHeight = parseInt(document.getElementById('map-height-input')?.value);
            const hexSize = parseInt(document.getElementById('hex-size-input')?.value) || this.currentMap.hex_size_pixels;
            
            await this.apiClient.post('/api/hex-maps/update.php', {
                map_id: this.currentMapId,
                map_name: mapName,
                map_description: mapDescription,
                width_hexes: mapWidth,
                height_hexes: mapHeight,
                hex_size_pixels: hexSize
            });
            
            // Find tiles that were deleted (existed initially but don't exist now)
            const currentTileKeys = new Set(this.tiles.keys());
            const deletedTileKeys = Array.from(this.initialTileKeys).filter(key => !currentTileKeys.has(key));
            
            // Delete tiles that were removed
            if (deletedTileKeys.length > 0) {
                console.log(`Deleting ${deletedTileKeys.length} tiles that were removed`);
                const deletePromises = deletedTileKeys.map(key => {
                    const [q, r] = key.split(',').map(Number);
                    return this.apiClient.post('/api/hex-maps/tiles/delete.php', {
                        map_id: this.currentMapId,
                        q: q,
                        r: r
                    }).catch(error => {
                        console.error(`Failed to delete tile ${key}:`, error);
                        // Don't throw - continue deleting other tiles
                    });
                });
                await Promise.all(deletePromises);
            }
            
            // Save tiles in batch
            const tiles = Array.from(this.tiles.values());
            if (tiles.length > 0) {
                // Clean tiles data - ensure only serializable data is sent
                // Remove database-only fields (tile_id, created_at, updated_at) and clean up data
                const cleanTiles = tiles.map(tile => {
                    // Handle borders - convert empty arrays/objects to null
                    let borders = null;
                    if (tile.borders !== null && tile.borders !== undefined) {
                        if (Array.isArray(tile.borders)) {
                            // Empty array becomes null
                            borders = tile.borders.length > 0 ? tile.borders : null;
                        } else if (typeof tile.borders === 'object' && tile.borders !== null) {
                            // Empty object becomes null
                            const keys = Object.keys(tile.borders);
                            borders = keys.length > 0 ? tile.borders : null;
                        } else if (typeof tile.borders === 'string' && tile.borders.trim() !== '') {
                            // JSON string - keep as is if not empty
                            borders = tile.borders;
                        }
                    }
                    
                    // Handle roads - convert empty arrays/objects to null
                    let roads = null;
                    if (tile.roads !== null && tile.roads !== undefined) {
                        if (Array.isArray(tile.roads)) {
                            // Empty array becomes null
                            roads = tile.roads.length > 0 ? tile.roads : null;
                        } else if (typeof tile.roads === 'object' && tile.roads !== null) {
                            // Empty object becomes null
                            const keys = Object.keys(tile.roads);
                            roads = keys.length > 0 ? tile.roads : null;
                        } else if (typeof tile.roads === 'string' && tile.roads.trim() !== '') {
                            // JSON string - keep as is if not empty
                            roads = tile.roads;
                        }
                    }
                    
                    // Return only fields that the API expects (no tile_id, created_at, updated_at)
                    return {
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
                });
                
                await this.apiClient.post('/api/hex-maps/tiles/batch.php', {
                    map_id: this.currentMapId,
                    tiles: cleanTiles
                });
            }
            
            // Update initialTileKeys to reflect current state after save
            this.initialTileKeys = new Set(this.tiles.keys());
            
            // Markers are saved individually when placed, so no batch save needed
            
            this.app.showSuccess('Map saved successfully');
        } catch (error) {
            console.error('Failed to save map:', error);
            this.app.showError('Failed to save map: ' + error.message);
        }
    }
    
    /**
     * Show new map dialog
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
     * Create new map
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
     * Delete a marker
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