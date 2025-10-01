/**
 * BECMI D&D Character Manager - Character Creation Module
 * 
 * Handles the 6-step character creation wizard with BECMI rule validation:
 * - Step 1: Roll Ability Scores
 * - Step 2: Basic Information (name, class, alignment, session)
 * - Step 3: Starting Gold
 * - Step 4: Equipment Purchase
 * - Step 5: Character Details (physical attributes, background)
 * - Step 6: Review & Create
 * 
 * @module CharacterCreationModule
 * @requires CharacterCreationGold
 * @requires CharacterCreationEquipment
 */

class CharacterCreationModule {
    /**
     * Creates a new CharacterCreationModule instance
     * 
     * @constructor
     * @param {Object} app - Main application instance
     */
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.rulesEngine = app.modules.rulesEngine;
        
        /**
         * Current wizard step (1-6)
         * @type {number}
         */
        this.currentStep = 1;
        
        /**
         * Character data being built through wizard
         * @type {Object}
         */
        this.characterData = {};
        
        /**
         * Starting gold calculator (initialized in Step 3)
         * @type {CharacterCreationGold|null}
         */
        this.goldCalculator = null;
        
        /**
         * Equipment shopping cart (initialized in Step 4)
         * @type {CharacterCreationEquipment|null}
         */
        this.equipmentCart = null;
        
        console.log('Character Creation Module initialized');
    }

    /**
     * Show character creation modal
     * 
     * Resets the wizard to step 1 and clears all data.
     */
    showModal() {
        $('#character-creation-modal').show();
        this.currentStep = 1;
        this.characterData = {};
        
        // Reset helpers
        this.goldCalculator = null;
        this.equipmentCart = null;
        
        this.renderStep();
    }

    /**
     * Hide character creation modal
     */
    hideModal() {
        $('#character-creation-modal').hide();
        this.resetForm();
    }

    /**
     * Render current step
     */
    renderStep() {
        const content = $('#character-creation-content');
        
        switch (this.currentStep) {
            case 1:
                content.html(this.renderStep1());
                break;
            case 2:
                content.html(this.renderStep2());
                break;
            case 3:
                content.html(this.renderStep3());
                break;
            case 4:
                content.html(this.renderStep4());
                break;
            case 5:
                content.html(this.renderStep5());
                break;
            case 6:
                content.html(this.renderStep6());
                break;
            default:
                content.html(this.renderStep1());
        }
        
        this.setupStepEventHandlers();
    }

    /**
     * Render Step 1: Basic Information
     */
    renderStep1() {
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 1: Roll Ability Scores</h3>
                    <div class="step-progress">
                        <span class="step-number active">1</span>
                        <span class="step-number">2</span>
                        <span class="step-number">3</span>
                        <span class="step-number">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                    </div>
                </div>
                
                <div class="ability-score-section">
                    <div class="ability-score-methods">
                        <h4>BECMI Ability Score Generation:</h4>
                        <p class="method-description">Roll 3d6 for each ability score, then arrange to taste.</p>
                        <div class="method-buttons">
                            <button type="button" class="btn btn-primary" id="roll-becmi-scores">Roll 3d6 (BECMI Standard)</button>
                            <button type="button" class="btn btn-secondary" id="manual-scores">Manual Entry</button>
                        </div>
                    </div>
                    
                    <form id="ability-scores-form" class="character-form">
                        <div class="ability-scores-grid">
                            ${window.BECMIConstants.ABILITY_SCORES.map(ability => `
                                <div class="ability-score-input">
                                    <label for="${ability.value}">${ability.label}:</label>
                                    <input type="number" id="${ability.value}" name="${ability.value}" min="3" max="18" value="" required>
                                    <div class="ability-modifier" id="${ability.value}-mod">+0</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancel-creation">Cancel</button>
                            <button type="button" class="btn btn-primary" id="next-step-1">Next</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Render Step 2: Ability Scores
     */
    renderStep2() {
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 2: Basic Information</h3>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number active">2</span>
                        <span class="step-number">3</span>
                        <span class="step-number">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                    </div>
                </div>
                
                <form id="character-basic-form" class="character-form">
                    <div class="form-group">
                        <label for="character-name">Character Name:</label>
                        <input type="text" id="character-name" name="character_name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="character-class">Class:</label>
                        <select id="character-class" name="class" required>
                            <option value="">Select a class...</option>
                            ${window.BECMIConstants.CLASSES.map(cls => 
                                `<option value="${cls.value}">${cls.label}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="character-alignment">Alignment:</label>
                        <select id="character-alignment" name="alignment" required>
                            <option value="">Select alignment...</option>
                            ${window.BECMIConstants.ALIGNMENTS.map(align => 
                                `<option value="${align.value}">${align.label}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="prev-step-2">Previous</button>
                        <button type="button" class="btn btn-primary" id="next-step-2">Next</button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Render session selection UI for Step 6 (optional)
     * 
     * @returns {string} HTML for session dropdown
     */
    renderSessionSelect() {
        const sessions = (this.app && this.app.state && Array.isArray(this.app.state.sessions))
            ? this.app.state.sessions
            : [];

        if (!sessions.length) {
            return `<div class="session-select-empty">
                        <p class="session-select-message">No sessions available yet. You can create one later and assign this character to it.</p>
                    </div>`;
        }

        const selectedId = this.characterData && this.characterData.session_id
            ? String(this.characterData.session_id)
            : '';

        const options = sessions.map(session => {
            const dateLabel = session.session_datetime
                ? (window.BECMIUtils && typeof window.BECMIUtils.formatDateTime === 'function'
                    ? window.BECMIUtils.formatDateTime(session.session_datetime)
                    : session.session_datetime)
                : 'Unscheduled';
            const roleLabel = session.user_role === 'dm' ? 'DM' : 'Player';
            const selected = selectedId === String(session.session_id) ? ' selected' : '';
            return `<option value="${session.session_id}"${selected}>${session.session_title} (${dateLabel}) - ${roleLabel}</option>`;
        }).join('');

        return `<select id="session-select" name="session_id">
                    <option value=""${selectedId ? '' : ' selected'}>None (Unassigned)</option>
                    ${options}
                </select>`;
    }

    /**
     * Render Step 3: Starting Gold
     * 
     * Allows player to roll for starting gold based on character class.
     * Different classes have different dice formulas (e.g., Fighter: 3d6×10, Thief: 2d6×10)
     * 
     * @returns {string} HTML for Step 3
     */
    renderStep3() {
        // Initialize gold calculator if not already done
        if (!this.goldCalculator) {
            this.goldCalculator = new CharacterCreationGold();
        }

        const characterClass = this.characterData.class || 'fighter';
        const formula = this.goldCalculator.getStartingGoldFormula(characterClass);
        
        // Check if gold has already been rolled
        const hasRolled = this.characterData.starting_gold !== undefined;
        const goldAmount = this.characterData.starting_gold || 0;
        const rollDetails = this.characterData.gold_roll_details || null;

        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 3: Starting Gold</h3>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number active">3</span>
                        <span class="step-number">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                    </div>
                </div>
                
                <div class="starting-gold-section">
                    <div class="gold-info">
                        <h4>Determine Starting Gold</h4>
                        <p>As a <strong>${characterClass}</strong>, you start with <strong>${formula.description}</strong> of gold.</p>
                        <p class="gold-explanation">This gold will be used to purchase equipment in the next step.</p>
                    </div>

                    ${hasRolled ? `
                        <div class="gold-roll-result success">
                            <div class="roll-animation">
                                <i class="fas fa-coins"></i>
                            </div>
                            <h3>You rolled: <span class="gold-amount">${goldAmount} gp</span></h3>
                            <p class="roll-breakdown">${rollDetails}</p>
                            <button type="button" class="btn btn-secondary" id="reroll-gold">
                                <i class="fas fa-dice"></i> Re-roll Gold
                            </button>
                        </div>
                    ` : `
                        <div class="gold-roll-container">
                            <div class="roll-instructions">
                                <i class="fas fa-dice"></i>
                                <p>Click the button below to roll for your starting gold!</p>
                            </div>
                            <button type="button" class="btn btn-primary btn-large" id="roll-starting-gold">
                                <i class="fas fa-dice"></i> Roll ${formula.description}
                            </button>
                        </div>
                    `}

                    <div class="gold-summary" ${!hasRolled ? 'style="display: none;"' : ''}>
                        <div class="summary-item">
                            <span class="label">Starting Gold:</span>
                            <span class="value" id="gold-display">${goldAmount} gp</span>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="prev-step-3">Previous</button>
                    <button type="button" class="btn btn-primary" id="next-step-3" ${!hasRolled ? 'disabled' : ''}>
                        Next: Purchase Equipment
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Step 4: Equipment Purchase
     * 
     * Provides a shopping interface for purchasing equipment with starting gold.
     * Tracks gold spent, weight, and encumbrance.
     * 
     * @returns {string} HTML for Step 4
     */
    renderStep4() {
        // Initialize equipment cart if not already done
        if (!this.equipmentCart) {
            const startingGold = this.characterData.starting_gold || 100;
            this.equipmentCart = new CharacterCreationEquipment(startingGold);
        }

        const strength = this.characterData.strength || 10;
        const encumbrance = this.equipmentCart.calculateEncumbrance(strength);
        const remainingGold = this.equipmentCart.getRemainingGold();

        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 4: Equipment Purchase</h3>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number active">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                    </div>
                </div>
                
                <div class="equipment-purchase-section">
                    <!-- Gold and Encumbrance Summary -->
                    <div class="purchase-summary">
                        <div class="summary-stat gold">
                            <i class="fas fa-coins"></i>
                            <div>
                                <span class="label">Available Gold:</span>
                                <span class="value" id="remaining-gold">${remainingGold} gp</span>
                            </div>
                        </div>
                        <div class="summary-stat weight ${encumbrance.level}">
                            <i class="fas fa-weight-hanging"></i>
                            <div>
                                <span class="label">Encumbrance:</span>
                                <span class="value" id="encumbrance-display">${encumbrance.description}</span>
                            </div>
                        </div>
                        <div class="summary-stat movement">
                            <i class="fas fa-walking"></i>
                            <div>
                                <span class="label">Movement:</span>
                                <span class="value" id="movement-rate">${encumbrance.movementRate} ft/round</span>
                            </div>
                        </div>
                    </div>

                    <div class="equipment-shop-container">
                        <!-- Left side: Equipment catalog -->
                        <div class="equipment-catalog">
                            <h4>Available Equipment</h4>
                            <div class="equipment-filters">
                                <button class="filter-btn active" data-category="all">All</button>
                                <button class="filter-btn" data-category="weapon">Weapons</button>
                                <button class="filter-btn" data-category="armor">Armor</button>
                                <button class="filter-btn" data-category="gear">Gear</button>
                                <button class="filter-btn" data-category="container">Containers</button>
                            </div>
                            <div class="equipment-list" id="equipment-list">
                                ${this.renderEquipmentList('all')}
                            </div>
                        </div>

                        <!-- Right side: Shopping cart -->
                        <div class="shopping-cart">
                            <h4>Shopping Cart</h4>
                            <div class="cart-items" id="cart-items">
                                ${this.renderShoppingCart()}
                            </div>
                            <div class="cart-totals">
                                <div class="total-row">
                                    <span>Starting Gold:</span>
                                    <span>${this.characterData.starting_gold} gp</span>
                                </div>
                                <div class="total-row">
                                    <span>Spent:</span>
                                    <span id="cart-total">${this.equipmentCart.getTotalCost()} gp</span>
                                </div>
                                <div class="total-row weight-row">
                                    <span>Total Weight:</span>
                                    <span id="cart-weight">${this.equipmentCart.formatWeight(this.equipmentCart.getTotalWeight())}</span>
                                </div>
                                <div class="total-row remaining">
                                    <span>Remaining:</span>
                                    <span id="cart-remaining">${remainingGold} gp</span>
                                </div>
                            </div>
                            <button type="button" class="btn btn-danger btn-sm" id="clear-cart">
                                <i class="fas fa-trash"></i> Clear Cart
                            </button>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="prev-step-4">Previous</button>
                    <button type="button" class="btn btn-primary" id="next-step-4">
                        Next: Character Details
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render equipment list filtered by category
     * 
     * @param {string} category - Category to filter by ('all' or specific category)
     * @returns {string} HTML for equipment list
     * @private
     */
    renderEquipmentList(category) {
        if (!this.equipmentCart) {
            return '<p>Error: Equipment cart not initialized</p>';
        }

        let items;
        if (category === 'all') {
            items = this.equipmentCart.getAvailableEquipment();
        } else {
            items = this.equipmentCart.getEquipmentByCategory(category);
        }

        if (items.length === 0) {
            return '<p class="no-items">No equipment in this category.</p>';
        }

        return items.map(item => `
            <div class="equipment-item" data-item-id="${item.item_id}">
                <div class="item-info">
                    <h5>${item.name}</h5>
                    <div class="item-stats">
                        <span class="item-cost">${item.cost_gp} gp</span>
                        <span class="item-weight">${item.weight_cn} cn</span>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary add-to-cart" data-item-id="${item.item_id}">
                    <i class="fas fa-plus"></i> Add
                </button>
            </div>
        `).join('');
    }

    /**
     * Render shopping cart contents
     * 
     * @returns {string} HTML for shopping cart
     * @private
     */
    renderShoppingCart() {
        if (!this.equipmentCart || this.equipmentCart.cart.length === 0) {
            return '<p class="cart-empty">Cart is empty</p>';
        }

        return this.equipmentCart.cart.map(cartItem => `
            <div class="cart-item">
                <div class="item-details">
                    <h5>${cartItem.item.name}</h5>
                    <p class="item-meta">${cartItem.item.cost_gp} gp × ${cartItem.quantity} = ${cartItem.item.cost_gp * cartItem.quantity} gp</p>
                </div>
                <div class="item-quantity">
                    <button class="btn btn-xs quantity-decrease" data-item-id="${cartItem.item.item_id}">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity">${cartItem.quantity}</span>
                    <button class="btn btn-xs quantity-increase" data-item-id="${cartItem.item.item_id}">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-xs btn-danger remove-item" data-item-id="${cartItem.item.item_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render Step 5: Character Details
     */
    renderStep5() {
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 5: Character Details</h3>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number completed">4</span>
                        <span class="step-number active">5</span>
                        <span class="step-number">6</span>
                    </div>
                </div>
                
                <form id="character-details-form" class="character-form">
                    <div class="roll-section">
                        <div class="roll-header">
                            <h5>Physical Attributes</h5>
                            <button type="button" class="btn btn-secondary btn-sm" id="roll-physical-btn">
                                <i class="fas fa-dice"></i> Roll All Physical
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="character-age">Age:</label>
                            <div class="input-with-button">
                                <input type="number" id="character-age" name="age" min="16" max="80" placeholder="e.g., 25">
                                <button type="button" class="btn btn-sm roll-btn" data-target="#character-age" data-roll="age">
                                    <i class="fas fa-dice"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="character-height">Height:</label>
                            <div class="input-with-button">
                                <input type="text" id="character-height" name="height" placeholder="e.g., 5'8&quot;">
                                <button type="button" class="btn btn-sm roll-btn" data-target="#character-height" data-roll="height">
                                    <i class="fas fa-dice"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="character-weight">Weight:</label>
                            <div class="input-with-button">
                                <input type="text" id="character-weight" name="weight" placeholder="e.g., 150 lbs">
                                <button type="button" class="btn btn-sm roll-btn" data-target="#character-weight" data-roll="weight">
                                    <i class="fas fa-dice"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="character-hair">Hair Color:</label>
                            <div class="input-with-button">
                                <input type="text" id="character-hair" name="hair_color" placeholder="e.g., Brown">
                                <button type="button" class="btn btn-sm roll-btn" data-target="#character-hair" data-roll="hair">
                                    <i class="fas fa-dice"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="character-eyes">Eye Color:</label>
                            <div class="input-with-button">
                                <input type="text" id="character-eyes" name="eye_color" placeholder="e.g., Blue">
                                <button type="button" class="btn btn-sm roll-btn" data-target="#character-eyes" data-roll="eyes">
                                    <i class="fas fa-dice"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="character-background">Background/Description:</label>
                        <textarea id="character-background" name="background" rows="4" placeholder="Describe your character's background, personality, and appearance..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="prev-step-5">Previous</button>
                        <button type="button" class="btn btn-primary" id="next-step-5">Next</button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Render Step 6: Review & Create
     */
    renderStep6() {
        const character = this.characterData;
        const calculatedStats = this.calculateCharacterStats();
        
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 6: Review & Create</h3>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number completed">4</span>
                        <span class="step-number completed">5</span>
                        <span class="step-number active">6</span>
                    </div>
                </div>
                
                <div class="character-review">
                    <div class="character-summary">
                        <h4>Character Summary</h4>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <span class="summary-label">Name:</span>
                                <span class="summary-value">${character.character_name || 'Not set'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Class:</span>
                                <span class="summary-value">${character.class || 'Not set'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Level:</span>
                                <span class="summary-value">1</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Alignment:</span>
                                <span class="summary-value">${character.alignment || 'Not set'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ability-summary">
                        <h4>Ability Scores</h4>
                        <div class="ability-scores-summary">
                            ${window.BECMIConstants.ABILITY_SCORES.map(ability => {
                                const value = character[ability.value] || 10;
                                const modifier = this.rulesEngine ? this.rulesEngine.getAbilityModifier(value) : 0;
                                return `<div class="ability-summary-item">
                                        <span class="ability-name">${ability.short}</span>
                                        <span class="ability-value">${value}</span>
                                        <span class="ability-modifier">${window.BECMIUtils ? window.BECMIUtils.formatModifier(modifier) : modifier}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div class="stats-summary">
                        <h4>Calculated Statistics</h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-label">Hit Points:</span>
                                <span class="stat-value">${calculatedStats.max_hp}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Armor Class:</span>
                                <span class="stat-value">${calculatedStats.armor_class}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">THAC0 (Melee):</span>
                                <span class="stat-value">${calculatedStats.thac0.melee}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">THAC0 (Ranged):</span>
                                <span class="stat-value">${calculatedStats.thac0.ranged}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="session-assignment">
                        <h4>Session Assignment (Optional)</h4>
                        <p class="session-help-text">Assign this character to a session, or leave unassigned to add them later.</p>
                        <div class="form-group">
                            <label for="session-select">Session:</label>
                            ${this.renderSessionSelect()}
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="prev-step-6">Previous</button>
                        <button type="button" class="btn btn-success" id="create-character">Create Character</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    
    /**
     * Calculate character statistics
     */
    calculateCharacterStats() {
        if (!this.characterData.class) {
            return {};
        }
        
        const character = {
            class: this.characterData.class,
            level: 1,
            strength: this.characterData.strength || 10,
            dexterity: this.characterData.dexterity || 10,
            constitution: this.characterData.constitution || 10,
            intelligence: this.characterData.intelligence || 10,
            wisdom: this.characterData.wisdom || 10,
            charisma: this.characterData.charisma || 10
        };
        
        return this.rulesEngine.recalculateAllStats(character);
    }

    /**
     * Setup event handlers for current step
     * 
     * This is called after each step render to attach event handlers.
     * Uses jQuery .off().on() pattern to prevent duplicate handlers.
     */
    setupStepEventHandlers() {
        // ===== STEP 1: Ability Scores =====
        $('#next-step-1').off('click').on('click', () => this.nextStep());
        $('#cancel-creation').off('click').on('click', () => this.hideModal());
        $('#roll-becmi-scores').off('click').on('click', () => this.rollBECMIAbilityScores());
        $('#manual-scores').off('click').on('click', () => this.enableManualEntry());
        
        // Ability score change handlers (for Step 1)
        if (window.BECMIConstants && window.BECMIConstants.ABILITY_SCORES) {
            window.BECMIConstants.ABILITY_SCORES.forEach(ability => {
                $(`#${ability.value}`).off('input').on('input', (e) => {
                    this.updateAbilityModifier(ability.value, e.target.value);
                    this.checkClassRequirements();
                });
            });
        }
        
        // ===== STEP 2: Basic Information =====
        $('#prev-step-2').off('click').on('click', () => this.prevStep());
        $('#next-step-2').off('click').on('click', () => this.nextStep());
        
        // Class change handler
        $('#character-class').off('change').on('change', () => {
            this.checkClassRequirements();
        });

        // ===== STEP 3: Starting Gold =====
        $('#prev-step-3').off('click').on('click', () => this.prevStep());
        $('#next-step-3').off('click').on('click', () => this.nextStep());
        
        // Roll starting gold button
        $('#roll-starting-gold').off('click').on('click', () => {
            if (!this.goldCalculator) {
                this.goldCalculator = new CharacterCreationGold();
            }
            
            const characterClass = this.characterData.class || 'fighter';
            const result = this.goldCalculator.rollStartingGold(characterClass);
            
            // Save to character data
            this.characterData.starting_gold = result.gold;
            this.characterData.gold_roll_details = result.description;
            
            // Re-render step to show result
            this.renderStep();
        });
        
        // Re-roll gold button
        $('#reroll-gold').off('click').on('click', () => {
            // Clear existing gold
            delete this.characterData.starting_gold;
            delete this.characterData.gold_roll_details;
            
            // Re-render step
            this.renderStep();
        });
        
        // ===== STEP 4: Equipment Purchase =====
        $('#prev-step-4').off('click').on('click', () => this.prevStep());
        $('#next-step-4').off('click').on('click', () => this.nextStep());
        
        // Equipment category filters
        $('.filter-btn').off('click').on('click', (e) => {
            $('.filter-btn').removeClass('active');
            $(e.target).addClass('active');
            
            const category = $(e.target).data('category');
            $('#equipment-list').html(this.renderEquipmentList(category));
            
            // Re-attach add to cart buttons
            this.setupEquipmentCartHandlers();
        });
        
        // Setup equipment cart handlers
        this.setupEquipmentCartHandlers();
        
        // Clear cart button
        $('#clear-cart').off('click').on('click', () => {
            if (this.equipmentCart) {
                this.equipmentCart.clearCart();
                this.updateCartDisplay();
            }
        });
        
        // ===== STEP 5: Character Details =====
        $('#prev-step-5').off('click').on('click', () => this.prevStep());
        $('#next-step-5').off('click').on('click', () => this.nextStep());
        
        // Physical attributes rolling
        $('#roll-physical-btn').off('click').on('click', () => this.rollAllPhysicalAttributes());
        $('.roll-btn').off('click').on('click', (e) => {
            const target = $(e.target).closest('.roll-btn').data('target');
            const rollType = $(e.target).closest('.roll-btn').data('roll');
            this.rollPhysicalAttribute(target, rollType);
        });
        
        // ===== STEP 6: Review & Create =====
        $('#prev-step-6').off('click').on('click', () => this.prevStep());
        $('#create-character').off('click').on('click', () => this.createCharacter());
        
        // Session select handler (optional in Step 6)
        $('#session-select').off('change').on('change', () => {
            this.saveCurrentStepData();
        });
    }

    /**
     * Setup event handlers for equipment shopping cart
     * 
     * @private
     */
    setupEquipmentCartHandlers() {
        // Add to cart buttons
        $('.add-to-cart').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.add-to-cart').data('item-id'));
            
            if (!this.equipmentCart) {
                return;
            }
            
            // Find item
            const item = this.equipmentCart.getAvailableEquipment().find(i => i.item_id === itemId);
            if (!item) {
                return;
            }
            
            // Add to cart
            const result = this.equipmentCart.addToCart(item, 1);
            
            if (result.success) {
                this.updateCartDisplay();
                this.app.showSuccess(result.message);
            } else {
                this.app.showError(result.message);
            }
        });
        
        // Quantity decrease buttons
        $('.quantity-decrease').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.quantity-decrease').data('item-id'));
            
            if (this.equipmentCart) {
                this.equipmentCart.removeFromCart(itemId, 1);
                this.updateCartDisplay();
            }
        });
        
        // Quantity increase buttons
        $('.quantity-increase').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.quantity-increase').data('item-id'));
            
            if (!this.equipmentCart) {
                return;
            }
            
            // Find item
            const item = this.equipmentCart.getAvailableEquipment().find(i => i.item_id === itemId);
            if (!item) {
                return;
            }
            
            // Add one more
            const result = this.equipmentCart.addToCart(item, 1);
            
            if (result.success) {
                this.updateCartDisplay();
            } else {
                this.app.showError(result.message);
            }
        });
        
        // Remove item buttons
        $('.remove-item').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.remove-item').data('item-id'));
            
            if (this.equipmentCart) {
                this.equipmentCart.removeFromCart(itemId, 0); // 0 = remove all
                this.updateCartDisplay();
            }
        });
    }

    /**
     * Update equipment cart display (gold, weight, encumbrance)
     * 
     * @private
     */
    updateCartDisplay() {
        if (!this.equipmentCart) {
            return;
        }
        
        const strength = this.characterData.strength || 10;
        const encumbrance = this.equipmentCart.calculateEncumbrance(strength);
        const remainingGold = this.equipmentCart.getRemainingGold();
        
        // Update display elements
        $('#remaining-gold').text(`${remainingGold} gp`);
        $('#cart-remaining').text(`${remainingGold} gp`);
        $('#cart-total').text(`${this.equipmentCart.getTotalCost()} gp`);
        $('#cart-weight').text(this.equipmentCart.formatWeight(this.equipmentCart.getTotalWeight()));
        $('#encumbrance-display').text(encumbrance.description);
        $('#movement-rate').text(`${encumbrance.movementRate} ft/round`);
        
        // Update encumbrance class
        $('.summary-stat.weight')
            .removeClass('light normal heavy overloaded')
            .addClass(encumbrance.level);
        
        // Re-render cart items
        $('#cart-items').html(this.renderShoppingCart());
        
        // Re-attach handlers
        this.setupEquipmentCartHandlers();
    }

    /**
     * Next step
     */
    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStepData();
            this.currentStep++;
            this.renderStep();
        }
    }
    
    /**
     * Previous step
     */
    prevStep() {
        this.currentStep--;
        this.renderStep();
    }
    
    /**
     * Validate current step before moving to next
     * 
     * @returns {boolean} True if current step is valid
     */
    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.validateStep1(); // Ability scores
            case 2:
                return this.validateStep2(); // Basic info
            case 3:
                return this.validateStep3(); // Starting gold
            case 4:
                return this.validateStep4(); // Equipment purchase (optional)
            case 5:
                return this.validateStep5(); // Character details
            case 6:
                return true; // Review step - no validation needed
            default:
                return true;
        }
    }

    /**
     * Validate step 3 (Starting Gold)
     * 
     * @returns {boolean} True if gold has been rolled
     */
    validateStep3() {
        if (this.characterData.starting_gold === undefined || this.characterData.starting_gold === null) {
            this.app.showError('Please roll for starting gold before proceeding');
            return false;
        }
        return true;
    }

    /**
     * Validate step 4 (Equipment Purchase)
     * Equipment purchase is optional - player can skip
     * 
     * @returns {boolean} Always true (optional step)
     */
    validateStep4() {
        // Equipment purchase is optional
        return true;
    }

    /**
     * Validate step 5 (Character Details)
     * Physical attributes and background are optional
     * 
     * @returns {boolean} Always true (optional fields)
     */
    validateStep5() {
        // Character details are optional
        return true;
    }

    /**
     * Validate step 1 (Ability Scores)
     */
    validateStep1() {
        if (!window.BECMIConstants || !window.BECMIConstants.ABILITY_SCORES) {
            this.app.showError('Ability score constants not available');
            return false;
        }
        
        const abilities = window.BECMIConstants.ABILITY_SCORES;
        
        for (const ability of abilities) {
            const value = parseInt($(`#${ability.value}`).val());
            if (!value || value < 3 || value > 18) {
                this.app.showError(`Please enter a valid ${ability.label} score (3-18)`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Validate step 2 (Basic Information)
     * 
     * @returns {boolean} True if all required fields are filled
     */
    validateStep2() {
        const name = $('#character-name').val();
        const classType = $('#character-class').val();
        const alignment = $('#character-alignment').val();

        if (!name || !classType || !alignment) {
            this.app.showError('Please fill in all required fields');
            return false;
        }

        // Check class requirements against ability scores from step 1
        if (window.BECMIConstants && window.BECMIConstants.ABILITY_SCORES) {
            const abilities = window.BECMIConstants.ABILITY_SCORES;
            const scores = {};
            abilities.forEach(ability => {
                scores[ability.value] = parseInt($(`#${ability.value}`).val(), 10);
            });

            if (window.BECMIUtils && window.BECMIUtils.validateClassRequirements) {
                const validation = window.BECMIUtils.validateClassRequirements(scores, classType);
                if (!validation.valid) {
                    this.app.showError(validation.errors.join(', '));
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Save data from current step to characterData
     * 
     * This method is called before moving to the next step to persist form data.
     */
    saveCurrentStepData() {
        switch (this.currentStep) {
            case 1:
                // Step 1: Ability Scores
                if (window.BECMIConstants && window.BECMIConstants.ABILITY_SCORES) {
                    window.BECMIConstants.ABILITY_SCORES.forEach(ability => {
                        const value = parseInt($(`#${ability.value}`).val(), 10);
                        if (!Number.isNaN(value)) {
                            this.characterData[ability.value] = value;
                        }
                    });
                }
                break;
                
            case 2:
                // Step 2: Basic Information
                this.characterData.character_name = $('#character-name').val();
                this.characterData.class = $('#character-class').val();
                this.characterData.alignment = $('#character-alignment').val();
                break;
            
            case 3:
                // Step 3: Starting Gold
                // Gold is saved via the roll button handler
                // Nothing to save here (already in characterData)
                break;
                
            case 4:
                // Step 4: Equipment Purchase
                if (this.equipmentCart) {
                    // Save purchased equipment
                    this.characterData.equipment = this.equipmentCart.getCartForAPI();
                    
                    // Save remaining gold (converted to gp/sp/cp)
                    const remaining = this.equipmentCart.getRemainingGold();
                    this.characterData.gold_pieces = Math.floor(remaining);
                    this.characterData.silver_pieces = Math.floor((remaining - Math.floor(remaining)) * 10);
                    this.characterData.copper_pieces = 0;
                }
                break;
                
            case 5:
                // Step 5: Character Details (Physical attributes and background)
                this.characterData.age = $('#character-age').val();
                this.characterData.height = $('#character-height').val();
                this.characterData.weight = $('#character-weight').val();
                this.characterData.hair_color = $('#character-hair').val();
                this.characterData.eye_color = $('#character-eyes').val();
                this.characterData.background = $('#character-background').val();
                break;
                
            case 6:
                // Step 6: Review & Create
                // Save session assignment (optional)
                const sessionSelect = $('#session-select');
                if (sessionSelect.length) {
                    const sessionValue = sessionSelect.val();
                    this.characterData.session_id = sessionValue ? parseInt(sessionValue, 10) : null;
                } else {
                    this.characterData.session_id = null;
                }
                break;
                
            default:
                break;
        }
    }

    /**
     * Roll BECMI ability scores (3d6, arrange to taste)
     */
    rollBECMIAbilityScores() {
        // Generate 6 ability scores using 3d6
        const scores = [];
        for (let i = 0; i < 6; i++) {
            let roll = 0;
            for (let j = 0; j < 3; j++) {
                roll += Math.floor(Math.random() * 6) + 1;
            }
            scores.push(roll);
        }
        
        // Sort scores in descending order for display
        scores.sort((a, b) => b - a);
        
        // Show scores in a modal for arrangement
        this.showAbilityScoreArrangement(scores);
    }

    /**
     * Show ability score arrangement interface
     */
    showAbilityScoreArrangement(scores) {
        const modal = $(`<div id="ability-arrangement-modal" class="modal-overlay">
                <div class="modal-content">
                    <h3>Arrange Your Ability Scores</h3>
                    <p>You rolled: ${scores.join(', ')}</p>
                    <p>Drag and drop to arrange these scores to your character's abilities:</p>
                    
                    <div class="ability-arrangement">
                        ${window.BECMIConstants.ABILITY_SCORES.map(ability => `<div class="ability-slot"data-ability="${ability.value}">
                                <label>${ability.label}:</label>
                                <div class="score-drop-zone"data-ability="${ability.value}">
                                    <span class="score-value">--</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="available-scores">
                        <h4>Available Scores:</h4>
                        <div class="score-pool">
                            ${scores.map((score, index) => `<div class="score-chip" data-score="${score}" draggable="true">
                                    ${score}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-arrangement">Cancel</button>
                        <button type="button" class="btn btn-primary" id="apply-arrangement">Apply Scores</button>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        this.setupAbilityArrangementHandlers(scores);
    }

    /**
     * Setup ability arrangement handlers
     */
    setupAbilityArrangementHandlers(scores) {
        // Drag and drop functionality
        $('.score-chip').on('dragstart', function(e) {
            e.originalEvent.dataTransfer.setData('text/plain', $(this).data('score'));
        });
        
        $('.score-drop-zone').on('dragover', function(e) {
            e.preventDefault();
        });
        
        $('.score-drop-zone').on('drop', function(e) {
            e.preventDefault();
            const score = e.originalEvent.dataTransfer.getData('text/plain');
            $(this).find('.score-value').text(score);
            $(this).data('score', score);
        });
        
        // Apply arrangement
        $('#apply-arrangement').on('click', () => {
            const arrangedScores = {};
            $('.score-drop-zone').each(function() {
                const ability = $(this).data('ability');
                const score = $(this).data('score');
                if (score) {
                    arrangedScores[ability] = parseInt(score);
                }
            });
            
            // Apply to form
            Object.keys(arrangedScores).forEach(ability => {
                $(`#${ability}`).val(arrangedScores[ability]);
                this.updateAbilityModifier(ability, arrangedScores[ability]);
            });
            
            $('#ability-arrangement-modal').remove();
            this.checkClassRequirements();
        });
        
        // Cancel arrangement
        $('#cancel-arrangement').on('click', () => {
            $('#ability-arrangement-modal').remove();
        });
    }

    /**
     * Enable manual entry
     */
    enableManualEntry() {
        if (window.BECMIConstants && window.BECMIConstants.ABILITY_SCORES) {
            window.BECMIConstants.ABILITY_SCORES.forEach(ability => {
                $(`#${ability.value}`).prop('disabled', false);
            });
        }
    }

    /**
     * Update ability modifier display
     */
    updateAbilityModifier(ability, value) {
        const modifier = this.rulesEngine ? this.rulesEngine.getAbilityModifier(parseInt(value)) : 0;
        const formattedModifier = window.BECMIUtils ? window.BECMIUtils.formatModifier(modifier) : modifier;
        $(`#${ability}-mod`).text(formattedModifier);
    }

    /**
     * Check class requirements
     */
    checkClassRequirements() {
        const classType = $('#character-class').val();
        if (!classType) return;
        
        const scores = {};
        window.BECMIConstants.ABILITY_SCORES.forEach(ability => {
            scores[ability.value] = parseInt($(`#${ability.value}`).val()) || 10;
        });
        
        const validation = window.BECMIUtils.validateClassRequirements(scores, classType);
        
        if (validation.errors.length > 0) {
            $('#class-requirements').show();
            $('#requirements-text').html(validation.errors.map(error => 
                `<div class="requirement-error">${error}</div>`).join(''));
        } else {
            $('#class-requirements').hide();
        }
    }

    /**
     * Roll all physical attributes
     */
    rollAllPhysicalAttributes() {
        const classType = this.characterData.class;
        this.rollPhysicalAttribute('#character-age', 'age', classType);
        this.rollPhysicalAttribute('#character-height', 'height', classType);
        this.rollPhysicalAttribute('#character-weight', 'weight', classType);
        this.rollPhysicalAttribute('#character-hair', 'hair', classType);
        this.rollPhysicalAttribute('#character-eyes', 'eyes', classType);
        
        this.app.modules.notifications.show('Physical attributes rolled!', 'success');
    }

    /**
     * Roll individual physical attribute
     */
    rollPhysicalAttribute(target, rollType, classType = null) {
        if (!classType) {
            classType = this.characterData.class;
        }
        
        let value = '';
        
        switch (rollType) {
            case 'age':
                value = this.rollAge(classType);
                break;
            case 'height':
                value = this.rollHeight(classType);
                break;
            case 'weight':
                value = this.rollWeight(classType);
                break;
            case 'hair':
                value = this.rollHairColor();
                break;
            case 'eyes':
                value = this.rollEyeColor();
                break;
        }
        
        if (value) {
            $(target).val(value);
        }
    }

    /**
     * Roll age based on class
     */
    rollAge(classType) {
        const ageRanges = {
            'fighter': { min: 16, max: 25 },
            'cleric': { min: 18, max: 30 },
            'magic-user': { min: 20, max: 35 },
            'thief': { min: 16, max: 28 },
            'dwarf': { min: 20, max: 50 },
            'elf': { min: 100, max: 300 },
            'halfling': { min: 18, max: 40 }
        };
        
        const range = ageRanges[classType] || { min: 16, max: 30 };
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }

    /**
     * Roll height based on class/race
     */
    rollHeight(classType) {
        const heightRanges = {
            'fighter': { min: 66, max: 78 }, // 5'6" to 6'6"
            'cleric': { min: 64, max: 74 },  // 5'4" to 6'2"
            'magic-user': { min: 60, max: 72 }, // 5'0" to 6'0"
            'thief': { min: 58, max: 70 },   // 4'10" to 5'10"
            'dwarf': { min: 48, max: 60 },   // 4'0" to 5'0"
            'elf': { min: 60, max: 72 },     // 5'0" to 6'0"
            'halfling': { min: 36, max: 48 } // 3'0" to 4'0"
        };
        
        const range = heightRanges[classType] || { min: 60, max: 72 };
        const inches = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        const feet = Math.floor(inches / 12);
        const remainingInches = inches % 12;
        return `${feet}'${remainingInches}"`;
    }

    /**
     * Roll weight based on height and class
     */
    rollWeight(classType) {
        const baseWeight = {
            'fighter': { min: 140, max: 200 },
            'cleric': { min: 120, max: 180 },
            'magic-user': { min: 100, max: 160 },
            'thief': { min: 110, max: 170 },
            'dwarf': { min: 130, max: 180 },
            'elf': { min: 90, max: 150 },
            'halfling': { min: 60, max: 100 }
        };
        
        const range = baseWeight[classType] || { min: 120, max: 180 };
        const weight = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        return `${weight} lbs`;
    }

    /**
     * Roll hair color
     */
    rollHairColor() {
        const hairColors = [
            'Black', 'Brown', 'Dark Brown', 'Light Brown', 'Blonde', 'Golden Blonde',
            'Red', 'Auburn', 'Gray', 'White', 'Silver', 'Copper'
        ];
        return hairColors[Math.floor(Math.random() * hairColors.length)];
    }

    /**
     * Roll eye color
     */
    rollEyeColor() {
        const eyeColors = [
            'Blue', 'Brown', 'Green', 'Hazel', 'Gray', 'Amber', 'Violet'
        ];
        return eyeColors[Math.floor(Math.random() * eyeColors.length)];
    }

    /**
     * Create character via API
     * 
     * Sends all character data including equipment to the server.
     * After successful creation, refreshes the character list and navigates to characters view.
     * 
     * @async
     */
    async createCharacter() {
        try {
            // Save any unsaved data from current step (should be step 6 - review)
            this.saveCurrentStepData();
            
            // Ensure required fields are set
            this.characterData.level = 1; // New characters always start at level 1
            
            // Log character data for debugging
            console.log('Creating character with data:', {
                name: this.characterData.character_name,
                class: this.characterData.class,
                level: this.characterData.level,
                starting_gold: this.characterData.starting_gold,
                equipment_count: this.characterData.equipment ? this.characterData.equipment.length : 0,
                remaining_gold: this.characterData.gold_pieces
            });
            
            // Send character creation request
            const response = await this.apiClient.post('/api/character/create.php', this.characterData);
            
            if (response.status === 'success') {
                this.app.showSuccess(`Character "${this.characterData.character_name}" created successfully!`);
                this.hideModal();
                
                // Refresh character list
                if (this.app.loadUserData) {
                    await this.app.loadUserData();
                }
                
                // Navigate to characters view
                if (this.app.navigateToView) {
                    this.app.navigateToView('characters');
                }
                
            } else {
                this.app.showError(response.message || 'Failed to create character');
            }
            
        } catch (error) {
            console.error('Character creation error:', error);
            this.app.showError('Failed to create character: ' + error.message);
        }
    }

    /**
     * Reset form
     */
    resetForm() {
        this.currentStep = 1;
        this.characterData = {};
        $('#character-creation-content').empty();
    }

    /**
     * Initialize character creation module
     */
    init() {
        console.log('Character Creation Module initialized');

        if (this.app && this.app.eventBus && typeof this.app.eventBus.on === 'function') {
            this.app.eventBus.on(BECMI_EVENTS.SESSION_CREATED, async () => {
                try {
                    if (this.app.loadUserData) {
                        await this.app.loadUserData();
                    }
                    if (this.currentStep === 2) {
                        this.renderStep();
                    }
                } catch (error) {
                    console.error('Failed to refresh sessions after creation:', error);
                }
            });
        }
    }
}

// Export to window for use in app.js
window.CharacterCreationModule = CharacterCreationModule;











