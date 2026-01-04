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
        this.pollInterval = 5000; // 5 seconds between polls
        this.isPolling = false;
        this.pollTimeout = null;
        this.eventHandlers = {};
        this.isConnected = false;
        this.pollTimeoutMs = 5000; // Reduced from 10 to 5 seconds
        
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
        console.log('Starting real-time polling...');
        
        // Trigger connection event
        this.trigger('connected', {});
        
        // Start polling loop
        this.poll();
    }
    
    /**
     * Stop polling
     */
    stop() {
        this.isPolling = false;
        this.isConnected = false;
        
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
        
        console.log('Stopped real-time polling');
        this.trigger('disconnected', {});
    }
    
    /**
     * Poll for new events
     */
    async poll() {
        if (!this.isPolling) {
            return;
        }
        
        try {
            console.log(`Polling for events (last_event_id: ${this.lastEventId})...`);
            
            const response = await fetch(
                `/api/realtime/poll.php?session_id=${this.sessionId}&last_event_id=${this.lastEventId}&timeout=5`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                const events = data.data.events || [];
                const onlineUsers = data.data.online_users || [];
                
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
            console.error('Polling error:', error);
            
            // Increment error count
            this.errorCount = (this.errorCount || 0) + 1;
            
            // If too many consecutive errors, stop polling and notify
            if (this.errorCount >= 3) {
                this.stop();
                this.trigger('connection_error', { error: error.message });
                
                if (this.app.modules.notifications) {
                    this.app.modules.notifications.show('Lost connection to server. Refresh to reconnect.', 'error');
                }
                return;
            }
        }
        
        // Schedule next poll if still active
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

