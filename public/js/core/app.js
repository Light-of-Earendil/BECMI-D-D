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
            console.log('Initializing BECMI Character Manager...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize core modules
            await this.initializeModules();
            
            // Check authentication status
            await this.checkAuthentication();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize the application
            this.isInitialized = true;
            this.hideLoadingScreen();
            
            console.log('BECMI Character Manager initialized successfully');
            
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
        
        // Initialize feature modules
        this.modules.auth = new AuthModule(this);
        this.modules.dashboard = new DashboardModule(this);
        this.modules.characterSheet = new CharacterSheetModule(this);
        this.modules.characterCreation = new CharacterCreationModule(this);
        this.modules.sessionManagement = new SessionManagementModule(this);
        this.modules.calendar = new CalendarModule(this);
        this.modules.notifications = new NotificationsModule(this);
        
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
                this.showLoginModal();
                return;
            }
            
            // Verify token with server
            const response = await this.modules.apiClient.get('/api/auth/verify.php');
            
            if (response.status === 'success') {
                const payload = response.data || {};
                const user = payload.user || response.user || null;
                const csrfToken = payload.csrf_token || response.csrf_token || null;

                this.state.user = user;
                this.state.csrfToken = csrfToken;

                this.updateUserInterface();
                await this.loadUserData();
            } else {
                localStorage.removeItem('auth_token');
                this.showLoginModal();
            }
            
        } catch (error) {
            console.error('Authentication check failed:', error);
            localStorage.removeItem('auth_token');
            this.showLoginModal();
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
            const view = $(e.target).data('view');
            if (view) {
                this.navigateToView(view);
            } else {
                console.warn('Nav link clicked but no view data found:', e.target);
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
        
        // Close dropdowns when clicking outside - but not when modals are open
        $(document).on('click', (e) => {
            // Don't close dropdowns if a modal is open
            if ($('.modal:visible').length > 0) {
                return;
            }
            
            if (!$(e.target).closest('.user-menu').length) {
                $('.user-dropdown').hide();
            }
        });
        
        // Modal close handlers - only close if clicking on modal background, not content
        $(document).on('click', '.modal', (e) => {
            if (e.target === e.currentTarget) {
                // Only close if clicking on the modal background itself
                console.log('Closing modal:', e.currentTarget.id);
                $(e.currentTarget).hide();
                
                // If closing login modal and user is not authenticated, show main app
                if (e.currentTarget.id === 'login-modal' && !this.state.user) {
                    this.showMainApp();
                }
            }
        });
        
        // Prevent modal content clicks from bubbling up
        $(document).on('click', '.modal-content', (e) => {
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
        
        console.log(`Navigating to view: ${viewName}`);
        
        // Update active nav link
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-view="${viewName}"]`).addClass('active');
        
        // Store current view
        this.currentView = viewName;
        
        // Load view content
        this.loadViewContent(viewName);
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
                case 'sessions':
                    content = await this.modules.sessionManagement.render();
                    break;
                case 'calendar':
                    content = await this.modules.calendar.render();
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
            $('#app').show();
            $('.modal').hide();
        }
    }
    
    /**
     * Show login modal
     */
    showLoginModal() {
        $('#app').hide();
        $('#login-modal').show();
    }
    
    /**
     * Show main application
     */
    showMainApp() {
        $('#app').show();
        $('.modal').hide();
    }
    
    /**
     * Show loading screen
     */
    showLoadingScreen() {
        $('#loading-screen').show();
    }
    
    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        $('#loading-screen').hide();
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
