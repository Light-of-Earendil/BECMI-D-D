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
        
        console.log('Hex Map Play Module initialized');
    }
    
    /**
     * Render the hex map play view
     * 
     * @param {number} mapId - Map ID to load
     * @returns {Promise<string>} HTML for play view
     */
    async renderPlayView(mapId) {
        try {
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
     * Render sidebar
     */
    renderSidebar() {
        return `
            <div class="sidebar-section">
                <h3>Map Info</h3>
                <p><strong>${this.currentMap.map_name}</strong></p>
                ${this.currentMap.map_description ? `<p>${this.currentMap.map_description}</p>` : ''}
                ${this.playerPosition ? `
                    <p><strong>Your Position:</strong> (${this.playerPosition.q}, ${this.playerPosition.r})</p>
                ` : ''}
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
        `;
    }
    
    /**
     * Load map
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
     * Load visible hexes
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
     * Setup event listeners
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
     * Initialize play canvas
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
    }
    
    /**
     * Draw play canvas with fog of war
     */
    drawPlayCanvas() {
        const canvas = document.getElementById('hex-play-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw visible hexes
        this.visibleHexes.forEach((hex, key) => {
            this.drawPlayHex(ctx, hex);
        });
        
        // Draw markers on visible hexes
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
        
        // Draw fog of war for hidden hexes (if not DM)
        if (!this.isDM && this.currentMap) {
            // Draw fog overlay for areas not visible
            // This is a simplified version - could be enhanced
        }
    }
    
    /**
     * Draw a hex in play mode
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
        
        // Determine color and opacity based on visibility
        const terrainColors = {
            'plains': '#90EE90',
            'forest': '#228B22',
            'mountain': '#808080',
            'water': '#4169E1',
            'desert': '#F4A460',
            'swamp': '#556B2F',
            'hill': '#8B7355',
            'road': '#D2B48C'
        };
        
        let fillColor = terrainColors[hex.terrain_type] || '#90EE90';
        let opacity = 1.0;
        
        if (hex.visibility_level === 0) {
            // Hidden - draw as fog
            fillColor = '#2c3e50';
            opacity = 0.3;
        } else if (hex.visibility_level === 1) {
            // Partial - dimmed
            opacity = 0.6;
        }
        
        ctx.fillStyle = fillColor;
        ctx.globalAlpha = opacity;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
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
     * Convert pixel coordinates to hex coordinates
     */
    pixelToHex(x, y) {
        const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / this.hexSize;
        const r = (2 / 3 * y) / this.hexSize;
        return this.hexRound(q, r);
    }
    
    /**
     * Round fractional hex coordinates
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
     * Convert hex coordinates to pixel coordinates
     */
    hexToPixel(q, r) {
        const x = this.hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + this.offsetX;
        const y = this.hexSize * (3 / 2 * r) + this.offsetY;
        return { x, y };
    }
    
    /**
     * Handle canvas click
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
     * Move character
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
                // Reload visible hexes
                await this.loadVisibleHexes();
                this.app.showSuccess('Moved to hex (' + q + ', ' + r + ')');
            } else {
                throw new Error(response.message || 'Failed to move');
            }
        } catch (error) {
            console.error('Failed to move character:', error);
            this.app.showError('Failed to move: ' + error.message);
        }
    }
    
    /**
     * Show reveal dialog (DM only)
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
     * Reveal hexes (DM only)
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
     * Start real-time updates
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
     * Cleanup
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
