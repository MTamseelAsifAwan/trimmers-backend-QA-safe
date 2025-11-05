// src/api/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth/routes');
const profileRoutes = require('./profile/routes');
const dashboardRoutes = require('./dashboard/routes');
const adminRoutes = require('./admin/routes');
const barberRoutes = require('./barbers/routes');
const freelancerRoutes = require('./freelancers/routes');
const bookingRoutes = require('./bookings/routes');
const customerRoutes = require('./customers/routes');
const notificationRoutes = require('./notifications/routes');
const paymentRoutes = require('./payments/routes');
const serviceRoutes = require('./services/routes');
const shopRoutes = require('./shops/routes');
const shopOwnerRoutes = require('./shopOwner/routes');
const uploadRoutes = require('./uploads/routes');
const providerRoutes = require('./providers/routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/barbers', barberRoutes);
router.use('/freelancers', freelancerRoutes);
router.use('/bookings', bookingRoutes);
router.use('/customers', customerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/services', serviceRoutes);
router.use('/shops', shopRoutes);
router.use('/shop-owners', shopOwnerRoutes);
router.use('/uploads', uploadRoutes);
router.use('/providers', providerRoutes);

// API information route
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Barber App API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            profile: '/api/profile',
            dashboard: '/api/dashboard',
            admin: '/api/admin',
            barbers: '/api/barbers',
            bookings: '/api/bookings',
            customers: '/api/customers',
            notifications: '/api/notifications',
            payments: '/api/payments',
            services: '/api/services',
            shops: '/api/shops',
            shopOwners: '/api/shop-owners',
            uploads: '/api/uploads',
            providers: '/api/providers'
        }
    });
});

module.exports = router;