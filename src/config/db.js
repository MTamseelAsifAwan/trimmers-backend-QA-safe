// src/config/db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection string
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber-app';

// Connect to MongoDB with Mongoose
const connectDB = async () => {
    try {
        // For Mongoose 6.x+, we no longer need the deprecated options
        const conn = await mongoose.connect(uri);
        
        // Drop existing indexes that might conflict
        try {
            const Barber = require('../models/Barber');
            const Freelancer = require('../models/Freelancer');
            const ShopOwner = require('../models/ShopOwner');

            // Handle Barber collection indexes
            await Barber.collection.dropIndex('userId_1').catch(() => {});
            await Barber.collection.dropIndex('location_2dsphere').catch(() => {});
            await Barber.collection.dropIndex('location.coordinates_2dsphere').catch(() => {});
            await Barber.collection.createIndex({ 'location.coordinates': '2dsphere' });
            
            // Handle Freelancer collection indexes
            await Freelancer.collection.dropIndex('userId_1').catch(() => {});
            await Freelancer.collection.dropIndex('location_2dsphere').catch(() => {});
            await Freelancer.collection.dropIndex('location.coordinates_2dsphere').catch(() => {});
            await Freelancer.collection.createIndex({ 'location.coordinates': '2dsphere' });
            
            // Handle ShopOwner collection indexes
            await ShopOwner.collection.dropIndex('userId_1').catch(() => {});
            
            // Handle Customer collection indexes
            const Customer = require('../models/Customer');
            await Customer.collection.dropIndex('userId_1').catch(() => {});
            
            logger.info('Updated indexes on barbers, freelancers, shop owners, and customers collections');
        } catch (err) {
            // Log any errors but don't stop the server from starting
            logger.error('Error updating indexes:', err);
        }

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Initialize collections and add any initial data
        await initializeData();

        return conn;
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        throw error; // Let server.js handle the exit
    }
};

// Initialize collections and seed data if needed
const initializeData = async () => {
    try {
        // Import models to register them with mongoose
        const { User, ROLES } = require('../models/User');
        const Role = require('../models/Role');
        const Customer = require('../models/Customer');
        const Barber = require('../models/Barber');
        const Freelancer = require('../models/Freelancer');
        const ShopOwner = require('../models/ShopOwner');
        const Admin = require('../models/Admin');
        const bcrypt = require('bcryptjs');

        // Check if roles exist, if not create default roles
        const existingRoles = await Role.find({}, 'name');
        const existingRoleNames = existingRoles.map(role => role.name);
        
        const requiredRoles = [
            {
                name: 'admin',
                description: 'Super administrator with all permissions',
                permissions: ['*']
            },
            {
                name: 'customer',
                description: 'Regular customer role',
                permissions: [
                    'view_services',
                    'book_appointment',
                    'cancel_appointment',
                    'view_profile',
                    'edit_profile'
                ]
            },
            {
                name: 'shop_owner',
                description: 'Barber shop owner role',
                permissions: [
                    'view_shop',
                    'edit_shop',
                    'view_services',
                    'add_service',
                    'edit_service',
                    'delete_service',
                    'view_barbers',
                    'add_barber',
                    'edit_barber',
                    'delete_barber',
                    'view_appointments',
                    'confirm_appointment',
                    'cancel_appointment',
                    'view_reports'
                ]
            },
            {
                name: 'barber',
                description: 'Barber role',
                permissions: [
                    'view_services',
                    'view_appointments',
                    'confirm_appointment',
                    'complete_appointment',
                    'view_profile',
                    'edit_profile'
                ]
            },
            {
                name: 'freelancer',
                description: 'Freelancer barber role',
                permissions: [
                    'view_services',
                    'view_appointments',
                    'confirm_appointment',
                    'complete_appointment',
                    'view_profile',
                    'edit_profile'
                ]
            }
        ];

        const rolesToCreate = requiredRoles.filter(role => !existingRoleNames.includes(role.name));

        if (rolesToCreate.length > 0) {
            logger.info(`Seeding ${rolesToCreate.length} missing roles...`);
            await Role.insertMany(rolesToCreate);
            logger.info('Missing roles data seeded successfully');
        } else {
            logger.info('All required roles already exist');
        }

            // Create admin user if doesn't exist
            const adminExists = await User.findOne({ email: 'admin@barberapp.com' });

            if (!adminExists) {
                // Default password
                const defaultPassword = 'Admin@123';
                // Get admin role ID
                const adminRole = await Role.findOne({ name: 'admin' });
                
                if (!adminRole) {
                    logger.error('Admin role not found when creating admin user');
                    return;
                }

                try {
                    // Create new user document
                    const adminUser = new User({
                        email: 'admin@barberapp.com',
                        password: defaultPassword,
                        firstName: 'Admin',
                        lastName: 'User',
                        profile: {
                            phoneNumber: '1234567890'
                        },
                        role: ROLES.ADMIN,
                        roleId: adminRole._id,
                        isActive: true,
                        emailVerified: true
                    });

                    // Save user
                    await adminUser.save();
                    
                    logger.info('Admin user created successfully');
                    logger.info(`Admin login: admin@barberapp.com / ${defaultPassword}`);
                    
                    // Test login functionality
                    logger.info('Testing login functionality...');
                    
                    const savedAdmin = await User.findOne({ email: 'admin@barberapp.com' }).select('+password');
                    
                    if (savedAdmin && savedAdmin.password) {
                        try {
                            const bcryptMatch = await bcrypt.compare('Admin@123', savedAdmin.password);
                            logger.info(`Password match with bcrypt: ${bcryptMatch ? 'Success' : 'Failed'}`);
                            
                            if (!bcryptMatch) {
                                logger.warn('Password verification failed - debug info:');
                                logger.warn(`Password in DB: ${savedAdmin.password.substring(0, 10)}...`);
                                logger.warn(`Password type: ${typeof savedAdmin.password}`);
                            }
                        } catch (bcryptError) {
                            logger.error(`bcrypt error: ${bcryptError.message}`);
                        }
                    } else {
                        logger.error('Admin user not found or password missing after save');
                    }
                    
                } catch (saveError) {
                    logger.error(`Error saving admin user: ${saveError.message}`);
                    logger.error(saveError.stack);
                }
            }
    } catch (error) {
        logger.error(`Error initializing data: ${error.message}`);
        throw error;
    }
};

// Disconnect from database
const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
    } catch (error) {
        logger.error(`Error disconnecting from MongoDB: ${error.message}`);
        throw error;
    }
};

module.exports = {
    connectDB,
    disconnectDB
};