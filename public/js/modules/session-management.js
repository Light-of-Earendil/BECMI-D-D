/**
 * BECMI D&D Character Manager - Session Management Module
 * 
 * Handles game session creation, management, and DM dashboard functionality.
 */

class SessionManagementModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.currentSession = null;
        this.isLoadingDashboard = false;
        this.lastDashboardLoad = null;
        this.gameTimeRealtimeClient = null;
        this.playerInitiativePollInterval = null;
        this.playerInitiativePollInterval = null;
        
        console.log('Session Management Module initialized');
    }
    
    /**
     * Render session management view
     */
    async render() {
        try {
            const sessions = this.app.state.sessions || [];
            
            if (sessions.length === 0) {
                return this.renderEmptySessionList();
            }
            
            return this.renderSessionList(sessions);
            
        } catch (error) {
            console.error('Session management render error:', error);
            return '<div class="card"><h2>Error</h2><p>Failed to load session management.</p></div>';
        }
    }
    
    /**
     * Render empty session list
     */
    renderEmptySessionList() {
        return `<div class="sessions-container">
                <div class="sessions-header">
                    <h1>Game Sessions</h1>
                    <button class="btn btn-primary" id="create-session-btn">
                        <i class="fas fa-calendar-plus"></i>
                        Create Session
                    </button>
                </div>
                
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <h2>No Sessions Yet</h2>
                    <p>Create your first game session to get started!</p>
                    <button class="btn btn-primary btn-lg" id="create-session-btn">
                        <i class="fas fa-calendar-plus"></i>
                        Create Session
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render session list
     */
    renderSessionList(sessions) {
        return `<div class="sessions-container">
                <div class="sessions-header">
                    <h1>Game Sessions</h1>
                    <button class="btn btn-primary" id="create-session-btn">
                        <i class="fas fa-calendar-plus"></i>
                        Create Session
                    </button>
                </div>
                
                <div class="sessions-grid">
                    ${sessions.map(session => this.renderSessionCard(session)).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render individual session card
     */
    renderSessionCard(session) {
        const sessionDate = new Date(session.session_datetime);
        const now = new Date();
        const isUpcoming = sessionDate > now && session.status === 'scheduled';
        const isActive = session.status === 'active';
        const isPast = sessionDate < now;
        
        let statusClass = 'scheduled';
        let statusText = 'Scheduled';
        
        if (isActive) {
            statusClass = 'active';
            statusText = 'Active';
        } else if (session.status === 'completed') {
            statusClass = 'completed';
            statusText = 'Completed';
        } else if (session.status === 'cancelled') {
            statusClass = 'cancelled';
            statusText = 'Cancelled';
        } else if (isPast) {
            statusClass = 'past';
            statusText = 'Past';
        }
        
        return `<div class="session-card ${statusClass}"data-session-id="${session.session_id}">
                <div class="session-header">
                    <h3>${session.session_title}</h3>
                    <span class="session-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="session-details">
                    <div class="session-date">
                        <i class="fas fa-calendar"></i>
                        <span>${sessionDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'})}</span>
                    </div>
                    
                    <div class="session-time">
                        <i class="fas fa-clock"></i>
                        <span>${sessionDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'})}</span>
                    </div>
                    
                    <div class="session-duration">
                        <i class="fas fa-hourglass-half"></i>
                        <span>${session.duration_minutes || 240} minutes</span>
                    </div>
                    
                    <div class="session-players">
                        <i class="fas fa-users"></i>
                        <span>${session.current_players || 0}/${session.max_players || 6} players</span>
                    </div>
                </div>
                
                <div class="session-description">
                    <p>${session.session_description || 'No description provided.'}</p>
                </div>
                
                ${session.invitation_status === 'invited' ? `
                    <div class="invitation-notice" style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 0.5rem; margin: 0.5rem 0; border-radius: 4px;">
                        <i class="fas fa-envelope-open" style="margin-right: 0.5rem;"></i>
                        <span>You've been invited to join this session</span>
                    </div>
                ` : ''}
                
                <div class="session-actions">
                    ${session.invitation_status === 'invited' ? `
                        <button class="btn btn-sm btn-success" data-action="accept-invitation" data-session-id="${session.session_id}">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="btn btn-sm btn-danger" data-action="decline-invitation" data-session-id="${session.session_id}">
                            <i class="fas fa-times"></i> Decline
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-primary"data-action="view-session"data-session-id="${session.session_id}">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                    `}
                    ${session.is_dm ? `
                        <button class="btn btn-sm btn-secondary"data-action="edit-session"data-session-id="${session.session_id}">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        ${isUpcoming ? `<button class="btn btn-sm btn-success"data-action="start-session"data-session-id="${session.session_id}">
                                <i class="fas fa-play"></i>
                                Start
                            </button>
                        `: ''}
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Show session creation modal
     */
    showCreationModal() {
        $('#session-creation-modal').show();
        this.renderSessionCreationForm();
    }
    
    /**
     * Hide session creation modal
     */
    hideCreationModal() {
        $('#session-creation-modal').hide();
    }
    
    /**
     * Render session creation form
     */
    renderSessionCreationForm() {
        const content = $('#session-creation-content');
        
        content.html(`<div class="session-creation-form">
                <form id="session-creation-form" class="session-form">
                    <div class="form-group">
                        <label for="session-title">Session Title:</label>
                        <input type="text" id="session-title" name="session_title" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="session-description">Description:</label>
                        <textarea id="session-description" name="session_description" rows="3" placeholder="Describe the session, adventure, or campaign..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="session-campaign">Campaign (Optional):</label>
                        <select id="session-campaign" name="campaign_id">
                            <option value="">-- No Campaign --</option>
                        </select>
                        <small class="form-hint">Select a campaign to organize this session</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="meet-link">Video Conference Link (Optional):</label>
                        <div class="input-with-button">
                            <input type="url" id="meet-link" name="meet_link" placeholder="https://meet.google.com/xxx-xxxx-xxx" pattern="https?://.*">
                            <button type="button" class="btn btn-secondary" id="generate-meet-link-btn" title="Open Google Meet to create a new meeting">
                                <i class="fas fa-video"></i> Generate Link
                            </button>
                        </div>
                        <small class="form-hint">Add a Google Meet or other video conference link for this session</small>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="session-date">Date:</label>
                            <input type="date" id="session-date" name="session_date" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="session-time">Time:</label>
                            <input type="time" id="session-time" name="session_time" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="session-duration">Duration (minutes):</label>
                            <select id="session-duration" name="duration_minutes">
                                <option value="120">2 hours</option>
                                <option value="180">3 hours</option>
                                <option value="240" selected>4 hours</option>
                                <option value="300">5 hours</option>
                                <option value="360">6 hours</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="max-players">Max Players:</label>
                            <select id="max-players" name="max_players">
                                <option value="4">4 players</option>
                                <option value="5">5 players</option>
                                <option value="6" selected>6 players</option>
                                <option value="7">7 players</option>
                                <option value="8">8 players</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancel-session-creation">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Session</button>
                    </div>
                </form>
            </div>
        `);
        
        this.setupSessionCreationHandlers();
        
        // Load campaigns for dropdown
        this.loadCampaignsForDropdown('#session-campaign');
        
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        $('#session-date').val(tomorrow.toISOString().split('T')[0]);
        
        // Set default time to 7 PM
        $('#session-time').val('19:00');
    }
    
    /**
     * Load campaigns and populate dropdown
     */
    async loadCampaignsForDropdown(selector) {
        try {
            const response = await this.apiClient.get('/api/campaigns/list.php');
            if (response.status === 'success' && response.data.campaigns) {
                const $select = $(selector);
                const campaigns = response.data.campaigns;
                
                // Clear existing options except the first one
                $select.find('option:not(:first)').remove();
                
                // Add campaign options
                campaigns.forEach(campaign => {
                    $select.append(`<option value="${campaign.campaign_id}">${this.escapeHtml(campaign.campaign_name)}</option>`);
                });
            }
        } catch (error) {
            console.error('Failed to load campaigns for dropdown:', error);
            // Don't show error to user - just leave dropdown empty
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Setup session creation event handlers
     */
    setupSessionCreationHandlers() {
        $('#session-creation-form').off('submit').on('submit', (e) => {
            e.preventDefault();
            this.createSession();
        });
        
        $('#cancel-session-creation').off('click').on('click', () => {
            this.hideCreationModal();
        });
        
        // Generate Meet Link button
        $('#generate-meet-link-btn').off('click').on('click', () => {
            // Open Google Meet in new tab
            window.open('https://meet.google.com/new', '_blank');
            // Show hint to copy link
            setTimeout(() => {
                this.app.showInfo('Create a meeting in the new tab, then copy the link and paste it above.');
            }, 500);
        });
    }
    
    /**
     * Create session
     */
    async createSession() {
        try {
            const formData = new FormData(document.getElementById('session-creation-form'));
            
            const campaignId = formData.get('campaign_id');
            const sessionData = {
                session_title: formData.get('session_title'),
                session_description: formData.get('session_description'),
                meet_link: formData.get('meet_link') || '',
                session_datetime: `${formData.get('session_date')} ${formData.get('session_time')}:00`,
                duration_minutes: parseInt(formData.get('duration_minutes')),
                max_players: parseInt(formData.get('max_players')),
                campaign_id: campaignId && campaignId !== '' ? parseInt(campaignId) : null
            };
            
            // Validate required fields
            if (!sessionData.session_title || !sessionData.session_datetime) {
                this.app.showError('Please fill in all required fields');
                return;
            }
            
            // Validate session date is in the future
            const sessionDate = new Date(sessionData.session_datetime);
            const now = new Date();
            if (sessionDate <= now) {
                this.app.showError('Session date must be in the future');
                return;
            }
            
            const response = await this.apiClient.post('/api/session/create.php', sessionData);
            
            if (response.status === 'success') {
                this.app.showSuccess(`Session "${sessionData.session_title}"created successfully!`);
                this.hideCreationModal();
                
                // Refresh session list
                if (this.app.loadUserData) {
                    await this.app.loadUserData();
                }
                
                if (this.app.eventBus && typeof this.app.eventBus.emit === 'function') {
                    const payload = response.data && response.data.session ? response.data.session : null;
                    this.app.eventBus.emit(BECMI_EVENTS.SESSION_CREATED, payload);
                }
                
                // Navigate to sessions view
                if (this.app.navigateToView) {
                    this.app.navigateToView('sessions');
                }
                
            } else {
                this.app.showError(response.message || 'Failed to create session');
            }
            
        } catch (error) {
            console.error('Session creation error:', error);
            this.app.showError('Failed to create session: '+ error.message);
        }
    }
    
    /**
     * Load session details
     */
    async loadSession(sessionId) {
        try {
            console.log(`Loading session ${sessionId}...`);
            
            // This would call a session details API endpoint
            // For now, find the session in the current state
            const session = this.app.state.sessions.find(s => s.session_id == sessionId);
            
            if (session) {
                this.currentSession = session;
                this.app.updateState({ currentSession: this.currentSession });
                console.log(`Session loaded: ${session.session_title}`);
                return session;
            } else {
                throw new Error('Session not found');
            }
            
        } catch (error) {
            console.error('Failed to load session:', error);
            this.app.showError('Failed to load session: '+ error.message);
            throw error;
        }
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Session card actions
        $(document).on('click', '[data-action="view-session"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.viewSession(sessionId);
        });
        
        $(document).on('click', '[data-action="edit-session"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.editSession(sessionId);
        });
        
        $(document).on('click', '[data-action="start-session"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.startSession(sessionId);
        });
        
        // Create session button
        $(document).on('click', '#create-session-btn', (e) => {
            e.preventDefault();
            this.showCreationModal();
        });
        
        // Player invitation actions
        $(document).on('click', '[data-action="invite-player"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.showInvitePlayerModal(sessionId);
        });
        
        $(document).on('click', '[data-action="remove-player"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            const userId = $(e.currentTarget).data('user-id');
            const username = $(e.currentTarget).data('username');
            this.removePlayer(sessionId, userId, username);
        });
        
        // Add/Edit Meet Link buttons
        $(document).on('click', '#add-meet-link-btn, #edit-meet-link-btn', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.editSession(sessionId); // Opens edit modal where they can add/edit meet link
        });
        
        $(document).on('click', '[data-action="accept-invitation"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.acceptInvitation(sessionId);
        });
        
        $(document).on('click', '[data-action="decline-invitation"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.declineInvitation(sessionId);
        });
        
        // Assign character to session
        $(document).on('click', '[data-action="assign-character"]', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            const characterName = $(e.currentTarget).data('character-name');
            const sessionId = $(e.currentTarget).data('session-id');
            
            if (!characterId || !sessionId) {
                this.app.showError('Missing character or session ID');
                return;
            }
            
            // Confirm assignment
            if (!confirm(`Assign "${characterName}" to this session?`)) {
                return;
            }
            
            try {
                const response = await this.apiClient.put('/api/character/update.php', {
                    character_id: characterId,
                    session_id: sessionId
                });
                
                if (response.status === 'success') {
                    this.app.showSuccess(`Character "${characterName}" assigned to session successfully`);
                    
                    // Reload available characters and players list
                    await this.loadAvailableCharacters(sessionId);
                    await this.loadAndRenderPlayers(sessionId);
                    
                    // Load and display the assigned character
                    await this.loadAndDisplayPlayerCharacter(characterId, sessionId);
                } else {
                    this.app.showError(response.message || 'Failed to assign character');
                }
            } catch (error) {
                console.error('Failed to assign character:', error);
                this.app.showError('Failed to assign character: ' + error.message);
            }
        });
        
        // DM Dashboard actions
        $(document).on('click', '[data-action="view-dm-dashboard"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.viewDMDashboard(sessionId);
        });
        
        // Refresh dashboard button
        $(document).on('click', '#refresh-dashboard', async (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id') || this.currentSession?.session_id;
            if (sessionId) {
                await this.viewDMDashboard(sessionId);
            }
        });
        
        // Award XP button
        $(document).on('click', '#award-xp-btn', async (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id') || this.currentSession?.session_id;
            if (sessionId && this.app.modules.dmDashboard) {
                await this.app.modules.dmDashboard.showAwardXPModal(sessionId);
            }
        });
        
        // Toggle auto-refresh
        $(document).on('click', '#toggle-auto-refresh', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id') || this.currentSession?.session_id;
            if (this.app.modules.dmDashboard) {
                if (this.app.modules.dmDashboard.autoRefreshInterval) {
                    this.app.modules.dmDashboard.stopAutoRefresh();
                    $(e.currentTarget).html('<i class="fas fa-clock"></i> Auto-refresh: OFF');
                } else {
                    this.app.modules.dmDashboard.currentSessionId = sessionId;
                    this.app.modules.dmDashboard.startAutoRefresh();
                    $(e.currentTarget).html('<i class="fas fa-clock"></i> Auto-refresh: ON');
                }
            }
        });
        
        // Time advancement buttons
        $(document).on('click', '#advance-round-btn', async (e) => {
            e.preventDefault();
            await this.advanceCampaignTime('round', e.currentTarget);
        });
        
        $(document).on('click', '#advance-turn-btn', async (e) => {
            e.preventDefault();
            await this.advanceCampaignTime('turn', e.currentTarget);
        });
        
        $(document).on('click', '#advance-day-btn', async (e) => {
            e.preventDefault();
            await this.advanceCampaignTime('day', e.currentTarget);
        });
        
        $(document).on('click', '[data-action="back-to-sessions"]', (e) => {
            e.preventDefault();
            this.app.navigateToView('sessions');
        });
        
        // DM HP Control actions
        $(document).on('click', '[data-action="dm-damage-character"]', (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            const characterName = $(e.currentTarget).data('character-name');
            this.dmDamageCharacter(characterId, characterName);
        });
        
        $(document).on('click', '[data-action="dm-heal-character"]', (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            const characterName = $(e.currentTarget).data('character-name');
            this.dmHealCharacter(characterId, characterName);
        });
        
        $(document).on('click', '[data-action="dm-set-hp"]', (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            const characterName = $(e.currentTarget).data('character-name');
            this.dmSetHP(characterId, characterName);
        });
        
        // Award standard bonus (1/20 of next level XP)
        $(document).on('click', '[data-action="award-standard-bonus"]', async (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            const characterName = $(e.currentTarget).data('character-name');
            const xpAmount = $(e.currentTarget).data('xp-amount');
            const sessionId = this.currentSession?.session_id;
            
            if (!sessionId) {
                this.app.showError('Session ID not found');
                return;
            }
            
            // Confirm action
            if (!confirm(`Award ${xpAmount.toLocaleString()} XP (1/20 of next level) to ${characterName}?\n\nStandard bonus for: quests, good roleplay, saving allies, exceptional skill use`)) {
                return;
            }
            
            try {
                const response = await this.apiClient.post('/api/character/grant-xp.php', {
                    session_id: sessionId,
                    character_ids: [characterId],
                    xp_amount: xpAmount,
                    reason: 'Standard Bonus (1/20 of next level) - Quest completion, good roleplay, saving allies, or exceptional skill use'
                });
                
                if (response.status === 'success') {
                    // Show actual XP awarded (with bonus/penalty)
                    const char = response.data.characters && response.data.characters[0];
                    if (char && char.xp_adjusted !== undefined) {
                        let message = `Awarded ${char.xp_adjusted.toLocaleString()} XP to ${characterName}`;
                        if (char.xp_bonus !== 0) {
                            const percentText = char.xp_multiplier > 1 ? ` (+${Math.round((char.xp_multiplier - 1) * 100)}%)` : 
                                               char.xp_multiplier < 1 ? ` (${Math.round((char.xp_multiplier - 1) * 100)}%)` : '';
                            message += ` (base: ${char.xp_base.toLocaleString()}${percentText})`;
                        }
                        this.app.showSuccess(message);
                    } else {
                        this.app.showSuccess(`Awarded ${xpAmount.toLocaleString()} XP to ${characterName}`);
                    }
                    
                    // Show notification if character can level up
                    if (response.data.level_up_count > 0) {
                        this.app.showSuccess(`${characterName} is ready to level up!`);
                    }
                    
                    // Refresh dashboard
                    await this.viewDMDashboard(sessionId);
                } else {
                    this.app.showError(response.message || 'Failed to award XP');
                }
            } catch (error) {
                console.error('Failed to award standard bonus:', error);
                this.app.showError('Failed to award XP: ' + error.message);
            }
        });
        
        // Initiative Tracker actions
        $(document).on('click', '[data-action="add-monster"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            if (this.app.modules.monsterBrowser) {
                this.app.modules.monsterBrowser.showMonsterBrowser(sessionId);
            } else {
                this.app.showError('Monster browser module not available');
            }
        });
        
        $(document).on('click', '[data-action="initiative-roll"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.rollInitiative(sessionId);
        });
        
        $(document).on('click', '[data-action="initiative-next"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.nextTurn(sessionId);
        });
        
        $(document).on('click', '[data-action="initiative-prev"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.previousTurn(sessionId);
        });
        
        $(document).on('click', '[data-action="initiative-clear"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.clearInitiative(sessionId);
        });
        
        // Click on character entry to remove from initiative (if not current turn)
        $(document).on('click', '.initiative-entry:not(.monster-entry)', async (e) => {
            e.preventDefault();
            const $entry = $(e.currentTarget);
            const initiativeId = $entry.data('initiative-id');
            const characterId = $entry.data('character-id');
            const entityName = $entry.find('.character-name-row strong').text();
            const sessionId = this.currentSession?.session_id;
            
            if (!initiativeId || !characterId || !sessionId) {
                return;
            }
            
            // Don't allow removing current turn
            if ($entry.hasClass('current-turn')) {
                this.app.showError('Cannot remove character during their turn. Advance turn first.');
                return;
            }
            
            if (confirm(`Remove ${entityName} from initiative tracker?`)) {
                try {
                    const response = await this.apiClient.post('/api/combat/remove-character.php', {
                        initiative_id: initiativeId,
                        session_id: sessionId
                    });
                    
                    if (response.status === 'success') {
                        this.app.showSuccess(`${entityName} removed from initiative`);
                        await this.refreshInitiativeTracker(sessionId);
                    } else {
                        this.app.showError(response.message || 'Failed to remove character');
                    }
                } catch (error) {
                    console.error('Failed to remove character:', error);
                    this.app.showError('Failed to remove character: ' + error.message);
                }
            }
        });
        
        // Click on monster entry to place token on map
        $(document).on('click', '.initiative-entry.monster-entry', async (e) => {
            e.preventDefault();
            const $entry = $(e.currentTarget);
            const monsterInstanceId = $entry.data('monster-instance-id');
            const initiativeId = $entry.data('initiative-id');
            const entityName = $entry.find('.character-name-row strong').text();
            
            if (!monsterInstanceId) {
                return;
            }
            
            // Check if map scratchpad module is available
            if (!this.app.modules.sessionMapScratchpad) {
                this.app.showError('Map scratchpad is not available');
                return;
            }
            
            // Get current map ID
            const currentMapId = this.app.modules.sessionMapScratchpad.currentMapId;
            if (!currentMapId) {
                this.app.showError('No active map. Please open a map first.');
                return;
            }
            
            // Show message to click on map
            this.app.showSuccess(`Click on the map to place token for ${entityName}`);
            
            // Set up one-time click handler on map
            const mapCanvas = document.getElementById('map-token-canvas');
            if (!mapCanvas) {
                this.app.showError('Map canvas not found');
                return;
            }
            
            const handleMapClick = async (event) => {
                const rect = mapCanvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                
                // Remove handler
                mapCanvas.removeEventListener('click', handleMapClick);
                
                // Place token
                try {
                    await this.app.modules.sessionMapScratchpad.addToken(
                        currentMapId,
                        null, // character_id
                        'marker',
                        x,
                        y,
                        '#DC3545', // Red color for monsters
                        entityName,
                        monsterInstanceId,
                        initiativeId
                    );
                    
                    this.app.showSuccess(`Token placed for ${entityName}`);
                } catch (error) {
                    console.error('Failed to place monster token:', error);
                    this.app.showError('Failed to place token: ' + error.message);
                }
            };
            
            mapCanvas.addEventListener('click', handleMapClick, { once: true });
        });
        
        // Click on HP display to adjust HP
        $(document).on('click', '.initiative-hp-display', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const $hpDisplay = $(e.currentTarget);
            const entityType = $hpDisplay.data('entity-type');
            const monsterInstanceId = $hpDisplay.data('monster-instance-id');
            const characterId = $hpDisplay.data('character-id');
            const sessionId = this.currentSession?.session_id;
            const entityName = $hpDisplay.closest('.initiative-entry').find('.character-name-row strong').text();
            
            if (!sessionId) {
                return;
            }
            
            if (entityType === 'monster' && monsterInstanceId) {
                await this.showHPAdjustModal('monster', monsterInstanceId, null, entityName, sessionId);
            } else if (entityType === 'character' && characterId) {
                await this.showHPAdjustModal('character', null, characterId, entityName, sessionId);
            }
        });
    }
    
    /**
     * Show HP adjustment modal
     * 
     * @param {string} entityType - 'monster' or 'character'
     * @param {number|null} monsterInstanceId - Monster instance ID (if monster)
     * @param {number|null} characterId - Character ID (if character)
     * @param {string} entityName - Name of entity
     * @param {number} sessionId - Session ID
     */
    async showHPAdjustModal(entityType, monsterInstanceId, characterId, entityName, sessionId) {
        try {
            // Get current HP
            let currentHP, maxHP;
            
            if (entityType === 'monster') {
                const response = await this.apiClient.get(`/api/monsters/list-instances.php?session_id=${sessionId}`);
                if (response.status === 'success') {
                    const instance = response.data.instances.find(i => i.instance_id === monsterInstanceId);
                    if (!instance) {
                        this.app.showError('Monster instance not found');
                        return;
                    }
                    currentHP = instance.current_hp;
                    maxHP = instance.max_hp;
                } else {
                    this.app.showError('Failed to load monster data');
                    return;
                }
            } else {
                const dashboardData = await this.loadDMDashboard(sessionId);
                const character = dashboardData.players
                    .flatMap(p => p.characters || [])
                    .find(c => c.character_id === characterId);
                if (!character) {
                    this.app.showError('Character not found');
                    return;
                }
                currentHP = character.hp.current;
                maxHP = character.hp.max;
            }
            
            // Create modal
            const modal = $(`
                <div class="modal" id="hp-adjust-modal">
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-heart"></i> Adjust HP: ${this.escapeHtml(entityName)}</h2>
                            <button type="button" class="modal-close" id="close-hp-adjust">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div style="text-align: center; margin-bottom: var(--space-4);">
                                <div style="font-size: 2rem; font-weight: bold; color: var(--wood-900);">
                                    ${currentHP} / ${maxHP}
                                </div>
                                <div style="font-size: 0.9em; color: var(--text-soft); margin-top: var(--space-1);">
                                    Current HP
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Damage (negative) or Heal (positive)</label>
                                <input type="number" id="hp-change-input" class="form-control" 
                                       placeholder="e.g., -5 for damage, +3 for healing" 
                                       style="font-size: 1.2rem; text-align: center;">
                            </div>
                            
                            <div class="form-group">
                                <label>Or set exact HP</label>
                                <input type="number" id="hp-exact-input" class="form-control" 
                                       placeholder="e.g., 10" 
                                       min="-10" max="${maxHP}"
                                       style="font-size: 1.2rem; text-align: center;">
                            </div>
                            
                            <div style="display: flex; gap: var(--space-2); margin-top: var(--space-4);">
                                <button class="btn btn-danger btn-sm" id="quick-damage-1" data-amount="-1">
                                    -1
                                </button>
                                <button class="btn btn-danger btn-sm" id="quick-damage-5" data-amount="-5">
                                    -5
                                </button>
                                <button class="btn btn-danger btn-sm" id="quick-damage-10" data-amount="-10">
                                    -10
                                </button>
                                <button class="btn btn-success btn-sm" id="quick-heal-1" data-amount="1">
                                    +1
                                </button>
                                <button class="btn btn-success btn-sm" id="quick-heal-5" data-amount="5">
                                    +5
                                </button>
                                <button class="btn btn-success btn-sm" id="quick-heal-10" data-amount="10">
                                    +10
                                </button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="close-hp-adjust-btn">Cancel</button>
                            <button type="button" class="btn btn-primary" id="apply-hp-change">Apply</button>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            modal.addClass('show');
            
            // Setup event listeners
            $('#close-hp-adjust, #close-hp-adjust-btn').on('click', () => {
                $('#hp-adjust-modal').remove();
            });
            
            $('#hp-adjust-modal').on('click', (e) => {
                if (e.target.id === 'hp-adjust-modal') {
                    $('#hp-adjust-modal').remove();
                }
            });
            
            // Quick damage/heal buttons
            $('[id^="quick-"]').on('click', (e) => {
                const amount = parseInt($(e.currentTarget).data('amount'));
                $('#hp-change-input').val(amount);
                $('#hp-exact-input').val('');
            });
            
            // Apply HP change
            $('#apply-hp-change').on('click', async () => {
                const hpChange = $('#hp-change-input').val();
                const exactHP = $('#hp-exact-input').val();
                
                if (!hpChange && !exactHP) {
                    this.app.showError('Please enter a damage/heal amount or exact HP value');
                    return;
                }
                
                try {
                    let response;
                    
                    if (entityType === 'monster') {
                        const payload = {};
                        if (exactHP) {
                            payload.new_hp = parseInt(exactHP);
                        } else {
                            payload.hp_change = parseInt(hpChange);
                        }
                        payload.instance_id = monsterInstanceId;
                        
                        response = await this.apiClient.post('/api/monsters/update-hp.php', payload);
                    } else {
                        const payload = {
                            character_id: characterId
                        };
                        if (exactHP) {
                            payload.new_hp = parseInt(exactHP);
                        } else {
                            payload.hp_change = parseInt(hpChange);
                        }
                        
                        response = await this.apiClient.post('/api/character/update-hp.php', payload);
                    }
                    
                    if (response.status === 'success') {
                        const newHP = response.data.current_hp || response.data.new_hp;
                        const maxHP = response.data.max_hp;
                        const isDead = response.data.is_dead;
                        
                        if (isDead) {
                            this.app.showError(`${entityName} is now DEAD (${newHP}/${maxHP})`);
                        } else {
                            this.app.showSuccess(`${entityName} HP: ${newHP}/${maxHP}`);
                        }
                        
                        $('#hp-adjust-modal').remove();
                        
                        // Refresh initiative tracker to show updated HP
                        await this.refreshInitiativeTracker(sessionId);
                    } else {
                        this.app.showError(response.message || 'Failed to update HP');
                    }
                } catch (error) {
                    console.error('Failed to update HP:', error);
                    this.app.showError('Failed to update HP: ' + error.message);
                }
            });
            
            // Enter key to apply
            $('#hp-change-input, #hp-exact-input').on('keypress', (e) => {
                if (e.which === 13) { // Enter key
                    $('#apply-hp-change').click();
                }
            });
            
        } catch (error) {
            console.error('Failed to show HP adjust modal:', error);
            this.app.showError('Failed to load HP data: ' + error.message);
        }
    }
    
    /**
     * View session details
     */
    async viewSession(sessionId) {
        try {
            await this.loadSession(sessionId);
            
            // Check if user is DM for this session
            const isDM = this.currentSession.is_dm || 
                        (this.currentSession.dm_user_id && 
                         this.currentSession.dm_user_id == this.app.state.user.user_id);
            
            // If DM, check if they prefer to go directly to DM Dashboard
            // This preference is set the first time they click "DM Dashboard" button
            if (isDM) {
                try {
                    const prefsResponse = await this.apiClient.get('/api/user/notification-preferences.php');
                    if (prefsResponse.status === 'success' && 
                        prefsResponse.data.preferences && 
                        prefsResponse.data.preferences.prefer_dm_dashboard) {
                        console.log('[Session Management] DM has prefer_dm_dashboard enabled, redirecting to DM Dashboard');
                        await this.viewDMDashboard(sessionId);
                        return;
                    } else {
                        console.log('[Session Management] DM has not set prefer_dm_dashboard yet, showing normal session view');
                    }
                } catch (error) {
                    console.warn('[Session Management] Failed to check DM preferences, continuing with normal view:', error);
                }
            }
            
            // Render session details view
            const content = await this.renderSessionDetails(this.currentSession);
            $('#content-area').html(content);
            
            // Update navigation
            $('.nav-link').removeClass('active');
            $('.nav-link[data-view="sessions"]').addClass('active');
            
            // Load players list
            this.loadAndRenderPlayers(sessionId);
            
            // Load initiative tracker for players (read-only)
            if (!this.currentSession.is_dm) {
                await this.loadPlayerInitiativeTracker(sessionId);
                // Set up polling to refresh initiative tracker every 5 seconds
                this.startPlayerInitiativePolling(sessionId);
            }
            
            // Initialize audio manager for players (to receive synchronized audio)
            // This must be done before game time realtime client so we can reuse it
            this.initializePlayerAudioManager(sessionId);
            
            // Load game time if session has campaign_id
            if (this.currentSession.campaign_id) {
                await this.loadGameTime(sessionId, this.currentSession.campaign_id);
                
                // Start real-time client for game time updates
                // If audio manager already created a realtime client, reuse it
                if (!this.gameTimeRealtimeClient && this.audioManager?.realtimeClient) {
                    this.gameTimeRealtimeClient = this.audioManager.realtimeClient;
                }
                this.startGameTimeRealtimeClient(sessionId);
            }
            
            // Initialize map scratch-pad for players
            setTimeout(async () => {
                if (this.app.modules.sessionMapScratchpad) {
                    console.log('[Session Management] Initializing map scratch-pad for player, session:', sessionId);
                    const mapContent = await this.app.modules.sessionMapScratchpad.renderMapView(sessionId);
                    $('#session-map-scratchpad-container').html(mapContent);
                    this.app.modules.sessionMapScratchpad.setupToolbarEvents();
                    
                    // Initialize canvas after HTML is in DOM
                    // Note: initializeCanvas() will call startRealtimeUpdates() automatically
                    if (this.app.modules.sessionMapScratchpad.currentMapId) {
                        setTimeout(() => {
                            console.log('[Session Management] Initializing canvas for player...');
                            this.app.modules.sessionMapScratchpad.initializeCanvas();
                        }, 100);
                    } else {
                        console.warn('[Session Management] No currentMapId, canvas will not initialize');
                    }
                }
            }, 200);
            
        } catch (error) {
            console.error('Failed to view session:', error);
            this.app.showError('Failed to load session details');
        }
    }
    
    /**
     * Load and render players list for session details view
     * 
     * @param {number} sessionId - ID of session
     */
    async loadAndRenderPlayers(sessionId) {
        try {
            const playersData = await this.loadSessionPlayers(sessionId);
            const playersList = $('#session-players-list');
            
            if (!playersList.length) {
                return; // Not on session details view
            }
            
            // Load available characters for assignment (if player, not DM)
            if (!this.currentSession.is_dm) {
                await this.loadAvailableCharacters(sessionId);
            }
            
            if (playersData.players.length === 0) {
                playersList.html(`
                    <div class="empty-state">
                        <i class="fas fa-user-slash"></i>
                        <p>No players invited yet</p>
                        ${playersData.dm_user_id == this.app.state.user.user_id ? `
                            <button class="btn btn-primary" data-action="invite-player" data-session-id="${sessionId}">
                                <i class="fas fa-user-plus"></i> Invite Players
                            </button>
                        ` : ''}
                    </div>
                `);
            } else {
                const isDM = playersData.dm_user_id == this.app.state.user.user_id;
                
                playersList.html(`
                    ${isDM ? `
                        <div class="players-actions">
                            <button class="btn btn-primary btn-sm" data-action="invite-player" data-session-id="${sessionId}">
                                <i class="fas fa-user-plus"></i> Invite Player
                            </button>
                        </div>
                    ` : ''}
                    
                    <table class="players-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Status</th>
                                <th>Characters</th>
                                <th>Joined</th>
                                ${isDM ? '<th>Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${playersData.players.map(player => `
                                <tr class="player-row ${player.status}">
                                    <td><strong>${player.username}</strong></td>
                                    <td>
                                        <span class="player-status-badge ${player.status}">
                                            ${player.status === 'accepted' ? '<i class="fas fa-check-circle"></i>' :
                                              player.status === 'invited' ? '<i class="fas fa-clock"></i>' :
                                              '<i class="fas fa-times-circle"></i>'}
                                            ${player.status}
                                        </span>
                                    </td>
                                    <td>${player.character_count} character(s)</td>
                                    <td>${new Date(player.joined_at).toLocaleDateString()}</td>
                                    ${isDM ? `
                                        <td>
                                            <button class="btn btn-sm btn-danger" 
                                                    data-action="remove-player" 
                                                    data-session-id="${sessionId}"
                                                    data-user-id="${player.user_id}"
                                                    data-username="${player.username}">
                                                <i class="fas fa-user-times"></i> Remove
                                            </button>
                                        </td>
                                    ` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="player-stats">
                        <span><strong>Total:</strong> ${playersData.player_counts.total} players</span>
                        <span><strong>Accepted:</strong> ${playersData.player_counts.accepted}</span>
                        <span><strong>Invited:</strong> ${playersData.player_counts.invited}</span>
                        <span><strong>Declined:</strong> ${playersData.player_counts.declined}</span>
                    </div>
                `);
            }
            
        } catch (error) {
            console.error('Failed to load players:', error);
            $('#session-players-list').html('<p class="error-text">Failed to load players</p>');
        }
    }
    
    /**
     * Render session details
     */
    async renderSessionDetails(session) {
        const sessionDate = new Date(session.session_datetime);
        
        return `<div class="session-details-container">
                <div class="session-details-header">
                    <div>
                        <h1>${session.session_title}</h1>
                        <div class="session-status ${session.status}">${session.status}</div>
                    </div>
                    ${session.meet_link ? `
                        <a href="${session.meet_link}" target="_blank" class="btn btn-success btn-lg" id="join-video-call-btn">
                            <i class="fas fa-video"></i> Join Video Call
                        </a>
                    ` : session.is_dm ? `
                        <button class="btn btn-secondary btn-lg" id="add-meet-link-btn" data-session-id="${session.session_id}">
                            <i class="fas fa-video"></i> Add Video Link
                        </button>
                    ` : ''}
                </div>
                
                <div class="session-details-content">
                    ${session.meet_link ? `
                        <div class="video-conference-section">
                            <div class="meet-link-display">
                                <h3><i class="fas fa-video"></i> Video Conference</h3>
                                <p class="meet-link-text">
                                    <a href="${session.meet_link}" target="_blank" class="meet-link-url">${session.meet_link}</a>
                                </p>
                                ${session.is_dm ? `
                                    <button class="btn btn-secondary btn-sm" id="edit-meet-link-btn" data-session-id="${session.session_id}">
                                        <i class="fas fa-edit"></i> Edit Link
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${!session.is_dm ? `
                        <div class="initiative-tracker-section" id="player-initiative-tracker">
                            <div class="initiative-header">
                                <h2><i class="fas fa-bolt"></i> INITIATIVE TRACKER</h2>
                            </div>
                            <div class="initiative-list" id="player-initiative-list">
                                <p class="text-muted">Loading initiative order...</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="map-scratchpad-section">
                        <h3><i class="fas fa-map"></i> Map Scratch-Pad</h3>
                        <div id="session-map-scratchpad-container"></div>
                    </div>
                    
                    <div class="session-info">
                        <h3>Session Information</h3>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Date:</span>
                                <span class="info-value">${sessionDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'})}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Time:</span>
                                <span class="info-value">${sessionDate.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'})}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Duration:</span>
                                <span class="info-value">${session.duration_minutes || 240} minutes</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Max Players:</span>
                                <span class="info-value">${session.max_players || 6}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="session-description">
                        <h3>Description</h3>
                        <p>${session.session_description || 'No description provided.'}</p>
                    </div>
                    
                    ${session.campaign_id ? `
                    <div class="game-time-display" id="game-time-display">
                        <h3><i class="fas fa-clock"></i> Game World Time</h3>
                        <div class="game-time-info">
                            <div id="current-game-time" class="game-time-current">Loading...</div>
                            <div id="game-time-elapsed" class="game-time-elapsed text-muted"></div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${!session.is_dm ? `
                        <div class="your-character-section" id="your-character-section" style="display: none;">
                            <h3><i class="fas fa-user"></i> Your Character</h3>
                            <div id="session-character-sheet-container"></div>
                        </div>
                    ` : ''}
                    <div class="session-players">
                        <div class="players-header">
                            <h3>Players</h3>
                            ${session.is_dm ? `
                                <button class="btn btn-primary btn-sm" data-action="view-dm-dashboard" data-session-id="${session.session_id}">
                                    <i class="fas fa-dice-d20"></i> DM Dashboard
                                </button>
                            ` : ''}
                        </div>
                        ${!session.is_dm ? `
                            <div class="assign-character-section" id="assign-character-section">
                                <h4>Your Characters</h4>
                                <p>Assign one of your existing characters to this session:</p>
                                <div id="available-characters-list">
                                    <p>Loading your characters...</p>
                                </div>
                            </div>
                        ` : ''}
                        <div class="players-list" id="session-players-list">
                            <p>Loading players...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Edit session
     */
    async editSession(sessionId) {
        try {
            await this.loadSession(sessionId);
            this.showEditModal(this.currentSession);
        } catch (error) {
            console.error('Failed to load session for editing:', error);
            this.app.showError('Failed to load session');
        }
    }
    
    /**
     * Show edit modal
     */
    showEditModal(session) {
        const modal = $('#session-creation-modal');
        const content = $('#session-creation-content');
        
        const sessionDate = new Date(session.session_datetime);
        const dateStr = sessionDate.toISOString().slice(0, 16);
        
        content.html(`<div class="session-creation-form">
                <form id="session-edit-form" class="session-form">
                    <input type="hidden" id="edit-session-id" value="${session.session_id}">
                    
                    <div class="form-group">
                        <label for="edit-session-title">Session Title:</label>
                        <input type="text" id="edit-session-title" name="session_title" value="${session.session_title}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-session-description">Description:</label>
                        <textarea id="edit-session-description" name="session_description" rows="3">${session.session_description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-session-campaign">Campaign (Optional):</label>
                        <select id="edit-session-campaign" name="campaign_id">
                            <option value="">-- No Campaign --</option>
                        </select>
                        <small class="form-hint">Select a campaign to organize this session</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-meet-link">Video Conference Link (Optional):</label>
                        <div class="input-with-button">
                            <input type="url" id="edit-meet-link" name="meet_link" value="${session.meet_link || ''}" placeholder="https://meet.google.com/xxx-xxxx-xxx" pattern="https?://.*">
                            <button type="button" class="btn btn-secondary" id="edit-generate-meet-link-btn" title="Open Google Meet to create a new meeting">
                                <i class="fas fa-video"></i> Generate Link
                            </button>
                        </div>
                        <small class="form-hint">Add a Google Meet or other video conference link for this session</small>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-session-datetime">Date & Time:</label>
                            <input type="datetime-local" id="edit-session-datetime" name="session_datetime" value="${dateStr}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-duration">Duration (minutes):</label>
                            <input type="number" id="edit-duration" name="duration_minutes" value="${session.duration_minutes || 240}" min="30" step="15">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="edit-max-players">Max Players:</label>
                            <input type="number" id="edit-max-players" name="max_players" value="${session.max_players || 6}" min="1" max="20">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-status">Status:</label>
                            <select id="edit-status" name="status">
                                <option value="scheduled" ${session.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="active" ${session.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="completed" ${session.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="cancelled" ${session.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Update Session</button>
                        <button type="button" class="btn btn-secondary" onclick="$('#session-creation-modal').hide()">Cancel</button>
                        <button type="button" class="btn btn-danger" id="delete-session-btn" style="margin-left: auto;">Delete Session</button>
                    </div>
                </form>
            </div>
        `);
        
        // Handle form submission
        $('#session-edit-form').off('submit').on('submit', async (e) => {
            e.preventDefault();
            await this.updateSession();
        });
        
        // Handle delete button
        $('#delete-session-btn').off('click').on('click', async () => {
            if (confirm(`Are you sure you want to delete "${session.session_title}"? This cannot be undone.`)) {
                await this.deleteSession(session.session_id);
            }
        });
        
        // Generate Meet Link button in edit form
        $('#edit-generate-meet-link-btn').off('click').on('click', () => {
            window.open('https://meet.google.com/new', '_blank');
            setTimeout(() => {
                this.app.showInfo('Create a meeting in the new tab, then copy the link and paste it above.');
            }, 500);
        });
        
        // Load campaigns for dropdown and set selected value
        this.loadCampaignsForDropdown('#edit-session-campaign').then(() => {
            if (session.campaign_id) {
                $('#edit-session-campaign').val(session.campaign_id);
            }
        });
        
        modal.show();
    }
    
    /**
     * Update session
     */
    async updateSession() {
        try {
            const form = $('#session-edit-form');
            const sessionId = $('#edit-session-id').val();
            const title = $('#edit-session-title').val();
            const description = $('#edit-session-description').val();
            const datetime = $('#edit-session-datetime').val();
            const duration = parseInt($('#edit-duration').val());
            const maxPlayers = parseInt($('#edit-max-players').val());
            const status = $('#edit-status').val();
            
            const meetLink = $('#edit-meet-link').val() || '';
            
            const campaignId = $('#edit-session-campaign').val();
            const response = await this.apiClient.put('/api/session/update.php', {
                session_id: parseInt(sessionId),
                session_title: title,
                session_description: description,
                meet_link: meetLink,
                session_datetime: datetime.replace('T', ' ') + ':00',
                duration_minutes: duration,
                max_players: maxPlayers,
                status: status,
                campaign_id: campaignId && campaignId !== '' ? parseInt(campaignId) : null
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Session updated successfully!');
                $('#session-creation-modal').hide();
                
                // Reload sessions from server
                await this.app.loadUserData();
                this.app.navigateToView('sessions');
            }
        } catch (error) {
            console.error('Session update error:', error);
            this.app.showError('Failed to update session: ' + error.message);
        }
    }
    
    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        try {
            console.log('=== DELETE SESSION DEBUG ===');
            console.log('Raw sessionId:', sessionId);
            console.log('Type of sessionId:', typeof sessionId);
            console.log('Parsed sessionId:', parseInt(sessionId));
            
            const payload = {
                session_id: parseInt(sessionId)
            };
            console.log('Delete payload:', payload);
            console.log('Payload JSON:', JSON.stringify(payload));
            
            const response = await this.apiClient.delete('/api/session/delete.php', payload);
            
            if (response.status === 'success') {
                this.app.showSuccess('Session deleted successfully!');
                $('#session-creation-modal').hide();
                
                // Reload sessions from server
                await this.app.loadUserData();
                this.app.navigateToView('sessions');
            }
        } catch (error) {
            console.error('Session delete error:', error);
            this.app.showError('Failed to delete session: ' + error.message);
        }
    }
    
    /**
     * Start session (DM only)
     */
    async startSession(sessionId) {
        try {
            console.log('Starting session:', sessionId);
            
            const response = await this.apiClient.post('/api/session/start.php', {
                session_id: sessionId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess(response.message || 'Session started successfully!');
                
                // Reload sessions to reflect status change
                await this.render();
            } else {
                this.app.showError(response.message || 'Failed to start session');
            }
            
        } catch (error) {
            console.error('Failed to start session:', error);
            this.app.showError('Failed to start session: ' + error.message);
        }
    }
    
    /**
     * Load players for a session
     * 
     * @param {number} sessionId - ID of session to load players for
     * @returns {Promise<object>} Players data
     */
    async loadSessionPlayers(sessionId) {
        try {
            const response = await this.apiClient.get(`/api/session/get-players.php?session_id=${sessionId}&t=${Date.now()}`);
            
            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to load players');
            }
        } catch (error) {
            console.error('Failed to load session players:', error);
            throw error;
        }
    }
    
    /**
     * Load DM dashboard data
     * 
     * @param {number} sessionId - ID of session
     * @returns {Promise<object>} Dashboard data
     */
    async loadDMDashboard(sessionId) {
        try {
            const response = await this.apiClient.get(`/api/session/get-dm-dashboard.php?session_id=${sessionId}`);
            
            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to load dashboard');
            }
        } catch (error) {
            console.error('Failed to load DM dashboard:', error);
            throw error;
        }
    }
    
    /**
     * Load available characters for assignment to session
     * 
     * @param {number} sessionId - ID of session
     */
    async loadAvailableCharacters(sessionId) {
        try {
            const response = await this.apiClient.get('/api/character/list.php');
            
            if (response.status === 'success' && response.data.characters) {
                // Check if user already has a character assigned to this session
                const sessionIdNum = parseInt(sessionId);
                const hasCharacterInSession = response.data.characters.some(char => {
                    const charSessionId = char.session_id ? parseInt(char.session_id) : null;
                    return charSessionId === sessionIdNum;
                });
                
                // Get the assign-character-section container
                const assignSection = $('#assign-character-section');
                const container = $('#available-characters-list');
                
                if (!container.length) {
                    return; // Not on session details view
                }
                
                // If user already has a character assigned to this session, hide assignment section and show character section
                if (hasCharacterInSession) {
                    console.log('[Session Management] User already has character assigned to session, hiding assignment section');
                    if (assignSection.length) {
                        assignSection.hide();
                    }
                    
                    // Find and display the assigned character
                    const assignedCharacter = response.data.characters.find(char => {
                        const charSessionId = char.session_id ? parseInt(char.session_id) : null;
                        return charSessionId === sessionIdNum;
                    });
                    
                    if (assignedCharacter) {
                        await this.loadAndDisplayPlayerCharacter(assignedCharacter.character_id, sessionId);
                    }
                    
                    return;
                }
                
                // Show the section if it was hidden
                if (assignSection.length) {
                    assignSection.show();
                }
                
                // Filter to only show unassigned characters or characters not in this session
                const availableCharacters = response.data.characters.filter(char => 
                    !char.session_id || char.session_id !== sessionId
                );
                
                if (availableCharacters.length === 0) {
                    container.html('<p class="text-muted">You have no available characters to assign. Create a character first!</p>');
                    return;
                }
                
                container.html(`
                    <div class="available-characters">
                        ${availableCharacters.map(char => `
                            <div class="character-assignment-card">
                                <div class="character-info">
                                    <h5>${char.character_name}</h5>
                                    <p class="character-details">
                                        Level ${char.level} ${char.class.replace('_', ' ').charAt(0).toUpperCase() + char.class.replace('_', ' ').slice(1)}
                                        ${char.session_id ? ` <span class="text-warning">(Currently in another session)</span>` : ''}
                                    </p>
                                </div>
                                <button class="btn btn-primary btn-sm" 
                                        data-action="assign-character" 
                                        data-character-id="${char.character_id}"
                                        data-character-name="${char.character_name}"
                                        data-session-id="${sessionId}">
                                    <i class="fas fa-plus"></i> Assign to Session
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `);
            }
        } catch (error) {
            console.error('Failed to load available characters:', error);
            const container = $('#available-characters-list');
            if (container.length) {
                container.html('<p class="error-text">Failed to load your characters</p>');
            }
        }
    }
    
    /**
     * Load and display player's assigned character in session view
     * Renders the FULL character sheet directly (no summary, no button)
     * 
     * @param {number} characterId - ID of assigned character
     * @param {number} sessionId - ID of session
     */
    async loadAndDisplayPlayerCharacter(characterId, sessionId) {
        try {
            const characterSection = $('#your-character-section');
            const sheetContainer = $('#session-character-sheet-container');
            
            if (!characterSection.length || !sheetContainer.length) {
                return; // Not on session details view
            }
            
            // Show the character section
            characterSection.show();
            
            // Directly render the FULL character sheet using the reusable method
            if (this.app.modules.characterSheet) {
                await this.app.modules.characterSheet.renderCharacterSheetIntoContainer(
                    characterId,
                    '#session-character-sheet-container',
                    {
                        showEditButton: true,
                        showBackButton: false
                    }
                );
            } else {
                console.error('Character sheet module not available');
                sheetContainer.html('<p class="error-text">Character sheet module not available</p>');
            }
            
        } catch (error) {
            console.error('Failed to load player character:', error);
            const sheetContainer = $('#session-character-sheet-container');
            if (sheetContainer.length) {
                sheetContainer.html('<p class="error-text">Failed to load your character</p>');
            }
        }
    }
    
    /**
     * Load initiative order for session
     * 
     * @param {number} sessionId - ID of session
     * @returns {Promise<object>} Initiative data
     */
    async loadInitiativeOrder(sessionId) {
        try {
            const response = await this.apiClient.get(`/api/combat/get-initiative.php?session_id=${sessionId}`);
            
            if (response.status === 'success') {
                return response.data;
            } else {
                // No initiatives yet - not an error
                return { initiatives: [], current_turn: null, total_count: 0 };
            }
        } catch (error) {
            console.log('No initiative data yet:', error);
            return { initiatives: [], current_turn: null, total_count: 0 };
        }
    }
    
    /**
     * Show invite player modal
     * 
     * @param {number} sessionId - ID of session to invite player to
     */
    async showInvitePlayerModal(sessionId) {
        try {
            const modal = $('#invite-player-modal');
            if (modal.length === 0) {
                // Create modal if it doesn't exist
                $('body').append(`
                    <div id="invite-player-modal" class="modal" style="display: none;">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Invite Player to Session</h2>
                                <button class="modal-close">&times;</button>
                            </div>
                            <div id="invite-player-content"></div>
                        </div>
                    </div>
                `);
            }
            
            // Get list of existing players
            const playersData = await this.loadSessionPlayers(sessionId);
            const existingPlayerIds = playersData.players.map(p => p.user_id);
            
            // Show search interface
            $('#invite-player-content').html(`
                <div class="invite-form">
                    <input type="hidden" id="invite-session-id" value="${sessionId}">
                    
                    <div class="form-group">
                        <label for="player-search">Search by Username or Email:</label>
                        <input type="text" 
                               id="player-search" 
                               placeholder="Type at least 2 characters..." 
                               autocomplete="off">
                        <p class="help-text">Search for players by their username or email address</p>
                    </div>
                    
                    <div id="search-results" class="search-results"></div>
                    
                    <div class="form-group">
                        <h4>Current Players (${playersData.players.length})</h4>
                        ${playersData.players.length > 0 ? `
                            <ul class="current-players-list">
                                ${playersData.players.map(p => `
                                    <li>
                                        <strong>${p.username}</strong>
                                        <span class="player-status ${p.status}">${p.status}</span>
                                        ${p.character_count > 0 ? `<span class="character-count">${p.character_count} chars</span>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        ` : '<p class="empty-text">No players invited yet</p>'}
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary modal-close">Close</button>
                    </div>
                </div>
            `);
            
            $('#invite-player-modal').show();
            
            // Setup search handler with debouncing
            let searchTimeout;
            $('#player-search').on('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length < 2) {
                    $('#search-results').html('');
                    return;
                }
                
                searchTimeout = setTimeout(() => {
                    this.searchUsers(query, sessionId, existingPlayerIds);
                }, 300); // 300ms debounce
            });
            
            // Close modal handlers
            $('.modal-close').off('click').on('click', () => $('#invite-player-modal').hide());
            $('#invite-player-modal').off('click').on('click', (e) => {
                if (e.target.id === 'invite-player-modal') {
                    $('#invite-player-modal').hide();
                }
            });
            
        } catch (error) {
            console.error('Failed to show invite player modal:', error);
            this.app.showError('Failed to load invite player form');
            $('#invite-player-modal').hide();
        }
    }
    
    /**
     * Search for users to invite
     * 
     * @param {string} query - Search query
     * @param {number} sessionId - Current session ID
     * @param {array} existingPlayerIds - IDs of already invited players
     */
    async searchUsers(query, sessionId, existingPlayerIds) {
        try {
            $('#search-results').html('<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>');
            
            const response = await this.apiClient.get(`/api/user/search.php?q=${encodeURIComponent(query)}`);
            
            if (response.status === 'success') {
                const users = response.data.users.filter(u => !existingPlayerIds.includes(u.user_id));
                
                if (users.length === 0) {
                    $('#search-results').html('<p class="empty-text">No users found matching your search</p>');
                    return;
                }
                
                $('#search-results').html(`
                    <div class="user-results">
                        <h4>Search Results (${users.length}):</h4>
                        <div class="user-list">
                            ${users.map(user => `
                                <div class="user-card" data-user-id="${user.user_id}">
                                    <div class="user-info">
                                        <strong>${user.username}</strong>
                                        <span class="user-email">${user.email_display}</span>
                                        <span class="user-member">Member since ${user.member_since}</span>
                                    </div>
                                    <button class="btn btn-sm btn-primary" 
                                            data-action="invite-user" 
                                            data-user-id="${user.user_id}"
                                            data-username="${user.username}">
                                        <i class="fas fa-user-plus"></i> Invite
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
                
                // Setup invite button handlers
                $('[data-action="invite-user"]').on('click', async (e) => {
                    const userId = parseInt($(e.currentTarget).data('user-id'));
                    const username = $(e.currentTarget).data('username');
                    await this.invitePlayer(sessionId, userId);
                    $('#invite-player-modal').hide();
                });
                
            } else {
                $('#search-results').html(`<p class="error-text">${response.message || 'Search failed'}</p>`);
            }
            
        } catch (error) {
            console.error('User search failed:', error);
            $('#search-results').html('<p class="error-text">Search failed. Please try again.</p>');
        }
    }
    
    /**
     * Invite player to session
     * 
     * @param {number} sessionId - ID of session
     * @param {number} userId - ID of user to invite
     */
    async invitePlayer(sessionId, userId) {
        try {
            const response = await this.apiClient.post('/api/session/invite-player.php', {
                session_id: sessionId,
                user_id: userId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess(`Player invited successfully`);
                $('#invite-player-modal').hide();
                
                // Reload session details
                await this.loadSession(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to invite player');
            }
        } catch (error) {
            console.error('Failed to invite player:', error);
            this.app.showError('Failed to invite player: ' + error.message);
        }
    }
    
    /**
     * Remove player from session
     * 
     * @param {number} sessionId - ID of session
     * @param {number} userId - ID of user to remove
     * @param {string} username - Username of player
     */
    async removePlayer(sessionId, userId, username) {
        if (!confirm(`Are you sure you want to remove ${username} from this session?`)) {
            return;
        }
        
        try {
            const response = await this.apiClient.post('/api/session/remove-player.php', {
                session_id: sessionId,
                user_id: userId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess(`Player ${username} removed from session`);
                
                // Reload session details
                await this.loadSession(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to remove player');
            }
        } catch (error) {
            console.error('Failed to remove player:', error);
            this.app.showError('Failed to remove player: ' + error.message);
        }
    }
    
    /**
     * Accept session invitation
     * 
     * @param {number} sessionId - ID of session
     */
    async acceptInvitation(sessionId) {
        try {
            const response = await this.apiClient.post('/api/session/accept-invitation.php', {
                session_id: sessionId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Invitation accepted successfully');
                
                // Reload user data and session
                await this.app.loadUserData();
                await this.loadSession(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to accept invitation');
            }
        } catch (error) {
            console.error('Failed to accept invitation:', error);
            this.app.showError('Failed to accept invitation: ' + error.message);
        }
    }
    
    /**
     * Decline session invitation
     * 
     * @param {number} sessionId - ID of session
     */
    async declineInvitation(sessionId) {
        if (!confirm('Are you sure you want to decline this invitation?')) {
            return;
        }
        
        try {
            const response = await this.apiClient.post('/api/session/decline-invitation.php', {
                session_id: sessionId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Invitation declined');
                
                // Reload user data
                await this.app.loadUserData();
                this.app.navigateToView('sessions');
            } else {
                this.app.showError(response.message || 'Failed to decline invitation');
            }
        } catch (error) {
            console.error('Failed to decline invitation:', error);
            this.app.showError('Failed to decline invitation: ' + error.message);
        }
    }
    
    /**
     * View DM dashboard for a session
     * 
     * @param {number} sessionId - ID of session
     */
    async viewDMDashboard(sessionId) {
        // Prevent multiple simultaneous calls
        if (this.isLoadingDashboard) {
            console.log('Dashboard already loading, skipping duplicate call');
            return;
        }
        
        // Debounce: Don't reload if we just loaded this dashboard (< 500ms ago)
        const now = Date.now();
        if (this.lastDashboardLoad && 
            this.lastDashboardLoad.sessionId === sessionId && 
            (now - this.lastDashboardLoad.timestamp) < 500) {
            console.log('Dashboard recently loaded, skipping duplicate call');
            return;
        }
        
        try {
            this.isLoadingDashboard = true;
            this.lastDashboardLoad = { sessionId, timestamp: now };
            
            // Save preference that DM wants to use DM Dashboard (first time they click it)
            try {
                const prefsResponse = await this.apiClient.get('/api/user/notification-preferences.php');
                if (prefsResponse.status === 'success' && 
                    prefsResponse.data.preferences && 
                    !prefsResponse.data.preferences.prefer_dm_dashboard) {
                    // First time clicking DM Dashboard - save preference
                    console.log('[Session Management] First time DM Dashboard access, saving preference');
                    await this.apiClient.post('/api/user/notification-preferences.php', {
                        prefer_dm_dashboard: true
                    });
                }
            } catch (error) {
                console.warn('[Session Management] Failed to save DM dashboard preference:', error);
                // Continue anyway - don't block dashboard loading
            }
            
            const dashboardData = await this.loadDMDashboard(sessionId);
            
            // Store dashboard data in DMDashboardModule for XP award modal
            if (this.app.modules.dmDashboard) {
                this.app.modules.dmDashboard.currentDashboard = dashboardData;
                this.app.modules.dmDashboard.dashboardData = dashboardData;
            }
            console.log('Dashboard data loaded:', dashboardData);
            
            // Load initiative data
            const initiativeData = await this.loadInitiativeOrder(sessionId);
            console.log('Initiative data loaded:', initiativeData);
            
            // Render DM dashboard view
            const dashboardHTML = this.renderDMDashboard(dashboardData, initiativeData);
            
            $('#content-area').html(dashboardHTML);
            
            // Store current session ID for initiative updates
            this.currentSession = { session_id: sessionId };
            
            // Initialize map scratch-pad IMMEDIATELY (don't wait for setTimeout)
            if (this.app.modules.sessionMapScratchpad) {
                // Set DM status from dashboard data (avoid duplicate API call)
                this.app.modules.sessionMapScratchpad.isDM = true;
                this.app.modules.sessionMapScratchpad.userId = this.app.state.user.user_id;
                
                const mapContent = await this.app.modules.sessionMapScratchpad.renderMapView(sessionId);
                $('#map-scratchpad-container').html(mapContent);
                this.app.modules.sessionMapScratchpad.setupToolbarEvents();
                
                // Canvas will be initialized when map data loads (in loadMapData)
            }
            
            // Start real-time client AFTER map scratch-pad is initialized (to avoid blocking)
            setTimeout(() => {
                if (this.app.modules.dmDashboard) {
                    console.log('Starting real-time client for DM Dashboard...');
                    this.app.modules.dmDashboard.startRealtimeClient(sessionId);
                }
                
                // Initialize audio manager and soundboard
                this.initializeSoundboard(sessionId);
            }, 100);
            
        } catch (error) {
            console.error('Failed to load DM dashboard:', error);
            this.app.showError('Failed to load DM dashboard: ' + error.message);
        } finally {
            this.isLoadingDashboard = false;
        }
    }
    
    /**
     * Render DM Dashboard with all player characters
     * 
     * @param {object} data - Dashboard data from API
     * @param {object} initiativeData - Initiative order data
     * @returns {string} HTML for DM dashboard
     */
    renderDMDashboard(data, initiativeData = { initiatives: [], current_turn: null }) {
        const { session, players, party_stats } = data;
        const sessionDate = new Date(session.session_datetime);
        
        return `
            <div class="dm-dashboard-container">
                <div class="dm-dashboard-header">
                    <div class="header-info">
                        <h1><i class="fas fa-dice-d20"></i> ${session.session_title}</h1>
                        <p class="session-date">
                            <i class="fas fa-calendar"></i>
                            ${sessionDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })} at ${sessionDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-secondary" data-action="back-to-sessions">
                            <i class="fas fa-arrow-left"></i> Back to Sessions
                        </button>
                        <button class="btn btn-success" id="award-xp-btn" data-session-id="${session.session_id}">
                            <i class="fas fa-star"></i> Award XP
                        </button>
                        ${session.campaign_id ? `
                        <div class="time-advancement-buttons" style="display: inline-flex; gap: 0.5rem; margin-left: 0.5rem;">
                            <button class="btn btn-info btn-sm" id="advance-round-btn" 
                                    data-campaign-id="${session.campaign_id}" 
                                    data-session-id="${session.session_id}"
                                    title="Advance time by 1 round (10 seconds)">
                                <i class="fas fa-forward"></i> Round
                            </button>
                            <button class="btn btn-info btn-sm" id="advance-turn-btn" 
                                    data-campaign-id="${session.campaign_id}" 
                                    data-session-id="${session.session_id}"
                                    title="Advance time by 1 turn (10 minutes)">
                                <i class="fas fa-fast-forward"></i> Turn
                            </button>
                            <button class="btn btn-info btn-sm" id="advance-day-btn" 
                                    data-campaign-id="${session.campaign_id}" 
                                    data-session-id="${session.session_id}"
                                    title="Advance time by 1 day">
                                <i class="fas fa-step-forward"></i> Day
                            </button>
                        </div>
                        ` : ''}
                        <button class="btn btn-primary" data-action="invite-player" data-session-id="${session.session_id}">
                            <i class="fas fa-user-plus"></i> Invite Player
                        </button>
                        <button class="btn btn-secondary" id="refresh-dashboard" data-session-id="${session.session_id}">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button class="btn btn-primary" id="toggle-auto-refresh" data-session-id="${session.session_id}">
                            <i class="fas fa-clock"></i> Auto-refresh: ON
                        </button>
                    </div>
                </div>
                
                <div class="party-stats-summary">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-users"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${party_stats.accepted_players}/${party_stats.total_players}</div>
                            <div class="stat-label">Accepted Players</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-user-friends"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${party_stats.total_characters}</div>
                            <div class="stat-label">Characters</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-level-up-alt"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${party_stats.average_level}</div>
                            <div class="stat-label">Avg Level</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-heart"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${party_stats.average_hp_percentage}%</div>
                            <div class="stat-label">Avg HP</div>
                        </div>
                    </div>
                    ${party_stats.characters_dead > 0 ? `
                    <div class="stat-card dead">
                        <div class="stat-icon"><i class="fas fa-skull"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${party_stats.characters_dead}</div>
                            <div class="stat-label">Dead</div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                ${party_stats.total_characters > 0 ? `
                    <div class="class-distribution">
                        <h3><i class="fas fa-chart-pie"></i> Class Distribution</h3>
                        <div class="class-chips">
                            ${Object.entries(party_stats.class_distribution).map(([className, count]) => `
                                <span class="class-chip ${className}">${className}: ${count}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${this.renderInitiativeTracker(session.session_id, initiativeData)}
                
                <div class="players-section">
                    <h2><i class="fas fa-users"></i> Players & Characters</h2>
                    
                    ${players.length === 0 ? `
                        <div class="empty-state">
                            <i class="fas fa-user-slash"></i>
                            <p>No players invited yet</p>
                            <button class="btn btn-primary" data-action="invite-player" data-session-id="${session.session_id}">
                                <i class="fas fa-user-plus"></i> Invite Your First Player
                            </button>
                        </div>
                    ` : players.map(player => this.renderDMPlayerCard(player, session.session_id)).join('')}
                </div>
                
                ${this.renderSoundboard(session.session_id)}
                
                <div class="map-scratchpad-section">
                    <h2><i class="fas fa-map"></i> Map Scratch-Pad</h2>
                    <div id="map-scratchpad-container"></div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Soundboard section for audio control
     * 
     * @param {number} sessionId - Session ID
     * @returns {string} HTML for soundboard
     */
    renderSoundboard(sessionId) {
        return `
            <div class="soundboard-section">
                <h2><i class="fas fa-music"></i> Audio & Soundboard</h2>
                
                <div class="soundboard-container">
                    <div class="soundboard-tabs">
                        <button class="tab-btn active" data-tab="music">
                            <i class="fas fa-music"></i> Music
                        </button>
                        <button class="tab-btn" data-tab="sounds">
                            <i class="fas fa-volume-up"></i> Sound Effects
                        </button>
                        <button class="tab-btn" data-tab="playlists">
                            <i class="fas fa-list"></i> Playlists
                        </button>
                    </div>
                    
                    <div class="tab-content active" data-tab-content="music">
                        <div class="audio-controls-panel">
                            <div class="audio-upload-section">
                                <h3><i class="fas fa-upload"></i> Upload Music</h3>
                                <input type="file" id="music-upload-input" accept="audio/mpeg,audio/mp3" style="display: none;">
                                <button class="btn btn-primary" id="upload-music-btn" data-session-id="${sessionId}">
                                    <i class="fas fa-upload"></i> Upload MP3
                                </button>
                                <input type="text" id="music-track-name" placeholder="Track name" class="form-control" style="display: inline-block; width: 200px; margin-left: 10px;">
                            </div>
                            
                            <div class="audio-player-controls">
                                <h3><i class="fas fa-play-circle"></i> Player Controls</h3>
                                <p style="font-size: 0.875rem; color: #666; margin-bottom: 1rem;">
                                    <i class="fas fa-info-circle"></i> Click "Play" on a track below to start playing music
                                </p>
                                <div class="control-buttons">
                                    <button class="btn btn-warning" id="audio-pause-btn" data-session-id="${sessionId}" title="Pause current track">
                                        <i class="fas fa-pause"></i> Pause
                                    </button>
                                    <button class="btn btn-danger" id="audio-stop-btn" data-session-id="${sessionId}" title="Stop current track">
                                        <i class="fas fa-stop"></i> Stop
                                    </button>
                                    <label class="checkbox-label" style="margin-left: 20px;">
                                        <input type="checkbox" id="audio-loop-checkbox" data-session-id="${sessionId}">
                                        <span>Loop</span>
                                    </label>
                                </div>
                                
                                <div class="volume-controls">
                                    <label>Master Volume: <span id="master-volume-value">60</span>%</label>
                                    <input type="range" id="master-volume-slider" min="0" max="100" value="60" data-session-id="${sessionId}">
                                    
                                    <label style="margin-left: 20px;">Music Volume: <span id="music-volume-value">33</span>%</label>
                                    <input type="range" id="music-volume-slider" min="0" max="100" value="33" data-session-id="${sessionId}">
                                </div>
                                
                                <div class="current-track-info" id="current-track-info" style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px; display: none;">
                                    <strong>Now Playing:</strong> <span id="current-track-name">-</span>
                                </div>
                            </div>
                            
                            <div class="music-tracks-list">
                                <h3><i class="fas fa-list"></i> Music Tracks</h3>
                                <div id="music-tracks-container">
                                    <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading tracks...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" data-tab-content="sounds">
                        <div class="soundboard-upload-section">
                            <h3><i class="fas fa-upload"></i> Upload Sound Effect</h3>
                            <input type="file" id="sound-upload-input" accept="audio/mpeg,audio/mp3" style="display: none;">
                            <button class="btn btn-primary" id="upload-sound-btn" data-session-id="${sessionId}">
                                <i class="fas fa-upload"></i> Upload MP3
                            </button>
                            <input type="text" id="sound-track-name" placeholder="Sound name" class="form-control" style="display: inline-block; width: 200px; margin-left: 10px;">
                        </div>
                        
                        <div class="soundboard-volume-control">
                            <label>Sound Volume: <span id="sound-volume-value">100</span>%</label>
                            <input type="range" id="sound-volume-slider" min="0" max="100" value="100" data-session-id="${sessionId}">
                        </div>
                        
                        <div class="soundboard-grid" id="soundboard-grid">
                            <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading sounds...</div>
                        </div>
                    </div>
                    
                    <div class="tab-content" data-tab-content="playlists">
                        <div class="playlist-management">
                            <div class="playlist-create-section">
                                <h3><i class="fas fa-plus"></i> Create Playlist</h3>
                                <input type="text" id="playlist-name-input" placeholder="Playlist name" class="form-control" style="display: inline-block; width: 200px;">
                                <button class="btn btn-primary" id="create-playlist-btn" data-session-id="${sessionId}">
                                    <i class="fas fa-plus"></i> Create
                                </button>
                            </div>
                            
                            <div class="playlists-list" id="playlists-container">
                                <div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading playlists...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Initiative Tracker for combat
     * 
     * @param {number} sessionId - Session ID
     * @param {object} initiativeData - Initiative order data
     * @returns {string} HTML for initiative tracker
     */
    renderInitiativeTracker(sessionId, initiativeData) {
        const { initiatives, current_turn } = initiativeData;
        const hasInitiatives = initiatives && initiatives.length > 0;
        
        return `
            <div class="initiative-tracker-section">
                <div class="initiative-header">
                    <h2><i class="fas fa-bolt"></i> INITIATIVE TRACKER</h2>
                    <div class="initiative-actions">
                        ${hasInitiatives ? `
                            <button class="btn btn-sm btn-info" data-action="add-character" data-session-id="${sessionId}" title="Add Character">
                                <i class="fas fa-user-plus"></i> Add Character
                            </button>
                            <button class="btn btn-sm btn-info" data-action="add-monster" data-session-id="${sessionId}" title="Add Monster">
                                <i class="fas fa-dragon"></i> Add Monster
                            </button>
                            <button class="btn btn-sm btn-success" data-action="initiative-prev" data-session-id="${sessionId}" title="Previous Turn">
                                <i class="fas fa-arrow-left"></i> Previous
                            </button>
                            <button class="btn btn-sm btn-success" data-action="initiative-next" data-session-id="${sessionId}" title="Next Turn">
                                Next <i class="fas fa-arrow-right"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" data-action="initiative-roll" data-session-id="${sessionId}" title="Re-roll All Initiative">
                                <i class="fas fa-dice-d6"></i> Re-roll All
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="initiative-clear" data-session-id="${sessionId}" title="End Combat">
                                <i class="fas fa-times"></i> End Combat
                            </button>
                        ` : `
                            <button class="btn btn-info" data-action="add-character" data-session-id="${sessionId}" title="Add Character">
                                <i class="fas fa-user-plus"></i> Add Character
                            </button>
                            <button class="btn btn-info" data-action="add-monster" data-session-id="${sessionId}" title="Add Monster">
                                <i class="fas fa-dragon"></i> Add Monster
                            </button>
                            <button class="btn btn-primary" data-action="initiative-roll" data-session-id="${sessionId}" title="Roll Initiative for All Characters">
                                <i class="fas fa-dice-d6"></i> Roll All
                            </button>
                        `}
                    </div>
                </div>
                
                ${hasInitiatives ? `
                    <div class="initiative-list">
                        ${current_turn ? `
                            <div class="round-indicator" style="display: flex; justify-content: center; width: 100%;">
                                <i class="fas fa-redo"></i> Round ${current_turn.round_number}
                            </div>
                        ` : ''}
                        
                        ${initiatives.map((init, index) => {
                            const isMonster = init.entity_type === 'monster';
                            const iconClass = isMonster ? 'fa-skull' : 'fa-user';
                            const entryClass = isMonster ? 'monster-entry' : '';
                            const bossIndicator = isMonster && init.is_named_boss ? '<i class="fas fa-crown" title="Named Boss Monster"></i>' : '';
                            
                            return `
                            <div class="initiative-entry ${entryClass} ${init.is_current_turn ? 'current-turn' : ''}" 
                                 data-initiative-id="${init.initiative_id}"
                                 data-entity-type="${init.entity_type}"
                                 ${isMonster ? `data-monster-instance-id="${init.monster_instance_id}"` : ''}
                                 ${!isMonster ? `data-character-id="${init.character_id}"` : ''}
                                 style="cursor: ${isMonster ? 'pointer' : 'default'};">
                                <div class="initiative-order-number">${index + 1}</div>
                                <div class="initiative-roll-display">
                                    <i class="fas fa-dice-d6"></i>
                                    <span>${init.initiative_roll}</span>
                                </div>
                                <div class="initiative-character-info">
                                    <div class="character-name-row">
                                        <i class="fas ${iconClass}"></i>
                                        <strong>${init.entity_name}</strong>
                                        ${bossIndicator}
                                        ${init.is_current_turn ? '<span class="current-turn-indicator"><i class="fas fa-arrow-right"></i> CURRENT TURN</span>' : ''}
                                    </div>
                                    ${init.class && init.level ? `
                                        <div class="character-class-level">${init.class} ${init.level}</div>
                                    ` : ''}
                                    ${isMonster && init.monster_ac ? `
                                        <div class="monster-ac-display">AC: ${init.monster_ac}</div>
                                    ` : ''}
                                </div>
                                ${init.hp ? `
                                    <div class="initiative-hp-display" style="cursor: pointer;" 
                                         data-entity-type="${init.entity_type}"
                                         ${isMonster ? `data-monster-instance-id="${init.monster_instance_id}"` : ''}
                                         ${!isMonster ? `data-character-id="${init.character_id}"` : ''}
                                         title="Click to adjust HP">
                                        <div class="hp-bar-container">
                                            <div class="hp-bar-fill" style="width: ${init.hp.percentage}%; background-color: ${this.getHPColor(init.hp.percentage)}"></div>
                                        </div>
                                        <div class="hp-text-display">${init.hp.current}/${init.hp.max}</div>
                                    </div>
                                ` : '<div class="initiative-hp-display"><div class="hp-text-display">—</div></div>'}
                            </div>
                        `;
                        }).join('')}
                    </div>
                ` : `
                    <div class="initiative-empty">
                        <i class="fas fa-dice-d6 fa-3x"></i>
                        <p><strong>No active combat</strong></p>
                        <p>Click "Roll Initiative!" to start combat tracking</p>
                        <p class="help-text"><small>BECMI Rules: Each character rolls 1d6. Highest roll goes first!</small></p>
                    </div>
                `}
            </div>
        `;
    }
    
    /**
     * Get HP color based on percentage
     * 
     * @param {number} percentage - HP percentage
     * @returns {string} Color code
     */
    getHPColor(percentage) {
        if (percentage > 75) return '#4caf50';
        if (percentage > 50) return '#8bc34a';
        if (percentage > 25) return '#ff9800';
        return '#f44336';
    }
    
    /**
     * Render player card for DM dashboard
     * 
     * @param {object} player - Player data
     * @param {number} sessionId - Session ID
     * @returns {string} HTML for player card
     */
    renderDMPlayerCard(player, sessionId) {
        const statusClass = player.status;
        const statusIcon = {
            'accepted': 'fa-check-circle',
            'invited': 'fa-clock',
            'declined': 'fa-times-circle'
        }[player.status] || 'fa-question-circle';
        
        return `
            <div class="dm-player-card ${statusClass}">
                <div class="player-header">
                    <div class="player-info">
                        <h3><i class="fas fa-user"></i> ${player.username}</h3>
                        <span class="player-status ${statusClass}">
                            <i class="fas ${statusIcon}"></i> ${player.status}
                        </span>
                    </div>
                    <div class="player-actions">
                        <button class="btn btn-sm btn-danger" data-action="remove-player" 
                                data-session-id="${sessionId}" 
                                data-user-id="${player.user_id}"
                                data-username="${player.username}">
                            <i class="fas fa-user-times"></i> Remove
                        </button>
                    </div>
                </div>
                
                ${player.characters.length === 0 ? `
                    <div class="no-characters">
                        <i class="fas fa-user-slash"></i>
                        <p>No characters assigned to this session</p>
                    </div>
                ` : `
                    <div class="player-characters">
                        ${player.characters.map(char => this.renderDMCharacterCard(char)).join('')}
                    </div>
                `}
            </div>
        `;
    }
    
    /**
     * Render character card for DM dashboard
     * 
     * @param {object} character - Character data
     * @returns {string} HTML for character card
     */
    renderDMCharacterCard(character) {
        const hpStatus = character.hp.is_dead ? 'dead' : 
                        character.hp.percentage >= 75 ? 'healthy' :
                        character.hp.percentage >= 50 ? 'injured' :
                        character.hp.percentage >= 25 ? 'wounded' : 'critical';
        
        return `
            <div class="dm-character-card ${hpStatus}">
                <div class="character-header">
                    <div class="character-basic">
                        <h4>${character.character_name}</h4>
                        <p class="character-class">Level ${character.level} ${character.class}</p>
                    </div>
                    <div class="character-hp">
                        <div class="hp-bar">
                            <div class="hp-fill ${hpStatus}" style="width: ${Math.max(0, character.hp.percentage)}%"></div>
                        </div>
                        <div class="hp-text">
                            <span class="hp-value ${hpStatus}">${character.hp.current}/${character.hp.max}</span>
                            ${character.hp.is_dead ? '<span class="dead-indicator"><i class="fas fa-skull"></i> DEAD</span>' : ''}
                        </div>
                        <div class="dm-hp-controls">
                            <button class="btn btn-xs btn-danger" 
                                    data-action="dm-damage-character" 
                                    data-character-id="${character.character_id}"
                                    data-character-name="${character.character_name}"
                                    title="Apply damage">
                                <i class="fas fa-heart-broken"></i> Damage
                            </button>
                            <input type="number" 
                                   class="hp-quick-input" 
                                   id="dm-hp-input-${character.character_id}" 
                                   min="1" 
                                   max="999" 
                                   value="5" 
                                   placeholder="HP">
                            <button class="btn btn-xs btn-success" 
                                    data-action="dm-heal-character" 
                                    data-character-id="${character.character_id}"
                                    data-character-name="${character.character_name}"
                                    title="Heal character">
                                <i class="fas fa-heart"></i> Heal
                            </button>
                            <button class="btn btn-xs btn-warning" 
                                    data-action="dm-set-hp" 
                                    data-character-id="${character.character_id}"
                                    data-character-name="${character.character_name}"
                                    title="Set exact HP">
                                <i class="fas fa-edit"></i> Set
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="character-stats-grid">
                    ${character.abilities ? `
                    <div class="stat-group">
                        <h5>Abilities</h5>
                        <div class="abilities-mini">
                            <span title="Strength">STR ${character.abilities.strength || 'N/A'}</span>
                            <span title="Dexterity">DEX ${character.abilities.dexterity || 'N/A'}</span>
                            <span title="Constitution">CON ${character.abilities.constitution || 'N/A'}</span>
                            <span title="Intelligence">INT ${character.abilities.intelligence || 'N/A'}</span>
                            <span title="Wisdom">WIS ${character.abilities.wisdom || 'N/A'}</span>
                            <span title="Charisma">CHA ${character.abilities.charisma || 'N/A'}</span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="stat-group">
                        <h5>Combat</h5>
                        <div class="combat-stats">
                            <span><strong>AC:</strong> ${character.combat.armor_class}</span>
                            <span><strong>THAC0:</strong> ${character.combat.thac0}</span>
                            ${character.combat.strength_to_hit_bonus !== 0 ? `<span><strong>STR to Hit:</strong> ${character.combat.strength_to_hit_bonus > 0 ? '+' : ''}${character.combat.strength_to_hit_bonus}</span>` : ''}
                            ${character.combat.dexterity_to_hit_bonus !== 0 ? `<span><strong>DEX to Hit:</strong> ${character.combat.dexterity_to_hit_bonus > 0 ? '+' : ''}${character.combat.dexterity_to_hit_bonus}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h5>Experience</h5>
                        <div class="xp-stats">
                            <div><strong>XP:</strong> ${(character.experience_points || 0).toLocaleString()}</div>
                            ${character.xp_for_next_level ? `<div><strong>Next Level:</strong><br>${character.xp_for_next_level.toLocaleString()} XP</div>` : ''}
                            ${character.xp_for_next_level ? `
                                <button class="btn btn-xs btn-info" 
                                        data-action="award-standard-bonus" 
                                        data-character-id="${character.character_id}"
                                        data-character-name="${character.character_name}"
                                        data-xp-amount="${Math.ceil(character.xp_for_next_level / 20)}"
                                        title="Award 1/20 of next level XP (Standard Bonus for quests, good roleplay, saving allies, exceptional skill use)">
                                    <i class="fas fa-star"></i> +${Math.ceil(character.xp_for_next_level / 20).toLocaleString()} XP
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h5>Saving Throws</h5>
                        <div class="saves-mini">
                            <span title="Death Ray/Poison">DR ${character.saving_throws.death_ray}</span>
                            <span title="Magic Wand">MW ${character.saving_throws.magic_wand}</span>
                            <span title="Paralysis/Turn to Stone">Par ${character.saving_throws.paralysis}</span>
                            <span title="Dragon Breath">DB ${character.saving_throws.dragon_breath}</span>
                            <span title="Spells/Rods/Staves">Sp ${character.saving_throws.spells}</span>
                        </div>
                    </div>
                    
                    ${character.skills && character.skills.length > 0 ? `
                    <div class="stat-group skills">
                        <h5>Skills</h5>
                        <div class="skills-mini">
                            ${character.skills.map(skill => `
                                <div class="skill-item">
                                    <span class="skill-name">${skill.skill_name}</span>
                                    ${skill.bonus !== 0 ? `<span class="skill-bonus">${skill.bonus > 0 ? '+' : ''}${skill.bonus}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${character.spells && character.spells.total > 0 ? `
                    <div class="stat-group spells">
                        <h5>Spells</h5>
                        <div class="spells-mini">
                            ${Object.entries(character.spells.by_level || {}).map(([level, spellNames]) => {
                                const memorized = character.spells.memorized_by_level[level] || 0;
                                // Use spell slots if available, otherwise fall back to total spells in spellbook
                                const total = character.spells.slots_by_level && character.spells.slots_by_level[level] 
                                    ? character.spells.slots_by_level[level] 
                                    : spellNames.length;
                                const memorizedSpells = character.spells.memorized_spells && character.spells.memorized_spells[level] || [];
                                return `<div class="spell-level-info">
                                    <div class="spell-level-header">
                                        <strong>Level ${level}:</strong> ${memorized}/${total} memorized
                                        ${memorized > 0 ? `<span class="memorized-indicator"><i class="fas fa-check-circle"></i></span>` : ''}
                                    </div>
                                    ${memorizedSpells.length > 0 ? `
                                        <div class="memorized-spells-list">
                                            ${memorizedSpells.map(spell => `
                                                <span class="memorized-spell-name"><i class="fas fa-magic"></i> ${spell}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                </div>`;
                            }).join('')}
                            ${character.spells.total_memorized > 0 ? `
                                <div class="spells-summary">
                                    <strong>Total Memorized:</strong> ${character.spells.total_memorized}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="character-actions">
                    <button class="btn btn-sm btn-primary" data-action="view-character" data-character-id="${character.character_id}">
                        <i class="fas fa-eye"></i> View Full Sheet
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * DM applies damage to character
     * 
     * @param {number} characterId - ID of character
     * @param {string} characterName - Name of character
     */
    async dmDamageCharacter(characterId, characterName) {
        try {
            const hpInput = $(`#dm-hp-input-${characterId}`);
            const damageAmount = parseInt(hpInput.val()) || 0;
            
            if (damageAmount <= 0) {
                this.app.showError('Please enter a valid damage amount');
                return;
            }
            
            console.log(`DM applying ${damageAmount} damage to ${characterName} (ID: ${characterId})`);
            
            // Call HP update API
            const response = await this.apiClient.post('/api/character/update-hp.php', {
                character_id: characterId,
                hp_change: -damageAmount,
                reason: `DM applied ${damageAmount} damage`
            });
            
            if (response.status === 'success') {
                const isDead = response.data.is_dead;
                if (isDead) {
                    this.app.showError(`${characterName} has been killed! (HP: ${response.data.new_hp}/${response.data.max_hp})`);
                } else {
                    this.app.showSuccess(`${characterName} took ${damageAmount} damage (HP: ${response.data.new_hp}/${response.data.max_hp})`);
                }
                
                // Reload DM dashboard to update HP display
                await this.viewDMDashboard(this.currentSession.session_id);
            } else {
                this.app.showError(response.message || 'Failed to apply damage');
            }
            
        } catch (error) {
            console.error('Failed to apply damage:', error);
            this.app.showError('Failed to apply damage: ' + error.message);
        }
    }
    
    /**
     * DM heals character
     * 
     * @param {number} characterId - ID of character
     * @param {string} characterName - Name of character
     */
    async dmHealCharacter(characterId, characterName) {
        try {
            const hpInput = $(`#dm-hp-input-${characterId}`);
            const healAmount = parseInt(hpInput.val()) || 0;
            
            if (healAmount <= 0) {
                this.app.showError('Please enter a valid heal amount');
                return;
            }
            
            console.log(`DM healing ${healAmount} HP to ${characterName} (ID: ${characterId})`);
            
            // Call HP update API
            const response = await this.apiClient.post('/api/character/update-hp.php', {
                character_id: characterId,
                hp_change: healAmount,
                reason: `DM healed ${healAmount} HP`
            });
            
            if (response.status === 'success') {
                this.app.showSuccess(`${characterName} healed ${healAmount} HP (HP: ${response.data.new_hp}/${response.data.max_hp})`);
                
                // Reload DM dashboard to update HP display
                await this.viewDMDashboard(this.currentSession.session_id);
            } else {
                this.app.showError(response.message || 'Failed to heal');
            }
            
        } catch (error) {
            console.error('Failed to heal character:', error);
            this.app.showError('Failed to heal character: ' + error.message);
        }
    }
    
    /**
     * DM sets exact HP value
     * 
     * @param {number} characterId - ID of character
     * @param {string} characterName - Name of character
     */
    async dmSetHP(characterId, characterName) {
        try {
            const newHP = prompt(`Set exact HP for ${characterName}:`, '');
            
            if (newHP === null) {
                return; // User cancelled
            }
            
            const hpValue = parseInt(newHP);
            
            if (isNaN(hpValue) || hpValue < -10) {
                this.app.showError('Please enter a valid HP value (-10 to max)');
                return;
            }
            
            console.log(`DM setting HP to ${hpValue} for ${characterName} (ID: ${characterId})`);
            
            // Call HP update API
            const response = await this.apiClient.post('/api/character/update-hp.php', {
                character_id: characterId,
                new_hp: hpValue,
                reason: `DM set HP to ${hpValue}`
            });
            
            if (response.status === 'success') {
                const isDead = response.data.is_dead;
                if (isDead) {
                    this.app.showError(`${characterName} HP set to ${hpValue} (DEAD)`);
                } else {
                    this.app.showSuccess(`${characterName} HP set to ${hpValue}/${response.data.max_hp}`);
                }
                
                // Reload DM dashboard to update HP display
                await this.viewDMDashboard(this.currentSession.session_id);
            } else {
                this.app.showError(response.message || 'Failed to set HP');
            }
            
        } catch (error) {
            console.error('Failed to set HP:', error);
            this.app.showError('Failed to set HP: ' + error.message);
        }
    }
    
    /**
     * Roll initiative for all characters in session
     * 
     * @param {number} sessionId - Session ID
     */
    async rollInitiative(sessionId) {
        try {
            const confirmMessage = 'Roll initiative for all characters? This will replace any existing initiative order.';
            if (!confirm(confirmMessage)) {
                return;
            }
            
            console.log(`Rolling initiative for session ${sessionId}`);
            
            const response = await this.apiClient.post('/api/combat/roll-initiative.php', {
                session_id: sessionId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Initiative rolled! Combat begins!');
                
                // Just refresh initiative tracker instead of reloading entire dashboard
                await this.refreshInitiativeTracker(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to roll initiative');
            }
            
        } catch (error) {
            console.error('Failed to roll initiative:', error);
            this.app.showError('Failed to roll initiative: ' + error.message);
        }
    }
    
    /**
     * Refresh only the initiative tracker section (optimized - no full dashboard reload)
     * 
     * @param {number} sessionId - Session ID
     */
    async refreshInitiativeTracker(sessionId) {
        try {
            const initiativeData = await this.loadInitiativeOrder(sessionId);
            
            // Update only the initiative tracker section
            const trackerHTML = this.renderInitiativeTracker(sessionId, initiativeData);
            $('.initiative-tracker-section').replaceWith(trackerHTML);
            
            // Event handlers are already set up via document delegation, no need to re-attach
            
        } catch (error) {
            console.error('Failed to refresh initiative tracker:', error);
            // Fallback to full reload if refresh fails
            await this.viewDMDashboard(sessionId);
        }
    }
    
    /**
     * Show modal to add character to initiative
     * 
     * @param {number} sessionId - Session ID
     */
    async showAddCharacterModal(sessionId) {
        try {
            // Load dashboard data to get characters
            const dashboardData = await this.loadDMDashboard(sessionId);
            
            // Get all characters from all players
            const allCharacters = [];
            if (dashboardData.players) {
                dashboardData.players.forEach(player => {
                    if (player.characters) {
                        player.characters.forEach(char => {
                            allCharacters.push({
                                ...char,
                                player_username: player.username
                            });
                        });
                    }
                });
            }
            
            // Get current initiative to see which characters are already added
            const initiativeData = await this.loadInitiativeOrder(sessionId);
            const existingCharacterIds = new Set(
                (initiativeData.initiatives || [])
                    .filter(init => init.entity_type === 'character')
                    .map(init => init.character_id)
            );
            
            // Filter out characters already in initiative
            const availableCharacters = allCharacters.filter(char => 
                !existingCharacterIds.has(char.character_id)
            );
            
            if (availableCharacters.length === 0) {
                this.app.showInfo('All characters are already in the initiative tracker');
                return;
            }
            
            // Create modal
            const modal = $(`
                <div class="modal" id="add-character-modal">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-user-plus"></i> Add Character to Initiative</h2>
                            <button type="button" class="modal-close" id="close-add-character">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="text-muted">Select a character to add to the initiative tracker:</p>
                            <div class="character-list" style="max-height: 400px; overflow-y: auto;">
                                ${availableCharacters.map(char => `
                                    <div class="character-item" data-character-id="${char.character_id}" style="padding: var(--space-3); margin-bottom: var(--space-2); background: var(--parchment-200); border-radius: var(--radius-sm); cursor: pointer; border: 2px solid var(--wood-400);">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <strong>${this.escapeHtml(char.character_name)}</strong>
                                                <div style="font-size: 0.9em; color: var(--text-soft);">
                                                    ${char.class} ${char.level} | Player: ${this.escapeHtml(char.player_username)}
                                                </div>
                                            </div>
                                            <button class="btn btn-sm btn-primary add-character-btn" data-character-id="${char.character_id}">
                                                <i class="fas fa-plus"></i> Add
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="close-add-character-btn">Close</button>
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            modal.addClass('show');
            
            // Setup event listeners
            $('#close-add-character, #close-add-character-btn').on('click', () => {
                $('#add-character-modal').remove();
            });
            
            $('#add-character-modal').on('click', (e) => {
                if (e.target.id === 'add-character-modal') {
                    $('#add-character-modal').remove();
                }
            });
            
            $('.add-character-btn, .character-item').on('click', async (e) => {
                e.preventDefault();
                const $target = $(e.currentTarget);
                const characterId = $target.data('character-id') || $target.closest('.character-item').data('character-id');
                
                if (!characterId) {
                    return;
                }
                
                try {
                    const response = await this.apiClient.post('/api/combat/add-character.php', {
                        character_id: characterId,
                        session_id: sessionId
                    });
                    
                    if (response.status === 'success') {
                        this.app.showSuccess('Character added to initiative tracker!');
                        $('#add-character-modal').remove();
                        await this.refreshInitiativeTracker(sessionId);
                    } else {
                        this.app.showError(response.message || 'Failed to add character');
                    }
                } catch (error) {
                    console.error('Failed to add character:', error);
                    this.app.showError('Failed to add character: ' + error.message);
                }
            });
            
        } catch (error) {
            console.error('Failed to show add character modal:', error);
            this.app.showError('Failed to load characters: ' + error.message);
        }
    }
    
    /**
     * Load initiative tracker for players (read-only view)
     * 
     * @param {number} sessionId - Session ID
     */
    async loadPlayerInitiativeTracker(sessionId) {
        try {
            const initiativeData = await this.loadInitiativeOrder(sessionId);
            this.renderPlayerInitiativeTracker(sessionId, initiativeData);
        } catch (error) {
            console.error('Failed to load player initiative tracker:', error);
            $('#player-initiative-list').html('<p class="text-muted">Unable to load initiative order</p>');
        }
    }
    
    /**
     * Render initiative tracker for players (read-only, no controls)
     * 
     * @param {number} sessionId - Session ID
     * @param {object} initiativeData - Initiative order data
     */
    renderPlayerInitiativeTracker(sessionId, initiativeData) {
        const { initiatives, current_turn } = initiativeData;
        const hasInitiatives = initiatives && initiatives.length > 0;
        
        const listHTML = hasInitiatives ? `
            ${current_turn ? `
                <div class="round-indicator" style="display: flex; justify-content: center; width: 100%; margin-bottom: var(--space-3);">
                    <i class="fas fa-redo"></i> Round ${current_turn.round_number}
                </div>
            ` : ''}
            
            ${initiatives.map((init, index) => `
                <div class="initiative-entry ${init.is_current_turn ? 'current-turn' : ''}" data-initiative-id="${init.initiative_id}">
                    <div class="initiative-order-number">${index + 1}</div>
                    <div class="initiative-roll-display">
                        <i class="fas fa-dice-d6"></i>
                        <span>${init.initiative_roll}</span>
                    </div>
                    <div class="initiative-character-info">
                        <div class="character-name-row">
                            <i class="fas fa-user"></i>
                            <strong>${init.entity_name}</strong>
                            ${init.is_current_turn ? '<span class="current-turn-indicator"><i class="fas fa-arrow-right"></i> CURRENT TURN</span>' : ''}
                        </div>
                        ${init.class && init.level ? `
                            <div class="character-class-level">${init.class} ${init.level}</div>
                        ` : ''}
                    </div>
                                ${init.hp ? `
                                    <div class="initiative-hp-display" style="cursor: pointer;" 
                                         data-entity-type="${init.entity_type}"
                                         ${isMonster ? `data-monster-instance-id="${init.monster_instance_id}"` : ''}
                                         ${!isMonster ? `data-character-id="${init.character_id}"` : ''}
                                         title="Click to adjust HP">
                                        <div class="hp-bar-container">
                                            <div class="hp-bar-fill" style="width: ${init.hp.percentage}%; background-color: ${this.getHPColor(init.hp.percentage)}"></div>
                                        </div>
                                        <div class="hp-text-display">${init.hp.current}/${init.hp.max}</div>
                                    </div>
                                ` : '<div class="initiative-hp-display"><div class="hp-text-display">—</div></div>'}
                </div>
            `).join('')}
        ` : `
            <div class="initiative-empty">
                <i class="fas fa-dice-d6 fa-3x"></i>
                <p><strong>No active combat</strong></p>
                <p class="help-text"><small>Waiting for DM to roll initiative...</small></p>
            </div>
        `;
        
        $('#player-initiative-list').html(listHTML);
    }
    
    /**
     * Start polling to refresh player initiative tracker
     * 
     * @param {number} sessionId - Session ID
     */
    startPlayerInitiativePolling(sessionId) {
        // Clear any existing polling
        if (this.playerInitiativePollInterval) {
            clearInterval(this.playerInitiativePollInterval);
        }
        
        // Poll every 5 seconds
        this.playerInitiativePollInterval = setInterval(async () => {
            // Only poll if we're still on the session details view
            if ($('#player-initiative-tracker').length > 0) {
                await this.loadPlayerInitiativeTracker(sessionId);
            } else {
                // Stop polling if we've navigated away
                clearInterval(this.playerInitiativePollInterval);
                this.playerInitiativePollInterval = null;
            }
        }, 5000);
    }
    
    /**
     * Advance to next turn in initiative order
     * 
     * @param {number} sessionId - Session ID
     */
    async nextTurn(sessionId) {
        try {
            console.log(`Advancing to next turn in session ${sessionId}`);
            
            const response = await this.apiClient.post('/api/combat/next-turn.php', {
                session_id: sessionId,
                direction: 'next'
            });
            
            if (response.status === 'success') {
                this.app.showSuccess(`Next turn: ${response.data.entity_name} (Round ${response.data.round_number})`);
                
                // Just refresh initiative tracker instead of reloading entire dashboard
                await this.refreshInitiativeTracker(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to advance turn');
            }
            
        } catch (error) {
            console.error('Failed to advance turn:', error);
            this.app.showError('Failed to advance turn: ' + error.message);
        }
    }
    
    /**
     * Go back to previous turn in initiative order
     * 
     * @param {number} sessionId - Session ID
     */
    async previousTurn(sessionId) {
        try {
            console.log(`Going back to previous turn in session ${sessionId}`);
            
            const response = await this.apiClient.post('/api/combat/next-turn.php', {
                session_id: sessionId,
                direction: 'previous'
            });
            
            if (response.status === 'success') {
                this.app.showSuccess(`Previous turn: ${response.data.entity_name} (Round ${response.data.round_number})`);
                
                // Just refresh initiative tracker instead of reloading entire dashboard
                await this.refreshInitiativeTracker(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to go back');
            }
            
        } catch (error) {
            console.error('Failed to go back:', error);
            this.app.showError('Failed to go back: ' + error.message);
        }
    }
    
    /**
     * Clear initiative and end combat
     * 
     * @param {number} sessionId - Session ID
     */
    async clearInitiative(sessionId) {
        try {
            const confirmMessage = 'End combat and clear all initiative? This cannot be undone.';
            if (!confirm(confirmMessage)) {
                return;
            }
            
            console.log(`Clearing initiative for session ${sessionId}`);
            
            const response = await this.apiClient.post('/api/combat/clear-initiative.php', {
                session_id: sessionId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Combat ended - initiative cleared');
                
                // Just refresh initiative tracker instead of reloading entire dashboard
                await this.refreshInitiativeTracker(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to clear initiative');
            }
            
        } catch (error) {
            console.error('Failed to clear initiative:', error);
            this.app.showError('Failed to clear initiative: ' + error.message);
        }
    }
    
    /**
     * Load game time for a campaign
     * 
     * @param {number} sessionId - Session ID
     * @param {number} campaignId - Campaign ID
     */
    async loadGameTime(sessionId, campaignId) {
        try {
            const response = await this.apiClient.get(
                `/api/campaigns/get-game-time.php?campaign_id=${campaignId}&session_id=${sessionId}`
            );
            
            if (response.status === 'success') {
                this.updateGameTimeDisplay(response.data);
            }
        } catch (error) {
            console.error('Failed to load game time:', error);
            $('#current-game-time').text('Unable to load game time');
        }
    }
    
    /**
     * Update game time display
     * 
     * @param {Object} data - Game time data
     */
    updateGameTimeDisplay(data) {
        if (data.current_game_datetime) {
            const gameDate = new Date(data.current_game_datetime);
            const formatted = gameDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            $('#current-game-time').text(formatted);
        } else {
            $('#current-game-time').text('Game time not set');
        }
        
        if (data.time_elapsed_formatted) {
            $('#game-time-elapsed').text(`Time elapsed: ${data.time_elapsed_formatted}`);
        } else if (data.game_time_seconds) {
            $('#game-time-elapsed').text(`Time elapsed: ${this.formatGameTimeFromSeconds(data.game_time_seconds)}`);
        }
    }
    
    /**
     * Format game time from seconds
     * 
     * @param {number} seconds - Total seconds
     * @returns {string} Formatted time
     */
    formatGameTimeFromSeconds(seconds) {
        if (seconds < 60) {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts = [];
        if (days > 0) {
            parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        }
        if (hours > 0) {
            parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        }
        if (minutes > 0) {
            parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        }
        if (secs > 0 && days === 0) {
            parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
        }
        
        return parts.length > 0 ? parts.join(', ') : '0 seconds';
    }
    
    /**
     * Start real-time client for game time updates
     * 
     * @param {number} sessionId - Session ID
     */
    startGameTimeRealtimeClient(sessionId) {
        // Reuse existing realtime client if available (e.g., from audio manager)
        if (!this.gameTimeRealtimeClient && this.audioManager?.realtimeClient) {
            this.gameTimeRealtimeClient = this.audioManager.realtimeClient;
        }
        
        // Create new client only if we don't have one
        if (!this.gameTimeRealtimeClient) {
            if (window.RealtimeClient) {
                this.gameTimeRealtimeClient = new RealtimeClient(sessionId, this.app);
            } else {
                console.warn('[Session Management] RealtimeClient not available');
                return;
            }
        }
        
        // Register event handler for game_time_advanced (if not already registered)
        if (!this.gameTimeRealtimeClient._gameTimeHandlerRegistered) {
            this.gameTimeRealtimeClient.on('game_time_advanced', (data) => {
                console.log('[Session Management] Game time advanced event received:', data);
                this.handleGameTimeUpdate(data);
            });
            this.gameTimeRealtimeClient._gameTimeHandlerRegistered = true;
        }
        
        // Start polling if not already started
        if (!this.gameTimeRealtimeClient.isPolling) {
            this.gameTimeRealtimeClient.start();
        }
        
        console.log('[Session Management] Game time real-time client started for session', sessionId);
    }
    
    /**
     * Initialize audio manager for players (to receive synchronized audio from DM)
     * 
     * @param {number} sessionId - Session ID
     */
    initializePlayerAudioManager(sessionId) {
        // Initialize audio manager if available
        if (window.AudioManager) {
            if (!this.audioManager) {
                this.audioManager = new AudioManager(this.app);
            }
            
            // Use gameTimeRealtimeClient if available, otherwise create a new one
            let realtimeClient = this.gameTimeRealtimeClient;
            if (!realtimeClient) {
                // Create a new realtime client for audio if gameTimeRealtimeClient doesn't exist
                if (window.RealtimeClient) {
                    realtimeClient = new RealtimeClient(sessionId, this.app);
                    // Store it so we can reuse it for game time if needed
                    this.gameTimeRealtimeClient = realtimeClient;
                } else {
                    console.warn('[Session Management] RealtimeClient not available, audio synchronization will not work for players');
                    return;
                }
            }
            
            // Initialize audio manager with realtime client
            this.audioManager.init(sessionId, realtimeClient);
            
            // Set initial volume levels to match defaults
            if (this.audioManager) {
                this.audioManager.setMasterVolume(0.6);
                this.audioManager.setMusicVolume(0.33);
            }
            
            // Ensure realtime client is started
            if (!realtimeClient.isPolling) {
                realtimeClient.start();
            }
            
            console.log('[Session Management] Audio Manager initialized for player, session:', sessionId);
        } else {
            console.warn('[Session Management] AudioManager not available');
        }
    }
    
    /**
     * Initialize soundboard for DM Dashboard
     * 
     * @param {number} sessionId - Session ID
     */
    async initializeSoundboard(sessionId) {
        // Initialize audio manager if available
        if (window.AudioManager) {
            if (!this.audioManager) {
                this.audioManager = new AudioManager(this.app);
            }
            
            // Get realtime client from dmDashboard
            const realtimeClient = this.app.modules.dmDashboard?.realtimeClient;
            if (realtimeClient) {
                this.audioManager.init(sessionId, realtimeClient);
            }
            
            // Set initial volume levels to match UI defaults
            if (this.audioManager) {
                this.audioManager.setMasterVolume(0.6);
                this.audioManager.setMusicVolume(0.33);
            }
        }
        
        // Setup soundboard event handlers
        this.setupSoundboardHandlers(sessionId);
        
        // Load tracks and playlists
        await this.loadAudioTracks(sessionId);
        await this.loadPlaylists(sessionId);
    }
    
    /**
     * Setup soundboard event handlers
     */
    setupSoundboardHandlers(sessionId) {
        // Tab switching
        $(document).off('click', '.soundboard-tabs .tab-btn').on('click', '.soundboard-tabs .tab-btn', function() {
            const tab = $(this).data('tab');
            $('.soundboard-tabs .tab-btn').removeClass('active');
            $(this).addClass('active');
            $('.tab-content').removeClass('active');
            $(`.tab-content[data-tab-content="${tab}"]`).addClass('active');
        });
        
        // Music upload
        $(document).off('click', '#upload-music-btn').on('click', '#upload-music-btn', () => {
            $('#music-upload-input').click();
        });
        
        $('#music-upload-input').off('change').on('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.uploadAudioFile(sessionId, file, 'music', $('#music-track-name').val() || file.name);
                $('#music-track-name').val('');
                e.target.value = '';
            }
        });
        
        // Sound upload
        $(document).off('click', '#upload-sound-btn').on('click', '#upload-sound-btn', () => {
            $('#sound-upload-input').click();
        });
        
        $('#sound-upload-input').off('change').on('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.uploadAudioFile(sessionId, file, 'sound', $('#sound-track-name').val() || file.name);
                $('#sound-track-name').val('');
                e.target.value = '';
            }
        });
        
        // Audio controls
        $(document).off('click', '#audio-play-btn').on('click', '#audio-play-btn', async (e) => {
            const trackId = $(e.currentTarget).data('track-id');
            if (trackId) {
                await this.playTrack(sessionId, trackId);
            }
        });
        
        $(document).off('click', '#audio-pause-btn').on('click', '#audio-pause-btn', async () => {
            await this.pauseAudio(sessionId);
        });
        
        $(document).off('click', '#audio-stop-btn').on('click', '#audio-stop-btn', async () => {
            await this.stopAudio(sessionId);
        });
        
        $(document).off('change', '#audio-loop-checkbox').on('change', '#audio-loop-checkbox', async (e) => {
            await this.setAudioLoop(sessionId, $(e.target).is(':checked'));
        });
        
        // Volume controls
        $(document).off('input', '#master-volume-slider').on('input', '#master-volume-slider', async (e) => {
            const volume = parseInt($(e.target).val()) / 100;
            $('#master-volume-value').text($(e.target).val());
            await this.setAudioVolume(sessionId, { volume });
        });
        
        $(document).off('input', '#music-volume-slider').on('input', '#music-volume-slider', async (e) => {
            const volume = parseInt($(e.target).val()) / 100;
            $('#music-volume-value').text($(e.target).val());
            await this.setAudioVolume(sessionId, { music_volume: volume });
        });
        
        $(document).off('input', '#sound-volume-slider').on('input', '#sound-volume-slider', async (e) => {
            const volume = parseInt($(e.target).val()) / 100;
            $('#sound-volume-value').text($(e.target).val());
            await this.setAudioVolume(sessionId, { sound_volume: volume });
        });
        
        // Playlist creation
        $(document).off('click', '#create-playlist-btn').on('click', '#create-playlist-btn', async () => {
            const name = $('#playlist-name-input').val().trim();
            if (name) {
                await this.createPlaylist(sessionId, name);
                $('#playlist-name-input').val('');
            }
        });
    }
    
    /**
     * Upload audio file
     */
    async uploadAudioFile(sessionId, file, trackType, trackName) {
        try {
            const formData = new FormData();
            formData.append('audio', file);
            formData.append('session_id', sessionId);
            formData.append('track_type', trackType);
            formData.append('track_name', trackName);
            
            const xhr = new XMLHttpRequest();
            const url = this.app.modules.apiClient.buildURL('/api/audio/upload.php');
            
            return new Promise((resolve, reject) => {
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            // Parse JSON response (may have HTML before JSON)
                            const jsonMatch = xhr.responseText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                            const responseText = jsonMatch ? jsonMatch[1] : xhr.responseText;
                            const response = JSON.parse(responseText);
                            
                            if (response.status === 'success') {
                                this.app.showSuccess('Audio file uploaded successfully');
                                this.loadAudioTracks(sessionId).then(() => resolve(response)).catch(reject);
                            } else {
                                reject(new Error(response.message || 'Upload failed'));
                            }
                        } catch (e) {
                            console.error('Parse error:', e, 'Response:', xhr.responseText);
                            reject(new Error('Failed to parse server response'));
                        }
                    } else {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                });
                
                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });
                
                xhr.timeout = 30000;
                xhr.addEventListener('timeout', () => {
                    reject(new Error('Upload timeout'));
                });
                
                xhr.open('POST', url);
                
                // Add auth headers
                const authToken = localStorage.getItem('auth_token');
                if (authToken) {
                    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
                }
                
                // Don't set Content-Type header - browser will set it with boundary for FormData
                
                xhr.send(formData);
            });
        } catch (error) {
            console.error('Upload error:', error);
            this.app.showError('Failed to upload audio file: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Load audio tracks
     */
    async loadAudioTracks(sessionId) {
        try {
            const [musicResponse, soundResponse] = await Promise.all([
                this.app.modules.apiClient.get(`/api/audio/list.php?session_id=${sessionId}&track_type=music`),
                this.app.modules.apiClient.get(`/api/audio/list.php?session_id=${sessionId}&track_type=sound`)
            ]);
            
            if (musicResponse.status === 'success' && musicResponse.data && musicResponse.data.tracks) {
                this.renderMusicTracks(musicResponse.data.tracks);
            } else {
                this.renderMusicTracks([]);
            }
            
            if (soundResponse.status === 'success' && soundResponse.data && soundResponse.data.tracks) {
                this.renderSoundboardGrid(soundResponse.data.tracks);
            } else {
                this.renderSoundboardGrid([]);
            }
        } catch (error) {
            console.error('Failed to load audio tracks:', error);
            // Render empty lists on error
            this.renderMusicTracks([]);
            this.renderSoundboardGrid([]);
        }
    }
    
    /**
     * Render music tracks list
     */
    renderMusicTracks(tracks) {
        const container = $('#music-tracks-container');
        if (!tracks || !Array.isArray(tracks)) {
            container.html('<p class="text-muted">No music tracks uploaded yet</p>');
            return;
        }
        
        if (tracks.length === 0) {
            container.html('<p class="text-muted">No music tracks uploaded yet</p>');
            return;
        }
        
        const html = tracks.map(track => `
            <div class="track-item" data-track-id="${track.track_id}">
                <div class="track-info">
                    <strong>${this.escapeHtml(track.track_name)}</strong>
                    <span class="track-meta">${track.duration_seconds ? this.formatDuration(track.duration_seconds) : 'Unknown duration'}</span>
                </div>
                <div class="track-actions">
                    <button class="btn btn-sm btn-success play-track-btn" data-track-id="${track.track_id}" data-file-path="${track.file_path}">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <button class="btn btn-sm btn-danger delete-track-btn" data-track-id="${track.track_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        container.html(html);
        
        // Setup play buttons
        $(document).off('click', '.play-track-btn').on('click', '.play-track-btn', async (e) => {
            const trackId = $(e.currentTarget).data('track-id');
            const sessionId = this.currentSession?.session_id || $(e.currentTarget).closest('.soundboard-section').find('[data-session-id]').first().data('session-id');
            if (sessionId && trackId) {
                await this.playTrack(sessionId, trackId);
                // Update play button to show it's playing
                $('#audio-play-btn').data('track-id', trackId);
            }
        });
        
        // Setup delete buttons
        $(document).off('click', '.delete-track-btn').on('click', '.delete-track-btn', async (e) => {
            const trackId = $(e.currentTarget).data('track-id');
            if (confirm('Are you sure you want to delete this track?')) {
                await this.deleteTrack(trackId);
            }
        });
    }
    
    /**
     * Render soundboard grid
     */
    renderSoundboardGrid(tracks) {
        const container = $('#soundboard-grid');
        if (!tracks || !Array.isArray(tracks)) {
            container.html('<p class="text-muted">No sound effects uploaded yet</p>');
            return;
        }
        
        if (tracks.length === 0) {
            container.html('<p class="text-muted">No sound effects uploaded yet</p>');
            return;
        }
        
        const html = tracks.map(track => `
            <div class="soundboard-button" data-track-id="${track.track_id}" data-file-path="${track.file_path}">
                <i class="fas fa-volume-up"></i>
                <span>${this.escapeHtml(track.track_name)}</span>
            </div>
        `).join('');
        
        container.html(html);
        
        // Setup soundboard buttons
        $(document).off('click', '.soundboard-button').on('click', '.soundboard-button', async (e) => {
            const trackId = $(e.currentTarget).data('track-id');
            const sessionId = this.currentSession?.session_id || $(e.currentTarget).closest('.soundboard-section').find('[data-session-id]').first().data('session-id');
            if (sessionId && trackId) {
                await this.playSoundEffect(sessionId, trackId);
            }
        });
    }
    
    /**
     * Load playlists
     */
    async loadPlaylists(sessionId) {
        try {
            const response = await this.app.modules.apiClient.get(`/api/audio/playlists/list.php?session_id=${sessionId}`);
            if (response.status === 'success' && response.data && response.data.playlists) {
                this.renderPlaylists(response.data.playlists);
            } else {
                this.renderPlaylists([]);
            }
        } catch (error) {
            console.error('Failed to load playlists:', error);
            this.renderPlaylists([]);
        }
    }
    
    /**
     * Render playlists
     */
    renderPlaylists(playlists) {
        const container = $('#playlists-container');
        if (!playlists || !Array.isArray(playlists)) {
            container.html('<p class="text-muted">No playlists created yet</p>');
            return;
        }
        
        if (playlists.length === 0) {
            container.html('<p class="text-muted">No playlists created yet</p>');
            return;
        }
        
        const sessionId = this.currentSession?.session_id;
        
        const html = playlists.map(playlist => {
            const tracksHtml = playlist.tracks && playlist.tracks.length > 0 
                ? playlist.tracks.map((pt, idx) => `
                    <div class="playlist-track-item" data-playlist-track-id="${pt.playlist_track_id}">
                        <span class="track-order">${idx + 1}.</span>
                        <span class="track-name">${this.escapeHtml(pt.track.track_name)}</span>
                        <button class="btn btn-xs btn-danger remove-track-btn" data-playlist-id="${playlist.playlist_id}" data-track-id="${pt.track_id}" title="Remove from playlist">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')
                : '<p style="font-size: 0.875rem; margin: 0.5rem 0; color: #2a1409; font-weight: 500;">No tracks in playlist</p>';
            
            return `
            <div class="playlist-item" data-playlist-id="${playlist.playlist_id}">
                <div class="playlist-header">
                    <strong>${this.escapeHtml(playlist.playlist_name)}</strong>
                    <span class="playlist-track-count">${playlist.tracks ? playlist.tracks.length : 0} tracks</span>
                </div>
                <div class="playlist-tracks-list">
                    ${tracksHtml}
                </div>
                <div class="playlist-actions" style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-primary edit-playlist-btn" data-playlist-id="${playlist.playlist_id}" data-session-id="${sessionId}">
                        <i class="fas fa-edit"></i> Add Tracks
                    </button>
                    <button class="btn btn-sm btn-success play-playlist-btn" data-playlist-id="${playlist.playlist_id}">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 0.5rem; margin: 0; cursor: pointer;">
                        <input type="checkbox" class="playlist-shuffle-checkbox" data-playlist-id="${playlist.playlist_id}" style="width: 18px; height: 18px; accent-color: var(--brass-600);">
                        <span style="font-family: 'Lora', serif; color: #2a1409; font-weight: 500;">Shuffle</span>
                    </label>
                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 0.5rem; margin: 0; cursor: pointer;">
                        <input type="checkbox" class="playlist-loop-checkbox" data-playlist-id="${playlist.playlist_id}" style="width: 18px; height: 18px; accent-color: var(--brass-600);">
                        <span style="font-family: 'Lora', serif; color: #2a1409; font-weight: 500;">Repeat</span>
                    </label>
                    <button class="btn btn-sm btn-danger delete-playlist-btn" data-playlist-id="${playlist.playlist_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');
        
        container.html(html);
        
        // Setup event handlers
        this.setupPlaylistEventHandlers(sessionId);
    }
    
    /**
     * Setup playlist event handlers
     */
    setupPlaylistEventHandlers(sessionId) {
        // Edit playlist button - show modal to add tracks
        $(document).off('click', '.edit-playlist-btn').on('click', '.edit-playlist-btn', async (e) => {
            const playlistId = $(e.currentTarget).data('playlist-id');
            const sessionId = $(e.currentTarget).data('session-id') || this.currentSession?.session_id;
            if (playlistId && sessionId) {
                await this.showAddTracksToPlaylistModal(sessionId, playlistId);
            }
        });
        
        // Remove track from playlist
        $(document).off('click', '.remove-track-btn').on('click', '.remove-track-btn', async (e) => {
            e.stopPropagation();
            const playlistId = $(e.currentTarget).data('playlist-id');
            const trackId = $(e.currentTarget).data('track-id');
            const sessionId = this.currentSession?.session_id;
            if (playlistId && trackId && sessionId) {
                await this.removeTrackFromPlaylist(sessionId, playlistId, trackId);
            }
        });
        
        // Play playlist
        $(document).off('click', '.play-playlist-btn').on('click', '.play-playlist-btn', async (e) => {
            const playlistId = $(e.currentTarget).data('playlist-id');
            const sessionId = this.currentSession?.session_id;
            if (playlistId && sessionId) {
                const $playlistItem = $(e.currentTarget).closest('.playlist-item');
                const isLooping = $playlistItem.find('.playlist-loop-checkbox').is(':checked');
                const isShuffled = $playlistItem.find('.playlist-shuffle-checkbox').is(':checked');
                await this.playPlaylist(sessionId, playlistId, isLooping, isShuffled);
            }
        });
        
        // Playlist shuffle checkbox
        $(document).off('change', '.playlist-shuffle-checkbox').on('change', '.playlist-shuffle-checkbox', async (e) => {
            const playlistId = $(e.currentTarget).data('playlist-id');
            const sessionId = this.currentSession?.session_id;
            const isShuffled = $(e.currentTarget).is(':checked');
            if (playlistId && sessionId) {
                // Update playlist shuffle state (this is just UI state, actual shuffling happens during playback)
                console.log(`Playlist ${playlistId} shuffle set to: ${isShuffled}`);
            }
        });
        
        // Playlist loop checkbox
        $(document).off('change', '.playlist-loop-checkbox').on('change', '.playlist-loop-checkbox', async (e) => {
            const playlistId = $(e.currentTarget).data('playlist-id');
            const sessionId = this.currentSession?.session_id;
            const isLooping = $(e.currentTarget).is(':checked');
            if (playlistId && sessionId) {
                // Update playlist loop state (this is just UI state, actual looping happens during playback)
                console.log(`Playlist ${playlistId} loop set to: ${isLooping}`);
            }
        });
        
        // Delete playlist
        $(document).off('click', '.delete-playlist-btn').on('click', '.delete-playlist-btn', async (e) => {
            const playlistId = $(e.currentTarget).data('playlist-id');
            const sessionId = this.currentSession?.session_id;
            if (playlistId && sessionId && confirm('Are you sure you want to delete this playlist?')) {
                await this.deletePlaylist(sessionId, playlistId);
            }
        });
    }
    
    /**
     * Show modal to add tracks to playlist
     */
    async showAddTracksToPlaylistModal(sessionId, playlistId) {
        try {
            // Load available music tracks
            const tracksResponse = await this.app.modules.apiClient.get(`/api/audio/list.php?session_id=${sessionId}&track_type=music`);
            const tracks = tracksResponse.status === 'success' && tracksResponse.data && tracksResponse.data.tracks 
                ? tracksResponse.data.tracks 
                : [];
            
            // Get current playlist tracks
            const playlistResponse = await this.app.modules.apiClient.get(`/api/audio/playlists/list.php?session_id=${sessionId}`);
            let currentTrackIds = [];
            if (playlistResponse.status === 'success' && playlistResponse.data && playlistResponse.data.playlists) {
                const playlist = playlistResponse.data.playlists.find(p => p.playlist_id === playlistId);
                if (playlist && playlist.tracks) {
                    currentTrackIds = playlist.tracks.map(pt => pt.track_id);
                }
            }
            
            // Create modal HTML (matching existing modal style)
            const modalHtml = $(`
                <div class="modal" id="add-tracks-modal">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-music"></i> Add Tracks to Playlist</h2>
                            <button type="button" class="modal-close close-modal-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>Select tracks to add to the playlist. Tracks already in the playlist are marked and cannot be selected again.</p>
                            <div class="available-tracks-list" style="max-height: 400px; overflow-y: auto; margin-top: 1rem;">
                                ${tracks.length === 0 
                                    ? '<p class="text-muted">No music tracks available. Upload some tracks first.</p>'
                                    : tracks.map(track => {
                                        const isInPlaylist = currentTrackIds.includes(track.track_id);
                                        return `
                                            <div class="track-select-item ${isInPlaylist ? 'in-playlist' : ''}" data-track-id="${track.track_id}" style="padding: 0.5rem; margin-bottom: 0.25rem; border: 1px solid var(--wood-600); border-radius: 4px; ${isInPlaylist ? 'opacity: 0.6; background: rgba(0,0,0,0.1);' : ''}">
                                                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: ${isInPlaylist ? 'not-allowed' : 'pointer'};">
                                                    <input type="checkbox" ${isInPlaylist ? 'checked disabled' : ''} data-track-id="${track.track_id}">
                                                    <span style="flex: 1;">${this.escapeHtml(track.track_name)}</span>
                                                    ${isInPlaylist ? '<span class="badge" style="background: var(--brass-500); color: var(--wood-900);">Already in Playlist</span>' : ''}
                                                </label>
                                            </div>
                                        `;
                                    }).join('')
                                }
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
                            <button type="button" class="btn btn-primary" id="add-selected-tracks-btn" data-playlist-id="${playlistId}" data-session-id="${sessionId}">
                                <i class="fas fa-plus"></i> Add Selected Tracks
                            </button>
                        </div>
                    </div>
                </div>
            `);
            
            // Remove existing modal if any
            $('#add-tracks-modal').remove();
            
            // Add modal to body
            $('body').append(modalHtml);
            
            // Show modal (matching existing modal style)
            $('#add-tracks-modal').addClass('show');
            
            // Handle close modal buttons
            $('.close-modal-btn').off('click').on('click', () => {
                $('#add-tracks-modal').removeClass('show');
                setTimeout(() => $('#add-tracks-modal').remove(), 300);
            });
            
            // Handle add tracks button
            $('#add-selected-tracks-btn').off('click').on('click', async () => {
                const selectedTracks = [];
                $('.track-select-item input[type="checkbox"]:checked:not(:disabled)').each(function() {
                    selectedTracks.push({
                        track_id: parseInt($(this).data('track-id'))
                    });
                });
                
                if (selectedTracks.length === 0) {
                    this.app.showError('Please select at least one track to add');
                    return;
                }
                
                // Get current tracks and add new ones
                const allTracks = [...currentTrackIds.map(tid => ({ track_id: tid })), ...selectedTracks];
                
                await this.updatePlaylistTracks(sessionId, playlistId, allTracks);
                // Hide modal
                $('#add-tracks-modal').removeClass('show');
                setTimeout(() => $('#add-tracks-modal').remove(), 300);
            });
            
        } catch (error) {
            console.error('Failed to show add tracks modal:', error);
            this.app.showError('Failed to load tracks: ' + error.message);
        }
    }
    
    /**
     * Update playlist tracks
     */
    async updatePlaylistTracks(sessionId, playlistId, tracks) {
        try {
            // Add track_order to each track
            const tracksWithOrder = tracks.map((track, index) => ({
                track_id: track.track_id,
                track_order: index
            }));
            
            const response = await this.app.modules.apiClient.put('/api/audio/playlists/update.php', {
                playlist_id: playlistId,
                tracks: tracksWithOrder
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Playlist updated successfully');
                // Reload playlists
                await this.loadPlaylists(sessionId);
            } else {
                this.app.showError('Failed to update playlist');
            }
        } catch (error) {
            console.error('Failed to update playlist tracks:', error);
            this.app.showError('Failed to update playlist: ' + error.message);
        }
    }
    
    /**
     * Remove track from playlist
     */
    async removeTrackFromPlaylist(sessionId, playlistId, trackId) {
        try {
            // Get current playlist tracks
            const playlistResponse = await this.app.modules.apiClient.get(`/api/audio/playlists/list.php?session_id=${sessionId}`);
            if (playlistResponse.status === 'success' && playlistResponse.data && playlistResponse.data.playlists) {
                const playlist = playlistResponse.data.playlists.find(p => p.playlist_id === playlistId);
                if (playlist && playlist.tracks) {
                    // Remove the track
                    const updatedTracks = playlist.tracks
                        .filter(pt => pt.track_id !== trackId)
                        .map((pt, index) => ({
                            track_id: pt.track_id,
                            track_order: index
                        }));
                    
                    await this.updatePlaylistTracks(sessionId, playlistId, updatedTracks);
                }
            }
        } catch (error) {
            console.error('Failed to remove track from playlist:', error);
            this.app.showError('Failed to remove track: ' + error.message);
        }
    }
    
    /**
     * Play playlist
     */
    async playPlaylist(sessionId, playlistId, isLooping = false, isShuffled = false) {
        try {
            const response = await this.app.modules.apiClient.post('/api/audio/control.php', {
                session_id: sessionId,
                action: 'play',
                playlist_id: playlistId,
                is_playlist_looping: isLooping,
                is_playlist_shuffled: isShuffled
            });
            
            if (response.status === 'success') {
                let message = 'Playing playlist';
                if (isShuffled && isLooping) {
                    message += ' (shuffled, repeating)';
                } else if (isShuffled) {
                    message += ' (shuffled)';
                } else if (isLooping) {
                    message += ' (repeating)';
                }
                this.app.showSuccess(message);
            }
        } catch (error) {
            console.error('Failed to play playlist:', error);
            this.app.showError('Failed to play playlist: ' + error.message);
        }
    }
    
    /**
     * Delete playlist
     */
    async deletePlaylist(sessionId, playlistId) {
        try {
            const response = await this.app.modules.apiClient.delete(`/api/audio/playlists/delete.php?playlist_id=${playlistId}`);
            
            if (response.status === 'success') {
                this.app.showSuccess('Playlist deleted successfully');
                // Reload playlists
                await this.loadPlaylists(sessionId);
            } else {
                this.app.showError('Failed to delete playlist');
            }
        } catch (error) {
            console.error('Failed to delete playlist:', error);
            this.app.showError('Failed to delete playlist: ' + error.message);
        }
    }
    
    /**
     * Play track
     */
    async playTrack(sessionId, trackId) {
        try {
            const response = await this.app.modules.apiClient.post('/api/audio/control.php', {
                session_id: sessionId,
                action: 'play',
                track_id: trackId
            });
            
            if (response.status === 'success') {
                // Update UI
                const track = await this.getTrackInfo(trackId);
                if (track) {
                    $('#current-track-info').show();
                    $('#current-track-name').text(track.track_name);
                }
            }
        } catch (error) {
            console.error('Play error:', error);
            this.app.showError('Failed to play track: ' + error.message);
        }
    }
    
    /**
     * Pause audio
     */
    async pauseAudio(sessionId) {
        try {
            await this.app.modules.apiClient.post('/api/audio/control.php', {
                session_id: sessionId,
                action: 'pause'
            });
        } catch (error) {
            console.error('Pause error:', error);
        }
    }
    
    /**
     * Stop audio
     */
    async stopAudio(sessionId) {
        try {
            await this.app.modules.apiClient.post('/api/audio/control.php', {
                session_id: sessionId,
                action: 'stop'
            });
            $('#current-track-info').hide();
        } catch (error) {
            console.error('Stop error:', error);
        }
    }
    
    /**
     * Set audio loop
     */
    async setAudioLoop(sessionId, loop) {
        try {
            await this.app.modules.apiClient.post('/api/audio/control.php', {
                session_id: sessionId,
                action: 'loop',
                loop: loop
            });
        } catch (error) {
            console.error('Loop error:', error);
        }
    }
    
    /**
     * Set audio volume
     */
    async setAudioVolume(sessionId, volumeData) {
        try {
            await this.app.modules.apiClient.post('/api/audio/control.php', {
                session_id: sessionId,
                action: 'volume',
                ...volumeData
            });
        } catch (error) {
            console.error('Volume error:', error);
        }
    }
    
    /**
     * Play sound effect
     */
    async playSoundEffect(sessionId, trackId) {
        try {
            await this.app.modules.apiClient.post('/api/audio/soundboard/play.php', {
                session_id: sessionId,
                track_id: trackId,
                volume: 1.0
            });
        } catch (error) {
            console.error('Sound effect error:', error);
        }
    }
    
    /**
     * Create playlist
     */
    async createPlaylist(sessionId, name) {
        try {
            const response = await this.app.modules.apiClient.post('/api/audio/playlists/create.php', {
                session_id: sessionId,
                playlist_name: name
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Playlist created successfully');
                await this.loadPlaylists(sessionId);
            }
        } catch (error) {
            console.error('Create playlist error:', error);
            this.app.showError('Failed to create playlist: ' + error.message);
        }
    }
    
    /**
     * Delete track
     */
    async deleteTrack(trackId) {
        try {
            const response = await this.app.modules.apiClient.delete(`/api/audio/delete.php?track_id=${trackId}`);
            if (response.status === 'success') {
                this.app.showSuccess('Track deleted successfully');
                // Reload tracks
                const sessionId = this.currentSession?.session_id;
                if (sessionId) {
                    await this.loadAudioTracks(sessionId);
                }
            }
        } catch (error) {
            console.error('Delete track error:', error);
            this.app.showError('Failed to delete track: ' + error.message);
        }
    }
    
    /**
     * Get track info
     */
    async getTrackInfo(trackId) {
        try {
            // Get all tracks and find the one we need
            const response = await this.app.modules.apiClient.get(`/api/audio/list.php?session_id=${this.currentSession?.session_id}`);
            if (response.status === 'success' && response.data.tracks) {
                const track = response.data.tracks.find(t => t.track_id === trackId);
                return track || null;
            }
        } catch (error) {
            console.error('Get track info error:', error);
        }
        return null;
    }
    
    /**
     * Format duration
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Handle game time update from real-time event
     * 
     * @param {Object} data - Event data
     */
    handleGameTimeUpdate(data) {
        if (data.current_game_datetime) {
            const gameDate = new Date(data.current_game_datetime);
            const formatted = gameDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            $('#current-game-time').text(formatted);
        }
        
        if (data.new_game_time_seconds !== undefined) {
            $('#game-time-elapsed').text(`Time elapsed: ${this.formatGameTimeFromSeconds(data.new_game_time_seconds)}`);
        }
        
        // Show notification if effects expired
        if (data.effects_expired && data.effects_expired.length > 0) {
            const effectNames = data.effects_expired.map(e => e.effect_name).join(', ');
            this.app.showInfo(`${data.effects_expired.length} effect(s) expired: ${effectNames}`);
        }
    }
    
    /**
     * Advance campaign game time
     * 
     * @param {string} type - 'round', 'turn', or 'day'
     * @param {HTMLElement} button - Button element that triggered the action
     */
    async advanceCampaignTime(type, button) {
        const campaignId = $(button).data('campaign-id');
        const sessionId = $(button).data('session-id');
        
        if (!campaignId) {
            this.app.showError('This session is not linked to a campaign. Please link it to a campaign first.');
            return;
        }
        
        const typeNames = {
            'round': '1 round (10 seconds)',
            'turn': '1 turn (10 minutes)',
            'day': '1 day'
        };
        
        // Disable button during request
        const $button = $(button);
        const originalHtml = $button.html();
        $button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        
        try {
            const response = await this.apiClient.post('/api/campaigns/advance-time.php', {
                campaign_id: campaignId,
                session_id: sessionId || null,
                advancement_type: type,
                notes: `DM advanced time by ${typeNames[type]}`
            });
            
            if (response.status === 'success') {
                const data = response.data;
                
                // Show success message with effects info
                let message = `Time advanced by ${typeNames[type]}`;
                if (data.effects_expired && data.effects_expired.length > 0) {
                    message += `. ${data.effects_expired.length} effect(s) expired.`;
                }
                
                this.app.showSuccess(message);
                
                // Refresh dashboard to show updated game time
                if (sessionId) {
                    await this.viewDMDashboard(sessionId);
                }
            } else {
                throw new Error(response.message || 'Failed to advance time');
            }
        } catch (error) {
            console.error('Failed to advance time:', error);
            this.app.showError('Failed to advance time: ' + error.message);
        } finally {
            // Re-enable button
            $button.prop('disabled', false).html(originalHtml);
        }
    }
    
    /**
     * Initialize session management module
     */
    init() {
        this.setupEventHandlers();
        console.log('Session Management Module initialized');
    }
    
    /**
     * Cleanup resources when navigating away
     */
    cleanup() {
        // Stop any ongoing processes
        console.log('Session Management Module cleanup');
        
        // Stop game time real-time client
        if (this.gameTimeRealtimeClient) {
            this.gameTimeRealtimeClient.stop();
            this.gameTimeRealtimeClient = null;
        }
        
        // Stop player initiative polling
        if (this.playerInitiativePollInterval) {
            clearInterval(this.playerInitiativePollInterval);
            this.playerInitiativePollInterval = null;
        }
    }
}

// Export to window for use in app.js
window.SessionManagementModule = SessionManagementModule;
