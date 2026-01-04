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
        
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        $('#session-date').val(tomorrow.toISOString().split('T')[0]);
        
        // Set default time to 7 PM
        $('#session-time').val('19:00');
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
            
            const sessionData = {
                session_title: formData.get('session_title'),
                session_description: formData.get('session_description'),
                meet_link: formData.get('meet_link') || '',
                session_datetime: `${formData.get('session_date')} ${formData.get('session_time')}:00`,
                duration_minutes: parseInt(formData.get('duration_minutes')),
                max_players: parseInt(formData.get('max_players'))
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
            
            const response = await this.apiClient.put('/api/session/update.php', {
                session_id: parseInt(sessionId),
                session_title: title,
                session_description: description,
                meet_link: meetLink,
                session_datetime: datetime.replace('T', ' ') + ':00',
                duration_minutes: duration,
                max_players: maxPlayers,
                status: status
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
                
                <div class="map-scratchpad-section">
                    <h2><i class="fas fa-map"></i> Map Scratch-Pad</h2>
                    <div id="map-scratchpad-container"></div>
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
                    <h2><i class="fas fa-bolt"></i> Initiative Tracker</h2>
                    <div class="initiative-actions">
                        ${hasInitiatives ? `
                            <button class="btn btn-sm btn-success" data-action="initiative-prev" data-session-id="${sessionId}">
                                <i class="fas fa-arrow-left"></i> Previous
                            </button>
                            <button class="btn btn-sm btn-success" data-action="initiative-next" data-session-id="${sessionId}">
                                Next <i class="fas fa-arrow-right"></i>
                            </button>
                            <button class="btn btn-sm btn-warning" data-action="initiative-roll" data-session-id="${sessionId}">
                                <i class="fas fa-dice-d6"></i> Re-roll
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="initiative-clear" data-session-id="${sessionId}">
                                <i class="fas fa-times"></i> End Combat
                            </button>
                        ` : `
                            <button class="btn btn-primary" data-action="initiative-roll" data-session-id="${sessionId}">
                                <i class="fas fa-dice-d6"></i> Roll Initiative!
                            </button>
                        `}
                    </div>
                </div>
                
                ${hasInitiatives ? `
                    <div class="initiative-list">
                        ${current_turn ? `
                            <div class="round-indicator">
                                <i class="fas fa-redo"></i> Round ${current_turn.round_number}
                            </div>
                        ` : ''}
                        
                        ${initiatives.map((init, index) => `
                            <div class="initiative-entry ${init.is_current_turn ? 'current-turn' : ''}">
                                <div class="initiative-position">${index + 1}</div>
                                <div class="initiative-roll">
                                    <i class="fas fa-dice-d6"></i> ${init.initiative_roll}
                                </div>
                                <div class="initiative-entity">
                                    <div class="entity-name">
                                        ${init.entity_type === 'character' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-skull"></i>'}
                                        ${init.entity_name}
                                    </div>
                                    ${init.class && init.level ? `
                                        <div class="entity-details">${init.class} ${init.level}</div>
                                    ` : ''}
                                </div>
                                ${init.hp ? `
                                    <div class="initiative-hp">
                                        <div class="hp-bar-small">
                                            <div class="hp-bar-fill" style="width: ${init.hp.percentage}%; background-color: ${this.getHPColor(init.hp.percentage)}"></div>
                                        </div>
                                        <div class="hp-text">${init.hp.current}/${init.hp.max}</div>
                                    </div>
                                ` : ''}
                                ${init.is_current_turn ? '<div class="current-turn-badge"><i class="fas fa-arrow-right"></i> CURRENT TURN</div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="initiative-empty">
                        <i class="fas fa-dice-d6 fa-3x"></i>
                        <p>No active combat. Roll initiative to start!</p>
                        <p class="help-text">BECMI Rules: Each character rolls 1d6. Highest goes first!</p>
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
                
                // Reload DM dashboard to show initiative
                await this.viewDMDashboard(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to roll initiative');
            }
            
        } catch (error) {
            console.error('Failed to roll initiative:', error);
            this.app.showError('Failed to roll initiative: ' + error.message);
        }
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
                
                // Reload DM dashboard to update current turn
                await this.viewDMDashboard(sessionId);
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
                
                // Reload DM dashboard to update current turn
                await this.viewDMDashboard(sessionId);
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
                
                // Reload DM dashboard to show empty initiative
                await this.viewDMDashboard(sessionId);
            } else {
                this.app.showError(response.message || 'Failed to clear initiative');
            }
            
        } catch (error) {
            console.error('Failed to clear initiative:', error);
            this.app.showError('Failed to clear initiative: ' + error.message);
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
        // Add any cleanup logic here if needed
    }
}

// Export to window for use in app.js
window.SessionManagementModule = SessionManagementModule;
