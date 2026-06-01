/**
 * BECMI D&D Character Manager - Real-Time Client
 * 
 * Handles long-polling for real-time session updates.
 * Processes events and triggers UI updates.
 */

class RealtimeClient {
    constructor(sessionId, app) {
        this.sessionId = sessionId;
        this.app = app;
        this.lastEventId = 0;
        this.pollInterval = 150; // small handoff delay between long-poll requests
        this.isPolling = false;
        this.pollTimeout = null;
        this.activeRequest = null;
        this.eventHandlers = {};
        this.isConnected = false;
        this.pollTimeoutMs = 25000; // true long-poll timeout
        this.connectionState = 'idle';
        this.lastSyncAt = null;
        this.lastErrorMessage = '';
        
        console.log(`Real-time client initialized for session ${sessionId}`);
    }
    
    /**
     * Start polling for events
     */
    start() {
        if (this.isPolling) {
            console.log('Polling already active');
            return;
        }
        
        this.isPolling = true;
        this.isConnected = true;
        this.updateConnectionStatus('connecting');
        console.log('Starting real-time polling...');
        
        // Trigger connection event
        this.trigger('connected', {});
        
        // Start polling loop
        this.poll();
    }
    
    /**
     * Stop polling
     */
    stop(state = 'disconnected') {
        this.isPolling = false;
        this.isConnected = false;
        
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }

        if (this.activeRequest) {
            this.activeRequest.abort();
            this.activeRequest = null;
        }
        
        this.updateConnectionStatus(state);
        console.log('Stopped real-time polling');
        this.trigger('disconnected', {});
    }

    /**
     * Update the visible realtime connection state.
     */
    updateConnectionStatus(state, meta = {}) {
        this.connectionState = state;

        if (meta.lastErrorMessage !== undefined) {
            this.lastErrorMessage = meta.lastErrorMessage;
        }
        if (meta.lastSyncAt !== undefined) {
            this.lastSyncAt = meta.lastSyncAt;
        }

        this.renderConnectionIndicator();
    }

    /**
     * Render a small realtime status indicator for degraded states and debug sessions.
     */
    renderConnectionIndicator() {
        const debugEnabled = Boolean(window.__BECMI_DEBUG__ || window.DEBUG_MODE);
        const shouldShow = debugEnabled || (this.connectionState !== 'connected' && this.connectionState !== 'idle');
        const existing = document.getElementById('becmi-realtime-status');

        if (!shouldShow) {
            if (existing) {
                existing.remove();
            }
            return;
        }

        const indicator = existing || document.createElement('div');
        indicator.id = 'becmi-realtime-status';
        indicator.style.position = 'fixed';
        indicator.style.right = '16px';
        indicator.style.bottom = '16px';
        indicator.style.zIndex = '2000';
        indicator.style.maxWidth = '320px';
        indicator.style.padding = '12px 14px';
        indicator.style.borderRadius = '12px';
        indicator.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.2)';
        indicator.style.fontSize = '13px';
        indicator.style.lineHeight = '1.4';
        indicator.style.color = '#fff';

        let background = '#4f6b4f';
        let title = 'Realtime connected';

        if (this.connectionState === 'connecting') {
            background = '#786437';
            title = 'Connecting...';
        } else if (this.connectionState === 'reconnecting') {
            background = '#8a6d1d';
            title = 'Reconnecting...';
        } else if (this.connectionState === 'failed') {
            background = '#8b2d2d';
            title = 'Realtime failed';
        } else if (this.connectionState === 'disconnected') {
            background = '#5a5a5a';
            title = 'Realtime stopped';
        }

        const lastSyncText = this.lastSyncAt
            ? new Date(this.lastSyncAt).toLocaleTimeString()
            : 'No sync yet';
        const errorText = this.lastErrorMessage
            ? `<div style="margin-top:6px;opacity:0.9;">${this.escapeHtml(this.lastErrorMessage)}</div>`
            : '';
        const showRetry = this.connectionState === 'reconnecting' || this.connectionState === 'failed' || this.connectionState === 'disconnected';
        const retryMarkup = showRetry
            ? `<button type="button" id="becmi-realtime-retry" style="margin-top:10px;border:0;border-radius:8px;padding:6px 10px;background:#fff;color:#222;font-weight:600;cursor:pointer;">Retry now</button>`
            : '';

        indicator.style.background = background;
        indicator.innerHTML = `
            <div style="font-weight:700;">${title}</div>
            <div style="margin-top:4px;opacity:0.9;">Last sync: ${this.escapeHtml(lastSyncText)}</div>
            <div style="opacity:0.9;">Last event ID: ${this.escapeHtml(String(this.lastEventId))}</div>
            ${errorText}
            ${retryMarkup}
        `;

        if (!existing) {
            document.body.appendChild(indicator);
        }

        const retryButton = document.getElementById('becmi-realtime-retry');
        if (retryButton) {
            retryButton.onclick = () => {
                this.errorCount = 0;
                this.lastErrorMessage = '';

                if (!this.isPolling) {
                    this.start();
                    return;
                }

                if (this.pollTimeout) {
                    clearTimeout(this.pollTimeout);
                    this.pollTimeout = null;
                }

                this.poll();
            };
        }
    }

    /**
     * Escape text before injecting into the status indicator.
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
     * Poll for new events
     */
    async poll() {
        if (!this.isPolling) {
            return;
        }

        let timeoutHandle = null;
        try {
            console.log(`Polling for events (last_event_id: ${this.lastEventId})...`);

            const pollTimeoutSeconds = Math.max(5, Math.floor(this.pollTimeoutMs / 1000));
            const controller = new AbortController();
            timeoutHandle = setTimeout(() => controller.abort(), this.pollTimeoutMs + 1000);
            this.activeRequest = controller;

            const response = await fetch(
                `/api/realtime/poll.php?session_id=${this.sessionId}&last_event_id=${this.lastEventId}&timeout=${pollTimeoutSeconds}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                }
            );
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
            this.activeRequest = null;
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                const events = data.data.events || [];
                const onlineUsers = data.data.online_users || [];
                this.updateConnectionStatus('connected', {
                    lastSyncAt: new Date().toISOString(),
                    lastErrorMessage: ''
                });
                
                console.log(`[RealtimeClient] Received ${events.length} event(s), ${onlineUsers.length} user(s) online`);
                
                // Process events
                if (events.length > 0) {
                    console.log(`[RealtimeClient] Processing ${events.length} events:`, events.map(e => e.event_type));
                    this.processEvents(events);
                    // Update lastEventId to the highest event ID we received
                    const maxEventId = Math.max(...events.map(e => e.event_id), this.lastEventId);
                    this.lastEventId = maxEventId;
                    console.log(`[RealtimeClient] Updated lastEventId to: ${this.lastEventId}`);
                } else {
                    // Even if no events, update lastEventId from server response
                    if (data.data.last_event_id && data.data.last_event_id > this.lastEventId) {
                        this.lastEventId = data.data.last_event_id;
                        console.log(`[RealtimeClient] Updated lastEventId to: ${this.lastEventId} (no new events)`);
                    }
                }
                
                // Update online users display
                this.trigger('online_users_update', { users: onlineUsers, count: onlineUsers.length });
                
                // Always update lastEventId from server response (even if no events)
                // This ensures we don't miss events if server returns a higher last_event_id
                if (data.data.last_event_id !== undefined && data.data.last_event_id > this.lastEventId) {
                    this.lastEventId = data.data.last_event_id;
                    console.log(`[RealtimeClient] Updated lastEventId to: ${this.lastEventId} (from server response)`);
                }
                
                // Reset error count on successful poll
                this.errorCount = 0;
            }
            
        } catch (error) {
                if (error.name === 'AbortError') {
                    // Expected when client stops or request times out.
                    if (this.isPolling) {
                        this.errorCount = 0;
                        this.updateConnectionStatus('connected', {
                            lastSyncAt: new Date().toISOString(),
                            lastErrorMessage: ''
                        });
                    }
                } else {
                    console.error('Polling error:', error);

                    // Increment error count
                    this.errorCount = (this.errorCount || 0) + 1;
                    this.updateConnectionStatus('reconnecting', {
                        lastErrorMessage: error.message
                    });

                    // If too many consecutive errors, stop polling and notify
                    if (this.errorCount >= 3) {
                        this.stop('failed');
                        this.trigger('connection_error', { error: error.message });

                    if (this.app.modules.notifications) {
                        this.app.modules.notifications.show('Lost connection to server. Refresh to reconnect.', 'error');
                    }
                    return;
                }
            }
        } finally {
            this.activeRequest = null;
            if (timeoutHandle !== null) {
                clearTimeout(timeoutHandle);
            }
        }
        
        // Schedule next poll after a short handoff delay.
        if (this.isPolling) {
            this.pollTimeout = setTimeout(() => this.poll(), this.pollInterval);
        }
    }
    
    /**
     * Process received events
     * 
     * @param {Array} events - Array of events
     */
    processEvents(events) {
        events.forEach(event => {
            console.log(`[RealtimeClient] Processing event: ${event.event_type}`, event.event_data);
            
            // Trigger event-specific handlers
            this.trigger(event.event_type, event.event_data);
            
            // Trigger generic event handler
            this.trigger('event', { type: event.event_type, data: event.event_data });
        });
    }
    
    /**
     * Register event handler
     * 
     * @param {string} eventType - Event type to listen for
     * @param {Function} handler - Handler function
     */
    on(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            this.eventHandlers[eventType] = [];
        }
        this.eventHandlers[eventType].push(handler);
    }
    
    /**
     * Remove event handler
     * 
     * @param {string} eventType - Event type
     * @param {Function} handler - Handler function to remove
     */
    off(eventType, handler) {
        if (!this.eventHandlers[eventType]) {
            return;
        }
        
        this.eventHandlers[eventType] = this.eventHandlers[eventType].filter(h => h !== handler);
    }
    
    /**
     * Trigger event handlers
     * 
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     */
    trigger(eventType, data) {
        if (!this.eventHandlers[eventType]) {
            return;
        }
        
        this.eventHandlers[eventType].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Event handler error for ${eventType}:`, error);
            }
        });
    }
    
    /**
     * Reconnect after connection loss
     */
    reconnect() {
        console.log('Reconnecting...');
        this.stop();
        setTimeout(() => this.start(), 1000);
    }
    
    /**
     * Check if connected
     * 
     * @returns {boolean} Connection status
     */
    isOnline() {
        return this.isConnected && this.isPolling;
    }
}

// Export to window for use in other modules
window.RealtimeClient = RealtimeClient;
