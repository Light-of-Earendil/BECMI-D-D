/**
 * BECMI D&D Character Manager - Hex Map Play Module
 * 
 * Provides play mode for hex maps with fog of war and visibility system.
 * DMs see everything, players only see their current hex and limited neighbor info.
 * 
 * @module HexMapPlayModule
 */

class HexMapPlayModule {
    /**
     * Creates a new HexMapPlayModule instance
     * 
     * @constructor
     * @param {Object} app - Main application instance
     */
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentMapId = null;
        this.currentMap = null;
        this.visibleHexes = new Map(); // Map of "q,r" -> hex data with visibility
        this.markers = new Map(); // Map of "q,r" -> marker data
        this.isDM = false;
        this.characterId = null;
        this.playerPosition = null;
        this.hexSize = 50;
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1.0;
        this.realtimeClient = null;
        this.refreshInterval = null;
        
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
        this.terrainImageScaleDefault = 1.0; // Default scale for terrain types not in the map above
        
        // Maximum image size limit (as percentage of hex diameter)
        // Prevents overflow beyond hex bounds. Set to null to disable limit.
        // 0.95 = 95% of diameter (default), 1.0 = 100% (full diameter), null = no limit
        // Can also be set per terrain type in terrainImageMaxSizes map
        this.terrainImageMaxSizes = new Map([
            // Add specific max sizes for terrain types here, e.g.:
            // ['plains', 1.0],
            // ['hills', 1.5],
        ]);
        this.terrainImageMaxSizeDefault = 0.80; // Default max size for terrain types not in the map above
        
        // Travel time multipliers
        this.terrainTravelMultipliers = new Map(); // Map<terrainType, multiplier>
        this.roadTravelMultiplier = 0.5; // Road multiplier (default, loaded from API)
        this.pathTravelMultiplier = 0.7; // Path multiplier (default, loaded from API)
        this.baseTravelTimeHours = 1.0; // Base travel time per hex in hours (default, loaded from API)
        
        // Game time tracking
        this.gameTime = null; // Current game time (Date object or timestamp)
        
        // Terrain type to image mapping
        this.terrainImages = new Map();
        this.loadTerrainImages();
        
        console.log('Hex Map Play Module initialized');
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
     * 
     * @see HexMapEditorModule.loadTerrainImages() - Same implementation
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
     * Render the hex map play view with fog of war and visibility system.
     * Loads map and visible hexes, then returns HTML for play interface.
     * 
     * @param {number} mapId - Map ID to load
     * @returns {Promise<string>} HTML string for play view
     * 
     * @throws {Error} If mapId is missing or loading fails
     * 
     * @example
     * // Render play view for map ID 5
     * const html = await hexMapPlay.renderPlayView(5);
     * 
     * **Play View Includes:**
     * - Map header with name and actions
     * - DM tools (reveal hexes, edit map) if user is DM
     * - Sidebar with map info and visibility explanation
     * - Canvas with zoom controls
     * - Auto-refresh every 5 seconds
     * 
     * @see loadMap() - Called to load map metadata
     * @see loadVisibleHexes() - Called to load visible hexes with fog of war
     * @see renderSidebar() - Called to render sidebar content
     */
    async renderPlayView(mapId) {
        try {
            // Load travel multipliers configuration
            await this.loadTravelMultipliers();
            
            if (!mapId) {
                return '<div class="alert alert-danger">Map ID required</div>';
            }
            
            await this.loadMap(mapId);
            await this.loadVisibleHexes();
            
            return `
                <div class="hex-map-play">
                    <div class="play-header">
                        <h1><i class="fas fa-map"></i> ${this.currentMap.map_name}</h1>
                        <div class="play-actions">
                            ${this.isDM ? `
                                <button class="btn btn-warning" id="reveal-hexes-btn">
                                    <i class="fas fa-eye"></i> Reveal Hexes
                                </button>
                            ` : ''}
                            <button class="btn btn-secondary" id="refresh-view-btn">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                            ${this.isDM ? `
                                <button class="btn btn-info" id="edit-map-btn">
                                    <i class="fas fa-edit"></i> Edit Map
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="play-container">
                        <div class="play-sidebar">
                            ${this.renderSidebar()}
                        </div>
                        
                        <div class="play-main">
                            <div class="canvas-container" id="hex-play-canvas-container">
                                <canvas id="hex-play-canvas"></canvas>
                            </div>
                            <div class="canvas-controls">
                                <button class="btn btn-sm btn-secondary" id="zoom-in-play-btn">
                                    <i class="fas fa-search-plus"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" id="zoom-out-play-btn">
                                    <i class="fas fa-search-minus"></i>
                                </button>
                                <button class="btn btn-sm btn-secondary" id="reset-view-play-btn">
                                    <i class="fas fa-home"></i> Reset View
                                </button>
                                <span class="canvas-info" id="canvas-play-info">Zoom: ${Math.round(this.zoom * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to render hex map play view:', error);
            return `<div class="alert alert-danger">Error loading map: ${error.message}</div>`;
        }
    }
    
    /**
     * Render the sidebar for play mode with map info and DM/player tools.
     * Shows different content for DMs vs players.
     * 
     * @returns {string} HTML string for sidebar
     * 
     * @example
     * const html = this.renderSidebar();
     * 
     * **Sidebar Content:**
     * - Map name and description
     * - Player position (if available)
     * - DM tools section (if DM)
     * - Visibility info (if player)
     * 
     * @see renderPlayView() - Calls this to render sidebar
     */
    renderSidebar() {
        // Format game time for display
        let gameTimeDisplay = 'Not set';
        if (this.gameTime) {
            const date = this.gameTime instanceof Date ? this.gameTime : new Date(this.gameTime);
            const day = Math.floor((date - new Date(date.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            gameTimeDisplay = `Day ${day}, ${hours}:${minutes}`;
        }
        
        return `
            <div class="sidebar-section">
                <h3>Map Info</h3>
                <p><strong>${this.currentMap.map_name}</strong></p>
                ${this.currentMap.map_description ? `<p>${this.currentMap.map_description}</p>` : ''}
                ${this.currentMap.scale ? `<p><strong>Scale:</strong> ${this.currentMap.scale} units per hex</p>` : ''}
                ${this.playerPosition ? `
                    <p><strong>Your Position:</strong> (${this.playerPosition.q}, ${this.playerPosition.r})</p>
                ` : ''}
                <p><strong>Game Time:</strong> <span id="game-time-display">${gameTimeDisplay}</span></p>
            </div>
            
            ${this.isDM ? `
                <div class="sidebar-section">
                    <h3>DM Tools</h3>
                    <p>You can see all hexes. Click to reveal hexes to players.</p>
                </div>
            ` : `
                <div class="sidebar-section">
                    <h3>Visibility</h3>
                    <p>You can only see your current hex fully. Neighboring hexes show terrain type only.</p>
                </div>
            `}
            <div class="sidebar-section">
                <h3>Travel Info</h3>
                <p id="travel-time-info" class="text-muted">Hover over a neighboring hex to see travel time</p>
            </div>
        `;
    }
    
    /**
     * Format game time for display.
     * Converts Date object to "Day X, HH:MM" format.
     * 
     * @param {Date} gameTime - Game time Date object
     * @returns {string} Formatted time string (e.g., "Day 3, 14:30")
     * 
     * @example
     * const timeStr = this.formatGameTime(new Date('2024-01-15T14:30:00'));
     * // Returns: "Day 15, 14:30"
     */
    formatGameTime(gameTime) {
        if (!gameTime) return 'Not set';
        
        const date = gameTime instanceof Date ? gameTime : new Date(gameTime);
        const day = Math.floor((date - new Date(date.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `Day ${day}, ${hours}:${minutes}`;
    }
    
    /**
     * Update game time display in sidebar.
     * Called when game time changes (e.g., after movement).
     * 
     * @returns {void}
     * 
     * @example
     * // Update display after game time changes
     * this.updateGameTimeDisplay();
     */
    updateGameTimeDisplay() {
        const displayElement = document.getElementById('game-time-display');
        if (displayElement && this.gameTime) {
            displayElement.textContent = this.formatGameTime(this.gameTime);
        }
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
     * // Load multipliers on play mode initialization
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
                
                console.log(`[HEX MAP PLAY] Loaded ${this.terrainTravelMultipliers.size} terrain multipliers, road: ${this.roadTravelMultiplier}, path: ${this.pathTravelMultiplier}, base time: ${this.baseTravelTimeHours}h`);
            } else {
                console.warn('[HEX MAP PLAY] Failed to load travel multipliers, using defaults');
            }
        } catch (error) {
            console.warn('[HEX MAP PLAY] Error loading travel multipliers, using defaults:', error);
            // Use default values if API fails
        }
    }
    
    /**
     * Calculate travel time multiplier for moving from one hex to another.
     * Returns the multiplier based on terrain type, roads, or paths.
     * Road/path multipliers override terrain multipliers when present on the edge.
     * 
     * @param {Object} fromHex - Source hex tile object (with q, r, roads, paths properties)
     * @param {Object} toHex - Destination hex tile object (with q, r, terrain_type properties)
     * @param {number} neighborIndex - Neighbor index from fromHex to toHex (0-5)
     * @returns {number} Travel time multiplier (e.g., 1.0 = normal, 1.5 = 1.5x slower, 0.5 = 2x faster)
     * 
     * @example
     * // Calculate travel time from hex (5,3) to neighbor 1
     * const fromHex = this.visibleHexes.get('5,3');
     * const toHex = this.visibleHexes.get('6,2');
     * const multiplier = this.calculateTravelTimeMultiplier(fromHex, toHex, 1);
     * 
     * @see calculateTravelTime() - Calculates actual travel time in hours
     * @see terrainTravelMultipliers - Map of terrain type => multiplier
     * @see roadTravelMultiplier - Road multiplier (typically 0.5)
     * @see pathTravelMultiplier - Path multiplier (typically 0.7)
     * 
     * @since 1.0.0
     */
    calculateTravelTimeMultiplier(fromHex, toHex, neighborIndex) {
        if (!fromHex || !toHex || neighborIndex < 0 || neighborIndex > 5) {
            return 1.0; // Default multiplier if invalid input
        }
        
        // Check if road exists on edge (road overrides terrain)
        if (fromHex.roads && fromHex.roads[neighborIndex]) {
            return this.roadTravelMultiplier; // Typically 0.5 (twice as fast)
        }
        
        // Check if path exists on edge (path overrides terrain, but slower than road)
        if (fromHex.paths && fromHex.paths[neighborIndex]) {
            return this.pathTravelMultiplier; // Typically 0.7 (faster than terrain, slower than road)
        }
        
        // Otherwise, use terrain multiplier
        const terrainType = toHex.terrain_type || 'plains';
        return this.terrainTravelMultipliers.get(terrainType) || 1.0;
    }
    
    /**
     * Calculate actual travel time in hours for moving from one hex to another.
     * Returns base travel time multiplied by the travel time multiplier.
     * 
     * @param {Object} fromHex - Source hex tile object
     * @param {Object} toHex - Destination hex tile object
     * @param {number} neighborIndex - Neighbor index from fromHex to toHex (0-5)
     * @returns {number} Travel time in hours
     * 
     * @example
     * // Calculate travel time from hex (5,3) to neighbor 1
     * const fromHex = this.visibleHexes.get('5,3');
     * const toHex = this.visibleHexes.get('6,2');
     * const hours = this.calculateTravelTime(fromHex, toHex, 1);
     * // Returns: 0.5 hours if road, 0.7 hours if path, 1.5 hours if hills, etc.
     * 
     * **Calculation:**
     * - Travel time = baseTravelTimeHours × multiplier
     * - Example: baseTime = 1.0h, multiplier = 1.5 → travel time = 1.5 hours
     * 
     * @see calculateTravelTimeMultiplier() - Gets the multiplier
     * @see baseTravelTimeHours - Base time per hex (typically 1.0 hour)
     * 
     * @since 1.0.0
     */
    calculateTravelTime(fromHex, toHex, neighborIndex) {
        const multiplier = this.calculateTravelTimeMultiplier(fromHex, toHex, neighborIndex);
        return this.baseTravelTimeHours * multiplier;
    }
    
    /**
     * Load hex map metadata (without tiles, which are loaded via loadVisibleHexes()).
     * Sets current map, hex size, and loads markers.
     * 
     * @param {number} mapId - Map ID to load
     * @returns {Promise<Object>} The loaded map object
     * 
     * @throws {Error} If map ID is invalid or API request fails
     * 
     * @example
     * // Load map ID 5
     * const map = await this.loadMap(5);
     * console.log(`Loaded map: ${map.map_name}`);
     * 
     * **Process:**
     * 1. Fetches map metadata via API (without tiles)
     * 2. Sets `this.currentMap` and `this.currentMapId`
     * 3. Sets `this.hexSize` from map data
     * 4. Loads markers from response
     * 5. Loads game time from map data (if available)
     * 
     * @see loadVisibleHexes() - Called separately to load tiles with visibility
     * 
     * @api GET /api/hex-maps/get.php?map_id={mapId}&include_tiles=false
     */
    async loadMap(mapId) {
        try {
            console.log(`Loading hex map ${mapId} for play...`);
            
            const response = await this.apiClient.get(`/api/hex-maps/get.php?map_id=${mapId}&include_tiles=false`);
            
            if (response.status === 'success') {
                this.currentMap = response.data.map;
                this.currentMapId = mapId;
                this.hexSize = this.currentMap.hex_size_pixels || 50;
                
                // Load markers
                this.markers.clear();
                if (response.data.markers) {
                    response.data.markers.forEach(marker => {
                        const key = `${marker.q},${marker.r}`;
                        this.markers.set(key, marker);
                    });
                }
                
                // Load game time from map data
                if (this.currentMap.game_time) {
                    // Parse game_time string to Date object
                    this.gameTime = new Date(this.currentMap.game_time);
                } else {
                    // Initialize to current date/time if not set
                    this.gameTime = new Date();
                }
                
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
     * Load all visible hexes for current player/DM with visibility levels.
     * Updates visibleHexes Map and triggers canvas redraw.
     * Called automatically every 5 seconds via setInterval.
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * // Load visible hexes
     * await this.loadVisibleHexes();
     * console.log(`Loaded ${this.visibleHexes.size} visible hexes`);
     * 
     * **Visibility Levels:**
     * - 0: Hidden (fog of war) - opacity 0.3
     * - 1: Partial (neighbor visibility - terrain only) - opacity 0.6
     * - 2: Full (current hex or DM-revealed) - opacity 1.0
     * 
     * **DM vs Player:**
     * - DM: Sees all hexes with full visibility (level 2)
     * - Player: Sees current hex fully, neighbors partially, others hidden
     * 
     * @see drawPlayCanvas() - Called after loading to redraw canvas
     * @see refreshInterval - Auto-refreshes every 5 seconds
     * 
     * @api GET /api/hex-maps/play/get-visible.php?map_id={mapId}&character_id={characterId}
     */
    async loadVisibleHexes() {
        if (!this.currentMapId) return;
        
        try {
            const response = await this.apiClient.get(
                `/api/hex-maps/play/get-visible.php?map_id=${this.currentMapId}${this.characterId ? `&character_id=${this.characterId}` : ''}`
            );
            
            if (response.status === 'success') {
                this.isDM = response.data.is_dm;
                this.characterId = response.data.character_id;
                this.playerPosition = response.data.player_position;
                
                // Load visible hexes into map
                this.visibleHexes.clear();
                if (response.data.hexes) {
                    response.data.hexes.forEach(hex => {
                        const key = `${hex.q},${hex.r}`;
                        this.visibleHexes.set(key, hex);
                    });
                }
                
                console.log(`Loaded ${this.visibleHexes.size} visible hexes (DM: ${this.isDM})`);
                
                // Redraw canvas
                this.drawPlayCanvas();
            } else {
                throw new Error(response.message || 'Failed to load visible hexes');
            }
        } catch (error) {
            console.error('Failed to load visible hexes:', error);
            throw error;
        }
    }
    
    /**
     * Setup all event listeners for play mode interface.
     * Handles refresh, edit map, reveal hexes, zoom controls, and canvas interactions.
     * Starts auto-refresh interval and real-time updates.
     * 
     * @returns {void}
     * 
     * @example
     * // Called after rendering play view
     * this.setupEventListeners();
     * 
     * **Event Handlers:**
     * - Refresh view button
     * - Edit map button (DM only)
     * - Reveal hexes button (DM only)
     * - Zoom controls (in, out, reset)
     * - Canvas click handler (initialized after delay)
     * 
     * **Auto-Refresh:**
     * - Sets up 5-second interval to reload visible hexes
     * - Cleared in `cleanup()` when leaving view
     * 
     * @see initPlayCanvas() - Called after delay to initialize canvas
     * @see startRealtimeUpdates() - Called if map is in a session
     * @see cleanup() - Clears refresh interval
     */
    setupEventListeners() {
        // Refresh button
        $(document).on('click', '#refresh-view-btn', async () => {
            await this.loadVisibleHexes();
        });
        
        // Edit map button (DM only)
        $(document).on('click', '#edit-map-btn', async () => {
            if (this.currentMapId) {
                await this.app.navigate(`/hex-map-editor/${this.currentMapId}`);
            }
        });
        
        // Reveal hexes button (DM only)
        $(document).on('click', '#reveal-hexes-btn', () => {
            this.showRevealDialog();
        });
        
        // Zoom controls
        $(document).on('click', '#zoom-in-play-btn', () => {
            this.zoom = Math.min(this.zoom * 1.2, 3.0);
            this.updateCanvasInfo();
            this.drawPlayCanvas();
        });
        
        $(document).on('click', '#zoom-out-play-btn', () => {
            this.zoom = Math.max(this.zoom / 1.2, 0.3);
            this.updateCanvasInfo();
            this.drawPlayCanvas();
        });
        
        $(document).on('click', '#reset-view-play-btn', () => {
            this.zoom = 1.0;
            this.offsetX = 0;
            this.offsetY = 0;
            this.updateCanvasInfo();
            this.drawPlayCanvas();
        });
        
        // Canvas click for movement (players) or reveal (DM)
        setTimeout(() => {
            this.initPlayCanvas();
        }, 100);
        
        // Start real-time updates if in session
        if (this.currentMap && this.currentMap.session_id) {
            this.startRealtimeUpdates();
        }
        
        // Auto-refresh every 5 seconds
        this.refreshInterval = setInterval(() => {
            this.loadVisibleHexes();
        }, 5000);
    }
    
    /**
     * Initialize the play mode canvas with event handlers.
     * Sets canvas size, centers map, sets up resize handler, and configures click handler.
     * 
     * @returns {void}
     * 
     * @example
     * // Called after canvas is created in DOM
     * this.initPlayCanvas();
     * 
     * **Initialization:**
     * - Sets canvas size to container dimensions
     * - Centers map on first load
     * - Sets up resize handler
     * - Configures click handler for character movement/reveal
     * 
     * **Click Behavior:**
     * - DM: Shows reveal dialog for clicked hex
     * - Player: Moves character to clicked hex (if character exists)
     * 
     * @see setupEventListeners() - Calls this after a delay
     * @see handleCanvasClick() - Called on canvas click
     * @see drawPlayCanvas() - Called to render the grid
     */
    initPlayCanvas() {
        const canvas = document.getElementById('hex-play-canvas');
        if (!canvas) return;
        
        const container = document.getElementById('hex-play-canvas-container');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        const updateCanvasSize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            this.drawPlayCanvas();
        };
        
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        
        // Click handler
        canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e, canvas);
        });
        
        // Mouse move handler for travel time hover feedback
        let hoverHex = null;
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            // Account for offset in pixelToHex
            const hex = this.pixelToHex(x - this.offsetX, y - this.offsetY);
            const key = `${hex.q},${hex.r}`;
            const newHoverHex = this.visibleHexes.get(key);
            
            // Only update if hover hex changed
            if (hoverHex !== newHoverHex) {
                hoverHex = newHoverHex;
                this.updateTravelTimeInfo(hoverHex);
            }
        });
        
        // Clear travel time info when mouse leaves canvas
        canvas.addEventListener('mouseleave', () => {
            hoverHex = null;
            this.updateTravelTimeInfo(null);
        });
    }
    
    /**
     * Update travel time info display when hovering over a hex.
     * Shows travel time from player position to hovered hex (if neighbor).
     * 
     * @param {Object|null} hoverHex - Hex being hovered over, or null if not hovering
     * @returns {void}
     * 
     * @example
     * // Update info when hovering over hex
     * this.updateTravelTimeInfo(this.visibleHexes.get('5,3'));
     */
    updateTravelTimeInfo(hoverHex) {
        const infoElement = document.getElementById('travel-time-info');
        if (!infoElement) return;
        
        if (!hoverHex || !this.playerPosition) {
            infoElement.textContent = 'Hover over a neighboring hex to see travel time';
            infoElement.className = 'text-muted';
            return;
        }
        
        // Check if hovered hex is a neighbor of player position
        const neighbors = this.getHexNeighbors(this.playerPosition.q, this.playerPosition.r);
        let neighborIndex = -1;
        for (let i = 0; i < 6; i++) {
            if (neighbors[i].q === hoverHex.q && neighbors[i].r === hoverHex.r) {
                neighborIndex = i;
                break;
            }
        }
        
        if (neighborIndex === -1) {
            infoElement.textContent = 'Hover over a neighboring hex to see travel time';
            infoElement.className = 'text-muted';
            return;
        }
        
        // Get player's current hex
        const playerHexKey = `${this.playerPosition.q},${this.playerPosition.r}`;
        const playerHex = this.visibleHexes.get(playerHexKey);
        
        if (!playerHex) {
            infoElement.textContent = 'Hover over a neighboring hex to see travel time';
            infoElement.className = 'text-muted';
            return;
        }
        
        // Calculate travel time
        const travelTimeHours = this.calculateTravelTime(playerHex, hoverHex, neighborIndex);
        const multiplier = this.calculateTravelTimeMultiplier(playerHex, hoverHex, neighborIndex);
        
        // Format travel time display
        let timeDisplay = '';
        if (travelTimeHours < 1.0) {
            const minutes = Math.round(travelTimeHours * 60);
            timeDisplay = `${minutes} min`;
        } else if (travelTimeHours === 1.0) {
            timeDisplay = '1 hour';
        } else {
            const hours = Math.floor(travelTimeHours);
            const minutes = Math.round((travelTimeHours - hours) * 60);
            if (minutes > 0) {
                timeDisplay = `${hours}h ${minutes}m`;
            } else {
                timeDisplay = `${hours} hours`;
            }
        }
        
        // Determine travel type
        let travelType = 'Terrain';
        if (playerHex.roads && playerHex.roads[neighborIndex]) {
            travelType = 'Road';
        } else if (playerHex.paths && playerHex.paths[neighborIndex]) {
            travelType = 'Path';
        }
        
        infoElement.innerHTML = `<strong>Travel Time:</strong> ${timeDisplay} (${travelType}, ${multiplier.toFixed(1)}x)`;
        infoElement.className = 'text-info';
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
     * 
     * @see calculateTravelTime() - Uses to find neighbor index
     * @see updateTravelTimeInfo() - Uses to check if hovered hex is neighbor
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
     * Draw the complete play canvas with fog of war and visibility system.
     * Main rendering function that clears canvas and draws all visible hexes with appropriate opacity.
     * 
     * @returns {void}
     * 
     * @example
     * // Draw the entire play canvas
     * this.drawPlayCanvas();
     * 
     * **Rendering Order:**
     * 1. Background
     * 2. All visible hexes (with opacity based on visibility level)
     * 3. Markers (filtered by visibility for players)
     * 4. Player position indicator
     * 5. Character markers (DM view only)
     * 
     * **Visibility Opacity:**
     * - Level 0 (hidden): 0.3 opacity (fog of war)
     * - Level 1 (partial): 0.6 opacity (neighbor visibility)
     * - Level 2 (full): 1.0 opacity (current hex or DM-revealed)
     * 
     * @see drawPlayHex() - Called for each visible hex
     * @see drawPlayMarker() - Called for each visible marker
     * @see visibleHexes - Map of visible hexes with visibility levels
     */
    drawPlayCanvas() {
        const canvas = document.getElementById('hex-play-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw visible hexes (terrain layer)
        this.visibleHexes.forEach((hex, key) => {
            this.drawPlayHex(ctx, hex);
        });
        
        // Draw rivers and streams FIRST (lowest overlay layer - under roads, paths, markers, and borders)
        // Rivers are part of the terrain, so they should be drawn before infrastructure
        this.visibleHexes.forEach((hex, key) => {
            if (hex.rivers && Object.keys(hex.rivers).length > 0 && (this.isDM || hex.visibility_level >= 1)) {
                this.drawRivers(ctx, hex.q, hex.r, hex.rivers);
            }
        });
        
        // Draw roads on top of rivers (but below markers)
        // Roads connect hex centers, so draw them after all hexes are drawn
        this.visibleHexes.forEach((hex, key) => {
            if (hex.roads && Object.keys(hex.roads).length > 0 && (this.isDM || hex.visibility_level >= 2)) {
                this.drawRoads(ctx, hex.q, hex.r, hex.roads);
            }
        });
        
        // Draw paths on top of roads (but below markers)
        // Paths connect hex centers, drawn as dotted lines
        this.visibleHexes.forEach((hex, key) => {
            if (hex.paths && Object.keys(hex.paths).length > 0 && (this.isDM || hex.visibility_level >= 2)) {
                this.drawPaths(ctx, hex.q, hex.r, hex.paths);
            }
        });
        
        // Draw markers on top of hexes, rivers, roads, and paths
        // Markers include villages, towns, cities, forts, castles, ruins, and area labels
        this.markers.forEach((marker, key) => {
            // Only show markers on visible hexes (or all if DM)
            const hex = this.visibleHexes.get(key);
            if (this.isDM || (hex && hex.visibility_level >= 1)) {
                // Check if marker should be visible to players
                if (this.isDM || marker.is_visible_to_players) {
                    this.drawPlayMarker(ctx, marker);
                }
            }
        });
        
        // Draw borders (local/regional/national) on top of everything
        // This ensures borders are always visible, even over markers, roads, and paths
        this.visibleHexes.forEach((hex, key) => {
            if (hex.borders && Object.keys(hex.borders).length > 0 && (this.isDM || hex.visibility_level >= 2)) {
                this.drawBorders(ctx, hex.q, hex.r, hex.borders);
            }
        });
        
        // Draw fog of war for hidden hexes (if not DM)
        if (!this.isDM && this.currentMap) {
            // Draw fog overlay for areas not visible
            // This is a simplified version - could be enhanced
        }
    }
    
    /**
     * Draw a hex in play mode with fog of war opacity.
     * Applies opacity based on visibility level and renders terrain image with per-terrain scaling.
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} hex - Hex data object with:
     *   - `q` (number) - Hex column coordinate
     *   - `r` (number) - Hex row coordinate
     *   - `terrain_type` (string) - Terrain type
     *   - `visibility_level` (number) - Visibility level (0=hidden, 1=partial, 2=full)
     *   - `characters` (Array, optional) - Character data (DM view only)
     * @returns {void}
     * 
     * @example
     * // Draw a hex with full visibility
     * const hex = { q: 5, r: 3, terrain_type: 'forest', visibility_level: 2 };
     * this.drawPlayHex(ctx, hex);
     * 
     * **Rendering Features:**
     * - Terrain images with per-type scaling (from terrainImageScales Map)
     * - Maximum size limits (from terrainImageMaxSizes Map)
     * - Opacity based on visibility level
     * - Color fallback if image not loaded
     * - Player position indicator (gold circle)
     * - Character markers (DM view only, red circles)
     * 
     * **Opacity Levels:**
     * - Level 0: 0.3 (very dim, fog of war)
     * - Level 1: 0.6 (partial visibility)
     * - Level 2: 1.0 (full visibility)
     * 
     * @see drawPlayCanvas() - Calls this for each visible hex
     * @see terrainImageScales - Per-terrain-type image scaling
     * @see terrainImageMaxSizes - Per-terrain-type maximum size limits
     */
    drawPlayHex(ctx, hex) {
        const center = this.hexToPixel(hex.q, hex.r);
        const size = this.hexSize * this.zoom;
        
        // Draw hex shape
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            const x = center.x + size * Math.cos(angle);
            const y = center.y + size * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        
        // Determine opacity based on visibility
        let opacity = 1.0;
        
        if (hex.visibility_level === 0) {
            // Hidden - draw as fog
            opacity = 0.3;
        } else if (hex.visibility_level === 1) {
            // Partial - dimmed
            opacity = 0.6;
        }
        
        // Try to use terrain image
        const terrainImg = this.terrainImages.get(hex.terrain_type);
        if (terrainImg && terrainImg.complete && terrainImg.naturalWidth > 0) {
            // Save context state
            ctx.save();
            
            // Clip to hex shape (path is already defined above)
            ctx.clip();
            
            // Set opacity for visibility
            ctx.globalAlpha = opacity;
            
            // Calculate image size using configurable scale (per terrain type)
            // Hex size is the distance from center to corner, so diameter is 2 * size
            // Get terrain-specific scale or use default
            const terrainScale = this.terrainImageScales.get(hex.terrain_type) || this.terrainImageScaleDefault;
            const hexDiameter = size * 2; // Distance across hex (corner to corner)
            const hexRadius = size; // Distance from center to corner
            // Scale according to terrain-specific or default scale
            const imgSizeScaled = size * terrainScale;
            // Get terrain-specific max size or use default
            const terrainMaxSize = this.terrainImageMaxSizes.get(hex.terrain_type) ?? this.terrainImageMaxSizeDefault;
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
            ctx.globalAlpha = 1.0;
            
            // Redraw hex path for border (clip was consumed)
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i;
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
                'plains': '#90EE90',
                'grasslands-plains': '#90EE90',
                'farmland': '#9ACD32',
                'hill': '#8B7355',
                'hills': '#8B7355',
                'grassy-hills': '#7CB342',
                'mountain': '#808080',
                'mountains': '#808080',
                'mountain-peak': '#9E9E9E',
                'high-mountains': '#616161',
                'high-mountain-peak': '#424242',
                // Forests
                'light-forest-deciduous': '#66BB6A',
                'heavy-forest-deciduous': '#228B22',
                'forest': '#228B22',
                'forested-hills-deciduous': '#558B2F',
                'forested-mountains-deciduous': '#33691E',
                'light-forest-coniferous': '#4CAF50',
                'heavy-forest-coniferous': '#1B5E20',
                'forested-mountains-coniferous': '#2E7D32',
                // Jungles
                'jungle-rainforest': '#2E7D32',
                'jungle-hills': '#1B5E20',
                'jungle-mountains': '#0D4A1A',
                // Water and wetlands
                'water': '#4169E1',
                'lake': '#1E90FF',
                'ocean': '#000080',
                'swamp': '#556B2F',
                'marsh': '#6B8E23',
                'beach-dunes': '#F5DEB3',
                // Deserts
                'desert': '#DEB887',
                'rocky-desert': '#CD853F',
                'desert-hills': '#DEB887',
                'desert-mountains': '#BC8F8F',
                'road': '#D2B48C'
            };
            
            let fillColor = terrainColors[hex.terrain_type] || '#90EE90';
            
            if (hex.visibility_level === 0) {
                // Hidden - draw as fog
                fillColor = '#2c3e50';
            }
            
            ctx.fillStyle = fillColor;
            ctx.globalAlpha = opacity;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        
        // Draw border
        if (hex.visibility_level >= 1) {
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Draw player position indicator
        if (this.playerPosition && hex.q === this.playerPosition.q && hex.r === this.playerPosition.r) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(center.x, center.y, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw character markers (DM view)
        if (this.isDM && hex.characters && hex.characters.length > 0) {
            hex.characters.forEach((char, index) => {
                const offsetX = (index - (hex.characters.length - 1) / 2) * size * 0.4;
                ctx.fillStyle = '#FF6B6B';
                ctx.beginPath();
                ctx.arc(center.x + offsetX, center.y, size * 0.2, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
    
    /**
     * Draw a marker in play mode
     */
    drawPlayMarker(ctx, marker) {
        const center = this.hexToPixel(marker.q, marker.r);
        const size = this.hexSize * this.zoom;
        
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
        
        // Draw marker icon
        const iconSize = size * 0.4;
        const iconY = center.y - size * 0.2;
        
        // Draw marker background circle
        ctx.fillStyle = marker.marker_color || '#FF0000';
        ctx.beginPath();
        ctx.arc(center.x, iconY, iconSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw icon symbol
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
            
            const textY = center.y + size * 0.4;
            ctx.strokeText(marker.marker_name, center.x, textY);
            ctx.fillText(marker.marker_name, center.x, textY);
        }
    }
    
    /**
     * Convert pixel coordinates to hex coordinates using axial coordinate system.
     * Uses different formula than editor mode (accounts for zoom differently).
     * 
     * @param {number} x - Pixel X coordinate
     * @param {number} y - Pixel Y coordinate
     * @returns {Object} Hex coordinates object with `{q: number, r: number}`
     * 
     * @example
     * // Convert mouse click to hex coordinates
     * const hex = this.pixelToHex(mouseX, mouseY);
     * console.log(`Clicked hex: (${hex.q}, ${hex.r})`);
     * 
     * **Formula:**
     * - q = (√3/3 * x - 1/3 * y) / hexSize
     * - r = (2/3 * y) / hexSize
     * 
     * @see hexRound() - Rounds fractional coordinates to nearest hex
     * @see hexToPixel() - Inverse operation (hex to pixel)
     */
    pixelToHex(x, y) {
        const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / this.hexSize;
        const r = (2 / 3 * y) / this.hexSize;
        return this.hexRound(q, r);
    }
    
    /**
     * Round fractional hex coordinates to nearest valid hex using axial coordinate rounding algorithm.
     * Same algorithm as editor mode. Ensures pixel clicks always map to valid hex coordinates.
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
     * @see pixelToHex() - Called after coordinate conversion
     * @see HexMapEditorModule.hexRound() - Same implementation
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
     * Uses different formula than editor mode (doesn't account for zoom in offset calculation).
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
     * **Formula:**
     * - x = hexSize * (√3 * q + √3/2 * r) + offsetX
     * - y = hexSize * (3/2 * r) + offsetY
     * 
     * @see pixelToHex() - Inverse operation (pixel to hex)
     * @see drawPlayHex() - Uses this to position hex rendering
     */
    hexToPixel(q, r) {
        const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + this.offsetX;
        const y = this.hexSize * (3 / 2 * r) + this.offsetY;
        return { x, y };
    }
    
    /**
     * Handle canvas clicks in play mode (move character or reveal hexes).
     * Converts mouse click to hex coordinates and routes to appropriate handler.
     * 
     * @param {MouseEvent} e - Mouse click event
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {Promise<void>}
     * 
     * @example
     * // Called automatically by canvas click event listener
     * canvas.addEventListener('click', (e) => this.handleCanvasClick(e, canvas));
     * 
     * **Behavior:**
     * - DM: Shows reveal dialog for clicked hex
     * - Player: Moves character to clicked hex (if character exists)
     * 
     * **Coordinate Conversion:**
     * - Converts mouse pixel coordinates to canvas coordinates
     * - Accounts for zoom level
     * - Converts to hex coordinates via `pixelToHex()`
     * 
     * @see pixelToHex() - Converts pixel to hex coordinates
     * @see moveCharacter() - Called for player movement
     * @see showRevealDialog() - Called for DM hex reveal
     */
    async handleCanvasClick(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;
        
        const hex = this.pixelToHex(x - this.offsetX, y - this.offsetY);
        
        if (this.isDM) {
            // DM: Show reveal dialog or move character
            this.showRevealDialog([{ q: hex.q, r: hex.r }]);
        } else {
            // Player: Move character
            if (this.characterId) {
                await this.moveCharacter(hex.q, hex.r);
            }
        }
    }
    
    /**
     * Move player character to new hex position.
     * Updates character position, triggers visibility refresh, and broadcasts real-time event.
     * 
     * @param {number} q - Target hex column coordinate
     * @param {number} r - Target hex row coordinate
     * @returns {Promise<void>}
     * 
     * @example
     * // Move character to hex (5, 3)
     * await this.moveCharacter(5, 3);
     * 
     * **Process:**
     * 1. Validates character ID and map ID
     * 2. Calls move API endpoint
     * 3. Reloads visible hexes (updates visibility automatically)
     * 4. Shows success message
     * 5. Broadcasts real-time event to other players
     * 
     * **Side Effects:**
     * - Updates `this.playerPosition`
     * - Triggers visibility refresh via `loadVisibleHexes()`
     * - Broadcasts `hex_map_player_moved` event
     * 
     * @see loadVisibleHexes() - Called after movement to refresh visibility
     * 
     * @api POST /api/hex-maps/play/move.php - Moves character and updates visibility
     */
    async moveCharacter(q, r) {
        if (!this.characterId || !this.currentMapId) return;
        
        try {
            const response = await this.apiClient.post('/api/hex-maps/play/move.php', {
                map_id: this.currentMapId,
                character_id: this.characterId,
                q: q,
                r: r
            });
            
            if (response.status === 'success') {
                // Update game time if provided in response
                if (response.data.game_time) {
                    this.gameTime = new Date(response.data.game_time);
                    this.updateGameTimeDisplay();
                }
                
                // Update player position
                if (response.data.position) {
                    this.playerPosition = response.data.position;
                }
                
                // Reload visible hexes
                await this.loadVisibleHexes();
                
                // Show success message with travel time if available
                let message = `Moved to hex (${q}, ${r})`;
                if (response.data.travel_time_hours) {
                    const hours = response.data.travel_time_hours;
                    let timeDisplay = '';
                    if (hours < 1.0) {
                        const minutes = Math.round(hours * 60);
                        timeDisplay = `${minutes} min`;
                    } else if (hours === 1.0) {
                        timeDisplay = '1 hour';
                    } else {
                        const h = Math.floor(hours);
                        const m = Math.round((hours - h) * 60);
                        if (m > 0) {
                            timeDisplay = `${h}h ${m}m`;
                        } else {
                            timeDisplay = `${h} hours`;
                        }
                    }
                    message += ` (Travel time: ${timeDisplay})`;
                }
                this.app.showSuccess(message);
            } else {
                throw new Error(response.message || 'Failed to move');
            }
        } catch (error) {
            console.error('Failed to move character:', error);
            this.app.showError('Failed to move: ' + error.message);
        }
    }
    
    /**
     * Show dialog for DM to reveal hexes to players (simple prompt implementation).
     * Prompts for hex coordinates if none provided, then calls `revealHexes()`.
     * 
     * @param {Array<Object>} [hexes=[]] - Array of `{q, r}` hex coordinates. If empty, prompts for input.
     * @returns {void}
     * 
     * @example
     * // Show dialog to enter hex coordinates
     * this.showRevealDialog();
     * // User enters "5,3;6,4"
     * // Reveals hexes (5,3) and (6,4)
     * 
     * **Input Format:**
     * - Single hex: `"q,r"` (e.g., "5,3")
     * - Multiple hexes: `"q1,r1;q2,r2;..."` (e.g., "5,3;6,4;7,5")
     * 
     * **Future Enhancement:**
     * Replace prompt with proper modal dialog with hex coordinate picker.
     * 
     * @see revealHexes() - Called with parsed hex coordinates
     */
    showRevealDialog(hexes = []) {
        // Simple implementation - can be enhanced with a proper modal
        if (hexes.length === 0) {
            const hexInput = prompt('Enter hex coordinates (format: q,r or q1,r1;q2,r2):');
            if (!hexInput) return;
            
            hexes = hexInput.split(';').map(coord => {
                const [q, r] = coord.split(',').map(Number);
                return { q, r };
            }).filter(h => !isNaN(h.q) && !isNaN(h.r));
        }
        
        if (hexes.length === 0) return;
        
        this.revealHexes(hexes);
    }
    
    /**
     * Reveal hexes to players via API (DM only).
     * Sets visibility to full (level 2) for specified hexes for all players in session.
     * 
     * @param {Array<Object>} hexes - Array of hex coordinate objects `[{q: number, r: number}, ...]`
     * @returns {Promise<void>}
     * 
     * @example
     * // Reveal hexes (5,3) and (6,4) to all players
     * await this.revealHexes([{q: 5, r: 3}, {q: 6, r: 4}]);
     * 
     * **Process:**
     * 1. Validates map ID
     * 2. Calls reveal API endpoint
     * 3. Reloads visible hexes for all players
     * 4. Shows success message
     * 5. Broadcasts real-time event
     * 
     * **Side Effects:**
     * - Updates visibility for all players in session
     * - Broadcasts `hex_map_hexes_revealed` event
     * 
     * @see showRevealDialog() - Called to get hex coordinates from user
     * @see loadVisibleHexes() - Called after reveal to refresh visibility
     * 
     * @api POST /api/hex-maps/play/reveal.php - Reveals hexes to all players in session
     */
    async revealHexes(hexes) {
        if (!this.currentMapId) return;
        
        try {
            const response = await this.apiClient.post('/api/hex-maps/play/reveal.php', {
                map_id: this.currentMapId,
                hexes: hexes
            });
            
            if (response.status === 'success') {
                // Reload visible hexes for all players
                await this.loadVisibleHexes();
                this.app.showSuccess(`Revealed ${hexes.length} hex(es)`);
            } else {
                throw new Error(response.message || 'Failed to reveal hexes');
            }
        } catch (error) {
            console.error('Failed to reveal hexes:', error);
            this.app.showError('Failed to reveal hexes: ' + error.message);
        }
    }
    
    /**
     * Start listening for real-time events (player movement, hex reveals).
     * Uses existing realtime client from app if available.
     * 
     * @returns {void}
     * 
     * @example
     * // Called when map is in a session
     * if (this.currentMap && this.currentMap.session_id) {
     *   this.startRealtimeUpdates();
     * }
     * 
     * **Event Listeners:**
     * - `hex_map_player_moved` - Reloads visible hexes when any player moves
     * - `hex_map_hexes_revealed` - Reloads visible hexes when DM reveals hexes
     * 
     * **Note:**
     * Uses existing realtime client from `app.modules.realtimeClient` if available.
     * If not available, real-time updates are not started (no error thrown).
     * 
     * @see setupEventListeners() - Called if map is in a session
     */
    startRealtimeUpdates() {
        if (!this.currentMap || !this.currentMap.session_id) return;
        
        // Use existing realtime client if available
        if (this.app.modules.realtimeClient) {
            this.realtimeClient = this.app.modules.realtimeClient;
            
            // Listen for hex map events
            this.realtimeClient.on('hex_map_player_moved', (data) => {
                console.log('Player moved:', data);
                this.loadVisibleHexes();
            });
            
            this.realtimeClient.on('hex_map_hexes_revealed', (data) => {
                console.log('Hexes revealed:', data);
                this.loadVisibleHexes();
            });
        }
    }
    
    /**
     * Update canvas info
     */
    updateCanvasInfo() {
        const infoEl = document.getElementById('canvas-play-info');
        if (infoEl) {
            infoEl.textContent = `Zoom: ${Math.round(this.zoom * 100)}%`;
        }
    }
    
    /**
     * Cleanup resources when leaving play view (stops auto-refresh interval).
     * Prevents memory leaks from accumulating intervals.
     * 
     * @returns {void}
     * 
     * @example
     * // Called when navigating away from play view
     * this.cleanup();
     * 
     * **Cleanup Actions:**
     * - Clears `this.refreshInterval` (stops 5-second auto-refresh)
     * - Prevents memory leaks from accumulating intervals
     * 
     * **Note:**
     * Should be called by view cleanup in `app.js`, but currently missing.
     * This is a known issue that causes intervals to accumulate.
     * 
     * @see setupEventListeners() - Sets up the refresh interval
     * @see refreshInterval - The interval to clear
     */
    cleanup() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Export to window for use in app.js
window.HexMapPlayModule = HexMapPlayModule;
