/**
 * BECMI D&D Character Manager - Notification Manager
 * 
 * Handles browser push notifications and in-app toast notifications.
 * Integrates with real-time client for session event notifications.
 */

class NotificationManager {
    constructor(app) {
        this.app = app;
        this.permission = 'default';
        this.enabled = false;
        this.toastContainer = null;
        
        // Initialize on construction
        this.init();
        
        console.log('Notification Manager initialized');
    }
    
    /**
     * Initialize notification manager
     */
    async init() {
        // Check browser support
        if (!('Notification' in window)) {
            console.warn('This browser does not support desktop notifications');
            return;
        }
        
        this.permission = Notification.permission;
        this.enabled = this.permission === 'granted';
        
        // Create toast container if not exists
        this.createToastContainer();
        
        console.log(`Notification permission: ${this.permission}`);
    }
    
    /**
     * Request notification permission from user
     * 
     * @returns {Promise<string>} Permission status
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return 'denied';
        }
        
        if (this.permission === 'granted') {
            return 'granted';
        }
        
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            this.enabled = permission === 'granted';
            
            console.log(`Notification permission: ${permission}`);
            
            if (permission === 'granted') {
                this.showToast('Notifications enabled!', 'success');
            }
            
            return permission;
            
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return 'denied';
        }
    }
    
    /**
     * Send browser push notification
     * 
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {Object} options - Additional options
     */
    sendNotification(title, body, options = {}) {
        if (!this.enabled) {
            console.log('Notifications not enabled, showing toast instead');
            this.showToast(body, 'info');
            return;
        }
        
        try {
            const notification = new Notification(title, {
                body: body,
                icon: '/images/becmi-icon.png',
                badge: '/images/becmi-badge.png',
                tag: options.tag || 'becmi-notification',
                requireInteraction: options.requireInteraction || false,
                silent: options.silent || false,
                ...options
            });
            
            // Handle notification click
            notification.onclick = () => {
                window.focus();
                if (options.onClick) {
                    options.onClick();
                }
                notification.close();
            };
            
            // Auto-close after 10 seconds if not requiring interaction
            if (!options.requireInteraction) {
                setTimeout(() => notification.close(), 10000);
            }
            
        } catch (error) {
            console.error('Failed to send notification:', error);
            this.showToast(body, 'info');
        }
    }
    
    /**
     * Create toast container
     */
    createToastContainer() {
        if (!this.toastContainer) {
            this.toastContainer = $('<div class="toast-container"></div>');
            $('body').append(this.toastContainer);
        }
    }
    
    /**
     * Show in-app toast notification
     * 
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in ms (default 5000)
     */
    showToast(message, type = 'info', duration = 5000) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const icon = icons[type] || icons.info;
        
        const toast = $(`
            <div class="toast toast-${type} slide-in">
                <div class="toast-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="toast-content">
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `);
        
        this.toastContainer.append(toast);
        
        // Animate in
        setTimeout(() => toast.addClass('show'), 10);
        
        // Auto-remove after duration
        const removeToast = () => {
            toast.removeClass('show');
            setTimeout(() => toast.remove(), 300);
        };
        
        const timeoutId = setTimeout(removeToast, duration);
        
        // Manual close button
        toast.find('.toast-close').on('click', () => {
            clearTimeout(timeoutId);
            removeToast();
        });
    }
    
    /**
     * Show session starting soon notification
     * 
     * @param {Object} session - Session data
     * @param {number} minutesUntil - Minutes until session starts
     */
    notifySessionStarting(session, minutesUntil) {
        const title = 'Session Starting Soon!';
        const body = `${session.session_title} starts in ${minutesUntil} minutes`;
        
        this.sendNotification(title, body, {
            tag: `session-${session.session_id}`,
            requireInteraction: true,
            onClick: () => {
                // Navigate to session
                if (this.app.modules.sessionManagement) {
                    this.app.modules.sessionManagement.viewSession(session.session_id);
                }
            }
        });
    }
    
    /**
     * Show character HP critical notification
     * 
     * @param {Object} character - Character data
     */
    notifyHPCritical(character) {
        const title = 'Character HP Critical!';
        const body = `${character.character_name} is at ${character.current_hp}/${character.max_hp} HP`;
        
        this.sendNotification(title, body, {
            tag: `hp-critical-${character.character_id}`,
            onClick: () => {
                if (this.app.modules.characterSheet) {
                    this.app.modules.characterSheet.viewCharacter(character.character_id);
                }
            }
        });
    }
    
    /**
     * Show XP awarded notification
     * 
     * @param {number} xpAmount - Amount of XP awarded
     * @param {boolean} canLevelUp - Whether character can level up
     */
    notifyXPAwarded(xpAmount, canLevelUp = false) {
        const title = canLevelUp ? 'Ready to Level Up!' : 'XP Awarded';
        const body = canLevelUp ? 
            `You gained ${xpAmount} XP and can now level up!` :
            `You gained ${xpAmount} XP`;
        
        this.sendNotification(title, body, {
            tag: 'xp-awarded',
            requireInteraction: canLevelUp
        });
    }
    
    /**
     * Show item received notification
     * 
     * @param {string} itemName - Name of item received
     * @param {string} characterName - Character who received it
     */
    notifyItemReceived(itemName, characterName) {
        const title = 'Item Received!';
        const body = `${characterName} received: ${itemName}`;
        
        this.sendNotification(title, body, {
            tag: 'item-received'
        });
    }
    
    /**
     * Show player joined session notification
     * 
     * @param {string} username - Username who joined
     */
    notifyPlayerJoined(username) {
        const title = 'Player Joined';
        const body = `${username} joined the session`;
        
        this.showToast(body, 'info');
    }
    
    /**
     * Show initiative rolled notification (your turn coming)
     * 
     * @param {number} position - Position in initiative order
     */
    notifyInitiativeRolled(position) {
        const title = 'Initiative Rolled!';
        const body = `You are #${position} in the initiative order`;
        
        this.showToast(body, 'info');
    }
    
    /**
     * Enable notifications (request permission and enable)
     */
    async enable() {
        const permission = await this.requestPermission();
        return permission === 'granted';
    }
    
    /**
     * Disable notifications
     */
    disable() {
        this.enabled = false;
        console.log('Notifications disabled');
    }
    
    /**
     * Check if notifications are enabled
     * 
     * @returns {boolean} Enabled status
     */
    isEnabled() {
        return this.enabled;
    }
}

// Export to window for use in app.js
window.NotificationManager = NotificationManager;

