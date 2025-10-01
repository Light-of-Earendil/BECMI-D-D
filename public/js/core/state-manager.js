/**
 * BECMI D&D Character Manager - State Manager
 * 
 * Centralized state management for the application. Provides a single source
 * of truth for application state with change tracking and event emission.
 */

class StateManager {
    constructor(initialState = {}) {
        this.state = { ...initialState };
        this.listeners = new Map();
        this.changeHistory = [];
        this.maxHistorySize = 50;
        
        console.log('State Manager initialized');
    }
    
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    
    /**
     * Get a specific state property
     */
    getStateProperty(key) {
        return this.state[key];
    }
    
    /**
     * Update state with new values
     */
    updateState(newState) {
        const previousState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // Track changes
        this.trackChanges(previousState, this.state);
        
        // Notify listeners
        this.notifyListeners(this.state, previousState);
        
        console.log('State updated:', this.state);
    }
    
    /**
     * Set a specific state property
     */
    setStateProperty(key, value) {
        const previousState = { ...this.state };
        this.state[key] = value;
        
        // Track changes
        this.trackChanges(previousState, this.state);
        
        // Notify listeners
        this.notifyListeners(this.state, previousState);
        
        console.log(`State property '${key}'updated:`, value);
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key).add(callback);
        
        console.log(`Subscribed to state changes for '${key}'`);
        
        // Return unsubscribe function
        return () => {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                keyListeners.delete(callback);
                if (keyListeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }
    
    /**
     * Subscribe to specific state property changes
     */
    subscribeToProperty(propertyPath, callback) {
        const unsubscribe = this.subscribe(propertyPath, callback);
        
        // Call callback immediately with current value
        const currentValue = this.getNestedProperty(propertyPath);
        callback(currentValue, currentValue);
        
        return unsubscribe;
    }
    
    /**
     * Get nested property value using dot notation
     */
    getNestedProperty(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }
    
    /**
     * Set nested property value using dot notation
     */
    setNestedProperty(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this.state);
        
        target[lastKey] = value;
        
        // Track changes
        this.trackChanges({}, this.state);
        
        // Notify listeners
        this.notifyListeners(this.state, {});
    }
    
    /**
     * Track state changes for debugging and history
     */
    trackChanges(previousState, newState) {
        const changes = this.detectChanges(previousState, newState);
        
        if (changes.length > 0) {
            const changeRecord = {
                timestamp: new Date(),
                changes: changes,
                previousState: previousState,
                newState: newState
            };
            
            this.changeHistory.push(changeRecord);
            
            // Limit history size
            if (this.changeHistory.length > this.maxHistorySize) {
                this.changeHistory.shift();
            }
            
            console.log('State changes detected:', changes);
        }
    }
    
    /**
     * Detect changes between two state objects
     */
    detectChanges(previousState, newState) {
        const changes = [];
        
        // Check for added or modified properties
        for (const key in newState) {
            if (!(key in previousState) || previousState[key] !== newState[key]) {
                changes.push({
                    type: key in previousState ? 'modified': 'added',
                    key: key,
                    oldValue: previousState[key],
                    newValue: newState[key]
                });
            }
        }
        
        // Check for removed properties
        for (const key in previousState) {
            if (!(key in newState)) {
                changes.push({
                    type: 'removed',
                    key: key,
                    oldValue: previousState[key],
                    newValue: undefined
                });
            }
        }
        
        return changes;
    }
    
    /**
     * Notify all listeners of state changes
     */
    notifyListeners(newState, previousState) {
        // Notify global listeners
        const globalListeners = this.listeners.get('*');
        if (globalListeners) {
            globalListeners.forEach(callback => {
                try {
                    callback(newState, previousState);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        }
        
        // Notify specific property listeners
        const changes = this.detectChanges(previousState, newState);
        changes.forEach(change => {
            const listeners = this.listeners.get(change.key);
            if (listeners) {
                listeners.forEach(callback => {
                    try {
                        callback(change.newValue, change.oldValue);
                    } catch (error) {
                        console.error('State listener error:', error);
                    }
                });
            }
        });
    }
    
    /**
     * Reset state to initial values
     */
    resetState() {
        const previousState = { ...this.state };
        this.state = {};
        
        this.trackChanges(previousState, this.state);
        this.notifyListeners(this.state, previousState);
        
        console.log('State reset');
    }
    
    /**
     * Get change history
     */
    getChangeHistory() {
        return [...this.changeHistory];
    }
    
    /**
     * Clear change history
     */
    clearChangeHistory() {
        this.changeHistory = [];
        console.log('Change history cleared');
    }
    
    /**
     * Create a state snapshot for debugging
     */
    createSnapshot() {
        return {
            timestamp: new Date(),
            state: { ...this.state },
            historySize: this.changeHistory.length,
            listenerCount: Array.from(this.listeners.values()).reduce((total, set) => total + set.size, 0)
        };
    }
    
    /**
     * Validate state structure
     */
    validateState() {
        const errors = [];
        
        // Check required properties
        const requiredProperties = ['user', 'characters', 'sessions'];
        requiredProperties.forEach(prop => {
            if (!(prop in this.state)) {
                errors.push(`Missing required property: ${prop}`);
            }
        });
        
        // Validate user object
        if (this.state.user && typeof this.state.user !== 'object') {
            errors.push('User must be an object');
        }
        
        // Validate arrays
        if (this.state.characters && !Array.isArray(this.state.characters)) {
            errors.push('Characters must be an array');
        }
        
        if (this.state.sessions && !Array.isArray(this.state.sessions)) {
            errors.push('Sessions must be an array');
        }
        
        if (errors.length > 0) {
            console.error('State validation errors:', errors);
            return false;
        }
        
        return true;
    }
    
    /**
     * Get state statistics for debugging
     */
    getStateStats() {
        return {
            totalProperties: Object.keys(this.state).length,
            changeHistorySize: this.changeHistory.length,
            activeListeners: Array.from(this.listeners.values()).reduce((total, set) => total + set.size, 0),
            memoryUsage: JSON.stringify(this.state).length,
            lastChange: this.changeHistory.length > 0 ? this.changeHistory[this.changeHistory.length - 1].timestamp : null
        };
    }
}

// Export to window for use in other scripts
window.StateManager = StateManager;