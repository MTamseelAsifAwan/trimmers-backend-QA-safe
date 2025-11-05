const express = require('express');
const router = express.Router();
const ShopownerRouter = require('./routers/ShopownerRouter');
const CustomerRouter = require('./routers/CustomerRouter');
const LocationRouter = require('./routers/LocationRouter');

// Debug middleware for mobile module
router.use((req, res, next) => {
    console.log('=== MOBILE MODULE ===');
    console.log('Method:', req.method, '| Path:', req.path);
    next();
});

router.use('/shop-owner', ShopownerRouter);
router.use('/customer', CustomerRouter);
router.use('/location', LocationRouter);
router.use('/bookings', require('./routers/BookingRouter'));

module.exports = router;