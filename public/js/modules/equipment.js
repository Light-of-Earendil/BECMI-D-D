/**
 * BECMI D&D Character Manager - Equipment Module
 * 
 * Handles the equipment page showing all BECMI weapons, armor, and gear
 */

class EquipmentModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.equipmentData = [];
        this.filteredEquipment = [];
        this.currentFilter = 'all';
        this.currentSearch = '';
        
        console.log('Equipment Module constructor - API Client:', this.apiClient);
    }

    /**
     * Initialize the equipment module
     */
    async init() {
        console.log('Equipment Module initialized');
        await this.loadEquipment();
    }

    /**
     * Load all equipment from API
     */
    async loadEquipment() {
        try {
            console.log('Loading equipment data...');
            console.log('API Client:', this.apiClient);
            
            const response = await this.apiClient.get('/api/items/list.php');
            
            if (response.status === 'success') {
                this.equipmentData = response.data.items || [];
                this.filteredEquipment = [...this.equipmentData];
                
                console.log(`Loaded ${this.equipmentData.length} equipment items`);
                this.renderEquipmentPage();
            } else {
                throw new Error(response.message || 'Failed to load equipment');
            }
        } catch (error) {
            console.error('Equipment loading error:', error);
            console.error('Failed to load equipment:', error.message);
        }
    }

    /**
     * Render the equipment page
     */
    renderEquipmentPage() {
        console.log('renderEquipmentPage called, equipmentData:', this.equipmentData);
        
        // Ensure we have equipment data
        if (!this.equipmentData || this.equipmentData.length === 0) {
            console.log('No equipment data available, showing loading message');
            return `
                <div class="equipment-page">
                    <div class="page-header">
                        <h1>BECMI Equipment</h1>
                        <p>Complete reference for all weapons, armor, and adventuring gear</p>
                    </div>
                    <div class="card">
                        <h2>Loading Equipment...</h2>
                        <p>Please wait while we load the equipment database.</p>
                    </div>
                </div>
            `;
        }

        const html = `
            <div class="equipment-page">
                <div class="page-header">
                    <h1>BECMI Equipment</h1>
                    <p>Complete reference for all weapons, armor, and adventuring gear</p>
                </div>

                <div class="equipment-controls">
                    <div class="search-container">
                        <input type="text" id="equipment-search" placeholder="Search equipment..." class="search-input">
                        <i class="fas fa-search search-icon"></i>
                    </div>
                    
                    <div class="filter-tabs">
                        <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                            All (${this.equipmentData.length})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'weapon' ? 'active' : ''}" data-filter="weapon">
                            Weapons (${this.getEquipmentCount('weapon')})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'armor' ? 'active' : ''}" data-filter="armor">
                            Armor (${this.getEquipmentCount('armor')})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'shield' ? 'active' : ''}" data-filter="shield">
                            Shields (${this.getEquipmentCount('shield')})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'mount' ? 'active' : ''}" data-filter="mount">
                            Mounts (${this.getEquipmentCount('mount')})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'vessel' ? 'active' : ''}" data-filter="vessel">
                            Vessels (${this.getEquipmentCount('vessel')})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'siege' ? 'active' : ''}" data-filter="siege">
                            Siege Weapons (${this.getEquipmentCount('siege')})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'gear' ? 'active' : ''}" data-filter="gear">
                            Gear (${this.getEquipmentCount('gear')})
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'consumable' ? 'active' : ''}" data-filter="consumable">
                            Consumables (${this.getEquipmentCount('consumable')})
                        </button>
                    </div>
                </div>

                <div class="equipment-grid" id="equipment-grid">
                    ${this.renderEquipmentGrid()}
                </div>
            </div>
        `;

        return html;
    }

    /**
     * Get equipment count by type or category
     */
    getEquipmentCount(type) {
        // For mount, vessel, and siege, check item_category
        if (type === 'mount' || type === 'vessel' || type === 'siege') {
            return this.equipmentData.filter(item => item.item_category === type).length;
        }
        // For other types, check item_type
        return this.equipmentData.filter(item => item.item_type === type).length;
    }

    /**
     * Render equipment grid
     */
    renderEquipmentGrid() {
        console.log('renderEquipmentGrid called, filteredEquipment:', this.filteredEquipment);
        
        if (this.filteredEquipment.length === 0) {
            return `
                <div class="no-results">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>No equipment found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
        }

        // Group equipment by type for better organization
        console.log('Calling groupEquipmentByType...');
        const groupedEquipment = this.groupEquipmentByType(this.filteredEquipment);
        
        let html = '';
        
        for (const [type, items] of Object.entries(groupedEquipment)) {
            html += `
                <div class="equipment-category">
                    <h2 class="category-title">${this.getCategoryTitle(type)}</h2>
                    <div class="equipment-items">
                        ${items.map(item => this.renderEquipmentItem(item)).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Group equipment by type or category
     */
    groupEquipmentByType(equipment) {
        console.log('groupEquipmentByType called with:', equipment);
        const grouped = {};
        
        equipment.forEach(item => {
            console.log('Processing item:', item);
            // Use item_category for mount, vessel, and siege, otherwise use item_type
            const groupKey = (item.item_category === 'mount' || item.item_category === 'vessel' || item.item_category === 'siege') 
                ? item.item_category 
                : item.item_type;
            
            if (!grouped[groupKey]) {
                grouped[groupKey] = [];
            }
            grouped[groupKey].push(item);
        });

        // Sort items within each category by name
        Object.keys(grouped).forEach(type => {
            console.log('Sorting items for type:', type);
            grouped[type].sort((a, b) => {
                const nameA = a.name || '';
                const nameB = b.name || '';
                console.log('Comparing:', nameA, 'vs', nameB);
                return nameA.localeCompare(nameB);
            });
        });

        return grouped;
    }

    /**
     * Get category title
     */
    getCategoryTitle(type) {
        const titles = {
            'weapon': 'Weapons',
            'armor': 'Armor',
            'shield': 'Shields',
            'mount': 'Mounts & Riding Animals',
            'vessel': 'Ships & Vessels',
            'siege': 'Siege Weapons',
            'gear': 'Adventuring Gear',
            'consumable': 'Consumables'
        };
        return titles[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    /**
     * Render individual equipment item
     */
    renderEquipmentItem(item) {
        const stats = this.getItemStats(item);
        const specialNotes = this.getSpecialNotes(item);
        // Check if image_url exists and is not null/empty
        const hasImage = item.image_url && item.image_url.trim() !== '' && item.image_url !== 'null';
        
        console.log('Rendering item:', item.name, 'hasImage:', hasImage, 'image_url:', item.image_url);
        
        return `
            <div class="equipment-item-card" data-item-type="${item.item_type}" data-item-category="${item.item_category || ''}">
                <div class="item-image-container">
                    ${hasImage ? `
                        <div class="item-image">
                            <img src="${item.image_url}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'; const icon = this.closest('.item-image-container').querySelector('.item-icon'); if (icon) icon.style.display='flex';">
                        </div>
                    ` : ''}
                    <div class="item-icon" style="display: ${hasImage ? 'none' : 'flex'};">
                        <i class="${this.getItemIcon(item)}"></i>
                    </div>
                </div>
                
                <div class="item-header">
                    <div class="item-info">
                        <h3 class="item-name">${item.name}</h3>
                        <div class="item-cost">${this.formatCost(item.cost_gp)}</div>
                    </div>
                </div>
                
                ${stats ? `<div class="item-stats">${stats}</div>` : ''}
                
                ${specialNotes ? `<div class="item-notes">${specialNotes}</div>` : ''}
                
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </div>
        `;
    }

    /**
     * Get item icon
     */
    getItemIcon(item) {
        // Check item_category first for mount, vessel, siege
        if (item.item_category === 'mount') {
            return 'fas fa-horse';
        }
        if (item.item_category === 'vessel') {
            return 'fas fa-ship';
        }
        if (item.item_category === 'siege') {
            return 'fas fa-catapult';
        }
        
        // Otherwise use item_type
        const icons = {
            'weapon': 'fas fa-dice',
            'armor': 'fas fa-shield-alt',
            'shield': 'fas fa-shield',
            'gear': 'fas fa-backpack',
            'consumable': 'fas fa-potion'
        };
        return icons[item.item_type] || 'fas fa-box';
    }

    /**
     * Get item stats
     */
    getItemStats(item) {
        let stats = [];

        // Mounts stats
        if (item.item_category === 'mount') {
            // Mounts typically don't have weight_cn or movement_rate in database
            // Stats are usually in description, but we can show cost and basic info
            if (item.weight_cn && item.weight_cn > 0) {
                stats.push(`<span class="stat"><i class="fas fa-weight-hanging"></i> ${item.weight_cn} cn</span>`);
            }
            if (item.movement_rate && item.movement_rate > 0) {
                stats.push(`<span class="stat"><i class="fas fa-running"></i> ${item.movement_rate} ft/round</span>`);
            }
        }
        // Vessels stats
        else if (item.item_category === 'vessel') {
            if (item.capacity_cn && item.capacity_cn > 0) {
                stats.push(`<span class="stat"><i class="fas fa-users"></i> Capacity: ${item.capacity_cn} cn</span>`);
            }
            if (item.movement_rate && item.movement_rate > 0) {
                stats.push(`<span class="stat"><i class="fas fa-ship"></i> ${item.movement_rate} ft/round</span>`);
            }
            if (item.ac_bonus !== null && item.ac_bonus !== 0) {
                stats.push(`<span class="stat"><i class="fas fa-shield-alt"></i> AC ${item.ac_bonus}</span>`);
            }
        }
        // Siege weapons stats
        else if (item.item_category === 'siege') {
            if (item.damage_die) {
                stats.push(`<span class="stat"><i class="fas fa-dice"></i> ${item.damage_die}</span>`);
            }
            if (item.range_short && item.range_medium && item.range_long) {
                stats.push(`<span class="stat"><i class="fas fa-crosshairs"></i> ${item.range_short}/${item.range_medium}/${item.range_long}</span>`);
            }
            if (item.ac_bonus !== null && item.ac_bonus !== 0) {
                stats.push(`<span class="stat"><i class="fas fa-shield-alt"></i> AC ${item.ac_bonus}</span>`);
            }
            if (item.weight_cn && item.weight_cn > 0) {
                stats.push(`<span class="stat"><i class="fas fa-weight-hanging"></i> ${item.weight_cn} cn</span>`);
            }
        }
        // Regular weapons
        else if (item.item_type === 'weapon') {
            if (item.damage_die) {
                stats.push(`<span class="stat"><i class="fas fa-dice"></i> ${item.damage_die}</span>`);
            }
            if (item.range_short && item.range_medium && item.range_long) {
                stats.push(`<span class="stat"><i class="fas fa-crosshairs"></i> ${item.range_short}/${item.range_medium}/${item.range_long}</span>`);
            }
            if (item.weight_cn && item.weight_cn > 0) {
                stats.push(`<span class="stat"><i class="fas fa-weight-hanging"></i> ${item.weight_cn} cn</span>`);
            }
        }
        // Armor and shields
        else if (item.item_type === 'armor' || item.item_type === 'shield') {
            if (item.ac_bonus !== null && item.ac_bonus !== undefined) {
                stats.push(`<span class="stat"><i class="fas fa-shield-alt"></i> AC ${item.ac_bonus}</span>`);
            }
            if (item.weight_cn && item.weight_cn > 0) {
                stats.push(`<span class="stat"><i class="fas fa-weight-hanging"></i> ${item.weight_cn} cn</span>`);
            }
        }
        // Gear and other items
        else {
            if (item.weight_cn && item.weight_cn > 0) {
                stats.push(`<span class="stat"><i class="fas fa-weight-hanging"></i> ${item.weight_cn} cn</span>`);
            }
            // Always show capacity for containers and carriers
            if (item.item_category === 'container' || 
                item.item_category === 'transportation' ||
                item.name.toLowerCase().includes('backpack') ||
                item.name.toLowerCase().includes('quiver') ||
                item.name.toLowerCase().includes('pouch') ||
                item.name.toLowerCase().includes('sack') ||
                item.name.toLowerCase().includes('bag') ||
                item.name.toLowerCase().includes('saddle') ||
                item.name.toLowerCase().includes('cart') ||
                item.name.toLowerCase().includes('wagon') ||
                item.name.toLowerCase().includes('waterskin') ||
                item.name.toLowerCase().includes('oil') ||
                item.name.toLowerCase().includes('holy water') ||
                item.name.toLowerCase().includes('flask') ||
                item.name.toLowerCase().includes('wine')) {
                if (item.capacity_cn !== null && item.capacity_cn !== undefined && item.capacity_cn > 0) {
                    stats.push(`<span class="stat"><i class="fas fa-box"></i> Capacity: ${item.capacity_cn} cn</span>`);
                }
            } else if (item.capacity_cn && item.capacity_cn > 0) {
                stats.push(`<span class="stat"><i class="fas fa-box"></i> Capacity: ${item.capacity_cn} cn</span>`);
            }
            // Show ammunition capacity for quivers
            if (item.name.toLowerCase().includes('quiver') && item.ammunition_capacity && item.ammunition_capacity > 0) {
                stats.push(`<span class="stat"><i class="fas fa-arrow-right"></i> Holds ${item.ammunition_capacity} arrows/bolts</span>`);
            }
        }

        // Quantity (for consumables)
        if (item.item_type === 'consumable' && item.ammunition_capacity) {
            stats.push(`<span class="stat"><i class="fas fa-boxes"></i> ${item.ammunition_capacity}</span>`);
        }

        return stats.length > 0 ? `<div class="stats-row">${stats.join('')}</div>` : '';
    }

    /**
     * Get special notes
     */
    getSpecialNotes(item) {
        let notes = [];

        if (item.special_properties) {
            notes.push(`<strong>Special:</strong> ${item.special_properties}`);
        }

        if (item.class_restrictions && item.class_restrictions !== 'any') {
            notes.push(`<strong>Class:</strong> ${item.class_restrictions}`);
        }

        if (item.magical_bonus && item.magical_bonus > 0) {
            notes.push(`<strong>Magical:</strong> +${item.magical_bonus}`);
        }

        return notes.length > 0 ? notes.join('<br>') : '';
    }

    /**
     * Format cost
     */
    formatCost(gp) {
        if (gp && gp > 0) {
            return `${gp} gp`;
        }
        return 'Free';
    }

    /**
     * Filter equipment by type or category
     */
    filterByType(type) {
        this.currentFilter = type;
        
        if (type === 'all') {
            this.filteredEquipment = [...this.equipmentData];
        } else if (type === 'mount' || type === 'vessel' || type === 'siege') {
            // Filter by item_category for these special categories
            this.filteredEquipment = this.equipmentData.filter(item => item.item_category === type);
        } else {
            // Filter by item_type for other categories
            this.filteredEquipment = this.equipmentData.filter(item => item.item_type === type);
        }
        
        this.applySearch();
        this.updateFilterTabs();
        this.updateEquipmentGrid();
    }

    /**
     * Apply search filter
     */
    applySearch() {
        if (!this.currentSearch) {
            return;
        }

        const searchTerm = this.currentSearch.toLowerCase();
        this.filteredEquipment = this.filteredEquipment.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description && item.description.toLowerCase().includes(searchTerm)) ||
            (item.special_properties && item.special_properties.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Update filter tabs
     */
    updateFilterTabs() {
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-filter="${this.currentFilter}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    /**
     * Update equipment grid
     */
    updateEquipmentGrid() {
        const grid = document.getElementById('equipment-grid');
        if (grid) {
            grid.innerHTML = this.renderEquipmentGrid();
        }
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Search functionality
        const searchInput = document.getElementById('equipment-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.filterByType(this.currentFilter);
            });
        }

        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.filterByType(filter);
            });
        });
    }

    /**
     * Render equipment page (called by app.js)
     */
    async render() {
        console.log('Rendering equipment page');
        
        try {
            // Load equipment data if not already loaded
            if (!this.equipmentData || this.equipmentData.length === 0) {
                await this.loadEquipment();
            }
            
            const content = this.renderEquipmentPage();
            
            // Setup event handlers after DOM is updated
            setTimeout(() => {
                this.setupEventHandlers();
            }, 100);
            
            return content;
        } catch (error) {
            console.error('Error rendering equipment page:', error);
            return `
                <div class="card">
                    <h2>Error</h2>
                    <p>Failed to load equipment page: ${error.message}</p>
                </div>
            `;
        }
    }


    /**
     * Cleanup when leaving equipment page
     */
    cleanup() {
        console.log('Equipment Module cleanup');
        // Clean up any event listeners or timers if needed
    }
}

// Export for use in main app
window.EquipmentModule = EquipmentModule;
