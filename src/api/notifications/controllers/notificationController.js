// src/api/notifications/controllers/notificationController.js
const notificationService = require('../../../services/notificationService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get user notifications
 * @route GET /api/notifications
 * @access Private
 */
const getUserNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { page, limit, isRead, type, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            isRead,
            type,
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder || 'desc'
        };

        const result = await notificationService.getUserNotifications(userId, options);

        res.status(200).json({
            success: true,
            data: result.notifications,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get notification by ID
 * @route GET /api/notifications/:id
 * @access Private
 */
const getNotificationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const notification = await notificationService.getNotificationById(id);

        // Check if notification belongs to the authenticated user
        if (notification.userId.toString() !== req.user._id.toString()) {
            throw new ApiError('Unauthorized', 403);
        }

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;

        // First get notification to check ownership
        const notification = await notificationService.getNotificationById(id);

        // Check if notification belongs to the authenticated user
        if (notification.userId.toString() !== req.user._id.toString()) {
            throw new ApiError('Unauthorized', 403);
        }

        const updatedNotification = await notificationService.markAsRead(id);

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: updatedNotification
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/mark-all-read
 * @access Private
 */
const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const count = await notificationService.markAllAsRead(userId);

        res.status(200).json({
            success: true,
            message: `${count} notifications marked as read`,
            count
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;

        // First get notification to check ownership
        const notification = await notificationService.getNotificationById(id);

        // Check if notification belongs to the authenticated user
        if (notification.userId.toString() !== req.user._id.toString()) {
            throw new ApiError('Unauthorized', 403);
        }

        const success = await notificationService.deleteNotification(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } else {
            throw new ApiError('Failed to delete notification', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Delete all notifications
 * @route DELETE /api/notifications
 * @access Private
 */
const deleteAllNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { isRead, type, olderThan } = req.query;

        const options = {
            isRead,
            type,
            olderThan
        };

        const count = await notificationService.deleteAllNotifications(userId, options);

        res.status(200).json({
            success: true,
            message: `${count} notifications deleted`,
            count
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Count unread notifications
 * @route GET /api/notifications/unread/count
 * @access Private
 */
const countUnreadNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const count = await notificationService.countUnreadNotifications(userId);

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Send notification (admin only)
 * @route POST /api/notifications/send
 * @access Private/Admin
 */
const sendNotification = async (req, res, next) => {
    try {
        const { userId, title, message, type, relatedId, onModel } = req.body;

        if (!userId || !title || !message) {
            throw new ApiError('User ID, title, and message are required', 400);
        }

        const notification = await notificationService.createNotification({
            userId,
            title,
            message,
            type: type || 'system',
            relatedId,
            onModel
        });

        res.status(201).json({
            success: true,
            message: 'Notification sent successfully',
            data: notification
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Send system notification to all users (admin only)
 * @route POST /api/notifications/send-to-all
 * @access Private/Admin
 */
const sendToAll = async (req, res, next) => {
    try {
        const { title, message, role } = req.body;

        if (!title || !message) {
            throw new ApiError('Title and message are required', 400);
        }

        const notificationData = {
            title,
            message
        };

        const count = await notificationService.sendSystemNotificationToAll(notificationData, role);

        res.status(200).json({
            success: true,
            message: `Notification sent to ${count} users`,
            count
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserNotifications,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    countUnreadNotifications,
    sendNotification,
    sendToAll
};