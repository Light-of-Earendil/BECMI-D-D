/**
 * BECMI D&D Character Manager - Utility Functions
 * 
 * Centralized utility functions used across the application.
 */

/**
 * Escape HTML to prevent XSS attacks
 * 
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML-safe text
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Resolve BECMI armor/shield display values for UI.
 * Armor has a fixed descending AC value. Shields improve AC by subtracting 1.
 *
 * @param {Object} item - Equipment item
 * @returns {Object} Display metadata
 */
function getBECMIArmorDisplay(item) {
    const empty = {
        kind: null,
        label: '',
        detailLabel: '',
        detailValue: '',
        effectiveArmorClass: null,
        shieldAdjustment: null
    };

    if (!item || typeof item !== 'object') {
        return empty;
    }

    const magicalBonus = Math.max(0, Number(item.magical_bonus || 0));
    const baseArmorClass = resolveBECMIArmorClass(item);

    if (baseArmorClass !== null) {
        const effectiveArmorClass = baseArmorClass - magicalBonus;
        return {
            kind: 'armor',
            label: `AC ${effectiveArmorClass}`,
            detailLabel: 'Armor Class',
            detailValue: `${effectiveArmorClass}`,
            effectiveArmorClass,
            shieldAdjustment: null
        };
    }

    if (isBECMIShield(item)) {
        const shieldAdjustment = -(1 + magicalBonus);
        return {
            kind: 'shield',
            label: `Shield ${shieldAdjustment} AC`,
            detailLabel: 'Shield Adjustment',
            detailValue: `${shieldAdjustment} AC`,
            effectiveArmorClass: null,
            shieldAdjustment
        };
    }

    return empty;
}

function resolveBECMIArmorClass(item) {
    if (!item || item.item_type !== 'armor') {
        return null;
    }

    const name = String(item.custom_name || item.name || '').toLowerCase();
    const itemCategory = String(item.item_category || '').toLowerCase();
    const armorType = String(item.armor_type || '').toLowerCase();
    const description = String(item.description || '').toLowerCase();
    const haystack = [name, itemCategory, armorType, description].join(' ');

    if (haystack.includes('suit armor') || haystack.includes('suit armour') || itemCategory === 'suit' || armorType === 'suit') {
        return 0;
    }

    if (haystack.includes('plate mail') || haystack.includes('plate armor') || haystack.includes('plate armour') || itemCategory === 'plate' || armorType === 'plate') {
        return 3;
    }

    if (haystack.includes('banded mail') || haystack.includes('banded armor') || haystack.includes('banded armour') || itemCategory === 'banded' || armorType === 'banded') {
        return 4;
    }

    if (haystack.includes('scale mail') || haystack.includes('scale armor') || haystack.includes('scale armour') || itemCategory === 'scale' || armorType === 'scale') {
        return 6;
    }

    if (haystack.includes('chain mail') || itemCategory === 'chain' || armorType === 'chain') {
        return 5;
    }

    if (haystack.includes('leather armor') || haystack.includes('leather armour') || itemCategory === 'leather' || armorType === 'leather') {
        return 7;
    }

    const rawArmorClass = Number(item.ac_bonus);
    if (Number.isFinite(rawArmorClass) && [0, 3, 4, 5, 6, 7, 9].includes(rawArmorClass)) {
        return rawArmorClass;
    }

    return null;
}

function isBECMIShield(item) {
    if (!item || typeof item !== 'object') {
        return false;
    }

    return item.item_type === 'shield' || item.item_category === 'shield';
}

/**
 * Format relative time (e.g., "2 hours ago")
 * 
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted relative time
 */
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}
