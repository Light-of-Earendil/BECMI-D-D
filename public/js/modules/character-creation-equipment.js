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
        const endpoints = [
            '/api/items/get-by-category.php',
            '/api/items/list.php'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (data.status !== 'success') {
                    throw new Error(data.message || 'Unknown item loading error');
                }

                if (endpoint.endsWith('get-by-category.php')) {
                    this.categorizedItems = data.data.items || {};
                    this.availableItems = this.prepareCharacterCreationItems(
                        this.flattenCategorizedItems(this.categorizedItems)
                    );
                    console.log(`Loaded ${this.availableItems.length} starter items from categorized endpoint`);
                    return this.availableItems;
                }

                const flatItems = (data.data && Array.isArray(data.data.items)) ? data.data.items : [];
                this.categorizedItems = {};
                this.availableItems = this.prepareCharacterCreationItems(flatItems);
                console.log(`Loaded ${this.availableItems.length} starter items from fallback items endpoint`);
                return this.availableItems;
            } catch (error) {
                console.warn(`Failed to load items from ${endpoint}:`, error);
            }
        }

        console.error('Error loading items from database: all item endpoints failed, using verified fallback catalog');
        this.categorizedItems = {};
        this.availableItems = this.prepareCharacterCreationItems(this.getVerifiedFallbackItems());
        console.warn(`Loaded ${this.availableItems.length} fallback starter items`);
        return this.availableItems;
    }

    /**
     * Minimal fallback catalog based on verified defaults in database/schema.sql.
     * This keeps character creation usable if the item API is temporarily unavailable.
     *
     * @returns {Array<Object>}
     */
    getVerifiedFallbackItems() {
        return [
            { item_id: 10001, name: 'Dagger', description: 'A small, sharp blade', weight_cn: 10, cost_gp: 3, item_type: 'weapon', item_category: 'dagger', weapon_type: 'melee', damage_die: '1d4', damage_type: 'piercing', requires_proficiency: true, is_magical: false, stackable: false },
            { item_id: 10002, name: 'Short Sword', description: 'A light, one-handed sword', weight_cn: 30, cost_gp: 10, item_type: 'weapon', item_category: 'sword', weapon_type: 'melee', damage_die: '1d6', damage_type: 'slashing', requires_proficiency: true, is_magical: false, stackable: false },
            { item_id: 10003, name: 'Normal Sword', description: 'Standard one-handed sword', weight_cn: 60, cost_gp: 10, item_type: 'weapon', item_category: 'sword', weapon_type: 'melee', damage_die: '1d8', damage_type: 'slashing', requires_proficiency: true, is_magical: false, stackable: false, hands_required: 1 },
            { item_id: 10017, name: 'Bastard Sword', description: 'Versatile sword; use one-handed or two-handed. Cannot use a shield while wielded two-handed.', weight_cn: 60, cost_gp: 10, item_type: 'weapon', item_category: 'sword', weapon_type: 'melee', damage_die: '1d6+1', alternate_damage_die: '1d8+1', display_damage: '1d6+1 / 1d8+1', hands_required: 1, can_use_two_handed: true, legacy_aliases: ['Bastard Sword (One-Handed)', 'Bastard Sword (Two-Handed)'], requires_proficiency: true, is_magical: false, stackable: false },
            { item_id: 10004, name: 'Battle Axe', description: 'A heavy axe for combat', weight_cn: 50, cost_gp: 7, item_type: 'weapon', item_category: 'axe', weapon_type: 'melee', damage_die: '1d8', damage_type: 'slashing', requires_proficiency: true, is_magical: false, stackable: false },
            { item_id: 10005, name: 'Mace', description: 'A blunt weapon', weight_cn: 30, cost_gp: 5, item_type: 'weapon', item_category: 'bludgeon', weapon_type: 'melee', damage_die: '1d6', damage_type: 'bludgeoning', requires_proficiency: true, is_magical: false, stackable: false },
            { item_id: 10006, name: 'Spear', description: 'A long thrusting weapon', weight_cn: 30, cost_gp: 1, item_type: 'weapon', item_category: 'pole', weapon_type: 'melee', damage_die: '1d6', damage_type: 'piercing', requires_proficiency: true, is_magical: false, stackable: false },
            { item_id: 10007, name: 'Short Bow', description: 'A light bow for ranged combat', weight_cn: 20, cost_gp: 25, item_type: 'weapon', item_category: 'bow', weapon_type: 'ranged', damage_die: '1d6', damage_type: 'piercing', requires_proficiency: true, is_magical: false, stackable: false, range_short: 50, range_long: 150 },
            { item_id: 10008, name: 'Crossbow', description: 'A mechanical bow', weight_cn: 50, cost_gp: 30, item_type: 'weapon', item_category: 'crossbow', weapon_type: 'ranged', damage_die: '1d6', damage_type: 'piercing', requires_proficiency: true, is_magical: false, stackable: false, range_short: 60, range_long: 180 },
            { item_id: 10009, name: 'Leather Armor', description: 'Basic leather protection', weight_cn: 200, cost_gp: 20, item_type: 'armor', item_category: 'armor', armor_type: 'leather', ac_bonus: 7, requires_proficiency: false, is_magical: false, stackable: false },
            { item_id: 10010, name: 'Chain Mail', description: 'Interlocked metal rings', weight_cn: 400, cost_gp: 75, item_type: 'armor', item_category: 'armor', armor_type: 'chain', ac_bonus: 5, requires_proficiency: false, is_magical: false, stackable: false },
            { item_id: 10011, name: 'Plate Mail', description: 'Heavy metal plates', weight_cn: 500, cost_gp: 400, item_type: 'armor', item_category: 'armor', armor_type: 'plate', ac_bonus: 3, requires_proficiency: false, is_magical: false, stackable: false },
            { item_id: 10012, name: 'Shield', description: 'Wooden or metal shield', weight_cn: 100, cost_gp: 10, item_type: 'shield', item_category: 'shield', armor_type: 'shield', ac_bonus: -1, requires_proficiency: false, is_magical: false, stackable: false },
            { item_id: 10013, name: 'Backpack', description: 'For carrying equipment', weight_cn: 20, cost_gp: 2, item_type: 'gear', item_category: 'container', capacity_cn: 400, requires_proficiency: false, is_magical: false, stackable: false },
            { item_id: 10014, name: 'Rope (50 ft)', description: 'Hemp rope', weight_cn: 100, cost_gp: 1, item_type: 'gear', item_category: 'tool', requires_proficiency: false, is_magical: false, stackable: false },
            { item_id: 10015, name: 'Torch', description: 'Provides light', weight_cn: 10, cost_gp: 0.01, item_type: 'gear', item_category: 'light', requires_proficiency: false, is_magical: false, stackable: true },
            { item_id: 10016, name: 'Rations (1 day)', description: 'Food and water', weight_cn: 50, cost_gp: 0.5, item_type: 'consumable', item_category: 'food', requires_proficiency: false, is_magical: false, stackable: true }
        ];
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
     * Prepare flat items for the character-creation shop.
     *
     * @param {Array<Object>} items
     * @returns {Array<Object>}
     */
    prepareCharacterCreationItems(items) {
        return this.mergeCanonicalItemVariants(items
            .map(item => this.normalizeItem(item))
            .filter(item => this.isCharacterCreationItem(item)))
            .sort((a, b) => this.sortCharacterCreationItems(a, b));
    }

    /**
     * Normalize item data into a stable UI contract.
     *
     * @param {Object} item
     * @returns {Object}
     */
    normalizeItem(item) {
        const canonicalItem = this.normalizeLegacyBECMIItem(item);
        const uiCategory = this.getUICategory(canonicalItem);
        const normalizedDescription = typeof canonicalItem.description === 'string'
            ? canonicalItem.description.trim()
            : '';
        const legacyAliases = Array.isArray(canonicalItem.legacy_aliases)
            ? canonicalItem.legacy_aliases
            : [];

        return {
            ...canonicalItem,
            category: canonicalItem.category || uiCategory,
            ui_category: uiCategory,
            description: normalizedDescription,
            item_category: canonicalItem.item_category || null,
            searchable_text: `${canonicalItem.name || ''} ${legacyAliases.join(' ')} ${normalizedDescription}`.toLowerCase()
        };
    }

    /**
     * Normalize legacy item names to Rules Cyclopedia terminology.
     *
     * @param {Object} item
     * @returns {Object}
     */
    normalizeLegacyBECMIItem(item) {
        const normalized = { ...item };
        const legacyAliases = Array.isArray(normalized.legacy_aliases)
            ? [...normalized.legacy_aliases]
            : [];

        if (
            normalized.name === 'Long Sword' &&
            normalized.item_type === 'weapon' &&
            normalized.weapon_type === 'melee' &&
            normalized.damage_die === '1d8'
        ) {
            legacyAliases.push('Long Sword');
            normalized.name = 'Normal Sword';
            normalized.description = 'Standard one-handed sword';
            normalized.cost_gp = 10;
            normalized.weight_cn = 60;
            normalized.item_category = normalized.item_category || 'sword';
            normalized.hands_required = 1;
        }

        const bastardSwordMatch = typeof normalized.name === 'string'
            ? normalized.name.match(/^Bastard Sword \((One-Handed|Two-Handed)\)(.*)$/)
            : null;

        if (
            bastardSwordMatch &&
            normalized.item_type === 'weapon' &&
            normalized.weapon_type === 'melee'
        ) {
            const suffix = bastardSwordMatch[2].trim();
            legacyAliases.push(normalized.name);
            normalized.name = suffix ? `Bastard Sword ${suffix}` : 'Bastard Sword';
            normalized.description = 'Versatile sword; use one-handed or two-handed. Cannot use a shield while wielded two-handed.';
            normalized.item_category = normalized.item_category || 'sword';
            normalized.canonical_group_key = `bastard_sword:${normalized.name.toLowerCase()}`;
            normalized.becmi_hand_mode = bastardSwordMatch[1] === 'One-Handed' ? 'one_handed' : 'two_handed';
            normalized.can_use_two_handed = true;
            normalized.hands_required = 1;
        }

        normalized.legacy_aliases = legacyAliases;
        return normalized;
    }

    /**
     * Merge flexible weapon variants that are a single Rules Cyclopedia item.
     *
     * @param {Array<Object>} items
     * @returns {Array<Object>}
     */
    mergeCanonicalItemVariants(items) {
        const merged = [];
        const indexByKey = new Map();

        items.forEach(item => {
            if (!item.canonical_group_key) {
                merged.push(item);
                return;
            }

            if (!indexByKey.has(item.canonical_group_key)) {
                merged.push({
                    ...item,
                    display_damage: item.display_damage || item.damage_die || '',
                    alternate_damage_die: item.alternate_damage_die || null,
                    variant_item_ids: [item.item_id]
                });
                indexByKey.set(item.canonical_group_key, merged.length - 1);
                return;
            }

            const existingIndex = indexByKey.get(item.canonical_group_key);
            const existing = merged[existingIndex];
            const promoteVariant = item.becmi_hand_mode === 'one_handed' && existing.becmi_hand_mode === 'two_handed';
            const baseItem = promoteVariant ? item : existing;
            const otherItem = promoteVariant ? existing : item;

            const oneHandedDamage = baseItem.becmi_hand_mode === 'one_handed'
                ? baseItem.damage_die
                : (otherItem.becmi_hand_mode === 'one_handed' ? otherItem.damage_die : baseItem.damage_die);
            const twoHandedDamage = baseItem.becmi_hand_mode === 'two_handed'
                ? baseItem.damage_die
                : (otherItem.becmi_hand_mode === 'two_handed' ? otherItem.damage_die : (baseItem.alternate_damage_die || otherItem.alternate_damage_die || null));

            merged[existingIndex] = {
                ...baseItem,
                damage_die: oneHandedDamage || baseItem.damage_die,
                alternate_damage_die: twoHandedDamage,
                display_damage: oneHandedDamage && twoHandedDamage ? `${oneHandedDamage} / ${twoHandedDamage}` : (oneHandedDamage || twoHandedDamage || ''),
                legacy_aliases: Array.from(new Set([...(baseItem.legacy_aliases || []), ...(otherItem.legacy_aliases || [])])),
                variant_item_ids: Array.from(new Set([...(baseItem.variant_item_ids || [baseItem.item_id]), ...(otherItem.variant_item_ids || [otherItem.item_id])]))
            };

            merged[existingIndex].searchable_text = `${merged[existingIndex].name || ''} ${(merged[existingIndex].legacy_aliases || []).join(' ')} ${merged[existingIndex].description || ''}`.toLowerCase();
        });

        return merged;
    }

    /**
     * Map database item types to the simplified character-creation tabs.
     *
     * @param {Object} item
     * @returns {string}
     */
    getUICategory(item) {
        if (item.item_type === 'weapon') {
            return 'weapon';
        }

        if (item.item_type === 'armor' || item.item_type === 'shield') {
            return 'armor';
        }

        if (item.item_category === 'container') {
            return 'container';
        }

        return 'gear';
    }

    /**
     * Keep the character-creation catalog focused on mundane starter gear.
     *
     * @param {Object} item
     * @returns {boolean}
     */
    isCharacterCreationItem(item) {
        const allowedTypes = new Set(['weapon', 'armor', 'shield', 'gear', 'consumable']);

        if (!allowedTypes.has(item.item_type)) {
            return false;
        }

        if (item.is_magical) {
            return false;
        }

        // Improvised rocks are not a meaningful purchase choice in the starter shop.
        if (item.name === 'Rock, Thrown') {
            return false;
        }

        return true;
    }

    /**
     * Sort starter gear into a player-friendly order.
     *
     * @param {Object} a
     * @param {Object} b
     * @returns {number}
     */
    sortCharacterCreationItems(a, b) {
        const categoryOrder = {
            armor: 1,
            weapon: 2,
            container: 3,
            gear: 4
        };

        const categoryDiff = (categoryOrder[a.ui_category] || 99) - (categoryOrder[b.ui_category] || 99);
        if (categoryDiff !== 0) {
            return categoryDiff;
        }

        const costDiff = (a.cost_gp || 0) - (b.cost_gp || 0);
        if (costDiff !== 0) {
            return costDiff;
        }

        return (a.name || '').localeCompare(b.name || '');
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
        return this.getAvailableEquipment().filter(item => {
            if (category === 'container') {
                return item.ui_category === 'container';
            }

            if (category === 'gear') {
                return item.ui_category === 'gear';
            }

            return item.ui_category === category;
        });
    }

    /**
     * Search starter equipment, optionally within a tab category.
     *
     * @param {string} searchQuery
     * @param {string} category
     * @returns {Array<Object>}
     */
    searchEquipment(searchQuery = '', category = 'all') {
        const query = (searchQuery || '').trim().toLowerCase();
        const baseItems = category === 'all'
            ? this.getAvailableEquipment()
            : this.getEquipmentByCategory(category);

        if (!query) {
            return baseItems;
        }

        return baseItems.filter(item => item.searchable_text.includes(query));
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
            props.damage = item.display_damage || item.damage_die || '';
            props.damageType = item.damage_type || '';
            props.weaponType = item.weapon_type || '';
            props.range = item.range_short ? `${item.range_short}/${item.range_long}` : '';
            props.handsRequired = item.hands_required || 1;
            props.handsDisplay = item.can_use_two_handed ? '1 or 2 hands' : (props.handsRequired > 1 ? `${props.handsRequired} hands` : '');
            props.canBeThrown = item.can_be_thrown || false;
        }

        // Add armor-specific properties
        if (item.item_type === 'armor' || item.item_type === 'shield' || item.item_category === 'shield') {
            props.acBonus = item.ac_bonus || 0;
            props.armorType = item.armor_type || '';
            props.armorDisplay = getBECMIArmorDisplay(item);
            props.acLabel = props.armorDisplay.label;
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

