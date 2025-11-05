// src/api/dashboard/controllers/dashboardController.js
const mongoose = require('mongoose');
const Booking = require('../../../models/Booking');
const Shop = require('../../../models/Shop');
const Service = require('../../../models/Service');
const Notification = require('../../../models/Notification');
const Customer = require('../../../models/Customer');
const Barber = require('../../../models/Barber');
const Freelancer = require('../../../models/Freelancer');
const ShopOwner = require('../../../models/ShopOwner');
const Payment = require('../../../models/Payment');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get dashboard data based on user role
 * @route GET /api/dashboard
 * @access Private
 */
const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { lat, long } = req.query;

        let dashboardData = {};

        // Get dashboard data based on user role
        switch (userRole) {
            case 'customer':
                dashboardData = await getCustomerDashboard(userId, lat, long);
                break;

            case 'barber':
                dashboardData = await getBarberDashboard(userId);
                break;

            case 'freelancer':
                dashboardData = await getFreelancerDashboard(userId);
                break;

            case 'shop_owner':
                dashboardData = await getShopOwnerDashboard(userId);
                break;

            default:
                return next(new ApiError('Invalid user role for dashboard access', 403));
        }

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        next(error);
    }
};

/**
 * Get customer dashboard data
 */
const getCustomerDashboard = async (userId, lat, long) => {
    
    try {
        // Execute all queries in parallel for better performance
        const [customer, bookingData, notifications, nearbyServices] = await Promise.all([
            // Get customer profile - only essential fields
            Customer.findById(userId)
                .select('firstName lastName email profile countryId favoriteShops favoriteBarbers')
                .populate('countryId', 'name code currency')
                .populate('favoriteShops', 'name rating reviewCount mainImage address latitude longitude')
                .populate('favoriteBarbers', 'firstName lastName rating reviewCount profileImage')
                .lean(),
            
            // Get booking data
            getCustomerBookingData(userId),
            
            // Get recent notifications
            Notification.find({ userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title message type isRead createdAt')
                .lean(),
            
            // Get services - simplified version
            Service.find({ status: 'approved' })
                .populate('offeredBy.providerId', 'name uid')
                .populate('countryId', 'name code')
                .select('_id uid title description price duration status category icon imageUrl isPopular barberId isTemplate rejectionReason shopId countryId offeredBy')
                .limit(20)
                .lean()
        ]);

        if (!customer) {
            throw new ApiError('Customer profile not found', 404);
        }

        return { 
            bookings: {
                stats: bookingData.stats,
                recent: bookingData.recent
            },
            notifications: notifications.map(notification => ({
                title: notification.title,
                message: notification.message
            })),
            services: {
                data: nearbyServices
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Get optimized booking data for customer dashboard
 */
const getCustomerBookingData = async (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Single aggregation for all booking statistics
    const bookingStatsResult = await Booking.aggregate([
        {
            $match: {
                customerId: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pendingToday: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $gte: ['$bookingDate', today] },
                                    { $in: ['$status', ['pending']] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                completed: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['completed', 'confirmed', 'noShow']] },
                            1,
                            0
                        ]
                    }
                },
                cancelled: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['cancelled', 'rejected', 'freelancer_rejected']] },
                            1,
                            0
                        ]
                    }
                },
                totalConfirmedPrice: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['confirmed']] },
                            '$price',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const stats = bookingStatsResult.length > 0 ? bookingStatsResult[0] : {
        total: 0,
        pendingToday: 0,
        completed: 0,
        cancelled: 0,
        totalConfirmedPrice: 0
    };

    // Get recent bookings with population
    const recentBookings = await Booking.find({ customerId: userId })
        .populate('barberId', 'firstName lastName profileImage')
        .populate('shopId', 'name address')
        .populate('serviceId', 'title price')
        .sort({ createdAt: -1 })
        .limit(10);

    return {
        stats: {
            total: stats.total,
            pending: stats.pendingToday,
            completed: stats.completed,
            cancelled: stats.cancelled,
            totalConfirmedPrice: stats.totalConfirmedPrice
        },
        recent: recentBookings.map(booking => ({
            id: booking._id,
            serviceName: booking.serviceName || booking.serviceId?.title || 'Unknown Service',
            barberName: booking.barberId ? `${booking.barberId.firstName || 'Unknown'} ${booking.barberId.lastName || ''}`.trim() : 'Unknown Barber',
            shopName: booking.shopId?.name,
            date: booking.bookingDate,
            time: {
                hour: booking.bookingTime.hour,
                minute: booking.bookingTime.minute,
                _id: booking.bookingTime._id
            },
            status: booking.status,
            price: booking.price
        }))
    };
};

/**
 * Get barber dashboard data
 */
const getBarberDashboard = async (userId) => {
    try {
        // Get barber profile
        const barber = await Barber.findById(userId)
            .populate('countryId', 'name code currency')
            .populate('shopId', 'name address phone rating')
            .populate('services', 'title price duration category');

        if (!barber) {
            throw new ApiError('Barber profile not found', 404);
        }

        // Get booking data and earnings in optimized queries
        const [bookingData, earningsData] = await Promise.all([
            getBarberBookingData(barber._id),
            getBarberEarningsData(barber._id)
        ]);

        // Get recent notifications
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5);

        return {
            profile: {
                id: barber._id,
                firstName: barber.firstName,
                lastName: barber.lastName,
                email: barber.email,
                phoneNumber: barber.profile?.phoneNumber,
                shop: barber.shopId,
                services: barber.services,
                country: barber.countryId
            },
            bookings: bookingData,
            earnings: earningsData,
            notifications: notifications.map(notification => ({
                id: notification._id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                isRead: notification.isRead,
                createdAt: notification.createdAt
            }))
        };
    } catch (error) {
        console.error('Error fetching barber dashboard:', error);
        throw error;
    }
};

/**
 * Get optimized booking data for barber dashboard
 */
const getBarberBookingData = async (barberId) => {
    // Single aggregation for all booking statistics
    const bookingStatsResult = await Booking.aggregate([
        {
            $match: {
                barberId: barberId
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
                    }
                },
                completed: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['completed', 'confirmed', 'noShow']] },
                            1,
                            0
                        ]
                    }
                },
                cancelled: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['cancelled', 'rejected', 'freelancer_rejected']] },
                            1,
                            0
                        ]
                    }
                },
                totalConfirmedPrice: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['confirmed']] },
                            '$price',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const stats = bookingStatsResult.length > 0 ? bookingStatsResult[0] : {
        total: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
        totalConfirmedPrice: 0
    };

    // Get recent bookings with population
    const recentBookings = await Booking.find({ barberId })
        .populate({
            path: 'customerId',
            model: 'Customer',
            select: 'firstName lastName phoneNumber'
        })
        .populate('serviceId', 'title price')
        .sort({ createdAt: -1 })
        .limit(10);

    return {
        stats: {
            total: stats.total,
            pending: stats.pending,
            completed: stats.completed,
            cancelled: stats.cancelled,
            totalConfirmedPrice: stats.totalConfirmedPrice
        },
        recent: recentBookings.map(booking => ({
            id: booking._id,
            customerName: booking.customerId ?
                `${booking.customerId.firstName || 'Unknown'} ${booking.customerId.lastName || 'Customer'}` :
                'Unknown Customer',
            customerPhone: booking.customerId?.phoneNumber || 'N/A',
            serviceName: booking.serviceName || booking.serviceId?.title || 'Unknown Service',
            date: booking.bookingDate,
            time: booking.bookingTime,
            status: booking.status === 'rejected_barber' ? 'pending' : booking.status,
            price: booking.price,
            address: booking.address
        }))
    };
};

/**
 * Get optimized earnings data for barber dashboard
 */
const getBarberEarningsData = async (barberId) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Single aggregation for earnings statistics
    const earningsResult = await Payment.aggregate([
        {
            $match: {
                providerId: barberId,
                providerModel: 'Barber',
                status: { $in: ['completed', 'processing'] }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' },
                today: {
                    $sum: {
                        $cond: [
                            { $gte: ['$createdAt', today] },
                            '$amount',
                            0
                        ]
                    }
                },
                thisWeek: {
                    $sum: {
                        $cond: [
                            { $gte: ['$createdAt', weekAgo] },
                            '$amount',
                            0
                        ]
                    }
                },
                thisMonth: {
                    $sum: {
                        $cond: [
                            { $gte: ['$createdAt', monthAgo] },
                            '$amount',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const earnings = earningsResult.length > 0 ? earningsResult[0] : {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0
    };

    return earnings;
};

/**
 * Get freelancer dashboard data
 */
const getFreelancerDashboard = async (userId) => {
    try {
        // Get freelancer profile
        const freelancer = await Freelancer.findById(userId)
            .populate('countryId', 'name code currency')
            .populate('services', 'title price duration category');

        if (!freelancer) {
            throw new ApiError('Freelancer profile not found', 404);
        }

        // Get booking data and earnings in optimized queries
        const [bookingData, earningsData] = await Promise.all([
            getBarberBookingData(freelancer._id), // Reuse barber function since freelancers use same model
            getBarberEarningsData(freelancer._id)  // Reuse barber function
        ]);

        // Get recent notifications
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5);

        return {
            profile: {
                id: freelancer._id,
                firstName: freelancer.firstName,
                lastName: freelancer.lastName,
                email: freelancer.email,
                phoneNumber: freelancer.profile?.phoneNumber,
                services: freelancer.services,
                country: freelancer.countryId
            },
            bookings: bookingData,
            earnings: earningsData,
            notifications: notifications.map(notification => ({
                id: notification._id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                isRead: notification.isRead,
                createdAt: notification.createdAt
            }))
        };
    } catch (error) {
        console.error('Error fetching freelancer dashboard:', error);
        throw error;
    }
};

// /**
//  * Get shop owner dashboard data
//  */
//  * Get shop owner dashboard data
 
const getShopOwnerDashboard = async (userId) => {
    try {
        // Get shop owner profile
        const shopOwner = await ShopOwner.findById(userId)
            .populate('countryId', 'name code currency')
            .populate('operatingCountries', 'name code currency');

        if (!shopOwner) {
            throw new ApiError('Shop owner profile not found', 404);
        }

        // Get shops owned by this shop owner
        const shops = await Shop.find({ ownerId: userId })
            .populate('services', 'title price category')
            .populate('barbers', 'firstName lastName rating reviewCount status');

        // Get all bookings for shops owned by this owner
        const shopIds = shops.map(shop => shop._id);
        const bookings = await Booking.find({ shopId: { $in: shopIds } })
            .populate({ path: 'barberId', model: 'Barber', select: 'firstName lastName' })
            .populate({ path: 'customerId', model: 'Customer', select: 'firstName lastName' })
            .populate('serviceId', 'title price')
            .sort({ createdAt: -1 })
            .limit(20);

        // Calculate business statistics
        const businessStats = {
            totalShops: shops.length,
            totalBarbers: shops.reduce((sum, shop) => sum + (shop.barbers?.length || 0), 0),
            totalBookings: await Booking.countDocuments({ shopId: { $in: shopIds } }),
            monthlyRevenue: await Payment.aggregate([
                {
                    $match: {
                        providerId: { $in: shopIds },
                        providerModel: 'Shop',
                        status: 'completed',
                        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]).then(result => result[0]?.total || 0),
            yearlyRevenue: await Payment.aggregate([
                {
                    $match: {
                        providerId: { $in: shopIds },
                        providerModel: 'Shop',
                        status: 'completed',
                        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]).then(result => result[0]?.total || 0)
        };

        // Get recent notifications
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5);

        return {
            bookings: {
                recent: bookings.map(booking => ({
                    id: booking._id,
                    customerName: booking.customerId ?
                        `${booking.customerId.firstName || 'Unknown'} ${booking.customerId.lastName || 'Customer'}` :
                        'Unknown Customer',
                    barberName: booking.barberId ? `${booking.barberId.firstName || 'Unknown'}` : 'Unknown Barber',
                    shopName: shops.find(shop => shop._id.toString() === booking.shopId.toString())?.name || 'Unknown Shop',
                    serviceName: booking.serviceName || 'Unknown Service',
                    date: booking.bookingDate,
                    time: booking.bookingTime,
                    status: booking.status === 'rejected_barber' ? 'pending' : booking.status,
                    price: booking.price
                })),
                stats: {
                    total: businessStats.totalBookings,
                    pending: await Booking.countDocuments({
                        shopId: { $in: shopIds },
                        status: 'pending'
                    }),
                    completed: await Booking.countDocuments({
                        shopId: { $in: shopIds },
                        status: { $in: ['completed', 'confirmed', 'noShow'] }
                    }),
                    cancelled: await Booking.countDocuments({
                        shopId: { $in: shopIds },
                        status: { $in: ['cancelled', 'rejected', 'freelancer_rejected'] }
                    }),
                    totalConfirmedPrice: await Booking.aggregate([
                        {
                            $match: {
                                shopId: { $in: shopIds },
                                status: { $in: ['confirmed'] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalPrice: { $sum: '$price' }
                            }
                        }
                    ]).then(result => result[0]?.totalPrice || 0)
                }
            },
            notifications: notifications.map(notification => ({
                id: notification._id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                isRead: notification.isRead,
                createdAt: notification.createdAt
            }))
        };

    } catch (error) {
        console.error('Error fetching shop owner dashboard:', error);
        throw error;
    }
};

module.exports = {
    getDashboard
};
