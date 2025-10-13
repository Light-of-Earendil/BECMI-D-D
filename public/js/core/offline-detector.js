/**
 * BECMI D&D Character Manager - Offline Detector
 * 
 * Monitors network connection and notifies user when offline/online.
 * Automatically reconnects real-time client when connection restored.
 */

class OfflineDetector {
    constructor(app) {
        this.app = app;
        this.isOnline = navigator.onLine;
        
        this.init();
        
        console.log('Offline Detector initialized. Online status:', this.isOnline);
    }
    
    /**
     * Initialize offline detection
     */
    init() {
        // Listen for online event
        window.addEventListener('online', () => {
            this.handleOnline();
        });
        
        // Listen for offline event
        window.addEventListener('offline', () => {
            this.handleOffline();
        });
        
        // Periodically check connection
        setInterval(() => this.checkConnection(), 30000); // Every 30 seconds
    }
    
    /**
     * Handle online event
     */
    handleOnline() {
        console.log('Connection restored');
        this.isOnline = true;
        
        // Show notification
        if (this.app.modules.notificationManager) {
            this.app.modules.notificationManager.showToast(
                'Connection restored',
                'success'
            );
        }
        
        // Reconnect real-time client if it exists
        if (this.app.modules.dmDashboard && this.app.modules.dmDashboard.realtimeClient) {
            this.app.modules.dmDashboard.realtimeClient.reconnect();
        }
        
        // Remove offline indicator
        this.hideOfflineIndicator();
    }
    
    /**
     * Handle offline event
     */
    handleOffline() {
        console.warn('Connection lost');
        this.isOnline = false;
        
        // Show notification
        if (this.app.modules.notificationManager) {
            this.app.modules.notificationManager.showToast(
                'You are offline. Some features may not work.',
                'warning',
                10000
            );
        }
        
        // Show offline indicator in UI
        this.showOfflineIndicator();
    }
    
    /**
     * Show offline indicator in UI
     */
    showOfflineIndicator() {
        if ($('#offline-indicator').length === 0) {
            const indicator = $(`
                <div id="offline-indicator" class="offline-indicator">
                    <i class="fas fa-wifi-slash"></i>
                    <span>You are offline</span>
                </div>
            `);
            $('body').append(indicator);
        }
    }
    
    /**
     * Hide offline indicator
     */
    hideOfflineIndicator() {
        $('#offline-indicator').fadeOut(300, function() {
            $(this).remove();
        });
    }
    
    /**
     * Check connection status
     */
    async checkConnection() {
        try {
            // Try to fetch a small resource
            const response = await fetch('/api/auth/verify.php', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            
            if (!this.isOnline && response.ok) {
                // Was offline, now online
                this.handleOnline();
            }
            
        } catch (error) {
            if (this.isOnline) {
                // Was online, now offline
                this.handleOffline();
            }
        }
    }
    
    /**
     * Get online status
     * 
     * @returns {boolean} Online status
     */
    getOnlineStatus() {
        return this.isOnline;
    }
}

// Export to window
window.OfflineDetector = OfflineDetector;

