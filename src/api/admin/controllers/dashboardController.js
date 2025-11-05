// src/api/admin/controllers/dashboardController.js
const userService = require('../../../services/userService');
const shopService = require('../../../services/shopService');
const barberService = require('../../../services/barberService');
const bookingService = require('../../../services/bookingService');
const paymentService = require('../../../services/paymentService');
const serviceService = require('../../../services/serviceService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get dashboard statistics
 * @route GET /api/admin/dashboard
 * @access Private/Admin
 */
const getDashboardStats = async (req, res, next) => {
    try {
        // Get date range from query params or use last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (req.query.days || 30));

        // Collect counts asynchronously
        const [
            totalUsers,
            totalBarbers,
            totalShops,
            totalBookings,
            recentBookings,
            pendingShops,
            pendingBarbers,
            revenueStats
        ] = await Promise.all([
            userService.countUsers(),
            barberService.countBarbers(),
            shopService.countShops({ isActive: true }),
            bookingService.countBookings(),
            bookingService.getRecentBookings(10),
            shopService.countShops({ isVerified: false }),
            barberService.countBarbers({ status: 'pending' }),
            paymentService.getRevenueStats({ startDate, endDate })
        ]);

        res.status(200).json({
            success: true,
            data: {
                counts: {
                    users: totalUsers,
                    barbers: totalBarbers,
                    shops: totalShops,
                    bookings: totalBookings,
                    pendingShops,
                    pendingBarbers
                },
                revenue: revenueStats,
                recentBookings
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get booking statistics
 * @route GET /api/admin/dashboard/bookings-stats
 * @access Private/Admin
 */
const getBookingStats = async (req, res, next) => {
    try {
        // Get date range from query params or use last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (req.query.days || 30));
        
        // Get booking statistics
        const stats = await bookingService.getBookingStats({ startDate, endDate });
        
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get revenue statistics
 * @route GET /api/admin/dashboard/revenue-stats
 * @access Private/Admin
 */
const getRevenueStats = async (req, res, next) => {
    try {
        // Get date range from query params or use last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (req.query.days || 30));
        
        // Get revenue statistics
        const stats = await paymentService.getRevenueStats({ startDate, endDate });
        
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user statistics
 * @route GET /api/admin/dashboard/user-stats
 * @access Private/Admin
 */
const getUserStats = async (req, res, next) => {
    try {
        // Get date range from query params or use last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (req.query.days || 30));
        
        // Get user growth statistics
        const stats = await userService.getUserGrowthStats({ startDate, endDate });
        
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get popular services
 * @route GET /api/admin/dashboard/popular-services
 * @access Private/Admin
 */
const getPopularServices = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Get most booked services
        const services = await serviceService.getMostBookedServices(limit);
        
        res.status(200).json({
            success: true,
            data: services
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get top barbers
 * @route GET /api/admin/dashboard/top-barbers
 * @access Private/Admin
 */
const getTopBarbers = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Get top-rated or most booked barbers
        const barbers = await barberService.getTopBarbers(limit);
        
        res.status(200).json({
            success: true,
            data: barbers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get top shops
 * @route GET /api/admin/dashboard/top-shops
 * @access Private/Admin
 */
const getTopShops = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Get top-rated or most booked shops
        const shops = await shopService.getTopShops(limit);
        
        res.status(200).json({
            success: true,
            data: shops
        });
    } catch (error) {
        next(error);
    }
};

const getCountryStats = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        
        // Check if user has access to this country
        if (req.user.role === ROLES.COUNTRY_MANAGER && 
            (!req.user.countryId || req.user.countryId.toString() !== countryId)) {
            throw new ApiError('You do not have access to this country', 403);
        }
        
        // Get date range from query params or use last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (req.query.days || 30));
        
        // Collect counts asynchronously for the specific country
        const [
            totalShops,
            activeShops,
            pendingShops,
            totalBookings,
            totalRevenue
        ] = await Promise.all([
            shopService.countShops({ countryId }),
            shopService.countShops({ countryId, isActive: true }),
            shopService.countShops({ countryId, isVerified: false }),
            bookingService.countBookingsByCountry(countryId),
            paymentService.getTotalRevenueByCountry(countryId, { startDate, endDate })
        ]);
        
        // Get top performing cities
        const cities = await shopService.getTopCitiesByCountry(countryId, 5);
        
        res.status(200).json({
            success: true,
            data: {
                countryId,
                counts: {
                    shops: totalShops,
                    activeShops,
                    pendingShops,
                    bookings: totalBookings
                },
                revenue: totalRevenue,
                topCities: cities
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardStats,
    getBookingStats,
    getRevenueStats,
    getUserStats,
    getPopularServices,
    getTopBarbers,
    getTopShops,
    getCountryStats
};