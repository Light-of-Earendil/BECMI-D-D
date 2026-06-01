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
        this.isInitialized = false;
        this.isHandlingError = false;

        this.init();

        console.log('Error Handler initialized');
    }
    
    /**
     * Initialize error handler
     */
    init() {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;

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
                promise: '[Promise]'
            });
        });
        
        console.log('Global error handlers registered');
    }

    /**
     * Normalize different error shapes into a consistent object.
     */
    normalizeError(error) {
        if (error instanceof Error) {
            return {
                name: error.name || 'Error',
                message: error.message || 'Unknown error',
                stack: error.stack || ''
            };
        }

        if (typeof error === 'string') {
            return {
                name: 'Error',
                message: error,
                stack: ''
            };
        }

        return {
            name: 'Error',
            message: 'Unknown client error',
            stack: ''
        };
    }

    /**
     * Return the most recent API activity for support/debugging.
     */
    getRecentApiActivity() {
        if (!Array.isArray(window.__BECMI_API_ACTIVITY__)) {
            return [];
        }

        return window.__BECMI_API_ACTIVITY__.slice(-10);
    }

    /**
     * Generate a short client-side error ID.
     */
    generateClientErrorId() {
        return `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }
    
    /**
     * Handle error
     * 
     * @param {Error|string|any} error - Error object
     * @param {Object} context - Additional context
     */
    handleError(error, context = {}) {
        if (this.isHandlingError) {
            console.error('Nested error while handling another error:', error, context);
            return;
        }

        this.isHandlingError = true;

        const normalizedError = this.normalizeError(error);
        const errorId = this.generateClientErrorId();
        const enrichedContext = {
            ...context,
            errorId,
            apiActivity: this.getRecentApiActivity()
        };

        try {
            console.error('Global error caught:', {
                errorId,
                error: normalizedError,
                context: enrichedContext
            });

            // Log error
            this.logError(normalizedError, enrichedContext);

            // Show user-friendly error message
            this.showErrorModal(normalizedError, enrichedContext);

            // Send to server for logging (async, don't wait)
            this.sendErrorToServer(normalizedError, enrichedContext).catch(err => {
                console.error('Failed to log error to server:', err);
            });
        } finally {
            this.isHandlingError = false;
        }
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
     * Escape text for safe HTML output.
     */
    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Build a compact support report for copying and persistence.
     */
    formatErrorDetails(error, context = {}) {
        return JSON.stringify({
            error_id: context.errorId || null,
            request_id: context.requestId || null,
            message: error.message,
            name: error.name,
            stack: error.stack || '',
            page: window.location.href,
            user_agent: navigator.userAgent,
            context: context,
            api_activity: context.apiActivity || []
        }, null, 2);
    }

    /**
     * Copy text to the clipboard with a textarea fallback.
     */
    async copyToClipboard(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
    
    /**
     * Show user-friendly error modal
     */
    showErrorModal(error, context = {}) {
        const debugEnabled = Boolean(window.__BECMI_DEBUG__ || window.DEBUG_MODE);
        const errorId = this.escapeHtml(context.errorId || 'unknown');
        const requestIdMarkup = context.requestId
            ? `<p><strong>Request ID:</strong> ${this.escapeHtml(context.requestId)}</p>`
            : '';
        const debugMarkup = debugEnabled
            ? `<pre class="error-details">${this.escapeHtml(this.formatErrorDetails(error, context))}</pre>`
            : '';

        $('#errorModal').remove();

        const modal = $(`
            <div class="modal show" id="errorModal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="error-modal-title">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="error-modal-title">Unexpected Error</h2>
                        <p>Your latest action may not have completed.</p>
                        <button type="button" class="modal-close" id="close-error-modal" aria-label="Close error dialog">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Error ID:</strong> ${errorId}</p>
                        ${requestIdMarkup}
                        <p>Something went wrong. Use the error ID if you report this issue.</p>
                        ${debugMarkup}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" id="copy-error-details-btn">Copy Details</button>
                        <button type="button" class="btn btn-secondary" id="dismiss-error-modal">Close</button>
                        <button type="button" class="btn btn-primary" id="refresh-error-page-btn">
                            <i class="fas fa-sync"></i> Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        `);

        $('body').append(modal);

        const closeModal = () => {
            $('#errorModal').removeClass('show');
            $('#errorModal').remove();
        };

        $('#close-error-modal, #dismiss-error-modal').on('click', closeModal);

        $('#copy-error-details-btn').on('click', async () => {
            const $button = $('#copy-error-details-btn');
            const originalLabel = $button.text();

            try {
                await this.copyToClipboard(this.formatErrorDetails(error, context));
                $button.text('Copied');
            } catch (copyError) {
                console.error('Failed to copy error details:', copyError);
                $button.text('Copy failed');
            }

            setTimeout(() => {
                $button.text(originalLabel);
            }, 1500);
        });

        $('#refresh-error-page-btn').on('click', () => {
            window.location.reload();
        });

        $('#errorModal').on('click', (event) => {
            if (event.target === event.currentTarget) {
                closeModal();
            }
        });
    }
    
    /**
     * Send error to server for logging
     */
    async sendErrorToServer(error, context) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            const csrfToken = window.becmiApp && window.becmiApp.state
                ? window.becmiApp.state.csrfToken
                : null;

            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            await fetch('/api/error-log.php', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    error_id: context.errorId,
                    request_id: context.requestId || null,
                    message: error.message,
                    stack: error.stack,
                    context: context,
                    api_activity: context.apiActivity || [],
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
