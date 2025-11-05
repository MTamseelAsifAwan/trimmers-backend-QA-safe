// src/api/customer/controllers/customerBookingController.js
const bookingService = require('../../../services/bookingService');
const paymentService = require('../../../services/paymentService');
const notificationService = require('../../../services/notificationService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get available booking dates and times for all barbers/freelancers in a shop for a specific service
 * @route GET /api/customers/shop-availability/:shopId
 * @access Private/Customer
 */
const Barber = require('../../../models/Barber');
const Service = require('../../../models/Service');
const getShopAvailability = async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { serviceId, date } = req.query; // both are optional now
        const targetDate = date ? new Date(date) : new Date();

        console.log('=== SHOP AVAILABILITY DEBUG ===');
        console.log('Shop ID:', shopId);
        console.log('Service ID:', serviceId);
        console.log('Target Date:', targetDate);
        console.log('Current Date:', new Date());

        // Debug: Check if shop exists
        const Shop = require('../../../models/Shop');
        const shop = await Shop.findById(shopId);
        if (!shop) {
            console.log('❌ Shop not found!');
            return res.status(404).json({
                success: false,
                message: 'Shop not found',
                shopId
            });
        }

        // Debug: Check total barbers count
        const totalBarbers = await Barber.countDocuments();
        console.log('Total barbers in database:', totalBarbers);

        // Debug: Check barbers for this shop (without status filter)
        const allBarbersForShop = await Barber.find({ shopId }).populate('userId', 'firstName lastName');
        console.log('All barbers for shop (any status):', allBarbersForShop.length);

        // Debug: Check barbers with active status for this shop
        const activeBarbersForShop = await Barber.find({ shopId, status: 'active' }).populate('userId', 'firstName lastName');
        console.log('Active barbers for shop:', activeBarbersForShop.length);

        // Find all barbers/freelancers for this shop with active status
        const barbers = activeBarbersForShop;

        console.log('Found', barbers.length, 'active barbers for this shop');
        barbers.forEach((barber, index) => {
            console.log(`Barber ${index + 1}: ${barber._id} - ${barber.userId?.firstName} ${barber.userId?.lastName}`);
        });

        const results = [];

        if (serviceId) {
            // If serviceId is provided, filter by that specific service
            for (const barber of barbers) {
                // Check if barber offers this specific service
                const barberService = await Service.findOne({
                    _id: serviceId,
                    $or: [
                        { barberId: barber._id },
                        { shopId: barber.shopId }
                    ],
                    status: 'active'
                });

                if (barberService) {
                    const availableSlots = await bookingService.getAvailableTimeSlots(barber._id, targetDate, serviceId);
                    results.push({
                        barberId: barber._id,
                        barberName: barber.userId ? barber.userId.firstName + ' ' + barber.userId.lastName : '',
                        services: [{
                            serviceId: barberService._id,
                            serviceName: barberService.title,
                            serviceType: barberService.type,
                            availableSlots
                        }]
                    });
                } else {
                    // Barber doesn't offer this service - show general availability
                    const generalSlots = await bookingService.getGeneralAvailability(barber._id, targetDate);
                    results.push({
                        barberId: barber._id,
                        barberName: barber.userId ? barber.userId.firstName + ' ' + barber.userId.lastName : '',
                        services: [],
                        generalAvailability: generalSlots,
                        message: `This barber doesn't offer the requested service`
                    });
                }
            }
        } else {
            // If no serviceId, get all services for each barber and their availability
            for (const barber of barbers) {
                // Get all services offered by this barber
                const barberServices = await Service.find({
                    $or: [
                        { barberId: barber._id },
                        { shopId: barber.shopId }
                    ],
                    status: 'active'
                });

                console.log(`Barber ${barber._id} has ${barberServices.length} services`);

                const serviceAvailabilities = [];
                for (const service of barberServices) {
                    const availableSlots = await bookingService.getAvailableTimeSlots(barber._id, targetDate, service._id);
                    console.log(`Service ${service._id} (${service.title}) has ${availableSlots.length} available slots`);
                    // Always include the service, even if no slots are available
                    serviceAvailabilities.push({
                        serviceId: service._id,
                        serviceName: service.title,
                        serviceType: service.type,
                        availableSlots
                    });
                }

                // Include barber even if no services have availability
                if (barberServices.length > 0) {
                    results.push({
                        barberId: barber._id,
                        barberName: barber.userId ? barber.userId.firstName + ' ' + barber.userId.lastName : '',
                        services: serviceAvailabilities
                    });
                } else {
                    // Include barber with no services - show general availability
                    console.log(`Barber ${barber._id} has no services - showing general availability`);
                    const generalSlots = await bookingService.getGeneralAvailability(barber._id, targetDate);
                    results.push({
                        barberId: barber._id,
                        barberName: barber.userId ? barber.userId.firstName + ' ' + barber.userId.lastName : '',
                        services: [],
                        generalAvailability: generalSlots,
                    });
                }
            }
        }

        console.log('Final results count:', results.length);
        console.log('=== END DEBUG ===');

        res.status(200).json({
            success: true,
            shopId,
            serviceId: serviceId || null,
            date: targetDate,
            barbers: results
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Get bookings for authenticated customer
 * @route GET /api/customer/bookings
 * @access Private/Customer
 */
const getMyBookings = async (req, res, next) => {
    try {
        const customerId = req.user._id;
        const { page = 1, limit = 10, status, sortBy = 'bookingDate', sortOrder = 'desc' } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            sortBy,
            sortOrder
        };

        const result = await bookingService.getBookingsByCustomer(customerId, options);

        res.status(200).json({
            success: true,
            data: result.bookings,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get booking details
 * @route GET /api/customer/bookings/:id
 * @access Private/Customer
 */
const getBookingDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customerId = req.user._id;

        const booking = await bookingService.getBookingById(id);

        // Verify booking belongs to customer
        if (!booking || booking.customerId.toString() !== customerId.toString()) {
            throw new ApiError('Booking not found or unauthorized', 404);
        }

        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new booking
 * @route POST /api/customer/bookings
 * @access Private/Customer
 */
const createBooking = async (req, res, next) => {
    try {
        const customerId = req.user._id;
        const customerName = `${req.user.firstName} ${req.user.lastName}`;

        // Prepare booking data
        const bookingData = {
            ...req.body,
            customerId,
            customerName,
            countryId: req.user.countryId
        };

        // Validate required fields
        if (!bookingData.barberId || !bookingData.serviceId ||
            !bookingData.bookingDate || !bookingData.bookingTime ||
            !bookingData.serviceType) {
            throw new ApiError('Missing required booking information', 400);
        }

        // For home-based service, ensure address is provided
        if (bookingData.serviceType === 'homeBased' && !bookingData.address) {
            throw new ApiError('Address is required for home-based services', 400);
        }

        // Create booking
        const booking = await bookingService.createBooking(bookingData);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel booking with refund if applicable
 * @route POST /api/customer/bookings/:id/cancel
 * @access Private/Customer
 */
const cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const { reason } = req.body;

        const result = await paymentService.cancelAndRefundBooking(id, userId, reason);

        // Determine appropriate message based on refund status
        let message = 'Booking cancelled successfully.';
        if (result.refund) {
            message += ` A refund of ${result.refund.amount} ${result.refund.currency.toUpperCase()} has been processed.`;
        }

        res.status(200).json({
            success: true,
            message,
            data: {
                booking: result.booking,
                refund: result.refund
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Rate and review a completed booking
 * @route POST /api/customer/bookings/:id/rate
 * @access Private/Customer
 */
const rateBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customerId = req.user._id;
        const { rating, review } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            throw new ApiError('Rating must be between 1 and 5', 400);
        }

        // Verify booking belongs to customer and is completed
        const booking = await bookingService.getBookingById(id);

        if (!booking || booking.customerId.toString() !== customerId.toString()) {
            throw new ApiError('Booking not found or unauthorized', 404);
        }

        if (booking.status !== 'completed') {
            throw new ApiError('Only completed bookings can be rated', 400);
        }

        // Add rating
        const updatedBooking = await bookingService.rateBooking(id, rating, review);

        res.status(200).json({
            success: true,
            message: 'Booking rated successfully',
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get available time slots for a barber
 * @route GET /api/customer/bookings/available-slots
 * @access Private/Customer
 */
const getAvailableTimeSlots = async (req, res, next) => {
    try {
        const { barberId, date, serviceId } = req.query;

        if (!barberId || !date || !serviceId) {
            throw new ApiError('Barber ID, date, and service ID are required', 400);
        }

        const slots = await bookingService.getAvailableTimeSlots(
            barberId,
            new Date(date),
            serviceId
        );

        res.status(200).json({
            success: true,
            data: slots
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Process cash payment for a booking
 * @route POST /api/customer/bookings/:id/pay/cash
 * @access Private/Customer
 */
const processCashPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Verify booking exists and belongs to user
        const booking = await bookingService.getBookingById(id);

        if (!booking || booking.customerId.toString() !== userId.toString()) {
            throw new ApiError('Booking not found or unauthorized', 404);
        }

        // Process cash payment
        const payment = await paymentService.processCashPayment(id, userId);

        res.status(200).json({
            success: true,
            message: 'Cash payment recorded. Pay at the time of service.',
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create Stripe payment intent for a booking
 * @route POST /api/customer/bookings/:id/pay/card/intent
 * @access Private/Customer
 */
const createCardPaymentIntent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Verify booking exists and belongs to user
        const booking = await bookingService.getBookingById(id);

        if (!booking || booking.customerId.toString() !== userId.toString()) {
            throw new ApiError('Booking not found or unauthorized', 404);
        }

        // Create payment intent
        const paymentIntent = await paymentService.createPaymentIntent(id, userId);

        res.status(200).json({
            success: true,
            data: paymentIntent
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Confirm Stripe payment for a booking
 * @route POST /api/customer/bookings/:id/pay/card/confirm
 * @access Private/Customer
 */
const confirmCardPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { paymentIntentId } = req.body;
        const userId = req.user._id;

        if (!paymentIntentId) {
            throw new ApiError('Payment Intent ID is required', 400);
        }

        // Process card payment
        const payment = await paymentService.processStripePayment(paymentIntentId, id, userId);

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get upcoming bookings
 * @route GET /api/customer/bookings/upcoming
 * @access Private/Customer
 */
const getUpcomingBookings = async (req, res, next) => {
    try {
        const customerId = req.user._id;
        const { limit = 5 } = req.query;

        const now = new Date();

        const options = {
            page: 1,
            limit: parseInt(limit),
            status: ['pending', 'confirmed'],
            sortBy: 'bookingDate',
            sortOrder: 'asc',
            startDate: now
        };

        const result = await bookingService.getBookingsByCustomer(customerId, options);

        res.status(200).json({
            success: true,
            data: result.bookings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get past bookings
 * @route GET /api/customer/bookings/past
 * @access Private/Customer
 */
const getPastBookings = async (req, res, next) => {
    try {
        const customerId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const now = new Date();

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            status: ['completed', 'cancelled', 'noShow'],
            sortBy: 'bookingDate',
            sortOrder: 'desc',
            endDate: now
        };

        const result = await bookingService.getBookingsByCustomer(customerId, options);

        res.status(200).json({
            success: true,
            data: result.bookings,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMyBookings,
    getBookingDetails,
    createBooking,
    cancelBooking,
    rateBooking,
    getAvailableTimeSlots,
    getShopAvailability,
    processCashPayment,
    createCardPaymentIntent,
    confirmCardPayment,
    getUpcomingBookings,
    getPastBookings
};