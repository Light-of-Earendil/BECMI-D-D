/**
 * BECMI D&D Character Manager - DM Dashboard Module
 * 
 * Provides DM with comprehensive party overview for session management.
 * Shows all player characters with real-time stats, HP, equipment, and more.
 * 
 * @module DMDashboardModule
 */

class DMDashboardModule {
    /**
     * Creates a new DMDashboardModule instance
     * 
     * @constructor
     * @param {Object} app - Main application instance
     */
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentSessionId = null;
        this.dashboardData = null;
        this.autoRefreshInterval = null;
        this.refreshRate = 10000; // 10 seconds
        this.realtimeClient = null;
        
        console.log('DM Dashboard Module initialized');
    }
    
    /**
     * Load dashboard data from API
     * 
     * @param {number} sessionId - Session ID to load
     * @returns {Promise<Object>} Dashboard data
     */
    async loadDashboard(sessionId) {
        try {
            console.log(`Loading DM dashboard for session ${sessionId}...`);
            
            const response = await this.apiClient.get(
                `/api/session/get-dm-dashboard.php?session_id=${sessionId}`
            );
            
            if (response.status === 'success') {
                this.dashboardData = response.data;
                this.currentSessionId = sessionId;
                console.log(`Dashboard loaded: ${this.dashboardData.party_stats.total_characters} characters`);
                return this.dashboardData;
            } else {
                throw new Error(response.message || 'Failed to load dashboard');
            }
        } catch (error) {
            console.error('Failed to load DM dashboard:', error);
            throw error;
        }
    }
    
    /**
     * Render complete dashboard view
     * 
     * @param {number} sessionId - Session ID to display
     * @returns {Promise<string>} HTML for dashboard
     */
    async renderDashboard(sessionId) {
        try {
            const data = await this.loadDashboard(sessionId);
            
            return `<div class="dm-dashboard">
                <div class="dashboard-header">
                    <div class="header-content">
                        <h1><i class="fas fa-dice-d20"></i> ${data.session.session_title}</h1>
                        <div class="session-info">
                            <span class="session-meta">
                                <i class="fas fa-calendar"></i> 
                                ${data.session.session_datetime ? new Date(data.session.session_datetime).toLocaleString() : 'No date set'}
                            </span>
                            <span class="session-meta">
                                <i class="fas fa-users"></i> 
                                ${data.party_stats.total_characters} Characters
                            </span>
                            <span class="session-meta">
                                <i class="fas fa-shield-alt"></i> 
                                Avg Level ${data.party_stats.average_level || 1}
                            </span>
                            <span class="session-meta" id="online-users-badge">
                                <i class="fas fa-circle text-success"></i> 
                                <span id="online-count">1</span> Online
                            </span>
                            <span class="session-meta realtime-badge" id="realtime-status">
                                <i class="fas fa-wifi"></i> Live
                            </span>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-success" id="award-xp-btn" data-session-id="${data.session.session_id}">
                            <i class="fas fa-star"></i> Award XP
                        </button>
                        <button class="btn btn-secondary" id="refresh-dashboard">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button class="btn btn-primary" id="toggle-auto-refresh">
                            <i class="fas fa-clock"></i> Auto-refresh: ON
                        </button>
                    </div>
                </div>
                
                <div class="party-overview">
                    <h2>Party Overview</h2>
                    ${this.renderPartyStats(data.party_stats)}
                </div>
                
                <div class="players-section">
                    <h2>Player Characters</h2>
                    ${data.players.length === 0 ? 
                        '<div class="empty-state"><p>No players have joined this session yet.</p></div>' :
                        data.players.map(player => this.renderPlayerSection(player)).join('')
                    }
                </div>
            </div>`;
        } catch (error) {
            console.error('Dashboard render error:', error);
            return `<div class="card error-card">
                <h2>Error Loading Dashboard</h2>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
            </div>`;
        }
    }
    
    /**
     * Render party statistics summary
     * 
     * @param {Object} stats - Party statistics
     * @returns {string} HTML for party stats
     */
    renderPartyStats(stats) {
        return `<div class="party-stats-grid">
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Total Characters</div>
                    <div class="stat-value">${stats.total_characters || 0}</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-heart"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Average HP</div>
                    <div class="stat-value">${stats.average_hp_percentage || 0}%</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-star"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Average Level</div>
                    <div class="stat-value">${stats.average_level || 1}</div>
                </div>
            </div>
            
            <div class="stat-card ${stats.characters_dead > 0 ? 'stat-warning' : ''}">
                <div class="stat-icon"><i class="fas fa-skull"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Dead/Unconscious</div>
                    <div class="stat-value">${stats.characters_dead || 0}</div>
                </div>
            </div>
            
            <div class="stat-card class-distribution">
                <div class="stat-icon"><i class="fas fa-sword"></i></div>
                <div class="stat-content">
                    <div class="stat-label">Party Composition</div>
                    <div class="stat-value class-list">
                        ${this.renderClassDistribution(stats.class_distribution)}
                    </div>
                </div>
            </div>
        </div>`;
    }
    
    /**
     * Render class distribution
     * 
     * @param {Object} distribution - Class counts
     * @returns {string} HTML for class distribution
     */
    renderClassDistribution(distribution) {
        if (!distribution || Object.keys(distribution).length === 0) {
            return '<span class="text-muted">No characters</span>';
        }
        
        return Object.entries(distribution)
            .map(([className, count]) => `<span class="class-badge">${count}x ${className}</span>`)
            .join(' ');
    }
    
    /**
     * Render player section with their characters
     * 
     * @param {Object} player - Player data
     * @returns {string} HTML for player section
     */
    renderPlayerSection(player) {
        const statusClass = player.status === 'accepted' ? 'accepted' : 
                           player.status === 'invited' ? 'invited' : 'declined';
        
        return `<div class="player-section">
            <div class="player-header">
                <div class="player-info">
                    <h3><i class="fas fa-user"></i> ${player.username}</h3>
                    <span class="player-status ${statusClass}">${player.status}</span>
                </div>
                <div class="player-meta">
                    <span>${player.character_count} character(s)</span>
                </div>
            </div>
            
            <div class="player-characters">
                ${player.characters.length === 0 ? 
                    '<p class="no-characters">No characters created yet</p>' :
                    player.characters.map(char => this.renderCharacterCard(char)).join('')
                }
            </div>
        </div>`;
    }
    
    /**
     * Render character card for DM view
     * 
     * @param {Object} character - Character data
     * @returns {string} HTML for character card
     */
    renderCharacterCard(character) {
        const hpPercent = character.hp.percentage;
        const statusClass = character.hp.is_dead ? 'dead' : 
                           hpPercent < 25 ? 'critical' : 
                           hpPercent < 75 ? 'wounded' : 'healthy';
        
        // Get class-specific colors and icons
        const classInfo = this.getClassInfo(character.class);
        
        return `<div class="dm-character-card elegant-card ${statusClass}">
            <div class="card-header">
                <div class="character-portrait-container">
                    ${character.portrait_url ? 
                        `<img src="${character.portrait_url}" alt="${character.character_name}" class="character-card-portrait">` :
                        `<div class="portrait-placeholder ${classInfo.color}">
                            <i class="${classInfo.icon}"></i>
                            <span class="level-badge">${character.level}</span>
                        </div>`
                    }
                    <div class="status-indicator ${statusClass}"></div>
                </div>
                
                <div class="character-info">
                    <h4 class="character-name">${character.character_name}</h4>
                    <div class="character-details">
                        <span class="class-badge ${classInfo.color}">
                            <i class="${classInfo.icon}"></i>
                            Level ${character.level} ${character.class}
                        </span>
                    </div>
                    ${character.hp.is_dead ? '<div class="death-indicator"><i class="fas fa-skull"></i> DEAD</div>' : ''}
                </div>
            </div>
            
            <div class="char-stats-quick">
                <div class="stat-group">
                    <div class="stat">
                        <label>HP:</label>
                        <div class="hp-display">
                            <span class="hp-value ${statusClass}">${character.hp.current}/${character.hp.max}</span>
                            <div class="hp-bar-mini">
                                <div class="hp-bar-fill ${statusClass}" style="width: ${Math.max(0, hpPercent)}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="stat">
                        <label>AC:</label>
                        <span class="value">${character.combat.armor_class}</span>
                    </div>
                    <div class="stat">
                        <label>THAC0:</label>
                        <span class="value">${character.combat.thac0_melee}</span>
                    </div>
                    <div class="stat">
                        <label>Move:</label>
                        <span class="value">${character.movement.normal}'</span>
                    </div>
                </div>
            </div>
            
            <div class="char-abilities-compact">
                <span class="ability" title="Strength">STR ${character.abilities.strength}</span>
                <span class="ability" title="Dexterity">DEX ${character.abilities.dexterity}</span>
                <span class="ability" title="Constitution">CON ${character.abilities.constitution}</span>
                <span class="ability" title="Intelligence">INT ${character.abilities.intelligence}</span>
                <span class="ability" title="Wisdom">WIS ${character.abilities.wisdom}</span>
                <span class="ability" title="Charisma">CHA ${character.abilities.charisma}</span>
            </div>
            
            <div class="char-actions">
                <button class="btn btn-sm btn-primary" data-action="view-full-character" data-character-id="${character.character_id}">
                    <i class="fas fa-eye"></i> Full Sheet
                </button>
                <button class="btn btn-sm btn-success" data-action="dm-give-item" data-character-id="${character.character_id}" data-character-name="${character.character_name}">
                    <i class="fas fa-gift"></i> Give Item
                </button>
            </div>
        </div>`;
    }
    
    /**
     * Get class-specific styling information
     */
    getClassInfo(className) {
        const classData = {
            'fighter': { color: 'fighter-color', icon: 'fas fa-sword' },
            'magic_user': { color: 'magic-user-color', icon: 'fas fa-hat-wizard' },
            'cleric': { color: 'cleric-color', icon: 'fas fa-cross' },
            'thief': { color: 'thief-color', icon: 'fas fa-mask' },
            'dwarf': { color: 'dwarf-color', icon: 'fas fa-hammer' },
            'elf': { color: 'elf-color', icon: 'fas fa-leaf' },
            'halfling': { color: 'halfling-color', icon: 'fas fa-home' }
        };
        
        return classData[className] || { color: 'default-color', icon: 'fas fa-user' };
    }
    
    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            return; // Already running
        }
        
        this.autoRefreshInterval = setInterval(async () => {
            // Only refresh if we're still on DM dashboard view
            if (this.currentSessionId && this.app.currentView === 'dm-dashboard') {
                try {
                    console.log('Auto-refreshing dashboard...');
                    await this.refreshDashboard();
                } catch (error) {
                    console.error('Auto-refresh failed:', error);
                }
            }
        }, this.refreshRate);
        
        console.log('Auto-refresh started');
        $('#toggle-auto-refresh').html('<i class="fas fa-clock"></i> Auto-refresh: ON');
    }
    
    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('Auto-refresh stopped');
            $('#toggle-auto-refresh').html('<i class="fas fa-clock"></i> Auto-refresh: OFF');
        }
    }
    
    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        if (!this.currentSessionId) {
            return;
        }
        
        try {
            // Show subtle refresh indicator
            this.showRefreshIndicator();
            
            const content = await this.renderDashboard(this.currentSessionId);
            $('#content-area').html(content);
            
            // Hide refresh indicator after a brief delay
            setTimeout(() => {
                this.hideRefreshIndicator();
            }, 500);
            
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
            this.hideRefreshIndicator();
            // Only show error popup for actual errors, not for silent refreshes
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to refresh dashboard', 'error', 2000);
            }
        }
    }
    
    /**
     * Show subtle refresh indicator
     */
    showRefreshIndicator() {
        // Remove existing indicator
        this.hideRefreshIndicator();
        
        // Add subtle refresh indicator to header
        const refreshIndicator = $(`
            <div id="refresh-indicator" class="refresh-indicator">
                <i class="fas fa-sync-alt fa-spin"></i>
                <span>Updating...</span>
            </div>
        `);
        
        $('.header-actions').append(refreshIndicator);
    }
    
    /**
     * Hide refresh indicator
     */
    hideRefreshIndicator() {
        $('#refresh-indicator').remove();
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // View DM dashboard
        $(document).on('click', '[data-action="view-dm-dashboard"]', async (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            
            try {
                const content = await this.renderDashboard(sessionId);
                $('#content-area').html(content);
                
                // Start auto-refresh by default
                this.startAutoRefresh();
                
                // Start real-time client
                this.startRealtimeClient(sessionId);
                
                // Update navigation
                $('.nav-link').removeClass('active');
                $('.nav-link[data-view="dm-dashboard"]').addClass('active');
                
            } catch (error) {
                console.error('Failed to view DM dashboard:', error);
                this.app.showError('Failed to load DM dashboard');
            }
        });
        
        // Refresh dashboard button
        $(document).on('click', '#refresh-dashboard', async (e) => {
            e.preventDefault();
            await this.refreshDashboard();
        });
        
        // Toggle auto-refresh
        $(document).on('click', '#toggle-auto-refresh', (e) => {
            e.preventDefault();
            if (this.autoRefreshInterval) {
                this.stopAutoRefresh();
            } else {
                this.startAutoRefresh();
            }
        });
        
        // View full character sheet from DM dashboard
        $(document).on('click', '[data-action="view-full-character"]', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            
            // Stop auto-refresh when viewing character
            this.stopAutoRefresh();
            
            // Update current view to prevent auto-refresh from running
            this.app.currentView = 'characters';
            
            // Navigate to character sheet
            if (this.app.modules.characterSheet) {
                await this.app.modules.characterSheet.viewCharacter(characterId);
            }
        });

        // DM Give Item button
        $(document).on('click', '[data-action="dm-give-item"]', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            const characterName = $(e.currentTarget).data('character-name');
            
            await this.showItemGiftModal(characterId, characterName);
        });
        
        // Award XP button
        $(document).on('click', '#award-xp-btn', async (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            
            await this.showAwardXPModal(sessionId);
        });
    }
    
    /**
     * Show item gift modal for DM to give items to players
     * 
     * @param {number} characterId - Character ID to give item to
     * @param {string} characterName - Character name for display
     */
    async showItemGiftModal(characterId, characterName) {
        try {
            // Load all available items
            const itemsResponse = await this.apiClient.get('/api/items/get-by-category.php');
            const items = itemsResponse.data.items;
            
            const modal = $(`
                <div class="modal fade" id="itemGiftModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-xl" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-gift"></i> Give Item to ${characterName}
                                </h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="item-gift-container">
                                    <div class="item-browser">
                                        <div class="browser-filters">
                                            <div class="filter-row">
                                                <div class="filter-group">
                                                    <label>Item Type:</label>
                                                    <select id="filter-item-type" class="form-control">
                                                        <option value="">All Types</option>
                                                        <option value="weapon">Weapons</option>
                                                        <option value="armor">Armor</option>
                                                        <option value="shield">Shields</option>
                                                        <option value="gear">Gear</option>
                                                        <option value="consumable">Consumables</option>
                                                        <option value="mount">Mounts</option>
                                                        <option value="vehicle">Vehicles</option>
                                                        <option value="ship">Ships</option>
                                                        <option value="siege_weapon">Siege Weapons</option>
                                                    </select>
                                                </div>
                                                <div class="filter-group">
                                                    <label>Category:</label>
                                                    <select id="filter-category" class="form-control">
                                                        <option value="">All Categories</option>
                                                    </select>
                                                </div>
                                                <div class="filter-group">
                                                    <label>Magical:</label>
                                                    <select id="filter-magical" class="form-control">
                                                        <option value="">All Items</option>
                                                        <option value="false">Non-Magical</option>
                                                        <option value="true">Magical Only</option>
                                                    </select>
                                                </div>
                                                <div class="filter-group">
                                                    <label>Search:</label>
                                                    <input type="text" id="search-items" class="form-control" placeholder="Search items...">
                                                </div>
                                            </div>
                                        </div>
                                        <div class="items-grid" id="items-grid">
                                            ${this.renderItemGrid(items)}
                                        </div>
                                    </div>
                                    <div class="item-details">
                                        <div id="item-details-content">
                                            <p class="text-muted">Select an item to see details</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="gift-form" id="gift-form" style="display: none;">
                                    <hr>
                                    <h6>Item Gift Details</h6>
                                    <div class="form-row">
                                        <div class="form-group col-md-6">
                                            <label>Quantity:</label>
                                            <input type="number" id="gift-quantity" class="form-control" value="1" min="1">
                                        </div>
                                        <div class="form-group col-md-6">
                                            <label>Custom Name (optional):</label>
                                            <input type="text" id="gift-custom-name" class="form-control" placeholder="e.g., 'Dragonslayer'">
                                        </div>
                                    </div>
                                    <div class="form-row">
                                        <div class="form-group col-md-6">
                                            <label>Magical Bonus Override:</label>
                                            <input type="number" id="gift-magical-bonus" class="form-control" min="0" placeholder="Override magical bonus">
                                        </div>
                                        <div class="form-group col-md-6">
                                            <label>Charges (for magical items):</label>
                                            <input type="number" id="gift-charges" class="form-control" min="0" placeholder="Number of charges">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label>Notes:</label>
                                        <textarea id="gift-notes" class="form-control" rows="2" placeholder="Special notes about this item..."></textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="give-item-btn" disabled>
                                    <i class="fas fa-gift"></i> Give Item
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            // Add modal to page
            $('body').append(modal);
            $('#itemGiftModal').modal('show');
            
            // Setup modal event handlers
            this.setupItemGiftModalHandlers(characterId, characterName, items);
            
        } catch (error) {
            console.error('Failed to show item gift modal:', error);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to load item browser', 'error');
            }
        }
    }

    /**
     * Setup event handlers for item gift modal
     * 
     * @param {number} characterId - Character ID
     * @param {string} characterName - Character name
     * @param {Object} items - All available items
     */
    setupItemGiftModalHandlers(characterId, characterName, items) {
        let selectedItem = null;
        let filteredItems = items;

        // Filter handlers
        $('#filter-item-type, #filter-category, #filter-magical').on('change', () => {
            filteredItems = this.filterItemsForGift(items);
            this.updateItemGrid(filteredItems);
        });

        $('#search-items').on('input', () => {
            filteredItems = this.filterItemsForGift(items);
            this.updateItemGrid(filteredItems);
        });

        // Item selection handler
        $(document).on('click', '.item-card', function() {
            const itemId = $(this).data('item-id');
            selectedItem = filteredItems.find(item => item.item_id == itemId);
            
            // Update selection
            $('.item-card').removeClass('selected');
            $(this).addClass('selected');
            
            // Show item details
            const detailsHtml = this.renderItemDetails(selectedItem);
            $('#item-details-content').html(detailsHtml);
            
            // Show gift form
            $('#gift-form').show();
            
            // Enable give button
            $('#give-item-btn').prop('disabled', false);
            
            // Update quantity max based on item
            $('#gift-quantity').attr('max', selectedItem.stackable ? 1000 : 1);
            
        }.bind(this));

        // Give item handler
        $('#give-item-btn').on('click', async () => {
            if (!selectedItem) return;
            
            const giftData = {
                session_id: this.currentSessionId,
                character_id: characterId,
                item_id: selectedItem.item_id,
                quantity: parseInt($('#gift-quantity').val()) || 1,
                custom_name: $('#gift-custom-name').val().trim() || null,
                is_magical: selectedItem.is_magical,
                magical_bonus: parseInt($('#gift-magical-bonus').val()) || selectedItem.magical_bonus || 0,
                notes: $('#gift-notes').val().trim() || null
            };
            
            // Add charges if specified
            const charges = $('#gift-charges').val();
            if (charges) {
                giftData.charges = parseInt(charges);
            }
            
            try {
                $('#give-item-btn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Giving...');
                
                const response = await this.apiClient.post('/api/session/dm-give-item.php', giftData);
                
                if (response.status === 'success') {
                    // Close modal
                    $('#itemGiftModal').modal('hide');
                    
                    // Show success message
                    if (this.app.modules.notifications) {
                        this.app.modules.notifications.show(response.message, 'success');
                    }
                    
                    // Refresh dashboard to show updated inventory
                    await this.refreshDashboard();
                } else {
                    throw new Error(response.message || 'Failed to give item');
                }
                
            } catch (error) {
                console.error('Failed to give item:', error);
                if (this.app.modules.notifications) {
                    this.app.modules.notifications.show('Failed to give item: ' + error.message, 'error');
                }
                $('#give-item-btn').prop('disabled', false).html('<i class="fas fa-gift"></i> Give Item');
            }
        });

        // Cleanup when modal is closed
        $('#itemGiftModal').on('hidden.bs.modal', () => {
            $('#itemGiftModal').remove();
        });
    }

    /**
     * Filter items for the gift modal
     * 
     * @param {Object} items - All items
     * @returns {Object} Filtered items
     */
    filterItemsForGift(items) {
        const itemType = $('#filter-item-type').val();
        const category = $('#filter-category').val();
        const magical = $('#filter-magical').val();
        const search = $('#search-items').val().toLowerCase();
        
        let filtered = { ...items };
        
        // Apply filters to each category
        Object.keys(filtered).forEach(categoryKey => {
            if (categoryKey === 'weapons') {
                Object.keys(filtered[categoryKey]).forEach(weaponType => {
                    filtered[categoryKey][weaponType] = filtered[categoryKey][weaponType].filter(item => {
                        return this.itemMatchesFilters(item, itemType, category, magical, search);
                    });
                });
            } else if (Array.isArray(filtered[categoryKey])) {
                filtered[categoryKey] = filtered[categoryKey].filter(item => {
                    return this.itemMatchesFilters(item, itemType, category, magical, search);
                });
            }
        });
        
        return filtered;
    }

    /**
     * Check if item matches current filters
     * 
     * @param {Object} item - Item to check
     * @param {string} itemType - Item type filter
     * @param {string} category - Category filter
     * @param {string} magical - Magical filter
     * @param {string} search - Search term
     * @returns {boolean} Whether item matches filters
     */
    itemMatchesFilters(item, itemType, category, magical, search) {
        // Item type filter
        if (itemType && item.item_type !== itemType) return false;
        
        // Category filter
        if (category && item.item_category !== category) return false;
        
        // Magical filter
        if (magical && item.is_magical.toString() !== magical) return false;
        
        // Search filter
        if (search && !item.name.toLowerCase().includes(search) && 
            !(item.description && item.description.toLowerCase().includes(search))) {
            return false;
        }
        
        return true;
    }

    /**
     * Render item grid for the gift modal
     * 
     * @param {Object} items - Items to display
     * @returns {string} HTML for item grid
     */
    renderItemGrid(items) {
        const flattened = this.flattenCategorizedItems(items);
        
        if (flattened.length === 0) {
            return '<div class="no-items"><p class="text-muted">No items match your filters</p></div>';
        }
        
        return flattened.map(item => `
            <div class="item-card" data-item-id="${item.item_id}">
                <div class="item-header">
                    <h6 class="item-name">${item.name}</h6>
                    ${item.is_magical ? '<span class="badge badge-purple">Magical</span>' : ''}
                </div>
                <div class="item-stats">
                    <div class="stat"><strong>Cost:</strong> ${this.formatCost(item.cost_gp)}</div>
                    <div class="stat"><strong>Weight:</strong> ${this.formatWeight(item.weight_cn)}</div>
                    ${item.damage_die ? `<div class="stat"><strong>Damage:</strong> ${item.damage_die}</div>` : ''}
                    ${item.ac_bonus ? `<div class="stat"><strong>AC:</strong> +${item.ac_bonus}</div>` : ''}
                    ${item.magical_bonus ? `<div class="stat"><strong>Bonus:</strong> +${item.magical_bonus}</div>` : ''}
                </div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </div>
        `).join('');
    }

    /**
     * Update item grid with new items
     * 
     * @param {Object} items - Items to display
     */
    updateItemGrid(items) {
        $('#items-grid').html(this.renderItemGrid(items));
    }

    /**
     * Render detailed item information
     * 
     * @param {Object} item - Item to display
     * @returns {string} HTML for item details
     */
    renderItemDetails(item) {
        return `
            <div class="item-details-card">
                <div class="item-header">
                    <h5>${item.name}</h5>
                    ${item.is_magical ? '<span class="badge badge-purple">Magical Item</span>' : ''}
                </div>
                <div class="item-properties">
                    <div class="property-row">
                        <span class="property-label">Type:</span>
                        <span class="property-value">${item.item_type} ${item.item_category ? '(' + item.item_category + ')' : ''}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Cost:</span>
                        <span class="property-value">${this.formatCost(item.cost_gp)}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">Weight:</span>
                        <span class="property-value">${this.formatWeight(item.weight_cn)}</span>
                    </div>
                    ${item.damage_die ? `
                    <div class="property-row">
                        <span class="property-label">Damage:</span>
                        <span class="property-value">${item.damage_die} ${item.damage_type}</span>
                    </div>
                    ` : ''}
                    ${item.ac_bonus ? `
                    <div class="property-row">
                        <span class="property-label">AC Bonus:</span>
                        <span class="property-value">+${item.ac_bonus}</span>
                    </div>
                    ` : ''}
                    ${item.magical_bonus ? `
                    <div class="property-row">
                        <span class="property-label">Magical Bonus:</span>
                        <span class="property-value">+${item.magical_bonus}</span>
                    </div>
                    ` : ''}
                    ${item.range_short ? `
                    <div class="property-row">
                        <span class="property-label">Range:</span>
                        <span class="property-value">${item.range_short}/${item.range_long} ft</span>
                    </div>
                    ` : ''}
                    ${item.hands_required ? `
                    <div class="property-row">
                        <span class="property-label">Hands Required:</span>
                        <span class="property-value">${item.hands_required}</span>
                    </div>
                    ` : ''}
                    ${item.requires_proficiency ? `
                    <div class="property-row">
                        <span class="property-label">Requires Proficiency:</span>
                        <span class="property-value">Yes</span>
                    </div>
                    ` : ''}
                </div>
                ${item.description ? `
                <div class="item-description">
                    <h6>Description:</h6>
                    <p>${item.description}</p>
                </div>
                ` : ''}
                ${item.special_properties ? `
                <div class="item-special">
                    <h6>Special Properties:</h6>
                    <pre>${JSON.stringify(item.special_properties, null, 2)}</pre>
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Flatten categorized items into a single array
     * 
     * @param {Object} categorizedItems - Items organized by category
     * @returns {Array} Flattened array of items
     */
    flattenCategorizedItems(categorizedItems) {
        const flattened = [];
        
        // Add weapons
        if (categorizedItems.weapons) {
            flattened.push(...categorizedItems.weapons.melee || []);
            flattened.push(...categorizedItems.weapons.ranged || []);
            flattened.push(...categorizedItems.weapons.ammunition || []);
        }
        
        // Add armor
        if (categorizedItems.armor) {
            flattened.push(...categorizedItems.armor.armor || []);
            flattened.push(...categorizedItems.armor.shields || []);
        }
        
        // Add gear
        if (categorizedItems.gear) {
            flattened.push(...categorizedItems.gear.containers || []);
            flattened.push(...categorizedItems.gear.light || []);
            flattened.push(...categorizedItems.gear.tools || []);
            flattened.push(...categorizedItems.gear.camping || []);
            flattened.push(...categorizedItems.gear.food || []);
            flattened.push(...categorizedItems.gear.miscellaneous || []);
            flattened.push(...categorizedItems.gear.instruments || []);
        }
        
        // Add other categories
        flattened.push(...categorizedItems.mounts || []);
        flattened.push(...categorizedItems.vehicles || []);
        flattened.push(...categorizedItems.ships || []);
        flattened.push(...categorizedItems.siege_weapons || []);
        
        return flattened;
    }

    /**
     * Format cost for display
     * 
     * @param {number} costGp - Cost in gold pieces
     * @returns {string} Formatted cost
     */
    formatCost(costGp) {
        if (costGp === 0) return 'Free';
        if (costGp < 1) return `${Math.round(costGp * 100)} cp`;
        return `${costGp} gp`;
    }

    /**
     * Format weight for display
     * 
     * @param {number} weightCn - Weight in coins
     * @returns {string} Formatted weight
     */
    formatWeight(weightCn) {
        const pounds = Math.floor(weightCn / 10);
        return `${weightCn} cn (${pounds} lbs)`;
    }

    /**
     * Show Award XP modal
     * 
     * @param {number} sessionId - Session ID
     */
    async showAwardXPModal(sessionId) {
        try {
            if (!this.currentDashboard || !this.currentDashboard.players) {
                this.app.showError('Dashboard data not loaded');
                return;
            }
            
            // Get all characters in this session
            const allCharacters = this.currentDashboard.players.flatMap(player => player.characters);
            
            if (allCharacters.length === 0) {
                this.app.showError('No characters in this session to award XP to');
                return;
            }
            
            const modal = $(`
                <div class="modal fade" id="awardXPModal" tabindex="-1" role="dialog">
                    <div class="modal-dialog modal-lg" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-star"></i> Award Experience Points
                                </h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="xp-award-form">
                                    <div class="form-group">
                                        <label>Select Characters:</label>
                                        <div class="character-checkboxes">
                                            <label class="checkbox-label select-all">
                                                <input type="checkbox" id="select-all-characters">
                                                <strong>Select All Characters</strong>
                                            </label>
                                            ${allCharacters.map(char => `
                                                <label class="checkbox-label">
                                                    <input type="checkbox" 
                                                           class="character-checkbox" 
                                                           data-character-id="${char.character_id}"
                                                           data-character-name="${char.character_name}">
                                                    ${char.character_name} (Level ${char.level} ${char.class})
                                                </label>
                                            `).join('')}
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="xp-amount">XP Amount:</label>
                                        <input type="number" 
                                               id="xp-amount" 
                                               class="form-control" 
                                               min="1" 
                                               placeholder="Enter XP to award"
                                               required>
                                        <div class="quick-xp-buttons">
                                            <button class="btn btn-sm btn-outline-secondary" data-xp="100">+100</button>
                                            <button class="btn btn-sm btn-outline-secondary" data-xp="250">+250</button>
                                            <button class="btn btn-sm btn-outline-secondary" data-xp="500">+500</button>
                                            <button class="btn btn-sm btn-outline-secondary" data-xp="1000">+1000</button>
                                            <button class="btn btn-sm btn-outline-secondary" data-xp="2500">+2500</button>
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="xp-reason">Reason:</label>
                                        <input type="text" 
                                               id="xp-reason" 
                                               class="form-control" 
                                               placeholder="e.g., Defeated dragon, Completed quest"
                                               required>
                                    </div>
                                    
                                    <div class="xp-preview" id="xp-preview" style="display: none;">
                                        <h6>Award Summary:</h6>
                                        <p id="preview-text"></p>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirm-award-xp" disabled>
                                    <i class="fas fa-check"></i> Award XP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            $('#awardXPModal').modal('show');
            
            // Setup modal handlers
            this.setupAwardXPHandlers(sessionId);
            
            // Cleanup when closed
            $('#awardXPModal').on('hidden.bs.modal', () => {
                $('#awardXPModal').remove();
            });
            
        } catch (error) {
            console.error('Failed to show award XP modal:', error);
            this.app.showError('Failed to open award XP modal');
        }
    }
    
    /**
     * Setup award XP modal handlers
     */
    setupAwardXPHandlers(sessionId) {
        const updatePreview = () => {
            const selectedCharacters = [];
            $('.character-checkbox:checked').each(function() {
                selectedCharacters.push({
                    id: $(this).data('character-id'),
                    name: $(this).data('character-name')
                });
            });
            
            const xpAmount = parseInt($('#xp-amount').val()) || 0;
            const reason = $('#xp-reason').val().trim();
            
            const canSubmit = selectedCharacters.length > 0 && xpAmount > 0 && reason.length > 0;
            $('#confirm-award-xp').prop('disabled', !canSubmit);
            
            if (selectedCharacters.length > 0 && xpAmount > 0) {
                const charNames = selectedCharacters.map(c => c.name).join(', ');
                $('#preview-text').text(`Award ${xpAmount.toLocaleString()} XP to: ${charNames}`);
                $('#xp-preview').show();
            } else {
                $('#xp-preview').hide();
            }
        };
        
        // Select all toggle
        $('#select-all-characters').on('change', function() {
            $('.character-checkbox').prop('checked', $(this).prop('checked'));
            updatePreview();
        });
        
        $('.character-checkbox').on('change', updatePreview);
        $('#xp-amount, #xp-reason').on('input', updatePreview);
        
        // Quick XP buttons
        $(document).on('click', '.quick-xp-buttons .btn', function() {
            const xp = $(this).data('xp');
            const current = parseInt($('#xp-amount').val()) || 0;
            $('#xp-amount').val(current + xp);
            updatePreview();
        });
        
        // Confirm award XP
        $('#confirm-award-xp').on('click', async () => {
            const characterIds = [];
            $('.character-checkbox:checked').each(function() {
                characterIds.push($(this).data('character-id'));
            });
            
            const xpAmount = parseInt($('#xp-amount').val());
            const reason = $('#xp-reason').val().trim();
            
            await this.awardXP(sessionId, characterIds, xpAmount, reason);
        });
    }
    
    /**
     * Award XP to characters
     */
    async awardXP(sessionId, characterIds, xpAmount, reason) {
        try {
            const response = await this.apiClient.post('/api/character/grant-xp.php', {
                session_id: sessionId,
                character_ids: characterIds,
                xp_amount: xpAmount,
                reason: reason
            });
            
            if (response.status === 'success') {
                $('#awardXPModal').modal('hide');
                
                this.app.showSuccess(`Awarded ${xpAmount.toLocaleString()} XP to ${response.data.characters_updated} character(s)`);
                
                // Show notification if any characters can level up
                if (response.data.level_up_count > 0) {
                    const charNames = response.data.ready_to_level_up.map(c => c.character_name).join(', ');
                    this.app.showSuccess(`${response.data.level_up_count} character(s) ready to level up: ${charNames}`);
                }
                
                // Refresh dashboard
                await this.refreshDashboard();
                
            } else {
                throw new Error(response.message || 'Failed to award XP');
            }
            
        } catch (error) {
            console.error('Failed to award XP:', error);
            this.app.showError('Failed to award XP: ' + error.message);
        }
    }

    /**
     * Start real-time client for session
     * 
     * @param {number} sessionId - Session ID
     */
    startRealtimeClient(sessionId) {
        // Stop existing client if any
        if (this.realtimeClient) {
            this.realtimeClient.stop();
        }
        
        // Create new realtime client
        this.realtimeClient = new RealtimeClient(sessionId, this.app);
        
        // Register event handlers
        this.realtimeClient.on('hp_change', (data) => {
            console.log('Real-time HP change:', data);
            this.handleHPChangeEvent(data);
        });
        
        this.realtimeClient.on('item_given', (data) => {
            console.log('Real-time item given:', data);
            this.handleItemGivenEvent(data);
        });
        
        this.realtimeClient.on('initiative_update', (data) => {
            console.log('Real-time initiative update:', data);
            this.refreshDashboard(); // Full refresh for initiative changes
        });
        
        this.realtimeClient.on('xp_awarded', (data) => {
            console.log('Real-time XP awarded:', data);
            this.handleXPAwardedEvent(data);
        });
        
        this.realtimeClient.on('online_users_update', (data) => {
            this.updateOnlineUsersDisplay(data.count);
        });
        
        this.realtimeClient.on('connected', () => {
            console.log('Real-time client connected');
            $('#realtime-status').html('<i class="fas fa-wifi"></i> Live').removeClass('offline');
        });
        
        this.realtimeClient.on('disconnected', () => {
            console.log('Real-time client disconnected');
            $('#realtime-status').html('<i class="fas fa-wifi-slash"></i> Offline').addClass('offline');
        });
        
        this.realtimeClient.on('connection_error', () => {
            $('#realtime-status').html('<i class="fas fa-exclamation-triangle"></i> Error').addClass('offline');
        });
        
        // Start polling
        this.realtimeClient.start();
        
        console.log('Real-time client started for session', sessionId);
    }
    
    /**
     * Handle HP change event
     */
    handleHPChangeEvent(data) {
        const characterId = data.character_id;
        const newHp = data.new_hp;
        const maxHp = data.max_hp;
        const hpPercent = Math.round((newHp / maxHp) * 100);
        
        // Find character card and update HP
        const $card = $(`.dm-character-card`).filter(function() {
            return $(this).find('[data-action="view-full-character"]').data('character-id') == characterId;
        });
        
        if ($card.length) {
            const $hpValue = $card.find('.hp-value');
            $hpValue.text(`${newHp}/${maxHp}`);
            
            // Update HP bar
            const $hpBar = $card.find('.hp-bar-fill');
            $hpBar.css('width', `${Math.max(0, hpPercent)}%`);
            
            // Update status class
            const statusClass = hpPercent < 25 ? 'critical' : hpPercent < 75 ? 'wounded' : 'healthy';
            $hpValue.attr('class', `hp-value ${statusClass}`);
            $hpBar.attr('class', `hp-bar-fill ${statusClass}`);
            
            // Pulse animation to show change
            $card.addClass('pulse-update');
            setTimeout(() => $card.removeClass('pulse-update'), 1000);
        }
    }
    
    /**
     * Handle item given event
     */
    handleItemGivenEvent(data) {
        // Show toast notification
        if (this.app.modules.notificationManager) {
            this.app.modules.notificationManager.showToast(
                `${data.item_name} given to ${data.character_name}`,
                'info'
            );
        }
    }
    
    /**
     * Handle XP awarded event
     */
    handleXPAwardedEvent(data) {
        // Show toast notification
        if (this.app.modules.notificationManager) {
            const message = `${data.xp_amount.toLocaleString()} XP awarded to ${data.character_names.length} character(s)`;
            this.app.modules.notificationManager.showToast(message, 'success');
            
            // If any ready to level up, show special notification
            if (data.ready_to_level_up && data.ready_to_level_up.length > 0) {
                this.app.modules.notificationManager.showToast(
                    `${data.ready_to_level_up.join(', ')} ready to level up!`,
                    'success',
                    8000
                );
            }
        }
        
        // Refresh dashboard to show updated XP
        setTimeout(() => this.refreshDashboard(), 2000);
    }
    
    /**
     * Update online users display
     */
    updateOnlineUsersDisplay(count) {
        $('#online-count').text(count);
    }

    /**
     * Initialize DM dashboard module
     */
    init() {
        this.setupEventHandlers();
        console.log('DM Dashboard Module ready');
    }
    
    /**
     * Cleanup when navigating away
     */
    cleanup() {
        console.log('DM Dashboard cleanup - stopping auto-refresh and realtime client');
        this.stopAutoRefresh();
        this.hideRefreshIndicator();
        
        // Stop realtime client
        if (this.realtimeClient) {
            this.realtimeClient.stop();
            this.realtimeClient = null;
        }
        
        this.currentSessionId = null;
        this.dashboardData = null;
    }
}

// Export to window for use in app.js
window.DMDashboardModule = DMDashboardModule;

