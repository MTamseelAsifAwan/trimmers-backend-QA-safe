// src/utils/helpers.js
const crypto = require('crypto');

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
const generateRandomString = (length = 32) => {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

/**
 * Hash a string using SHA-256
 * @param {string} str - String to hash
 * @returns {string} - Hashed string
 */
const hashString = (str) => {
    return crypto
        .createHash('sha256')
        .update(str)
        .digest('hex');
};

/**
 * Format date to ISO string without milliseconds
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
    return date instanceof Date
        ? date.toISOString().split('.')[0] + 'Z'
        : null;
};

/**
 * Parse time string to hours and minutes
 * @param {string} timeStr - Time string in format "HH:MM"
 * @returns {Object|null} - Object with hours and minutes, or null if invalid
 */
const parseTimeString = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') {
        return null;
    }
    const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
        return null;
    }
    return {
        hour: parseInt(match[1], 10),
        minute: parseInt(match[2], 10)
    };
};

/**
 * Format time object to string
 * @param {Object} time - Time object with hours and minutes
 * @returns {string|null} - Time string in format "HH:MM", or null if invalid
 */
const formatTimeObject = (time) => {
    if (!time || typeof time !== 'object' ||
        typeof time.hour !== 'number' || typeof time.minute !== 'number') {
        return null;
    }

    const hour = time.hour.toString().padStart(2, '0');
    const minute = time.minute.toString().padStart(2, '0');

    return `${hour}:${minute}`;
};

/**
 * Calculate time difference in minutes
 * @param {Object} time1 - First time object with hours and minutes
 * @param {Object} time2 - Second time object with hours and minutes
 * @returns {number|null} - Time difference in minutes, or null if invalid
 */
const getTimeDifferenceInMinutes = (time1, time2) => {
    if (!time1 || !time2 ||
        typeof time1 !== 'object' || typeof time2 !== 'object' ||
        typeof time1.hour !== 'number' || typeof time1.minute !== 'number' ||
        typeof time2.hour !== 'number' || typeof time2.minute !== 'number') {
        return null;
    }

    const minutes1 = time1.hour * 60 + time1.minute;
    const minutes2 = time2.hour * 60 + time2.minute;

    return Math.abs(minutes2 - minutes1);
};

/**
 * Check if a time is within a range
 * @param {Object} time - Time object with hours and minutes
 * @param {Object} startTime - Start time object with hours and minutes
 * @param {Object} endTime - End time object with hours and minutes
 * @returns {boolean|null} - Whether time is within range, or null if invalid
 */
const isTimeWithinRange = (time, startTime, endTime) => {
    if (!time || !startTime || !endTime) {
        return null;
    }

    const timeMinutes = time.hour * 60 + time.minute;
    const startMinutes = startTime.hour * 60 + startTime.minute;
    const endMinutes = endTime.hour * 60 + endTime.minute;

    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
};

/**
 * Calculate pagination values
 * @param {number} page - Page number (starting from 1)
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} - Pagination object
 */
const calculatePagination = (page = 1, limit = 10, total = 0) => {
    const currentPage = Math.max(1, page);
    const itemsPerPage = Math.max(1, limit);
    const totalPages = Math.ceil(total / itemsPerPage);
    const skip = (currentPage - 1) * itemsPerPage;

    return {
        page: currentPage,
        limit: itemsPerPage,
        skip,
        total,
        pages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
    };
};

/**
 * Sanitize an object by removing sensitive fields
 * @param {Object} obj - Object to sanitize
 * @param {Array} fieldsToRemove - Fields to remove
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj, fieldsToRemove = ['password', 'token', 'secret']) => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const sanitized = { ...obj };

    fieldsToRemove.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
            delete sanitized[field];
        }
    });

    return sanitized;
};

/**
 * Remove undefined and null values from an object
 * @param {Object} obj - Object to clean
 * @returns {Object} - Cleaned object
 */
const removeEmptyValues = (obj) => {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const cleaned = { ...obj };

    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined || cleaned[key] === null) {
            delete cleaned[key];
        }
    });

    return cleaned;
};

const convertFileToUrl = (file) => {
    if (!file || !file.buffer) {
        return null;
    }
    const buffer = file.buffer;
    const mimeType = file.mimetype;
    const uri = `data:${mimeType};base64,${buffer.toString('base64')}`;
    return uri;
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
};

/**
 * Generates a random password with specific requirements:
 * - One capital letter
 * - One special character
 * - One numeric character
 * - Length: 10 characters
 * @returns {string} Generated password
 */
const generateRandomPassword = () => {
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numericChars = '0123456789';
    const specialChars = '!@#$%&*?';

    // Ensure we have at least one of each required character type
    const randomLower = lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
    const randomUpper = uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
    const randomNumber = numericChars[Math.floor(Math.random() * numericChars.length)];
    const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];

    // Combine all character sets for filling remaining positions
    const allChars = lowercaseChars + uppercaseChars + numericChars + specialChars;

    // Create password array with guaranteed characters
    const passwordArray = [randomLower, randomUpper, randomNumber, randomSpecial];

    // Fill remaining 6 positions with random characters
    for (let i = 4; i < 10; i++) {
        passwordArray.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }

    // Shuffle the array to randomize positions
    for (let i = passwordArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    return passwordArray.join('');
};

module.exports = {
    generateRandomString,
    hashString,
    formatDate,
    parseTimeString,
    formatTimeObject,
    getTimeDifferenceInMinutes,
    isTimeWithinRange,
    calculatePagination,
    sanitizeObject,
    removeEmptyValues,
    convertFileToUrl,
    calculateDistance,
    generateRandomPassword
};