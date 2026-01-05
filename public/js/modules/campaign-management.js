/**
 * BECMI D&D Character Manager - Campaign Management Module
 * 
 * Handles campaign creation, management, and viewing.
 */

class CampaignManagementModule {
    constructor(app) {
        this.app = app;
        this.apiClient = app.modules.apiClient;
        this.campaigns = [];
        
        console.log('Campaign Management Module initialized');
    }
    
    /**
     * Initialize the module
     */
    init() {
        // Module initialization if needed
    }
    
    /**
     * Render campaign management view
     */
    async render() {
        try {
            await this.loadCampaigns();
            
            if (this.campaigns.length === 0) {
                return this.renderEmptyCampaignList();
            }
            
            return this.renderCampaignList();
            
        } catch (error) {
            console.error('Campaign management render error:', error);
            return '<div class="card"><h2>Error</h2><p>Failed to load campaign management.</p></div>';
        }
    }
    
    /**
     * Load campaigns from API
     */
    async loadCampaigns() {
        try {
            const response = await this.apiClient.get('/api/campaigns/list.php');
            if (response.status === 'success') {
                this.campaigns = response.data.campaigns || [];
            } else {
                throw new Error(response.message || 'Failed to load campaigns');
            }
        } catch (error) {
            console.error('Failed to load campaigns:', error);
            this.app.showError('Failed to load campaigns: ' + error.message);
            this.campaigns = [];
        }
    }
    
    /**
     * Render empty campaign list
     */
    renderEmptyCampaignList() {
        return `<div class="campaigns-container">
                <div class="campaigns-header">
                    <h1><i class="fas fa-book"></i> Campaigns</h1>
                    <button class="btn btn-primary" id="create-campaign-btn">
                        <i class="fas fa-plus"></i>
                        Create Campaign
                    </button>
                </div>
                
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <h2>No Campaigns Yet</h2>
                    <p>Create your first campaign to organize your game sessions!</p>
                    <button class="btn btn-primary btn-lg" id="create-campaign-btn-empty">
                        <i class="fas fa-plus"></i>
                        Create Campaign
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render campaign list
     */
    renderCampaignList() {
        return `<div class="campaigns-container">
                <div class="campaigns-header">
                    <h1><i class="fas fa-book"></i> Campaigns</h1>
                    <button class="btn btn-primary" id="create-campaign-btn">
                        <i class="fas fa-plus"></i>
                        Create Campaign
                    </button>
                </div>
                
                <div class="campaigns-grid">
                    ${this.campaigns.map(campaign => this.renderCampaignCard(campaign)).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render individual campaign card
     */
    renderCampaignCard(campaign) {
        return `<div class="campaign-card" data-campaign-id="${campaign.campaign_id}">
                <div class="campaign-header">
                    <h3>${this.escapeHtml(campaign.campaign_name)}</h3>
                </div>
                
                <div class="campaign-details">
                    <div class="campaign-description">
                        <p>${this.escapeHtml(campaign.campaign_description || 'No description provided.')}</p>
                    </div>
                    
                    <div class="campaign-stats">
                        <div class="stat-item">
                            <i class="fas fa-calendar"></i>
                            <span>${campaign.session_count || 0} session${campaign.session_count !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-user"></i>
                            <span>DM: ${this.escapeHtml(campaign.dm_username || 'Unknown')}</span>
                        </div>
                        ${campaign.game_time_seconds > 0 ? `
                        <div class="stat-item">
                            <i class="fas fa-clock"></i>
                            <span>Time Elapsed: ${this.formatGameTimeFromSeconds(campaign.game_time_seconds)}</span>
                        </div>
                        ` : ''}
                        ${campaign.current_game_datetime ? `
                        <div class="stat-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Game Date: ${this.formatGameDateTimeShort(campaign.current_game_datetime)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="campaign-actions">
                    <button class="btn btn-sm btn-primary" data-action="view-campaign" data-campaign-id="${campaign.campaign_id}">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                    <button class="btn btn-sm btn-secondary" data-action="edit-campaign" data-campaign-id="${campaign.campaign_id}">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete-campaign" data-campaign-id="${campaign.campaign_id}">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create campaign buttons
        $(document).off('click', '#create-campaign-btn, #create-campaign-btn-empty').on('click', '#create-campaign-btn, #create-campaign-btn-empty', () => {
            this.showCreationModal();
        });
        
        // Campaign actions
        $(document).off('click', '[data-action="view-campaign"]').on('click', '[data-action="view-campaign"]', (e) => {
            const campaignId = $(e.currentTarget).data('campaign-id');
            this.viewCampaign(campaignId);
        });
        
        $(document).off('click', '[data-action="edit-campaign"]').on('click', '[data-action="edit-campaign"]', (e) => {
            const campaignId = $(e.currentTarget).data('campaign-id');
            this.editCampaign(campaignId);
        });
        
        $(document).off('click', '[data-action="delete-campaign"]').on('click', '[data-action="delete-campaign"]', (e) => {
            const campaignId = $(e.currentTarget).data('campaign-id');
            this.deleteCampaign(campaignId);
        });
        
        // Modal close handlers
        $(document).off('click', '.modal-close, .modal-backdrop').on('click', '.modal-close, .modal-backdrop', (e) => {
            if ($(e.target).hasClass('modal-backdrop') || $(e.target).hasClass('modal-close')) {
                this.hideCreationModal();
                this.hideEditModal();
            }
        });
    }
    
    /**
     * Show campaign creation modal
     */
    showCreationModal() {
        const modal = $(`
            <div class="modal modal-backdrop" id="campaign-creation-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Create Campaign</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body" id="campaign-creation-content">
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        this.renderCampaignCreationForm();
        modal.show();
    }
    
    /**
     * Hide campaign creation modal
     */
    hideCreationModal() {
        $('#campaign-creation-modal').remove();
    }
    
    /**
     * Show campaign edit modal
     */
    showEditModal(campaign) {
        const modal = $(`
            <div class="modal modal-backdrop" id="campaign-edit-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Edit Campaign</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body" id="campaign-edit-content">
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        this.renderCampaignEditForm(campaign);
        modal.show();
    }
    
    /**
     * Hide campaign edit modal
     */
    hideEditModal() {
        $('#campaign-edit-modal').remove();
    }
    
    /**
     * Render campaign creation form
     */
    renderCampaignCreationForm() {
        const content = $('#campaign-creation-content');
        
        content.html(`<form id="campaign-creation-form" class="campaign-form">
                <div class="form-group">
                    <label for="campaign-name">Campaign Name:</label>
                    <input type="text" id="campaign-name" name="campaign_name" required minlength="3" maxlength="100">
                </div>
                
                <div class="form-group">
                    <label for="campaign-description">Description:</label>
                    <textarea id="campaign-description" name="campaign_description" rows="4" placeholder="Describe your campaign..."></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-campaign-creation">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Campaign</button>
                </div>
            </form>
        `);
        
        $('#campaign-creation-form').off('submit').on('submit', (e) => {
            e.preventDefault();
            this.createCampaign();
        });
        
        $('#cancel-campaign-creation').off('click').on('click', () => {
            this.hideCreationModal();
        });
    }
    
    /**
     * Render campaign edit form
     */
    renderCampaignEditForm(campaign) {
        const content = $('#campaign-edit-content');
        
        content.html(`<form id="campaign-edit-form" class="campaign-form">
                <input type="hidden" id="edit-campaign-id" value="${campaign.campaign_id}">
                
                <div class="form-group">
                    <label for="edit-campaign-name">Campaign Name:</label>
                    <input type="text" id="edit-campaign-name" name="campaign_name" value="${this.escapeHtml(campaign.campaign_name)}" required minlength="3" maxlength="100">
                </div>
                
                <div class="form-group">
                    <label for="edit-campaign-description">Description:</label>
                    <textarea id="edit-campaign-description" name="campaign_description" rows="4" placeholder="Describe your campaign...">${this.escapeHtml(campaign.campaign_description || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="edit-campaign-start-datetime">Campaign Start Date/Time (in game world):</label>
                    <input type="datetime-local" id="edit-campaign-start-datetime" name="campaign_start_datetime" 
                           value="${this.formatGameTimeForInput(campaign.campaign_start_datetime)}"
                           step="1">
                    <small class="form-hint">The date and time when your campaign started in the game world (e.g., "Year 1, Day 1, 00:00:00")</small>
                </div>
                
                <div class="form-group">
                    <label>Time Since Campaign Start:</label>
                    <div class="game-time-display" id="game-time-display">
                        ${this.formatGameTimeFromSeconds(campaign.game_time_seconds || 0)}
                    </div>
                    <div class="form-row" style="margin-top: 0.5rem;">
                        <div class="form-group" style="flex: 1; margin-right: 0.5rem;">
                            <label for="add-days-input" style="font-size: 0.875rem;">Add Days:</label>
                            <input type="number" id="add-days-input" min="0" value="0" style="width: 100%;">
                        </div>
                        <div class="form-group" style="flex: 1; margin-right: 0.5rem;">
                            <label for="add-hours-input" style="font-size: 0.875rem;">Add Hours:</label>
                            <input type="number" id="add-hours-input" min="0" step="0.1" value="0" style="width: 100%;">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="add-minutes-input" style="font-size: 0.875rem;">Add Minutes:</label>
                            <input type="number" id="add-minutes-input" min="0" value="0" style="width: 100%;">
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" id="apply-time-addition-btn" style="margin-top: 0.5rem;">
                        <i class="fas fa-plus"></i> Add Time
                    </button>
                    <small class="form-hint">Time elapsed since campaign start. This advances automatically when players travel on hex maps.</small>
                </div>
                
                <div class="form-group" style="background: var(--parchment-200); padding: 0.75rem; border-radius: 4px; margin-top: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.5rem;">Current Game World Date/Time:</label>
                    <div id="current-game-datetime-display" style="font-size: 1.1rem; color: var(--wood-900);">
                        ${this.calculateCurrentGameDateTime(campaign.campaign_start_datetime, campaign.game_time_seconds || 0)}
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" id="cancel-campaign-edit">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        `);
        
        $('#campaign-edit-form').off('submit').on('submit', (e) => {
            e.preventDefault();
            this.updateCampaign(campaign.campaign_id);
        });
        
        $('#cancel-campaign-edit').off('click').on('click', () => {
            this.hideEditModal();
        });
        
        // Update current game datetime display when start datetime changes
        $('#edit-campaign-start-datetime, #add-days-input, #add-hours-input, #add-minutes-input').on('input change', () => {
            this.updateGameDateTimeDisplay();
        });
        
        // Apply time addition button
        $('#apply-time-addition-btn').off('click').on('click', () => {
            this.addTimeToCampaign();
        });
    }
    
    /**
     * Update the current game datetime display
     */
    updateGameDateTimeDisplay() {
        const startDatetime = $('#edit-campaign-start-datetime').val();
        const currentSeconds = this.getCurrentGameTimeSeconds();
        
        // Convert datetime-local to Y-m-d H:i:s format for calculation
        let startDatetimeFormatted = startDatetime;
        if (startDatetime && startDatetime.includes('T')) {
            const date = new Date(startDatetime);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                startDatetimeFormatted = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
        }
        
        const display = this.calculateCurrentGameDateTime(startDatetimeFormatted, currentSeconds);
        $('#current-game-datetime-display').html(display);
    }
    
    /**
     * Get current game time seconds from the display
     */
    getCurrentGameTimeSeconds() {
        // Get from stored campaign data
        const campaignId = parseInt($('#edit-campaign-id').val());
        const campaign = this.campaigns.find(c => c.campaign_id === campaignId);
        let baseSeconds = campaign ? (campaign.game_time_seconds || 0) : 0;
        
        // Add any pending time additions (not yet saved)
        // We'll track this in a data attribute on the form
        const pendingSeconds = parseInt($('#campaign-edit-form').data('pending-seconds') || 0);
        
        return baseSeconds + pendingSeconds;
    }
    
    /**
     * Add time to campaign
     */
    async addTimeToCampaign() {
        const campaignId = parseInt($('#edit-campaign-id').val());
        const days = parseInt($('#add-days-input').val()) || 0;
        const hours = parseFloat($('#add-hours-input').val()) || 0;
        const minutes = parseInt($('#add-minutes-input').val()) || 0;
        
        if (days === 0 && hours === 0 && minutes === 0) {
            this.app.showInfo('Please enter time to add');
            return;
        }
        
        try {
            const response = await this.apiClient.post('/api/campaigns/update-game-time.php', {
                campaign_id: campaignId,
                add_days: days,
                add_hours: hours,
                add_minutes: minutes
            });
            
            if (response.status === 'success') {
                // Clear input fields
                $('#add-days-input').val(0);
                $('#add-hours-input').val(0);
                $('#add-minutes-input').val(0);
                
                // Update stored campaign data
                const campaign = this.campaigns.find(c => c.campaign_id === campaignId);
                if (campaign) {
                    campaign.game_time_seconds = response.data.game_time_seconds;
                    campaign.campaign_start_datetime = response.data.campaign_start_datetime;
                    campaign.current_game_datetime = response.data.current_game_datetime;
                }
                
                // Clear pending seconds
                $('#campaign-edit-form').data('pending-seconds', 0);
                
                // Update displays
                this.updateGameDateTimeDisplay();
                this.updateGameTimeDisplay(response.data.game_time_seconds);
                
                this.app.showSuccess('Time added successfully!');
            } else {
                throw new Error(response.message || 'Failed to add time');
            }
        } catch (error) {
            console.error('Failed to add time:', error);
            this.app.showError('Failed to add time: ' + error.message);
        }
    }
    
    /**
     * Update game time display
     */
    updateGameTimeDisplay(seconds) {
        $('#game-time-display').html(this.formatGameTimeFromSeconds(seconds));
    }
    
    /**
     * Format game time for datetime-local input
     * Converts 'Y-m-d H:i:s' format to 'YYYY-MM-DDTHH:mm' format
     */
    formatGameTimeForInput(gameTime) {
        if (!gameTime) return '';
        
        // If it's already in the right format, return it
        if (gameTime.includes('T')) {
            return gameTime.slice(0, 16); // Remove seconds if present
        }
        
        // Convert from 'Y-m-d H:i:s' to 'YYYY-MM-DDTHH:mm'
        const date = new Date(gameTime);
        if (isNaN(date.getTime())) {
            return '';
        }
        
        // Format as YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    /**
     * Format game time from seconds to human readable format
     * Shows as "X years, Y days, Z hours, W minutes, S seconds"
     */
    formatGameTimeFromSeconds(seconds) {
        if (!seconds || seconds === 0) {
            return '<span style="color: var(--text-soft);">No time elapsed</span>';
        }
        
        const years = Math.floor(seconds / 31536000); // 365 days * 24 hours * 3600 seconds
        const days = Math.floor((seconds % 31536000) / 86400); // 24 hours * 3600 seconds
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts = [];
        if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
        if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
        
        return parts.join(', ');
    }
    
    /**
     * Calculate current game world datetime from start datetime and seconds
     */
    calculateCurrentGameDateTime(startDatetime, seconds) {
        if (!startDatetime || seconds === 0) {
            return '<span style="color: var(--text-soft);">Not set</span>';
        }
        
        try {
            // Parse start datetime (can be datetime-local format or Y-m-d H:i:s)
            let startDate;
            if (startDatetime.includes('T')) {
                startDate = new Date(startDatetime);
            } else {
                startDate = new Date(startDatetime);
            }
            
            if (isNaN(startDate.getTime())) {
                return '<span style="color: var(--text-soft);">Invalid start date</span>';
            }
            
            // Add seconds to start date
            const currentDate = new Date(startDate.getTime() + (seconds * 1000));
            
            // Format as readable date/time
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const hours = String(currentDate.getHours()).padStart(2, '0');
            const minutes = String(currentDate.getMinutes()).padStart(2, '0');
            const secs = String(currentDate.getSeconds()).padStart(2, '0');
            
            // Calculate day of year
            const startOfYear = new Date(year, 0, 1);
            const dayOfYear = Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
            
            return `Year ${year}, Day ${dayOfYear}, ${hours}:${minutes}:${secs}`;
        } catch (error) {
            return '<span style="color: var(--text-soft);">Error calculating</span>';
        }
    }
    
    /**
     * Create a new campaign
     */
    async createCampaign() {
        try {
            const formData = {
                campaign_name: $('#campaign-name').val().trim(),
                campaign_description: $('#campaign-description').val().trim()
            };
            
            const response = await this.apiClient.post('/api/campaigns/create.php', formData);
            
            if (response.status === 'success') {
                this.app.showSuccess('Campaign created successfully!');
                this.hideCreationModal();
                // Reload campaigns and re-render
                await this.loadCampaigns();
                const content = await this.render();
                $('#content-area').html(content);
                this.setupEventListeners();
            } else {
                throw new Error(response.message || 'Failed to create campaign');
            }
        } catch (error) {
            console.error('Failed to create campaign:', error);
            this.app.showError('Failed to create campaign: ' + error.message);
        }
    }
    
    /**
     * Update a campaign
     */
    async updateCampaign(campaignId) {
        try {
            const startDatetimeInput = $('#edit-campaign-start-datetime').val();
            let startDatetime = null;
            
            // Convert datetime-local format (YYYY-MM-DDTHH:mm) to Y-m-d H:i:s
            if (startDatetimeInput) {
                const date = new Date(startDatetimeInput);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    startDatetime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                }
            }
            
            const formData = {
                campaign_id: campaignId,
                campaign_name: $('#edit-campaign-name').val().trim(),
                campaign_description: $('#edit-campaign-description').val().trim()
            };
            
            // Update campaign metadata first
            const response = await this.apiClient.post('/api/campaigns/update.php', formData);
            
            if (response.status === 'success') {
                // Update start datetime if provided
                if (startDatetime !== null) {
                    try {
                        await this.apiClient.post('/api/campaigns/update-game-time.php', {
                            campaign_id: campaignId,
                            campaign_start_datetime: startDatetime
                        });
                    } catch (gameTimeError) {
                        console.error('Failed to update start datetime:', gameTimeError);
                        // Don't fail the whole update if game time fails
                        this.app.showInfo('Campaign updated, but start datetime update failed: ' + gameTimeError.message);
                    }
                }
                
                this.app.showSuccess('Campaign updated successfully!');
                this.hideEditModal();
                // Reload campaigns and re-render
                await this.loadCampaigns();
                const content = await this.render();
                $('#content-area').html(content);
                this.setupEventListeners();
            } else {
                throw new Error(response.message || 'Failed to update campaign');
            }
        } catch (error) {
            console.error('Failed to update campaign:', error);
            this.app.showError('Failed to update campaign: ' + error.message);
        }
    }
    
    /**
     * View a campaign (show details and sessions)
     */
    async viewCampaign(campaignId) {
        try {
            const response = await this.apiClient.get(`/api/campaigns/get.php?campaign_id=${campaignId}`);
            
            if (response.status === 'success') {
                const campaign = response.data.campaign;
                const sessions = response.data.sessions || [];
                
                // Navigate to sessions view filtered by campaign
                // For now, just show an alert with campaign info
                let sessionsList = '';
                if (sessions.length > 0) {
                    sessionsList = '<ul>' + sessions.map(s => `<li>${this.escapeHtml(s.session_title)} - ${s.session_datetime}</li>`).join('') + '</ul>';
                } else {
                    sessionsList = '<p>No sessions in this campaign yet.</p>';
                }
                
                this.app.showModal('Campaign Details', `
                    <h3>${this.escapeHtml(campaign.campaign_name)}</h3>
                    <p>${this.escapeHtml(campaign.campaign_description || 'No description.')}</p>
                    <h4>Sessions (${sessions.length}):</h4>
                    ${sessionsList}
                `);
            } else {
                throw new Error(response.message || 'Failed to load campaign');
            }
        } catch (error) {
            console.error('Failed to view campaign:', error);
            this.app.showError('Failed to load campaign: ' + error.message);
        }
    }
    
    /**
     * Edit a campaign
     */
    async editCampaign(campaignId) {
        try {
            const response = await this.apiClient.get(`/api/campaigns/get.php?campaign_id=${campaignId}`);
            
            if (response.status === 'success') {
                // Store campaign data for use in form
                const campaign = response.data.campaign;
                if (!campaign.campaign_start_datetime && campaign.current_game_datetime) {
                    // If start datetime not set but we have current datetime, use current as start
                    campaign.campaign_start_datetime = campaign.current_game_datetime;
                    campaign.game_time_seconds = 0;
                }
                this.showEditModal(campaign);
            } else {
                throw new Error(response.message || 'Failed to load campaign');
            }
        } catch (error) {
            console.error('Failed to load campaign for editing:', error);
            this.app.showError('Failed to load campaign: ' + error.message);
        }
    }
    
    /**
     * Delete a campaign
     */
    async deleteCampaign(campaignId) {
        const campaign = this.campaigns.find(c => c.campaign_id === campaignId);
        const campaignName = campaign ? campaign.campaign_name : 'this campaign';
        
        if (!confirm(`Are you sure you want to delete "${campaignName}"? This will unlink all sessions from the campaign, but sessions will not be deleted.`)) {
            return;
        }
        
        try {
            const response = await this.apiClient.post('/api/campaigns/delete.php', {
                campaign_id: campaignId
            });
            
            if (response.status === 'success') {
                this.app.showSuccess('Campaign deleted successfully!');
                // Reload campaigns and re-render
                await this.loadCampaigns();
                const content = await this.render();
                $('#content-area').html(content);
                this.setupEventListeners();
            } else {
                throw new Error(response.message || 'Failed to delete campaign');
            }
        } catch (error) {
            console.error('Failed to delete campaign:', error);
            this.app.showError('Failed to delete campaign: ' + error.message);
        }
    }
    
    /**
     * Format game datetime for short display in campaign cards
     */
    formatGameDateTimeShort(gameDateTime) {
        if (!gameDateTime) return 'Not set';
        
        try {
            const date = new Date(gameDateTime);
            if (isNaN(date.getTime())) {
                return 'Invalid';
            }
            
            const year = date.getFullYear();
            const startOfYear = new Date(year, 0, 1);
            const dayOfYear = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `Year ${year}, Day ${dayOfYear}, ${hours}:${minutes}`;
        } catch (error) {
            return 'Invalid';
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    /**
     * Escape HTML to prevent XSS
     * @deprecated Use global escapeHtml() function from utils.js instead
     */
    escapeHtml(text) {
        return escapeHtml(text);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CampaignManagementModule;
}
