/**
 * BECMI D&D Character Manager - Level Up Wizard Module
 * 
 * Handles complete multi-step level-up process for BECMI characters.
 */

class LevelUpWizard {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.rulesEngine = app.modules.rulesEngine;
        this.currentCharacter = null;
        this.currentStep = 1;
        this.totalSteps = 6;
        this.wizardData = {};
        
        console.log('Level Up Wizard Module initialized');
    }
    
    /**
     * Show level-up wizard for a character
     * 
     * @param {number} characterId - Character ID to level up
     */
    async showWizard(characterId) {
        try {
            // Load character data
            const response = await this.apiClient.get(`/api/character/get.php?id=${characterId}`);
            
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load character');
            }
            
            this.currentCharacter = response.data.character;
            this.currentStep = 1;
            this.wizardData = {
                character_id: characterId,
                new_hp_rolled: null,
                new_spells: [],
                new_skills: [],
                new_weapon_mastery: null
            };
            
            // Show wizard modal
            this.renderWizardModal();
            
        } catch (error) {
            console.error('Failed to show level-up wizard:', error);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to open level-up wizard: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * Render wizard modal
     */
    renderWizardModal() {
        const modal = $(`
            <div class="modal fade" id="levelUpWizardModal" tabindex="-1" role="dialog" data-backdrop="static">
                <div class="modal-dialog modal-xl" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-level-up-alt"></i> Level Up: ${this.currentCharacter.character_name}
                            </h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="wizard-progress">
                                ${this.renderProgressBar()}
                            </div>
                            <div class="wizard-content" id="wizard-content">
                                ${this.renderStep(this.currentStep)}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="wizard-prev" ${this.currentStep === 1 ? 'disabled' : ''}>
                                <i class="fas fa-arrow-left"></i> Previous
                            </button>
                            <button type="button" class="btn btn-primary" id="wizard-next">
                                ${this.currentStep === this.totalSteps ? 'Confirm Level Up' : 'Next'} 
                                <i class="fas fa-arrow-right"></i>
                            </button>
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        $('#levelUpWizardModal').modal('show');
        
        // Setup event handlers
        this.setupWizardHandlers();
        
        // Cleanup when modal is closed
        $('#levelUpWizardModal').on('hidden.bs.modal', () => {
            $('#levelUpWizardModal').remove();
        });
    }
    
    /**
     * Render progress bar
     */
    renderProgressBar() {
        const steps = ['XP Check', 'HP Roll', 'Class Features', 'Spells', 'Skills', 'Confirm'];
        const percentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        
        return `
            <div class="wizard-steps">
                ${steps.map((step, index) => {
                    const stepNum = index + 1;
                    const isActive = stepNum === this.currentStep;
                    const isComplete = stepNum < this.currentStep;
                    return `
                        <div class="wizard-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}">
                            <div class="step-number">${isComplete ? '<i class="fas fa-check"></i>' : stepNum}</div>
                            <div class="step-label">${step}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="wizard-progress-bar">
                <div class="wizard-progress-fill" style="width: ${percentage}%"></div>
            </div>
        `;
    }
    
    /**
     * Render current step
     */
    renderStep(step) {
        switch(step) {
            case 1: return this.renderXPCheckStep();
            case 2: return this.renderHPRollStep();
            case 3: return this.renderClassFeaturesStep();
            case 4: return this.renderSpellsStep();
            case 5: return this.renderSkillsStep();
            case 6: return this.renderConfirmStep();
            default: return '<div>Invalid step</div>';
        }
    }
    
    /**
     * Step 1: XP Check
     */
    renderXPCheckStep() {
        const character = this.currentCharacter;
        const currentLevel = character.level;
        const nextLevel = currentLevel + 1;
        const currentXp = character.experience_points;
        
        const xpThresholds = [
            0, 0, 2000, 4000, 8000, 16000, 32000, 64000, 120000, 240000,
            360000, 480000, 600000
        ];
        
        const xpNeeded = xpThresholds[nextLevel] || 999999999;
        const hasEnoughXp = currentXp >= xpNeeded;
        const xpProgress = (currentXp / xpNeeded) * 100;
        
        return `
            <div class="wizard-step-content">
                <div class="step-icon">
                    <i class="fas fa-star fa-3x"></i>
                </div>
                <h3>Ready to Level Up!</h3>
                
                <div class="xp-status">
                    <div class="xp-current">
                        <span class="label">Current XP:</span>
                        <span class="value">${currentXp.toLocaleString()}</span>
                    </div>
                    <div class="xp-needed">
                        <span class="label">XP for Level ${nextLevel}:</span>
                        <span class="value">${xpNeeded.toLocaleString()}</span>
                    </div>
                    <div class="xp-level">
                        <span class="label">Current Level:</span>
                        <span class="value level-badge">${currentLevel}</span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="value level-badge level-next">${nextLevel}</span>
                    </div>
                </div>
                
                <div class="xp-progress">
                    <div class="xp-progress-bar">
                        <div class="xp-progress-fill ${hasEnoughXp ? 'ready' : ''}" style="width: ${Math.min(xpProgress, 100)}%"></div>
                    </div>
                    <div class="xp-progress-text">
                        ${hasEnoughXp ? 
                            '<i class="fas fa-check-circle text-success"></i> You have enough XP to level up!' : 
                            `<i class="fas fa-info-circle text-warning"></i> Need ${(xpNeeded - currentXp).toLocaleString()} more XP`
                        }
                    </div>
                </div>
                
                <div class="level-up-benefits">
                    <h4>Benefits at Level ${nextLevel}:</h4>
                    <ul>
                        <li><i class="fas fa-heart"></i> Gain additional Hit Points</li>
                        <li><i class="fas fa-shield"></i> Improved THAC0 and Saving Throws</li>
                        ${this.getLevelUpBenefits(character.class, nextLevel).map(b => `<li><i class="fas ${b.icon}"></i> ${b.text}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    /**
     * Step 2: HP Roll
     */
    renderHPRollStep() {
        const character = this.currentCharacter;
        const hitDice = this.getHitDice(character.class);
        const conBonus = this.rulesEngine ? this.rulesEngine.getAbilityModifier(character.constitution) : 0;
        
        // Auto-roll if not already rolled
        if (this.wizardData.new_hp_rolled === null) {
            const dieSize = parseInt(hitDice.substring(2));
            const roll = Math.floor(Math.random() * dieSize) + 1;
            this.wizardData.new_hp_rolled = Math.max(1, roll + conBonus);
        }
        
        const newMaxHp = character.max_hp + this.wizardData.new_hp_rolled;
        
        return `
            <div class="wizard-step-content">
                <div class="step-icon">
                    <i class="fas fa-dice-d20 fa-3x"></i>
                </div>
                <h3>Roll for Hit Points</h3>
                
                <div class="hp-roll-result">
                    <div class="dice-display">
                        <div class="die-roll">
                            <i class="fas fa-dice-d${hitDice.substring(2)}"></i>
                            <span class="roll-formula">${hitDice} + ${conBonus} (CON)</span>
                        </div>
                        <div class="roll-result">
                            <span class="result-label">HP Gained:</span>
                            <span class="result-value">${this.wizardData.new_hp_rolled}</span>
                        </div>
                    </div>
                    
                    <div class="hp-summary">
                        <div class="hp-comparison">
                            <div class="hp-old">
                                <span class="hp-label">Current Max HP:</span>
                                <span class="hp-value">${character.max_hp}</span>
                            </div>
                            <i class="fas fa-arrow-right fa-2x"></i>
                            <div class="hp-new">
                                <span class="hp-label">New Max HP:</span>
                                <span class="hp-value highlight">${newMaxHp}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hp-reroll">
                        <button class="btn btn-secondary" id="reroll-hp-btn">
                            <i class="fas fa-redo"></i> Re-roll HP
                        </button>
                        <p class="help-text">Or enter custom value:</p>
                        <input type="number" id="custom-hp-input" min="1" max="20" placeholder="HP gained" class="form-control">
                        <button class="btn btn-sm btn-info" id="set-custom-hp-btn">Set Custom HP</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Step 3: Class Features
     */
    renderClassFeaturesStep() {
        const character = this.currentCharacter;
        const nextLevel = character.level + 1;
        
        // Calculate new combat stats
        const newThac0 = this.calculateNewTHAC0(character.class, nextLevel);
        const newSaves = this.calculateNewSaves(character.class, nextLevel);
        
        return `
            <div class="wizard-step-content">
                <div class="step-icon">
                    <i class="fas fa-sword fa-3x"></i>
                </div>
                <h3>Class Features & Combat Stats</h3>
                
                <div class="combat-stats-improvement">
                    <h4>Combat Improvements</h4>
                    
                    <div class="stat-comparison-grid">
                        <div class="stat-comparison">
                            <span class="stat-label">THAC0 (Melee):</span>
                            <span class="old-value">${character.thac0_melee}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="new-value">${newThac0.melee}</span>
                            ${newThac0.melee < character.thac0_melee ? '<i class="fas fa-arrow-down improvement"></i>' : ''}
                        </div>
                        
                        <div class="stat-comparison">
                            <span class="stat-label">THAC0 (Ranged):</span>
                            <span class="old-value">${character.thac0_ranged}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="new-value">${newThac0.ranged}</span>
                            ${newThac0.ranged < character.thac0_ranged ? '<i class="fas fa-arrow-down improvement"></i>' : ''}
                        </div>
                    </div>
                    
                    <h4>Saving Throws</h4>
                    <div class="saves-grid">
                        ${Object.entries(newSaves).map(([save, value]) => {
                            const oldValue = character[`save_${save}`];
                            const improved = value < oldValue;
                            return `
                                <div class="save-comparison">
                                    <span class="save-label">${this.formatSaveName(save)}:</span>
                                    <span class="old-value">${oldValue}</span>
                                    <i class="fas fa-arrow-right"></i>
                                    <span class="new-value">${value}</span>
                                    ${improved ? '<i class="fas fa-arrow-down improvement"></i>' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                ${this.renderClassSpecificFeatures(character.class, nextLevel)}
            </div>
        `;
    }
    
    /**
     * Render class-specific features
     */
    renderClassSpecificFeatures(characterClass, nextLevel) {
        if (characterClass === 'fighter' || characterClass === 'dwarf') {
            return `
                <div class="class-features">
                    <h4>Weapon Mastery</h4>
                    <p>As a ${characterClass}, you may select a new weapon mastery or improve an existing one.</p>
                    <div id="weapon-mastery-selection">
                        <p class="help-text">This will be implemented in the next step of character management.</p>
                    </div>
                </div>
            `;
        } else if (characterClass === 'thief' || characterClass === 'halfling') {
            return `
                <div class="class-features">
                    <h4>Thief Skills Improved</h4>
                    <p>Your thief skills have automatically improved based on your new level.</p>
                    <div class="thief-skills-info">
                        <p class="help-text">Check your character sheet for updated thief skill percentages.</p>
                    </div>
                </div>
            `;
        }
        
        return '';
    }
    
    /**
     * Step 4: Spells (for spellcasters)
     */
    renderSpellsStep() {
        const character = this.currentCharacter;
        const spellcastingClasses = ['magic_user', 'cleric', 'elf'];
        
        if (!spellcastingClasses.includes(character.class)) {
            // Skip this step for non-casters
            return `
                <div class="wizard-step-content">
                    <div class="step-icon">
                        <i class="fas fa-info-circle fa-3x"></i>
                    </div>
                    <h3>No New Spells</h3>
                    <p>Your class does not gain spells at this level.</p>
                </div>
            `;
        }
        
        const nextLevel = character.level + 1;
        const newSlots = this.getNewSpellSlots(character.class, nextLevel);
        
        return `
            <div class="wizard-step-content">
                <div class="step-icon">
                    <i class="fas fa-book-magic fa-3x"></i>
                </div>
                <h3>Learn New Spells</h3>
                
                <div class="new-spell-slots">
                    <h4>New Spell Slots at Level ${nextLevel}</h4>
                    <div class="spell-slots-comparison">
                        ${Object.entries(newSlots.new).map(([level, count]) => `
                            <div class="slot-comparison">
                                <span class="slot-label">Level ${level}:</span>
                                <span class="old-value">${newSlots.old[level] || 0}</span>
                                <i class="fas fa-arrow-right"></i>
                                <span class="new-value">${count}</span>
                                ${count > (newSlots.old[level] || 0) ? '<i class="fas fa-arrow-up improvement"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="spell-learning" id="spell-learning-section">
                    ${this.renderSpellLearningUI(character)}
                </div>
            </div>
        `;
    }
    
    /**
     * Render spell learning UI
     */
    renderSpellLearningUI(character) {
        const spellType = character.class === 'cleric' ? 'cleric' : 'magic_user';
        const nextLevel = character.level + 1;
        
        if (character.class === 'cleric') {
            return `
                <div class="cleric-spell-info">
                    <p><i class="fas fa-info-circle"></i> As a Cleric, you automatically know all Cleric spells of levels you can cast.</p>
                    <p class="help-text">No spell selection needed - your spellbook will be automatically updated.</p>
                </div>
            `;
        }
        
        // For magic-users, show spell selection
        return `
            <div class="magic-user-spell-selection">
                <h4>Select New Spells to Learn</h4>
                <p>Choose spells to add to your spellbook. You can learn 1-2 new spells per level.</p>
                
                <div class="spell-selection-filters">
                    <label>
                        Spell Level:
                        <select id="spell-level-filter">
                            <option value="1">Level 1</option>
                            <option value="2">Level 2</option>
                            <option value="3">Level 3</option>
                        </select>
                    </label>
                </div>
                
                <div class="available-spells-list" id="available-spells-list">
                    <div class="loading-spinner">Loading available spells...</div>
                </div>
                
                <div class="selected-spells">
                    <h5>Selected Spells:</h5>
                    <div id="selected-spells-display">
                        <em>No spells selected</em>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Step 5: Skills
     */
    renderSkillsStep() {
        const character = this.currentCharacter;
        const nextLevel = character.level + 1;
        
        // Check if character gains skill slot
        const gainsSkillSlot = this.checkSkillSlotGained(character.class, nextLevel);
        
        if (!gainsSkillSlot) {
            return `
                <div class="wizard-step-content">
                    <div class="step-icon">
                        <i class="fas fa-info-circle fa-3x"></i>
                    </div>
                    <h3>No New Skills</h3>
                    <p>You do not gain a new general skill slot at this level.</p>
                    <p class="help-text">Skills are typically gained every 3-4 levels in BECMI.</p>
                </div>
            `;
        }
        
        return `
            <div class="wizard-step-content">
                <div class="step-icon">
                    <i class="fas fa-brain fa-3x"></i>
                </div>
                <h3>Learn New General Skill</h3>
                
                <div class="skill-selection">
                    <p>You have gained a new general skill slot! Select a skill to learn:</p>
                    
                    <div class="skill-selection-list" id="skill-selection-list">
                        <div class="loading-spinner">Loading available skills...</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Step 6: Confirmation
     */
    renderConfirmStep() {
        const character = this.currentCharacter;
        const nextLevel = character.level + 1;
        
        return `
            <div class="wizard-step-content">
                <div class="step-icon success">
                    <i class="fas fa-check-circle fa-3x"></i>
                </div>
                <h3>Confirm Level Up</h3>
                
                <div class="level-up-summary">
                    <h4>Summary of Changes</h4>
                    
                    <div class="summary-grid">
                        <div class="summary-item">
                            <i class="fas fa-level-up-alt"></i>
                            <span>Level ${character.level} → ${nextLevel}</span>
                        </div>
                        
                        <div class="summary-item">
                            <i class="fas fa-heart"></i>
                            <span>Max HP: ${character.max_hp} → ${character.max_hp + this.wizardData.new_hp_rolled}</span>
                        </div>
                        
                        ${this.wizardData.new_spells.length > 0 ? `
                            <div class="summary-item">
                                <i class="fas fa-book-magic"></i>
                                <span>${this.wizardData.new_spells.length} new spell(s) learned</span>
                            </div>
                        ` : ''}
                        
                        ${this.wizardData.new_skills.length > 0 ? `
                            <div class="summary-item">
                                <i class="fas fa-brain"></i>
                                <span>${this.wizardData.new_skills.length} new skill(s) learned</span>
                            </div>
                        ` : ''}
                        
                        ${this.wizardData.new_weapon_mastery ? `
                            <div class="summary-item">
                                <i class="fas fa-sword"></i>
                                <span>Weapon mastery improved</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="confirmation-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>This action cannot be undone. Are you sure you want to level up?</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup wizard event handlers
     */
    setupWizardHandlers() {
        // Previous button
        $('#wizard-prev').off('click').on('click', () => {
            if (this.currentStep > 1) {
                this.currentStep--;
                this.updateWizardDisplay();
            }
        });
        
        // Next button
        $('#wizard-next').off('click').on('click', async () => {
            if (this.currentStep === this.totalSteps) {
                // Final step - confirm level up
                await this.confirmLevelUp();
            } else {
                // Validate current step before proceeding
                if (await this.validateStep(this.currentStep)) {
                    this.currentStep++;
                    this.updateWizardDisplay();
                }
            }
        });
        
        // Step-specific handlers
        this.setupStepHandlers();
    }
    
    /**
     * Setup step-specific handlers
     */
    setupStepHandlers() {
        // HP reroll
        $(document).on('click', '#reroll-hp-btn', () => {
            const hitDice = this.getHitDice(this.currentCharacter.class);
            const conBonus = this.rulesEngine ? this.rulesEngine.getAbilityModifier(this.currentCharacter.constitution) : 0;
            const dieSize = parseInt(hitDice.substring(2));
            const roll = Math.floor(Math.random() * dieSize) + 1;
            this.wizardData.new_hp_rolled = Math.max(1, roll + conBonus);
            this.updateWizardDisplay();
        });
        
        // Custom HP
        $(document).on('click', '#set-custom-hp-btn', () => {
            const customHp = parseInt($('#custom-hp-input').val());
            if (customHp && customHp > 0) {
                this.wizardData.new_hp_rolled = customHp;
                this.updateWizardDisplay();
            }
        });
    }
    
    /**
     * Update wizard display
     */
    updateWizardDisplay() {
        $('.wizard-progress').html(this.renderProgressBar());
        $('#wizard-content').html(this.renderStep(this.currentStep));
        
        $('#wizard-prev').prop('disabled', this.currentStep === 1);
        $('#wizard-next').text(this.currentStep === this.totalSteps ? 'Confirm Level Up' : 'Next');
        
        // Re-setup step handlers
        this.setupStepHandlers();
    }
    
    /**
     * Validate current step
     */
    async validateStep(step) {
        // All steps auto-validate for now
        return true;
    }
    
    /**
     * Confirm and execute level-up
     */
    async confirmLevelUp() {
        try {
            const response = await this.apiClient.post('/api/character/level-up.php', this.wizardData);
            
            if (response.status === 'success') {
                $('#levelUpWizardModal').modal('hide');
                
                // Show success celebration
                this.showLevelUpCelebration(response.data);
                
                // Reload character sheet
                if (this.app.modules.characterSheet) {
                    await this.app.modules.characterSheet.viewCharacter(this.currentCharacter.character_id);
                }
                
            } else {
                throw new Error(response.message || 'Failed to level up');
            }
            
        } catch (error) {
            console.error('Failed to level up:', error);
            if (this.app.modules.notifications) {
                this.app.modules.notifications.show('Failed to level up: ' + error.message, 'error');
            }
        }
    }
    
    /**
     * Show level-up celebration
     */
    showLevelUpCelebration(data) {
        const modal = $(`
            <div class="modal fade" id="levelUpCelebration" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content celebration">
                        <div class="modal-body text-center">
                            <div class="celebration-icon">
                                <i class="fas fa-trophy fa-5x"></i>
                            </div>
                            <h2>Level Up!</h2>
                            <h3 class="character-name">${this.currentCharacter.character_name}</h3>
                            <p class="level-display">Level ${data.old_level} <i class="fas fa-arrow-right"></i> Level ${data.new_level}</p>
                            <p class="hp-display">+${data.hp_gained} HP</p>
                            <button class="btn btn-lg btn-primary" data-dismiss="modal">
                                <i class="fas fa-check"></i> Awesome!
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        $('#levelUpCelebration').modal('show');
        
        $('#levelUpCelebration').on('hidden.bs.modal', () => {
            $('#levelUpCelebration').remove();
        });
    }
    
    /**
     * Helper methods
     */
    
    getHitDice(characterClass) {
        const hitDice = {
            'fighter': '1d8',
            'magic_user': '1d4',
            'cleric': '1d6',
            'thief': '1d4',
            'dwarf': '1d8',
            'elf': '1d6',
            'halfling': '1d6'
        };
        return hitDice[characterClass] || '1d6';
    }
    
    calculateNewTHAC0(characterClass, level) {
        // Simplified THAC0 calculation (Rules Cyclopedia p. 264)
        const baseTHAC0 = 20;
        const classModifier = {
            'fighter': 1, 'dwarf': 1,
            'cleric': 2, 'elf': 2, 'thief': 2, 'halfling': 2,
            'magic_user': 3
        };
        
        const modifier = classModifier[characterClass] || 2;
        const thac0 = baseTHAC0 - Math.floor((level - 1) / modifier);
        
        return { melee: thac0, ranged: thac0 };
    }
    
    calculateNewSaves(characterClass, level) {
        // Simplified saving throws (would need full table from Rules Cyclopedia)
        const base = 14 - Math.floor(level / 3);
        
        return {
            'death_ray': base,
            'magic_wand': base + 1,
            'paralysis': base - 1,
            'dragon_breath': base + 2,
            'spells': base + 1
        };
    }
    
    getNewSpellSlots(characterClass, level) {
        const oldSlots = this.calculateSpellSlots(characterClass, level - 1);
        const newSlots = this.calculateSpellSlots(characterClass, level);
        
        return { old: oldSlots, new: newSlots };
    }
    
    calculateSpellSlots(characterClass, level) {
        if (characterClass === 'magic_user' || characterClass === 'elf') {
            const slots = {
                1: {1: 1}, 2: {1: 2}, 3: {1: 2, 2: 1}, 4: {1: 2, 2: 2},
                5: {1: 2, 2: 2}, 6: {1: 2, 2: 2, 3: 1}, 7: {1: 3, 2: 2, 3: 1},
                8: {1: 3, 2: 3, 3: 2}, 9: {1: 3, 2: 3, 3: 2}, 10: {1: 3, 2: 3, 3: 2, 4: 1}
            };
            return slots[level] || {};
        } else if (characterClass === 'cleric') {
            const slots = {
                1: {}, 2: {1: 1}, 3: {1: 2}, 4: {1: 2, 2: 1},
                5: {1: 2, 2: 2}, 6: {1: 2, 2: 2}, 7: {1: 2, 2: 2, 3: 1},
                8: {1: 3, 2: 3, 3: 2}, 9: {1: 3, 2: 3, 3: 2, 4: 1}
            };
            return slots[level] || {};
        }
        return {};
    }
    
    checkSkillSlotGained(characterClass, level) {
        // General skills are typically gained every 3-4 levels
        return level % 3 === 0;
    }
    
    getLevelUpBenefits(characterClass, nextLevel) {
        const benefits = [];
        
        // Check for spell slots
        const spellcastingClasses = ['magic_user', 'cleric', 'elf'];
        if (spellcastingClasses.includes(characterClass)) {
            const oldSlots = this.calculateSpellSlots(characterClass, nextLevel - 1);
            const newSlots = this.calculateSpellSlots(characterClass, nextLevel);
            
            if (Object.keys(newSlots).length > Object.keys(oldSlots).length) {
                benefits.push({ icon: 'fa-book-magic', text: 'Gain new spell level' });
            }
        }
        
        // Check for skills
        if (this.checkSkillSlotGained(characterClass, nextLevel)) {
            benefits.push({ icon: 'fa-brain', text: 'Gain new general skill slot' });
        }
        
        // Fighter/Dwarf weapon mastery
        if ((characterClass === 'fighter' || characterClass === 'dwarf') && nextLevel % 3 === 0) {
            benefits.push({ icon: 'fa-sword', text: 'Improve weapon mastery' });
        }
        
        return benefits;
    }
    
    formatSaveName(save) {
        const names = {
            'death_ray': 'Death Ray',
            'magic_wand': 'Magic Wand',
            'paralysis': 'Paralysis',
            'dragon_breath': 'Dragon Breath',
            'spells': 'Spells'
        };
        return names[save] || save;
    }
    
    /**
     * Initialize module
     */
    init() {
        console.log('Level Up Wizard Module ready');
    }
}

// Export to window for use in app.js
window.LevelUpWizard = LevelUpWizard;

