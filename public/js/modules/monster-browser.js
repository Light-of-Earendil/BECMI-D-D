/**
 * BECMI D&D Character Manager - Monster Browser Module
 * 
 * Provides UI for browsing monster types and creating monster instances.
 */

class MonsterBrowserModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentMonster = null;
        this.monsters = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.searchTerm = '';
        this.monsterTypeFilter = '';
        this.terrainFilter = '';
        
        console.log('Monster Browser Module initialized');
    }
    
    /**
     * Show monster browser modal
     * 
     * @param {number} sessionId - Session ID to add monsters to
     */
    async showMonsterBrowser(sessionId) {
        try {
            this.sessionId = sessionId;
            this.currentPage = 1;
            this.searchTerm = '';
            this.monsterTypeFilter = '';
            this.terrainFilter = '';
            
            // Remove existing modal
            $('#monster-browser-modal').remove();
            
            // Create modal
            const modal = $(`
                <div class="modal" id="monster-browser-modal">
                    <div class="modal-content" style="max-width: 900px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-dragon"></i> Monster Browser</h2>
                            <button type="button" class="modal-close" id="close-monster-browser">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="monster-browser-filters">
                                <div class="form-row">
                                    <div class="form-group col-md-4">
                                        <label>Search</label>
                                        <input type="text" id="monster-search" class="form-control" placeholder="Search monsters...">
                                    </div>
                                    <div class="form-group col-md-4">
                                        <label>Monster Type</label>
                                        <input type="text" id="monster-type-filter" class="form-control" placeholder="e.g., Humanoid">
                                    </div>
                                    <div class="form-group col-md-4">
                                        <label>Terrain</label>
                                        <input type="text" id="monster-terrain-filter" class="form-control" placeholder="e.g., Hill, Mountain">
                                    </div>
                                </div>
                            </div>
                            <div id="monster-list-container" class="monster-list-container">
                                <p>Loading monsters...</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="close-monster-browser-btn">Close</button>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            modal.addClass('show');
            
            // Setup event listeners
            $('#close-monster-browser, #close-monster-browser-btn').on('click', () => {
                $('#monster-browser-modal').remove();
            });
            
            $('#monster-browser-modal').on('click', (e) => {
                if (e.target.id === 'monster-browser-modal') {
                    $('#monster-browser-modal').remove();
                }
            });
            
            $('#monster-search').on('input', () => {
                this.searchTerm = $('#monster-search').val();
                this.currentPage = 1;
                this.loadMonsters();
            });
            
            $('#monster-type-filter').on('input', () => {
                this.monsterTypeFilter = $('#monster-type-filter').val();
                this.currentPage = 1;
                this.loadMonsters();
            });
            
            $('#monster-terrain-filter').on('input', () => {
                this.terrainFilter = $('#monster-terrain-filter').val();
                this.currentPage = 1;
                this.loadMonsters();
            });
            
            // Load monsters
            await this.loadMonsters();
            
        } catch (error) {
            console.error('Failed to show monster browser:', error);
            this.app.showError('Failed to open monster browser: ' + error.message);
        }
    }
    
    /**
     * Load monsters from API
     */
    async loadMonsters() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 20
            });
            
            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }
            
            if (this.monsterTypeFilter) {
                params.append('monster_type', this.monsterTypeFilter);
            }
            
            if (this.terrainFilter) {
                params.append('terrain', this.terrainFilter);
            }
            
            const response = await this.apiClient.get(`/api/monsters/list.php?${params.toString()}`);
            
            if (response.status === 'success') {
                this.monsters = response.data.monsters || [];
                this.totalPages = response.data.pagination?.total_pages || 1;
                this.renderMonsterList();
            } else {
                $('#monster-list-container').html('<p class="text-danger">Failed to load monsters</p>');
            }
            
        } catch (error) {
            console.error('Failed to load monsters:', error);
            $('#monster-list-container').html('<p class="text-danger">Error loading monsters: ' + error.message + '</p>');
        }
    }
    
    /**
     * Render monster list
     */
    renderMonsterList() {
        if (this.monsters.length === 0) {
            $('#monster-list-container').html('<p class="text-muted">No monsters found. Try adjusting your filters.</p>');
            return;
        }
        
        const listHTML = `
            <div class="monster-list">
                ${this.monsters.map(monster => `
                    <div class="monster-item" data-monster-id="${monster.monster_id}">
                        <div class="monster-item-content">
                            ${monster.image_url ? `
                                <div class="monster-item-image">
                                    <img src="${this.escapeHtml(monster.image_url)}" alt="${this.escapeHtml(monster.name)}" onerror="this.style.display='none'">
                                </div>
                            ` : ''}
                            <div class="monster-item-details">
                                <div class="monster-item-header">
                                    <h4>${this.escapeHtml(monster.name)}</h4>
                                    <button class="btn btn-primary btn-sm add-monster-btn" data-monster-id="${monster.monster_id}">
                                        <i class="fas fa-plus"></i> Add to Encounter
                                    </button>
                                </div>
                                <div class="monster-item-stats">
                            <div class="stat-row">
                                <span class="stat-label">AC:</span>
                                <span class="stat-value">${monster.armor_class}</span>
                                <span class="stat-label">HD:</span>
                                <span class="stat-value">${this.escapeHtml(monster.hit_dice)}</span>
                                <span class="stat-label">Move:</span>
                                <span class="stat-value">${this.escapeHtml(monster.move_ground || '-')}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Attacks:</span>
                                <span class="stat-value">${this.escapeHtml(monster.attacks)}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Damage:</span>
                                <span class="stat-value">${this.escapeHtml(monster.damage)}</span>
                                <span class="stat-label">XP:</span>
                                <span class="stat-value">${monster.xp_value}</span>
                            </div>
                            ${monster.monster_type ? `
                                <div class="stat-row">
                                    <span class="stat-label">Type:</span>
                                    <span class="stat-value">${this.escapeHtml(monster.monster_type)}</span>
                                </div>
                            ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${this.renderPagination()}
        `;
        
        $('#monster-list-container').html(listHTML);
        
        // Setup add monster buttons
        $('.add-monster-btn').on('click', (e) => {
            const monsterId = $(e.currentTarget).data('monster-id');
            const monster = this.monsters.find(m => m.monster_id == monsterId);
            if (monster) {
                this.showInstanceCreationModal(monster);
            }
        });
    }
    
    /**
     * Render pagination
     */
    renderPagination() {
        if (this.totalPages <= 1) {
            return '';
        }
        
        let paginationHTML = '<div class="monster-pagination">';
        
        if (this.currentPage > 1) {
            paginationHTML += `<button class="btn btn-sm btn-secondary" id="monster-page-prev">Previous</button>`;
        }
        
        paginationHTML += `<span class="page-info">Page ${this.currentPage} of ${this.totalPages}</span>`;
        
        if (this.currentPage < this.totalPages) {
            paginationHTML += `<button class="btn btn-sm btn-secondary" id="monster-page-next">Next</button>`;
        }
        
        paginationHTML += '</div>';
        
        // Setup pagination handlers
        setTimeout(() => {
            $('#monster-page-prev').on('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadMonsters();
                }
            });
            
            $('#monster-page-next').on('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadMonsters();
                }
            });
        }, 0);
        
        return paginationHTML;
    }
    
    /**
     * Show monster instance creation modal
     * 
     * @param {Object} monster - Monster type to create instance from
     */
    async showInstanceCreationModal(monster) {
        try {
            this.currentMonster = monster;
            
            // Remove existing modal
            $('#monster-instance-creation-modal').remove();
            
            // Calculate suggested average HP for display only.
            // Leaving the field blank should roll HP from Hit Dice per instance.
            const suggestedHP = this.calculateHPFromHitDice(monster.hit_dice);
            
            // Create modal
            const modal = $(`
                <div class="modal" id="monster-instance-creation-modal">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-plus-circle"></i> Create Monster Instance: ${this.escapeHtml(monster.name)}</h2>
                            <button type="button" class="modal-close" id="close-instance-creation">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="monster-instance-form">
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="is-named-boss"> Named Boss Monster
                                    </label>
                                    <small class="form-text text-muted">Check this for unique named monsters (e.g., "Gorthak the Destroyer")</small>
                                </div>
                                
                                <div class="form-group">
                                    <label>Instance Name</label>
                                    <input type="text" id="instance-name" class="form-control" 
                                           placeholder="Auto-generated if not specified">
                                    <small class="form-text text-muted" id="instance-name-help">
                                        Leave empty for auto-generated names (e.g., "${this.escapeHtml(monster.name)} #1")
                                    </small>
                                </div>
                                
                                <div class="form-group">
                                    <label>Hit Points</label>
                                    <input type="number" id="monster-hp" class="form-control" 
                                           min="1" ${suggestedHP !== null ? `placeholder="${suggestedHP}"` : ''}>
                                    <small class="form-text text-muted">
                                        ${suggestedHP !== null
                                            ? `Leave blank to roll HP from Hit Dice (${monster.hit_dice}) for each instance. Suggested average: ${suggestedHP} HP.`
                                            : `This monster's Hit Dice (${monster.hit_dice}) require manual HP entry or server-side clarification.`}
                                    </small>
                                </div>
                                
                                <div class="form-group">
                                    <label>Number of Instances</label>
                                    <input type="number" id="instance-count" class="form-control" 
                                           min="1" max="50" value="1">
                                    <small class="form-text text-muted">
                                        Create multiple generic instances at once (only for non-named monsters)
                                    </small>
                                </div>
                                
                                <div class="form-group">
                                    <label>Notes (optional)</label>
                                    <textarea id="monster-notes" class="form-control" rows="3" 
                                              placeholder="DM notes about this specific instance..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="cancel-instance-creation">Cancel</button>
                            <button type="button" class="btn btn-primary" id="create-instance-btn">
                                <i class="fas fa-plus"></i> Create & Add to Initiative
                            </button>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            modal.addClass('show');
            
            // Setup event listeners
            $('#close-instance-creation, #cancel-instance-creation').on('click', () => {
                $('#monster-instance-creation-modal').remove();
            });
            
            $('#monster-instance-creation-modal').on('click', (e) => {
                if (e.target.id === 'monster-instance-creation-modal') {
                    $('#monster-instance-creation-modal').remove();
                }
            });
            
            // Handle named boss checkbox
            $('#is-named-boss').on('change', (e) => {
                const isNamed = $(e.currentTarget).is(':checked');
                const nameInput = $('#instance-name');
                const countInput = $('#instance-count');
                
                if (isNamed) {
                    nameInput.prop('required', true);
                    nameInput.attr('placeholder', 'Enter unique name (e.g., "Gorthak the Destroyer")');
                    $('#instance-name-help').text('Required for named boss monsters');
                    countInput.val(1).prop('disabled', true);
                } else {
                    nameInput.prop('required', false);
                    nameInput.attr('placeholder', 'Auto-generated if not specified');
                    $('#instance-name-help').text(`Leave empty for auto-generated names (e.g., "${this.escapeHtml(monster.name)} #1")`);
                    countInput.prop('disabled', false);
                }
            });
            
            // Handle create button
            $('#create-instance-btn').on('click', () => {
                this.createMonsterInstance();
            });
            
        } catch (error) {
            console.error('Failed to show instance creation modal:', error);
            this.app.showError('Failed to open instance creation: ' + error.message);
        }
    }
    
    /**
     * Calculate HP from Hit Dice string
     * 
     * @param {string} hitDice - Hit Dice string (e.g., "3*", "11****", "1+1")
     * @returns {number|null} Suggested average HP or null when manual clarification is needed
     */
    calculateHPFromHitDice(hitDice) {
        const spec = this.parseHitDiceSpec(hitDice);

        if (spec.kind === 'fixed') {
            return spec.value;
        }

        if (spec.kind === 'half') {
            return Math.max(1, Math.round(2.5 + (spec.bonus || 0)));
        }

        if (spec.kind === 'dice') {
            return Math.max(1, Math.round((spec.diceCount * 4.5) + (spec.bonus || 0)));
        }

        if (spec.kind === 'range') {
            const averageDiceCount = (spec.min + spec.max) / 2;
            return Math.max(1, Math.round((averageDiceCount * 4.5) + (spec.bonus || 0)));
        }

        if (spec.kind === 'options') {
            const totalOptions = spec.options.reduce((sum, value) => sum + value, 0);
            const averageDiceCount = totalOptions / spec.options.length;
            return Math.max(1, Math.round((averageDiceCount * 4.5) + (spec.bonus || 0)));
        }

        return null;
    }

    /**
     * Parse BECMI hit dice text into a workable HP model.
     *
     * Ported from the encounter generator reference app to keep chargen
     * and DM tooling aligned on the same HD edge cases.
     */
    parseHitDiceSpec(hitDice) {
        const raw = String(hitDice || '').trim();
        const lowered = raw.toLowerCase();

        if (!raw) {
            return { kind: 'unknown', label: '-', note: 'HD missing' };
        }

        if (lowered.includes('special')) {
            return { kind: 'special', label: raw, note: 'HD is marked as Special' };
        }

        if (lowered.includes('som levende')) {
            return { kind: 'special', label: raw, note: "HD is 'same as living' and needs manual clarification" };
        }

        const normalizedSafe = lowered
            .replaceAll(' ', '')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/\u00bd/g, '1/2')
            .replaceAll('*', '')
            .replaceAll('(', '')
            .replaceAll(')', '');

        if (normalizedSafe === '1hp') {
            return { kind: 'fixed', label: raw, value: 1 };
        }

        if (normalizedSafe === '1-1') {
            return { kind: 'dice', label: raw, diceCount: 1, bonus: -1 };
        }

        const halfMatch = normalizedSafe.match(/^1\/2(?:\+(\d+))?$/);
        if (halfMatch) {
            return {
                kind: 'half',
                label: raw,
                bonus: halfMatch[1] ? parseInt(halfMatch[1], 10) : 0
            };
        }

        const threeOptionMatch = normalizedSafe.match(/^(\d+)\/(\d+)\/(\d+)(?:\+(\d+))?$/);
        if (threeOptionMatch) {
            return {
                kind: 'options',
                label: raw,
                options: [
                    parseInt(threeOptionMatch[1], 10),
                    parseInt(threeOptionMatch[2], 10),
                    parseInt(threeOptionMatch[3], 10)
                ],
                bonus: threeOptionMatch[4] ? parseInt(threeOptionMatch[4], 10) : 0
            };
        }

        const twoOptionMatch = normalizedSafe.match(/^(\d+)\/(\d+)(?:\+(\d+))?$/);
        if (twoOptionMatch) {
            return {
                kind: 'options',
                label: raw,
                options: [
                    parseInt(twoOptionMatch[1], 10),
                    parseInt(twoOptionMatch[2], 10)
                ],
                bonus: twoOptionMatch[3] ? parseInt(twoOptionMatch[3], 10) : 0
            };
        }

        const rangeMatch = normalizedSafe.match(/^(\d+)-(\d+)(?:\+(\d+))?$/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1], 10);
            const max = parseInt(rangeMatch[2], 10);

            if (min <= max) {
                return {
                    kind: 'range',
                    label: raw,
                    min,
                    max,
                    bonus: rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 0
                };
            }
        }

        const plusMatch = normalizedSafe.match(/^(\d+)\+(\d+)$/);
        if (plusMatch) {
            return {
                kind: 'dice',
                label: raw,
                diceCount: parseInt(plusMatch[1], 10),
                bonus: parseInt(plusMatch[2], 10)
            };
        }

        const plainMatch = normalizedSafe.match(/^(\d+)$/);
        if (plainMatch) {
            return {
                kind: 'dice',
                label: raw,
                diceCount: parseInt(plainMatch[1], 10),
                bonus: 0
            };
        }

        const firstNumberMatch = normalizedSafe.match(/\d+/);
        if (firstNumberMatch) {
            return {
                kind: 'dice',
                label: raw,
                diceCount: parseInt(firstNumberMatch[0], 10),
                bonus: 0,
                note: 'Partial HD parse'
            };
        }

        return { kind: 'unknown', label: raw, note: 'Could not parse HD format' };
    }
    
    /**
     * Create monster instance
     */
    async createMonsterInstance() {
        try {
            const isNamedBoss = $('#is-named-boss').is(':checked');
            const instanceName = $('#instance-name').val().trim();
            const hpRaw = String($('#monster-hp').val() || '').trim();
            const hp = hpRaw === '' ? null : parseInt(hpRaw, 10);
            const count = parseInt($('#instance-count').val()) || 1;
            const notes = $('#monster-notes').val().trim();

            if (hpRaw !== '' && (!Number.isInteger(hp) || hp < 1)) {
                this.app.showError('Hit Points must be blank or a whole number greater than 0');
                return;
            }
            
            if (isNamedBoss && !instanceName) {
                this.app.showError('Instance name is required for named boss monsters');
                return;
            }
            
            if (isNamedBoss && count > 1) {
                this.app.showError('Named boss monsters can only be created one at a time');
                return;
            }
            
            // Create instance(s)
            const requestData = {
                monster_id: this.currentMonster.monster_id,
                session_id: this.sessionId,
                instance_name: instanceName || null,
                is_named_boss: isNamedBoss,
                notes: notes || null,
                count: isNamedBoss ? 1 : count
            };

            if (hp !== null) {
                requestData.custom_hp = hp;
            }

            const response = await this.apiClient.post('/api/monsters/create-instance.php', requestData);
            
            if (response.status === 'success') {
                const instances = response.data.instances || [];

                let addedToInitiative = 0;
                for (const instance of instances) {
                    const wasAdded = await this.addToInitiative(instance.instance_id);
                    if (wasAdded) {
                        addedToInitiative++;
                    }
                }

                if (addedToInitiative === instances.length) {
                    this.app.showSuccess(`Created ${instances.length} monster instance(s) and added them to initiative.`);
                } else if (addedToInitiative > 0) {
                    this.app.showSuccess(`Created ${instances.length} monster instance(s). ${addedToInitiative} were added to initiative.`);
                    this.app.showError(`${instances.length - addedToInitiative} monster instance(s) were created but not added to initiative.`);
                } else {
                    this.app.showSuccess(`Created ${instances.length} monster instance(s).`);
                    this.app.showError('The monster instance(s) were not added to initiative.');
                }
                
                // Close modals
                $('#monster-instance-creation-modal').remove();
                $('#monster-browser-modal').remove();
                
                // Refresh initiative tracker if session management module exists
                if (this.app.modules.sessionManagement) {
                    await this.app.modules.sessionManagement.refreshInitiativeTracker(this.sessionId);
                }
                
            } else {
                this.app.showError(response.message || 'Failed to create monster instance');
            }
            
        } catch (error) {
            console.error('Failed to create monster instance:', error);
            this.app.showError('Failed to create monster instance: ' + error.message);
        }
    }
    
    /**
     * Add monster instance to initiative
     * 
     * @param {number} instanceId - Monster instance ID
     */
    async addToInitiative(instanceId) {
        try {
            const response = await this.apiClient.post('/api/combat/add-monster.php', {
                monster_instance_id: instanceId,
                session_id: this.sessionId
            });

            return response.status === 'success';
        } catch (error) {
            console.error('Failed to add monster to initiative:', error);
            return false;
        }
    }
    
    /**
     * Escape HTML
     */
    /**
     * Escape HTML to prevent XSS
     * @deprecated Use global escapeHtml() function from utils.js instead
     */
    escapeHtml(text) {
        return escapeHtml(text);
    }
}

// Export to window
window.MonsterBrowserModule = MonsterBrowserModule;
