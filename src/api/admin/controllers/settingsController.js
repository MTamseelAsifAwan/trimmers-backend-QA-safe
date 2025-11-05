// src/api/admin/controllers/settingsController.js
const settingsService = require('../../../services/settingsService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all application settings
 * @route GET /api/admin/settings
 * @access Private/Admin
 */
const getAllSettings = async (req, res, next) => {
    try {
        const settings = await settingsService.getAllSettings();

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get setting by key
 * @route GET /api/admin/settings/:key
 * @access Private/Admin
 */
const getSettingByKey = async (req, res, next) => {
    try {
        const { key } = req.params;
        const setting = await settingsService.getSettingByKey(key);

        if (!setting) {
            throw new ApiError('Setting not found', 404);
        }

        res.status(200).json({
            success: true,
            data: setting
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update setting
 * @route PUT /api/admin/settings/:key
 * @access Private/Admin
 */
const updateSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;

        if (value === undefined) {
            throw new ApiError('Setting value is required', 400);
        }

        const setting = await settingsService.updateSetting(key, value, description);

        res.status(200).json({
            success: true,
            message: 'Setting updated successfully',
            data: setting
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create setting
 * @route POST /api/admin/settings
 * @access Private/Admin
 */
const createSetting = async (req, res, next) => {
    try {
        const { key, value, description, type } = req.body;

        if (!key || value === undefined || !type) {
            throw new ApiError('Key, value, and type are required', 400);
        }

        // Check if setting already exists
        const existingSetting = await settingsService.getSettingByKey(key);
        if (existingSetting) {
            throw new ApiError('Setting with this key already exists', 409);
        }

        const setting = await settingsService.createSetting(key, value, description, type);

        res.status(201).json({
            success: true,
            message: 'Setting created successfully',
            data: setting
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete setting
 * @route DELETE /api/admin/settings/:key
 * @access Private/Admin
 */
const deleteSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        
        // Check if it's a protected system setting
        const isProtected = await settingsService.isProtectedSetting(key);
        if (isProtected) {
            throw new ApiError('Cannot delete protected system settings', 403);
        }

        const success = await settingsService.deleteSetting(key);

        if (!success) {
            throw new ApiError('Setting not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Setting deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get system information
 * @route GET /api/admin/settings/system-info
 * @access Private/Admin
 */
const getSystemInfo = async (req, res, next) => {
    try {
        const systemInfo = await settingsService.getSystemInfo();

        res.status(200).json({
            success: true,
            data: systemInfo
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get email settings
 * @route GET /api/admin/settings/email
 * @access Private/Admin
 */
const getEmailSettings = async (req, res, next) => {
    try {
        const emailSettings = await settingsService.getEmailSettings();

        res.status(200).json({
            success: true,
            data: emailSettings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update email settings
 * @route PUT /api/admin/settings/email
 * @access Private/Admin
 */
const updateEmailSettings = async (req, res, next) => {
    try {
        const emailSettings = req.body;

        if (!emailSettings) {
            throw new ApiError('Email settings are required', 400);
        }

        const updated = await settingsService.updateEmailSettings(emailSettings);

        res.status(200).json({
            success: true,
            message: 'Email settings updated successfully',
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get payment settings
 * @route GET /api/admin/settings/payment
 * @access Private/Admin
 */
const getPaymentSettings = async (req, res, next) => {
    try {
        const paymentSettings = await settingsService.getPaymentSettings();

        res.status(200).json({
            success: true,
            data: paymentSettings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update payment settings
 * @route PUT /api/admin/settings/payment
 * @access Private/Admin
 */
const updatePaymentSettings = async (req, res, next) => {
    try {
        const paymentSettings = req.body;

        if (!paymentSettings) {
            throw new ApiError('Payment settings are required', 400);
        }

        const updated = await settingsService.updatePaymentSettings(paymentSettings);

        res.status(200).json({
            success: true,
            message: 'Payment settings updated successfully',
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get notification settings
 * @route GET /api/admin/settings/notification
 * @access Private/Admin
 */
const getNotificationSettings = async (req, res, next) => {
    try {
        const notificationSettings = await settingsService.getNotificationSettings();

        res.status(200).json({
            success: true,
            data: notificationSettings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update notification settings
 * @route PUT /api/admin/settings/notification
 * @access Private/Admin
 */
const updateNotificationSettings = async (req, res, next) => {
    try {
        const notificationSettings = req.body;

        if (!notificationSettings) {
            throw new ApiError('Notification settings are required', 400);
        }

        const updated = await settingsService.updateNotificationSettings(notificationSettings);

        res.status(200).json({
            success: true,
            message: 'Notification settings updated successfully',
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Send test email
 * @route POST /api/admin/settings/email/test
 * @access Private/Admin
 */
const sendTestEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new ApiError('Email address is required', 400);
        }

        const result = await settingsService.sendTestEmail(email);

        res.status(200).json({
            success: result,
            message: result ? 'Test email sent successfully' : 'Failed to send test email'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllSettings,
    getSettingByKey,
    updateSetting,
    createSetting,
    deleteSetting,
    getSystemInfo,
    getEmailSettings,
    updateEmailSettings,
    getPaymentSettings,
    updatePaymentSettings,
    getNotificationSettings,
    updateNotificationSettings,
    sendTestEmail
};