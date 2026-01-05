/**
 * BECMI D&D Character Manager - Session Map Scratch-Pad Module
 * 
 * Provides multiplayer map scratch-pad with drawing and token placement
 */

class SessionMapScratchpadModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentSessionId = null;
        this.currentMapId = null;
        this.currentMap = null;
        this.maps = [];
        this.drawings = [];
        this.tokens = [];
        this.isDM = false;
        this.userId = null;
        
        // Canvas state
        this.mapCanvas = null;
        this.drawingCanvas = null;
        this.tokenCanvas = null;
        this.mapCtx = null;
        this.drawingCtx = null;
        this.tokenCtx = null;
        this.mapImage = null;
        
        // Drawing state
        this.isDrawing = false;
        this.currentPath = [];
        this.drawingTool = 'draw'; // 'draw' or 'erase'
        this.drawingColor = '#000000';
        this.brushSize = 3;
        this.pendingStrokes = [];
        this.strokeDebounceTimer = null;
        
        // Token state
        this.selectedToken = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.tokenMode = null; // 'marker' or 'character'
        
        // View state
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.lastMousePos = { x: 0, y: 0 };
        
        // Real-time
        this.realtimeClient = null;
        this.lastEventId = 0;
        
        // Event setup flag
        this.eventsSetup = false;
        
        // Resize observer for container
        this.resizeObserver = null;
        
        // Canvas initialization retry counter (prevent infinite loops)
        this.canvasInitRetryCount = 0;
        this.maxCanvasInitRetries = 10;
        
        console.log('Session Map Scratch-Pad Module initialized');
    }
    
    /**
     * Render map view for a session
     */
    async renderMapView(sessionId, mapId = null) {
        try {
            this.currentSessionId = sessionId;
            
            // Always check DM status for this session (userId might be from different session)
            // Always check to ensure correct DM status for current session
            console.log('[Map Scratch-Pad] Checking DM status for session', sessionId);
            await this.checkDMStatus(sessionId);
            
            // Load maps for session (this is fast, just a list query)
            await this.loadMaps(sessionId);
            console.log('[Map Scratch-Pad] Loaded maps:', this.maps.length, 'maps found');
            
            // If no mapId provided, use active map or first map
            if (!mapId) {
                const activeMap = this.maps.find(m => m.is_active);
                mapId = activeMap ? activeMap.map_id : (this.maps.length > 0 ? this.maps[0].map_id : null);
                console.log('[Map Scratch-Pad] Selected map ID:', mapId, 'isDM:', this.isDM);
            }
            
            // Render HTML immediately (don't wait for map data - that loads async)
            const html = this.renderMapInterface();
            
            // Load map details asynchronously (after HTML is rendered, non-blocking)
            if (mapId) {
                console.log('[Map Scratch-Pad] Loading map data for map ID:', mapId);
                // Load map data in background (non-blocking)
                this.loadMapData(mapId).catch(error => {
                    console.error('[Map Scratch-Pad] Failed to load map data:', error);
                });
            } else {
                console.warn('[Map Scratch-Pad] No map ID available to load');
            }
            
            return html;
            
        } catch (error) {
            console.error('[Map Scratch-Pad] Failed to render map view:', error);
            return `<div class="alert alert-danger">Error loading map: ${error.message}</div>`;
        }
    }
    
    /**
     * Load map data asynchronously (called after HTML is rendered)
     */
    async loadMapData(mapId) {
        try {
            console.log('[Map Scratch-Pad] loadMapData: Loading map', mapId, 'isDM:', this.isDM);
            const mapResponse = await this.apiClient.get(`/api/session/maps/get.php?map_id=${mapId}`);
            if (mapResponse.status === 'success') {
                this.currentMap = mapResponse.data;
                this.currentMapId = mapId;
                console.log('[Map Scratch-Pad] loadMapData: Map loaded successfully', {
                    mapId: this.currentMapId,
                    mapName: this.currentMap.map_name,
                    imageUrl: this.currentMap.image_url,
                    isActive: this.currentMap.is_active
                });
                
                // Initialize canvas first (drawings and tokens will be loaded and drawn when canvas is ready)
                // Use longer timeout to ensure DOM is ready
                setTimeout(() => {
                    console.log('[Map Scratch-Pad] loadMapData: Initializing canvas...');
                    this.initializeCanvas();
                }, 100);
                
                // Load drawings and tokens for this map (both DM and players need to see them)
                // Load after a short delay to ensure canvas initialization has started
                setTimeout(async () => {
                    console.log('[Map Scratch-Pad] loadMapData: Loading drawings and tokens...');
                    await this.loadDrawings(mapId);
                    await this.loadTokens(mapId);
                }, 200);
            } else {
                console.error('[Map Scratch-Pad] loadMapData: Failed to load map:', mapResponse.message);
            }
        } catch (error) {
            console.error('[Map Scratch-Pad] loadMapData: Error loading map data:', error);
        }
    }
    
    /**
     * Render map interface HTML
     */
    renderMapInterface() {
        const hasMaps = this.maps.length > 0;
        const mapOptions = this.maps.map(map => 
            `<option value="${map.map_id}" ${map.is_active ? 'selected' : ''}>${this.escapeHtml(map.map_name)}</option>`
        ).join('');
        
        return `
            <div class="session-map-scratchpad">
                <div class="map-toolbar">
                    ${this.isDM ? `
                        <button class="btn btn-primary" id="upload-map-btn">
                            <i class="fas fa-upload"></i> Upload Map
                        </button>
                    ` : ''}
                    <select id="map-selector" class="form-control" ${!hasMaps || !this.isDM ? 'disabled' : ''} 
                            title="${!this.isDM ? 'Only the Dungeon Master can switch maps' : ''}">
                        ${hasMaps ? mapOptions : '<option>No maps available</option>'}
                    </select>
                    ${this.isDM && hasMaps ? `
                        <button class="btn btn-danger btn-sm" id="delete-map-btn">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                </div>
                
                <div class="map-tools">
                    <div class="tool-group">
                        <label>Drawing Tools</label>
                        <div class="tool-buttons">
                            <button class="btn btn-sm ${this.drawingTool === 'draw' ? 'btn-primary' : 'btn-secondary'}" 
                                    id="draw-tool-btn" title="Draw">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="btn btn-sm ${this.drawingTool === 'erase' ? 'btn-primary' : 'btn-secondary'}" 
                                    id="erase-tool-btn" title="Erase">
                                <i class="fas fa-eraser"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="tool-group">
                        <label>Color</label>
                        <div class="color-picker-container">
                            <input type="color" id="drawing-color-picker" value="${this.drawingColor}" 
                                   title="Drawing color">
                            <div class="preset-colors">
                                <div class="preset-color" data-color="#000000" title="Black" style="background-color: #000000;"></div>
                                <div class="preset-color" data-color="#FFFFFF" title="White" style="background-color: #FFFFFF; border: 1px solid #ccc;"></div>
                                <div class="preset-color" data-color="#FF0000" title="Red" style="background-color: #FF0000;"></div>
                                <div class="preset-color" data-color="#00FF00" title="Green" style="background-color: #00FF00;"></div>
                                <div class="preset-color" data-color="#0000FF" title="Blue" style="background-color: #0000FF;"></div>
                                <div class="preset-color" data-color="#FFFF00" title="Yellow" style="background-color: #FFFF00;"></div>
                                <div class="preset-color" data-color="#FF00FF" title="Magenta" style="background-color: #FF00FF;"></div>
                                <div class="preset-color" data-color="#00FFFF" title="Cyan" style="background-color: #00FFFF;"></div>
                                <div class="preset-color" data-color="#8B4513" title="Brown" style="background-color: #8B4513;"></div>
                                <div class="preset-color" data-color="#FFA500" title="Orange" style="background-color: #FFA500;"></div>
                                <div class="preset-color" data-color="#800080" title="Purple" style="background-color: #800080;"></div>
                                <div class="preset-color" data-color="#808080" title="Gray" style="background-color: #808080;"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tool-group">
                        <label>Brush Size</label>
                        <input type="range" id="brush-size-slider" min="1" max="20" value="${this.brushSize}" 
                               title="Brush size">
                        <span id="brush-size-display">${this.brushSize}px</span>
                    </div>
                    
                    <div class="tool-group">
                        <label>Token Tools</label>
                        <div class="tool-buttons">
                            <button class="btn btn-sm btn-secondary" id="place-marker-btn" title="Place Marker">
                                <i class="fas fa-map-marker-alt"></i> Marker
                            </button>
                            <button class="btn btn-sm btn-secondary" id="place-character-btn" title="Place Character Token">
                                <i class="fas fa-user"></i> Character
                            </button>
                            ${this.isDM ? `
                            <button class="btn btn-sm btn-secondary" id="place-monster-btn" title="Place Monster Token">
                                <i class="fas fa-dragon"></i> Monster
                            </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="tool-group">
                        <label>View</label>
                        <div class="tool-buttons">
                            <button class="btn btn-sm btn-secondary" id="zoom-in-btn" title="Zoom In">
                                <i class="fas fa-search-plus"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="zoom-out-btn" title="Zoom Out">
                                <i class="fas fa-search-minus"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" id="reset-view-btn" title="Reset View">
                                <i class="fas fa-home"></i>
                            </button>
                        </div>
                    </div>
                    
                    ${this.isDM ? `
                        <div class="tool-group">
                            <button class="btn btn-sm btn-warning" id="clear-drawings-btn" title="Clear All Drawings">
                                <i class="fas fa-broom"></i> Clear Drawings
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="map-container" id="map-container">
                    ${hasMaps ? `
                        <div class="canvas-wrapper">
                            <canvas id="map-background-canvas"></canvas>
                            <canvas id="map-drawing-canvas"></canvas>
                            <canvas id="map-token-canvas"></canvas>
                            <div class="brush-preview" id="brush-preview"></div>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-map"></i>
                            <p>No maps uploaded yet</p>
                            ${this.isDM ? '<p>Click "Upload Map" to add a map image</p>' : '<p>Ask the DM to upload a map</p>'}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
    
    /**
     * Check if user is DM of session
     */
    async checkDMStatus(sessionId) {
        // Get userId from app state first - wait a bit if not available yet
        let currentUserId = this.app.state?.user?.user_id;
        if (!currentUserId) {
            // Wait a bit for app state to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            currentUserId = this.app.state?.user?.user_id;
        }
        
        if (!currentUserId) {
            console.warn('[Map Scratch-Pad] checkDMStatus: No user ID in app state after wait');
            this.isDM = false;
            this.userId = null;
            return;
        }
        
        console.log('[Map Scratch-Pad] checkDMStatus: Checking DM status for session', sessionId, 'user', currentUserId);
        
        // Use get-dm-dashboard endpoint which only returns success if user is DM
        // This is the most secure way to check DM status
        // 403 is expected if user is not DM, so don't log it as error
        const response = await this.apiClient.get(`/api/session/get-dm-dashboard.php?session_id=${sessionId}`, {}, {
            expectedStatusCodes: [403]
        });
        if (response.success && response.status === 'success' && response.data) {
            this.isDM = true;
            this.userId = currentUserId;
            console.log('[Map Scratch-Pad] checkDMStatus: User is DM');
        } else {
            this.isDM = false;
            this.userId = currentUserId;
            console.log('[Map Scratch-Pad] checkDMStatus: User is not DM');
        }
    }
    
    /**
     * Load all maps for session
     */
    async loadMaps(sessionId) {
        try {
            console.log('[Map Scratch-Pad] loadMaps: Loading maps for session', sessionId);
            const response = await this.apiClient.get(`/api/session/maps/list.php?session_id=${sessionId}`);
            if (response.status === 'success') {
                this.maps = response.data.maps || [];
                console.log('[Map Scratch-Pad] loadMaps: Loaded', this.maps.length, 'maps');
                if (this.maps.length > 0) {
                    console.log('[Map Scratch-Pad] loadMaps: Maps:', this.maps.map(m => ({
                        id: m.map_id,
                        name: m.map_name,
                        isActive: m.is_active
                    })));
                }
            } else {
                console.error('[Map Scratch-Pad] loadMaps: API returned error:', response.message);
                throw new Error(response.message || 'Failed to load maps');
            }
        } catch (error) {
            console.error('[Map Scratch-Pad] loadMaps: Failed to load maps:', error);
            this.maps = [];
        }
    }
    
    /**
     * Refresh active map - reload maps list and switch to active map
     * Simple method that works for both DM and players
     */
    async refreshActiveMap() {
        try {
            console.log('[Map Scratch-Pad] refreshActiveMap: Refreshing maps for session', this.currentSessionId);
            
            // Reload maps list
            await this.loadMaps(this.currentSessionId);
            
            // Find active map
            const activeMap = this.maps.find(m => m.is_active);
            if (!activeMap) {
                console.warn('[Map Scratch-Pad] refreshActiveMap: No active map found');
                return;
            }
            
            // If we're already viewing the active map, just reload its data
            if (this.currentMapId === activeMap.map_id) {
                console.log('[Map Scratch-Pad] refreshActiveMap: Already viewing active map, reloading data');
                await this.loadMapData(activeMap.map_id);
                return;
            }
            
            // Switch to active map
            console.log('[Map Scratch-Pad] refreshActiveMap: Switching to active map', activeMap.map_id);
            await this.loadMapData(activeMap.map_id);
            
            // Update canvas if it exists
            if (document.getElementById('map-background-canvas')) {
                setTimeout(() => {
                    this.initializeCanvas();
                }, 50);
            }
            
        } catch (error) {
            console.error('[Map Scratch-Pad] refreshActiveMap: Failed to refresh:', error);
        }
    }
    
    /**
     * Switch to a different map
     * Only DM can actually switch the active map. Players can only view the active map.
     */
    async switchActiveMap(mapId) {
        try {
            // Only DM can switch active map
            if (!this.isDM) {
                console.warn('Non-DM user attempted to switch map - this should not happen');
                // For non-DM users, just load the map for viewing (don't set as active)
                const mapResponse = await this.apiClient.get(`/api/session/maps/get.php?map_id=${mapId}`);
                if (mapResponse.status === 'success') {
                    this.currentMap = mapResponse.data;
                    this.currentMapId = mapId;
                }
                return;
            }
            
            this.currentMapId = mapId;
            
            // Load map details
            const mapResponse = await this.apiClient.get(`/api/session/maps/get.php?map_id=${mapId}`);
            if (mapResponse.status !== 'success') {
                throw new Error(mapResponse.message || 'Failed to load map');
            }
            
            this.currentMap = mapResponse.data;
            
            // Set as active if DM
            if (!this.currentMap.is_active) {
                await this.apiClient.put('/api/session/maps/update.php', {
                    map_id: mapId,
                    is_active: true
                });
                this.currentMap.is_active = true;
            }
            
            // Load drawings and tokens
            await this.loadDrawings(mapId);
            await this.loadTokens(mapId);
            
            // Always initialize canvas if it exists
            if (document.getElementById('map-background-canvas')) {
                setTimeout(() => {
                    this.initializeCanvas();
                }, 100);
            }
            
        } catch (error) {
            console.error('Failed to switch map:', error);
            this.app.showError('Failed to load map: ' + error.message);
        }
    }
    
    /**
     * Load drawings for current map
     */
    async loadDrawings(mapId) {
        try {
            console.log('[Map Scratch-Pad] loadDrawings: Loading drawings for map', mapId);
            const response = await this.apiClient.get(`/api/session/maps/drawings/get.php?map_id=${mapId}`);
            if (response.status === 'success') {
                this.drawings = response.data.drawings || [];
                console.log('[Map Scratch-Pad] loadDrawings: Loaded', this.drawings.length, 'drawings');
                // Only redraw if canvas is already initialized
                if (this.drawingCtx) {
                    this.redrawDrawings();
                }
            } else {
                console.warn('[Map Scratch-Pad] loadDrawings: API returned error:', response.message);
                this.drawings = [];
            }
        } catch (error) {
            console.error('[Map Scratch-Pad] loadDrawings: Failed to load drawings:', error);
            this.drawings = [];
        }
    }
    
    /**
     * Load tokens for current map
     */
    async loadTokens(mapId) {
        try {
            console.log('[Map Scratch-Pad] loadTokens: Loading tokens for map', mapId);
            const response = await this.apiClient.get(`/api/session/maps/tokens/list.php?map_id=${mapId}`);
            if (response.status === 'success') {
                this.tokens = response.data.tokens || [];
                console.log('[Map Scratch-Pad] loadTokens: Loaded', this.tokens.length, 'tokens');
                // Only redraw if canvas is already initialized
                if (this.tokenCtx) {
                    this.redrawTokens();
                }
            } else {
                console.warn('[Map Scratch-Pad] loadTokens: API returned error:', response.message);
                this.tokens = [];
            }
        } catch (error) {
            console.error('[Map Scratch-Pad] loadTokens: Failed to load tokens:', error);
            this.tokens = [];
        }
    }
    
    /**
     * Initialize canvas layers
     */
    initializeCanvas() {
        console.log('[Map Scratch-Pad] initializeCanvas: Starting, currentMap:', !!this.currentMap, 'currentMapId:', this.currentMapId, 'currentSessionId:', this.currentSessionId);
        if (!this.currentMap) {
            console.warn('[Map Scratch-Pad] initializeCanvas: Cannot initialize canvas: no current map');
            return;
        }
        
        // Get canvas elements - try multiple times if not found
        this.mapCanvas = document.getElementById('map-background-canvas');
        this.drawingCanvas = document.getElementById('map-drawing-canvas');
        this.tokenCanvas = document.getElementById('map-token-canvas');
        
        if (!this.mapCanvas || !this.drawingCanvas || !this.tokenCanvas) {
            this.canvasInitRetryCount++;
            if (this.canvasInitRetryCount >= this.maxCanvasInitRetries) {
                console.error('[Map Scratch-Pad] initializeCanvas: Max retries reached, canvas elements not found');
                this.app.showError('Failed to initialize map canvas. Please refresh the page.');
                return;
            }
            console.warn(`[Map Scratch-Pad] Canvas elements not found, retrying in 200ms... (attempt ${this.canvasInitRetryCount}/${this.maxCanvasInitRetries})`);
            // Retry after a short delay in case DOM isn't ready yet
            setTimeout(() => {
                this.initializeCanvas();
            }, 200);
            return;
        }
        
        // Reset retry counter on success
        this.canvasInitRetryCount = 0;
        
        // Get contexts
        this.mapCtx = this.mapCanvas.getContext('2d');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.tokenCtx = this.tokenCanvas.getContext('2d');
        
        // Don't set initial size here - wait for image to load and use setupCanvasSize()
        // which will calculate proper size based on image dimensions and container
        
        // Load map image
        this.mapImage = new Image();
        this.mapImage.onload = () => {
            // Wait for container to be properly sized, then setup canvas
            // Use requestAnimationFrame to ensure DOM is fully rendered
            requestAnimationFrame(() => {
                // Double-check container is ready
                const container = document.getElementById('map-container');
                if (!container) {
                    console.warn('[Map Scratch-Pad] Container not found, retrying...');
                    setTimeout(() => {
                        this.setupCanvasSize();
                        this.drawMapBackground();
                        this.redrawDrawings();
                        this.redrawTokens();
                    }, 100);
                    return;
                }
                
                // Setup canvas size (which will apply zoom and proper scaling)
                this.setupCanvasSize();
                // Draw everything
                this.drawMapBackground();
                this.redrawDrawings();
                this.redrawTokens();
                
                // Setup canvas events AFTER canvas is sized and ready
                // Always set up events here (even if eventsSetup is true) because canvas might have been recreated
                console.log('[Map Scratch-Pad] Setting up canvas events after image load and canvas sizing...');
                this.setupCanvasEvents();
                this.eventsSetup = true;
                console.log('[Map Scratch-Pad] Canvas events setup complete');
                
                // Set initial pointer-events on token canvas (drawing mode by default - disable pointer events)
                if (this.tokenCanvas) {
                    this.tokenCanvas.style.pointerEvents = 'none';
                }
                
                // Setup canvas events AFTER canvas is sized and ready
                // Always set up events here (even if eventsSetup is true) because canvas might have been recreated
                console.log('[Map Scratch-Pad] Setting up canvas events after image load and canvas sizing...');
                this.setupCanvasEvents();
                this.eventsSetup = true;
                console.log('[Map Scratch-Pad] Canvas events setup complete');
            });
        };
        this.mapImage.onerror = () => {
            console.error('Failed to load map image:', this.currentMap.image_url);
            this.app.showError('Failed to load map image');
        };
        this.mapImage.src = this.currentMap.image_url;
        
        // Setup toolbar events (these don't depend on canvas)
        this.setupToolbarEvents();
        
        // Canvas events will be set up AFTER image loads and canvas is sized
        // This is done in the mapImage.onload callback
        
        // Setup resize observer for container
        this.setupResizeObserver();
        
        this.startRealtimeUpdates();
    }
    
    /**
     * Setup canvas size based on map image
     */
    setupCanvasSize() {
        const container = document.getElementById('map-container');
        if (!container || !this.currentMap) {
            console.warn('setupCanvasSize: container or currentMap missing');
            return;
        }
        
        // Get container dimensions - use getBoundingClientRect for accurate sizing
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width || container.offsetWidth || container.clientWidth || 800;
        const containerHeight = (rect.height || container.offsetHeight || container.clientHeight || 600) - 100; // Account for toolbar
        
        // Ensure we have valid dimensions
        if (containerWidth <= 0 || containerHeight <= 0) {
            console.warn('setupCanvasSize: Invalid container dimensions', { containerWidth, containerHeight });
            return;
        }
        
        const mapWidth = this.currentMap.image_width;
        const mapHeight = this.currentMap.image_height;
        
        if (!mapWidth || !mapHeight) {
            console.error('Map dimensions not available:', { mapWidth, mapHeight });
            return;
        }
        
        // Calculate base scale to fit container
        // Always scale to fit container width as minimum (don't make canvas smaller than container)
        const scaleX = containerWidth / mapWidth;
        const scaleY = containerHeight / mapHeight;
        const baseScale = Math.min(scaleX, scaleY); // Use the smaller scale to fit both dimensions
        
        // Apply zoom to base scale
        const finalScale = baseScale * this.zoom;
        
        // Calculate canvas size based on scaled map dimensions
        let canvasWidth = Math.round(mapWidth * finalScale);
        let canvasHeight = Math.round(mapHeight * finalScale);
        
        // CRITICAL: Ensure canvas is at least as wide as container
        // This prevents the "zoom out" effect when image is large
        if (canvasWidth < containerWidth) {
            // Scale to match container width exactly
            const widthScale = containerWidth / mapWidth;
            canvasWidth = containerWidth;
            canvasHeight = Math.round(mapHeight * widthScale);
            this.mapScale = widthScale * this.zoom;
        } else {
            this.mapScale = finalScale;
        }
        
        console.log('setupCanvasSize:', {
            containerWidth,
            containerHeight,
            mapWidth,
            mapHeight,
            baseScale,
            zoom: this.zoom,
            finalScale,
            canvasWidth,
            canvasHeight,
            mapScale: this.mapScale
        });
        
        // Set all canvases to same size
        // IMPORTANT: Don't clone or replace canvas elements here - that would remove event listeners!
        [this.mapCanvas, this.drawingCanvas, this.tokenCanvas].forEach(canvas => {
            if (canvas) {
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                canvas.style.width = canvasWidth + 'px';
                canvas.style.height = canvasHeight + 'px';
                
                // Re-get context after resizing (context is lost when canvas size changes)
                if (canvas === this.mapCanvas) {
                    this.mapCtx = canvas.getContext('2d');
                } else if (canvas === this.drawingCanvas) {
                    this.drawingCtx = canvas.getContext('2d');
                } else if (canvas === this.tokenCanvas) {
                    this.tokenCtx = canvas.getContext('2d');
                }
            }
        });
        
        // Adjust container height to match canvas height
        if (container) {
            container.style.height = canvasHeight + 'px';
            console.log('[Map Scratch-Pad] Container height adjusted to:', canvasHeight);
        }
        
        // Ensure mapScale is set (should already be set above, but ensure it's never 0 or undefined)
        if (!this.mapScale || this.mapScale <= 0) {
            this.mapScale = finalScale > 0 ? finalScale : 1.0;
        }
    }
    
    /**
     * Draw map background image
     */
    drawMapBackground() {
        if (!this.mapCtx || !this.mapImage) return;
        
        this.mapCtx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
        this.mapCtx.drawImage(this.mapImage, 0, 0, this.mapCanvas.width, this.mapCanvas.height);
    }
    
    /**
     * Redraw all drawings
     */
    redrawDrawings() {
        if (!this.drawingCtx) return;
        
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        this.drawings.forEach(drawing => {
            this.drawPath(drawing.path_data, drawing.color, drawing.brush_size, drawing.drawing_type === 'erase');
        });
    }
    
    /**
     * Draw a path on canvas
     */
    drawPath(pathData, color, brushSize, isErase = false) {
        if (!this.drawingCtx) {
            console.warn('[Map Scratch-Pad] drawPath: drawingCtx not available');
            return;
        }
        if (!pathData || pathData.length === 0) {
            console.warn('[Map Scratch-Pad] drawPath: No path data provided');
            return;
        }
        
        this.drawingCtx.beginPath();
        this.drawingCtx.lineWidth = brushSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
        
        if (isErase) {
            this.drawingCtx.globalCompositeOperation = 'destination-out';
        } else {
            this.drawingCtx.globalCompositeOperation = 'source-over';
            this.drawingCtx.strokeStyle = color;
        }
        
        // Scale coordinates (pathData is in original map coordinates)
        if (!this.mapScale || this.mapScale === 0) {
            console.warn('[Map Scratch-Pad] drawPath: mapScale not set, using 1.0');
            this.mapScale = 1.0;
        }
        const scaledPath = pathData.map(point => ({
            x: point.x * this.mapScale,
            y: point.y * this.mapScale
        }));
        
        this.drawingCtx.moveTo(scaledPath[0].x, scaledPath[0].y);
        for (let i = 1; i < scaledPath.length; i++) {
            this.drawingCtx.lineTo(scaledPath[i].x, scaledPath[i].y);
        }
        
        this.drawingCtx.stroke();
        this.drawingCtx.globalCompositeOperation = 'source-over';
    }
    
    /**
     * Redraw all tokens
     */
    redrawTokens() {
        if (!this.tokenCtx) {
            console.warn('[Map Scratch-Pad] redrawTokens: tokenCtx not available');
            return;
        }
        
        if (!this.tokenCanvas) {
            console.warn('[Map Scratch-Pad] redrawTokens: tokenCanvas not available');
            return;
        }
        
        console.log('[Map Scratch-Pad] redrawTokens: Redrawing', this.tokens.length, 'tokens');
        
        this.tokenCtx.clearRect(0, 0, this.tokenCanvas.width, this.tokenCanvas.height);
        
        this.tokens.forEach(token => {
            this.drawToken(token);
        });
    }
    
    /**
     * Draw a single token
     */
    drawToken(token) {
        if (!this.tokenCtx) return;
        
        // Ensure mapScale is valid (prevent undefined/0 errors)
        const scale = this.mapScale && this.mapScale > 0 ? this.mapScale : 1.0;
        
        const x = token.x_position * scale;
        const y = token.y_position * scale;
        const size = 30 * scale; // Reduced from 90 to 60 (33% smaller)
        
        if (token.token_type === 'portrait' && token.portrait_url) {
            // Draw portrait token
            const img = new Image();
            img.onload = () => {
                // Check context is still valid (canvas might have been resized)
                if (!this.tokenCtx) return;
                
                this.tokenCtx.save();
                this.tokenCtx.beginPath();
                this.tokenCtx.arc(x, y, size / 2, 0, Math.PI * 2);
                this.tokenCtx.clip();
                this.tokenCtx.drawImage(img, x - size / 2, y - size / 2, size, size);
                this.tokenCtx.restore();
                
                // Draw border
                this.tokenCtx.strokeStyle = token.color;
                this.tokenCtx.lineWidth = 2;
                this.tokenCtx.beginPath();
                this.tokenCtx.arc(x, y, size / 2, 0, Math.PI * 2);
                this.tokenCtx.stroke();
                
                // Draw label if present with stroke for readability
                if (token.label || token.character_name) {
                    const labelText = token.label || token.character_name;
                    const fontSize = Math.max(12, 12 * scale); // Scale font size with zoom
                    this.tokenCtx.font = `bold ${fontSize}px Arial`;
                    this.tokenCtx.textAlign = 'center';
                    this.tokenCtx.textBaseline = 'top';
                    
                    // Draw stroke (outline) first for readability on all backgrounds
                    this.tokenCtx.strokeStyle = '#000';
                    this.tokenCtx.lineWidth = 1;
                    this.tokenCtx.strokeText(labelText, x, y + size / 2 + 15);
                    
                    // Then draw fill
                    this.tokenCtx.fillStyle = '#fff';
                    this.tokenCtx.fillText(labelText, x, y + size / 2 + 15);
                }
            };
            img.onerror = () => {
                console.error('[Map Scratch-Pad] drawToken: Failed to load portrait image:', token.portrait_url);
                // Fallback: Draw as marker token if image fails to load
                this.tokenCtx.fillStyle = token.color || '#FF0000';
                this.tokenCtx.beginPath();
                this.tokenCtx.arc(x, y, size / 2, 0, Math.PI * 2);
                this.tokenCtx.fill();
                
                // Draw border
                this.tokenCtx.strokeStyle = '#000';
                this.tokenCtx.lineWidth = 2;
                this.tokenCtx.stroke();
                
                // Draw label with stroke for readability
                if (token.label || token.character_name) {
                    const labelText = token.label || token.character_name;
                    const fontSize = Math.max(12, 12 * scale); // Scale font size with zoom
                    this.tokenCtx.font = `bold ${fontSize}px Arial`;
                    this.tokenCtx.textAlign = 'center';
                    this.tokenCtx.textBaseline = 'middle';
                    
                    // Draw stroke (outline) first for readability on all backgrounds
                    this.tokenCtx.strokeStyle = '#000';
                    this.tokenCtx.lineWidth = 1;
                    this.tokenCtx.strokeText(labelText, x, y);
                    
                    // Then draw fill
                    this.tokenCtx.fillStyle = '#fff';
                    this.tokenCtx.fillText(labelText, x, y);
                }
            };
            img.src = '/' + token.portrait_url;
        } else {
            // Draw marker token
            this.tokenCtx.fillStyle = token.color;
            this.tokenCtx.beginPath();
            this.tokenCtx.arc(x, y, size / 2, 0, Math.PI * 2);
            this.tokenCtx.fill();
            
            // Draw border
            this.tokenCtx.strokeStyle = '#000';
            this.tokenCtx.lineWidth = 2;
            this.tokenCtx.stroke();
            
            // Draw label with stroke for readability
            if (token.label) {
                const fontSize = Math.max(12, 12 * scale); // Scale font size with zoom
                this.tokenCtx.font = `bold ${fontSize}px Arial`;
                this.tokenCtx.textAlign = 'center';
                this.tokenCtx.textBaseline = 'middle';
                
                // Draw stroke (outline) first for readability on all backgrounds
                this.tokenCtx.strokeStyle = '#000';
                this.tokenCtx.lineWidth = 1;
                this.tokenCtx.strokeText(token.label, x, y);
                
                // Then draw fill
                this.tokenCtx.fillStyle = '#fff';
                this.tokenCtx.fillText(token.label, x, y);
            }
        }
    }
    
    /**
     * Setup canvas event handlers for drawing
     */
    setupCanvasEvents() {
        if (!this.drawingCanvas) {
            console.warn('[Map Scratch-Pad] setupCanvasEvents: drawingCanvas not found');
            return;
        }
        
        console.log('[Map Scratch-Pad] setupCanvasEvents: Setting up events on canvas', {
            canvasId: this.drawingCanvas.id,
            canvasWidth: this.drawingCanvas.width,
            canvasHeight: this.drawingCanvas.height
        });
        
        const canvas = this.drawingCanvas;
        
        // Remove existing event listeners to prevent duplicates
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);
        this.drawingCanvas = newCanvas;
        this.drawingCtx = newCanvas.getContext('2d');
        
        console.log('[Map Scratch-Pad] setupCanvasEvents: Canvas cloned and replaced', {
            newCanvasId: this.drawingCanvas.id,
            newCanvasWidth: this.drawingCanvas.width,
            newCanvasHeight: this.drawingCanvas.height
        });
        
        let isMouseDown = false;
        
        // Mouse events
        this.drawingCanvas.addEventListener('mousedown', (e) => {
            console.log('[Map Scratch-Pad] mousedown event:', {
                tokenMode: this.tokenMode,
                drawingTool: this.drawingTool,
                isDM: this.isDM
            });
            
            if (this.tokenMode) {
                console.log('[Map Scratch-Pad] Ignoring mousedown: tokenMode is active');
                return; // Don't draw if in token mode
            }
            if (!this.drawingTool) {
                console.log('[Map Scratch-Pad] Ignoring mousedown: no drawingTool selected');
                return; // Don't draw if no tool selected
            }
            
            isMouseDown = true;
            this.isDrawing = true;
            const point = this.getCanvasPoint(e, this.drawingCanvas);
            this.currentPath = [point];
            this.lastMousePos = point;
            console.log('[Map Scratch-Pad] Drawing started:', { point, drawingTool: this.drawingTool });
        });
        
        this.drawingCanvas.addEventListener('mousemove', (e) => {
            // Update brush preview position
            this.updateBrushPreview(e);
            
            if (!isMouseDown || !this.isDrawing) return;
            
            const point = this.getCanvasPoint(e, this.drawingCanvas);
            this.currentPath.push(point);
            
            // Draw immediately for feedback (draw directly on canvas, not through drawPath which expects original coordinates)
            if (!this.drawingCtx) return;
            
            this.drawingCtx.beginPath();
            this.drawingCtx.lineWidth = this.brushSize;
            this.drawingCtx.lineCap = 'round';
            this.drawingCtx.lineJoin = 'round';
            
            if (this.drawingTool === 'erase') {
                this.drawingCtx.globalCompositeOperation = 'destination-out';
            } else {
                this.drawingCtx.globalCompositeOperation = 'source-over';
                this.drawingCtx.strokeStyle = this.drawingColor;
            }
            
            this.drawingCtx.moveTo(this.lastMousePos.x, this.lastMousePos.y);
            this.drawingCtx.lineTo(point.x, point.y);
            this.drawingCtx.stroke();
            this.drawingCtx.globalCompositeOperation = 'source-over';
            
            this.lastMousePos = point;
        });
        
        this.drawingCanvas.addEventListener('mouseup', (e) => {
            if (!isMouseDown) return;

            console.log('[Map Scratch-Pad] mouseup: Ending drawing, path length:', this.currentPath.length);
            isMouseDown = false;
            this.isDrawing = false;

            // Only submit if path has at least 2 points (a line needs start and end)
            if (this.currentPath.length >= 2) {
                console.log('[Map Scratch-Pad] mouseup: Submitting drawing...');
                this.submitDrawing();
            } else if (this.currentPath.length > 0) {
                console.log('[Map Scratch-Pad] mouseup: Path too short, discarding');
            }

            this.currentPath = [];
        });
        
        this.drawingCanvas.addEventListener('mouseleave', () => {
            // Hide brush preview when mouse leaves canvas
            this.hideBrushPreview();
            
            if (isMouseDown) {
                // Only submit if path has at least 2 points
                if (this.currentPath.length >= 2) {
                    console.log('[Map Scratch-Pad] mouseleave: Submitting drawing...');
                    this.submitDrawing();
                } else if (this.currentPath.length > 0) {
                    console.log('[Map Scratch-Pad] mouseleave: Path too short, discarding');
                }
            }
            isMouseDown = false;
            this.isDrawing = false;
            this.currentPath = [];
        });
        
        // Touch events (with passive: false for preventDefault)
        this.drawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.tokenMode) return;
            if (!this.drawingTool) return; // Don't draw if no tool selected
            
            const touch = e.touches[0];
            const point = this.getCanvasPoint(touch, this.drawingCanvas);
            isMouseDown = true;
            this.isDrawing = true;
            this.currentPath = [point];
            this.lastMousePos = point;
        }, { passive: false });
        
        this.drawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!isMouseDown || !this.isDrawing) return;
            
            const touch = e.touches[0];
            const point = this.getCanvasPoint(touch, this.drawingCanvas);
            this.currentPath.push(point);
            
            // Draw immediately for feedback (draw directly on canvas, not through drawPath which expects original coordinates)
            if (!this.drawingCtx) return;
            
            this.drawingCtx.beginPath();
            this.drawingCtx.lineWidth = this.brushSize;
            this.drawingCtx.lineCap = 'round';
            this.drawingCtx.lineJoin = 'round';
            
            if (this.drawingTool === 'erase') {
                this.drawingCtx.globalCompositeOperation = 'destination-out';
            } else {
                this.drawingCtx.globalCompositeOperation = 'source-over';
                this.drawingCtx.strokeStyle = this.drawingColor;
            }
            
            this.drawingCtx.moveTo(this.lastMousePos.x, this.lastMousePos.y);
            this.drawingCtx.lineTo(point.x, point.y);
            this.drawingCtx.stroke();
            this.drawingCtx.globalCompositeOperation = 'source-over';
            
            this.lastMousePos = point;
        }, { passive: false });
        
        this.drawingCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!isMouseDown) return;

            console.log('[Map Scratch-Pad] touchend: Ending drawing, path length:', this.currentPath.length);
            isMouseDown = false;
            this.isDrawing = false;

            // Only submit if path has at least 2 points (a line needs start and end)
            if (this.currentPath.length >= 2) {
                console.log('[Map Scratch-Pad] touchend: Submitting drawing...');
                this.submitDrawing();
            } else if (this.currentPath.length > 0) {
                console.log('[Map Scratch-Pad] touchend: Path too short, discarding');
            }
            
            this.currentPath = [];
        }, { passive: false });
        
        // Token canvas events (for token placement and dragging)
        this.setupTokenCanvasEvents();
    }
    
    /**
     * Setup token canvas events
     */
    setupTokenCanvasEvents() {
        if (!this.tokenCanvas) return;
        
        // Remove existing event listeners to prevent duplicates
        const newCanvas = this.tokenCanvas.cloneNode(true);
        this.tokenCanvas.parentNode.replaceChild(newCanvas, this.tokenCanvas);
        this.tokenCanvas = newCanvas;
        this.tokenCtx = newCanvas.getContext('2d');
        
        const canvas = this.tokenCanvas;
        
        canvas.addEventListener('click', (e) => {
            if (this.tokenMode && this.mapScale) {
                const point = this.getCanvasPoint(e, canvas);
                this.handleTokenPlacement(point.x / this.mapScale, point.y / this.mapScale);
            }
        });
        
        // Token dragging
        let draggedToken = null;
        let dragStart = null;
        
        canvas.addEventListener('mousedown', (e) => {
            if (this.tokenMode) return;
            
            const scale = this.mapScale && this.mapScale > 0 ? this.mapScale : 1.0;
            const point = this.getCanvasPoint(e, canvas);
            const clickedToken = this.findTokenAtPoint(point.x / scale, point.y / scale);
            
            if (clickedToken) {
                draggedToken = clickedToken;
                dragStart = point;
                this.isDragging = true;
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging || !draggedToken) return;
            
            const scale = this.mapScale && this.mapScale > 0 ? this.mapScale : 1.0;
            const point = this.getCanvasPoint(e, canvas);
            const newX = point.x / scale;
            const newY = point.y / scale;
            
            // Update token position
            draggedToken.x_position = newX;
            draggedToken.y_position = newY;
            
            this.redrawTokens();
        });
        
        canvas.addEventListener('mouseup', () => {
            if (this.isDragging && draggedToken) {
                this.updateTokenPosition(draggedToken.token_id, draggedToken.x_position, draggedToken.y_position);
            }
            this.isDragging = false;
            draggedToken = null;
            dragStart = null;
        });
        
        // Right-click context menu for deleting tokens
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default browser context menu
            
            if (this.tokenMode) return; // Don't show menu when in placement mode
            
            const scale = this.mapScale && this.mapScale > 0 ? this.mapScale : 1.0;
            const point = this.getCanvasPoint(e, canvas);
            const clickedToken = this.findTokenAtPoint(point.x / scale, point.y / scale);
            
            if (clickedToken) {
                // Check if user can delete this token (owner or DM)
                // user_id is always present in tokens from API
                const isOwner = clickedToken.user_id && this.userId && clickedToken.user_id === this.userId;
                const canDelete = isOwner || (this.isDM === true);
                
                if (canDelete) {
                    if (confirm(`Er du sikker på, at du vil slette denne markør?`)) {
                        this.deleteToken(clickedToken.token_id);
                    }
                } else {
                    this.app.showError('Du har ikke tilladelse til at slette denne markør');
                }
            }
        });
    }
    
    /**
     * Update brush preview position and style
     */
    updateBrushPreview(event) {
        if (!this.drawingCanvas || !this.drawingTool) {
            this.hideBrushPreview();
            return;
        }
        
        const preview = document.getElementById('brush-preview');
        if (!preview) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Calculate size in pixels (accounting for zoom)
        const size = this.brushSize * this.zoom;
        
        preview.style.display = 'block';
        preview.style.left = (x - size / 2) + 'px';
        preview.style.top = (y - size / 2) + 'px';
        preview.style.width = size + 'px';
        preview.style.height = size + 'px';
        
        // Update style based on tool
        if (this.drawingTool === 'erase') {
            preview.classList.add('erase-preview');
            preview.classList.remove('draw-preview');
        } else {
            preview.classList.add('draw-preview');
            preview.classList.remove('erase-preview');
            preview.style.borderColor = this.drawingColor;
        }
    }
    
    /**
     * Hide brush preview
     */
    hideBrushPreview() {
        const preview = document.getElementById('brush-preview');
        if (preview) {
            preview.style.display = 'none';
        }
    }
    
    /**
     * Get canvas coordinates from mouse/touch event
     */
    getCanvasPoint(event, canvas) {
        if (!canvas) {
            console.error('[Map Scratch-Pad] getCanvasPoint: Canvas is null');
            return { x: 0, y: 0 };
        }
        
        const rect = canvas.getBoundingClientRect();
        
        // Prevent division by zero
        if (rect.width <= 0 || rect.height <= 0) {
            console.warn('[Map Scratch-Pad] getCanvasPoint: Invalid canvas dimensions', { width: rect.width, height: rect.height });
            return { x: 0, y: 0 };
        }
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clientX = event.clientX || (event.touches && event.touches[0] && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0] && event.touches[0].clientY);
        
        if (clientX === undefined || clientY === undefined) {
            console.warn('[Map Scratch-Pad] getCanvasPoint: Could not determine client coordinates');
            return { x: 0, y: 0 };
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    /**
     * Find token at point
     */
    findTokenAtPoint(x, y) {
        // Use scaled token size for accurate hit detection (updated to match new token size)
        const scale = this.mapScale && this.mapScale > 0 ? this.mapScale : 1.0;
        const tokenSize = 30 * scale; // Reduced from 90 to 60 (33% smaller)
        return this.tokens.find(token => {
            const dx = token.x_position - x;
            const dy = token.y_position - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= tokenSize;
        });
    }
    
    /**
     * Submit drawing to API
     */
    async submitDrawing() {
        // Validate path has at least 2 points
        if (this.currentPath.length < 2) {
            console.log('[Map Scratch-Pad] submitDrawing: Path too short, need at least 2 points');
            return;
        }
        
        if (!this.currentMapId) {
            console.error('[Map Scratch-Pad] submitDrawing: No current map ID');
            this.app.showError('No map selected');
            return;
        }
        
        console.log('[Map Scratch-Pad] submitDrawing: Submitting drawing', {
            pathLength: this.currentPath.length,
            mapId: this.currentMapId,
            drawingTool: this.drawingTool,
            color: this.drawingColor,
            brushSize: this.brushSize,
            mapScale: this.mapScale
        });
        
        try {
            // Ensure mapScale is valid before conversion (prevent division by zero)
            const scale = this.mapScale && this.mapScale > 0 ? this.mapScale : 1.0;
            if (scale <= 0) {
                console.error('[Map Scratch-Pad] submitDrawing: Invalid mapScale:', this.mapScale);
                this.app.showError('Invalid map scale. Please refresh the page.');
                return;
            }
            
            // Convert to original scale coordinates
            const originalPath = this.currentPath.map(point => ({
                x: point.x / scale,
                y: point.y / scale
            }));
            
            console.log('[Map Scratch-Pad] submitDrawing: Sending to API', {
                map_id: this.currentMapId,
                drawing_type: this.drawingTool,
                color: this.drawingColor,
                brush_size: this.brushSize,
                path_data_length: originalPath.length
            });
            
            const response = await this.apiClient.post('/api/session/maps/drawings/add.php', {
                map_id: this.currentMapId,
                drawing_type: this.drawingTool,
                color: this.drawingColor,
                brush_size: this.brushSize,
                path_data: originalPath
            });
            
            console.log('[Map Scratch-Pad] submitDrawing: API response', response);
            
            if (response.status === 'success') {
                console.log('[Map Scratch-Pad] submitDrawing: Drawing saved successfully', response.data);
                // Add to local drawings array
                this.drawings.push(response.data);
                console.log('[Map Scratch-Pad] submitDrawing: Total drawings now:', this.drawings.length);
            } else {
                console.error('[Map Scratch-Pad] submitDrawing: API returned error:', response.message);
            }
        } catch (error) {
            console.error('[Map Scratch-Pad] submitDrawing: Failed to submit drawing:', error);
            this.app.showError('Failed to save drawing');
        }
    }
    
    /**
     * Handle token placement
     */
    async handleTokenPlacement(x, y) {
        if (this.tokenMode === 'marker') {
            // Show color picker modal for marker
            this.showMarkerPlacementModal(x, y);
        } else if (this.tokenMode === 'character') {
            // If DM, show character selection modal (DM can place any character)
            // If player, place their character directly (no modal needed)
            if (this.isDM) {
                this.showCharacterPlacementModal(x, y);
            } else {
                // Player: Find their character in this session and place it directly
                await this.placePlayerCharacterToken(x, y);
            }
        } else if (this.tokenMode === 'monster') {
            // Show monster instance selection modal
            await this.showMonsterInstanceSelectionModal(x, y);
        }
    }
    
    /**
     * Place player's character token directly (no modal for players)
     */
    async placePlayerCharacterToken(x, y) {
        try {
            // Get user's characters
            const charactersResponse = await this.apiClient.get('/api/character/list.php');
            
            if (charactersResponse.status !== 'success') {
                this.app.showError('Failed to load your character');
                this.tokenMode = null;
                return;
            }
            
            const allCharacters = charactersResponse.data?.characters || charactersResponse.characters || [];
            
            // Find character assigned to this session
            const sessionCharacter = allCharacters.find(char => {
                const charSessionId = char.session_id ? parseInt(char.session_id) : null;
                const currentSessionIdNum = parseInt(this.currentSessionId);
                return charSessionId === currentSessionIdNum;
            });
            
            if (!sessionCharacter) {
                this.app.showError('You have no character assigned to this session. Please assign a character first.');
                this.tokenMode = null;
                return;
            }
            
            // Place the character token directly
            console.log('[Map Scratch-Pad] Placing player character token:', sessionCharacter.character_name);
            await this.addToken(this.currentMapId, sessionCharacter.character_id, 'portrait', x, y, null, null);
            this.tokenMode = null;
            
        } catch (error) {
            console.error('[Map Scratch-Pad] Failed to place player character token:', error);
            this.app.showError('Failed to place character token: ' + error.message);
            this.tokenMode = null;
        }
    }
    
    /**
     * Show monster instance selection modal (DM only)
     * Shows list of monster instances from initiative tracker
     */
    async showMonsterInstanceSelectionModal(x, y) {
        try {
            // Get monster instances from initiative tracker
            const sessionManagement = this.app.modules.sessionManagement;
            if (!sessionManagement) {
                this.app.showError('Session management module not available');
                this.tokenMode = null;
                return;
            }
            
            // Load initiative data to get monster instances
            const initiativeData = await sessionManagement.loadInitiativeOrder(this.currentSessionId);
            const monsterInitiatives = (initiativeData.initiatives || []).filter(init => init.entity_type === 'monster');
            
            if (monsterInitiatives.length === 0) {
                this.app.showInfo('No monsters in initiative tracker. Add monsters to initiative first.');
                this.tokenMode = null;
                return;
            }
            
            // Get monster instances details
            const response = await this.apiClient.get(`/api/monsters/list-instances.php?session_id=${this.currentSessionId}`);
            const instances = response.status === 'success' ? (response.data.instances || []) : [];
            
            // Create modal with monster instance list
            const modalHtml = `
                <div class="modal show" id="place-monster-modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-dragon"></i> Select Monster to Place</h2>
                            <button type="button" class="close" id="close-monster-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <p class="text-muted">Select a monster from initiative tracker to place on the map:</p>
                            <div class="monster-instance-list" style="max-height: 400px; overflow-y: auto;">
                                ${monsterInitiatives.map(init => {
                                    const instance = instances.find(i => i.instance_id === init.monster_instance_id);
                                    const monsterName = instance ? instance.monster_name : 'Unknown';
                                    const isBoss = instance ? instance.is_named_boss : false;
                                    const hp = instance ? `${instance.current_hp}/${instance.max_hp}` : '—';
                                    const ac = instance ? instance.armor_class : '—';
                                    
                                    return `
                                        <div class="monster-instance-item" 
                                             data-monster-instance-id="${init.monster_instance_id}"
                                             data-initiative-id="${init.initiative_id}"
                                             style="padding: var(--space-3); margin-bottom: var(--space-2); background: var(--parchment-200); border-radius: var(--radius-sm); cursor: pointer; border: 2px solid var(--wood-400);"
                                             onmouseover="this.style.borderColor='var(--brass-400)'"
                                             onmouseout="this.style.borderColor='var(--wood-400)'">
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <div>
                                                    <strong>${this.escapeHtml(init.entity_name)}</strong>
                                                    ${isBoss ? ' <i class="fas fa-crown" style="color: var(--brass-400);"></i>' : ''}
                                                    <div style="font-size: 0.9em; color: var(--text-soft); margin-top: var(--space-1);">
                                                        ${this.escapeHtml(monsterName)} | AC: ${ac} | HP: ${hp}
                                                    </div>
                                                </div>
                                                <button class="btn btn-sm btn-primary select-monster-btn" 
                                                        data-monster-instance-id="${init.monster_instance_id}"
                                                        data-initiative-id="${init.initiative_id}"
                                                        data-entity-name="${this.escapeHtml(init.entity_name)}">
                                                    <i class="fas fa-map-marker-alt"></i> Place
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="cancel-monster-modal">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            
            $('#place-monster-modal').remove();
            $('body').append(modalHtml);
            
            $('#close-monster-modal, #cancel-monster-modal').on('click', () => {
                $('#place-monster-modal').remove();
                this.tokenMode = null;
            });
            
            $('#place-monster-modal').on('click', (e) => {
                if (e.target.id === 'place-monster-modal') {
                    $('#place-monster-modal').remove();
                    this.tokenMode = null;
                }
            });
            
            // Handle monster instance selection
            $('.monster-instance-item, .select-monster-btn').on('click', async (e) => {
                e.preventDefault();
                const $target = $(e.currentTarget);
                const monsterInstanceId = $target.data('monster-instance-id') || $target.closest('.monster-instance-item').data('monster-instance-id');
                const initiativeId = $target.data('initiative-id') || $target.closest('.monster-instance-item').data('initiative-id');
                const entityName = $target.data('entity-name') || $target.closest('.monster-instance-item').find('strong').text();
                
                if (!monsterInstanceId) {
                    return;
                }
                
                // Get monster instance for color
                const instance = instances.find(i => i.instance_id === monsterInstanceId);
                const color = '#DC3545'; // Red for monsters
                
                // Place token
                await this.addToken(
                    this.currentMapId,
                    null, // character_id
                    'marker',
                    x,
                    y,
                    color,
                    entityName,
                    monsterInstanceId,
                    initiativeId
                );
                
                this.app.showSuccess(`Token placed for ${entityName}`);
                $('#place-monster-modal').remove();
                this.tokenMode = null;
            });
            
        } catch (error) {
            console.error('Failed to show monster instance selection modal:', error);
            this.app.showError('Failed to load monster instances: ' + error.message);
            this.tokenMode = null;
        }
    }
    
    /**
     * Show monster placement modal (DM only) - DEPRECATED, use showMonsterInstanceSelectionModal instead
     */
    showMonsterPlacementModal(x, y) {
        // Redirect to new method
        this.showMonsterInstanceSelectionModal(x, y);
    }
    
    /**
     * Show marker placement modal
     */
    showMarkerPlacementModal(x, y) {
        const modalHtml = `
            <div class="modal show" id="place-marker-modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-map-marker-alt"></i> Place Marker</h2>
                        <button type="button" class="close" id="close-marker-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal__inner">
                        <form id="place-marker-form">
                            <div class="form-group">
                                <label for="marker-color">Color</label>
                                <input type="color" id="marker-color" value="#FF0000">
                            </div>
                            <div class="form-group">
                                <label for="marker-label">Label (Optional)</label>
                                <input type="text" id="marker-label" maxlength="50" placeholder="Marker label">
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Place Marker</button>
                                <button type="button" class="btn btn-secondary" id="cancel-marker-modal">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        $('#place-marker-modal').remove();
        $('body').append(modalHtml);
        
        $('#close-marker-modal, #cancel-marker-modal').on('click', () => {
            $('#place-marker-modal').remove();
            this.tokenMode = null;
        });
        
        $('#place-marker-modal').on('click', (e) => {
            if (e.target === e.currentTarget) {
                $('#place-marker-modal').remove();
                this.tokenMode = null;
            }
        });
        
        $('#place-marker-form').on('submit', async (e) => {
            e.preventDefault();
            const color = $('#marker-color').val();
            const label = $('#marker-label').val().trim() || null;
            
            await this.addToken(this.currentMapId, null, 'marker', x, y, color, label);
            $('#place-marker-modal').remove();
            this.tokenMode = null;
        });
    }
    
    /**
     * Show character placement modal
     */
    async showCharacterPlacementModal(x, y) {
        // Load characters for session
        try {
            let characters = [];
            
            if (this.isDM) {
                // DM: Get ALL characters assigned to this session
                const charactersResponse = await this.apiClient.get(`/api/character/list.php?session_id=${this.currentSessionId}`);
                
                if (charactersResponse.status === 'success') {
                    characters = charactersResponse.data?.characters || charactersResponse.characters || [];
                    console.log('[Map Scratch-Pad] showCharacterPlacementModal (DM): All characters in session:', characters);
                } else {
                    console.error('[Map Scratch-Pad] showCharacterPlacementModal (DM): Failed to load characters:', charactersResponse);
                }
            } else {
                // Player: Get only their own characters in this session
                const charactersResponse = await this.apiClient.get('/api/character/list.php');
                
                if (charactersResponse.status === 'success') {
                    // Get all characters from response
                    const allCharacters = charactersResponse.data?.characters || charactersResponse.characters || [];
                    console.log('[Map Scratch-Pad] showCharacterPlacementModal (Player): All characters:', allCharacters);
                    console.log('[Map Scratch-Pad] showCharacterPlacementModal (Player): Current session ID:', this.currentSessionId, 'type:', typeof this.currentSessionId);
                    
                    // Filter to only show characters in the current session
                    // Handle both string and number types for session_id
                    characters = allCharacters.filter(char => {
                        // Handle null/undefined session_id
                        if (char.session_id === null || char.session_id === undefined) {
                            return false; // Players can't place unassigned characters
                        }
                        
                        // Convert both to numbers for comparison
                        const charSessionId = parseInt(char.session_id);
                        const currentSessionIdNum = parseInt(this.currentSessionId);
                        const matches = charSessionId === currentSessionIdNum;
                        
                        console.log('[Map Scratch-Pad] Character:', char.character_name, 
                            'session_id:', char.session_id, 'parsed:', charSessionId, 
                            'currentSessionId:', this.currentSessionId, 'parsed:', currentSessionIdNum, 
                            'matches:', matches);
                        
                        return matches;
                    });
                
                    console.log('[Map Scratch-Pad] showCharacterPlacementModal (Player): Filtered characters:', characters.length, characters);
                } else {
                    console.error('[Map Scratch-Pad] showCharacterPlacementModal (Player): Failed to load characters:', charactersResponse);
                }
            }
            
            if (characters.length === 0) {
                console.warn('[Map Scratch-Pad] showCharacterPlacementModal: No characters found for session', this.currentSessionId);
                this.app.showError('No characters available in this session. Please assign a character to this session first.');
                this.tokenMode = null;
                return;
            }
            
            const characterOptions = characters.map(char => 
                `<option value="${char.character_id}">${this.escapeHtml(char.character_name)}</option>`
            ).join('');
            
            const modalHtml = `
                <div class="modal show" id="place-character-modal" style="display: flex;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2><i class="fas fa-user"></i> Place Character Token</h2>
                            <button type="button" class="close" id="close-character-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <form id="place-character-form">
                                <div class="form-group">
                                    <label for="character-select">Character</label>
                                    <select id="character-select" class="form-control" required>
                                        <option value="">Select a character...</option>
                                        ${characterOptions}
                                    </select>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Place Token</button>
                                    <button type="button" class="btn btn-secondary" id="cancel-character-modal">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            $('#place-character-modal').remove();
            $('body').append(modalHtml);
            
            $('#close-character-modal, #cancel-character-modal').on('click', () => {
                $('#place-character-modal').remove();
                this.tokenMode = null;
            });
            
            $('#place-character-modal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#place-character-modal').remove();
                    this.tokenMode = null;
                }
            });
            
            $('#place-character-form').on('submit', async (e) => {
                e.preventDefault();
                const characterId = parseInt($('#character-select').val());
                
                if (characterId) {
                    await this.addToken(this.currentMapId, characterId, 'portrait', x, y, null, null);
                }
                
                $('#place-character-modal').remove();
                this.tokenMode = null;
            });
            
        } catch (error) {
            console.error('Failed to load characters:', error);
            this.app.showError('Failed to load characters');
        }
    }
    
    /**
     * Add token to map
     */
    async addToken(mapId, characterId, tokenType, x, y, color, label, monsterInstanceId = null, initiativeId = null) {
        try {
            const payload = {
                map_id: mapId,
                token_type: tokenType,
                x_position: x,
                y_position: y,
                color: color || '#FF0000',
                label: label
            };
            
            if (characterId) {
                payload.character_id = characterId;
            }
            
            if (monsterInstanceId) {
                payload.monster_instance_id = monsterInstanceId;
            }
            
            if (initiativeId) {
                payload.initiative_id = initiativeId;
            }
            
            const response = await this.apiClient.post('/api/session/maps/tokens/add.php', payload);
            
            if (response.status === 'success') {
                // Update local tokens array
                const existingIndex = this.tokens.findIndex(t => t.token_id === response.data.token_id);
                if (existingIndex >= 0) {
                    this.tokens[existingIndex] = response.data;
                } else {
                    this.tokens.push(response.data);
                }
                
                this.redrawTokens();
            }
        } catch (error) {
            console.error('Failed to add token:', error);
            this.app.showError('Failed to place token: ' + error.message);
        }
    }
    
    /**
     * Update token position
     */
    async updateTokenPosition(tokenId, x, y) {
        try {
            console.log('[Map Scratch-Pad] updateTokenPosition: Moving token', {
                tokenId,
                x,
                y,
                currentTokens: this.tokens.length
            });
            
            await this.apiClient.put('/api/session/maps/tokens/move.php', {
                token_id: tokenId,
                x_position: x,
                y_position: y
            });
            
            // Update local token immediately for instant feedback
            const token = this.tokens.find(t => t.token_id === tokenId);
            if (token) {
                console.log('[Map Scratch-Pad] updateTokenPosition: Updating local token position', {
                    tokenId,
                    oldPosition: { x: token.x_position, y: token.y_position },
                    newPosition: { x, y }
                });
                token.x_position = x;
                token.y_position = y;
                // Redraw immediately for instant feedback
                this.redrawTokens();
            } else {
                console.warn('[Map Scratch-Pad] updateTokenPosition: Token not found in local array', tokenId);
            }
        } catch (error) {
            console.error('[Map Scratch-Pad] updateTokenPosition: Failed to move token:', error);
            this.app.showError('Failed to move token');
        }
    }
    
    /**
     * Delete a token from the map
     * 
     * @param {number} tokenId - Token ID to delete
     * @returns {Promise<void>}
     */
    async deleteToken(tokenId) {
        try {
            console.log('[Map Scratch-Pad] deleteToken: Deleting token', {
                tokenId,
                currentTokens: this.tokens.length
            });
            
            await this.apiClient.delete(`/api/session/maps/tokens/delete.php?token_id=${tokenId}`);
            
            // Remove from local tokens array immediately for instant feedback
            const tokenIndex = this.tokens.findIndex(t => t.token_id === tokenId);
            if (tokenIndex >= 0) {
                this.tokens.splice(tokenIndex, 1);
                this.redrawTokens();
                console.log('[Map Scratch-Pad] deleteToken: Token deleted successfully');
            } else {
                console.warn('[Map Scratch-Pad] deleteToken: Token not found in local array', tokenId);
                // Reload tokens to sync with server
                await this.loadTokens(this.currentMapId);
            }
        } catch (error) {
            console.error('[Map Scratch-Pad] deleteToken: Failed to delete token:', error);
            this.app.showError('Kunne ikke slette markør: ' + (error.message || 'Ukendt fejl'));
        }
    }
    
    /**
     * Setup toolbar event handlers
     */
    setupToolbarEvents() {
        // Remove existing event handlers to prevent duplicates
        $('#draw-tool-btn, #erase-tool-btn, #drawing-color-picker, #brush-size-slider, #place-marker-btn, #place-character-btn, #place-monster-btn, #zoom-in-btn, #zoom-out-btn, #reset-view-btn, #clear-drawings-btn, #map-selector, #upload-map-btn, #delete-map-btn, .preset-color').off();
        
        // Ensure drawingTool is set to default 'draw' if not already set
        if (!this.drawingTool) {
            this.drawingTool = 'draw';
        }
        
        // Set initial button states based on current drawingTool
        if (this.drawingTool === 'draw') {
            $('#draw-tool-btn').addClass('btn-primary').removeClass('btn-secondary');
            $('#erase-tool-btn').addClass('btn-secondary').removeClass('btn-primary');
        } else if (this.drawingTool === 'erase') {
            $('#erase-tool-btn').addClass('btn-primary').removeClass('btn-secondary');
            $('#draw-tool-btn').addClass('btn-secondary').removeClass('btn-primary');
        }
        
        // Drawing tools
        $('#draw-tool-btn').on('click', () => {
            this.drawingTool = 'draw';
            this.tokenMode = null;
            $('#draw-tool-btn').addClass('btn-primary').removeClass('btn-secondary');
            $('#erase-tool-btn').addClass('btn-secondary').removeClass('btn-primary');
            $('#place-marker-btn, #place-character-btn, #place-monster-btn').addClass('btn-secondary').removeClass('btn-primary');
            // Update pointer-events on token canvas
            if (this.tokenCanvas) {
                this.tokenCanvas.classList.remove('token-mode');
                this.tokenCanvas.classList.add('drawing-mode');
            }
        });
        
        $('#erase-tool-btn').on('click', () => {
            this.drawingTool = 'erase';
            this.tokenMode = null;
            $('#erase-tool-btn').addClass('btn-primary').removeClass('btn-secondary');
            $('#draw-tool-btn').addClass('btn-secondary').removeClass('btn-primary');
            $('#place-marker-btn, #place-character-btn').addClass('btn-secondary').removeClass('btn-primary');
            // Update pointer-events on token canvas - disable it so drawing canvas can receive events
            if (this.tokenCanvas) {
                this.tokenCanvas.style.pointerEvents = 'none';
                this.tokenCanvas.classList.remove('token-mode');
                this.tokenCanvas.classList.add('drawing-mode');
            }
        });
        
        // Color picker
        $('#drawing-color-picker').on('change', (e) => {
            this.drawingColor = e.target.value;
            // Update brush preview color if visible
            const preview = document.getElementById('brush-preview');
            if (preview && preview.classList.contains('draw-preview')) {
                preview.style.borderColor = this.drawingColor;
            }
        });
        
        // Preset colors
        $('.preset-color').on('click', (e) => {
            const color = $(e.currentTarget).data('color');
            this.drawingColor = color;
            $('#drawing-color-picker').val(color);
            // Update brush preview color if visible
            const preview = document.getElementById('brush-preview');
            if (preview && preview.classList.contains('draw-preview')) {
                preview.style.borderColor = this.drawingColor;
            }
        });
        
        // Brush size
        $('#brush-size-slider').on('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            $('#brush-size-display').text(this.brushSize + 'px');
            // Update brush preview size if visible
            const preview = document.getElementById('brush-preview');
            if (preview && preview.style.display !== 'none') {
                const size = this.brushSize * this.zoom;
                preview.style.width = size + 'px';
                preview.style.height = size + 'px';
            }
        });
        
        // Token tools
        $('#place-marker-btn').on('click', () => {
            this.tokenMode = 'marker';
            this.drawingTool = null;
            this.hideBrushPreview();
            $('#draw-tool-btn, #erase-tool-btn').addClass('btn-secondary').removeClass('btn-primary');
            // Update pointer-events on token canvas - enable it for token placement
            if (this.tokenCanvas) {
                this.tokenCanvas.style.pointerEvents = 'auto';
            }
        });
        
        $('#place-character-btn').on('click', () => {
            this.tokenMode = 'character';
            this.drawingTool = null;
            this.hideBrushPreview();
            $('#draw-tool-btn, #erase-tool-btn').addClass('btn-secondary').removeClass('btn-primary');
            $('#place-marker-btn, #place-monster-btn').addClass('btn-secondary').removeClass('btn-primary');
            $('#place-character-btn').addClass('btn-primary').removeClass('btn-secondary');
            // Update pointer-events on token canvas - enable it for token placement
            if (this.tokenCanvas) {
                this.tokenCanvas.style.pointerEvents = 'auto';
            }
        });
        
        // Monster token placement (DM only)
        $('#place-monster-btn').on('click', () => {
            this.tokenMode = 'monster';
            this.drawingTool = null;
            this.hideBrushPreview();
            $('#draw-tool-btn, #erase-tool-btn').addClass('btn-secondary').removeClass('btn-primary');
            $('#place-marker-btn, #place-character-btn').addClass('btn-secondary').removeClass('btn-primary');
            $('#place-monster-btn').addClass('btn-primary').removeClass('btn-secondary');
            // Update pointer-events on token canvas - enable it for token placement
            if (this.tokenCanvas) {
                this.tokenCanvas.style.pointerEvents = 'auto';
            }
        });
        
        // Zoom controls
        $('#zoom-in-btn').on('click', () => {
            this.zoom = Math.min(this.zoom * 1.2, 3.0);
            this.applyZoom();
        });
        
        $('#zoom-out-btn').on('click', () => {
            this.zoom = Math.max(this.zoom / 1.2, 0.3);
            this.applyZoom();
        });
        
        $('#reset-view-btn').on('click', () => {
            this.zoom = 1.0;
            this.panX = 0;
            this.panY = 0;
            this.applyZoom();
        });
        
        // Clear drawings (DM only)
        $('#clear-drawings-btn').on('click', async () => {
            if (confirm('Are you sure you want to clear all drawings on this map?')) {
                try {
                    await this.apiClient.post('/api/session/maps/drawings/clear.php', {
                        map_id: this.currentMapId
                    });
                    this.drawings = [];
                    this.redrawDrawings();
                    this.app.showSuccess('Drawings cleared');
                } catch (error) {
                    this.app.showError('Failed to clear drawings: ' + error.message);
                }
            }
        });
        
        // Map selector (DM only)
        $('#map-selector').on('change', async (e) => {
            // Double-check DM status before allowing map switch
            if (!this.isDM) {
                this.app.showError('Only the Dungeon Master can switch maps');
                // Reset selector to current map
                if (this.currentMapId) {
                    $('#map-selector').val(this.currentMapId);
                }
                return;
            }
            
            const mapId = parseInt(e.target.value);
            if (mapId && mapId !== this.currentMapId) {
                // Switch to selected map (this loads data, sets as active, and initializes canvas)
                await this.switchActiveMap(mapId);
            }
        });
        
        // Upload map (DM only) - only register if DM
        if (this.isDM) {
            $('#upload-map-btn').on('click', () => {
                if (!this.isDM) {
                    this.app.showError('Only the Dungeon Master can upload maps');
                    return;
                }
                this.showUploadMapModal();
            });
        }
        
        // Delete map (DM only)
        $('#delete-map-btn').on('click', async () => {
            if (confirm('Are you sure you want to delete this map? All drawings and tokens will be lost.')) {
                try {
                    await this.apiClient.delete(`/api/session/maps/delete.php?map_id=${this.currentMapId}`);
                    this.app.showSuccess('Map deleted');
                    await this.loadMaps(this.currentSessionId);
                    // Switch to another map or show empty state
                    if (this.maps.length > 0) {
                        await this.switchActiveMap(this.maps[0].map_id);
                    } else {
                        $('#content-area').html(await this.renderMapView(this.currentSessionId));
                    }
                } catch (error) {
                    this.app.showError('Failed to delete map: ' + error.message);
                }
            }
        });
    }
    
    /**
     * Apply zoom to canvas
     */
    applyZoom() {
        if (!this.mapCanvas || !this.drawingCanvas || !this.tokenCanvas || !this.currentMap) return;
        
        // Recalculate canvas size with current zoom
        this.setupCanvasSize();
        
        // Redraw everything with new scale
        if (this.mapImage && this.mapImage.complete) {
            this.drawMapBackground();
            this.redrawDrawings();
            this.redrawTokens();
        }
    }
    
    /**
     * Show upload map modal (DM only)
     */
    showUploadMapModal() {
        // Double-check DM status
        if (!this.isDM) {
            this.app.showError('Only the Dungeon Master can upload maps');
            return;
        }
        
        const modalHtml = `
            <div class="modal show" id="upload-map-modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-upload"></i> Upload Map</h2>
                        <button type="button" class="close" id="close-upload-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal__inner">
                        <form id="upload-map-form" enctype="multipart/form-data">
                            <div class="form-group">
                                <label for="map-name">Map Name *</label>
                                <input type="text" id="map-name" class="form-control" 
                                       required maxlength="100" placeholder="Enter map name">
                            </div>
                            <div class="form-group">
                                <label>Map Image *</label>
                                <input type="file" id="map-image" name="image" 
                                       accept="image/jpeg,image/png,image/webp" required
                                       style="display: none;">
                                <button type="button" class="btn btn-secondary" id="choose-file-btn" style="width: 100%;">
                                    <i class="fas fa-folder-open"></i> Choose file
                                </button>
                                <small class="form-help" id="file-name-display" style="display: block; margin-top: 0.5rem;">No file chosen</small>
                                <small class="form-help">JPG, PNG, or WebP format, max 10MB</small>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-upload"></i> Upload
                                </button>
                                <button type="button" class="btn btn-secondary" id="cancel-upload-modal">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        $('#upload-map-modal').remove();
        $('body').append(modalHtml);
        
        $('#close-upload-modal, #cancel-upload-modal').on('click', () => {
            $('#upload-map-modal').remove();
        });
        
        // Handle modal backdrop click (close modal)
        $('#upload-map-modal').on('click', (e) => {
            // Only close if clicking the backdrop, not the modal content or file input
            if (e.target === e.currentTarget) {
                $('#upload-map-modal').remove();
            }
        });
        
        // CRITICAL: Prevent the global modal-content handler from interfering with file input
        $('#upload-map-modal .modal-content').on('click', (e) => {
            // If clicking on file input or label, don't stop propagation
            if (e.target.type === 'file' || e.target.tagName === 'LABEL' || e.target.closest('input[type="file"]')) {
                return; // Let it bubble naturally
            }
            // For everything else, stop propagation to prevent modal from closing
            e.stopPropagation();
        });
        
        // Handle form submission
        $('#upload-map-form').on('submit', async (e) => {
            e.preventDefault();
            await this.handleMapUpload();
        });
        
        // Use button to trigger file input (more reliable than native click)
        $('#choose-file-btn').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const fileInput = document.getElementById('map-image');
            if (fileInput) {
                fileInput.click();
            }
        });
        
        // Log when file is selected
        $('#map-image').on('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('[Map Scratch-Pad] File selected:', file.name, file.size, 'bytes');
                $('#file-name-display').text('Selected: ' + file.name);
            } else {
                $('#file-name-display').text('No file chosen');
            }
        });
    }
    
    /**
     * Handle map upload
     */
    async handleMapUpload() {
        const mapName = $('#map-name').val().trim();
        const fileInput = document.getElementById('map-image');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            this.app.showError('Please select an image file');
            return;
        }
        
        const file = fileInput.files[0];
        
        // Validate file
        if (file.size > 10 * 1024 * 1024) {
            this.app.showError('File too large (max 10MB)');
            return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.app.showError('Invalid file type. Only JPG, PNG, and WebP are allowed');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('session_id', this.currentSessionId);
            formData.append('map_name', mapName);
            
            // Use XMLHttpRequest for file upload
            const xhr = new XMLHttpRequest();
            const url = this.apiClient.baseURL + '/api/session/maps/upload.php';
            
            xhr.open('POST', url);
            
            // Add auth header
            const authToken = localStorage.getItem('auth_token');
            if (authToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
            }
            
            xhr.onload = async () => {
                console.log('Upload response status:', xhr.status);
                console.log('Upload response text:', xhr.responseText);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        let responseText = xhr.responseText;
                        
                        // Handle potential encoding issues
                        if (!responseText || responseText.trim() === '') {
                            throw new Error('Empty response from server');
                        }
                        
                        const response = JSON.parse(responseText);
                        if (response.status === 'success') {
                            this.app.showSuccess('Map uploaded successfully');
                            $('#upload-map-modal').remove();
                            
                            // Reload maps and switch to new map
                            await this.loadMaps(this.currentSessionId);
                            
                            // Load the new map data
                            await this.loadMapData(response.data.map_id);
                            
                            // Update map selector
                            const mapOptions = this.maps.map(map => 
                                `<option value="${map.map_id}" ${map.is_active ? 'selected' : ''}>${this.escapeHtml(map.map_name)}</option>`
                            ).join('');
                            $('#map-selector').html(mapOptions);
                            
                            // Initialize canvas - always do this after upload
                            setTimeout(() => {
                                this.initializeCanvas();
                            }, 100);
                        } else {
                            throw new Error(response.message || 'Upload failed');
                        }
                    } catch (error) {
                        console.error('Failed to parse upload response:', error);
                        console.error('Response text was:', xhr.responseText);
                        this.app.showError('Failed to parse response: ' + error.message);
                    }
                } else {
                    let errorMsg = `HTTP ${xhr.status}`;
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.message) {
                            errorMsg = errorResponse.message;
                        }
                    } catch (e) {
                        console.error('Failed to parse error response:', e);
                        console.error('Error response text:', xhr.responseText);
                    }
                    this.app.showError('Upload failed: ' + errorMsg);
                }
            };
            
            xhr.onerror = () => {
                this.app.showError('Network error during upload');
            };
            
            xhr.onloadend = () => {
                // Log response for debugging
                if (xhr.status !== 200) {
                    console.error('Upload failed:', xhr.status, xhr.statusText);
                    console.error('Response text:', xhr.responseText);
                }
            };
            
            xhr.send(formData);
            
        } catch (error) {
            console.error('Map upload error:', error);
            this.app.showError('Failed to upload map: ' + error.message);
        }
    }
    
    /**
     * Start real-time updates
     */
    startRealtimeUpdates() {
        if (!this.currentSessionId) return;
        
        // Stop existing client if any
        if (this.realtimeClient) {
            this.realtimeClient.stop();
        }
        
        // Use RealtimeClient if available (same as dm-dashboard)
        if (window.RealtimeClient) {
            this.realtimeClient = new RealtimeClient(this.currentSessionId, this.app);
            
            // Register event handlers for map events
            // RealtimeClient processes events and triggers them by event_type
            this.realtimeClient.on('map_drawing_added', (data) => {
                console.log('[Map Scratch-Pad] Real-time event received: map_drawing_added', data);
                this.handleRealtimeEvent({
                    event_type: 'map_drawing_added',
                    event_data: data
                });
            });
            
            this.realtimeClient.on('map_drawings_cleared', (data) => {
                this.handleRealtimeEvent({
                    event_type: 'map_drawings_cleared',
                    event_data: data
                });
            });
            
            this.realtimeClient.on('map_token_added', (data) => {
                console.log('[Map Scratch-Pad] RealtimeClient map_token_added event received:', data);
                this.handleRealtimeEvent({
                    event_type: 'map_token_added',
                    event_data: data
                });
            });
            
            this.realtimeClient.on('map_token_moved', (data) => {
                console.log('[Map Scratch-Pad] RealtimeClient map_token_moved event received:', data);
                this.handleRealtimeEvent({
                    event_type: 'map_token_moved',
                    event_data: data
                });
            });
            
            this.realtimeClient.on('map_token_removed', (data) => {
                this.handleRealtimeEvent({
                    event_type: 'map_token_removed',
                    event_data: data
                });
            });
            
            this.realtimeClient.on('map_switched', (data) => {
                this.handleRealtimeEvent({
                    event_type: 'map_switched',
                    event_data: data
                });
            });
            
            this.realtimeClient.on('map_refresh', (data) => {
                this.handleRealtimeEvent({
                    event_type: 'map_refresh',
                    event_data: data
                });
            });
            
            // Start polling
            console.log('[Map Scratch-Pad] startRealtimeUpdates: Starting real-time polling');
            this.realtimeClient.start();
        } else {
            console.warn('[Map Scratch-Pad] startRealtimeUpdates: RealtimeClient not available, using manual polling');
            // Fallback: manual polling
            this.startManualPolling();
        }
    }
    
    /**
     * Manual polling for real-time events (fallback)
     */
    startManualPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(async () => {
            try {
                const response = await this.apiClient.get(`/api/realtime/poll.php?session_id=${this.currentSessionId}&last_event_id=${this.lastEventId}`);
                if (response.status === 'success' && response.data.events) {
                    response.data.events.forEach(event => {
                        console.log('[Map Scratch-Pad] Manual polling: Processing event', event.event_type);
                        this.handleRealtimeEvent(event);
                        if (event.event_id > this.lastEventId) {
                            this.lastEventId = event.event_id;
                        }
                    });
                }
            } catch (error) {
                console.error('[Map Scratch-Pad] Real-time polling error:', error);
            }
        }, 2000); // Poll every 2 seconds
    }
    
    /**
     * Stop real-time updates
     */
    stopRealtimeUpdates() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.realtimeClient) {
            this.realtimeClient.stop();
            this.realtimeClient = null;
        }
    }
    
    /**
     * Handle a single real-time event
     */
    handleRealtimeEvent(event) {
        // Parse event_data if it's a string
        let eventData = event.event_data;
        if (typeof eventData === 'string') {
            try {
                eventData = JSON.parse(eventData);
            } catch (e) {
                console.error('Failed to parse event_data:', e);
                return;
            }
        }
        
        switch (event.event_type) {
            case 'map_drawing_added':
                console.log('[Map Scratch-Pad] handleRealtimeEvent: map_drawing_added event received', {
                    eventData,
                    currentMapId: this.currentMapId,
                    eventDataMapId: eventData?.map_id
                });
                if (eventData && eventData.map_id === this.currentMapId) {
                    // Add drawing if not already present
                    const exists = this.drawings.find(d => d.drawing_id === eventData.drawing_id);
                    if (!exists) {
                        console.log('[Map Scratch-Pad] handleRealtimeEvent: Adding new drawing', eventData);
                        this.drawings.push({
                            drawing_id: eventData.drawing_id,
                            map_id: eventData.map_id,
                            user_id: eventData.user_id,
                            drawing_type: eventData.drawing_type,
                            color: eventData.color,
                            brush_size: eventData.brush_size,
                            path_data: eventData.path_data,
                            created_at: new Date().toISOString()
                        });
                        console.log('[Map Scratch-Pad] handleRealtimeEvent: Redrawing drawings, total:', this.drawings.length);
                        this.redrawDrawings();
                    } else {
                        console.log('[Map Scratch-Pad] handleRealtimeEvent: Drawing already exists, skipping');
                    }
                } else {
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: Map ID mismatch or no eventData', {
                        eventDataMapId: eventData?.map_id,
                        currentMapId: this.currentMapId
                    });
                }
                break;
                
            case 'map_drawings_cleared':
                if (eventData && eventData.map_id === this.currentMapId) {
                    this.drawings = [];
                    this.redrawDrawings();
                }
                break;
                
            case 'map_token_added':
                console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_added event received', {
                    eventData,
                    currentMapId: this.currentMapId,
                    eventDataMapId: eventData?.map_id,
                    eventDataTokenId: eventData?.token_id
                });
                
                if (!eventData) {
                    console.warn('[Map Scratch-Pad] handleRealtimeEvent: map_token_added - no eventData');
                    break;
                }
                
                if (!eventData.token_id) {
                    console.warn('[Map Scratch-Pad] handleRealtimeEvent: map_token_added - no token_id in eventData');
                    break;
                }
                
                // Check if this event is for the current map
                if (eventData.map_id !== this.currentMapId) {
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_added - map ID mismatch', {
                        eventMapId: eventData.map_id,
                        currentMapId: this.currentMapId
                    });
                    break;
                }
                
                // Check if token already exists (avoid duplicates)
                const existingTokenIndex = this.tokens.findIndex(t => t.token_id === eventData.token_id);
                if (existingTokenIndex >= 0) {
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_added - token already exists, updating', {
                        tokenId: eventData.token_id
                    });
                    // Update existing token with new data
                    this.tokens[existingTokenIndex] = {
                        token_id: eventData.token_id,
                        map_id: eventData.map_id,
                        character_id: eventData.character_id,
                        character_name: eventData.character_name,
                        user_id: eventData.user_id,
                        username: eventData.username,
                        token_type: eventData.token_type,
                        x_position: eventData.x_position,
                        y_position: eventData.y_position,
                        color: eventData.color,
                        label: eventData.label,
                        portrait_url: eventData.portrait_url,
                        is_visible: eventData.is_visible
                    };
                } else {
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_added - adding new token', {
                        tokenId: eventData.token_id,
                        characterName: eventData.character_name,
                        label: eventData.label
                    });
                    // Add new token to array
                    this.tokens.push({
                        token_id: eventData.token_id,
                        map_id: eventData.map_id,
                        character_id: eventData.character_id,
                        character_name: eventData.character_name,
                        user_id: eventData.user_id,
                        username: eventData.username,
                        token_type: eventData.token_type,
                        x_position: eventData.x_position,
                        y_position: eventData.y_position,
                        color: eventData.color,
                        label: eventData.label,
                        portrait_url: eventData.portrait_url,
                        is_visible: eventData.is_visible
                    });
                }
                
                this.redrawTokens();
                console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_added - tokens redrawn, total:', this.tokens.length);
                break;
                
            case 'map_token_moved':
                console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_moved event received', {
                    eventData,
                    currentMapId: this.currentMapId,
                    eventDataMapId: eventData?.map_id,
                    eventDataTokenId: eventData?.token_id,
                    tokensCount: this.tokens.length,
                    tokenIds: this.tokens.map(t => t.token_id)
                });
                
                if (!eventData) {
                    console.warn('[Map Scratch-Pad] handleRealtimeEvent: map_token_moved - no eventData');
                    break;
                }
                
                if (!eventData.token_id) {
                    console.warn('[Map Scratch-Pad] handleRealtimeEvent: map_token_moved - no token_id in eventData');
                    break;
                }
                
                // Check if this event is for the current map
                if (eventData.map_id !== this.currentMapId) {
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_moved - map ID mismatch', {
                        eventMapId: eventData.map_id,
                        currentMapId: this.currentMapId
                    });
                    break;
                }
                
                const tokenIndex = this.tokens.findIndex(t => t.token_id === eventData.token_id);
                if (tokenIndex >= 0) {
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_moved - updating existing token', {
                        tokenId: eventData.token_id,
                        oldPosition: { x: this.tokens[tokenIndex].x_position, y: this.tokens[tokenIndex].y_position },
                        newPosition: { x: eventData.x_position, y: eventData.y_position }
                    });
                    this.tokens[tokenIndex].x_position = eventData.x_position;
                    this.tokens[tokenIndex].y_position = eventData.y_position;
                    this.redrawTokens();
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_moved - tokens redrawn');
                } else {
                    // Token not found - might be a new token or token list needs refresh
                    console.log('[Map Scratch-Pad] handleRealtimeEvent: map_token_moved - token not found in local array, reloading all tokens', {
                        tokenId: eventData.token_id,
                        currentTokensCount: this.tokens.length
                    });
                    // Reload all tokens to get the new one
                    this.loadTokens(this.currentMapId).catch(error => {
                        console.error('[Map Scratch-Pad] handleRealtimeEvent: Failed to load tokens:', error);
                    });
                }
                break;
                
            case 'map_token_removed':
                if (eventData && eventData.map_id === this.currentMapId && eventData.token_id) {
                    this.tokens = this.tokens.filter(t => t.token_id !== eventData.token_id);
                    this.redrawTokens();
                }
                break;
                
            case 'map_switched':
            case 'map_refresh':
                if (eventData && eventData.session_id === this.currentSessionId) {
                    // Reload maps and switch to active map (simpler - just refresh)
                    this.refreshActiveMap().catch(error => {
                        console.error('[Map Scratch-Pad] handleRealtimeEvent: Failed to refresh active map:', error);
                    });
                }
                break;
                
            default:
                console.log('[Map Scratch-Pad] handleRealtimeEvent: Unknown event type:', event.event_type);
                break;
        }
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Cleanup when leaving view
     */
    /**
     * Setup resize observer for map container
     */
    setupResizeObserver() {
        // Clean up existing observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        const container = document.getElementById('map-container');
        if (!container) return;
        
        // Create resize observer to update canvas size when container resizes
        this.resizeObserver = new ResizeObserver(() => {
            if (this.currentMap && this.mapImage && this.mapImage.complete) {
                // Debounce resize updates
                clearTimeout(this.resizeTimeout);
                this.resizeTimeout = setTimeout(() => {
                    this.setupCanvasSize();
                    this.drawMapBackground();
                    this.redrawDrawings();
                    this.redrawTokens();
                }, 100);
            }
        });
        
        this.resizeObserver.observe(container);
    }
    
    cleanup() {
        this.stopRealtimeUpdates();
        
        // Disconnect resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }
        
        // Reset event setup flag
        this.eventsSetup = false;
        
        // Reset canvas initialization retry counter
        this.canvasInitRetryCount = 0;
        
        // Clear state
        this.currentSessionId = null;
        this.currentMapId = null;
        this.currentMap = null;
        this.drawings = [];
        this.tokens = [];
        
        // Clear canvas references
        this.mapCanvas = null;
        this.drawingCanvas = null;
        this.tokenCanvas = null;
        this.mapCtx = null;
        this.drawingCtx = null;
        this.tokenCtx = null;
        this.mapImage = null;
        
        // Reset drawing state
        this.isDrawing = false;
        this.currentPath = [];
        this.drawingTool = 'draw';
        this.tokenMode = null;
        this.isDragging = false;
        
        // Reset zoom and scale
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.mapScale = 1.0;
    }
    
    /**
     * Initialize module
     */
    init() {
        console.log('Session Map Scratch-Pad Module initialized');
    }
}

// Export to window for use in app.js
if (typeof window !== 'undefined') {
    window.SessionMapScratchpadModule = SessionMapScratchpadModule;
}
