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
            
        } catch (error) {
            console.error('Failed to view session:', error);
            this.app.showError('Failed to load session details');
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
                        <h3>Players</h3>
                        <div class="players-list">
                            <p>Player management coming soon...</p>
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
     * Initialize session management module
     */
    init() {
        this.setupEventHandlers();
        console.log('Session Management Module initialized');
    }
}

// Export to window for use in app.js
window.SessionManagementModule = SessionManagementModule;
