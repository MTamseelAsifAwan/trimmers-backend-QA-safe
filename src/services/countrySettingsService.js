// src/services/countrySettingsService.js
const Country = require('../models/Country');
const Setting = require('../models/Setting');
const logger = require('../utils/logger');

class CountrySettingsService {
    /**
     * Get settings for a specific country
     * @param {string} countryId - Country ID
     * @returns {Promise<Object>} - Country settings
     */
    async getCountrySettings(countryId) {
        try {
            // Get country
            const country = await Country.findById(countryId);
            if (!country) {
                throw new Error('Country not found');
            }

            // Get country-specific settings
            const settingsQuery = { key: { $regex: `^country.${country.code.toLowerCase()}.` } };
            const countrySettings = await Setting.find(settingsQuery);

            // Transform to key-value object
            const settings = {};
            countrySettings.forEach(setting => {
                // Extract actual key without prefix
                const keyParts = setting.key.split('.');
                // Remove 'country' and country code from key
                const actualKey = keyParts.slice(2).join('.');
                settings[actualKey] = setting.value;
            });

            // Add country info
            settings.info = {
                id: country._id,
                name: country.name,
                code: country.code,
                currency: country.currency,
                timezone: country.timeZone
            };

            return settings;
        } catch (error) {
            logger.error(`Get country settings error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update settings for a specific country
     * @param {string} countryId - Country ID
     * @param {Object} settings - Settings to update
     * @returns {Promise<Object>} - Updated settings
     */
    async updateCountrySettings(countryId, settings) {
        try {
            // Get country
            const country = await Country.findById(countryId);
            if (!country) {
                throw new Error('Country not found');
            }

            const updatePromises = [];

            // Update each setting
            for (const [key, value] of Object.entries(settings)) {
                // Create country-specific key
                const settingKey = `country.${country.code.toLowerCase()}.${key}`;

                // Update or create setting
                updatePromises.push(
                    Setting.findOneAndUpdate(
                        { key: settingKey },
                        {
                            key: settingKey,
                            value,
                            type: this._detectType(value),
                            description: `Country setting for ${country.name}`
                        },
                        { upsert: true, new: true }
                    )
                );
            }

            await Promise.all(updatePromises);

            return this.getCountrySettings(countryId);
        } catch (error) {
            logger.error(`Update country settings error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Detect value type
     * @param {*} value - Value to detect type of
     * @returns {string} - Type of value (string, number, boolean, json)
     * @private
     */
    _detectType(value) {
        if (typeof value === 'string') return 'string';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'object') return 'json';
        return 'string';
    }
}

module.exports = new CountrySettingsService();