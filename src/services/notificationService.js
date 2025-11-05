// src/services/notificationService.js
const Notification = require('../models/Notification');
const { User } = require('../models/User');
const logger = require('../utils/logger');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * NotificationService provides methods for notification management
 */
class NotificationService {
    /**
     * Create a new notification
     * @param {Object} notificationData - Notification data
     * @returns {Promise<Object>} - Created notification
     */
    async createNotification(notificationData) {
        try {
            // Validate required fields
            if (!notificationData.userId) {
                throw new ApiError('User ID is required for notification', 400);
            }
            if (!notificationData.title) {
                throw new ApiError('Notification title is required', 400);
            }
            if (!notificationData.message) {
                throw new ApiError('Notification message is required', 400);
            }

            // Normalize userId - handle both string and object formats
            let userId;
            if (typeof notificationData.userId === 'string') {
                userId = notificationData.userId;
            } else if (typeof notificationData.userId === 'object' && notificationData.userId !== null) {
                userId = notificationData.userId._id || notificationData.userId.id || notificationData.userId.toString();
            } else {
                userId = notificationData.userId;
            }

            // Ensure userId is a string
            if (userId && typeof userId !== 'string') {
                userId = userId.toString();
            }

            // Validate userId format (should be valid ObjectId)
            try {
                if (typeof userId === 'string' && userId.length === 24) {
                    // Valid ObjectId format
                    logger.info(`Creating notification for user: ${userId}`);
                } else {
                    logger.error(`Invalid user ID format: ${userId}`);
                    throw new ApiError('Invalid user ID format', 400);
                }
            } catch (err) {
                if (err instanceof ApiError) throw err;
                logger.error(`Failed to validate user ID format: ${err.message}`);
                throw new ApiError('Invalid user ID format', 400);
            }

            // Create notification
            const notification = new Notification({
                userId: notificationData.userId,
                title: notificationData.title,
                message: notificationData.message,
                type: notificationData.type || 'system',
                relatedId: notificationData.relatedId || null,
                onModel: notificationData.onModel || null,
                bookingId: notificationData.bookingId || null
            });

            await notification.save();

            // In a real application, you would also send the notification
            // via WebSocket, FCM for mobile, etc.
            this._sendRealTimeNotification(notification);

            return notification;
        } catch (error) {
            logger.error(`Create notification error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get notifications for a user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of notifications
     */
    async getUserNotifications(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                isRead,
                type,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build filter
            const filter = { userId };

            if (isRead !== undefined) {
                filter.isRead = isRead === 'true' || isRead === true;
            }

            if (type) {
                filter.type = type;
            }

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Get total count
            const total = await Notification.countDocuments(filter);

            // Get notifications
            const notifications = await Notification.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));

            return {
                notifications,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get user notifications error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get notification by ID
     * @param {string} id - Notification ID
     * @returns {Promise<Object>} - Notification data
     */
    async getNotificationById(id) {
        try {
            const notification = await Notification.findById(id);

            if (!notification) {
                throw new Error('Notification not found');
            }

            return notification;
        } catch (error) {
            logger.error(`Get notification by ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get notification by UID
     * @param {string} uid - Notification UID
     * @returns {Promise<Object>} - Notification data
     */
    async getNotificationByUid(uid) {
        try {
            const notification = await Notification.findOne({ uid });

            if (!notification) {
                throw new Error('Notification not found');
            }

            return notification;
        } catch (error) {
            logger.error(`Get notification by UID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     * @returns {Promise<Object>} - Updated notification
     */
    async markAsRead(id) {
        try {
            const notification = await Notification.findById(id);

            if (!notification) {
                throw new Error('Notification not found');
            }

            notification.isRead = true;
            await notification.save();

            return notification;
        } catch (error) {
            logger.error(`Mark notification as read error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Mark all notifications as read for a user
     * @param {string} userId - User ID
     * @returns {Promise<number>} - Number of updated notifications
     */
    async markAllAsRead(userId) {
        try {
            const result = await Notification.updateMany(
                { userId, isRead: false },
                { $set: { isRead: true } }
            );

            return result.nModified || 0;
        } catch (error) {
            logger.error(`Mark all notifications as read error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete notification
     * @param {string} id - Notification ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteNotification(id) {
        try {
            const result = await Notification.findByIdAndDelete(id);
            return !!result;
        } catch (error) {
            logger.error(`Delete notification error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete all notifications for a user
     * @param {string} userId - User ID
     * @param {Object} options - Delete options
     * @returns {Promise<number>} - Number of deleted notifications
     */
    async deleteAllNotifications(userId, options = {}) {
        try {
            const { isRead, type, olderThan } = options;

            // Build filter
            const filter = { userId };

            if (isRead !== undefined) {
                filter.isRead = isRead === 'true' || isRead === true;
            }

            if (type) {
                filter.type = type;
            }

            if (olderThan) {
                filter.createdAt = { $lt: new Date(olderThan) };
            }

            const result = await Notification.deleteMany(filter);
            return result.deletedCount || 0;
        } catch (error) {
            logger.error(`Delete all notifications error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Count unread notifications for a user
     * @param {string} userId - User ID
     * @returns {Promise<number>} - Count of unread notifications
     */
    async countUnreadNotifications(userId) {
        try {
            return await Notification.countDocuments({
                userId,
                isRead: false
            });
        } catch (error) {
            logger.error(`Count unread notifications error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send booking-related notification
     * @param {string} userId - User ID to notify
     * @param {Object} booking - Booking data
     * @param {string} action - Action type (created, confirmed, etc.)
     * @returns {Promise<Object>} - Created notification
     */
    async sendBookingNotification(userId, booking, action) {
        try {
            const titleMap = {
                created: 'New Booking Request',
                confirmed: 'Booking Confirmed',
                completed: 'Booking Completed',
                cancelled: 'Booking Cancelled',
                updated: 'Booking Updated',
                reminder: 'Booking Reminder'
            };

            const messageMap = {
                created: `You have a new booking request for ${booking.serviceName} on ${this._formatBookingDate(booking.bookingDate)}`,
                confirmed: `Your booking for ${booking.serviceName} on ${this._formatBookingDate(booking.bookingDate)} has been confirmed`,
                completed: `Your booking for ${booking.serviceName} has been marked as completed`,
                cancelled: `Your booking for ${booking.serviceName} on ${this._formatBookingDate(booking.bookingDate)} has been cancelled`,
                updated: `Your booking for ${booking.serviceName} on ${this._formatBookingDate(booking.bookingDate)} has been updated by the shop owner`,
                reminder: `Reminder: You have a booking for ${booking.serviceName} on ${this._formatBookingDate(booking.bookingDate)}`
            };

            return await this.createNotification({
                userId,
                title: titleMap[action] || 'Booking Update',
                message: messageMap[action] || `Your booking status has been updated to: ${action}`,
                type: 'booking',
                relatedId: booking._id,
                onModel: 'Booking',
                bookingId: booking._id
            });
        } catch (error) {
            logger.error(`Send booking notification error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send payment-related notification
     * @param {string} userId - User ID to notify
     * @param {Object} payment - Payment data
     * @param {string} action - Action type (completed, failed, etc.)
     * @returns {Promise<Object>} - Created notification
     */
    async sendPaymentNotification(userId, payment, action) {
        try {
            const titleMap = {
                completed: 'Payment Successful',
                failed: 'Payment Failed',
                refunded: 'Payment Refunded'
            };

            const messageMap = {
                completed: `Your payment of $${payment.amount} has been processed successfully`,
                failed: `Your payment of $${payment.amount} has failed. Please try again.`,
                refunded: `Your payment of $${payment.amount} has been refunded`
            };

            return await this.createNotification({
                userId,
                title: titleMap[action] || 'Payment Update',
                message: messageMap[action] || `Your payment status has been updated to: ${action}`,
                type: 'payment',
                relatedId: payment._id,
                onModel: 'Payment'
            });
        } catch (error) {
            logger.error(`Send payment notification error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send system notification to all users or specific role
     * @param {Object} notificationData - Notification data
     * @param {string} [role] - Optional role to filter users
     * @returns {Promise<number>} - Number of notifications sent
     */
    async sendSystemNotificationToAll(notificationData, role = null) {
        try {
            if (!notificationData.title || !notificationData.message) {
                throw new Error('Notification title and message are required');
            }

            // Find all active users, optionally filtered by role
            const filter = { isActive: true };
            if (role) {
                filter.role = role;
            }

            const users = await User.find(filter).select('_id');

            // Create notifications in bulk
            const notifications = users.map(user => ({
                userId: user._id,
                title: notificationData.title,
                message: notificationData.message,
                type: 'system',
                relatedId: notificationData.relatedId || null,
                onModel: notificationData.onModel || null
            }));

            if (notifications.length === 0) {
                return 0;
            }

            const result = await Notification.insertMany(notifications);
            return result.length;
        } catch (error) {
            logger.error(`Send system notification to all error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Format booking date for display in notifications
     * @param {Date} date - Booking date
     * @returns {string} - Formatted date string
     * @private
     */
    _formatBookingDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Send real-time notification (placeholder for WebSocket, FCM, etc.)
     * @param {Object} notification - Notification data
     * @private
     */
    async _sendRealTimeNotification(notification) {
        // Use Firebase Admin SDK to send push notification via FCM
        try {
            const admin = require('../config/firebase');
            const Customer = require('../models/Customer');
            const Barber = require('../models/Barber');
            const Freelancer = require('../models/Freelancer');
            const ShopOwner = require('../models/ShopOwner');
            const Admin = require('../models/Admin');
            const { User } = require('../models/User');

            let user = null;
            let userType = 'unknown';

            // Try to find user in different collections efficiently
            const collections = [
                { model: Customer, type: 'customer' },
                { model: Barber, type: 'barber' },
                { model: Freelancer, type: 'freelancer' },
                { model: ShopOwner, type: 'shop_owner' },
                { model: Admin, type: 'admin' },
                { model: User, type: 'user' }
            ];

            for (const { model, type } of collections) {
                try {
                    user = await model.findById(notification.userId).select('fcmTokens');
                    if (user) {
                        userType = type;
                        break;
                    }
                } catch (err) {
                    logger.warn(`[FCM] Error querying ${type} collection: ${err.message}`);
                }
            }

            if (!user) {
                logger.warn(`[FCM] User ${notification.userId} not found in any collection`);
                return;
            }

            if (!user.fcmTokens || user.fcmTokens.length === 0) {
                logger.info(`[FCM] No FCM tokens for ${userType} ${notification.userId}`);
                return;
            }

            // Get all active FCM tokens
            const tokens = user.fcmTokens.map(t => t.token).filter(Boolean);

            if (tokens.length === 0) {
                logger.info(`[FCM] No valid FCM tokens for ${userType} ${notification.userId}`);
                return;
            }

            // Prepare FCM message with notification and data payload
            const message = {
                tokens: tokens,
                notification: {
                    title: notification.title,
                    body: notification.message
                },
                data: {
                    notificationId: notification._id.toString(),
                    type: notification.type,
                    userId: notification.userId.toString(),
                    relatedId: notification.relatedId?.toString() || '',
                    onModel: notification.onModel || '',
                    bookingId: notification.bookingId?.toString() || ''
                },
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1
                        }
                    }
                }
            };

            // Send with retry logic
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    const response = await admin.messaging().sendMulticast(message);
                    logger.info(`[FCM] ✅ Notification sent to ${userType} ${notification.userId}, ${response.successCount}/${tokens.length} devices succeeded`);
                    
                    // Log failed tokens for cleanup
                    if (response.failureCount > 0) {
                        logger.warn(`[FCM] ⚠️ ${response.failureCount} devices failed for user ${notification.userId}`);
                        // TODO: Implement token cleanup for failed tokens
                    }
                    
                    return;
                } catch (sendError) {
                    attempts++;
                    logger.warn(`[FCM] ❌ Send attempt ${attempts}/${maxAttempts} failed for user ${notification.userId}: ${sendError.message}`);

                    if (attempts >= maxAttempts) {
                        logger.error(`[FCM] ❌ All ${maxAttempts} send attempts failed for user ${notification.userId}`);
                        throw new Error(`FCM delivery failed after ${maxAttempts} attempts: ${sendError.message}`);
                    }

                    // Wait before retry (exponential backoff)
                    const delay = Math.min(Math.pow(2, attempts) * 1000, 10000); // Max 10 seconds
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

        } catch (error) {
            logger.error(`[FCM] ❌ Critical error sending notification to ${notification.userId}: ${error.message}`);

            // Optionally, you could mark the notification for retry later
            // or send to a dead letter queue for manual processing
        }
    }
}

module.exports = new NotificationService();