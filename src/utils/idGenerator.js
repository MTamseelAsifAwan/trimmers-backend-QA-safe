// src/utils/idGenerator.js

/**
 * Generates a unique ID with a specific format for database models
 * Format: [prefix][2 letters][8 numbers]
 * Example: US12345678 (for User)
 * 
 * @param {string} prefix - Optional 2-letter prefix for the model type (e.g., 'US' for User)
 * @returns {string} - Generated ID
 */
const generateModelId = (prefix = '') => {
    // Prefix should be 2 uppercase letters (default is empty)
    const prefixStr = prefix.toUpperCase().padEnd(2, 'X').substring(0, 2);

    // Generate 2 random letters
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = Array(2)
        .fill()
        .map(() => letters.charAt(Math.floor(Math.random() * letters.length)))
        .join('');

    // Generate 8 random numbers
    const randomNumbers = Array(8)
        .fill()
        .map(() => Math.floor(Math.random() * 10))
        .join('');

    return `${prefixStr}${randomLetters}${randomNumbers}`;
};

/**
 * Model prefixes for ID generation
 */
const MODEL_PREFIXES = {
    USER: 'US',
    ROLE: 'RO',
    CUSTOMER: 'CU',
    SHOP_OWNER: 'SO',
    BARBER: 'BA',
    FREELANCER: 'FR',
    ADMIN: 'AD',
    SHOP: 'SH',
    SERVICE: 'SV',
    BOOKING: 'BK',
    PAYMENT: 'PY',
    NOTIFICATION: 'NO',
    SHOP_UPDATE_REQUEST: 'SUR'
};

module.exports = {
    generateModelId,
    MODEL_PREFIXES
};