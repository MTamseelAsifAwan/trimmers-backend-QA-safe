// test-fcm-notification.js
// Simple script to test FCM notification sending and login with FCM token
require('dotenv').config();
const { connectDB } = require('./src/config/db');
const notificationService = require('./src/services/notificationService');
const authService = require('./src/services/authService');
const logger = require('./src/utils/logger');

async function testAutoAssignBookings() {
    try {
        logger.info('🔄 Testing Auto-Assignment of Bookings...');

        // Connect to database first
        await connectDB();
        logger.info('📊 Database connected');

        // Import booking service
        const bookingService = require('./src/services/bookingService');

        logger.info('📤 Running auto-assignment...');
        const assignedCount = await bookingService.autoAssignPendingBookings();

        logger.info(`✅ Auto-assignment completed! ${assignedCount} bookings assigned.`);

        if (assignedCount > 0) {
            logger.info('📱 Check your devices for assignment notifications.');
            logger.info('🔍 Check server logs for detailed assignment information.');
        } else {
            logger.info('ℹ️ No pending bookings found that needed assignment.');
        }

    } catch (error) {
        logger.error(`❌ Auto-assignment test failed: ${error.message}`);
    }
}

async function testLoginWithFCM() {
    try {
        logger.info('🔐 Testing Login with FCM Token...');

        // Connect to database first
        await connectDB();
        logger.info('📊 Database connected');

        // Test login with FCM token - replace with actual credentials
        const loginData = {
            email: 'customer@example.com', // Replace with actual user email
            password: 'Password123!',   // Replace with actual password
            fcmToken: 'eA1B2cD3E4F5G6H7I8J9K0L1M2N3O4P5Q6R7S8T9U0V1W2X3Y4Z5:APA91bF...' // Replace with actual FCM token
        };

        logger.info('📤 Attempting login with FCM token...');
        const result = await authService.login(loginData.email, loginData.password, loginData.fcmToken);

        if (result && result.token) {
            logger.info('✅ Login successful!');
            logger.info(`👤 User: ${result.user.email}`);
            logger.info('🔑 Token generated');
            logger.info('📱 FCM token should be updated in database');
            return result.user._id; // Return user ID for notification test
        } else {
            logger.warn('❌ Login failed');
            return null;
        }

    } catch (error) {
        logger.error(`❌ Login test failed: ${error.message}`);
        return null;
    }
}

async function testFCMNotification(userId) {
    try {
        logger.info('🧪 Testing FCM Notification Service...');

        if (!userId) {
            logger.warn('⚠️ No user ID available, skipping notification test');
            return;
        }

        // Connect to database first
        await connectDB();
        logger.info('📊 Database connected');

        // Test data - replace with actual user ID and ensure they have fcmToken set
        const testNotification = {
            userId: userId,
            title: 'Test FCM Notification',
            message: 'This is a test push notification from your backend',
            type: 'system'
        };

        logger.info('📤 Sending test notification...');
        logger.info('Notification data:', testNotification);

        const notification = await notificationService.createNotification(testNotification);

        if (notification) {
            logger.info('✅ Notification created successfully!');
            logger.info('📋 Notification details:', {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                userId: notification.userId
            });
            logger.info('📱 Check your device for the push notification!');
            logger.info('🔍 Check server logs for FCM delivery status.');
        } else {
            logger.warn('❌ Failed to create notification');
        }

    } catch (error) {
        logger.error(`❌ Test failed: ${error.message}`);
    }
}

async function runAllTests() {
    try {
        logger.info('🚀 Starting FCM Integration Tests...');

        // Connect to database once
        await connectDB();
        logger.info('📊 Database connected');

        // Test login with FCM token
        const userId = await testLoginWithFCM();

        // Test notification sending
        await testFCMNotification(userId);

        // Test auto-assignment
        await testAutoAssignBookings();

        logger.info('✨ All tests completed!');
    } catch (error) {
        logger.error(`❌ Test suite failed: ${error.message}`);
    }
}

// Run the tests
if (require.main === module) {
    runAllTests();
}

module.exports = { testLoginWithFCM, testFCMNotification, testAutoAssignBookings, runAllTests };