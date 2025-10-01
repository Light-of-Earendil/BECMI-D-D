/**
 * BECMI D&D Character Manager - Main Application Entry Point
 * 
 * This file initializes the application and sets up global event handlers.
 */

// Wait for DOM to be ready
$(document).ready(() => {
    console.log('BECMI D&D Character Manager - Starting application...');
    
    // Initialize the main application
    window.becmiApp = new BECMIApp();
    
    // Setup global error handling
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        if (window.becmiApp && window.becmiApp.modules && window.becmiApp.modules.notifications) {
            window.becmiApp.modules.notifications.show('An unexpected error occurred', 'error');
        } else {
            console.error('Unexpected error (notifications not available):', event.error);
        }
    });
    
    // Setup unhandled promise rejection handling
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        if (window.becmiApp && window.becmiApp.modules && window.becmiApp.modules.notifications) {
            window.becmiApp.modules.notifications.show('A network error occurred', 'error');
        } else {
            console.error('Network error (notifications not available):', event.reason);
        }
        event.preventDefault(); // Prevent the default unhandled rejection behavior
    });
    
    // Setup keyboard shortcuts
    $(document).on('keydown', (e) => {
        // Ctrl/Cmd + K for quick character creation
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (window.becmiApp && window.becmiApp.modules && window.becmiApp.modules.characterCreation) {
                window.becmiApp.modules.characterCreation.showModal();
            }
        }
        
        // Ctrl/Cmd + N for new session
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (window.becmiApp && window.becmiApp.modules && window.becmiApp.modules.sessionManagement) {
                window.becmiApp.modules.sessionManagement.showCreationModal();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            $('.modal:visible').hide();
        }
    });
    
    // Setup responsive navigation
    $(window).on('resize', () => {
        // Handle mobile navigation if needed
        if ($(window).width() < 768) {
            $('.main-nav').addClass('mobile-nav');
        } else {
            $('.main-nav').removeClass('mobile-nav');
        }
    });
    
    // Initialize mobile navigation on load
    $(window).trigger('resize');
    
    console.log('BECMI D&D Character Manager initialized successfully');
});

// Global utility functions
window.BECMIUtils = {
    /**
     * Format a number with proper sign
     */
    formatModifier: (value) => {
        return value >= 0 ? `+${value}`: `${value}`;
    },
    
    /**
     * Format ability score with modifier
     */
    formatAbilityScore: (score) => {
        if (window.becmiApp && window.becmiApp.modules && window.becmiApp.modules.rulesEngine) {
            const modifier = window.becmiApp.modules.rulesEngine.getAbilityModifier(score);
            return `${score} (${window.BECMIUtils.formatModifier(modifier)})`;
        } else {
            return `${score}`;
        }
    },
    
    /**
     * Format currency
     */
    formatCurrency: (gp, sp = 0, cp = 0) => {
        let result = '';
        if (gp > 0) result += `${gp} gp`;
        if (sp > 0) result += (result ? ', ': '') + `${sp} sp`;
        if (cp > 0) result += (result ? ', ': '') + `${cp} cp`;
        return result || '0 cp';
    },
    
    /**
     * Format date and time
     */
    formatDateTime: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'});
    },
    
    /**
     * Format relative time
     */
    formatRelativeTime: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return `${Math.abs(diffDays)} days ago`;
        } else if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else {
            return `In ${diffDays} days`;
        }
    },
    
    /**
     * Generate random ability scores (3d6)
     */
    generateRandomAbilityScores: () => {
        const scores = {};
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilities.forEach(ability => {
            scores[ability] = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 3;
        });
        
        return scores;
    },
    
    /**
     * Generate random ability scores (4d6 drop lowest)
     */
    generateRandomAbilityScores4d6: () => {
        const scores = {};
        const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        
        abilities.forEach(ability => {
            const rolls = [
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1
            ];
            rolls.sort((a, b) => b - a); // Sort descending
            scores[ability] = rolls[0] + rolls[1] + rolls[2]; // Take top 3
        });
        
        return scores;
    },
    
    /**
     * Validate ability scores for class requirements
     */
    validateClassRequirements: (scores, classType) => {
        const requirements = {
            'dwarf': { constitution: 9 },
            'elf': { intelligence: 9, constitution: 9 },
            'halfling': { dexterity: 9, constitution: 9 }
        };
        
        const req = requirements[classType];
        if (!req) return { valid: true, errors: [] };
        
        const errors = [];
        Object.keys(req).forEach(ability => {
            if (scores[ability] < req[ability]) {
                errors.push(`${ability} must be at least ${req[ability]} for ${classType}`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },
    
    /**
     * Calculate total weight of items
     */
    calculateTotalWeight: (items) => {
        return items.reduce((total, item) => {
            return total + (item.weight_cn * item.quantity);
        }, 0);
    },
    
    /**
     * Debounce function calls
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function calls
     */
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Global constants
window.BECMIConstants = {
    CLASSES: [
        { value: 'fighter', label: 'Fighter', hitDie: 8 },
        { value: 'cleric', label: 'Cleric', hitDie: 6 },
        { value: 'magic_user', label: 'Magic-User', hitDie: 4 },
        { value: 'thief', label: 'Thief', hitDie: 4 },
        { value: 'dwarf', label: 'Dwarf', hitDie: 8 },
        { value: 'elf', label: 'Elf', hitDie: 6 },
        { value: 'halfling', label: 'Halfling', hitDie: 6 }
    ],
    
    ALIGNMENTS: [
        { value: 'lawful', label: 'Lawful'},
        { value: 'neutral', label: 'Neutral'},
        { value: 'chaotic', label: 'Chaotic'}
    ],
    
    ABILITY_SCORES: [
        { value: 'strength', label: 'Strength', short: 'STR'},
        { value: 'dexterity', label: 'Dexterity', short: 'DEX'},
        { value: 'constitution', label: 'Constitution', short: 'CON'},
        { value: 'intelligence', label: 'Intelligence', short: 'INT'},
        { value: 'wisdom', label: 'Wisdom', short: 'WIS'},
        { value: 'charisma', label: 'Charisma', short: 'CHA'}
    ],
    
    SAVING_THROWS: [
        { value: 'death_ray', label: 'Death Ray'},
        { value: 'magic_wand', label: 'Magic Wand'},
        { value: 'paralysis', label: 'Paralysis'},
        { value: 'dragon_breath', label: 'Dragon Breath'},
        { value: 'spells', label: 'Spells'}
    ],
    
    ENCUMBRANCE_STATUSES: [
        { value: 'unencumbered', label: 'Unencumbered', color: 'success'},
        { value: 'lightly_encumbered', label: 'Lightly Encumbered', color: 'warning'},
        { value: 'heavily_encumbered', label: 'Heavily Encumbered', color: 'warning'},
        { value: 'severely_encumbered', label: 'Severely Encumbered', color: 'error'},
        { value: 'overloaded', label: 'Overloaded', color: 'error'}
    ]
};
