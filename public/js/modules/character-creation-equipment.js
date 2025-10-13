/**
 * BECMI D&D Character Manager - Equipment Shopping Cart
 * 
 * Handles equipment selection, shopping cart management, and encumbrance calculation
 * during character creation.
 * 
 * @module CharacterCreationEquipment
 * @requires BECMIConstants
 * 
 * @fileoverview
 * This module provides a complete equipment shopping system for new characters.
 * Features include:
 * - Equipment browsing by category
 * - Shopping cart management
 * - Automatic encumbrance calculation
 * - Gold tracking and validation
 * - Equipment weight and cost tracking
 * 
 * @author AI Development Assistant
 * @version 1.0.0
 */

class CharacterCreationEquipment {
    /**
     * Creates a new CharacterCreationEquipment instance
     * 
     * @constructor
     * @param {number} startingGold - Initial gold available for purchases
     */
    constructor(startingGold = 0) {
        /**
         * Shopping cart: array of items with quantities
         * @type {Array<{item: Object, quantity: number}>}
         */
        this.cart = [];
        
        /**
         * Starting gold amount
         * @type {number}
         */
        this.startingGold = startingGold;
        
        /**
         * Available items from database
         * @type {Array<Object>}
         */
        this.availableItems = [];
        
        /**
         * Promise for loading items from database
         * @type {Promise}
         */
        this.itemsLoadedPromise = this.loadItemsFromDatabase();
        
        console.log(`Equipment shopping cart initialized with ${startingGold} gp`);
    }
    
    /**
     * Load all available items from database using categorized endpoint
     * 
     * @returns {Promise<Array<Object>>} Promise resolving to items array
     */
    async loadItemsFromDatabase() {
        try {
            const response = await fetch('/api/items/get-by-category.php');
            const data = await response.json();
            
            if (data.status === 'success') {
                // Flatten categorized items into a single array for backward compatibility
                this.categorizedItems = data.data.items;
                this.availableItems = this.flattenCategorizedItems(data.data.items);
                console.log(`Loaded ${this.availableItems.length} items from database (${data.data.total_items} total)`);
                return this.availableItems;
            } else {
                console.error('Failed to load items:', data.message);
                this.availableItems = [];
                this.categorizedItems = {};
                return [];
            }
        } catch (error) {
            console.error('Error loading items from database:', error);
            this.availableItems = [];
            this.categorizedItems = {};
            return [];
        }
    }

    /**
     * Flatten categorized items into a single array
     * 
     * @param {Object} categorizedItems - Items organized by category
     * @returns {Array<Object>} Flattened array of all items
     * @private
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
        
        // Add mounts, vehicles, ships, siege weapons
        flattened.push(...categorizedItems.mounts || []);
        flattened.push(...categorizedItems.vehicles || []);
        flattened.push(...categorizedItems.ships || []);
        flattened.push(...categorizedItems.siege_weapons || []);
        
        return flattened;
    }

    /**
     * Get all available equipment items
     * Now loads from database instead of hardcoded data
     * 
     * @returns {Array<Object>} Array of equipment items
     * 
     * @example
     * const items = equipment.getAvailableEquipment();
     * // Returns: [{ item_id: 1, name: 'Dagger', cost_gp: 3, ... }, ...]
     */
    getAvailableEquipment() {
        // Return cached items from database
        return this.availableItems;
    }

    /**
     * Get equipment items by category
     * 
     * @param {string} category - Category to filter by (weapon, armor, gear, container, ammunition)
     * @returns {Array<Object>} Filtered equipment items
     */
    getEquipmentByCategory(category) {
        return this.getAvailableEquipment().filter(item => item.category === category);
    }

    /**
     * Get categorized equipment items
     * 
     * @returns {Object} Equipment organized by category
     */
    getCategorizedEquipment() {
        return this.categorizedItems || {};
    }

    /**
     * Filter equipment by multiple criteria
     * 
     * @param {Object} filters - Filter criteria
     * @param {string} filters.itemType - Item type filter
     * @param {string} filters.category - Item category filter
     * @param {boolean} filters.magical - Show only magical items
     * @param {string} filters.size - Size category filter
     * @param {string} filters.search - Search term for name/description
     * @returns {Array<Object>} Filtered equipment items
     */
    filterEquipment(filters = {}) {
        let filtered = [...this.availableItems];

        // Filter by item type
        if (filters.itemType) {
            filtered = filtered.filter(item => item.item_type === filters.itemType);
        }

        // Filter by category
        if (filters.category) {
            filtered = filtered.filter(item => item.item_category === filters.category);
        }

        // Filter by magical status
        if (filters.magical !== undefined) {
            filtered = filtered.filter(item => item.is_magical === filters.magical);
        }

        // Filter by size
        if (filters.size) {
            filtered = filtered.filter(item => item.size_category === filters.size);
        }

        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                (item.description && item.description.toLowerCase().includes(searchTerm))
            );
        }

        return filtered;
    }

    /**
     * Sort equipment items
     * 
     * @param {Array<Object>} items - Items to sort
     * @param {string} sortBy - Sort criteria ('name', 'cost', 'magical_bonus')
     * @returns {Array<Object>} Sorted items
     */
    sortEquipment(items, sortBy = 'cost') {
        const sorted = [...items];
        
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'magical_bonus':
                sorted.sort((a, b) => (b.magical_bonus || 0) - (a.magical_bonus || 0));
                break;
            case 'cost':
            default:
                sorted.sort((a, b) => a.cost_gp - b.cost_gp);
                break;
        }
        
        return sorted;
    }

    /**
     * Add item to shopping cart
     * 
     * @param {Object} item - Equipment item to add
     * @param {number} quantity - Quantity to add (default: 1)
     * @returns {Object} Result with success status and message
     * 
     * @example
     * equipment.addToCart(swordItem, 1);
     * // Returns: { success: true, message: "Added Sword to cart" }
     */
    addToCart(item, quantity = 1) {
        // Check if we can afford it
        const totalCost = this.getTotalCost() + (item.cost_gp * quantity);
        if (totalCost > this.startingGold) {
            return {
                success: false,
                message: `Insufficient gold. Need ${totalCost} gp, have ${this.startingGold} gp.`
            };
        }

        // Check if item already in cart
        const existingItem = this.cart.find(cartItem => cartItem.item.item_id === item.item_id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({ item: item, quantity: quantity });
        }

        console.log(`Added ${quantity}x ${item.name} to cart`);
        
        return {
            success: true,
            message: `Added ${quantity}x ${item.name} to cart`
        };
    }

    /**
     * Remove item from shopping cart
     * 
     * @param {number} itemId - Item ID to remove
     * @param {number} quantity - Quantity to remove (default: 1, or 0 for all)
     * @returns {Object} Result with success status
     */
    removeFromCart(itemId, quantity = 1) {
        const cartItem = this.cart.find(ci => ci.item.item_id === itemId);
        
        if (!cartItem) {
            return { success: false, message: 'Item not in cart' };
        }

        if (quantity === 0 || quantity >= cartItem.quantity) {
            // Remove completely
            this.cart = this.cart.filter(ci => ci.item.item_id !== itemId);
            console.log(`Removed ${cartItem.item.name} from cart`);
        } else {
            // Reduce quantity
            cartItem.quantity -= quantity;
            console.log(`Reduced ${cartItem.item.name} quantity by ${quantity}`);
        }

        return { success: true };
    }

    /**
     * Clear entire shopping cart
     */
    clearCart() {
        this.cart = [];
        console.log('Shopping cart cleared');
    }

    /**
     * Get total cost of items in cart
     * 
     * @returns {number} Total cost in gold pieces
     */
    getTotalCost() {
        return this.cart.reduce((total, cartItem) => {
            return total + (cartItem.item.cost_gp * cartItem.quantity);
        }, 0);
    }

    /**
     * Get total weight of items in cart (in coins weight)
     * BECMI uses "coins" (cn) as weight unit: 10 coins = 1 pound
     * 
     * @returns {number} Total weight in coins
     */
    getTotalWeight() {
        return this.cart.reduce((total, cartItem) => {
            return total + (cartItem.item.weight_cn * cartItem.quantity);
        }, 0);
    }

    /**
     * Get remaining gold after purchases
     * 
     * @returns {number} Remaining gold pieces
     */
    getRemainingGold() {
        return this.startingGold - this.getTotalCost();
    }

    /**
     * Calculate encumbrance level based on total weight
     * 
     * @param {number} strength - Character's strength score
     * @returns {Object} Encumbrance data with level and movement rate
     * 
     * @example
     * equipment.calculateEncumbrance(15);
     * // Returns: { 
     * //   level: 'normal', 
     * //   maxWeight: 1500, 
     * //   currentWeight: 450, 
     * //   movementRate: 120,
     * //   description: 'Normal encumbrance'
     * // }
     */
    calculateEncumbrance(strength) {
        const weight = this.getTotalWeight();
        
        /**
         * BECMI Encumbrance Rules (Chapter 6):
         * Fixed encumbrance levels, not adjusted by strength
         * 
         * Encumbrance Levels:
         * - Unencumbered (0-400 cn): 120' normal, 40' encounter
         * - Light (401-800 cn): 90' normal, 30' encounter
         * - Heavy (801-1,200 cn): 60' normal, 20' encounter
         * - Severe (1,201-1,600 cn): 30' normal, 10' encounter
         * - Overloaded (1,601-2,400 cn): 15' normal, 5' encounter
         * - Immobile (2,401+ cn): 0' movement
         */

        let level, normalSpeed, encounterSpeed, description, warningLevel, limit;
        
        if (weight <= 400) {
            level = 'unencumbered';
            normalSpeed = 120;
            encounterSpeed = 40;
            description = 'Unencumbered';
            warningLevel = 'success';
            limit = 400;
        } else if (weight <= 800) {
            level = 'lightly_encumbered';
            normalSpeed = 90;
            encounterSpeed = 30;
            description = 'Lightly encumbered';
            warningLevel = 'info';
            limit = 800;
        } else if (weight <= 1200) {
            level = 'heavily_encumbered';
            normalSpeed = 60;
            encounterSpeed = 20;
            description = 'Heavily encumbered';
            warningLevel = 'warning';
            limit = 1200;
        } else if (weight <= 1600) {
            level = 'severely_encumbered';
            normalSpeed = 30;
            encounterSpeed = 10;
            description = 'Severely encumbered';
            warningLevel = 'danger';
            limit = 1600;
        } else if (weight <= 2400) {
            level = 'overloaded';
            normalSpeed = 15;
            encounterSpeed = 5;
            description = 'Overloaded!';
            warningLevel = 'danger';
            limit = 2400;
        } else {
            level = 'immobile';
            normalSpeed = 0;
            encounterSpeed = 0;
            description = 'Immobile!';
            warningLevel = 'danger';
            limit = 2400;
        }

        return {
            level: level,
            maxWeight: limit,
            currentWeight: weight,
            normalSpeed: normalSpeed,
            encounterSpeed: encounterSpeed,
            movementRate: normalSpeed, // For backward compatibility
            description: description,
            warningLevel: warningLevel,
            weightPercentage: Math.round((weight / limit) * 100)
        };
    }

    /**
     * Get encumbrance warning message with styling
     * 
     * @param {number} strength - Character's strength score
     * @returns {Object} Warning data with message and styling
     */
    getEncumbranceWarning(strength) {
        const encumbrance = this.calculateEncumbrance(strength);
        
        let warningClass = 'alert-success';
        let icon = 'fa-check-circle';
        
        switch (encumbrance.warningLevel) {
            case 'info':
                warningClass = 'alert-info';
                icon = 'fa-info-circle';
                break;
            case 'warning':
                warningClass = 'alert-warning';
                icon = 'fa-exclamation-triangle';
                break;
            case 'danger':
                warningClass = 'alert-danger';
                icon = 'fa-exclamation-circle';
                break;
        }
        
        return {
            message: `${encumbrance.description} (${encumbrance.currentWeight}/${encumbrance.maxWeight} cn)`,
            warningClass: warningClass,
            icon: icon,
            movementRate: encumbrance.movementRate,
            weightPercentage: encumbrance.weightPercentage
        };
    }

    /**
     * Get strength modifier for encumbrance
     * 
     * @param {number} strength - Strength score
     * @returns {number} Encumbrance modifier
     * @private
     */
    getStrengthEncumbranceModifier(strength) {
        if (strength <= 3) return -3;
        if (strength <= 5) return -2;
        if (strength <= 8) return -1;
        if (strength <= 12) return 0;
        if (strength <= 15) return 1;
        if (strength <= 17) return 2;
        return 3; // 18
    }

    /**
     * Get shopping cart as array for API submission
     * 
     * @returns {Array<{item_id: number, quantity: number}>}
     */
    getCartForAPI() {
        return this.cart.map(cartItem => ({
            item_id: cartItem.item.item_id,
            quantity: cartItem.quantity
        }));
    }

    /**
     * Format weight in user-friendly format
     * 
     * @param {number} weightCn - Weight in coins
     * @returns {string} Formatted weight string
     * 
     * @example
     * formatWeight(450); // Returns "450 cn (45 lbs)"
     */
    formatWeight(weightCn) {
        const pounds = Math.floor(weightCn / 10);
        return `${weightCn} cn (${pounds} lbs)`;
    }

    /**
     * Format cost in user-friendly format
     * 
     * @param {number} costGp - Cost in gold pieces
     * @returns {string} Formatted cost string
     */
    formatCost(costGp) {
        if (costGp === 0) return 'Free';
        if (costGp < 1) return `${Math.round(costGp * 100)} cp`;
        return `${costGp} gp`;
    }

    /**
     * Get item display properties for UI
     * 
     * @param {Object} item - Equipment item
     * @returns {Object} Display properties
     */
    getItemDisplayProperties(item) {
        const props = {
            name: item.name,
            description: item.description || '',
            cost: this.formatCost(item.cost_gp),
            weight: this.formatWeight(item.weight_cn),
            isMagical: item.is_magical,
            magicalBonus: item.magical_bonus || 0,
            requiresProficiency: item.requires_proficiency
        };

        // Add weapon-specific properties
        if (item.item_type === 'weapon') {
            props.damage = item.damage_die || '';
            props.damageType = item.damage_type || '';
            props.weaponType = item.weapon_type || '';
            props.range = item.range_short ? `${item.range_short}/${item.range_long}` : '';
            props.handsRequired = item.hands_required || 1;
            props.canBeThrown = item.can_be_thrown || false;
        }

        // Add armor-specific properties
        if (item.item_type === 'armor' || item.item_type === 'shield') {
            props.acBonus = item.ac_bonus || 0;
            props.armorType = item.armor_type || '';
        }

        // Add special properties
        if (item.special_properties) {
            props.specialProperties = item.special_properties;
        }

        return props;
    }

    /**
     * Get starting equipment packages for different classes
     * 
     * @returns {Object} Starting equipment packages
     */
    getStartingPackages() {
        return {
            fighter: {
                name: 'Fighter Package',
                description: 'Basic fighter equipment',
                items: [
                    { name: 'Normal Sword', quantity: 1 },
                    { name: 'Shield', quantity: 1 },
                    { name: 'Chain Mail', quantity: 1 },
                    { name: 'Backpack', quantity: 1 },
                    { name: 'Rations, Standard (1 week)', quantity: 1 }
                ]
            },
            cleric: {
                name: 'Cleric Package',
                description: 'Basic cleric equipment',
                items: [
                    { name: 'Mace', quantity: 1 },
                    { name: 'Shield', quantity: 1 },
                    { name: 'Leather Armor', quantity: 1 },
                    { name: 'Holy Symbol (wooden)', quantity: 1 },
                    { name: 'Backpack', quantity: 1 },
                    { name: 'Rations, Standard (1 week)', quantity: 1 }
                ]
            },
            thief: {
                name: 'Thief Package',
                description: 'Basic thief equipment',
                items: [
                    { name: 'Dagger', quantity: 2 },
                    { name: 'Short Sword', quantity: 1 },
                    { name: 'Leather Armor', quantity: 1 },
                    { name: 'Backpack', quantity: 1 },
                    { name: 'Rope (50 ft)', quantity: 1 },
                    { name: 'Rations, Standard (1 week)', quantity: 1 }
                ]
            },
            magic_user: {
                name: 'Magic-User Package',
                description: 'Basic magic-user equipment',
                items: [
                    { name: 'Dagger', quantity: 1 },
                    { name: 'Staff', quantity: 1 },
                    { name: 'Backpack', quantity: 1 },
                    { name: 'Pouch, Belt', quantity: 1 },
                    { name: 'Rations, Standard (1 week)', quantity: 1 }
                ]
            }
        };
    }

    /**
     * Apply a starting equipment package to the cart
     * 
     * @param {string} packageName - Name of the package to apply
     * @returns {Object} Result with success status and message
     */
    applyStartingPackage(packageName) {
        const packages = this.getStartingPackages();
        const packageData = packages[packageName];
        
        if (!packageData) {
            return { success: false, message: 'Package not found' };
        }

        // Clear existing cart
        this.clearCart();
        
        let totalCost = 0;
        const addedItems = [];
        
        for (const packageItem of packageData.items) {
            const item = this.availableItems.find(i => i.name === packageItem.name);
            if (item) {
                const result = this.addToCart(item, packageItem.quantity);
                if (result.success) {
                    totalCost += item.cost_gp * packageItem.quantity;
                    addedItems.push(`${packageItem.quantity}x ${item.name}`);
                }
            }
        }
        
        return {
            success: true,
            message: `Applied ${packageData.name}: ${addedItems.join(', ')} (${this.formatCost(totalCost)})`
        };
    }
}

// Export to window for use in character creation
window.CharacterCreationEquipment = CharacterCreationEquipment;

