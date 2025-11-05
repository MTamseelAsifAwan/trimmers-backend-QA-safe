// test-shopowner-fcm.js
// Script to test FCM notifications for shop owners
require('dotenv').config();
const { connectDB } = require('./src/config/db');
const notificationService = require('./src/services/notificationService');
const ShopOwner = require('./src/models/ShopOwner');
const logger = require('./src/utils/logger');

async function testShopOwnerFCM() {
    try {
        logger.info('🧪 Testing Shop Owner FCM Notifications...');

        // Connect to database
        await connectDB();
        logger.info('📊 Database connected');

        // Use the provided FCM token
        const testFCMToken = 'dbnaS6YAS4CRmQZRILiC9a:APA91bEHoBLCTI1AOHc9yWkl3WiEz20-ILeDTob2h-nT4zOg-i1A6AYa3wjuLCB95QUd2O9L3QwN_1zgmCsHKYFSZ-L_PeIIXhvNCdo3ml6nV-5FfUx5hCU';

        // Find a shop owner or create a test one with this FCM token
        let shopOwner = await ShopOwner.findOne({ fcmToken: testFCMToken }).select('uid email firstName lastName fcmToken');

        if (!shopOwner) {
            // Try to find any shop owner to update with this FCM token
            shopOwner = await ShopOwner.findOne().select('uid email firstName lastName fcmToken');

            if (shopOwner) {
                // Update the shop owner with the test FCM token
                await ShopOwner.findByIdAndUpdate(shopOwner._id, { fcmToken: testFCMToken });
                shopOwner.fcmToken = testFCMToken;
                logger.info('🔄 Updated shop owner with test FCM token');
            } else {
                logger.warn('❌ No shop owner found in database. Please create a shop owner first.');
                return;
            }
        }

        logger.info('👤 Using shop owner:');
        logger.info(`   Email: ${shopOwner.email}`);
        logger.info(`   Name: ${shopOwner.firstName} ${shopOwner.lastName}`);
        logger.info(`   UID: ${shopOwner.uid}`);
        logger.info(`   FCM Token: ${shopOwner.fcmToken.substring(0, 50)}...`);

        // Create test notification
        const testNotification = {
            userId: shopOwner._id,
            title: 'Test Shop Owner Notification',
            message: 'This is a test FCM notification sent to shop owner. If you received this, FCM is working correctly!',
            type: 'system',
            data: {
                testType: 'shop_owner_fcm_test',
                timestamp: new Date().toISOString(),
                fcmToken: testFCMToken
            }
        };

        logger.info('📤 Sending test notification...');
        logger.info('Notification data:', {
            title: testNotification.title,
            message: testNotification.message,
            type: testNotification.type
        });

        const notification = await notificationService.createNotification(testNotification);

        if (notification) {
            logger.info('✅ Notification created and sent successfully!');
            logger.info('📋 Notification details:', {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                userId: notification.userId,
                createdAt: notification.createdAt
            });
            logger.info('📱 Check the shop owner\'s device for the push notification!');
            logger.info('🔍 Check server logs for FCM delivery status.');
        } else {
            logger.warn('❌ Failed to create notification');
        }

    } catch (error) {
        logger.error(`❌ Shop owner FCM test failed: ${error.message}`);
        logger.error('Stack trace:', error.stack);
    }
}

async function listShopOwnersWithFCM() {
    try {
        logger.info('📋 Listing Shop Owners with FCM Tokens...');

        // Connect to database
        await connectDB();
        logger.info('📊 Database connected');

        // Find all shop owners with FCM tokens
        const shopOwners = await ShopOwner.find({ fcmToken: { $ne: null } })
            .select('uid email firstName lastName fcmToken createdAt')
            .sort({ createdAt: -1 });

        if (shopOwners.length === 0) {
            logger.warn('❌ No shop owners found with FCM tokens.');
            return;
        }

        logger.info(`✅ Found ${shopOwners.length} shop owner(s) with FCM tokens:`);
        shopOwners.forEach((owner, index) => {
            logger.info(`${index + 1}. ${owner.firstName} ${owner.lastName} (${owner.email})`);
            logger.info(`   UID: ${owner.uid}`);
            logger.info(`   FCM Token: ${owner.fcmToken.substring(0, 30)}...`);
            logger.info(`   Created: ${owner.createdAt}`);
            logger.info('---');
        });

    } catch (error) {
        logger.error(`❌ Failed to list shop owners: ${error.message}`);
    }
}

async function testDirectFCM() {
    try {
        logger.info('🧪 Testing Direct FCM Notification...');

        const testFCMToken = 'dbnaS6YAS4CRmQZRILiC9a:APA91bEHoBLCTI1AOHc9yWkl3WiEz20-ILeDTob2h-nT4zOg-i1A6AYa3wjuLCB95QUd2O9L3QwN_1zgmCsHKYFSZ-L_PeIIXhvNCdo3ml6nV-5FfUx5hCU';

        logger.info('📤 Sending direct FCM test notification...');
        logger.info(`FCM Token: ${testFCMToken.substring(0, 50)}...`);

        // Use Firebase Admin SDK directly
        const admin = require('./src/config/firebase');

        const message = {
            token: testFCMToken,
            notification: {
                title: 'Direct FCM Test',
                body: 'This is a direct FCM test notification. If you received this, FCM is working!'
            },
            data: {
                testType: 'direct_fcm_test',
                timestamp: new Date().toISOString()
            }
        };

        const response = await admin.messaging().send(message);

        logger.info('✅ Direct FCM notification sent successfully!');
        logger.info(`📋 Message ID: ${response}`);
        logger.info('📱 Check your device for the push notification!');

    } catch (error) {
        logger.error(`❌ Direct FCM test failed: ${error.message}`);
        if (error.code) {
            logger.error(`Error code: ${error.code}`);
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--list')) {
        await listShopOwnersWithFCM();
    } else if (args.includes('--test')) {
        await testShopOwnerFCM();
    } else if (args.includes('--direct')) {
        await testDirectFCM();
    } else {
        logger.info('🛠️  Shop Owner FCM Test Script');
        logger.info('Usage:');
        logger.info('  node test-shopowner-fcm.js --test     # Send test notification via shop owner (updates FCM token)');
        logger.info('  node test-shopowner-fcm.js --direct   # Send direct FCM notification using provided token');
        logger.info('  node test-shopowner-fcm.js --list     # List all shop owners with FCM tokens');
        logger.info('');
        logger.info('Examples:');
        logger.info('  node test-shopowner-fcm.js --direct');
        logger.info('  node test-shopowner-fcm.js --test');
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        logger.error('Script execution failed:', error);
        process.exit(1);
    });
}

module.exports = { testShopOwnerFCM, listShopOwnersWithFCM, testDirectFCM };