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
     * Escape HTML to prevent XSS
     * @deprecated Use global escapeHtml() function from utils.js instead
     * 
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        return escapeHtml(text);
    }
    
    /**
     * Load a character by ID
     */
    async loadCharacter(characterId) {
        try {
            console.log(`Loading character ${characterId}...`);
            
            const response = await this.apiClient.get(`/api/character/get.php?id=${characterId}&t=${Date.now()}`);
            
            if (response.status === 'success') {
                this.currentCharacter = response.data.character;
                
                // Load weapon masteries for equipment display
                try {
                    const masteryResponse = await this.apiClient.get(`/api/character/get-weapon-masteries.php?character_id=${characterId}&t=${Date.now()}`);
                    if (masteryResponse.status === 'success') {
                        this.currentCharacter.weapon_masteries = masteryResponse.data.masteries || [];
                        console.log(`Loaded ${this.currentCharacter.weapon_masteries.length} weapon masteries`);
                    }
                } catch (error) {
                    console.warn('Failed to load weapon masteries:', error);
                    this.currentCharacter.weapon_masteries = [];
                }
                
                // Load XP progression
                try {
                    const xpResponse = await this.apiClient.get(`/api/character/get-xp-progression.php?character_id=${characterId}&t=${Date.now()}`);
                    console.log('XP Response:', xpResponse);
                    
                    if (xpResponse.success) {
                        this.currentCharacter.xpProgression = xpResponse.data;
                        console.log(`Loaded XP progression for level ${this.currentCharacter.level}`);
                        console.log('About to call updateXPDisplay with characterId:', characterId);
                        
                        this.updateXPDisplay(characterId);
                        console.log('updateXPDisplay call completed');
                    }
                } catch (error) {
                    console.warn('Failed to load XP progression:', error);
                }
                
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
            
            const response = await this.apiClient.get(`/api/inventory/get.php?character_id=${characterId}&t=${Date.now()}`);
            
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
        
        // Get class-specific colors and icons
        const classInfo = this.getClassInfo(character.class);
        
        return `<div class="character-card elegant-card" data-character-id="${character.character_id}">
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
                        <h3 class="character-name">${character.character_name}</h3>
                        <div class="character-details">
                            <span class="class-badge ${classInfo.color}">
                                <i class="${classInfo.icon}"></i>
                                Level ${character.level} ${character.class}
                            </span>
                            ${character.gender ? `<span class="gender-badge">${character.gender.charAt(0).toUpperCase() + character.gender.slice(1)}</span>` : ''}
                            <span class="alignment-badge ${character.alignment}">${character.alignment}</span>
                        </div>
                        
                        <div class="hp-section">
                            <div class="hp-bar-container">
                                <div class="hp-bar">
                                    <div class="hp-fill ${statusClass}" style="width: ${hpPercentage}%"></div>
                                </div>
                                <span class="hp-text">${character.current_hp}/${character.max_hp} HP</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="ability-grid">
                        <div class="ability-item">
                            <span class="ability-label">STR</span>
                            <span class="ability-value">${character.strength}</span>
                        </div>
                        <div class="ability-item">
                            <span class="ability-label">DEX</span>
                            <span class="ability-value">${character.dexterity}</span>
                        </div>
                        <div class="ability-item">
                            <span class="ability-label">CON</span>
                            <span class="ability-value">${character.constitution}</span>
                        </div>
                        <div class="ability-item">
                            <span class="ability-label">INT</span>
                            <span class="ability-value">${character.intelligence}</span>
                        </div>
                        <div class="ability-item">
                            <span class="ability-label">WIS</span>
                            <span class="ability-value">${character.wisdom}</span>
                        </div>
                        <div class="ability-item">
                            <span class="ability-label">CHA</span>
                            <span class="ability-value">${character.charisma}</span>
                        </div>
                    </div>
                    
                    <div class="session-info">
                        <i class="fas fa-calendar"></i>
                        <span>${character.session_title || 'Unassigned'}</span>
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="btn action-btn view-btn" data-action="view-character" data-character-id="${character.character_id}">
                        <i class="fas fa-eye"></i>
                        <span>View</span>
                    </button>
                    <button class="btn action-btn edit-btn" data-action="edit-character" data-character-id="${character.character_id}">
                        <i class="fas fa-edit"></i>
                        <span>Edit</span>
                    </button>
                    <button class="btn action-btn delete-btn" data-action="delete-character" data-character-id="${character.character_id}">
                        <i class="fas fa-trash"></i>
                        <span>Delete</span>
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
     * Get class-specific styling information
     */
    getClassInfo(className) {
        const classData = {
            'fighter': { color: 'fighter-color', icon: 'fas fa-dice' },
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
     * Render detailed character sheet
     */
    async renderCharacterSheet(characterId) {
        try {
            // Load character data and inventory in parallel for faster loading
            const [character, inventory] = await Promise.all([
                this.loadCharacter(characterId),
                this.loadInventory(characterId)
            ]);
            
            const html = `<div class="character-sheet-container">
                    <div class="character-sheet-header">
                        <div>
                            <h1>${character.character_name}</h1>
                            <div class="character-basic-info">
                                <span>Level ${character.level} ${character.class}</span>
                                ${character.gender ? `<span>${character.gender.charAt(0).toUpperCase() + character.gender.slice(1)}</span>` : ''}
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
            
            // Load weapon masteries, skills, and spells asynchronously after render
            setTimeout(async () => {
                await this.loadAndRenderWeaponMasteries(characterId);
                await this.loadAndRenderSkills(characterId);
                await this.loadAndRenderSpells(characterId);
                
                // Update XP display after DOM is rendered
                if (this.currentCharacter && this.currentCharacter.xpProgression) {
                    this.updateXPDisplay(characterId);
                }
            }, 100);
            
            return html;
            
        } catch (error) {
            console.error('Character sheet render error:', error);
            return '<div class="card"><h2>Error</h2><p>Failed to load character sheet.</p></div>';
        }
    }
    
    /**
     * Render character sheet into a specific container (reusable method)
     * 
     * @param {number} characterId - ID of character to render
     * @param {string} targetSelector - CSS selector for target container
     * @param {object} options - Optional configuration
     * @param {boolean} options.showEditButton - Show edit button (default: true)
     * @param {boolean} options.showBackButton - Show back button (default: false)
     * @param {function} options.onBack - Callback for back button click
     * @returns {Promise<void>}
     */
    async renderCharacterSheetIntoContainer(characterId, targetSelector, options = {}) {
        const {
            showEditButton = true,
            showBackButton = false,
            onBack = null
        } = options;
        
        try {
            const $target = $(targetSelector);
            if (!$target.length) {
                throw new Error(`Target container not found: ${targetSelector}`);
            }
            
            // Show loading state
            $target.html('<div class="loading-spinner"><i class="fas fa-dice-d20 fa-spin"></i><p>Loading character sheet...</p></div>');
            
            // Load character data and inventory in parallel for faster loading
            const [character, inventory] = await Promise.all([
                this.loadCharacter(characterId),
                this.loadInventory(characterId)
            ]);
            
            const html = `<div class="character-sheet-container">
                    <div class="character-sheet-header">
                        <div>
                            <h1>${character.character_name}</h1>
                            <div class="character-basic-info">
                                <span>Level ${character.level} ${character.class}</span>
                                ${character.gender ? `<span>${character.gender.charAt(0).toUpperCase() + character.gender.slice(1)}</span>` : ''}
                                <span>${character.alignment}</span>
                            </div>
                        </div>
                        <div class="character-actions">
                            ${showBackButton && onBack ? `
                                <button class="btn btn-secondary" id="character-sheet-back-btn">
                                    <i class="fas fa-arrow-left"></i> Back
                                </button>
                            ` : ''}
                            ${showEditButton ? `
                                <button class="btn btn-primary" data-action="edit-character" data-character-id="${character.character_id}">
                                    <i class="fas fa-edit"></i> Edit Character
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="character-sheet">
                        ${this.renderCharacterSheetContent(character)}
                    </div>
                </div>
            `;
            
            // Render HTML
            $target.html(html);
            
            // Setup back button handler if needed
            if (showBackButton && onBack) {
                $('#character-sheet-back-btn').on('click', (e) => {
                    e.preventDefault();
                    onBack();
                });
            }
            
            // Load weapon masteries, skills, and spells asynchronously after render
            setTimeout(async () => {
                await this.loadAndRenderWeaponMasteries(characterId);
                await this.loadAndRenderSkills(characterId);
                await this.loadAndRenderSpells(characterId);
                
                // Update XP display after DOM is rendered
                if (this.currentCharacter && this.currentCharacter.xpProgression) {
                    this.updateXPDisplay(characterId);
                }
            }, 100);
            
        } catch (error) {
            console.error('Character sheet render error:', error);
            const $target = $(targetSelector);
            if ($target.length) {
                $target.html('<div class="card"><h2>Error</h2><p>Failed to load character sheet.</p></div>');
            }
            throw error;
        }
    }
    
    /**
     * Render character sheet content
     */
    renderCharacterSheetContent(character) {
        return `<div class="character-section">
                <h3>Ability Scores</h3>
                <div class="ability-scores-container">
                    ${character.portrait_url ? `
                    <div class="character-portrait-section">
                        <div class="character-portrait">
                            <img src="${character.portrait_url}" alt="${character.character_name}" class="character-portrait-img">
                        </div>
                    </div>
                    ` : ''}
                    <div class="ability-scores-grid">
                        ${this.renderAbilityScores(character)}
                    </div>
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
                <h3>Weapon Masteries</h3>
                <div class="weapon-masteries" id="weapon-masteries-section">
                    <div class="loading-spinner">Loading weapon masteries...</div>
                </div>
            </div>
            
            <div class="character-section">
                <h3>General Skills</h3>
                <div class="general-skills" id="general-skills-section">
                    <div class="loading-spinner">Loading skills...</div>
                </div>
            </div>
            
            <div class="character-section" id="spells-section" style="display: none;">
                <h3>Spells & Magic</h3>
                <div class="spells" id="spells-content">
                    <div class="loading-spinner">Loading spells...</div>
                </div>
            </div>
            
            <div class="character-section">
                <h3>Money & Wealth</h3>
                <div class="money-section">
                    ${this.renderMoney(character)}
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
     * Update XP display with loaded progression data
     */
    updateXPDisplay(characterId) {
        console.log('updateXPDisplay called for character:', characterId);
        const character = this.currentCharacter;
        console.log('Character XP Progression:', character.xpProgression);
        if (!character || !character.xpProgression) {
            console.log('No character or XP progression data:', {character: !!character, xpProgression: !!character?.xpProgression});
            return;
        }
        
        const xpData = character.xpProgression;
        console.log('XP Data:', xpData);
        const nextLevelElement = document.getElementById(`xp-next-level-${characterId}`);
        const progressBar = document.querySelector(`[data-character-id="${characterId}"] .xp-progress-bar-fill`);
        const progressBarTrack = document.querySelector(`[data-character-id="${characterId}"] .xp-progress-bar-track`);
        
        console.log('DOM Elements found:', {
            nextLevelElement: !!nextLevelElement,
            progressBar: !!progressBar,
            progressBarTrack: !!progressBarTrack,
            characterId: characterId
        });
        
        if (nextLevelElement && xpData.xp_for_next_level) {
            nextLevelElement.textContent = `${xpData.xp_for_next_level.toLocaleString()} XP for Level ${xpData.next_level}`;
        } else if (nextLevelElement) {
            nextLevelElement.textContent = 'Max Level Reached';
        }
        
        if (progressBar && progressBarTrack) {
            progressBar.style.width = `${xpData.xp_progress_percent}%`;
            if (xpData.can_level_up) {
                progressBar.classList.add('ready');
            } else {
                progressBar.classList.remove('ready');
            }
        }
        
        // Show/hide level up button
        const levelUpBtn = document.querySelector(`[data-character-id="${characterId}"].btn-level-up`);
        if (levelUpBtn) {
            if (xpData.can_level_up) {
                levelUpBtn.style.display = 'inline-block';
                levelUpBtn.innerHTML = `<i class="fas fa-level-up-alt"></i> Level Up to ${xpData.next_level}`;
            } else {
                levelUpBtn.style.display = 'none';
            }
        }
    }
    
    /**
     * Render money/wealth section
     */
    renderMoney(character) {
        const gp = character.gold_pieces || 0;
        const sp = character.silver_pieces || 0;
        const cp = character.copper_pieces || 0;
        
        // Calculate total in gold (1 gp = 10 sp = 100 cp)
        const totalInGold = gp + (sp / 10) + (cp / 100);
        
        return `
            <div class="money-display">
                <div class="money-item gold">
                    <div class="money-icon">💰</div>
                    <div class="money-amount">${gp}</div>
                    <div class="money-label">Gold Pieces</div>
                </div>
                <div class="money-item silver">
                    <div class="money-icon">⚪</div>
                    <div class="money-amount">${sp}</div>
                    <div class="money-label">Silver Pieces</div>
                </div>
                <div class="money-item copper">
                    <div class="money-icon">🟤</div>
                    <div class="money-amount">${cp}</div>
                    <div class="money-label">Copper Pieces</div>
                </div>
                <div class="money-total">
                    <strong>Total Value:</strong> ${totalInGold.toFixed(2)} gp
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
        
        // XP progression will be loaded via API call
        const currentXp = character.experience_points || 0;
        const nextLevel = character.level + 1;
        
        return `<div class="combat-stat">
                <span class="stat-label">Armor Class:</span>
                <span class="stat-value">${character.armor_class}</span>
            </div>
            <div class="combat-stat">
                <span class="stat-label">THAC0:</span>
                <span class="stat-value">${character.thac0 || character.thac0_melee}</span>
            </div>
            ${character.strength_to_hit_bonus !== undefined && character.strength_to_hit_bonus !== 0 ? `
            <div class="combat-stat">
                <span class="stat-label">STR to Hit:</span>
                <span class="stat-value">${character.strength_to_hit_bonus > 0 ? '+' : ''}${character.strength_to_hit_bonus}</span>
            </div>
            ` : ''}
            ${character.dexterity_to_hit_bonus !== undefined && character.dexterity_to_hit_bonus !== 0 ? `
            <div class="combat-stat">
                <span class="stat-label">DEX to Hit:</span>
                <span class="stat-value">${character.dexterity_to_hit_bonus > 0 ? '+' : ''}${character.dexterity_to_hit_bonus}</span>
            </div>
            ` : ''}
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
            <div class="combat-stat-xp">
                <div class="xp-header">
                    <span class="stat-label">Experience Points:</span>
                    <span class="stat-value">${currentXp.toLocaleString()} XP</span>
                </div>
                <div class="xp-progress-display">
                    <div class="xp-progress-label">
                        <span>Level ${character.level}</span>
                        <span id="xp-next-level-${character.character_id}">Loading...</span>
                    </div>
                    <div class="xp-progress-bar-track">
                        <div class="xp-progress-bar-fill" style="width: 0%" data-character-id="${character.character_id}"></div>
                    </div>
                </div>
                <button class="btn btn-success btn-level-up" id="level-up-btn" data-character-id="${character.character_id}" style="display: none;">
                    <i class="fas fa-level-up-alt"></i> Level Up to ${nextLevel}
                </button>
            </div>
        `;
    }
    
    /**
     * Render saving throws
     */
    renderSavingThrows(character) {
        const saves = [
            { name: 'Death Ray', value: character.save_death_ray, key: 'death_ray' },
            { name: 'Magic Wand', value: character.save_magic_wand, key: 'magic_wand' },
            { name: 'Paralysis', value: character.save_paralysis, key: 'paralysis' },
            { name: 'Dragon Breath', value: character.save_dragon_breath, key: 'dragon_breath' },
            { name: 'Spells', value: character.save_spells, key: 'spells' }
        ];
        
        return saves.map(save => `<div class="saving-throw">
                <div class="save-info">
                    <span class="save-name">${save.name}:</span>
                    <span class="save-value">${save.value}</span>
                </div>
                <button class="btn btn-xs btn-secondary saving-throw-roll-btn" 
                        data-save-name="${this.escapeHtml(save.name)}" 
                        data-save-value="${save.value}"
                        data-save-key="${save.key}">
                    <i class="fas fa-dice-d20"></i> Roll
                </button>
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
        
        // Calculate encumbrance using BECMI rules
        const strength = character.strength || 10;
        const currentEncumbrance = this.inventoryStats.total_weight_cn;
        
        // Use BECMI rules engine to calculate movement rates
        let movementData;
        if (this.app.modules.becmiRules) {
            console.log('Using BECMI rules engine for movement calculation');
            movementData = this.app.modules.becmiRules.calculateMovementRates({
                ...character,
                inventory: this.currentInventory
            });
            console.log('Movement data from BECMI rules:', movementData);
        } else {
            console.log('BECMI rules engine not available, using fallback');
            // Fallback calculation based on BECMI rules
            if (currentEncumbrance <= 400) {
                movementData = { normal: 120, encounter: 40, running: 120, status: 'unencumbered', weight: currentEncumbrance, limit: 400 };
            } else if (currentEncumbrance <= 800) {
                movementData = { normal: 90, encounter: 30, running: 90, status: 'lightly_encumbered', weight: currentEncumbrance, limit: 800 };
            } else if (currentEncumbrance <= 1200) {
                movementData = { normal: 60, encounter: 20, running: 60, status: 'heavily_encumbered', weight: currentEncumbrance, limit: 1200 };
            } else if (currentEncumbrance <= 1600) {
                movementData = { normal: 30, encounter: 10, running: 30, status: 'severely_encumbered', weight: currentEncumbrance, limit: 1600 };
            } else if (currentEncumbrance <= 2400) {
                movementData = { normal: 15, encounter: 5, running: 15, status: 'overloaded', weight: currentEncumbrance, limit: 2400 };
            } else {
                movementData = { normal: 0, encounter: 0, running: 0, status: 'immobile', weight: currentEncumbrance, limit: 2400 };
            }
        }
        
        let encumbranceClass = movementData.status || 'unencumbered';
        
        return `
            <div class="equipment-summary">
                <div class="encumbrance-bar ${encumbranceClass}">
                    <div class="encumbrance-label">
                        <i class="fas fa-weight-hanging"></i>
                        <span>Encumbrance: ${currentEncumbrance} / ${movementData.limit} cn</span>
                    </div>
                    <div class="encumbrance-bar-track">
                        <div class="encumbrance-bar-fill" style="width: ${Math.min((currentEncumbrance / movementData.limit) * 100, 100)}%"></div>
                    </div>
                </div>
                <div class="movement-rates">
                    <div class="movement-rate-item">
                        <i class="fas fa-walking"></i>
                        <span>Normal: ${movementData.normal}'</span>
                    </div>
                    <div class="movement-rate-item">
                        <i class="fas fa-running"></i>
                        <span>Encounter: ${movementData.encounter}'</span>
                    </div>
                    <div class="movement-rate-item">
                        <i class="fas fa-fire"></i>
                        <span>Running: ${movementData.running || movementData.normal}'</span>
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
     * Render individual equipment item with enhanced magical highlighting and details
     * 
     * @param {object} item - Inventory item
     * @param {number} characterId - Character ID
     * @returns {string} HTML for equipment item
     */
    renderEquipmentItem(item, characterId) {
        const iconMap = {
            'weapon': 'fa-dice',
            'armor': 'fa-shield-alt',
            'shield': 'fa-shield',
            'gear': 'fa-tools',
            'consumable': 'fa-flask',
            'treasure': 'fa-gem',
            'mount': 'fa-horse',
            'vehicle': 'fa-car',
            'ship': 'fa-ship',
            'siege_weapon': 'fa-catapult'
        };
        const icon = iconMap[item.item_type] || 'fa-cube';
        
        // Determine magical highlighting class
        const magicalClass = item.is_magical ? 'magical-item' : '';
        const magicalBonus = item.magical_bonus || 0;
        const effectiveDamage = this.calculateEffectiveDamage(item);
        const effectiveAC = this.calculateEffectiveAC(item);
        
        // Get weapon mastery info if it's a weapon
        const weaponMastery = this.getWeaponMasteryForItem(item, characterId);
        
        return `
            <div class="equipment-item ${item.is_equipped ? 'equipped' : ''} ${magicalClass}" 
                 data-item-id="${item.item_id}" 
                 data-character-id="${characterId}">
                <div class="item-icon ${magicalClass}">
                    <i class="fas ${icon}"></i>
                    ${item.is_magical ? '<div class="magical-glow"></div>' : ''}
                </div>
                <div class="item-details">
                    <div class="item-name">
                        <span class="item-name-text" data-action="view-item-details" style="cursor: pointer;">
                            ${item.custom_name || item.name}
                        </span>
                        ${item.quantity > 1 ? `<span class="item-quantity">x${item.quantity}</span>` : ''}
                        ${item.is_magical ? `<span class="magical-badge">+${magicalBonus}</span>` : ''}
                        ${item.identified === false ? '<span class="unidentified-badge">?</span>' : ''}
                        ${item.attunement_status === 'attuned' ? '<i class="fas fa-link attuned-indicator" title="Attuned"></i>' : ''}
                        ${item.attunement_status === 'cursed' ? '<i class="fas fa-skull cursed-indicator" title="Cursed"></i>' : ''}
                    </div>
                    <div class="item-stats">
                        ${item.damage_die ? `
                            <span class="stat-badge damage">
                                <i class="fas fa-bullseye"></i> 
                                ${effectiveDamage}
                                ${weaponMastery ? `<small class="mastery-bonus">(${weaponMastery.level})</small>` : ''}
                                <button class="damage-roll-btn" 
                                        data-damage-die="${item.damage_die}" 
                                        data-magical-bonus="${item.magical_bonus || 0}"
                                        data-mastery-bonus="${weaponMastery ? weaponMastery.damage_bonus : 0}"
                                        data-item-name="${this.escapeHtml(item.custom_name || item.name)}"
                                        title="Roll damage">
                                    <i class="fas fa-dice"></i>
                                </button>
                            </span>
                        ` : ''}
                        ${item.ac_bonus > 0 ? `
                            <span class="stat-badge ac">
                                <i class="fas fa-shield"></i> AC +${effectiveAC}
                            </span>
                        ` : ''}
                        <span class="stat-badge weight">
                            <i class="fas fa-weight"></i> ${item.total_weight_cn} cn
                        </span>
                        ${item.charges_remaining ? `
                            <span class="stat-badge charges">
                                <i class="fas fa-bolt"></i> ${item.charges_remaining} charges
                            </span>
                        ` : ''}
                    </div>
                    ${item.notes ? `<div class="item-notes"><small><i class="fas fa-sticky-note"></i> ${item.notes}</small></div>` : ''}
                </div>
                <div class="item-actions">
                    ${item.identified === false && item.is_magical ? `
                        <button class="btn btn-sm btn-info" 
                                data-action="identify-item" 
                                data-character-id="${characterId}"
                                data-item-id="${item.item_id}"
                                title="Identify Item">
                            <i class="fas fa-search"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm ${item.is_equipped ? 'btn-warning' : 'btn-success'}" 
                            data-action="toggle-equip" 
                            data-character-id="${characterId}"
                            data-item-id="${item.item_id}"
                            data-equipped="${item.is_equipped}">
                        <i class="fas ${item.is_equipped ? 'fa-times' : 'fa-check'}"></i>
                        ${item.is_equipped ? 'Unequip' : 'Equip'}
                    </button>
                    <button class="btn btn-sm btn-secondary" 
                            data-action="view-item-details"
                            data-item-id="${item.item_id}"
                            data-character-id="${characterId}"
                            title="View Details">
                        <i class="fas fa-info"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Calculate effective damage including magical and mastery bonuses
     * 
     * @param {Object} item - Equipment item
     * @returns {string} Formatted damage string
     */
    calculateEffectiveDamage(item) {
        if (!item.damage_die) return '';
        
        let damage = item.damage_die;
        let bonus = 0;
        
        // Add magical bonus
        if (item.magical_bonus) {
            bonus += item.magical_bonus;
        }
        
        // Add weapon mastery bonus
        const mastery = this.getWeaponMasteryForItem(item, this.currentCharacter?.character_id);
        if (mastery && mastery.damage_bonus) {
            bonus += mastery.damage_bonus;
        }
        
        if (bonus > 0) {
            damage += `+${bonus}`;
        }
        
        return damage;
    }

    /**
     * Calculate effective AC bonus including magical bonuses
     * 
     * @param {Object} item - Equipment item
     * @returns {number} Effective AC bonus
     */
    calculateEffectiveAC(item) {
        let ac = item.ac_bonus || 0;
        
        // Add magical bonus for armor/shields
        if (item.magical_bonus && (item.item_type === 'armor' || item.item_type === 'shield')) {
            ac += item.magical_bonus;
        }
        
        return ac;
    }

    /**
     * Get weapon mastery information for an item
     * 
     * @param {Object} item - Equipment item
     * @param {number} characterId - Character ID
     * @returns {Object|null} Weapon mastery info or null
     */
    getWeaponMasteryForItem(item, characterId) {
        // Check if this is a weapon item
        if (item.item_type !== 'weapon') {
            return null;
        }
        
        // Check if we have weapon mastery data loaded
        if (!this.currentCharacter || !this.currentCharacter.weapon_masteries) {
            return null;
        }
        
        // Find matching weapon mastery
        const mastery = this.currentCharacter.weapon_masteries.find(wm => {
            // Direct match by item_id
            if (wm.item_id === item.item_id) {
                return true;
            }
            
            // For magical weapons, check if they link to a mastered base weapon
            if (item.base_item_id && wm.base_item_id === item.base_item_id) {
                return true;
            }
            
            // Name-based matching (fallback)
            return wm.weapon_name === item.name || 
                   wm.weapon_name === item.custom_name ||
                   (item.base_item_id && wm.base_weapon_name === item.name);
        });
        
        return mastery || null;
    }

    /**
     * Show item details modal
     * 
     * @param {Object} item - Item to display
     * @param {number} characterId - Character ID
     */
    async showItemDetailsModal(item, characterId) {
        try {
            // Get full item details from API
            const response = await this.apiClient.get(`/api/items/magical-variants.php?base_item_id=${item.base_item_id || item.item_id}&t=${Date.now()}`);
            const itemDetails = response.data.base_item || item;
            
            const modal = $(`
                <div class="modal" id="itemDetailsModal">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h2>
                                <i class="fas fa-info-circle"></i> 
                                ${item.custom_name || item.name}
                                ${item.is_magical ? '<span class="badge badge-purple">Magical</span>' : ''}
                            </h2>
                            <button type="button" class="modal-close" onclick="$(this).closest('.modal').removeClass('show')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="item-details-full">
                                ${this.renderFullItemDetails(item, itemDetails, characterId)}
                            </div>
                        </div>
                        <div class="modal-footer">
                            ${item.identified === false && item.is_magical ? `
                                <button type="button" class="btn btn-info" id="identify-item-btn">
                                    <i class="fas fa-search"></i> Identify Item
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary" onclick="$(this).closest('.modal').removeClass('show')">Close</button>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            // Use custom modal system - add 'show' class
            $('#itemDetailsModal').addClass('show');
            
            // Setup identify button if present
            if (item.identified === false && item.is_magical) {
                $('#identify-item-btn').on('click', async () => {
                    await this.identifyItem(item.item_id, characterId);
                });
            }
            
            // Cleanup when modal is closed - listen for click on background or close button
            $('#itemDetailsModal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#itemDetailsModal').removeClass('show');
                    setTimeout(() => $('#itemDetailsModal').remove(), 300);
                }
            });
            
        } catch (error) {
            console.error('Failed to show item details:', error);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to load item details', 'error');
            }
        }
    }

    /**
     * Show skill description modal
     * 
     * @param {string} skillName - Name of the skill
     * @param {string} skillDescription - Full description of the skill
     */
    async showSkillDescriptionModal(skillName, skillDescription) {
        // Remove any existing modal first
        $('#skillDescriptionModal').remove();
        
        // Fetch full description from Rules Cyclopedia
        let fullDescription = skillDescription;
        try {
            const response = await this.apiClient.get(`/api/skills/get-full-description.php?skill_name=${encodeURIComponent(skillName)}&t=${Date.now()}`);
            if (response.status === 'success' && response.data.full_description) {
                fullDescription = response.data.full_description;
            }
        } catch (error) {
            console.warn('Failed to fetch full skill description, using database description:', error);
        }
        
        const modal = $(`
            <div class="modal" id="skillDescriptionModal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>
                            <i class="fas fa-scroll"></i> 
                            ${this.escapeHtml(skillName)}
                        </h2>
                        <button type="button" class="modal-close" id="close-skill-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="skill-description-full">
                            <div class="skill-description-content">
                                ${fullDescription.split('\n\n').map(para => 
                                    `<p>${this.escapeHtml(para.trim())}</p>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="close-skill-modal-btn">Close</button>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        // Use custom modal system - add 'show' class
        $('#skillDescriptionModal').addClass('show');
        
        // Setup close handlers
        const closeModal = () => {
            $('#skillDescriptionModal').removeClass('show');
            setTimeout(() => $('#skillDescriptionModal').remove(), 300);
        };
        
        $('#close-skill-modal, #close-skill-modal-btn').on('click', closeModal);
        
        // Cleanup when modal is closed - listen for click on background
        $('#skillDescriptionModal').on('click', (e) => {
            if (e.target === e.currentTarget) {
                closeModal();
            }
        });
    }
    
    /**
     * Render full item details for modal
     * 
     * @param {Object} inventoryItem - Item from inventory
     * @param {Object} baseItem - Base item data
     * @param {number} characterId - Character ID
     * @returns {string} HTML for full item details
     */
    renderFullItemDetails(inventoryItem, baseItem, characterId) {
        const item = inventoryItem;
        const base = baseItem;
        
        // Check if image exists (from item or baseItem)
        let imageUrl = (item.image_url && item.image_url.trim() !== '' && item.image_url !== 'null') 
            ? item.image_url 
            : (base.image_url && base.image_url.trim() !== '' && base.image_url !== 'null') 
                ? base.image_url 
                : null;
        
        // Ensure imageUrl starts with / (but don't double it)
        if (imageUrl && !imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
        }
        
        const hasImage = imageUrl !== null;
        
        return `
            <div class="item-details-container">
                <div class="item-header">
                    <div class="item-image-container-large">
                        ${hasImage ? `
                            <div class="item-image-large">
                                <img src="${imageUrl}?v=${Date.now()}" alt="${item.custom_name || item.name}" 
                                     onerror="this.style.display='none'; const icon = this.closest('.item-image-container-large').querySelector('.item-icon-large'); if (icon) icon.style.display='flex';">
                            </div>
                        ` : ''}
                        <div class="item-icon-large ${item.is_magical ? 'magical-item' : ''}" style="display: ${hasImage ? 'none' : 'flex'};">
                            <i class="fas ${this.getItemIcon(item.item_type)}"></i>
                            ${item.is_magical ? '<div class="magical-glow"></div>' : ''}
                        </div>
                    </div>
                    <div class="item-info">
                        <h4>${item.custom_name || item.name}</h4>
                        <p class="item-type">${item.item_type} ${item.item_category ? '(' + item.item_category + ')' : ''}</p>
                    </div>
                </div>
                
                ${item.description ? `
                    <div class="item-description-full">
                        <h6>Description:</h6>
                        <p class="item-description">${item.description}</p>
                    </div>
                ` : ''}
                
                <div class="item-properties">
                    <div class="properties-grid">
                        <div class="property">
                            <label>Cost:</label>
                            <span>${this.formatCost(base.cost_gp)}</span>
                        </div>
                        <div class="property">
                            <label>Weight:</label>
                            <span>${this.formatWeight(item.total_weight_cn)}</span>
                        </div>
                        ${item.damage_die ? `
                        <div class="property">
                            <label>Damage:</label>
                            <span>${this.calculateEffectiveDamage(item)} ${item.damage_type}</span>
                        </div>
                        ` : ''}
                        ${item.ac_bonus ? `
                        <div class="property">
                            <label>AC Bonus:</label>
                            <span>+${this.calculateEffectiveAC(item)}</span>
                        </div>
                        ` : ''}
                        ${item.magical_bonus ? `
                        <div class="property">
                            <label>Magical Bonus:</label>
                            <span>+${item.magical_bonus}</span>
                        </div>
                        ` : ''}
                        ${item.range_short ? `
                        <div class="property">
                            <label>Range:</label>
                            <span>${item.range_short}/${item.range_long} ft</span>
                        </div>
                        ` : ''}
                        ${item.hands_required ? `
                        <div class="property">
                            <label>Hands Required:</label>
                            <span>${item.hands_required}</span>
                        </div>
                        ` : ''}
                        ${item.charges_remaining ? `
                        <div class="property">
                            <label>Charges Remaining:</label>
                            <span>${item.charges_remaining}</span>
                        </div>
                        ` : ''}
                        <div class="property">
                            <label>Quantity:</label>
                            <span>${item.quantity}</span>
                        </div>
                        <div class="property">
                            <label>Status:</label>
                            <span>${item.is_equipped ? 'Equipped' : 'In Inventory'}</span>
                        </div>
                        ${item.identified === false ? `
                        <div class="property">
                            <label>Identification:</label>
                            <span class="unidentified">Unidentified</span>
                        </div>
                        ` : ''}
                        ${item.attunement_status && item.attunement_status !== 'none' ? `
                        <div class="property">
                            <label>Attunement:</label>
                            <span class="attunement-${item.attunement_status}">${item.attunement_status}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                ${item.special_properties ? `
                <div class="item-special-properties">
                    <h6>Special Properties:</h6>
                    <div class="special-properties">
                        <pre>${JSON.stringify(item.special_properties, null, 2)}</pre>
                    </div>
                </div>
                ` : ''}
                
                ${item.magical_properties ? `
                <div class="item-magical-properties">
                    <h6>Magical Properties:</h6>
                    <div class="magical-properties">
                        <pre>${JSON.stringify(item.magical_properties, null, 2)}</pre>
                    </div>
                </div>
                ` : ''}
                
                ${item.notes ? `
                <div class="item-notes">
                    <h6>Notes:</h6>
                    <p>${item.notes}</p>
                </div>
                ` : ''}
                
                ${item.base_item_id ? `
                <div class="item-variants">
                    <h6>Magical Variants Available:</h6>
                    <p>This is a variant of <strong>${base.name}</strong></p>
                </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Get icon for item type
     * 
     * @param {string} itemType - Item type
     * @returns {string} Font Awesome icon class
     */
    getItemIcon(itemType) {
        const iconMap = {
            'weapon': 'fa-dice',
            'armor': 'fa-shield-alt',
            'shield': 'fa-shield',
            'gear': 'fa-tools',
            'consumable': 'fa-flask',
            'treasure': 'fa-gem',
            'mount': 'fa-horse',
            'vehicle': 'fa-car',
            'ship': 'fa-ship',
            'siege_weapon': 'fa-catapult'
        };
        return iconMap[itemType] || 'fa-cube';
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
     * Identify a magical item
     * 
     * @param {number} itemId - Item ID
     * @param {number} characterId - Character ID
     */
    async identifyItem(itemId, characterId) {
        try {
            const response = await this.apiClient.post('/api/inventory/identify.php', {
                character_id: characterId,
                item_id: itemId,
                method: 'spell'
            });
            
            if (response.status === 'success') {
                // Close modal
                $('#itemDetailsModal').removeClass('show');
                setTimeout(() => $('#itemDetailsModal').remove(), 300);
                
                // Show success message
                if (this.app.modules.notifications) {
                    this.app.modules.notifications.show(response.message, 'success');
                }
                
                // Reload character to show updated item
                await this.viewCharacter(characterId);
            } else {
                throw new Error(response.message || 'Failed to identify item');
            }
            
        } catch (error) {
            console.error('Failed to identify item:', error);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to identify item: ' + error.message, 'error');
            }
        }
    }

    /**
     * Load and render weapon masteries
     * 
     * @param {number} characterId - Character ID
     */
    async loadAndRenderWeaponMasteries(characterId) {
        try {
            const response = await this.apiClient.get(
                `/api/character/get-weapon-masteries.php?character_id=${characterId}&t=${Date.now()}`
            );
            
            if (response.status === 'success') {
                const masteries = response.data.masteries || [];
                const html = this.renderWeaponMasteries(masteries);
                $('#weapon-masteries-section').html(html);
            } else {
                $('#weapon-masteries-section').html('<p class="error">Failed to load weapon masteries</p>');
            }
        } catch (error) {
            console.error('Failed to load weapon masteries:', error);
            $('#weapon-masteries-section').html('<p class="error">Error loading weapon masteries</p>');
        }
    }
    
    /**
     * Render weapon masteries
     * 
     * @param {Array} masteries - Array of weapon masteries
     * @returns {string} HTML for weapon masteries
     */
    renderWeaponMasteries(masteries) {
        if (masteries.length === 0) {
            return '<p class="no-data"><i class="fas fa-info-circle"></i> No weapon masteries selected.</p>';
        }
        
        return `<div class="masteries-list">
            ${masteries.map(mastery => `
                <div class="mastery-item">
                    <div class="mastery-weapon">
                        <i class="fas fa-dice"></i>
                        <span class="weapon-name">${mastery.weapon_name}</span>
                        ${mastery.damage_die ? `<span class="weapon-damage">${mastery.damage_die}</span>` : ''}
                    </div>
                    <div class="mastery-rank">
                        <span class="rank-badge ${mastery.mastery_rank}">${mastery.mastery_rank}</span>
                    </div>
                    <div class="mastery-bonuses">
                        <span class="bonus-badge" title="Attack bonus vs Primary targets">
                            <i class="fas fa-bullseye"></i> +${mastery.attack_bonus_primary}
                        </span>
                        <span class="bonus-badge" title="Attack bonus vs Secondary targets">
                            <i class="fas fa-crosshairs"></i> +${mastery.attack_bonus_secondary}
                        </span>
                        <span class="bonus-badge" title="Damage bonus">
                            <i class="fas fa-bolt"></i> +${mastery.damage_bonus}
                        </span>
                    </div>
                    <div class="mastery-level">
                        <small>Learned at level ${mastery.learned_at_level}</small>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }
    
    /**
     * Load and render general skills
     * 
     * @param {number} characterId - Character ID
     */
    async loadAndRenderSkills(characterId) {
        try {
            const response = await this.apiClient.get(
                `/api/character/get-skills.php?character_id=${characterId}&t=${Date.now()}`
            );
            
            if (response.status === 'success') {
                const skills = response.data.skills || [];
                const html = this.renderGeneralSkills(skills);
                $('#general-skills-section').html(html);
            } else {
                $('#general-skills-section').html('<p class="error">Failed to load skills</p>');
            }
        } catch (error) {
            console.error('Failed to load skills:', error);
            $('#general-skills-section').html('<p class="error">Error loading skills</p>');
        }
    }
    
    /**
     * Render general skills
     * 
     * @param {Array} skills - Array of skills
     * @returns {string} HTML for skills
     */
    renderGeneralSkills(skills) {
        if (skills.length === 0) {
            return '<p class="no-data"><i class="fas fa-info-circle"></i> No skills learned.</p>';
        }
        
        // Group skills by governing ability
        const grouped = skills.reduce((acc, skill) => {
            const ability = skill.governing_ability;
            if (!acc[ability]) {
                acc[ability] = [];
            }
            acc[ability].push(skill);
            return acc;
        }, {});
        
        return `<div class="skills-list">
            ${Object.entries(grouped).map(([ability, abilitySkills]) => `
                <div class="skill-group">
                    <h5 class="skill-ability-header">
                        <i class="fas fa-brain"></i> ${ability.charAt(0).toUpperCase() + ability.slice(1)}
                    </h5>
                    <div class="skill-items">
                        ${abilitySkills.map(skill => `
                            <div class="skill-item">
                                <div class="skill-info">
                                    <span class="skill-name">${skill.skill_name}</span>
                                    <span class="skill-ability-score">${skill.ability_score} (${window.BECMIUtils ? window.BECMIUtils.formatModifier(skill.ability_modifier) : skill.ability_modifier})</span>
                                </div>
                                <div class="skill-actions">
                                    ${skill.description ? `
                                        <button class="btn btn-xs btn-info skill-description-btn" 
                                                data-skill-name="${this.escapeHtml(skill.skill_name)}" 
                                                data-skill-description="${this.escapeHtml(skill.description)}"
                                                title="View skill description">
                                            <i class="fas fa-info-circle"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-xs btn-secondary skill-roll-btn" 
                                            data-skill-name="${this.escapeHtml(skill.skill_name)}" 
                                            data-ability-score="${skill.ability_score}" 
                                            data-ability-modifier="${skill.ability_modifier || 0}">
                                        <i class="fas fa-dice-d20"></i> Roll
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>`;
    }
    
    /**
     * Load and render spells
     * 
     * @param {number} characterId - Character ID
     */
    async loadAndRenderSpells(characterId) {
        try {
            // Check if character can cast spells
            const character = this.currentCharacter;
            const spellcastingClasses = ['magic_user', 'cleric', 'elf'];
            
            if (!spellcastingClasses.includes(character.class)) {
                // Hide spells section for non-spellcasting classes
                $('#spells-section').hide();
                return;
            }
            
            // Show spells section
            $('#spells-section').show();
            
            console.log(`Loading spells for character ${characterId}...`);
            
            const response = await this.apiClient.get(
                `/api/spells/get-character-spells.php?character_id=${characterId}&t=${Date.now()}`
            );
            
            if (response.status === 'success') {
                this.currentSpells = response.data.spells || [];
                this.spellsByLevel = response.data.spells_by_level || {};
                this.memorizedByLevel = response.data.memorized_by_level || {};
                
                const html = this.renderSpells(character, response.data);
                $('#spells-content').html(html);
                
                console.log(`Spells loaded: ${this.currentSpells.length} spells`);
            } else {
                $('#spells-content').html('<p class="error">Failed to load spells</p>');
            }
        } catch (error) {
            console.error('Failed to load spells:', error);
            $('#spells-content').html('<p class="error">Error loading spells</p>');
        }
    }
    
    /**
     * Render spells section
     * 
     * @param {Object} character - Character data
     * @param {Object} spellData - Spell data from API
     * @returns {string} HTML for spells section
     */
    renderSpells(character, spellData) {
        const spells = spellData.spells || [];
        const spellsByLevel = spellData.spells_by_level || {};
        const memorizedByLevel = spellData.memorized_by_level || {};
        
        if (spells.length === 0) {
            return `<div class="spells-empty">
                <i class="fas fa-book-spells fa-2x"></i>
                <p>No spells in spellbook</p>
                <p class="help-text">Learn spells during level-up or from scrolls.</p>
            </div>`;
        }
        
        // Calculate available spell slots
        const spellSlots = this.calculateSpellSlots(character);
        
        // Separate memorized and non-memorized spells
        const memorizedSpells = spells.filter(s => s.is_memorized);
        
        return `
            <div class="spells-summary">
                <div class="spell-slots-display">
                    <h4><i class="fas fa-star"></i> Spell Slots</h4>
                    <div class="spell-slots-grid">
                        ${Object.entries(spellSlots).map(([level, slots]) => {
                            const used = memorizedByLevel[level] || 0;
                            const percentage = (used / slots) * 100;
                            return `
                                <div class="spell-slot-level">
                                    <div class="slot-level-header">
                                        <span class="slot-level-number">Level ${level}</span>
                                        <span class="slot-count">${used}/${slots}</span>
                                    </div>
                                    <div class="slot-bar">
                                        <div class="slot-bar-fill" style="width: ${percentage}%"></div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="spell-actions">
                    <button class="btn btn-primary" id="prepare-spells-btn" data-character-id="${character.character_id}">
                        <i class="fas fa-book-open"></i> Prepare Spells
                    </button>
                    <button class="btn btn-secondary" id="long-rest-btn" data-character-id="${character.character_id}">
                        <i class="fas fa-bed"></i> Long Rest
                    </button>
                </div>
            </div>
            
            ${memorizedSpells.length > 0 ? `
                <div class="spells-memorized">
                    <h4><i class="fas fa-brain"></i> Memorized Spells</h4>
                    <div class="memorized-spells-list">
                        ${memorizedSpells.map(spell => this.renderSpellCard(spell, true, character.character_id)).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="spells-spellbook">
                <h4><i class="fas fa-book"></i> Spellbook</h4>
                ${Object.entries(spellsByLevel).map(([level, levelSpells]) => `
                    <div class="spell-level-section">
                        <h5 class="spell-level-header">Level ${level} Spells</h5>
                        <div class="spell-level-list">
                            ${levelSpells.map(spell => this.renderSpellCard(spell, false, character.character_id)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render individual spell card
     * 
     * @param {Object} spell - Spell data
     * @param {boolean} showCastButton - Whether to show cast button
     * @param {number} characterId - Character ID
     * @returns {string} HTML for spell card
     */
    renderSpellCard(spell, showCastButton, characterId) {
        const memorizedClass = spell.is_memorized ? 'spell-memorized' : '';
        
        return `
            <div class="spell-card ${memorizedClass}" data-spell-id="${spell.spell_id}">
                <div class="spell-header">
                    <div class="spell-name-level">
                        <span class="spell-name">${spell.spell_name}</span>
                        <span class="spell-level-badge">Level ${spell.spell_level}</span>
                    </div>
                    ${spell.is_memorized ? '<span class="memorized-badge"><i class="fas fa-check-circle"></i> Memorized</span>' : ''}
                </div>
                <div class="spell-details">
                    <div class="spell-meta">
                        <span><i class="fas fa-clock"></i> ${spell.casting_time}</span>
                        <span><i class="fas fa-crosshairs"></i> ${spell.range}</span>
                        <span><i class="fas fa-hourglass"></i> ${spell.duration}</span>
                    </div>
                    <div class="spell-description">
                        ${spell.description}
                    </div>
                    ${spell.reversible ? `
                        <div class="spell-reverse">
                            <i class="fas fa-exchange-alt"></i> Reversible: ${spell.reverse_name || 'Yes'}
                        </div>
                    ` : ''}
                </div>
                <div class="spell-actions">
                    ${showCastButton ? `
                        <button class="btn btn-sm btn-primary cast-spell-btn" 
                                data-character-id="${characterId}"
                                data-spell-id="${spell.spell_id}"
                                data-spell-name="${spell.spell_name}">
                            <i class="fas fa-magic"></i> Cast Spell
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-info view-spell-details-btn"
                            data-spell-id="${spell.spell_id}">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Calculate spell slots for character
     * 
     * @param {Object} character - Character data
     * @returns {Object} Spell slots by level
     */
    calculateSpellSlots(character) {
        const level = character.level;
        const characterClass = character.class;
        
        if (characterClass === 'magic_user' || characterClass === 'elf') {
            return this.getMagicUserSpellSlots(level);
        } else if (characterClass === 'cleric') {
            return this.getClericSpellSlots(level);
        }
        
        return {};
    }
    
    /**
     * Get magic-user spell slots by level
     */
    getMagicUserSpellSlots(level) {
        const slots = {
            1: [1],
            2: [2],
            3: [2, 1],
            4: [2, 2],
            5: [2, 2],
            6: [2, 2, 1],
            7: [3, 2, 1],
            8: [3, 3, 2],
            9: [3, 3, 2],
            10: [3, 3, 2, 1],
            11: [4, 3, 3, 2],
            12: [4, 4, 3, 2, 1]
        };
        
        const levelSlots = slots[Math.min(level, 12)] || [];
        const result = {};
        levelSlots.forEach((count, index) => {
            result[index + 1] = count;
        });
        return result;
    }
    
    /**
     * Get cleric spell slots by level
     */
    getClericSpellSlots(level) {
        const slots = {
            1: [],
            2: [1],
            3: [2],
            4: [2, 1],
            5: [2, 2],
            6: [2, 2],
            7: [2, 2, 1],
            8: [3, 3, 2],
            9: [3, 3, 2, 1],
            10: [3, 3, 2, 2],
            11: [4, 4, 3, 2, 1],
            12: [4, 4, 3, 3, 2]
        };
        
        const levelSlots = slots[Math.min(level, 12)] || [];
        const result = {};
        levelSlots.forEach((count, index) => {
            result[index + 1] = count;
        });
        return result;
    }
    
    /**
     * Show prepare spells modal
     * 
     * @param {number} characterId - Character ID
     */
    async showPrepareSpellsModal(characterId) {
        try {
            console.log('Opening prepare spells modal for character:', characterId);
            
            const character = this.currentCharacter;
            console.log('Current character:', character);
            
            if (!character) {
                throw new Error('No character data available');
            }
            
            const spells = this.currentSpells || [];
            console.log('Current spells:', spells);
            
            if (spells.length === 0) {
                throw new Error('No spells available for this character');
            }
            
            const spellSlots = this.calculateSpellSlots(character);
            console.log('Calculated spell slots:', spellSlots);
            
            if (!spellSlots || Object.keys(spellSlots).length === 0) {
                throw new Error('No spell slots available for this character class');
            }
            
            console.log('Generating modal HTML...');
            let modalHtml = '';
            
            try {
                const availableSlotsHtml = Object.entries(spellSlots).map(([level, count]) => 
                    `<span class="slot-badge">Level ${level}: ${count} slots</span>`
                ).join('');
                
                const spellsListHtml = this.renderPrepareSpellsList(spells, spellSlots);
                
                modalHtml = `
                    <div class="modal fade" id="prepareSpellsModal" tabindex="-1" role="dialog">
                        <div class="modal-dialog modal-lg" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">
                                        <i class="fas fa-book-open"></i> Prepare Spells
                                    </h5>
                                    <button type="button" class="close" data-dismiss="modal">
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <div class="modal-body">
                                    <div class="prepare-spells-info">
                                        <p>Select which spells to memorize for the day. You have the following spell slots available:</p>
                                        <div class="available-slots">
                                            ${availableSlotsHtml}
                                        </div>
                                    </div>
                                    
                                    <div class="prepare-spells-selection" id="prepare-spells-selection">
                                        ${spellsListHtml}
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <div class="selection-summary" id="selection-summary"></div>
                                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" id="confirm-prepare-spells">Confirm</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                console.log('Modal HTML generated successfully');
            } catch (error) {
                throw new Error('Failed to generate modal HTML: ' + error.message);
            }
            
            const modal = $(modalHtml);
            
            console.log('Modal HTML created, appending to body...');
            $('body').append(modal);
            
            console.log('Showing modal...');
            $('#prepareSpellsModal').show();
            
            console.log('Setting up event handlers...');
            // Setup event handlers after modal is shown with a small delay
            setTimeout(() => {
                this.setupPrepareSpellsHandlers(characterId, spellSlots);
            }, 100);
            
            console.log('Setting up cleanup handler...');
            // Cleanup when modal is closed
            $('#prepareSpellsModal .close, #prepareSpellsModal .btn-secondary').on('click', () => {
                $('#prepareSpellsModal').remove();
            });
            
            console.log('Prepare spells modal opened successfully');
            
        } catch (error) {
            console.error('Failed to show prepare spells modal:', error);
            console.error('Error stack:', error.stack);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to open prepare spells modal', 'error');
            }
        }
    }
    
    /**
     * Render prepare spells list
     */
    renderPrepareSpellsList(spells, spellSlots) {
        console.log('Rendering prepare spells list with:', { spells, spellSlots });
        
        const spellsByLevel = spells.reduce((acc, spell) => {
            const level = spell.spell_level;
            if (!acc[level]) acc[level] = [];
            acc[level].push(spell);
            return acc;
        }, {});
        
        console.log('Spells grouped by level:', spellsByLevel);
        
        const html = Object.entries(spellsByLevel).map(([level, levelSpells]) => `
            <div class="prepare-spell-level-group">
                <h6>Level ${level} Spells (${spellSlots[level] || 0} slots available)</h6>
                <div class="spell-checkboxes">
                    ${levelSpells.map(spell => `
                        <label class="spell-checkbox-label">
                            <input type="checkbox" 
                                   class="spell-checkbox"
                                   data-spell-id="${spell.spell_id}"
                                   data-spell-level="${spell.spell_level}"
                                   ${spell.is_memorized ? 'checked' : ''}>
                            <span class="spell-checkbox-name">${spell.spell_name}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        console.log('Generated spells list HTML:', html);
        return html;
    }
    
    /**
     * Setup prepare spells modal handlers
     */
    setupPrepareSpellsHandlers(characterId, spellSlots) {
        console.log('Setting up prepare spells handlers for character:', characterId, 'with slots:', spellSlots);
        
        const updateSummary = () => {
            console.log('Updating spell selection summary...');
            const selected = {};
            $('.spell-checkbox:checked').each(function() {
                const level = $(this).data('spell-level');
                if (!selected[level]) selected[level] = 0;
                selected[level]++;
            });
            
            let summaryHtml = 'Selected: ';
            let valid = true;
            
            Object.entries(spellSlots).forEach(([level, max]) => {
                const count = selected[level] || 0;
                const colorClass = count > max ? 'text-danger' : 'text-success';
                summaryHtml += `<span class="${colorClass}">L${level}: ${count}/${max}</span> `;
                if (count > max) valid = false;
            });
            
            $('#selection-summary').html(summaryHtml);
            $('#confirm-prepare-spells').prop('disabled', !valid);
            console.log('Summary updated, valid:', valid);
        };
        
        console.log('Binding spell checkbox change events...');
        $('.spell-checkbox').on('change', updateSummary);
        updateSummary();
        
        console.log('Binding confirm button click event...');
        console.log('Confirm button element:', $('#confirm-prepare-spells'));
        console.log('Confirm button exists:', $('#confirm-prepare-spells').length > 0);
        
        $('#confirm-prepare-spells').on('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Confirm prepare spells clicked - EVENT FIRED!');
            const selectedSpellIds = [];
            $('.spell-checkbox:checked').each(function() {
                selectedSpellIds.push($(this).data('spell-id'));
            });
            
            console.log('Selected spell IDs:', selectedSpellIds);
            await this.memorizeSpells(characterId, selectedSpellIds);
        });
        
        console.log('Prepare spells handlers setup complete');
    }
    
    /**
     * Memorize selected spells
     */
    async memorizeSpells(characterId, spellIds) {
        try {
            console.log('memorizeSpells called with:', { characterId, spellIds });
            
            const response = await this.apiClient.post('/api/spells/memorize.php', {
                character_id: characterId,
                spell_ids: spellIds
            });
            
            console.log('API response:', response);
            
            if (response.status === 'success') {
                console.log('Spells memorized successfully, hiding modal...');
                $('#prepareSpellsModal').remove();
                
                if (this.app.modules.notifications) {
                    this.app.modules.notifications.show('Spells memorized successfully', 'success');
                }
                
                // Reload spells
                console.log('Reloading spells...');
                await this.loadAndRenderSpells(characterId);
            } else {
                console.error('API returned error:', response);
                throw new Error(response.message || 'Failed to memorize spells');
            }
        } catch (error) {
            console.error('Failed to memorize spells:', error);
            
            // Log the full response text to see the actual PHP error
            if (error.xhr && error.xhr.responseText) {
                console.error('Full API Error Response:', error.xhr.responseText);
            }
            
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to memorize spells: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * Cast spell
     */
    async castSpell(characterId, spellId, spellName) {
        if (!confirm(`Cast spell: ${spellName}?\n\nThis will remove it from your memorized spells.`)) {
            return;
        }
        
        try {
            const response = await this.apiClient.post('/api/spells/cast.php', {
                character_id: characterId,
                spell_id: spellId
            });
            
            if (response.status === 'success') {
                if (this.app.modules.notifications) {
                    this.app.modules.notifications.show(`Cast spell: ${spellName}`, 'success');
                }
                
                // Reload spells
                await this.loadAndRenderSpells(characterId);
            } else {
                throw new Error(response.message || 'Failed to cast spell');
            }
        } catch (error) {
            console.error('Failed to cast spell:', error);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to cast spell: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * Long rest
     */
    async longRest(characterId) {
        if (!confirm('Take a long rest?\n\nThis will reset all memorized spells.')) {
            return;
        }
        
        try {
            const response = await this.apiClient.post('/api/spells/rest.php', {
                character_id: characterId
            });
            
            if (response.status === 'success') {
                if (this.app.modules.notifications) {
                    this.app.modules.notifications.show('Long rest completed. All spells reset.', 'success');
                }
                
                // Reload spells
                await this.loadAndRenderSpells(characterId);
            } else {
                throw new Error(response.message || 'Failed to complete long rest');
            }
        } catch (error) {
            console.error('Failed to complete long rest:', error);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to complete long rest: ' + error.message, 'error');
            }
        }
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
        
        // View item details
        $(document).on('click', '[data-action="view-item-details"]', async (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const itemId = $btn.data('item-id');
            const characterId = $btn.data('character-id');
            
            try {
                // Find the item in current inventory
                const item = this.currentInventory.find(invItem => invItem.item_id == itemId);
                if (item) {
                    await this.showItemDetailsModal(item, characterId);
                } else {
                    this.app.showError('Item not found in inventory');
                }
            } catch (error) {
                console.error('Failed to show item details:', error);
                this.app.showError('Failed to load item details: ' + error.message);
            }
        });
        
        // View skill description
        $(document).on('click', '.skill-description-btn', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Get the clicked button element directly
            const btn = e.currentTarget;
            // Use getAttribute() to avoid jQuery caching issues
            const skillName = btn.getAttribute('data-skill-name');
            const skillDescription = btn.getAttribute('data-skill-description');
            
            if (skillName) {
                // Decode HTML entities that were escaped
                const decodedName = $('<textarea>').html(skillName).text();
                const decodedDescription = skillDescription ? $('<textarea>').html(skillDescription).text() : '';
                await this.showSkillDescriptionModal(decodedName, decodedDescription);
            } else {
                console.error('Missing skill name:', { skillName, skillDescription, btn });
            }
        });
        
        // Skill roll button
        $(document).on('click', '.skill-roll-btn', (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const skillName = $btn.data('skill-name');
            const abilityScore = parseInt($btn.data('ability-score'));
            const abilityModifier = parseInt($btn.data('ability-modifier')) || 0;
            
            if (!skillName || isNaN(abilityScore)) {
                console.error('Invalid skill roll data:', { skillName, abilityScore, abilityModifier });
                this.app.showError('Invalid skill data');
                return;
            }
            
            if (typeof window.rollSkillCheck === 'function') {
                window.rollSkillCheck(skillName, abilityScore, abilityModifier);
            } else {
                console.error('rollSkillCheck function not found');
                this.app.showError('Roll function not available');
            }
        });
        
        // Saving throw roll button
        $(document).on('click', '.saving-throw-roll-btn', (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const saveName = $btn.data('save-name');
            const saveValue = parseInt($btn.data('save-value'));
            const saveKey = $btn.data('save-key');
            
            if (!saveName || isNaN(saveValue)) {
                console.error('Invalid saving throw roll data:', { saveName, saveValue, saveKey });
                this.app.showError('Invalid saving throw data');
                return;
            }
            
            if (typeof window.rollSavingThrow === 'function') {
                window.rollSavingThrow(saveName, saveValue, saveKey);
            } else {
                console.error('rollSavingThrow function not found');
                this.app.showError('Roll function not available');
            }
        });
        
        // Damage roll button
        $(document).on('click', '.damage-roll-btn', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const damageDie = $btn.data('damage-die');
            const magicalBonus = parseInt($btn.data('magical-bonus')) || 0;
            const masteryBonus = parseInt($btn.data('mastery-bonus')) || 0;
            const itemName = $btn.data('item-name');
            
            if (!damageDie) {
                console.error('Invalid damage roll data:', { damageDie, magicalBonus, masteryBonus });
                this.app.showError('Invalid damage data');
                return;
            }
            
            this.rollDamage(damageDie, magicalBonus, masteryBonus, itemName);
        });
        
        // Identify magical item
        $(document).on('click', '[data-action="identify-item"]', async (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const itemId = $btn.data('item-id');
            const characterId = $btn.data('character-id');
            
            try {
                await this.identifyItem(itemId, characterId);
            } catch (error) {
                console.error('Failed to identify item:', error);
                this.app.showError('Failed to identify item: ' + error.message);
            }
        });
        
        // Spell management buttons
        $(document).on('click', '#prepare-spells-btn', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            await this.showPrepareSpellsModal(characterId);
        });
        
        $(document).on('click', '#long-rest-btn', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            await this.longRest(characterId);
        });
        
        $(document).on('click', '.cast-spell-btn', async (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const characterId = $btn.data('character-id');
            const spellId = $btn.data('spell-id');
            const spellName = $btn.data('spell-name');
            await this.castSpell(characterId, spellId, spellName);
        });
        
        // Level-up button
        $(document).on('click', '#level-up-btn', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            
            if (this.app.modules.levelUpWizard) {
                await this.app.modules.levelUpWizard.showWizard(characterId);
            } else {
                this.app.showError('Level-up wizard not available');
            }
        });
    }
    
    /**
     * View character details
     */
    async viewCharacter(characterId) {
        try {
            await this.renderCharacterSheetIntoContainer(characterId, '#content-area', {
                showEditButton: true,
                showBackButton: false
            });
            
            // Update navigation and current view
            $('.nav-link').removeClass('active');
            $('.nav-link[data-view="characters"]').addClass('active');
            this.app.currentView = 'characters';
            
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
                            <label for="edit-gender">Gender:</label>
                            <select id="edit-gender" name="gender">
                                <option value="">Select Gender</option>
                                <option value="male" ${character.gender === 'male' ? 'selected' : ''}>Male</option>
                                <option value="female" ${character.gender === 'female' ? 'selected' : ''}>Female</option>
                                <option value="other" ${character.gender === 'other' ? 'selected' : ''}>Other/Non-Binary</option>
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
                    <h3>Character Portrait</h3>
                    <div class="portrait-section">
                        <div id="edit-portrait-preview" class="portrait-preview">
                            ${character.portrait_url ? 
                                `<img src="${character.portrait_url}" alt="Character Portrait" class="generated-portrait">` :
                                `<div class="portrait-placeholder">
                                    <i class="fas fa-user fa-3x"></i>
                                    <p>No portrait generated yet</p>
                                </div>`
                            }
                        </div>
                        <div class="portrait-actions">
                            <button type="button" class="btn btn-primary" id="edit-generate-portrait-btn">
                                <i class="fas fa-magic"></i> ${character.portrait_url ? 'Regenerate Portrait' : 'Generate AI Portrait'}
                            </button>
                            <p class="portrait-hint">Fill in gender, hair color, and eye color to generate a portrait</p>
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
        
        // Portrait generation for edit modal
        $('#edit-generate-portrait-btn').off('click').on('click', () => {
            this.generatePortraitForEdit(characterId);
        });
        
        // Check portrait generation readiness
        $('#edit-gender, #edit-hair-color, #edit-eye-color').off('change keyup').on('change keyup', () => {
            this.checkEditPortraitGenerationReady();
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
                    gender: $('#edit-gender').val() || null,
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
     * Check if portrait generation is ready for edit modal
     */
    checkEditPortraitGenerationReady() {
        const gender = $('#edit-gender').val();
        const hairColor = $('#edit-hair-color').val();
        const eyeColor = $('#edit-eye-color').val();
        
        const isReady = gender && hairColor && eyeColor;
        
        $('#edit-generate-portrait-btn').prop('disabled', !isReady);
        
        if (isReady) {
            $('.portrait-hint').text('Click to generate AI portrait');
        } else {
            $('.portrait-hint').text('Fill in gender, hair color, and eye color to generate a portrait');
        }
    }

    /**
     * Generate portrait for existing character (edit modal)
     */
    async generatePortraitForEdit(characterId) {
        try {
            const $btn = $('#edit-generate-portrait-btn');
            const $preview = $('#edit-portrait-preview');
            
            // Disable button and show loading
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Generating...');
            
            $preview.html(`
                <div class="portrait-loading">
                    <i class="fas fa-magic fa-spin fa-3x"></i>
                    <p>Generating your character portrait...</p>
                    <p class="text-muted">This may take 10-30 seconds</p>
                </div>
            `);
            
            // Collect character data for portrait
            const portraitData = {
                character_id: characterId,
                character_name: $('#edit-character-name').val(),
                class: this.currentCharacter ? this.currentCharacter.class : 'fighter', // fallback
                gender: $('#edit-gender').val(),
                age: $('#edit-age').val(),
                hair_color: $('#edit-hair-color').val(),
                eye_color: $('#edit-eye-color').val(),
                background: $('#edit-background').val(),
            };
            
            console.log('Generating portrait for edit with data:', portraitData);
            
            // Call the portrait API
            const response = await this.apiClient.post('/api/character/generate-portrait.php', portraitData);
            
            if (response.status === 'success' && response.data.portrait_url) {
                // Display the generated portrait
                $preview.html(`
                    <img src="${response.data.portrait_url}" alt="Character Portrait" class="generated-portrait">
                `);
                
                $btn.html('<i class="fas fa-sync"></i> Regenerate Portrait');
                
                if (this.app.modules.notifications) {
                    this.app.modules.notifications.show('Portrait generated successfully!', 'success');
                }
            } else {
                throw new Error(response.message || 'Failed to generate portrait');
            }
            
        } catch (error) {
            console.error('Portrait generation failed:', error);
            
            $('#edit-portrait-preview').html(`
                <div class="portrait-error">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger"></i>
                    <p>Failed to generate portrait</p>
                    <p class="text-muted">${error.message}</p>
                </div>
            `);
            
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to generate portrait: ' + error.message, 'error');
            }
        } finally {
            // Re-enable button
            $('#edit-generate-portrait-btn').prop('disabled', false).html('<i class="fas fa-magic"></i> Generate AI Portrait');
        }
    }
    
    /**
     * Roll damage dice
     * 
     * @param {string} damageDie - Damage die string (e.g., "1d6", "1d8+1")
     * @param {number} magicalBonus - Magical bonus to damage
     * @param {number} masteryBonus - Weapon mastery bonus to damage
     * @param {string} itemName - Name of the item
     */
    rollDamage(damageDie, magicalBonus, masteryBonus, itemName) {
        console.log(`Rolling damage for ${itemName}: ${damageDie} + ${magicalBonus} (magical) + ${masteryBonus} (mastery)`);
        
        // Parse damage die (e.g., "1d6", "1d8+1", "2d4")
        const dieMatch = damageDie.match(/(\d+)d(\d+)([+-]\d+)?/);
        if (!dieMatch) {
            console.error('Invalid damage die format:', damageDie);
            this.app.showError(`Invalid damage die format: ${damageDie}`);
            return;
        }
        
        const numDice = parseInt(dieMatch[1]);
        const dieSize = parseInt(dieMatch[2]);
        const dieBonus = dieMatch[3] ? parseInt(dieMatch[3]) : 0;
        
        // Roll dice
        let total = 0;
        const rolls = [];
        for (let i = 0; i < numDice; i++) {
            const roll = Math.floor(Math.random() * dieSize) + 1;
            rolls.push(roll);
            total += roll;
        }
        
        // Add bonuses
        const totalBonus = dieBonus + magicalBonus + masteryBonus;
        const finalDamage = total + totalBonus;
        
        // Build message
        let message = `${itemName}: `;
        if (numDice > 1) {
            message += `[${rolls.join(', ')}]`;
        } else {
            message += rolls[0];
        }
        
        if (totalBonus !== 0) {
            const bonusParts = [];
            if (dieBonus !== 0) bonusParts.push(dieBonus);
            if (magicalBonus !== 0) bonusParts.push(`${magicalBonus} (magical)`);
            if (masteryBonus !== 0) bonusParts.push(`${masteryBonus} (mastery)`);
            message += ` + ${bonusParts.join(' + ')}`;
        }
        
        message += ` = ${finalDamage} damage`;
        
        // Show notification
        if (this.app.modules.notifications) {
            this.app.modules.notifications.show(message, 'success', 5000);
        } else {
            alert(message);
        }
        
        console.log(`Damage roll result: ${message}`);
        
        return {
            rolls: rolls,
            total: total,
            bonus: totalBonus,
            finalDamage: finalDamage,
            message: message
        };
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
