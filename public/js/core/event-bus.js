/**
 * BECMI D&D Character Manager - Event Bus
 * 
 * Centralized event system for communication between modules.
 * Provides a decoupled way for different parts of the application
 * to communicate without direct dependencies.
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.maxListeners = 100;
        this.debugMode = false;
        
        console.log('Event Bus initialized');
    }
    
    /**
     * Subscribe to an event
     */
    on(eventName, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Event callback must be a function');
        }
        
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        const listeners = this.events.get(eventName);
        
        // Check listener limit
        if (listeners.length >= this.maxListeners) {
            console.warn(`Maximum listeners (${this.maxListeners}) reached for event '${eventName}'`);
            return;
        }
        
        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateListenerId()
        };
        
        listeners.push(listener);
        
        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);
        
        if (this.debugMode) {
            console.log(`Subscribed to event '${eventName}'(listener ${listener.id})`);
        }
        
        // Return unsubscribe function
        return () => {
            this.off(eventName, listener.id);
        };
    }
    
    /**
     * Subscribe to an event (one-time only)
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }
    
    /**
     * Unsubscribe from an event
     */
    off(eventName, listenerId) {
        if (!this.events.has(eventName)) {
            return false;
        }
        
        const listeners = this.events.get(eventName);
        const index = listeners.findIndex(listener => listener.id === listenerId);
        
        if (index === -1) {
            return false;
        }
        
        listeners.splice(index, 1);
        
        if (this.debugMode) {
            console.log(`Unsubscribed from event '${eventName}'(listener ${listenerId})`);
        }
        
        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.events.delete(eventName);
        }
        
        return true;
    }
    
    /**
     * Emit an event
     */
    emit(eventName, data = null) {
        if (!this.events.has(eventName)) {
            if (this.debugMode) {
                console.log(`No listeners for event '${eventName}'`);
            }
            return;
        }
        
        const listeners = this.events.get(eventName);
        const listenersToRemove = [];
        
        if (this.debugMode) {
            console.log(`Emitting event '${eventName}'to ${listeners.length} listeners`);
        }
        
        // Execute listeners
        listeners.forEach(listener => {
            try {
                listener.callback(data);
                
                // Mark one-time listeners for removal
                if (listener.once) {
                    listenersToRemove.push(listener.id);
                }
            } catch (error) {
                console.error(`Error in event listener for '${eventName}':`, error);
            }
        });
        
        // Remove one-time listeners
        listenersToRemove.forEach(listenerId => {
            this.off(eventName, listenerId);
        });
    }
    
    /**
     * Emit an event asynchronously
     */
    async emitAsync(eventName, data = null) {
        if (!this.events.has(eventName)) {
            if (this.debugMode) {
                console.log(`No listeners for async event '${eventName}'`);
            }
            return;
        }
        
        const listeners = this.events.get(eventName);
        const listenersToRemove = [];
        
        if (this.debugMode) {
            console.log(`Emitting async event '${eventName}'to ${listeners.length} listeners`);
        }
        
        // Execute listeners asynchronously
        const promises = listeners.map(async (listener) => {
            try {
                await listener.callback(data);
                
                // Mark one-time listeners for removal
                if (listener.once) {
                    listenersToRemove.push(listener.id);
                }
            } catch (error) {
                console.error(`Error in async event listener for '${eventName}':`, error);
            }
        });
        
        // Wait for all listeners to complete
        await Promise.all(promises);
        
        // Remove one-time listeners
        listenersToRemove.forEach(listenerId => {
            this.off(eventName, listenerId);
        });
    }
    
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(eventName) {
        if (this.events.has(eventName)) {
            this.events.delete(eventName);
            
            if (this.debugMode) {
                console.log(`Removed all listeners for event '${eventName}'`);
            }
        }
    }
    
    /**
     * Get listener count for an event
     */
    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }
    
    /**
     * Get all event names
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }
    
    /**
     * Generate unique listener ID
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`Debug mode ${enabled ? 'enabled': 'disabled'}`);
    }
    
    /**
     * Get event bus statistics
     */
    getStats() {
        const totalListeners = Array.from(this.events.values()).reduce((total, listeners) => total + listeners.length, 0);
        
        return {
            totalEvents: this.events.size,
            totalListeners: totalListeners,
            maxListeners: this.maxListeners,
            debugMode: this.debugMode,
            events: Array.from(this.events.entries()).map(([name, listeners]) => ({
                name,
                listenerCount: listeners.length
            }))
        };
    }
    
    /**
     * Clear all events and listeners
     */
    clear() {
        this.events.clear();
        console.log('Event bus cleared');
    }
    
    /**
     * Create a namespaced event emitter
     */
    createNamespace(namespace) {
        return {
            on: (eventName, callback, options) => this.on(`${namespace}:${eventName}`, callback, options),
            once: (eventName, callback, options) => this.once(`${namespace}:${eventName}`, callback, options),
            off: (eventName, listenerId) => this.off(`${namespace}:${eventName}`, listenerId),
            emit: (eventName, data) => this.emit(`${namespace}:${eventName}`, data),
            emitAsync: (eventName, data) => this.emitAsync(`${namespace}:${eventName}`, data),
            removeAllListeners: (eventName) => this.removeAllListeners(`${namespace}:${eventName}`),
            getListenerCount: (eventName) => this.getListenerCount(`${namespace}:${eventName}`)
        };
    }
}

// Common event names used throughout the application
const BECMI_EVENTS = {
    // Authentication events
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    USER_REGISTER: 'user:register',
    
    // Character events
    CHARACTER_CREATED: 'character:created',
    CHARACTER_UPDATED: 'character:updated',
    CHARACTER_DELETED: 'character:deleted',
    CHARACTER_SELECTED: 'character:selected',
    
    // Session events
    SESSION_CREATED: 'session:created',
    SESSION_UPDATED: 'session:updated',
    SESSION_DELETED: 'session:deleted',
    SESSION_JOINED: 'session:joined',
    SESSION_LEFT: 'session:left',
    
    // UI events
    VIEW_LOADED: 'view:loaded',
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    NOTIFICATION_SHOWN: 'notification:shown',
    
    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_UPDATED: 'data:updated',
    DATA_ERROR: 'data:error',
    
    // System events
    APP_INITIALIZED: 'app:initialized',
    APP_ERROR: 'app:error',
    NETWORK_ERROR: 'network:error'};
