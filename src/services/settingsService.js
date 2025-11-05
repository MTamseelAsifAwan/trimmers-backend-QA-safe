// src/services/settingsService.js
const Setting = require('../models/Setting');
const os = require('os');
const logger = require('../utils/logger');

/**
 * Setting Service for managing application settings
 */
class SettingsService {
    /**
     * Get all settings
     * @returns {Promise<Array>} - List of all settings
     */
    async getAllSettings() {
        try {
            return await Setting.find().sort({ key: 1 });
        } catch (error) {
            logger.error(`Get all settings error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get setting by key
     * @param {string} key - Setting key
     * @returns {Promise<Object>} - Setting object
     */
    async getSettingByKey(key) {
        try {
            return await Setting.findOne({ key });
        } catch (error) {
            logger.error(`Get setting by key error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Create a new setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     * @param {string} description - Setting description
     * @param {string} type - Setting type (string, number, boolean, json)
     * @returns {Promise<Object>} - Created setting
     */
    async createSetting(key, value, description, type) {
        try {
            const setting = new Setting({
                key,
                value,
                description: description || '',
                type: type || this._detectType(value)
            });
            
            return await setting.save();
        } catch (error) {
            logger.error(`Create setting error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update setting
     * @param {string} key - Setting key
     * @param {*} value - New setting value
     * @param {string} description - New setting description (optional)
     * @returns {Promise<Object>} - Updated setting
     */
    async updateSetting(key, value, description) {
        try {
            const setting = await Setting.findOne({ key });
            
            if (!setting) {
                // Create setting if it doesn't exist
                return this.createSetting(key, value, description);
            }
            
            // Update fields
            setting.value = value;
            if (description) setting.description = description;
            
            return await setting.save();
        } catch (error) {
            logger.error(`Update setting error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Delete setting
     * @param {string} key - Setting key
     * @returns {Promise<boolean>} - Success status
     */
    async deleteSetting(key) {
        try {
            const result = await Setting.deleteOne({ key });
            return result.deletedCount > 0;
        } catch (error) {
            logger.error(`Delete setting error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Check if setting is protected (system setting)
     * @param {string} key - Setting key
     * @returns {Promise<boolean>} - Whether setting is protected
     */
    async isProtectedSetting(key) {
        const protectedSettings = [
            'system.version',
            'system.name',
            'system.environment',
            'email.from',
            'payment.currency',
            'payment.commissionRate',
            'booking.maxDaysInAdvance',
            'booking.minHoursBeforeCancel'
        ];
        
        return protectedSettings.includes(key);
    }
    
    /**
     * Get system information
     * @returns {Promise<Object>} - System information
     */
    async getSystemInfo() {
        try {
            const systemVersion = await this.getSettingByKey('system.version') || { value: '1.0.0' };
            const systemName = await this.getSettingByKey('system.name') || { value: 'Barber Shop App' };
            
            return {
                version: systemVersion.value,
                name: systemName.value,
                environment: process.env.NODE_ENV || 'development',
                serverUptime: Math.floor(process.uptime()),
                systemUptime: Math.floor(os.uptime()),
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                cpuInfo: os.cpus()[0].model,
                cpuCores: os.cpus().length,
                osType: os.type(),
                osPlatform: os.platform(),
                osRelease: os.release(),
                nodeVersion: process.version
            };
        } catch (error) {
            logger.error(`Get system info error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get email settings
     * @returns {Promise<Object>} - Email settings
     */
    async getEmailSettings() {
        try {
            const [
                emailFrom,
                emailSmtpHost,
                emailSmtpPort,
                emailSmtpSecure,
                emailNotifications
            ] = await Promise.all([
                this.getSettingByKey('email.from'),
                this.getSettingByKey('email.smtp.host'),
                this.getSettingByKey('email.smtp.port'),
                this.getSettingByKey('email.smtp.secure'),
                this.getSettingByKey('email.notifications')
            ]);
            
            return {
                from: emailFrom?.value || 'noreply@trimmers.shop',
                smtp: {
                    host: emailSmtpHost?.value || '',
                    port: emailSmtpPort?.value || 587,
                    secure: emailSmtpSecure?.value || false
                },
                notifications: emailNotifications?.value || true
            };
        } catch (error) {
            logger.error(`Get email settings error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update email settings
     * @param {Object} settings - Email settings object
     * @returns {Promise<Object>} - Updated email settings
     */
    async updateEmailSettings(settings) {
        try {
            const updatePromises = [];
            
            if (settings.from) {
                updatePromises.push(this.updateSetting('email.from', settings.from, 'Default sender email address'));
            }
            
            if (settings.smtp) {
                if (settings.smtp.host !== undefined) {
                    updatePromises.push(this.updateSetting('email.smtp.host', settings.smtp.host, 'SMTP server hostname'));
                }
                
                if (settings.smtp.port !== undefined) {
                    updatePromises.push(this.updateSetting('email.smtp.port', settings.smtp.port, 'SMTP server port'));
                }
                
                if (settings.smtp.secure !== undefined) {
                    updatePromises.push(this.updateSetting('email.smtp.secure', settings.smtp.secure, 'Whether to use TLS'));
                }
            }
            
            if (settings.notifications !== undefined) {
                updatePromises.push(this.updateSetting('email.notifications', settings.notifications, 'Enable email notifications'));
            }
            
            await Promise.all(updatePromises);
            
            return this.getEmailSettings();
        } catch (error) {
            logger.error(`Update email settings error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get payment settings
     * @returns {Promise<Object>} - Payment settings
     */
    async getPaymentSettings() {
        try {
            const [
                currency,
                commissionRate,
                stripeEnabled,
                cashEnabled,
                walletEnabled
            ] = await Promise.all([
                this.getSettingByKey('payment.currency'),
                this.getSettingByKey('payment.commissionRate'),
                this.getSettingByKey('payment.stripe.enabled'),
                this.getSettingByKey('payment.cash.enabled'),
                this.getSettingByKey('payment.wallet.enabled')
            ]);
            
            return {
                currency: currency?.value || 'USD',
                commissionRate: commissionRate?.value || 10,
                methods: {
                    stripe: stripeEnabled?.value || true,
                    cash: cashEnabled?.value || true,
                    wallet: walletEnabled?.value || false
                }
            };
        } catch (error) {
            logger.error(`Get payment settings error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update payment settings
     * @param {Object} settings - Payment settings object
     * @returns {Promise<Object>} - Updated payment settings
     */
    async updatePaymentSettings(settings) {
        try {
            const updatePromises = [];
            
            if (settings.currency) {
                updatePromises.push(this.updateSetting('payment.currency', settings.currency, 'Default currency'));
            }
            
            if (settings.commissionRate !== undefined) {
                updatePromises.push(this.updateSetting('payment.commissionRate', settings.commissionRate, 'Platform commission rate (%)'));
            }
            
            if (settings.methods) {
                if (settings.methods.stripe !== undefined) {
                    updatePromises.push(this.updateSetting('payment.stripe.enabled', settings.methods.stripe, 'Enable Stripe payments'));
                }
                
                if (settings.methods.cash !== undefined) {
                    updatePromises.push(this.updateSetting('payment.cash.enabled', settings.methods.cash, 'Enable cash payments'));
                }
                
                if (settings.methods.wallet !== undefined) {
                    updatePromises.push(this.updateSetting('payment.wallet.enabled', settings.methods.wallet, 'Enable wallet payments'));
                }
            }
            
            await Promise.all(updatePromises);
            
            return this.getPaymentSettings();
        } catch (error) {
            logger.error(`Update payment settings error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Get notification settings
     * @returns {Promise<Object>} - Notification settings
     */
    async getNotificationSettings() {
        try {
            const [
                inAppEnabled,
                emailEnabled,
                pushEnabled,
                bookingReminderHours
            ] = await Promise.all([
                this.getSettingByKey('notification.inApp.enabled'),
                this.getSettingByKey('notification.email.enabled'),
                this.getSettingByKey('notification.push.enabled'),
                this.getSettingByKey('notification.bookingReminder.hours')
            ]);
            
            return {
                inApp: inAppEnabled?.value !== false, // Default to true
                email: emailEnabled?.value || false,
                push: pushEnabled?.value || false,
                bookingReminderHours: bookingReminderHours?.value || 24
            };
        } catch (error) {
            logger.error(`Get notification settings error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Update notification settings
     * @param {Object} settings - Notification settings object
     * @returns {Promise<Object>} - Updated notification settings
     */
    async updateNotificationSettings(settings) {
        try {
            const updatePromises = [];
            
            if (settings.inApp !== undefined) {
                updatePromises.push(this.updateSetting('notification.inApp.enabled', settings.inApp, 'Enable in-app notifications'));
            }
            
            if (settings.email !== undefined) {
                updatePromises.push(this.updateSetting('notification.email.enabled', settings.email, 'Enable email notifications'));
            }
            
            if (settings.push !== undefined) {
                updatePromises.push(this.updateSetting('notification.push.enabled', settings.push, 'Enable push notifications'));
            }
            
            if (settings.bookingReminderHours !== undefined) {
                updatePromises.push(this.updateSetting('notification.bookingReminder.hours', settings.bookingReminderHours, 'Hours before booking to send reminder'));
            }
            
            await Promise.all(updatePromises);
            
            return this.getNotificationSettings();
        } catch (error) {
            logger.error(`Update notification settings error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Send test email
     * @param {string} email - Recipient email address
     * @returns {Promise<boolean>} - Success status
     */
    async sendTestEmail(email) {
        try {
            // This is a placeholder. In a real application, you would use your email service
            logger.info(`Sending test email to ${email}`);
            
            // Simulate email sending
            return true;
        } catch (error) {
            logger.error(`Send test email error: ${error.message}`);
            return false;
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

module.exports = new SettingsService();