/**
 * BECMI D&D Character Manager - Main Application Controller
 * 
 * This is the central application controller that manages the SPA lifecycle,
 * routing, and coordination between modules.
 */

class BECMIApp {
    constructor() {
        this.currentView = null;
        this.isInitialized = false;
        this.modules = {};
        this.eventBus = new EventBus();
        
        // Application state
        this.state = {
            user: null,
            characters: [],
            sessions: [],
            totalCharacters: 0,
            totalSessions: 0,
            currentCharacter: null,
            currentSession: null,
            csrfToken: null
        };
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing BECMI Manager...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize core modules
            await this.initializeModules();
            
            // Check authentication status
            let authSuccess = false;
            try {
                await this.checkAuthentication();
                authSuccess = true;
            } catch (authError) {
                // Authentication failed - login modal is already shown by checkAuthentication()
                console.error('Authentication check failed:', authError);
                // Continue to setup event listeners even if auth failed
                // User can still interact with login modal
            }
            
            // Setup event listeners (always, even if auth failed)
            this.setupEventListeners();
            
            // Initialize the application
            this.isInitialized = true;
            
            // Always hide loading screen - either show dashboard or login modal
            this.hideLoadingScreen();
            
            if (authSuccess) {
                console.log('BECMI Character initialized successfully');
            } else {
                console.log('BECMI Character initialized - waiting for login');
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.hideLoadingScreen();
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    /**
     * Initialize all application modules
     */
    async initializeModules() {
        console.log('Initializing modules...');
        
        // Initialize core modules
        this.modules.apiClient = new APIClient();
        this.modules.stateManager = new StateManager(this.state);
        this.modules.rulesEngine = new BECMIRulesEngine();
        this.modules.notificationManager = new NotificationManager(this);
        this.modules.errorHandler = new ErrorHandler(this);
        this.modules.offlineDetector = new OfflineDetector(this);
        
        // Initialize feature modules
        this.modules.auth = new AuthModule(this);
        this.modules.dashboard = new DashboardModule(this);
        this.modules.characterSheet = new CharacterSheetModule(this);
        this.modules.equipment = new EquipmentModule(this);
        this.modules.characterCreation = new CharacterCreationModule(this);
        this.modules.sessionManagement = new SessionManagementModule(this);
        this.modules.dmDashboard = new DMDashboardModule(this);
        this.modules.levelUpWizard = new LevelUpWizard(this);
        this.modules.monsterBrowser = new MonsterBrowserModule(this);
        this.modules.calendar = new CalendarModule(this);
        this.modules.notifications = new NotificationsModule(this);
        this.modules.hexMapEditor = new HexMapEditorModule(this);
        this.modules.hexMapPlay = new HexMapPlayModule(this);
        this.modules.campaignManagement = new CampaignManagementModule(this);
        this.modules.forum = new ForumModule(this);
        this.modules.forumThread = new ForumThreadModule(this);
        this.modules.forumModeration = new ForumModerationModule(this);
        
        // Initialize session map scratchpad module if available
        if (typeof SessionMapScratchpadModule !== 'undefined') {
            this.modules.sessionMapScratchpad = new SessionMapScratchpadModule(this);
        }
        
        // Initialize all modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.init === 'function') {
                module.init();
            }
        });
        
        console.log('All modules initialized');
    }
    
    /**
     * Check if user is authenticated
     */
    async checkAuthentication() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                // No token - show login but don't throw error
                this.showLoginModal();
                return;
            }
            
            // Verify token with server (with explicit timeout handling)
            let response;
            try {
                response = await Promise.race([
                    this.modules.apiClient.get('/api/auth/verify.php'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Authentication request timeout after 10 seconds')), 10000)
                    )
                ]);
            } catch (fetchError) {
                console.error('Authentication request failed:', fetchError);
                // If request fails, clear token and show login
                localStorage.removeItem('auth_token');
                this.showLoginModal();
                throw fetchError; // Re-throw to let init() handle it
            }
            
            if (response && response.status === 'success') {
                const payload = response.data || {};
                const user = payload.user || response.user || null;
                const csrfToken = payload.csrf_token || response.csrf_token || null;

                this.state.user = user;
                this.state.csrfToken = csrfToken;

                this.updateUserInterface();
                await this.loadUserData();
                
                // Navigate to dashboard after loading data
                this.navigateToView('dashboard');
            } else {
                // Invalid response - clear token and show login
                localStorage.removeItem('auth_token');
                this.showLoginModal();
                throw new Error('Authentication verification failed');
            }
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            // Clear token if it exists
            if (localStorage.getItem('auth_token')) {
                localStorage.removeItem('auth_token');
            }
            // Show login modal
            this.showLoginModal();
            // Re-throw to let init() handle loading screen
            throw error;
        }
    }
    
    /**
     * Load user data after authentication
     */
    async loadUserData() {
        try {
            console.log('Loading user data...');
            
            // Load characters and sessions in parallel
            const [charactersResponse, sessionsResponse] = await Promise.all([
                this.modules.apiClient.get('/api/character/list.php'),
                this.modules.apiClient.get('/api/session/user.php')
            ]);
            
            const characterPayload = charactersResponse.data || charactersResponse;
            const sessionPayload = sessionsResponse.data || sessionsResponse;

            if (charactersResponse.status === 'success') {
                const characters = Array.isArray(characterPayload.characters) ? characterPayload.characters : (charactersResponse.characters || []);
                this.state.characters = characters;
                if (typeof characterPayload.total_count !== 'undefined') {
                    this.state.totalCharacters = characterPayload.total_count;
                } else if (typeof charactersResponse.total_count !== 'undefined') {
                    this.state.totalCharacters = charactersResponse.total_count;
                }
            } else {
                throw new Error(charactersResponse.message || 'Failed to load characters');
            }

            if (sessionsResponse.status === 'success') {
                const sessions = Array.isArray(sessionPayload.sessions) ? sessionPayload.sessions : (sessionsResponse.sessions || []);
                this.state.sessions = sessions;
                if (typeof sessionPayload.total_count !== 'undefined') {
                    this.state.totalSessions = sessionPayload.total_count;
                } else if (typeof sessionsResponse.total_count !== 'undefined') {
                    this.state.totalSessions = sessionsResponse.total_count;
                }
            } else {
                throw new Error(sessionsResponse.message || 'Failed to load sessions');
            }

            // Update state manager
            this.modules.stateManager.updateState(this.state);

            console.log('User data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.showError('Failed to load user data. Please refresh the page.');
            throw error; // Re-throw to be caught by init()
        }
    }
    
    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Navigation
        $(document).on('click', '.nav-link', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const view = $(e.target).data('view') || $(e.target).closest('.nav-link').data('view');
            if (view) {
                this.navigateToView(view);
            } else {
                // Check if it's a dropdown toggle
                const $dropdown = $(e.target).closest('.nav-dropdown');
                if ($dropdown.length) {
                    $dropdown.find('.dropdown-menu').toggle();
                } else {
                    console.warn('Nav link clicked but no view data found:', e.target);
                }
            }
        });
        
        // Close dropdowns when clicking outside
        $(document).on('click', (e) => {
            if (!$(e.target).closest('.nav-dropdown').length) {
                $('.nav-dropdown .dropdown-menu').hide();
            }
        });
        
        // User menu
        $(document).on('click', '.user-info', (e) => {
            e.stopPropagation();
            $('.user-dropdown').toggle();
        });
        
        // Logout
        $(document).on('click', '#logout-btn', (e) => {
            e.preventDefault();
            this.logout();
        });
        
        // Edit profile link
        $(document).on('click', '#edit-profile-link', (e) => {
            e.preventDefault();
            e.stopPropagation();
            $('.user-dropdown').hide();
            this.showEditProfileModal();
        });
        
        // Moderation panel link
        $(document).on('click', '#moderation-panel-link', (e) => {
            e.preventDefault();
            e.stopPropagation();
            $('.user-dropdown').hide();
            this.navigateToView('forum-moderation');
        });
        
        // Close dropdowns when clicking outside - but not when modals are open
        $(document).on('click', (e) => {
            // Don't close dropdowns if a modal is open
            if ($('.modal:visible').length > 0) {
                return;
            }
            
            if (!$(e.target).closest('.user-menu').length) {
                $('.user-dropdown').css('display', 'none');
            }
        });
        
        // Modal close handlers - only close if clicking on modal background, not content
        $(document).on('click', '.modal', (e) => {
            if (e.target === e.currentTarget) {
                // NEVER close login or register modals on background click - user must log in!
                if (e.currentTarget.id === 'login-modal' || e.currentTarget.id === 'register-modal') {
                    console.log('Preventing auth modal close on background click - user must authenticate');
                    return;
                }
                
                // Don't close character creation modal on background click - user could lose progress!
                if (e.currentTarget.id === 'character-creation-modal') {
                    console.log('Preventing character creation modal close on background click');
                    return;
                }
                
                // CRITICAL: Never close level-up wizard modal on background click - user could lose progress!
                if (e.currentTarget.id === 'levelUpWizardModal') {
                    console.log('Preventing level-up wizard modal close on background click - CRITICAL: user must use close button');
                    return;
                }
                
                // Only close if clicking on the modal background itself
                console.log('Closing modal:', e.currentTarget.id);
                $(e.currentTarget).removeClass('show');
            }
        });
        
        // Prevent modal content clicks from bubbling up (but allow file inputs to work)
        $(document).on('click', '.modal-content', (e) => {
            // Don't stop propagation for file inputs - they need to work
            const target = e.target;
            if (target.type === 'file' || 
                target.tagName === 'LABEL' || 
                target.closest('input[type="file"]') || 
                target.closest('label[for]')) {
                return;
            }
            e.stopPropagation();
        });
        
        // Note: Form submissions are handled by AuthModule
        
        console.log('Event listeners setup complete');
    }
    
    /**
     * Navigate to a specific view
     */
    navigateToView(viewName) {
        if (!viewName) {
            console.error('navigateToView called with no view name');
            return;
        }
        
        // SECURITY: Never navigate without authentication (except to login view)
        if (viewName !== 'login' && !this.state.user) {
            console.warn('Attempted to navigate without authentication - showing login modal');
            this.showLoginModal();
            return;
        }
        
        console.log(`Navigating to view: ${viewName}`);
        
        // Cleanup current view before navigating away
        this.cleanupCurrentView();
        
        // Update active nav link
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-view="${viewName}"]`).addClass('active');
        
        // Store current view
        this.currentView = viewName;
        
        // Load view content
        this.loadViewContent(viewName);
    }
    
    /**
     * Cleanup current view resources
     */
    cleanupCurrentView() {
        // Cleanup DM Dashboard auto-refresh if active
        if (this.modules.dmDashboard && this.modules.dmDashboard.cleanup) {
            this.modules.dmDashboard.cleanup();
        }
        
        // Cleanup other modules that might have resources
        if (this.modules.sessionManagement && this.modules.sessionManagement.cleanup) {
            this.modules.sessionManagement.cleanup();
        }
        
        if (this.modules.equipment && this.modules.equipment.cleanup) {
            this.modules.equipment.cleanup();
        }
        
        // Cleanup hex map play module interval if active
        if (this.modules.hexMapPlay && this.modules.hexMapPlay.cleanup) {
            this.modules.hexMapPlay.cleanup();
        }
        
        // Emit cleanup event
        this.eventBus.emit('viewCleanup', { view: this.currentView });
    }
    
    /**
     * Navigate to a route (supports URL parameters)
     * Can be called from modules: app.navigate('/hex-map-editor/123')
     */
    async navigate(route) {
        // Parse route like "/hex-map-editor/123" or "/hex-map-play/123"
        const parts = route.split('/').filter(p => p);
        
        if (parts.length === 0) {
            this.navigateToView('dashboard');
            return;
        }
        
        const viewName = parts[0];
        const param = parts[1] ? parseInt(parts[1]) : null;
        
        // Cleanup current view before navigating
        this.cleanupCurrentView();
        
        const contentArea = $('#content-area');
        if (contentArea.length === 0) {
            console.error('Content area not found!');
            return;
        }
        
        contentArea.html('<div class="loading-spinner"><i class="fas fa-dice-d20 fa-spin"></i><p>Loading...</p></div>');
        
        // Handle hex map routes
        if (viewName === 'hex-map-editor') {
            try {
                const content = await this.modules.hexMapEditor.renderEditor(param);
                contentArea.html(content);
                this.modules.hexMapEditor.setupEventListeners();
                this.currentView = 'hex-map-editor';
                this.eventBus.emit('viewLoaded', { view: 'hex-map-editor' });
            } catch (error) {
                console.error('Failed to load hex map editor:', error);
                contentArea.html('<div class="alert alert-danger">Error loading hex map editor: ' + error.message + '</div>');
            }
            return;
        }
        
        if (viewName === 'hex-map-play') {
            if (!param) {
                this.showError('Map ID required for play mode');
                return;
            }
            try {
                const content = await this.modules.hexMapPlay.renderPlayView(param);
                contentArea.html(content);
                this.modules.hexMapPlay.setupEventListeners();
                this.currentView = 'hex-map-play';
                this.eventBus.emit('viewLoaded', { view: 'hex-map-play' });
            } catch (error) {
                console.error('Failed to load hex map play:', error);
                contentArea.html('<div class="alert alert-danger">Error loading hex map play: ' + error.message + '</div>');
            }
            return;
        }
        
        // Fall back to standard view navigation
        this.navigateToView(viewName);
    }
    
    /**
     * Load content for a specific view
     */
    async loadViewContent(viewName) {
        if (!viewName) {
            console.error('loadViewContent called with no view name');
            return;
        }
        
        try {
            console.log('Loading view content:', viewName);
            const contentArea = $('#content-area');
            
            if (contentArea.length === 0) {
                console.error('Content area not found!');
                return;
            }
            
            contentArea.html('<div class="loading-spinner"><i class="fas fa-dice-d20 fa-spin"></i><p>Loading...</p></div>');
            
            let content = '';
            
            switch (viewName) {
                case 'dashboard':
                    content = await this.modules.dashboard.render();
                    break;
                case 'characters':
                    content = await this.modules.characterSheet.renderCharacterList();
                    break;
                case 'equipment':
                    content = await this.modules.equipment.render();
                    break;
                case 'sessions':
                    content = await this.modules.sessionManagement.render();
                    break;
                case 'calendar':
                    content = await this.modules.calendar.render();
                    this.modules.calendar.setupEventHandlers();
                    break;
                case 'campaigns':
                    content = await this.modules.campaignManagement.render();
                    this.modules.campaignManagement.setupEventListeners();
                    break;
                case 'hex-maps':
                    // Show hex map list/editor
                    content = await this.modules.hexMapEditor.renderEditor();
                    this.modules.hexMapEditor.setupEventListeners();
                    break;
                case 'forum':
                    content = await this.modules.forum.render();
                    break;
                case 'forum-moderation':
                    content = await this.modules.forumModeration.render();
                    break;
                default:
                    content = '<div class="card"><h2>View not found</h2><p>The requested view could not be loaded.</p></div>';
            }
            
            contentArea.html(content);
            
            // Trigger view-specific initialization
            this.eventBus.emit('viewLoaded', { view: viewName });
            
        } catch (error) {
            console.error(`Failed to load view ${viewName}:`, error);
            $('#content-area').html('<div class="card"><h2>Error</h2><p>Failed to load the requested view.</p></div>');
        }
    }
    
    /**
     * Update user interface after authentication
     */
    updateUserInterface() {
        if (this.state.user) {
            $('#user-name').text(this.state.user.username);
            $('#app').addClass('loaded');
            $('.modal').removeClass('show');
            
            // Check if user is moderator and show/hide moderation panel link
            this.checkModeratorStatus();
        }
    }
    
    /**
     * Check if user is moderator and show/hide moderation panel link
     */
    async checkModeratorStatus() {
        // Use cached moderator status from user object (set during login/verification)
        // No need to make API call - we already have this information
        const isModerator = this.state.user && this.state.user.is_moderator === true;
        if (isModerator) {
            $('#moderation-panel-link').show();
        } else {
            $('#moderation-panel-link').hide();
        }
    }
    
    /**
     * Show login modal
     */
    showLoginModal() {
        $('#app').removeClass('loaded');
        $('#login-modal').addClass('show');
    }
    
    /**
     * Show edit profile modal
     */
    async showEditProfileModal() {
        try {
            // Load current profile
            const response = await this.modules.apiClient.get('/api/user/profile.php');
            
            if (response.status !== 'success') {
                throw new Error(response.message || 'Failed to load profile');
            }
            
            const profile = response.data.profile;
            
            // Create modal HTML
            const modalHtml = `
                <div class="modal show" id="edit-profile-modal" style="display: flex;">
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h2><i class="fas fa-user-edit"></i> Edit Profile</h2>
                            <button type="button" class="close" id="close-edit-profile-modal">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal__inner">
                            <form id="edit-profile-form">
                                <div class="form-group">
                                    <label for="profile-username">Username *</label>
                                    <input type="text" id="profile-username" name="username" 
                                        value="${this.escapeHtml(profile.username || '')}" 
                                        required maxlength="50">
                                </div>
                                
                                <div class="form-group">
                                    <label for="profile-email">Email *</label>
                                    <input type="email" id="profile-email" name="email" 
                                        value="${this.escapeHtml(profile.email || '')}" 
                                        required maxlength="100">
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="profile-first-name">First Name</label>
                                        <input type="text" id="profile-first-name" name="first_name" 
                                            value="${this.escapeHtml(profile.first_name || '')}" 
                                            maxlength="50">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="profile-last-name">Last Name</label>
                                        <input type="text" id="profile-last-name" name="last_name" 
                                            value="${this.escapeHtml(profile.last_name || '')}" 
                                            maxlength="50">
                                    </div>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Save Changes
                                    </button>
                                    <button type="button" class="btn btn-secondary" id="cancel-edit-profile-modal">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            $('#edit-profile-modal').remove();
            
            // Add modal to page
            $('body').append(modalHtml);
            
            // Setup event handlers
            $('#close-edit-profile-modal, #cancel-edit-profile-modal').on('click', () => {
                $('#edit-profile-modal').remove();
            });
            
            $('#edit-profile-form').on('submit', async (e) => {
                e.preventDefault();
                await this.handleProfileUpdate();
            });
            
            // Close on background click
            $('#edit-profile-modal').on('click', (e) => {
                if (e.target === e.currentTarget) {
                    $('#edit-profile-modal').remove();
                }
            });
            
        } catch (error) {
            console.error('Failed to show edit profile modal:', error);
            this.showError('Failed to load profile: ' + error.message);
        }
    }
    
    /**
     * Handle profile form submission
     */
    async handleProfileUpdate() {
        try {
            const username = $('#profile-username').val().trim();
            const email = $('#profile-email').val().trim();
            const firstName = $('#profile-first-name').val().trim();
            const lastName = $('#profile-last-name').val().trim();
            
            if (!username) {
                this.showError('Username is required');
                return;
            }
            
            if (!email) {
                this.showError('Email is required');
                return;
            }
            
            const response = await this.modules.apiClient.put('/api/user/profile.php', {
                username: username,
                email: email,
                first_name: firstName || null,
                last_name: lastName || null
            });
            
            if (response.status === 'success') {
                this.showSuccess('Profile updated successfully');
                
                // Update user state
                this.state.user = {
                    ...this.state.user,
                    username: response.data.profile.username,
                    email: response.data.profile.email,
                    first_name: response.data.profile.first_name,
                    last_name: response.data.profile.last_name
                };
                
                // Update UI
                this.updateUserInterface();
                
                // Close modal
                $('#edit-profile-modal').remove();
            } else {
                throw new Error(response.message || 'Failed to update profile');
            }
            
        } catch (error) {
            console.error('Profile update error:', error);
            this.showError('Failed to update profile: ' + error.message);
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     * @deprecated Use global escapeHtml() function from utils.js instead
     */
    escapeHtml(text) {
        return escapeHtml(text);
    }
    
    /**
     * Show main application (only if user is authenticated)
     */
    showMainApp() {
        // SECURITY: Never show app without authentication
        if (!this.state.user) {
            console.warn('Attempted to show main app without authentication - showing login modal instead');
            this.showLoginModal();
            return;
        }
        
        $('#app').addClass('loaded');
        $('.modal').removeClass('show');
    }
    
    /**
     * Show loading screen
     */
    showLoadingScreen() {
        $('#loading-screen').css('display', 'flex');
    }
    
    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        $('#loading-screen').css('display', 'none');
    }
    
    /**
     * Show error message
     */
    showError(message) {
        if (this.modules.notifications) {
            this.modules.notifications.show(message, 'error');
        } else {
            console.error('Error (notifications not available):', message);
        }
    }
    
    /**
     * Show success message
     */
    showSuccess(message) {
        if (this.modules.notifications) {
            this.modules.notifications.show(message, 'success');
        } else {
            console.log('Success (notifications not available):', message);
        }
    }
    
    /**
     * Logout user
     */
    async logout() {
        try {
            await this.modules.apiClient.post('/api/auth/logout.php');
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            localStorage.removeItem('auth_token');
            this.state.user = null;
            this.state.csrfToken = null;
            this.showLoginModal();
        }
    }
    
    /**
     * Get current application state
     */
    getState() {
        return this.state;
    }
    
    /**
     * Update application state
     */
    updateState(newState) {
        this.state = { ...this.state, ...newState };
        this.modules.stateManager.updateState(this.state);
    }
    
    /**
     * Get a module by name
     */
    getModule(moduleName) {
        return this.modules[moduleName];
    }
}

// Export to window for use in other scripts
window.BECMIApp = BECMIApp;

// Application initialization is handled in main.js
