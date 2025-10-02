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
     * Load all available items from database
     * 
     * @returns {Promise<Array<Object>>} Promise resolving to items array
     */
    async loadItemsFromDatabase() {
        try {
            const response = await fetch('api/items/list.php');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.availableItems = data.data.items;
                console.log(`Loaded ${this.availableItems.length} items from database`);
                return this.availableItems;
            } else {
                console.error('Failed to load items:', data.message);
                this.availableItems = [];
                return [];
            }
        } catch (error) {
            console.error('Error loading items from database:', error);
            this.availableItems = [];
            return [];
        }
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
         * BECMI Encumbrance Rules:
         * - Base carrying capacity: 1600 coins (160 lbs) for STR 9-12
         * - Adjusted by strength modifier
         * 
         * Encumbrance Levels:
         * - Light (0-400 cn): Movement 120 ft
         * - Normal (401-800 cn): Movement 90 ft
         * - Heavy (801-1600 cn): Movement 60 ft
         * - Overloaded (1601+ cn): Movement 30 ft
         */
        
        const baseCapacity = 1600;
        const strModifier = this.getStrengthEncumbranceModifier(strength);
        const maxWeight = baseCapacity + (strModifier * 200);

        let level, movementRate, description;
        
        if (weight <= 400) {
            level = 'light';
            movementRate = 120;
            description = 'Light encumbrance';
        } else if (weight <= 800) {
            level = 'normal';
            movementRate = 90;
            description = 'Normal encumbrance';
        } else if (weight <= maxWeight) {
            level = 'heavy';
            movementRate = 60;
            description = 'Heavy encumbrance';
        } else {
            level = 'overloaded';
            movementRate = 30;
            description = 'Overloaded! Reduce weight.';
        }

        return {
            level: level,
            maxWeight: maxWeight,
            currentWeight: weight,
            movementRate: movementRate,
            description: description
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
}

// Export to window for use in character creation
window.CharacterCreationEquipment = CharacterCreationEquipment;

