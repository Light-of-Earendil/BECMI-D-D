/**
 * BECMI D&D Character Manager - Notifications Module
 * 
 * Handles user notifications and alerts throughout the application.
 */

class NotificationsModule {
    constructor(app) {
        this.app = app;
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000; // 5 seconds
        
        console.log('Notifications Module initialized');
    }
    
    /**
     * Show a notification
     */
    show(message, type = 'info', duration = null) {
        const notification = {
            id: this.generateNotificationId(),
            message: message,
            type: type,
            duration: duration || this.defaultDuration,
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        this.renderNotification(notification);
        this.cleanupOldNotifications();
        
        // Auto-remove notification after duration
        if (notification.duration > 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, notification.duration);
        }
        
        console.log(`Notification [${type}]: ${message}`);
    }
    
    /**
     * Show success notification
     */
    success(message, duration = null) {
        this.show(message, 'success', duration);
    }
    
    /**
     * Show error notification
     */
    error(message, duration = null) {
        this.show(message, 'error', duration);
    }
    
    /**
     * Show warning notification
     */
    warning(message, duration = null) {
        this.show(message, 'warning', duration);
    }
    
    /**
     * Show info notification
     */
    info(message, duration = null) {
        this.show(message, 'info', duration);
    }
    
    /**
     * Remove a notification
     */
    remove(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            $(`#notification-${notificationId}`).fadeOut(300, function() {
                $(this).remove();
            });
            
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
        }
    }
    
    /**
     * Clear all notifications
     */
    clear() {
        this.notifications.forEach(notification => {
            $(`#notification-${notification.id}`).remove();
        });
        this.notifications = [];
    }
    
    /**
     * Render a notification element
     */
    renderNotification(notification) {
        const notificationEl = $(`<div id="notification-${notification.id}"class="notification ${notification.type}">
                <div class="notification-content">
                    <div class="notification-icon">
                        ${this.getNotificationIcon(notification.type)}
                    </div>
                    <div class="notification-message">
                        ${notification.message}
                    </div>
                    <button class="notification-close"data-notification-id="${notification.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-progress"style="animation-duration: ${notification.duration}ms;"></div>
            </div>
        `);
        
        $('#notifications').append(notificationEl);
        
        // Animate in
        notificationEl.hide().fadeIn(300);
        
        // Setup close handler
        notificationEl.find('.notification-close').on('click', () => {
            this.remove(notification.id);
        });
        
        // Setup click-to-dismiss
        notificationEl.on('click', (e) => {
            if (!$(e.target).closest('.notification-close').length) {
                this.remove(notification.id);
            }
        });
    }
    
    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'};
        
        return icons[type] || icons.info;
    }
    
    /**
     * Generate unique notification ID
     */
    generateNotificationId() {
        return 'notification_'+ Date.now() + '_'+ Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Cleanup old notifications
     */
    cleanupOldNotifications() {
        if (this.notifications.length > this.maxNotifications) {
            const oldestNotification = this.notifications[0];
            this.remove(oldestNotification.id);
        }
    }
    
    /**
     * Show loading notification
     */
    showLoading(message = 'Loading...') {
        const notification = {
            id: this.generateNotificationId(),
            message: message,
            type: 'loading',
            duration: 0, // Don't auto-remove
            timestamp: new Date()
        };
        
        this.notifications.push(notification);
        
        const notificationEl = $(`<div id="notification-${notification.id}"class="notification loading">
                <div class="notification-content">
                    <div class="notification-icon">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="notification-message">
                        ${message}
                    </div>
                </div>
            </div>
        `);
        
        $('#notifications').append(notificationEl);
        notificationEl.hide().fadeIn(300);
        
        return notification.id;
    }
    
    /**
     * Hide loading notification
     */
    hideLoading(notificationId) {
        this.remove(notificationId);
    }
    
    /**
     * Show confirmation dialog
     */
    confirm(message, onConfirm, onCancel = null) {
        const notificationId = this.generateNotificationId();
        
        const notificationEl = $(`<div id="notification-${notificationId}"class="notification confirm">
                <div class="notification-content">
                    <div class="notification-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="notification-message">
                        ${message}
                    </div>
                    <div class="notification-actions">
                        <button class="btn btn-sm btn-primary confirm-yes"data-notification-id="${notificationId}">
                            Yes
                        </button>
                        <button class="btn btn-sm btn-secondary confirm-no"data-notification-id="${notificationId}">
                            No
                        </button>
                    </div>
                </div>
            </div>
        `);
        
        $('#notifications').append(notificationEl);
        notificationEl.hide().fadeIn(300);
        
        // Setup handlers
        notificationEl.find('.confirm-yes').on('click', () => {
            this.remove(notificationId);
            if (onConfirm) onConfirm();
        });
        
        notificationEl.find('.confirm-no').on('click', () => {
            this.remove(notificationId);
            if (onCancel) onCancel();
        });
        
        return notificationId;
    }
    
    /**
     * Show toast notification (smaller, less intrusive)
     */
    toast(message, type = 'info', duration = 3000) {
        const toastId = this.generateNotificationId();
        
        const toastEl = $(`<div id="toast-${toastId}"class="toast ${type}">
                <div class="toast-content">
                    <div class="toast-icon">
                        ${this.getNotificationIcon(type)}
                    </div>
                    <div class="toast-message">
                        ${message}
                    </div>
                </div>
            </div>
        `);
        
        // Add toast container if it doesn't exist
        if ($('#toast-container').length === 0) {
            $('body').append('<div id="toast-container"></div>');
        }
        
        $('#toast-container').append(toastEl);
        
        // Animate in
        toastEl.hide().slideDown(200);
        
        // Auto-remove
        setTimeout(() => {
            toastEl.slideUp(200, function() {
                $(this).remove();
            });
        }, duration);
        
        return toastId;
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Global error handler
        $(document).ajaxError((event, xhr, settings, error) => {
            if (xhr.status === 401) {
                this.error('Session expired. Please log in again.');
            } else if (xhr.status === 403) {
                this.error('Access denied.');
            } else if (xhr.status === 404) {
                this.error('Resource not found.');
            } else if (xhr.status >= 500) {
                this.error('Server error. Please try again later.');
            } else {
                this.error('Network error occurred.');
            }
        });
        
        // Global success handler for AJAX requests
        $(document).ajaxSuccess((event, xhr, settings) => {
            // Only show success for POST/PUT/DELETE requests
            if (['POST', 'PUT', 'DELETE'].includes(settings.type)) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.status === 'success'&& response.message) {
                        this.success(response.message);
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
        });
    }
    
    /**
     * Initialize notifications module
     */
    init() {
        this.setupEventHandlers();
        console.log('Notifications Module initialized');
    }
}

// Export to window for use in app.js
window.NotificationModule = NotificationsModule;