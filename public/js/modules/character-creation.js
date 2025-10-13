/**
 * BECMI D&D Character Manager - Character Creation Module
 * 
 * Complete 11-step character creation wizard following Rules Cyclopedia Chapter 1:
 * - Step 1: Roll Ability Scores (3d6 each)
 * - Step 2: Choose Character Class
 * - Step 3: Adjust Ability Scores (2-for-1 trading)
 * - Step 4: Roll Hit Points
 * - Step 5: Roll Starting Gold  
 * - Step 6: Buy Equipment
 * - Step 7: Select Starting Spells (Magic-User/Elf only)
 * - Step 8: Select Weapon Masteries
 * - Step 9: Select General Skills
 * - Step 10: Physical Details & Background
 * - Step 11: Review & Create
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
        $('#character-creation-modal').addClass('show');
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
        // Check if user has made progress (beyond step 1)
        if (this.currentStep > 1 || (this.characterData && Object.keys(this.characterData).length > 0)) {
            // Ask for confirmation before closing
            if (confirm('Are you sure you want to close character creation? All progress will be lost!')) {
                $('#character-creation-modal').removeClass('show');
                this.resetForm();
            }
        } else {
            // No progress made, safe to close
            $('#character-creation-modal').removeClass('show');
            this.resetForm();
        }
    }

    /**
     * Render current step
     */
    async renderStep() {
        const content = $('#character-creation-content');
        
        // Show loading for equipment/weapon/skill steps
        const loadingSteps = {
            6: 'Loading equipment from database...',
            8: 'Loading weapons...',
            9: 'Loading skills...'
        };
        
        if (loadingSteps[this.currentStep]) {
            content.html(`<div class="loading-spinner">${loadingSteps[this.currentStep]}</div>`);
        }
        
        switch (this.currentStep) {
            case 1:
                content.html(this.renderStep1AbilityScores());
                break;
            case 2:
                content.html(this.renderStep2ChooseClass());
                break;
            case 3:
                content.html(this.renderStep3AdjustAbilities());
                break;
            case 4:
                content.html(this.renderStep4RollHP());
                break;
            case 5:
                content.html(this.renderStep5StartingGold());
                break;
            case 6:
                content.html(await this.renderStep6Equipment());
                break;
            case 7:
                content.html(await this.renderStep7StartingSpells());
                break;
            case 8:
                content.html(await this.renderStep8WeaponMastery());
                break;
            case 9:
                content.html(await this.renderStep9Skills());
                break;
            case 10:
                content.html(this.renderStep10PhysicalDetails());
                break;
            case 11:
                content.html(this.renderStep11Review());
                break;
            default:
                content.html(this.renderStep1AbilityScores());
        }
        
        this.setupStepEventHandlers();
    }

    /**
     * STEP 1: Roll Ability Scores
     * Rules Cyclopedia Chapter 1, page 38-85
     */
    renderStep1AbilityScores() {
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 1: Roll Ability Scores</h3>
                    <p class="step-description">Roll 3d6 for each ability score. You can arrange them as you wish in Step 2.</p>
                    <div class="step-progress">
                        <span class="step-number active">1</span>
                        <span class="step-number">2</span>
                        <span class="step-number">3</span>
                        <span class="step-number">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                        <span class="step-number">7</span>
                        <span class="step-number">8</span>
                        <span class="step-number">9</span>
                        <span class="step-number">10</span>
                        <span class="step-number">11</span>
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
     * STEP 2: Choose Character Class
     * Rules Cyclopedia Chapter 1, page 107-226
     */
    renderStep2ChooseClass() {
        // Build class options with requirements
        const classOptions = [
            { value: 'fighter', label: 'Fighter', requirements: {} },
            { value: 'cleric', label: 'Cleric', requirements: {} },
            { value: 'magic_user', label: 'Magic-User', requirements: {} },
            { value: 'thief', label: 'Thief', requirements: {} },
            { value: 'dwarf', label: 'Dwarf', requirements: { constitution: 9 } },
            { value: 'elf', label: 'Elf', requirements: { intelligence: 9 } },
            { value: 'halfling', label: 'Halfling', requirements: { dexterity: 9, constitution: 9 } },
            { value: 'mystic', label: 'Mystic', requirements: { wisdom: 13, dexterity: 13 } }
        ];
        
        const abilities = this.characterData;
        
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 2: Choose Character Class</h3>
                    <p class="step-description">Select your class based on your ability scores. Some classes have minimum requirements.</p>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number active">2</span>
                        <span class="step-number">3</span>
                        <span class="step-number">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                        <span class="step-number">7</span>
                        <span class="step-number">8</span>
                        <span class="step-number">9</span>
                        <span class="step-number">10</span>
                        <span class="step-number">11</span>
                    </div>
                </div>
                
                <form id="character-basic-form" class="character-form">
                    <div class="current-abilities-summary">
                        <h4>Your Ability Scores:</h4>
                        <div class="abilities-grid-compact">
                            <div><strong>STR:</strong> ${abilities.strength || '-'}</div>
                            <div><strong>INT:</strong> ${abilities.intelligence || '-'}</div>
                            <div><strong>WIS:</strong> ${abilities.wisdom || '-'}</div>
                            <div><strong>DEX:</strong> ${abilities.dexterity || '-'}</div>
                            <div><strong>CON:</strong> ${abilities.constitution || '-'}</div>
                            <div><strong>CHA:</strong> ${abilities.charisma || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="character-name">Character Name:</label>
                        <input type="text" id="character-name" name="character_name" value="${this.characterData.character_name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="character-class">Class:</label>
                        <select id="character-class" name="class" required>
                            <option value="">Select a class...</option>
                            ${classOptions.map(cls => {
                                // Check if requirements met
                                let meetsReqs = true;
                                let reqText = '';
                                
                                for (const [ability, minValue] of Object.entries(cls.requirements)) {
                                    if (!abilities[ability] || abilities[ability] < minValue) {
                                        meetsReqs = false;
                                    }
                                    if (Object.keys(cls.requirements).length > 0) {
                                        const reqParts = [];
                                        for (const [ab, val] of Object.entries(cls.requirements)) {
                                            reqParts.push(`${ab.substring(0,3).toUpperCase()} ${val}+`);
                                        }
                                        reqText = ` (Requires: ${reqParts.join(', ')})`;
                                    }
                                }
                                
                                const selected = this.characterData.class === cls.value ? ' selected' : '';
                                const disabled = !meetsReqs ? ' disabled' : '';
                                const style = !meetsReqs ? ' style="color: #999;"' : '';
                                
                                return `<option value="${cls.value}"${selected}${disabled}${style}>${cls.label}${reqText}</option>`;
                            }).join('')}
                        </select>
                        <p class="form-help">Classes in gray do not meet minimum ability requirements.</p>
                    </div>
                    
                    <div id="class-description" class="class-description-box"></div>
                    
                    <div class="form-group">
                        <label for="character-alignment">Alignment:</label>
                        <select id="character-alignment" name="alignment" required>
                            <option value="">Select alignment...</option>
                            <option value="lawful"${this.characterData.alignment === 'lawful' ? ' selected' : ''}>Lawful (Good, honorable, follows rules)</option>
                            <option value="neutral"${this.characterData.alignment === 'neutral' ? ' selected' : ''}>Neutral (Balanced, pragmatic)</option>
                            <option value="chaotic"${this.characterData.alignment === 'chaotic' ? ' selected' : ''}>Chaotic (Freedom, unpredictable, selfish)</option>
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
     * STEP 3: Adjust Ability Scores
     * Rules Cyclopedia Chapter 1, page 227-268
     * 
     * Players can trade 2 points from one ability to raise prime requisite by 1
     * Restrictions:
     * - Cannot lower any ability below 9
     * - Cannot lower Constitution or Charisma
     * - Cannot lower Dexterity (except Thief/Halfling can raise it)
     * - Can only raise prime requisites
     */
    renderStep3AdjustAbilities() {
        const selectedClass = this.characterData.class;
        
        if (!selectedClass) {
            return `<div class="error-message">Please select a class first</div>`;
        }
        
        const classData = window.BECMI_CLASS_DATA[selectedClass];
        const primeReqs = classData.primeRequisites || [];
        const canLowerDex = ['thief', 'halfling'].includes(selectedClass);
        
        // Store original abilities if not already stored
        if (!this.characterData.original_abilities) {
            this.characterData.original_abilities = {
                strength: this.characterData.strength,
                dexterity: this.characterData.dexterity,
                constitution: this.characterData.constitution,
                intelligence: this.characterData.intelligence,
                wisdom: this.characterData.wisdom,
                charisma: this.characterData.charisma
            };
        }
        
        const original = this.characterData.original_abilities;
        const current = {
            strength: this.characterData.strength || original.strength,
            dexterity: this.characterData.dexterity || original.dexterity,
            constitution: this.characterData.constitution || original.constitution,
            intelligence: this.characterData.intelligence || original.intelligence,
            wisdom: this.characterData.wisdom || original.wisdom,
            charisma: this.characterData.charisma || original.charisma
        };
        
        const abilityLabels = {
            strength: 'Strength',
            dexterity: 'Dexterity',
            constitution: 'Constitution',
            intelligence: 'Intelligence',
            wisdom: 'Wisdom',
            charisma: 'Charisma'
        };
        
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 3: Adjust Ability Scores (Optional)</h3>
                    <p class="step-description">Trade 2 points from an ability to raise your prime requisite by 1 point.</p>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number active">3</span>
                        <span class="step-number">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                        <span class="step-number">7</span>
                        <span class="step-number">8</span>
                        <span class="step-number">9</span>
                        <span class="step-number">10</span>
                        <span class="step-number">11</span>
                    </div>
                </div>
                
                <div class="ability-adjustment-section">
                    <div class="class-info-box">
                        <h4>Selected Class: ${classData.name}</h4>
                        <p><strong>Prime Requisite(s):</strong> ${primeReqs.map(pr => abilityLabels[pr]).join(', ')}</p>
                        <p class="prime-req-explanation">You can only raise your prime requisite(s) using this system.</p>
                    </div>
                    
                    <div class="adjustment-rules-box">
                        <h4>Adjustment Rules:</h4>
                        <ul>
                            <li>Trade 2 points from an ability to raise prime requisite by 1</li>
                            <li>Cannot lower any ability below 9</li>
                            <li>Cannot lower Constitution or Charisma</li>
                            <li>${canLowerDex ? 'Dexterity can be lowered (you can raise it as prime requisite)' : 'Cannot lower Dexterity'}</li>
                            <li>Can only raise: ${primeReqs.map(pr => abilityLabels[pr]).join(', ')}</li>
                        </ul>
                    </div>
                    
                    <div class="ability-adjustment-grid">
                        ${Object.keys(abilityLabels).map(ability => {
                            const isPrimeReq = primeReqs.includes(ability);
                            const canLower = ability !== 'constitution' && ability !== 'charisma' && 
                                           (ability !== 'dexterity' || canLowerDex);
                            const origValue = original[ability];
                            const currValue = current[ability];
                            const diff = currValue - origValue;
                            const diffText = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '';
                            const diffClass = diff > 0 ? 'increase' : diff < 0 ? 'decrease' : '';
                            
                            return `
                                <div class="ability-adjuster ${isPrimeReq ? 'prime-requisite' : ''}">
                                    <div class="ability-label">
                                        <strong>${abilityLabels[ability]}</strong>
                                        ${isPrimeReq ? '<span class="prime-badge">Prime Requisite</span>' : ''}
                                    </div>
                                    <div class="ability-values">
                                        <span class="original-value">Original: ${origValue}</span>
                                        <div class="adjuster-controls">
                                            <button type="button" 
                                                    class="btn-adjust btn-decrease" 
                                                    data-ability="${ability}"
                                                    data-action="decrease"
                                                    ${!canLower || currValue <= 9 ? 'disabled' : ''}>
                                                −
                                            </button>
                                            <input type="number" 
                                                   id="adjusted-${ability}" 
                                                   class="adjusted-value" 
                                                   value="${currValue}" 
                                                   min="3" 
                                                   max="18" 
                                                   readonly>
                                            <button type="button" 
                                                    class="btn-adjust btn-increase" 
                                                    data-ability="${ability}"
                                                    data-action="increase"
                                                    ${!isPrimeReq || currValue >= 18 ? 'disabled' : ''}>
                                                +
                                            </button>
                                        </div>
                                        ${diff !== 0 ? `<span class="adjustment-diff ${diffClass}">${diffText}</span>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div id="adjustment-summary" class="adjustment-summary">
                        <p>No adjustments made yet. You may skip this step if satisfied with your scores.</p>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="prev-step-3">Previous</button>
                        <button type="button" class="btn btn-secondary" id="reset-adjustments">Reset Adjustments</button>
                        <button type="button" class="btn btn-primary" id="next-step-3">Next</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render skip step message for conditional steps
     */
    renderSkipStep(stepNum, stepName, message) {
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step ${stepNum}: ${stepName}</h3>
                    <div class="step-progress">
                        ${Array.from({length: 11}, (_, i) => {
                            const num = i + 1;
                            const status = num < stepNum ? 'completed' : num === stepNum ? 'active' : '';
                            return `<span class="step-number ${status}">${num}</span>`;
                        }).join('')}
                    </div>
                </div>
                
                <div class="skip-step-message">
                    <div class="info-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <h4>This step does not apply to your character</h4>
                    <p>${message}</p>
                    <p class="skip-instruction">Click Next to continue to the next step.</p>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="prev-step-${stepNum}">Previous</button>
                    <button type="button" class="btn btn-primary" id="next-step-${stepNum}">Next</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Get Constitution HP bonus/penalty
     */
    getConstitutionHPBonus(constitution) {
        const bonusTable = {
            3: -3, 4: -2, 5: -2, 6: -1, 7: -1, 8: -1, 9: 0,
            10: 0, 11: 0, 12: 0, 13: 1, 14: 1, 15: 1, 16: 2,
            17: 2, 18: 3
        };
        return bonusTable[constitution] || 0;
    }
    
    /**
     * Increase an ability score (for prime requisites only)
     * 
     * @param {string} ability - The ability to increase
     */
    increaseAbility(ability) {
        const selectedClass = this.characterData.class;
        const classData = window.BECMI_CLASS_DATA[selectedClass];
        const primeReqs = classData.primeRequisites || [];
        
        // Can only increase prime requisites
        if (!primeReqs.includes(ability)) {
            return;
        }
        
        const currentValue = this.characterData[ability] || 0;
        
        // Cannot increase above 18
        if (currentValue >= 18) {
            return;
        }
        
        // Need 2 points from another ability to increase by 1
        // For now, let's implement a simple version where we just increase
        // In a full implementation, we'd need to track which ability to decrease
        this.characterData[ability] = currentValue + 1;
        
        // Re-render the step to show the change
        this.renderStep();
    }
    
    /**
     * Decrease an ability score
     * 
     * @param {string} ability - The ability to decrease
     */
    decreaseAbility(ability) {
        const selectedClass = this.characterData.class;
        const classData = window.BECMI_CLASS_DATA[selectedClass];
        const primeReqs = classData.primeRequisites || [];
        const canLowerDex = ['thief', 'halfling'].includes(selectedClass);
        
        // Cannot lower Constitution or Charisma
        if (ability === 'constitution' || ability === 'charisma') {
            return;
        }
        
        // Cannot lower Dexterity unless it's a thief or halfling
        if (ability === 'dexterity' && !canLowerDex) {
            return;
        }
        
        const currentValue = this.characterData[ability] || 0;
        
        // Cannot lower below 9
        if (currentValue <= 9) {
            return;
        }
        
        // Decrease by 2 (BECMI rules: trade 2 points to raise prime requisite by 1)
        this.characterData[ability] = Math.max(9, currentValue - 2);
        
        // Re-render the step to show the change
        this.renderStep();
    }
    
    /**
     * Toggle a starting spell selection
     * 
     * @param {number} spellId - The spell ID to toggle
     */
    toggleStartingSpell(spellId) {
        const characterClass = this.characterData.class;
        const numSpells = characterClass === 'magic_user' ? 2 : 1;
        const selectedSpells = this.characterData.starting_spells || [];
        
        const isSelected = selectedSpells.includes(spellId);
        
        if (isSelected) {
            // Remove spell
            this.characterData.starting_spells = selectedSpells.filter(id => id !== spellId);
        } else {
            // Add spell (if not at limit)
            if (selectedSpells.length < numSpells) {
                this.characterData.starting_spells = [...selectedSpells, spellId];
            }
        }
        
        // Re-render the step to show the change
        this.renderStep();
    }
    
    /**
     * Render session selection UI for Step 11 (optional)
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
     * STEP 4: Roll Hit Points
     * Rules Cyclopedia Chapter 1, page 269-302
     */
    renderStep4RollHP() {
        const characterClass = this.characterData.class || 'fighter';
        const classData = window.BECMI_CLASS_DATA[characterClass];
        const hitDie = classData.hitDie;
        const constitution = this.characterData.constitution || 10;
        const conBonus = this.getConstitutionHPBonus(constitution);
        
        const hasRolled = this.characterData.hp_roll !== undefined;
        const hpRoll = this.characterData.hp_roll || 0;
        const totalHP = hasRolled ? Math.max(1, hpRoll + conBonus) : 0;
        
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 4: Roll Hit Points</h3>
                    <p class="step-description">Roll 1d${hitDie} for your starting hit points. Constitution modifier applies.</p>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number active">4</span>
                        <span class="step-number">5</span>
                        <span class="step-number">6</span>
                        <span class="step-number">7</span>
                        <span class="step-number">8</span>
                        <span class="step-number">9</span>
                        <span class="step-number">10</span>
                        <span class="step-number">11</span>
                    </div>
                </div>
                
                <div class="hp-roll-section">
                    <div class="hp-info">
                        <h4>Hit Die: 1d${hitDie}</h4>
                        <p>Your <strong>${classData.name}</strong> uses a d${hitDie} for hit points.</p>
                        <p>Constitution bonus: <strong>${conBonus >= 0 ? '+' + conBonus : conBonus}</strong></p>
                    </div>

                    ${hasRolled ? `
                        <div class="hp-roll-result success">
                            <div class="roll-animation">
                                <i class="fas fa-heart"></i>
                            </div>
                            <h3>You rolled: <span class="hp-roll">${hpRoll}</span> ${conBonus !== 0 ? `(${conBonus >= 0 ? '+' : ''}${conBonus})` : ''}</h3>
                            <h2>Starting HP: <span class="total-hp">${totalHP}</span></h2>
                            <button type="button" class="btn btn-secondary" id="reroll-hp">
                                <i class="fas fa-dice"></i> Re-roll HP
                            </button>
                        </div>
                    ` : `
                        <div class="hp-roll-container">
                            <div class="roll-instructions">
                                <i class="fas fa-dice"></i>
                                <p>Click the button below to roll your starting hit points!</p>
                            </div>
                            <button type="button" class="btn btn-primary btn-large" id="roll-hit-points">
                                <i class="fas fa-dice"></i> Roll 1d${hitDie}
                            </button>
                        </div>
                    `}
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="prev-step-4">Previous</button>
                    <button type="button" class="btn btn-primary" id="next-step-4" ${!hasRolled ? 'disabled' : ''}>Next</button>
                </div>
            </div>
        `;
    }
    
    /**
     * STEP 5: Roll Starting Gold
     * Rules Cyclopedia Chapter 1, page 303-316
     * 
     * Allows player to roll for starting gold based on character class.
     * Different classes have different dice formulas (e.g., Fighter: 3d6×10, Thief: 2d6×10)
     * 
     * @returns {string} HTML for Step 5
     */
    renderStep5StartingGold() {
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
                    <h3>Step 5: Roll Starting Gold</h3>
                    <p class="step-description">All characters start with 3d6 × 10 gold pieces.</p>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number completed">4</span>
                        <span class="step-number active">5</span>
                        <span class="step-number">6</span>
                        <span class="step-number">7</span>
                        <span class="step-number">8</span>
                        <span class="step-number">9</span>
                        <span class="step-number">10</span>
                        <span class="step-number">11</span>
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
                    <button type="button" class="btn btn-secondary" id="prev-step-5">Previous</button>
                    <button type="button" class="btn btn-primary" id="next-step-5" ${!hasRolled ? 'disabled' : ''}>
                        Next: Purchase Equipment
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * STEP 6: Buy Equipment
     * Rules Cyclopedia Chapter 1, page 317-347
     * 
     * Provides a shopping interface for purchasing equipment with starting gold.
     * Tracks gold spent, weight, and encumbrance.
     * 
     * @returns {string} HTML for Step 6
     */
    async renderStep6Equipment() {
        // Initialize equipment cart if not already done
        if (!this.equipmentCart) {
            const startingGold = this.characterData.starting_gold || 100;
            this.equipmentCart = new CharacterCreationEquipment(startingGold);
            
            // Wait for items to load from database
            await this.equipmentCart.itemsLoadedPromise;
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
     * STEP 7: Select Starting Spells (Magic-User/Elf only)
     * Rules Cyclopedia Chapter 3, page 1967-2012
     * 
     * Magic-Users get 2 starting spells, Elves get 1
     */
    async renderStep7StartingSpells() {
        const characterClass = this.characterData.class;
        
        // Skip this step for non-spellcasters
        if (!['magic_user', 'elf'].includes(characterClass)) {
            return this.renderSkipStep(7, 'Starting Spells', 'Your class does not use Magic-User spells.');
        }
        
        const numSpells = characterClass === 'magic_user' ? 2 : 1;
        
        // Load available 1st level spells
        if (!this.availableStartingSpells) {
            try {
                console.log('Loading starting spells...');
                const response = await this.apiClient.get(`/api/spells/get-starting-spells.php?t=${Date.now()}`);
                console.log('Starting spells response:', response);
                if (response.status === 'success') {
                    this.availableStartingSpells = response.data.spells;
                    console.log('Loaded spells:', this.availableStartingSpells);
                } else {
                    console.error('Failed to load spells:', response);
                    this.availableStartingSpells = [];
                }
            } catch (error) {
                console.error('Error loading starting spells:', error);
                this.availableStartingSpells = [];
            }
        }
        
        const selectedSpells = this.characterData.starting_spells || [];
        
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 7: Select Starting Spells</h3>
                    <p class="step-description">Your teacher gives you a spellbook with ${numSpells} spell${numSpells > 1 ? 's' : ''}. Select from the available 1st level spells.</p>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number completed">4</span>
                        <span class="step-number completed">5</span>
                        <span class="step-number completed">6</span>
                        <span class="step-number active">7</span>
                        <span class="step-number">8</span>
                        <span class="step-number">9</span>
                        <span class="step-number">10</span>
                        <span class="step-number">11</span>
                    </div>
                </div>
                
                <div class="starting-spells-section">
                    <div class="spells-info-box">
                        <h4>Your Spellbook</h4>
                        <p>Selected: <span id="spell-count">${selectedSpells.length}</span> / ${numSpells}</p>
                    </div>
                    
                    <div class="spell-grid">
                        ${this.availableStartingSpells && this.availableStartingSpells.length > 0 ? this.availableStartingSpells.map(spell => {
                            const isSelected = selectedSpells.includes(spell.spell_id);
                            const canSelect = !isSelected && selectedSpells.length < numSpells;
                            
                            return `
                                <div class="spell-card ${isSelected ? 'selected' : ''}" data-spell-id="${spell.spell_id}">
                                    <div class="spell-header">
                                        <h4>${spell.spell_name}${spell.reversible ? '*' : ''}</h4>
                                        <button type="button" 
                                                class="btn-toggle-spell ${isSelected ? 'btn-remove' : 'btn-add'}" 
                                                data-spell-id="${spell.spell_id}"
                                                ${!canSelect && !isSelected ? 'disabled' : ''}>
                                            ${isSelected ? '✓ Selected' : '+ Add'}
                                        </button>
                                    </div>
                                    <div class="spell-details">
                                        <p><strong>Range:</strong> ${spell.range}</p>
                                        <p><strong>Duration:</strong> ${spell.duration}</p>
                                        <p class="spell-description">${spell.description}</p>
                                        ${spell.reversible ? `<p class="reversible-note"><em>*Reversible to: ${spell.reverse_name}</em></p>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <div class="no-spells-message">
                                <p>No spells available. Please check the console for errors.</p>
                                <button type="button" class="btn btn-secondary" onclick="location.reload()">Reload Page</button>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="prev-step-7">Previous</button>
                    <button type="button" class="btn btn-primary" id="next-step-7" ${selectedSpells.length !== numSpells ? 'disabled' : ''}>
                        Next
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * STEP 8: Select Weapon Masteries
     * Rules Cyclopedia Chapter 5
     */
    async renderStep8WeaponMastery() {
        const characterClass = this.characterData.class;
        const availableChoices = this.getWeaponMasteryChoices(characterClass);
        
        // Load weapons from items API
        if (!this.availableWeapons) {
            try {
                const response = await this.apiClient.get('/api/items/list.php?item_type=weapon');
                if (response.status === 'success') {
                    this.availableWeapons = response.data.items.filter(item => item.item_type === 'weapon');
                } else {
                    this.availableWeapons = [];
                }
            } catch (error) {
                console.error('Failed to load weapons:', error);
                this.availableWeapons = [];
            }
        }
        
        // Initialize weapon_masteries if not already set
        if (!this.characterData.weapon_masteries) {
            this.characterData.weapon_masteries = [];
        }
        
        // Calculate total choices spent (each mastery level costs choices)
        const totalChoicesSpent = this.characterData.weapon_masteries.reduce((sum, m) => {
            return sum + this.getMasteryChoicesCost(m.mastery_rank);
        }, 0);
        
        return `<div class="character-creation-step">
            <div class="step-header">
                <h3>Step 5: Weapon Mastery</h3>
                <div class="step-progress">
                    <span class="step-number completed">1</span>
                    <span class="step-number completed">2</span>
                    <span class="step-number completed">3</span>
                    <span class="step-number completed">4</span>
                    <span class="step-number active">5</span>
                    <span class="step-number">6</span>
                    <span class="step-number">7</span>
                    <span class="step-number">8</span>
                </div>
            </div>
            
            <div class="weapon-mastery-section">
                <div class="mastery-info">
                    <h4>Select Weapon Masteries</h4>
                    <p>As a level 1 <strong>${characterClass}</strong>, you have <strong>${availableChoices}</strong> weapon choice(s) to spend.</p>
                    <p class="rules-reference"><i class="fas fa-book"></i> Per Rules Cyclopedia p. 75: You can spend multiple choices on the same weapon to increase mastery!</p>
                    <p class="rules-reference"><i class="fas fa-star"></i> <strong>Mastery Levels:</strong> Basic (1) → Skilled (2) → Expert (3) → Master (4) → Grand Master (5)</p>
                    <div class="selection-counter">
                        <span class="counter-label">Choices Used:</span>
                        <span class="counter-value ${totalChoicesSpent >= availableChoices ? 'complete' : ''}" id="mastery-counter">
                            ${totalChoicesSpent} / ${availableChoices}
                        </span>
                    </div>
                </div>
                
                <div class="weapons-selection">
                    <div class="selected-weapons" id="selected-weapons-list">
                        ${this.renderSelectedWeapons()}
                    </div>
                    
                    <div class="available-weapons">
                        <h5>Available Weapons</h5>
                        <div class="weapons-grid" id="weapons-grid">
                            ${this.renderWeaponsGrid()}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="prev-step-5">Previous</button>
                <button type="button" class="btn btn-primary" id="next-step-5">Next: Select Skills</button>
            </div>
        </div>`;
    }
    
    /**
     * STEP 9: Select General Skills
     * Rules Cyclopedia Chapter 5
     */
    async renderStep9Skills() {
        const characterClass = this.characterData.class;
        const intelligence = this.characterData.intelligence || 10;
        const availableSlots = this.getSkillSlots(intelligence);
        
        // Load skills from API
        if (!this.availableSkills) {
            try {
                const response = await this.apiClient.get('/api/skills/list.php');
                if (response.status === 'success') {
                    this.availableSkills = response.data.skills || [];
                    this.groupedSkills = response.data.grouped_skills || {};
                } else {
                    this.availableSkills = [];
                    this.groupedSkills = {};
                }
            } catch (error) {
                console.error('Failed to load skills:', error);
                this.availableSkills = [];
                this.groupedSkills = {};
            }
        }
        
        // Initialize skills if not already set
        if (!this.characterData.skills) {
            this.characterData.skills = [];
        }
        
        const selectedCount = this.characterData.skills.length;
        
        return `<div class="character-creation-step">
            <div class="step-header">
                <h3>Step 6: General Skills</h3>
                <div class="step-progress">
                    <span class="step-number completed">1</span>
                    <span class="step-number completed">2</span>
                    <span class="step-number completed">3</span>
                    <span class="step-number completed">4</span>
                    <span class="step-number completed">5</span>
                    <span class="step-number active">6</span>
                    <span class="step-number">7</span>
                    <span class="step-number">8</span>
                </div>
            </div>
            
            <div class="skills-section">
                <div class="skills-info">
                    <h4>Select General Skills</h4>
                    <p>You have <strong>${availableSlots}</strong> skill slot(s) available.</p>
                    <p class="rules-reference"><i class="fas fa-book"></i> Per Rules Cyclopedia p. 81: Base 4 slots + Intelligence modifier. Roll 1d20 + ability modifier vs. difficulty when using skills.</p>
                    <div class="selection-counter">
                        <span class="counter-label">Selected:</span>
                        <span class="counter-value ${selectedCount >= availableSlots ? 'complete' : ''}" id="skills-counter">
                            ${selectedCount} / ${availableSlots}
                        </span>
                    </div>
                </div>
                
                <div class="skills-by-ability" id="skills-by-ability">
                    ${this.renderSkillsByAbility()}
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="prev-step-6">Previous</button>
                <button type="button" class="btn btn-primary" id="next-step-6">Next: Character Details</button>
            </div>
        </div>`;
    }
    
    /**
     * Get weapon mastery choices by class
     * 
     * @param {string} characterClass - Character class
     * @returns {number} Number of weapon choices
     */
    getWeaponMasteryChoices(characterClass) {
        // Rules Cyclopedia p. 75 - Weapon Choices by Experience Level
        // Level 1 choices only - these represent weapon choices to spend on mastery
        const choices = {
            'fighter': 4,  // Fighters start with 4 weapon choices at level 1
            'dwarf': 2,    // Demihumans get 2 choices for weapon mastery specialization
            'elf': 2,      // Same as dwarf
            'halfling': 2, // Same as dwarf
            'cleric': 2,   // All other classes get 2 choices
            'thief': 2,
            'magic_user': 2
        };
        return choices[characterClass] || 2;
    }
    
    /**
     * Get skill slots by intelligence
     * 
     * @param {number} intelligence - Intelligence score
     * @returns {number} Number of skill slots
     */
    getSkillSlots(intelligence) {
        // Rules Cyclopedia p. 81: Base 4 slots + Int modifier
        const intModifier = this.rulesEngine ? this.rulesEngine.getAbilityModifier(intelligence) : 0;
        return Math.max(1, 4 + intModifier);
    }
    
    /**
     * Render selected weapons list
     * 
     * @returns {string} HTML for selected weapons
     */
    renderSelectedWeapons() {
        if (!this.characterData.weapon_masteries || this.characterData.weapon_masteries.length === 0) {
            return '<div class="no-selection"><i class="fas fa-hand-pointer"></i> Click weapons below to select. Click again to increase mastery level!</div>';
        }
        
        return `<div class="selected-list">
            <h5>Your Weapon Masteries:</h5>
            ${this.characterData.weapon_masteries.map(mastery => {
                const weapon = this.availableWeapons.find(w => w.item_id === mastery.item_id);
                if (!weapon) return '';
                const choicesCost = this.getMasteryChoicesCost(mastery.mastery_rank);
                const masteryRank = mastery.mastery_rank || 'basic';
                const rankDisplay = masteryRank.replace('_', ' ').toUpperCase();
                
                return `<div class="selected-weapon-item">
                    <i class="fas fa-sword"></i>
                    <span class="weapon-name">${weapon.name}</span>
                    <span class="weapon-damage">${weapon.damage_die}</span>
                    <span class="mastery-rank badge badge-${this.getMasteryRankColor(masteryRank)}">${rankDisplay}</span>
                    <span class="choices-cost badge badge-info">${choicesCost} choice${choicesCost > 1 ? 's' : ''}</span>
                    <button class="btn btn-xs btn-danger" data-action="remove-weapon" data-weapon-id="${weapon.item_id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
            }).join('')}
        </div>`;
    }
    
    /**
     * Get badge color for mastery rank
     * 
     * @param {string} rank - Mastery rank
     * @returns {string} Bootstrap color class
     */
    getMasteryRankColor(rank) {
        const colors = {
            'basic': 'secondary',
            'skilled': 'primary',
            'expert': 'info',
            'master': 'success',
            'grand_master': 'warning'
        };
        return colors[rank] || 'secondary';
    }
    
    /**
     * Render weapons grid
     * 
     * @returns {string} HTML for weapons grid
     */
    renderWeaponsGrid() {
        if (!this.availableWeapons || this.availableWeapons.length === 0) {
            return '<p class="no-weapons">No weapons available</p>';
        }
        
        return this.availableWeapons.map(weapon => {
            const isSelected = this.characterData.weapon_masteries && 
                             this.characterData.weapon_masteries.some(m => m.item_id === weapon.item_id);
            
            return `<div class="weapon-card ${isSelected ? 'selected' : ''}" data-weapon-id="${weapon.item_id}">
                <div class="weapon-icon">
                    <i class="fas fa-sword"></i>
                </div>
                <div class="weapon-info">
                    <h6>${weapon.name}</h6>
                    <div class="weapon-stats">
                        <span class="stat-badge"><i class="fas fa-bullseye"></i> ${weapon.damage_die}</span>
                        <span class="stat-badge"><i class="fas fa-arrows-alt-h"></i> ${weapon.weapon_type}</span>
                    </div>
                </div>
                ${isSelected ? '<div class="selected-indicator"><i class="fas fa-check-circle"></i></div>' : ''}
            </div>`;
        }).join('');
    }
    
    /**
     * Render skills by ability
     * 
     * @returns {string} HTML for skills by ability
     */
    renderSkillsByAbility() {
        if (!this.groupedSkills || Object.keys(this.groupedSkills).length === 0) {
            return '<p class="no-skills">No skills available</p>';
        }
        
        return Object.entries(this.groupedSkills).map(([ability, skills]) => `
            <div class="skill-ability-group">
                <h5 class="ability-group-header">
                    <i class="fas fa-brain"></i> 
                    ${ability.charAt(0).toUpperCase() + ability.slice(1)} Skills
                </h5>
                <div class="skills-grid">
                    ${skills.map(skill => {
                        const isSelected = this.characterData.skills && 
                                         this.characterData.skills.some(s => s.skill_name === skill.skill_name);
                        
                        return `<div class="skill-card ${isSelected ? 'selected' : ''}" data-skill-name="${skill.skill_name}">
                            <div class="skill-info">
                                <h6>${skill.skill_name}</h6>
                                <p class="skill-description">${skill.description || ''}</p>
                            </div>
                            ${isSelected ? '<div class="selected-indicator"><i class="fas fa-check-circle"></i></div>' : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `).join('');
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

        return items.map(item => {
            const imageSlug = this.getEquipmentImageSlug(item.name);
            const imagePath = imageSlug ? `images/equipment/${imageSlug}.png` : '';
            
            return `
            <div class="equipment-item" data-item-id="${item.item_id}">
                ${imagePath ? `<div class="item-image">
                    <img src="${imagePath}" alt="${item.name}" onerror="this.style.display='none'">
                </div>` : ''}
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
        `}).join('');
    }
    
    /**
     * Get equipment image slug from item name
     * Maps item names to image filenames
     * 
     * @param {string} itemName - Name of the item
     * @returns {string|null} Image slug or null if no image
     * @private
     */
    getEquipmentImageSlug(itemName) {
        const mapping = {
            'Dagger': 'dagger',
            'Sword': 'short-sword',
            'Short Sword': 'short-sword',
            'Two-handed Sword': 'long-sword',
            'Normal Sword': 'long-sword',
            'Battle Axe': 'battle-axe',
            'Hand Axe': 'battle-axe',
            'Mace': 'mace',
            'War Hammer': 'mace',
            'Spear': 'spear',
            'Pole Arm': 'spear',
            'Staff': 'spear',
            'Short Bow': 'short-bow',
            'Long Bow': 'short-bow',
            'Crossbow': 'crossbow',
            'Leather Armor': 'leather-armor',
            'Chain Mail': 'chain-mail',
            'Plate Mail': 'plate-armor',
            'Shield': 'shield',
            'Rope (50 ft)': 'rope-50-ft',
            'Rope, 50\'': 'rope-50-ft',
            'Torches (6)': 'torch',
            'Torch': 'torch',
            'Rations (Standard, 7 days)': 'rations-1-week',
            'Rations (Iron, 7 days)': 'rations-1-week',
            'Rations (1 day)': 'rations-1-week',
            'Waterskin': 'waterskin'
        };
        
        return mapping[itemName] || null;
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
     * STEP 10: Physical Details & Background
     * Rules Cyclopedia Chapter 1, page 841-996
     */
    renderStep10PhysicalDetails() {
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 7: Character Details</h3>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number completed">4</span>
                        <span class="step-number completed">5</span>
                        <span class="step-number completed">6</span>
                        <span class="step-number active">7</span>
                        <span class="step-number">8</span>
                    </div>
                </div>
                
                <form id="character-details-form" class="character-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="character-gender">Gender:</label>
                            <select id="character-gender" name="gender" required>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other/Non-Binary</option>
                            </select>
                        </div>
                    </div>
                    
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
                    
                    <div class="form-group">
                        <label>Character Portrait:</label>
                        <div class="portrait-section">
                            <div id="portrait-preview" class="portrait-preview">
                                <div class="portrait-placeholder">
                                    <i class="fas fa-user fa-3x"></i>
                                    <p>No portrait generated yet</p>
                                </div>
                            </div>
                            <div class="portrait-actions">
                                <button type="button" class="btn btn-primary" id="generate-portrait-btn" disabled>
                                    <i class="fas fa-magic"></i> Generate AI Portrait
                                </button>
                                <p class="portrait-hint">Fill in physical details above to generate a portrait</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="prev-step-7">Previous</button>
                        <button type="button" class="btn btn-primary" id="next-step-7">Next</button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * STEP 11: Review & Create Character
     * Final review before creating the character
     */
    renderStep11Review() {
        const character = this.characterData;
        const calculatedStats = this.calculateCharacterStats();
        
        return `<div class="character-creation-step">
                <div class="step-header">
                    <h3>Step 8: Review & Create</h3>
                    <div class="step-progress">
                        <span class="step-number completed">1</span>
                        <span class="step-number completed">2</span>
                        <span class="step-number completed">3</span>
                        <span class="step-number completed">4</span>
                        <span class="step-number completed">5</span>
                        <span class="step-number completed">6</span>
                        <span class="step-number completed">7</span>
                        <span class="step-number active">8</span>
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
                        <button type="button" class="btn btn-secondary" id="prev-step-8">Previous</button>
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

        // ===== STEP 3: Adjust Ability Scores =====
        $('#prev-step-3').off('click').on('click', () => this.prevStep());
        $('#next-step-3').off('click').on('click', () => this.nextStep());
        
        // Ability adjustment buttons
        $(document).off('click', '.btn-adjust').on('click', '.btn-adjust', (e) => {
            const button = $(e.currentTarget);
            const action = button.data('action');
            const ability = button.data('ability');
            
            if (action === 'increase') {
                this.increaseAbility(ability);
            } else if (action === 'decrease') {
                this.decreaseAbility(ability);
            }
        });

        // ===== STEP 5: Starting Gold =====
        $('#prev-step-5').off('click').on('click', () => this.prevStep());
        $('#next-step-5').off('click').on('click', () => this.nextStep());
        
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
        
        // ===== STEP 4: Roll Hit Points =====
        $('#prev-step-4').off('click').on('click', () => this.prevStep());
        $('#next-step-4').off('click').on('click', () => this.nextStep());
        
        // Roll hit points button
        $('#roll-hit-points').off('click').on('click', () => {
            const characterClass = this.characterData.class || 'fighter';
            const classData = window.BECMI_CLASS_DATA[characterClass];
            const hitDie = classData.hitDie;
            const constitution = this.characterData.constitution || 10;
            const conBonus = this.getConstitutionHPBonus(constitution);
            
            // Roll the die
            const roll = Math.floor(Math.random() * hitDie) + 1;
            const totalHP = Math.max(1, roll + conBonus);
            
            // Save to character data
            this.characterData.hp_roll = roll;
            this.characterData.hit_points = totalHP;
            
            // Re-render step to show result
            this.renderStep();
        });
        
        // Re-roll hit points button
        $('#reroll-hp').off('click').on('click', () => {
            // Clear existing HP roll
            delete this.characterData.hp_roll;
            delete this.characterData.hit_points;
            
            // Re-render step
            this.renderStep();
        });

        // ===== STEP 5: Starting Gold =====
        $('#prev-step-5').off('click').on('click', () => this.prevStep());
        $('#next-step-5').off('click').on('click', () => this.nextStep());
        
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
        
        // ===== STEP 6: Equipment Purchase =====
        $('#prev-step-6').off('click').on('click', () => this.prevStep());
        $('#next-step-6').off('click').on('click', () => this.nextStep());
        
        // ===== STEP 7: Starting Spells =====
        $('#prev-step-7').off('click').on('click', () => this.prevStep());
        $('#next-step-7').off('click').on('click', () => this.nextStep());
        
        // Spell selection handlers
        $(document).off('click', '.btn-toggle-spell').on('click', '.btn-toggle-spell', (e) => {
            e.stopPropagation();
            const spellId = parseInt($(e.currentTarget).data('spell-id'));
            this.toggleStartingSpell(spellId);
        });
        
        // ===== STEP 8: Weapon Mastery =====
        $('#prev-step-8').off('click').on('click', () => this.prevStep());
        $('#next-step-8').off('click').on('click', () => this.nextStep());
        
        // Weapon selection handlers
        $('.weapon-card').off('click').on('click', (e) => {
            const weaponId = parseInt($(e.currentTarget).data('weapon-id'));
            this.toggleWeaponMastery(weaponId);
        });
        
        // Remove weapon handler
        $('[data-action="remove-weapon"]').off('click').on('click', (e) => {
            e.stopPropagation();
            const weaponId = parseInt($(e.currentTarget).data('weapon-id'));
            this.removeWeaponMastery(weaponId);
        });
        
        // ===== STEP 9: Skills =====
        $('#prev-step-9').off('click').on('click', () => this.prevStep());
        $('#next-step-9').off('click').on('click', () => this.nextStep());
        
        // Skill selection handlers
        $('.skill-card').off('click').on('click', (e) => {
            const skillName = $(e.currentTarget).data('skill-name');
            this.toggleSkill(skillName);
        });

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
        
        // ===== STEP 10: Character Details =====
        $('#prev-step-10').off('click').on('click', () => this.prevStep());
        $('#next-step-10').off('click').on('click', () => this.nextStep());
        
        // Physical attributes rolling
        $('#roll-physical-btn').off('click').on('click', () => this.rollAllPhysicalAttributes());
        $('.roll-btn').off('click').on('click', (e) => {
            const target = $(e.target).closest('.roll-btn').data('target');
            const rollType = $(e.target).closest('.roll-btn').data('roll');
            this.rollPhysicalAttribute(target, rollType);
        });
        
        // Gender selection change - enable portrait button when physical details are filled
        $('#character-gender, #character-hair, #character-eyes').off('change keyup').on('change keyup', () => {
            this.checkPortraitGenerationReady();
        });
        
        // Portrait generation
        $('#generate-portrait-btn').off('click').on('click', () => this.generateCharacterPortrait());
        
        // ===== STEP 11: Review & Create =====
        $('#prev-step-11').off('click').on('click', () => this.prevStep());
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
        $('#movement-rate').text(`${encumbrance.normalSpeed}' normal, ${encumbrance.encounterSpeed}' encounter`);
        
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
                return this.validateStep2(); // Choose class
            case 3:
                return this.validateStep3(); // Adjust abilities (optional)
            case 4:
                return this.validateStep4(); // Roll HP
            case 5:
                return this.validateStep5(); // Starting gold
            case 6:
                return this.validateStep6(); // Equipment purchase (optional)
            case 7:
                return this.validateStep7(); // Starting spells (optional)
            case 8:
                return this.validateStep8(); // Weapon mastery (optional but recommended)
            case 9:
                return this.validateStep9(); // Skills (optional but recommended)
            case 10:
                return this.validateStep10(); // Character details
            case 11:
                return true; // Review step - no validation needed
            default:
                return true;
        }
    }

    /**
     * Validate step 3 (Adjust Ability Scores)
     * Ability adjustments are optional - player can skip
     * 
     * @returns {boolean} Always true (optional step)
     */
    validateStep3() {
        // Ability adjustments are optional
        return true;
    }

    /**
     * Validate step 4 (Roll Hit Points)
     * HP must be rolled before proceeding
     * 
     * @returns {boolean} True if HP has been rolled
     */
    validateStep4() {
        if (this.characterData.hit_points === undefined || this.characterData.hit_points === null) {
            this.app.showError('Please roll for hit points before proceeding');
            return false;
        }
        return true;
    }

    /**
     * Validate step 5 (Starting Gold)
     * Gold must be rolled before proceeding
     * 
     * @returns {boolean} True if gold has been rolled
     */
    validateStep5() {
        if (this.characterData.starting_gold === undefined || this.characterData.starting_gold === null) {
            this.app.showError('Please roll for starting gold before proceeding');
            return false;
        }
        return true;
    }

    /**
     * Validate step 6 (Equipment Purchase)
     * Equipment purchase is optional - player can skip
     * 
     * @returns {boolean} Always true (optional step)
     */
    validateStep6() {
        // Equipment purchase is optional
        return true;
    }

    /**
     * Validate step 7 (Starting Spells)
     * Starting spells are optional (only for Magic-User/Elf)
     * 
     * @returns {boolean} Always true (optional step)
     */
    validateStep7() {
        // Starting spells are optional
        return true;
    }

    /**
     * Validate step 8 (Weapon Mastery)
     * Weapon mastery is optional but recommended
     * 
     * @returns {boolean} Always true (optional but recommended)
     */
    validateStep8() {
        // Weapon mastery is optional
        // Could add warning if none selected
        return true;
    }

    /**
     * Validate step 9 (Skills)
     * Skills are optional but recommended
     * 
     * @returns {boolean} Always true (optional but recommended)
     */
    validateStep9() {
        // Skills are optional
        // Could add warning if none selected
        return true;
    }

    /**
     * Validate step 10 (Character Details)
     * Physical attributes and background are optional
     * 
     * @returns {boolean} Always true (optional fields)
     */
    validateStep10() {
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
                // Step 3: Adjust Ability Scores
                // Ability adjustments are saved via the adjustment handlers
                // Nothing to save here (already in characterData)
                break;
                
            case 4:
                // Step 4: Roll Hit Points
                // HP is saved via the roll button handler
                // Nothing to save here (already in characterData)
                break;
                
            case 5:
                // Step 5: Starting Gold
                // Gold is saved via the roll button handler
                // Nothing to save here (already in characterData)
                break;
                
            case 6:
                // Step 6: Equipment Purchase
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
                
            case 7:
                // Step 7: Starting Spells
                // Starting spells already saved via spell selection handlers
                // Nothing to do here
                break;
                
            case 8:
                // Step 8: Weapon Mastery
                // Weapon masteries already saved via toggleWeaponMastery()
                // Nothing to do here
                break;
                
            case 9:
                // Step 9: Skills
                // Skills already saved via toggleSkill()
                // Nothing to do here
                break;
                
            case 10:
                // Step 10: Character Details (Physical attributes, gender, and background)
                this.characterData.gender = $('#character-gender').val();
                this.characterData.age = $('#character-age').val();
                this.characterData.height = $('#character-height').val();
                this.characterData.weight = $('#character-weight').val();
                this.characterData.hair_color = $('#character-hair').val();
                this.characterData.eye_color = $('#character-eyes').val();
                this.characterData.background = $('#character-background').val();
                // portrait_url is already saved when generated
                break;
                
            case 11:
                // Step 11: Review & Create
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
                            ${scores.map((score, index) => `<div class="score-chip" data-score="${score}" data-chip-id="${index}" draggable="true">
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
            const score = $(this).data('score');
            const chipId = $(this).data('chip-id');
            e.originalEvent.dataTransfer.setData('text/plain', `${score}|${chipId}`);
        });
        
        $('.score-drop-zone').on('dragover', function(e) {
            e.preventDefault();
        });
        
        $('.score-drop-zone').on('drop', function(e) {
            e.preventDefault();
            const data = e.originalEvent.dataTransfer.getData('text/plain');
            const [score, chipId] = data.split('|');
            
            // Check if this ability already has a score
            const currentScore = $(this).data('score');
            
            // If there was a previous score, put it back in available scores
            if (currentScore) {
                $('.available-scores .score-pool').append(`
                    <div class="score-chip" draggable="true" data-score="${currentScore}" data-chip-id="${Date.now()}">${currentScore}</div>
                `);
            }
            
            // Assign the new score
            $(this).find('.score-value').text(score);
            $(this).data('score', score);
            
            // Remove only the specific chip that was dragged (using unique chip ID)
            $(`.score-chip[data-chip-id="${chipId}"]`).remove();
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
            $('#class-requirements').css('display', 'none');
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
     * Check if portrait generation is ready (all required fields filled)
     */
    checkPortraitGenerationReady() {
        const gender = $('#character-gender').val();
        const hairColor = $('#character-hair').val();
        const eyeColor = $('#character-eyes').val();
        
        const isReady = gender && hairColor && eyeColor;
        
        $('#generate-portrait-btn').prop('disabled', !isReady);
        
        if (isReady) {
            $('.portrait-hint').text('Click to generate AI portrait');
        } else {
            $('.portrait-hint').text('Fill in gender, hair color, and eye color to generate a portrait');
        }
    }

    /**
     * Generate character portrait using Together AI
     */
    async generateCharacterPortrait() {
        try {
            const $btn = $('#generate-portrait-btn');
            const $preview = $('#portrait-preview');
            
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
                character_name: this.characterData.character_name,
                class: this.characterData.class,
                gender: $('#character-gender').val(),
                age: $('#character-age').val(),
                hair_color: $('#character-hair').val(),
                eye_color: $('#character-eyes').val()
            };
            
            console.log('Generating portrait with data:', portraitData);
            
            // Call the portrait API with temporary character ID
            // If character isn't created yet, we'll use a temporary approach
            const response = await this.apiClient.post('/api/character/generate-portrait-temp.php', portraitData);
            
            if (response.status === 'success' && response.data.portrait_url) {
                // Save portrait URL to character data
                this.characterData.portrait_url = response.data.portrait_url;
                
                // Display the generated portrait
                $preview.html(`
                    <img src="${response.data.portrait_url}" alt="Character Portrait" class="generated-portrait">
                    <p class="text-success"><i class="fas fa-check"></i> Portrait generated!</p>
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
            
            $('#portrait-preview').html(`
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
            $('#generate-portrait-btn').prop('disabled', false).html('<i class="fas fa-magic"></i> Generate AI Portrait');
        }
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
     * Toggle weapon mastery selection
     * Per BECMI rules, you can spend multiple weapon choices on the same weapon to increase mastery level
     * Basic (1 choice) → Skilled (2 choices) → Expert (3 choices) → Master (4 choices) → Grand Master (5 choices)
     * 
     * @param {number} weaponId - Item ID of weapon
     */
    toggleWeaponMastery(weaponId) {
        if (!this.characterData.weapon_masteries) {
            this.characterData.weapon_masteries = [];
        }
        
        const characterClass = this.characterData.class;
        const maxChoices = this.getWeaponMasteryChoices(characterClass);
        
        // Calculate total choices spent
        const totalChoicesSpent = this.characterData.weapon_masteries.reduce((sum, m) => {
            return sum + this.getMasteryChoicesCost(m.mastery_rank);
        }, 0);
        
        // Find existing mastery for this weapon
        const existingMastery = this.characterData.weapon_masteries.find(m => m.item_id === weaponId);
        
        if (existingMastery) {
            // Weapon already selected - increase mastery level if possible
            const currentRank = existingMastery.mastery_rank;
            const nextRank = this.getNextMasteryRank(currentRank);
            
            if (nextRank) {
                const nextCost = this.getMasteryChoicesCost(nextRank);
                const currentCost = this.getMasteryChoicesCost(currentRank);
                const additionalChoicesNeeded = nextCost - currentCost;
                
                if (totalChoicesSpent + additionalChoicesNeeded <= maxChoices) {
                    existingMastery.mastery_rank = nextRank;
                    this.app.showSuccess(`${this.getWeaponName(weaponId)} mastery increased to ${nextRank}!`);
                } else {
                    this.app.showError(`Not enough weapon choices remaining. Need ${additionalChoicesNeeded} more choice(s).`);
                    return;
                }
            } else {
                // Already at Grand Master - cannot increase further
                this.app.showError(`${this.getWeaponName(weaponId)} is already at Grand Master level!`);
                return;
            }
        } else {
            // New weapon - add at Basic level
            if (totalChoicesSpent + 1 <= maxChoices) {
                this.characterData.weapon_masteries.push({ 
                    item_id: weaponId, 
                    mastery_rank: 'basic'
                });
            } else {
                this.app.showError(`No weapon choices remaining. You have used all ${maxChoices} choice(s).`);
                return;
            }
        }
        
        // Re-render the step to show updates
        this.renderStep();
    }
    
    /**
     * Get the number of weapon choices required for a mastery rank
     * 
     * @param {string} rank - Mastery rank
     * @returns {number} Number of choices required
     */
    getMasteryChoicesCost(rank) {
        const costs = {
            'basic': 1,
            'skilled': 2,
            'expert': 3,
            'master': 4,
            'grand_master': 5
        };
        return costs[rank] || 1;
    }
    
    /**
     * Get the next mastery rank
     * 
     * @param {string} currentRank - Current mastery rank
     * @returns {string|null} Next rank or null if already at max
     */
    getNextMasteryRank(currentRank) {
        const progression = {
            'basic': 'skilled',
            'skilled': 'expert',
            'expert': 'master',
            'master': 'grand_master',
            'grand_master': null
        };
        return progression[currentRank] || null;
    }
    
    /**
     * Get weapon name by ID
     * 
     * @param {number} weaponId - Weapon item ID
     * @returns {string} Weapon name
     */
    getWeaponName(weaponId) {
        const weapon = this.availableWeapons?.find(w => w.item_id === weaponId);
        return weapon ? weapon.name : 'Unknown Weapon';
    }
    
    /**
     * Remove weapon mastery
     * 
     * @param {number} weaponId - Item ID of weapon
     */
    removeWeaponMastery(weaponId) {
        if (!this.characterData.weapon_masteries) {
            return;
        }
        
        const index = this.characterData.weapon_masteries.findIndex(m => m.item_id === weaponId);
        if (index >= 0) {
            this.characterData.weapon_masteries.splice(index, 1);
            this.renderStep();
        }
    }
    
    /**
     * Toggle skill selection
     * 
     * @param {string} skillName - Name of skill
     */
    toggleSkill(skillName) {
        if (!this.characterData.skills) {
            this.characterData.skills = [];
        }
        
        const index = this.characterData.skills.findIndex(s => s.skill_name === skillName);
        const intelligence = this.characterData.intelligence || 10;
        const maxSlots = this.getSkillSlots(intelligence);
        
        if (index >= 0) {
            // Remove if already selected
            this.characterData.skills.splice(index, 1);
        } else {
            // Add if not at limit
            if (this.characterData.skills.length < maxSlots) {
                this.characterData.skills.push({ skill_name: skillName });
            } else {
                this.app.showError(`You can only select ${maxSlots} skill(s) based on your Intelligence`);
                return;
            }
        }
        
        // Re-render the step to show updates
        this.renderStep();
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











