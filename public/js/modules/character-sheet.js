/**
 * BECMI D&D Character Manager - Character Sheet Module
 * 
 * Handles character sheet display, editing, and real-time calculations.
 */

class CharacterSheetModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.rulesEngine = app.modules.rulesEngine;
        this.currentCharacter = null;
        
        console.log('Character Sheet Module initialized');
    }
    
    /**
     * Load a character by ID
     */
    async loadCharacter(characterId) {
        try {
            console.log(`Loading character ${characterId}...`);
            
            const response = await this.apiClient.get(`/api/character/get.php?id=${characterId}`);
            
            if (response.status === 'success') {
                this.currentCharacter = response.data.character;
                this.app.updateState({ currentCharacter: this.currentCharacter });
                
                console.log(`Character loaded: ${this.currentCharacter.character_name}`);
                return this.currentCharacter;
            } else {
                throw new Error(response.message || 'Failed to load character');
            }
            
        } catch (error) {
            console.error('Failed to load character:', error);
            this.app.showError('Failed to load character: '+ error.message);
            throw error;
        }
    }
    
    /**
     * Load character inventory from API
     * 
     * @param {number} characterId - ID of character
     */
    async loadInventory(characterId) {
        try {
            console.log(`Loading inventory for character ${characterId}...`);
            
            const response = await this.apiClient.get(`/api/inventory/get.php?character_id=${characterId}`);
            
            if (response.status === 'success') {
                this.currentInventory = response.data.inventory || [];
                this.inventoryStats = {
                    total_weight_cn: response.data.total_weight_cn || 0,
                    equipped_count: response.data.equipped_count || 0
                };
                console.log(`Inventory loaded: ${this.currentInventory.length} items`);
            } else {
                this.currentInventory = [];
                this.inventoryStats = { total_weight_cn: 0, equipped_count: 0 };
            }
        } catch (error) {
            console.error('Failed to load inventory:', error);
            this.currentInventory = [];
            this.inventoryStats = { total_weight_cn: 0, equipped_count: 0 };
        }
    }
    
    /**
     * Render character list view
     */
    async renderCharacterList() {
        try {
            const characters = this.app.state.characters;
            
            if (characters.length === 0) {
                return this.renderEmptyCharacterList();
            }
            
            return this.renderCharacterGrid(characters);
            
        } catch (error) {
            console.error('Character list render error:', error);
            return '<div class="card"><h2>Error</h2><p>Failed to load character list.</p></div>';
        }
    }
    
    /**
     * Render empty character list
     */
    renderEmptyCharacterList() {
        return `<div class="characters-container">
                <div class="characters-header">
                    <h1>My Characters</h1>
                    <button class="btn btn-primary" id="create-character-btn">
                        <i class="fas fa-user-plus"></i>
                        Create Character
                    </button>
                </div>
                
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <h2>No Characters Yet</h2>
                    <p>Create your first BECMI character to get started!</p>
                    <button class="btn btn-primary btn-lg" id="create-character-btn">
                        <i class="fas fa-user-plus"></i>
                        Create Character
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render character grid
     */
    renderCharacterGrid(characters) {
        return `<div class="characters-container">
                <div class="characters-header">
                    <h1>My Characters</h1>
                    <button class="btn btn-primary" id="create-character-btn">
                        <i class="fas fa-user-plus"></i>
                        Create Character
                    </button>
                </div>
                
                <div class="characters-grid">
                    ${characters.map(character => this.renderCharacterCard(character)).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render individual character card
     */
    renderCharacterCard(character) {
        const hpPercentage = character.max_hp > 0 ? 
            Math.round((character.current_hp / character.max_hp) * 100) : 0;
        
        const statusClass = this.getCharacterStatusClass(hpPercentage);
        
        return `<div class="character-card"data-character-id="${character.character_id}">
                <div class="character-header">
                    <h3>${character.character_name}</h3>
                    <span class="character-class">Level ${character.level} ${character.class}</span>
                </div>
                
                <div class="character-stats">
                    <div class="stat-row">
                        <span class="stat-label">HP:</span>
                        <div class="hp-bar">
                            <div class="hp-fill ${statusClass}" style="width: ${hpPercentage}%"></div>
                        </div>
                        <span class="stat-value">${character.current_hp}/${character.max_hp}</span>
                    </div>
                    
                    <div class="ability-scores">
                        <div class="ability-score">
                            <span class="ability-label">STR</span>
                            <span class="ability-value">${character.strength}</span>
                        </div>
                        <div class="ability-score">
                            <span class="ability-label">DEX</span>
                            <span class="ability-value">${character.dexterity}</span>
                        </div>
                        <div class="ability-score">
                            <span class="ability-label">CON</span>
                            <span class="ability-value">${character.constitution}</span>
                        </div>
                        <div class="ability-score">
                            <span class="ability-label">INT</span>
                            <span class="ability-value">${character.intelligence}</span>
                        </div>
                        <div class="ability-score">
                            <span class="ability-label">WIS</span>
                            <span class="ability-value">${character.wisdom}</span>
                        </div>
                        <div class="ability-score">
                            <span class="ability-label">CHA</span>
                            <span class="ability-value">${character.charisma}</span>
                        </div>
                    </div>
                </div>
                
                <div class="character-session">
                    <i class="fas fa-calendar"></i>
                    <span>${character.session_title || 'Unassigned'}</span>
                </div>
                
                <div class="character-actions">
                    <button class="btn btn-sm btn-primary"data-action="view-character"data-character-id="${character.character_id}">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                    <button class="btn btn-sm btn-secondary"data-action="edit-character"data-character-id="${character.character_id}">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger"data-action="delete-character"data-character-id="${character.character_id}">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Get character status class based on HP percentage
     */
    getCharacterStatusClass(hpPercentage) {
        if (hpPercentage >= 75) return 'healthy';
        if (hpPercentage >= 25) return 'wounded';
        if (hpPercentage > 0) return 'critical';
        return 'unconscious';
    }
    
    /**
     * Render detailed character sheet
     */
    async renderCharacterSheet(characterId) {
        try {
            const character = await this.loadCharacter(characterId);
            
            // Load inventory
            await this.loadInventory(characterId);
            
            return `<div class="character-sheet-container">
                    <div class="character-sheet-header">
                        <div>
                            <h1>${character.character_name}</h1>
                            <div class="character-basic-info">
                                <span>Level ${character.level} ${character.class}</span>
                                <span>${character.alignment}</span>
                            </div>
                        </div>
                        <div class="character-actions">
                            <button class="btn btn-primary" data-action="edit-character" data-character-id="${character.character_id}">
                                <i class="fas fa-edit"></i> Edit Character
                            </button>
                        </div>
                    </div>
                    
                    <div class="character-sheet">
                        ${this.renderCharacterSheetContent(character)}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Character sheet render error:', error);
            return '<div class="card"><h2>Error</h2><p>Failed to load character sheet.</p></div>';
        }
    }
    
    /**
     * Render character sheet content
     */
    renderCharacterSheetContent(character) {
        return `<div class="character-section">
                <h3>Ability Scores</h3>
                <div class="ability-scores-grid">
                    ${this.renderAbilityScores(character)}
                </div>
            </div>
            
            <div class="character-section">
                <h3>Combat Statistics</h3>
                <div class="combat-stats">
                    ${this.renderCombatStats(character)}
                </div>
            </div>
            
            <div class="character-section">
                <h3>Saving Throws</h3>
                <div class="saving-throws">
                    ${this.renderSavingThrows(character)}
                </div>
            </div>
            
            <div class="character-section">
                <h3>Equipment & Inventory</h3>
                <div class="equipment">
                    ${this.renderEquipment(character)}
                </div>
            </div>
        `;
    }
    
    /**
     * Render ability scores
     */
    renderAbilityScores(character) {
        const abilities = [
            { name: 'Strength', value: character.strength, short: 'STR'},
            { name: 'Dexterity', value: character.dexterity, short: 'DEX'},
            { name: 'Constitution', value: character.constitution, short: 'CON'},
            { name: 'Intelligence', value: character.intelligence, short: 'INT'},
            { name: 'Wisdom', value: character.wisdom, short: 'WIS'},
            { name: 'Charisma', value: character.charisma, short: 'CHA'}
        ];
        
        return abilities.map(ability => {
            const modifier = this.rulesEngine ? this.rulesEngine.getAbilityModifier(ability.value) : 0;
            return `<div class="ability-score-item">
                    <div class="ability-name">${ability.name}</div>
                    <div class="ability-value">${ability.value}</div>
                    <div class="ability-modifier">${window.BECMIUtils ? window.BECMIUtils.formatModifier(modifier) : modifier}</div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render combat statistics
     */
    renderCombatStats(character) {
        const hpPercentage = (character.current_hp / character.max_hp) * 100;
        const isDead = character.current_hp <= 0;
        const statusClass = isDead ? 'dead' : this.getCharacterStatusClass(hpPercentage);
        
        return `<div class="combat-stat">
                <span class="stat-label">Armor Class:</span>
                <span class="stat-value">${character.armor_class}</span>
            </div>
            <div class="combat-stat">
                <span class="stat-label">THAC0 (Melee):</span>
                <span class="stat-value">${character.thac0_melee}</span>
            </div>
            <div class="combat-stat">
                <span class="stat-label">THAC0 (Ranged):</span>
                <span class="stat-value">${character.thac0_ranged}</span>
            </div>
            <div class="combat-stat-hp">
                <div class="hp-header">
                    <span class="stat-label">Hit Points:</span>
                    <span class="stat-value hp-value ${statusClass}" data-character-id="${character.character_id}">
                        <span class="current-hp">${character.current_hp}</span> / ${character.max_hp}
                    </span>
                </div>
                <div class="hp-controls">
                    <button class="btn btn-sm btn-danger hp-btn" data-action="damage" data-character-id="${character.character_id}" title="Take damage">
                        <i class="fas fa-minus"></i> Damage
                    </button>
                    <input type="number" class="hp-input" id="hp-input-${character.character_id}" min="1" max="99" value="1" placeholder="Amount">
                    <button class="btn btn-sm btn-success hp-btn" data-action="heal" data-character-id="${character.character_id}" title="Heal">
                        <i class="fas fa-plus"></i> Heal
                    </button>
                </div>
                <div class="hp-bar">
                    <div class="hp-fill ${statusClass}" style="width: ${Math.max(0, hpPercentage)}%"></div>
                </div>
                ${isDead ? '<div class="hp-status-dead"><i class="fas fa-skull"></i> DEAD</div>' : ''}
            </div>
        `;
    }
    
    /**
     * Render saving throws
     */
    renderSavingThrows(character) {
        const saves = [
            { name: 'Death Ray', value: character.save_death_ray },
            { name: 'Magic Wand', value: character.save_magic_wand },
            { name: 'Paralysis', value: character.save_paralysis },
            { name: 'Dragon Breath', value: character.save_dragon_breath },
            { name: 'Spells', value: character.save_spells }
        ];
        
        return saves.map(save => `<div class="saving-throw">
                <span class="save-name">${save.name}:</span>
                <span class="save-value">${save.value}</span>
            </div>
        `).join('');
    }
    
    /**
     * Render equipment and inventory
     * 
     * @param {object} character - Character data
     * @returns {string} HTML for equipment section
     */
    renderEquipment(character) {
        if (!this.currentInventory || this.currentInventory.length === 0) {
            return `<div class="equipment-empty">
                <i class="fas fa-box-open fa-2x"></i>
                <p>No items in inventory</p>
                <p class="help-text">Purchase equipment during character creation or acquire items during adventures.</p>
            </div>`;
        }
        
        // Separate equipped and unequipped items
        const equippedItems = this.currentInventory.filter(item => item.is_equipped);
        const unequippedItems = this.currentInventory.filter(item => !item.is_equipped);
        
        // Calculate encumbrance
        const strength = character.strength || 10;
        const maxEncumbrance = strength * 10; // BECMI: STR x 10 cn
        const currentEncumbrance = this.inventoryStats.total_weight_cn;
        const encumbrancePercent = (currentEncumbrance / maxEncumbrance) * 100;
        
        let encumbranceClass = 'normal';
        if (encumbrancePercent > 100) encumbranceClass = 'overloaded';
        else if (encumbrancePercent > 75) encumbranceClass = 'heavy';
        
        return `
            <div class="equipment-summary">
                <div class="encumbrance-bar ${encumbranceClass}">
                    <div class="encumbrance-label">
                        <i class="fas fa-weight-hanging"></i>
                        <span>Encumbrance: ${currentEncumbrance} / ${maxEncumbrance} cn</span>
                    </div>
                    <div class="encumbrance-bar-track">
                        <div class="encumbrance-bar-fill" style="width: ${Math.min(encumbrancePercent, 100)}%"></div>
                    </div>
                </div>
            </div>
            
            ${equippedItems.length > 0 ? `
                <div class="equipment-section">
                    <h4><i class="fas fa-hand-holding"></i> Equipped Items</h4>
                    <div class="equipment-list equipped">
                        ${equippedItems.map(item => this.renderEquipmentItem(item, character.character_id)).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${unequippedItems.length > 0 ? `
                <div class="equipment-section">
                    <h4><i class="fas fa-backpack"></i> Inventory</h4>
                    <div class="equipment-list">
                        ${unequippedItems.map(item => this.renderEquipmentItem(item, character.character_id)).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
    
    /**
     * Render individual equipment item
     * 
     * @param {object} item - Inventory item
     * @param {number} characterId - Character ID
     * @returns {string} HTML for equipment item
     */
    renderEquipmentItem(item, characterId) {
        const iconMap = {
            'weapon': 'fa-sword',
            'armor': 'fa-shield-alt',
            'shield': 'fa-shield',
            'gear': 'fa-tools',
            'consumable': 'fa-flask',
            'treasure': 'fa-gem'
        };
        const icon = iconMap[item.item_type] || 'fa-cube';
        
        return `
            <div class="equipment-item ${item.is_equipped ? 'equipped' : ''}">
                <div class="item-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="item-details">
                    <div class="item-name">
                        ${item.name}
                        ${item.quantity > 1 ? `<span class="item-quantity">x${item.quantity}</span>` : ''}
                        ${item.is_magical ? '<i class="fas fa-magic magical-indicator" title="Magical Item"></i>' : ''}
                    </div>
                    <div class="item-stats">
                        ${item.damage_die ? `<span class="stat-badge"><i class="fas fa-bullseye"></i> ${item.damage_die}</span>` : ''}
                        ${item.ac_bonus > 0 ? `<span class="stat-badge"><i class="fas fa-shield"></i> AC +${item.ac_bonus}</span>` : ''}
                        <span class="stat-badge weight"><i class="fas fa-weight"></i> ${item.total_weight_cn} cn</span>
                    </div>
                    ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm ${item.is_equipped ? 'btn-warning' : 'btn-success'}" 
                            data-action="toggle-equip" 
                            data-character-id="${characterId}"
                            data-item-id="${item.item_id}"
                            data-equipped="${item.is_equipped}">
                        <i class="fas ${item.is_equipped ? 'fa-times' : 'fa-check'}"></i>
                        ${item.is_equipped ? 'Unequip' : 'Equip'}
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Character card actions
        $(document).on('click', '[data-action="view-character"]', (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            this.viewCharacter(characterId);
        });
        
        $(document).on('click', '[data-action="edit-character"]', (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            this.editCharacter(characterId);
        });
        
        $(document).on('click', '[data-action="delete-character"]', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            await this.deleteCharacter(characterId);
        });
        
        // Create character button
        $(document).on('click', '#create-character-btn', (e) => {
            e.preventDefault();
            if (this.app.modules.characterCreation) {
                this.app.modules.characterCreation.showModal();
            } else {
                this.app.showError('Character creation module not available');
            }
        });
        
        // HP tracking buttons
        $(document).on('click', '.hp-btn', async (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const action = $btn.data('action');
            const characterId = $btn.data('character-id');
            const $input = $(`#hp-input-${characterId}`);
            const amount = parseInt($input.val()) || 1;
            
            if (amount <= 0) {
                this.app.showError('Amount must be greater than 0');
                return;
            }
            
            const hpChange = action === 'damage' ? -amount : amount;
            const reason = action === 'damage' ? `Took ${amount} damage` : `Healed ${amount} HP`;
            
            console.log(`HP ${action}: ${hpChange} for character ${characterId}`);
            
            try {
                await this.updateHP(characterId, hpChange, reason);
                
                // Reset input
                $input.val(1);
                
            } catch (error) {
                console.error('HP update failed:', error);
                this.app.showError('Failed to update HP: ' + error.message);
            }
        });
        
        // Equipment equip/unequip toggle
        $(document).on('click', '[data-action="toggle-equip"]', async (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const characterId = $btn.data('character-id');
            const itemId = $btn.data('item-id');
            const isEquipped = $btn.data('equipped');
            
            try {
                await this.toggleEquip(characterId, itemId, !isEquipped);
            } catch (error) {
                console.error('Toggle equip failed:', error);
                this.app.showError('Failed to equip/unequip item: ' + error.message);
            }
        });
    }
    
    /**
     * View character details
     */
    async viewCharacter(characterId) {
        try {
            const content = await this.renderCharacterSheet(characterId);
            $('#content-area').html(content);
            
            // Update navigation
            $('.nav-link').removeClass('active');
            $('.nav-link[data-view="characters"]').addClass('active');
            
        } catch (error) {
            console.error('Failed to view character:', error);
            this.app.showError('Failed to load character details');
        }
    }
    
    /**
     * Edit character
     */
    async editCharacter(characterId) {
        try {
            console.log(`Opening edit modal for character ${characterId}`);
            
            // Load character if not already loaded
            let character;
            if (this.currentCharacter && this.currentCharacter.character_id == characterId) {
                character = this.currentCharacter;
            } else {
                character = await this.loadCharacter(characterId);
            }
            
            // Show modal with edit form
            this.showEditModal(character);
            
        } catch (error) {
            console.error('Failed to open character edit:', error);
            this.app.showError('Failed to load character for editing');
        }
    }
    
    /**
     * Delete character with confirmation
     * 
     * @param {number} characterId - ID of character to delete
     */
    async deleteCharacter(characterId) {
        try {
            // Simple confirmation (we don't need to load the character)
            const confirmMessage = `Are you sure you want to delete this character?\n\nThis action cannot be undone.`;
            if (!confirm(confirmMessage)) {
                return;
            }
            
            console.log(`Deleting character ${characterId}`);
            
            // Call delete API
            const response = await this.apiClient.post('/api/character/delete.php', {
                character_id: characterId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Character deleted successfully');
                
                // Emit event
                if (this.app.eventBus && window.BECMI_EVENTS) {
                    this.app.eventBus.emit(window.BECMI_EVENTS.CHARACTER_DELETED, { characterId });
                }
                
                // Refresh character list
                if (this.app.loadUserData) {
                    await this.app.loadUserData();
                }
                
                // Navigate back to characters view
                if (this.app.navigateToView) {
                    this.app.navigateToView('characters');
                }
            } else {
                this.app.showError(response.message || 'Failed to delete character');
            }
            
        } catch (error) {
            console.error('Failed to delete character:', error);
            this.app.showError('Failed to delete character: ' + error.message);
        }
    }
    
    /**
     * Show character edit modal
     */
    showEditModal(character) {
        const editForm = this.renderEditForm(character);
        $('#character-edit-content').html(editForm);
        $('#character-edit-modal').show();
        
        // Setup form handlers
        this.setupEditFormHandlers(character.character_id);
    }
    
    /**
     * Hide character edit modal
     */
    hideEditModal() {
        $('#character-edit-modal').hide();
        $('#character-edit-content').empty();
    }
    
    /**
     * Render character edit form
     */
    renderEditForm(character) {
        return `<form id="character-edit-form" class="character-form">
                <div class="form-section">
                    <h3>Basic Information</h3>
                    
                    <div class="form-group">
                        <label for="edit-character-name">Character Name:</label>
                        <input type="text" id="edit-character-name" name="character_name" value="${character.character_name}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-alignment">Alignment:</label>
                            <select id="edit-alignment" name="alignment" required>
                                <option value="lawful" ${character.alignment === 'lawful' ? 'selected' : ''}>Lawful</option>
                                <option value="neutral" ${character.alignment === 'neutral' ? 'selected' : ''}>Neutral</option>
                                <option value="chaotic" ${character.alignment === 'chaotic' ? 'selected' : ''}>Chaotic</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-age">Age:</label>
                            <input type="number" id="edit-age" name="age" value="${character.age || ''}" min="16" max="200">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Physical Attributes</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-height">Height:</label>
                            <input type="text" id="edit-height" name="height" value="${character.height || ''}" placeholder="e.g., 5'8&quot;">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-weight">Weight:</label>
                            <input type="text" id="edit-weight" name="weight" value="${character.weight || ''}" placeholder="e.g., 150 lbs">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-hair-color">Hair Color:</label>
                            <input type="text" id="edit-hair-color" name="hair_color" value="${character.hair_color || ''}" placeholder="e.g., Brown">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-eye-color">Eye Color:</label>
                            <input type="text" id="edit-eye-color" name="eye_color" value="${character.eye_color || ''}" placeholder="e.g., Blue">
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Background</h3>
                    
                    <div class="form-group">
                        <label for="edit-background">Character Background:</label>
                        <textarea id="edit-background" name="background" rows="4" placeholder="Describe your character's background, personality, and appearance...">${character.background || ''}</textarea>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>Currency</h3>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-gold">Gold Pieces:</label>
                            <input type="number" id="edit-gold" name="gold_pieces" value="${character.gold_pieces || 0}" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-silver">Silver Pieces:</label>
                            <input type="number" id="edit-silver" name="silver_pieces" value="${character.silver_pieces || 0}" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-copper">Copper Pieces:</label>
                            <input type="number" id="edit-copper" name="copper_pieces" value="${character.copper_pieces || 0}" min="0">
                        </div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="save-character">Save Changes</button>
                </div>
            </form>
        `;
    }
    
    /**
     * Setup edit form event handlers
     */
    setupEditFormHandlers(characterId) {
        // Cancel button
        $('#cancel-edit').off('click').on('click', () => {
            this.hideEditModal();
        });
        
        // Form submission
        $('#character-edit-form').off('submit').on('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Collect form data
                const formData = {
                    character_id: characterId,
                    character_name: $('#edit-character-name').val().trim(),
                    alignment: $('#edit-alignment').val(),
                    age: $('#edit-age').val() || null,
                    height: $('#edit-height').val().trim() || null,
                    weight: $('#edit-weight').val().trim() || null,
                    hair_color: $('#edit-hair-color').val().trim() || null,
                    eye_color: $('#edit-eye-color').val().trim() || null,
                    background: $('#edit-background').val().trim() || null,
                    gold_pieces: parseInt($('#edit-gold').val()) || 0,
                    silver_pieces: parseInt($('#edit-silver').val()) || 0,
                    copper_pieces: parseInt($('#edit-copper').val()) || 0
                };
                
                console.log('Saving character changes:', formData);
                
                // Call update API
                const response = await this.apiClient.put('/api/character/update.php', formData);
                
                if (response.status === 'success') {
                    this.app.showSuccess('Character updated successfully!');
                    this.hideEditModal();
                    
                    // Reload character data
                    await this.loadCharacter(characterId);
                    
                    // Refresh user data (character list)
                    if (this.app.loadUserData) {
                        await this.app.loadUserData();
                    }
                    
                    // Re-render character sheet if we're on that view
                    if (this.app.currentView === 'characters') {
                        const content = await this.renderCharacterSheet(characterId);
                        $('#main-content').html(content);
                    }
                    
                } else {
                    throw new Error(response.message || 'Failed to update character');
                }
                
            } catch (error) {
                console.error('Character update error:', error);
                this.app.showError('Failed to update character: ' + error.message);
            }
        });
    }
    
    /**
     * Update character HP
     */
    async updateHP(characterId, hpChange, reason) {
        try {
            console.log(`Updating HP for character ${characterId}: ${hpChange > 0 ? '+' : ''}${hpChange}`);
            
            const response = await this.apiClient.post('/api/character/update-hp.php', {
                character_id: characterId,
                hp_change: hpChange,
                reason: reason
            });
            
            if (response.status === 'success') {
                const data = response.data;
                
                // Update UI
                const $hpValue = $(`.hp-value[data-character-id="${characterId}"] .current-hp`);
                $hpValue.text(data.new_hp);
                
                // Update HP bar
                const hpPercentage = Math.max(0, data.hp_percentage);
                const statusClass = data.is_dead ? 'dead' : this.getCharacterStatusClass(hpPercentage);
                
                const $hpFill = $hpValue.closest('.combat-stat-hp').find('.hp-fill');
                $hpFill.attr('class', `hp-fill ${statusClass}`);
                $hpFill.css('width', `${hpPercentage}%`);
                
                // Update status class on value
                $hpValue.parent().attr('class', `stat-value hp-value ${statusClass}`);
                
                // Show/hide dead status
                const $deadStatus = $hpValue.closest('.combat-stat-hp').find('.hp-status-dead');
                if (data.is_dead) {
                    if ($deadStatus.length === 0) {
                        $hpValue.closest('.combat-stat-hp').append('<div class="hp-status-dead"><i class="fas fa-skull"></i> DEAD</div>');
                    }
                    this.app.showError(`${reason} - Character is DEAD!`);
                } else {
                    $deadStatus.remove();
                    
                    if (hpChange > 0) {
                        this.app.showSuccess(`${reason} - ${data.new_hp}/${data.max_hp} HP`);
                    } else {
                        this.app.showError(`${reason} - ${data.new_hp}/${data.max_hp} HP remaining`);
                    }
                }
                
                // Update current character if loaded
                if (this.currentCharacter && this.currentCharacter.character_id == characterId) {
                    this.currentCharacter.current_hp = data.new_hp;
                }
                
                console.log(`HP updated successfully: ${data.old_hp} -> ${data.new_hp}`);
                
            } else {
                throw new Error(response.message || 'Failed to update HP');
            }
            
        } catch (error) {
            console.error('Failed to update HP:', error);
            throw error;
        }
    }
    
    /**
     * Toggle equip/unequip item
     * 
     * @param {number} characterId - Character ID
     * @param {number} itemId - Item ID
     * @param {boolean} equip - True to equip, false to unequip
     */
    async toggleEquip(characterId, itemId, equip) {
        try {
            console.log(`${equip ? 'Equipping' : 'Unequipping'} item ${itemId} for character ${characterId}`);
            
            const response = await this.apiClient.post('/api/inventory/equip.php', {
                character_id: characterId,
                item_id: itemId,
                equip: equip
            });
            
            if (response.status === 'success') {
                this.app.showSuccess(response.message);
                
                // Reload character sheet to show updated equipment
                const content = await this.renderCharacterSheet(characterId);
                $('#content-area').html(content);
                
                console.log(`Item ${equip ? 'equipped' : 'unequipped'} successfully`);
                
            } else {
                throw new Error(response.message || 'Failed to equip/unequip item');
            }
            
        } catch (error) {
            console.error('Failed to toggle equip:', error);
            throw error;
        }
    }
    
    /**
     * Initialize character sheet module
     */
    init() {
        this.setupEventHandlers();
        console.log('Character Sheet Module initialized');
    }
}

// Export to window for use in app.js
window.CharacterSheetModule = CharacterSheetModule;
