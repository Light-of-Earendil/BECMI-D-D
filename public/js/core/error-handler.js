/**
 * BECMI D&D Character Manager - Global Error Handler
 * 
 * Handles uncaught errors and provides user-friendly error messages.
 * Logs errors to server for debugging.
 */

class ErrorHandler {
    constructor(app) {
        this.app = app;
        this.errorLog = [];
        
        this.init();
        
        console.log('Error Handler initialized');
    }
    
    /**
     * Initialize error handler
     */
    init() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error, {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                message: 'Unhandled Promise Rejection',
                promise: event.promise
            });
        });
        
        console.log('Global error handlers registered');
    }
    
    /**
     * Handle error
     * 
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     */
    handleError(error, context = {}) {
        console.error('Global error caught:', error, context);
        
        // Log error
        this.logError(error, context);
        
        // Show user-friendly error message
        this.showErrorModal(error);
        
        // Send to server for logging (async, don't wait)
        this.sendErrorToServer(error, context).catch(err => {
            console.error('Failed to log error to server:', err);
        });
    }
    
    /**
     * Log error locally
     */
    logError(error, context) {
        this.errorLog.push({
            error: error,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        // Keep only last 50 errors
        if (this.errorLog.length > 50) {
            this.errorLog.shift();
        }
    }
    
    /**
     * Show user-friendly error modal
     */
    showErrorModal(error) {
        const modal = $(`
            <div class="modal fade" id="errorModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle"></i> Unexpected Error
                            </h5>
                            <button type="button" class="close text-white" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>Something went wrong. Please try refreshing the page.</p>
                            <p class="text-muted">If the problem persists, please contact support.</p>
                            ${window.DEBUG_MODE ? `<pre class="error-details">${error.message}\n${error.stack}</pre>` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="window.location.reload()">
                                <i class="fas fa-sync"></i> Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        $('#errorModal').modal('show');
        
        $('#errorModal').on('hidden.bs.modal', () => {
            $('#errorModal').remove();
        });
    }
    
    /**
     * Send error to server for logging
     */
    async sendErrorToServer(error, context) {
        try {
            await fetch('/api/error-log.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    context: context,
                    url: window.location.href,
                    user_agent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (err) {
            // Failed to log error - that's okay, we already have it in console
            console.error('Failed to send error to server:', err);
        }
    }
    
    /**
     * Get error log
     */
    getErrorLog() {
        return this.errorLog;
    }
}

// Export to window
window.ErrorHandler = ErrorHandler;

