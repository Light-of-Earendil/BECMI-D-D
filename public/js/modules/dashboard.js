/**
 * BECMI D&D Character Manager - Dashboard Module
 * 
 * Handles the main dashboard view with character and session overview.
 */

class DashboardModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        
        console.log('Dashboard Module initialized');
    }
    
    /**
     * Render the dashboard
     */
    async render() {
        try {
            const user = this.app.state.user;
            const characters = this.app.state.characters;
            const sessions = this.app.state.sessions;
            
            // Calculate dashboard statistics
            const stats = this.calculateDashboardStats(characters, sessions);
            
            // Render dashboard HTML
            const html = this.generateDashboardHTML(user, characters, sessions, stats);
            
            return html;
            
        } catch (error) {
            console.error('Dashboard render error:', error);
            return '<div class="card"><h2>Error</h2><p>Failed to load dashboard.</p></div>';
        }
    }
    
    /**
     * Calculate dashboard statistics
     */
    calculateDashboardStats(characters, sessions) {
        const now = new Date();
        const stats = {
            totalCharacters: characters.length,
            totalSessions: sessions.length,
            upcomingSessions: 0,
            activeCharacters: 0,
            recentActivity: 0
        };
        
        // Count upcoming sessions (next 7 days)
        const weekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        sessions.forEach(session => {
            const sessionDate = new Date(session.session_datetime);
            if (sessionDate > now && sessionDate <= weekFromNow && session.status === 'scheduled') {
                stats.upcomingSessions++;
            }
        });
        
        // Count active characters (HP > 0)
        characters.forEach(character => {
            if (character.current_hp > 0) {
                stats.activeCharacters++;
            }
        });
        
        // Count recent activity (characters updated in last 7 days)
        characters.forEach(character => {
            const updatedDate = new Date(character.updated_at);
            const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            if (updatedDate > weekAgo) {
                stats.recentActivity++;
            }
        });
        
        return stats;
    }
    
    /**
     * Generate dashboard HTML
     */
    generateDashboardHTML(user, characters, sessions, stats) {
        return `<div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>Welcome back, ${user.username}!</h1>
                    <p>Manage your BECMI D&D characters and sessions</p>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.totalCharacters}</h3>
                            <p>Characters</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.totalSessions}</h3>
                            <p>Total Sessions</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.upcomingSessions}</h3>
                            <p>Upcoming Sessions</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-heart"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.activeCharacters}</h3>
                            <p>Active Characters</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Recent Characters</h3>
                            <a href="#" data-view="characters" class="nav-link">View All</a>
                        </div>
                        <div class="card-content">
                            ${this.renderRecentCharacters(characters)}
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Upcoming Sessions</h3>
                            <a href="#" data-view="sessions" class="nav-link">View All</a>
                        </div>
                        <div class="card-content">
                            ${this.renderUpcomingSessions(sessions)}
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Quick Actions</h3>
                        </div>
                        <div class="card-content">
                            ${this.renderQuickActions()}
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Character Status</h3>
                        </div>
                        <div class="card-content">
                            ${this.renderCharacterStatus(characters)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render recent characters section
     */
    renderRecentCharacters(characters) {
        if (characters.length === 0) {
            return `<div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No characters yet</p>
                    <button class="btn btn-primary"id="create-character-btn">Create Character</button>
                </div>
            `;
        }
        
        const recentCharacters = characters.slice(0, 3);
        
        return `<div class="character-list">
                ${recentCharacters.map(character => `<div class="character-item"data-character-id="${character.character_id}">
                        <div class="character-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="character-info">
                            <h4>${character.character_name}</h4>
                            <p>Level ${character.level} ${character.class}</p>
                            <div class="character-hp">
                                <div class="hp-bar">
                                    <div class="hp-fill"style="width: ${character.hp_percentage}%"></div>
                                </div>
                                <span>${character.current_hp}/${character.max_hp} HP</span>
                            </div>
                        </div>
                        <div class="character-actions">
                            <button class="btn btn-sm btn-secondary"data-action="view-character"data-character-id="${character.character_id}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render upcoming sessions section
     */
    renderUpcomingSessions(sessions) {
        const now = new Date();
        const upcomingSessions = sessions.filter(session => {
            const sessionDate = new Date(session.session_datetime);
            return sessionDate > now && session.status === 'scheduled';
        }).slice(0, 3);
        
        if (upcomingSessions.length === 0) {
            return `<div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <p>No upcoming sessions</p>
                    <button class="btn btn-primary"id="create-session-btn">Create Session</button>
                </div>
            `;
        }
        
        return `<div class="session-list">
                ${upcomingSessions.map(session => `<div class="session-item"data-session-id="${session.session_id}">
                        <div class="session-date">
                            <div class="date-day">${new Date(session.session_datetime).getDate()}</div>
                            <div class="date-month">${new Date(session.session_datetime).toLocaleDateString('en', { month: 'short'})}</div>
                        </div>
                        <div class="session-info">
                            <h4>${session.session_title}</h4>
                            <p>${new Date(session.session_datetime).toLocaleDateString('en', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'})}</p>
                        </div>
                        <div class="session-actions">
                            <button class="btn btn-sm btn-secondary"data-action="view-session"data-session-id="${session.session_id}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render quick actions section
     */
    renderQuickActions() {
        return `<div class="quick-actions">
                <button class="btn btn-primary btn-block"id="create-character-btn">
                    <i class="fas fa-user-plus"></i>
                    Create Character
                </button>
                <button class="btn btn-secondary btn-block"id="create-session-btn">
                    <i class="fas fa-calendar-plus"></i>
                    Create Session
                </button>
                <button class="btn btn-info btn-block"data-view="calendar">
                    <i class="fas fa-calendar-alt"></i>
                    View Calendar
                </button>
            </div>
        `;
    }
    
    /**
     * Render character status section
     */
    renderCharacterStatus(characters) {
        if (characters.length === 0) {
            return '<p class="text-muted">No characters to display</p>';
        }
        
        const statusCounts = {
            healthy: 0,
            wounded: 0,
            critical: 0,
            unconscious: 0
        };
        
        characters.forEach(character => {
            const hpPercentage = character.hp_percentage;
            if (hpPercentage >= 75) {
                statusCounts.healthy++;
            } else if (hpPercentage >= 25) {
                statusCounts.wounded++;
            } else if (hpPercentage > 0) {
                statusCounts.critical++;
            } else {
                statusCounts.unconscious++;
            }
        });
        
        return `<div class="status-grid">
                <div class="status-item healthy">
                    <i class="fas fa-heart"></i>
                    <span>${statusCounts.healthy} Healthy</span>
                </div>
                <div class="status-item wounded">
                    <i class="fas fa-heart-broken"></i>
                    <span>${statusCounts.wounded} Wounded</span>
                </div>
                <div class="status-item critical">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${statusCounts.critical} Critical</span>
                </div>
                <div class="status-item unconscious">
                    <i class="fas fa-skull"></i>
                    <span>${statusCounts.unconscious} Unconscious</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup dashboard event handlers
     */
    setupEventHandlers() {
        // Character creation button
        $(document).on('click', '#create-character-btn', (e) => {
            e.preventDefault();
            if (this.app.modules.characterCreation) {
                this.app.modules.characterCreation.showModal();
            } else {
                this.app.showError('Character creation module not available');
            }
        });
        
        // Session creation button
        $(document).on('click', '#create-session-btn', (e) => {
            e.preventDefault();
            if (this.app.modules.sessionManagement) {
                this.app.modules.sessionManagement.showCreationModal();
            } else {
                this.app.showError('Session management module not available');
            }
        });
        
        // View character button
        $(document).on('click', '[data-action="view-character"]', (e) => {
            e.preventDefault();
            const characterId = $(e.currentTarget).data('character-id');
            if (this.app.modules.characterSheet) {
                this.app.modules.characterSheet.loadCharacter(characterId);
                this.app.navigateToView('characters');
            } else {
                this.app.showError('Character sheet module not available');
            }
        });
        
        // View session button
        $(document).on('click', '[data-action="view-session"]', (e) => {
            e.preventDefault();
            const sessionId = $(e.currentTarget).data('session-id');
            if (this.app.modules.sessionManagement) {
                this.app.modules.sessionManagement.loadSession(sessionId);
                this.app.navigateToView('sessions');
            } else {
                this.app.showError('Session management module not available');
            }
        });
    }
    
    /**
     * Initialize dashboard module
     */
    init() {
        this.setupEventHandlers();
        console.log('Dashboard Module initialized');
    }
}

// Export to window for use in app.js
window.DashboardModule = DashboardModule;
