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
        const isUpcoming = sessionDate > now;
        const isPast = sessionDate < now;
        const isActive = session.status === 'active';
        
        let statusClass = 'scheduled';
        let statusText = 'Scheduled';
        
        if (isActive) {
            statusClass = 'active';
            statusText = 'Active';
        } else if (isPast) {
            statusClass = 'completed';
            statusText = 'Completed';
        } else if (session.status === 'cancelled') {
            statusClass = 'cancelled';
            statusText = 'Cancelled';
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
                
                <div class="session-actions">
                    <button class="btn btn-sm btn-primary"data-action="view-session"data-session-id="${session.session_id}">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                    <button class="btn btn-sm btn-secondary"data-action="edit-session"data-session-id="${session.session_id}">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    ${isUpcoming ? `<button class="btn btn-sm btn-success"data-action="start-session"data-session-id="${session.session_id}">
                            <i class="fas fa-play"></i>
                            Start
                        </button>
                    `: ''}
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
        
        $(document).on('submit', '#invite-player-form', (e) => {
            e.preventDefault();
            const sessionId = parseInt($('#invite-session-id').val());
            const userId = parseInt($('#invite-user-id').val());
            this.invitePlayer(sessionId, userId);
        });
        
        $(document).on('click', '[data-action="remove-player"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            const userId = $(e.currentTarget).data('user-id');
            const username = $(e.currentTarget).data('username');
            this.removePlayer(sessionId, userId, username);
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
        
        // DM Dashboard actions
        $(document).on('click', '[data-action="view-dm-dashboard"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            this.viewDMDashboard(sessionId);
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
    }
    
    /**
     * View session details
     */
    async viewSession(sessionId) {
        try {
            await this.loadSession(sessionId);
            
            // Render session details view
            const content = await this.renderSessionDetails(this.currentSession);
            $('#content-area').html(content);
            
            // Update navigation
            $('.nav-link').removeClass('active');
            $('.nav-link[data-view="sessions"]').addClass('active');
            
            // Load players list
            this.loadAndRenderPlayers(sessionId);
            
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
                    <h1>${session.session_title}</h1>
                    <div class="session-status ${session.status}">${session.status}</div>
                </div>
                
                <div class="session-details-content">
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
                    
                    <div class="session-players">
                        <div class="players-header">
                            <h3>Players</h3>
                            ${session.is_dm ? `
                                <button class="btn btn-primary btn-sm" data-action="view-dm-dashboard" data-session-id="${session.session_id}">
                                    <i class="fas fa-dice-d20"></i> DM Dashboard
                                </button>
                            ` : ''}
                        </div>
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
            
            const response = await this.apiClient.put('/api/session/update.php', {
                session_id: parseInt(sessionId),
                session_title: title,
                session_description: description,
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
     * Start session
     */
    async startSession(sessionId) {
        try {
            // This would call a session start API endpoint
            this.app.showSuccess('Session started! (Feature coming soon)');
            
        } catch (error) {
            console.error('Failed to start session:', error);
            this.app.showError('Failed to start session');
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
            const response = await this.apiClient.get(`/api/session/get-players.php?session_id=${sessionId}`);
            
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
            
            // Show loading
            $('#invite-player-content').html('<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading users...</div>');
            $('#invite-player-modal').show();
            
            // Get list of available users (not already in session)
            const playersData = await this.loadSessionPlayers(sessionId);
            const existingPlayerIds = playersData.players.map(p => p.user_id);
            
            // For now, we'll need a way to get all users - this would be a new endpoint
            // For simplicity, we'll allow entering user ID directly
            $('#invite-player-content').html(`
                <form id="invite-player-form" class="invite-form">
                    <input type="hidden" id="invite-session-id" value="${sessionId}">
                    
                    <div class="form-group">
                        <label for="invite-user-id">User ID to Invite:</label>
                        <input type="number" id="invite-user-id" name="user_id" min="1" required>
                        <p class="help-text">Enter the ID of the user you want to invite</p>
                    </div>
                    
                    <div class="form-group">
                        <h4>Current Players (${playersData.players.length})</h4>
                        <ul class="current-players-list">
                            ${playersData.players.map(p => `
                                <li>
                                    <strong>${p.username}</strong> (ID: ${p.user_id}) 
                                    <span class="player-status ${p.status}">${p.status}</span>
                                    ${p.character_count > 0 ? `<span class="character-count">${p.character_count} character(s)</span>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary modal-close">Cancel</button>
                        <button type="submit" class="btn btn-primary">Send Invitation</button>
                    </div>
                </form>
            `);
            
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
        try {
            console.log('=== DM DASHBOARD DEBUG ===');
            console.log('Loading dashboard for session:', sessionId);
            
            const dashboardData = await this.loadDMDashboard(sessionId);
            console.log('Dashboard data loaded:', dashboardData);
            
            // Render DM dashboard view
            const dashboardHTML = this.renderDMDashboard(dashboardData);
            console.log('Dashboard HTML length:', dashboardHTML.length);
            console.log('Target element exists:', $('#content-area').length > 0);
            
            $('#content-area').html(dashboardHTML);
            console.log('Dashboard HTML inserted into DOM');
            console.log('=== DM DASHBOARD DEBUG END ===');
            
        } catch (error) {
            console.error('Failed to load DM dashboard:', error);
            this.app.showError('Failed to load DM dashboard: ' + error.message);
        }
    }
    
    /**
     * Render DM Dashboard with all player characters
     * 
     * @param {object} data - Dashboard data from API
     * @returns {string} HTML for DM dashboard
     */
    renderDMDashboard(data) {
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
                        <button class="btn btn-primary" data-action="invite-player" data-session-id="${session.session_id}">
                            <i class="fas fa-user-plus"></i> Invite Player
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
            </div>
        `;
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
                    <div class="stat-group">
                        <h5>Abilities</h5>
                        <div class="abilities-mini">
                            <span title="Strength">STR ${character.abilities.strength}</span>
                            <span title="Dexterity">DEX ${character.abilities.dexterity}</span>
                            <span title="Constitution">CON ${character.abilities.constitution}</span>
                            <span title="Intelligence">INT ${character.abilities.intelligence}</span>
                            <span title="Wisdom">WIS ${character.abilities.wisdom}</span>
                            <span title="Charisma">CHA ${character.abilities.charisma}</span>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h5>Combat</h5>
                        <div class="combat-stats">
                            <span><strong>AC:</strong> ${character.combat.armor_class}</span>
                            <span><strong>THAC0 (M):</strong> ${character.combat.thac0_melee}</span>
                            <span><strong>THAC0 (R):</strong> ${character.combat.thac0_ranged}</span>
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
     * Initialize session management module
     */
    init() {
        this.setupEventHandlers();
        console.log('Session Management Module initialized');
    }
}

// Export to window for use in app.js
window.SessionManagementModule = SessionManagementModule;
