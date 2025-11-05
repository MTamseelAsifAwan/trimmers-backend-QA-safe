/**
 * Get all bookings for shops owned by the authenticated shop owner
 * @route GET /api/bookings/shop/my?status=...
 * @access Private/ShopOwner
 */
const Shop = require('../../../models/Shop');
const Booking = require('../../../models/Booking');
const getMyShopBookings = async (req, res, next) => {
    try {
        const { status, page, limit, sortBy, sortOrder } = req.query;
        // Find all shops owned by the authenticated user
        const shops = await Shop.find({ ownerId: req.user._id });
        const shopIds = shops.map(shop => shop._id);
        if (shopIds.length === 0) {
            return res.status(200).json({ success: true, data: [], pagination: { total: 0 } });
        }
        // Build query for bookings
        const query = { shopId: { $in: shopIds } };
        if (status) query.status = status;
        // Pagination and sorting
        const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
        const bookings = await Booking.find(query)
            .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit ? parseInt(limit) : 50);
        const total = await Booking.countDocuments(query);
        res.status(200).json({
            success: true,
            data: bookings,
            pagination: { total, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 }
        });
    } catch (error) {
        next(error);
    }
};
/**
 * Get available time slots for a shop
 * @route GET /api/bookings/shop-available-slots?shopId=...&date=...&serviceId=...
 * @access Public
 */
const getShopAvailableTimeSlots = async (req, res, next) => {
    try {
        const { shopId, date, serviceId } = req.query;
        if (!shopId || !date || !serviceId) {
            throw new ApiError('shopId, date, and serviceId are required', 400);
        }
        // Use new shop slot logic
        const shopSlotService = require('../../../services/bookingService.shopSlots');
        const slots = await shopSlotService.getAvailableShopTimeSlots(shopId, new Date(date), serviceId);
        res.status(200).json({
            success: true,
            data: slots
        });
    } catch (error) {
        next(error);
    }
};
/**
 * Approve a booking (shop owner)
 * @route POST /api/bookings/:id/approve
 * @access Private/ShopOwner
 */
const approveBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Only shop owner can approve
        // Update status from 'pending' to 'pending'
        const updatedBooking = await bookingService.approveBooking(id, req.user._id);
        res.status(200).json({
            success: true,
            message: 'Booking approved',
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reassign a booking (shop owner)
 * @route POST /api/bookings/:id/reassign
 * @access Private/ShopOwner
 * @requestBody {
 *   "newBarberId": "string", // ID of another barber from your shop
 *   "shopOwnerId": "string",
 *   "bookingTime": { "time": "HH:mm" }
 * }
 */
const reassignBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newBarberId, shopOwnerId, bookingTime } = req.body;
        
        console.log('Received booking time:', bookingTime); // Debug log
        
        // Check required fields
        if (!newBarberId) {
            throw new ApiError('New barber ID is required', 400);
        }

        // Parse and validate booking time
        if (!bookingTime || !bookingTime.time) {
            throw new ApiError('Valid bookingTime with time (HH:mm format) is required', 400);
        }

        // Parse the time string (expecting "HH:mm" format)
        const timeMatch = bookingTime.time.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
            throw new ApiError('Invalid time format. Expected HH:mm (e.g., "16:30")', 400);
        }

        // Convert to the format expected by the service
        const formattedBookingTime = {
            hour: parseInt(timeMatch[1], 10),
            minute: parseInt(timeMatch[2], 10)
        };

        console.log('Formatted booking time:', formattedBookingTime); // Debug log

        // Validate time values
        if (formattedBookingTime.hour < 0 || formattedBookingTime.hour > 23 || 
            formattedBookingTime.minute < 0 || formattedBookingTime.minute > 59) {
            throw new ApiError('Invalid time values. Hours must be 0-23, minutes must be 0-59', 400);
        }

        // Get the booking to verify shop ownership
        const booking = await Booking.findById(id).populate('shopId');
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Verify shop owner has rights to this booking
        if (!booking.shopId || booking.shopId.ownerId.toString() !== req.user._id.toString()) {
            throw new ApiError('You are not authorized to reassign this booking', 403);
        }

        // Call service with formatted time
        const updatedBooking = await bookingService.reassignBooking(
            id, 
            newBarberId,
            req.user._id,
            null,
            formattedBookingTime
        );
        
        res.status(200).json({
            success: true,
            message: 'Booking reassigned successfully',
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};
// src/api/bookings/controllers/bookingController.js
const bookingService = require('../../../services/bookingService');
const paymentService = require('../../../services/paymentService');
const notificationService = require('../../../services/notificationService');
const Barber = require('../../../models/Barber');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Create a new booking
 * @route POST /api/bookings
 * @access Private
 */
const createBooking = async (req, res, next) => {
    try {
        console.log('🚀 [createBooking] Customer initiated booking request');
        console.log('👤 [createBooking] Customer ID:', req.user._id);

        // Set customer ID from authenticated user
        req.body.customerId = req.user._id;

        const booking = await bookingService.createBooking(req.body);

        console.log('✅ [createBooking] Booking created successfully:', {
            bookingId: booking._id,
            uid: booking.uid,
            status: booking.status,
            service: booking.serviceName,
            date: booking.bookingDate,
            time: booking.bookingTime
        });

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            data: {
                bookingId: booking._id,
                uid: booking.uid,
                status: booking.status,
                serviceName: booking.serviceName,
                bookingDate: booking.bookingDate,
                bookingTime: booking.bookingTime,
                price: booking.price,
                duration: booking.duration
            }
        });
    } catch (error) {
        console.error('❌ [createBooking] Booking creation failed:', error.message);
        next(error);
    }
};

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Private
 */
const getBookingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const booking = await bookingService.getBookingById(id);

        // Check if user is authorized to view this booking
        const isCustomer = booking.customerId._id.toString() === req.user._id.toString();
        const isBarber = booking.barberId._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isShopOwner = req.user.role === 'shop_owner' &&
            booking.shopId &&
            booking.shopId.ownerId.toString() === req.user._id.toString();

        if (!isCustomer && !isBarber && !isAdmin && !isShopOwner) {
            throw new ApiError('You are not authorized to view this booking', 403);
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
 * Get booking by UID
 * @route GET /api/bookings/uid/:uid
 * @access Private
 */
const getBookingByUid = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const booking = await bookingService.getBookingByUid(uid);

        // Check if user is authorized to view this booking
        const isCustomer = booking.customerId._id.toString() === req.user._id.toString();
        const isBarber = booking.barberId._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isShopOwner = req.user.role === 'shop_owner' &&
            booking.shopId &&
            booking.shopId.ownerId.toString() === req.user._id.toString();

        if (!isCustomer && !isBarber && !isAdmin && !isShopOwner) {
            throw new ApiError('You are not authorized to view this booking', 403);
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
 * Get bookings by customer
 * @route GET /api/bookings/customer
 * @access Private
 */
const getCustomerBookings = async (req, res, next) => {
    try {
        const customerId = req.user._id;
        const { page, limit, status, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
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
 * Get bookings by barber
 * @route GET /api/bookings/barber/:barberId
 * @access Private
 */
const getBarberBookings = async (req, res, next) => {
    try {
        const { barberId } = req.params;
        const { page, limit, status, date, sortBy, sortOrder } = req.query;

        // Check authorization
        // Only the barber themselves, shop owners, or admins can view a barber's bookings
        const isAdmin = req.user.role === 'admin';
        const isBarber = req.user.role === 'barber' && req.barber && req.barber._id.toString() === barberId;
        const isShopOwner = req.user.role === 'shop_owner';

        if (!isAdmin && !isBarber && !isShopOwner) {
            throw new ApiError('You are not authorized to view these bookings', 403);
        }

        const options = {
            page,
            limit,
            status,
            date,
            sortBy,
            sortOrder
        };

        const result = await bookingService.getBookingsByBarber(barberId, options);

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
 * Get bookings by shop
 * @route GET /api/bookings/shop/:shopId
 * @access Private
 */
const getShopBookings = async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { page, limit, status, date, barberId, sortBy, sortOrder } = req.query;

        // Check authorization
        // Only the shop owner or admins can view a shop's bookings
        const isAdmin = req.user.role === 'admin';
        let isShopOwner = false;
        if (req.user.role === 'shop_owner') {
            const Shop = require('../../../models/Shop');
            const shop = await Shop.findById(shopId);
            if (shop && shop.ownerId && shop.ownerId.toString() === req.user._id.toString()) {
                isShopOwner = true;
            }
        }
        if (!isAdmin && !isShopOwner) {
            throw new ApiError('You are not authorized to view these bookings', 403);
        }

        const options = {
            page,
            limit,
            status,
            date,
            barberId,
            sortBy,
            sortOrder
        };

        const result = await bookingService.getBookingsByShop(shopId, options);

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
 * Update booking status
 * @route PATCH /api/bookings/:id/status
 * @access Private
 */
const updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!status) {
            throw new ApiError('Status is required', 400);
        }

        // Get current booking and barber details to check authorization
        const booking = await bookingService.getBookingById(id);
        const barber = await Barber.findById(booking.barberId).populate('userId');

        // Check authorization based on new status
        const isCustomer = booking.customerId._id.toString() === req.user._id.toString();
        const isBarber = barber && barber.userId && barber.userId._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isShopOwner = req.user.role === 'shop_owner' &&
            booking.shopId &&
            booking.shopId.ownerId.toString() === req.user._id.toString();

        // Authorization rules based on status change
        if (status === 'cancelled') {
            // Customers, barbers, shop owners and admins can cancel bookings
            if (!isCustomer && !isBarber && !isAdmin && !isShopOwner) {
                throw new ApiError('You are not authorized to cancel this booking', 403);
            }
        } else if (status === 'confirmed') {
            // Only barbers, shop owners and admins can confirm bookings
            if (!isBarber && !isAdmin && !isShopOwner) {
                throw new ApiError('You are not authorized to confirm this booking', 403);
            }
        } else if (status === 'completed') {
            // Only barbers, shop owners and admins can complete bookings
            if (!isBarber && !isAdmin && !isShopOwner) {
                throw new ApiError('You are not authorized to complete this booking', 403);
            }
        } else if (status === 'noShow') {
            // Only barbers, shop owners and admins can mark no-shows
            if (!isBarber && !isAdmin && !isShopOwner) {
                throw new ApiError('You are not authorized to mark this booking as no-show', 403);
            }
        }

        const updatedBooking = await bookingService.updateBookingStatus(id, status, reason);

        // Send notifications
        if (status === 'confirmed') {
            await notificationService.sendBookingNotification(
                booking.customerId.toString(),
                updatedBooking,
                'confirmed'
            );
        } else if (status === 'completed') {
            await notificationService.sendBookingNotification(
                booking.customerId.toString(),
                updatedBooking,
                'completed'
            );
        } else if (status === 'cancelled') {
            // Notify the other party about cancellation
            if (isCustomer) {
                await notificationService.sendBookingNotification(
                    booking.barberId.toString(),
                    updatedBooking,
                    'cancelled'
                );
            } else {
                await notificationService.sendBookingNotification(
                    booking.customerId.toString(),
                    updatedBooking,
                    'cancelled'
                );
            }
        }

        res.status(200).json({
            success: true,
            message: `Booking ${status} successfully`,
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Rate and review a booking
 * @route POST /api/bookings/:id/rate
 * @access Private
 */
const rateBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        if (!rating) {
            throw new ApiError('Rating is required', 400);
        }

        // Get booking to check authorization
        const booking = await bookingService.getBookingById(id);

        // Only the customer who made the booking can rate it
        if (booking.customerId._id.toString() !== req.user._id.toString()) {
            throw new ApiError('You are not authorized to rate this booking', 403);
        }

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
 * Get available time slots for a provider on a date
 * @route GET /api/bookings/available-slots
 * @access Public
 * @query {string} barberId - Barber ID (legacy support)
 * @query {string} providerId - Provider ID (barber or freelancer)
 * @query {string} date - Date in YYYY-MM-DD format
 * @query {string} serviceId - Service ID
 */
const getAvailableTimeSlots = async (req, res, next) => {
    try {
        const { barberId, providerId, date, serviceId } = req.query;

        // Support both barberId and providerId for backward compatibility
        const providerIdToUse = providerId || barberId;

        if (!providerIdToUse || !date || !serviceId) {
            throw new ApiError('Provider ID, date, and service ID are required', 400);
        }

        const slots = await bookingService.getAvailableTimeSlots(
            providerIdToUse,
            new Date(date),
            serviceId
        );

        // Format slots as ["HH:MM", ...]
        const formattedSlots = slots.map(slot => {
            const hour = slot.hour.toString().padStart(2, '0');
            const minute = slot.minute.toString().padStart(2, '0');
            return `${hour}:${minute}`;
        });

        res.status(200).json({
            success: true,
            data: formattedSlots
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Accept a booking request (barber/freelancer/shop owner)
 * @route POST /api/bookings/:id/accept
 * @access Private/Barber|Freelancer|ShopOwner
 */
const acceptBookingRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        console.log('✅ [acceptBookingRequest] Barber/freelancer accepting booking:', {
            bookingId: id,
            providerId: req.user._id,
            reason
        });

        const updatedBooking = await bookingService.acceptBookingRequest(id, req.user._id, reason);

        console.log('✅ [acceptBookingRequest] Booking accepted successfully:', {
            bookingId: updatedBooking._id,
            uid: updatedBooking.uid,
            status: updatedBooking.status
        });

        res.status(200).json({
            success: true,
            message: 'Booking request accepted successfully',
            data: {
                bookingId: updatedBooking._id,
                uid: updatedBooking.uid,
                status: updatedBooking.status,
                serviceName: updatedBooking.serviceName,
                bookingDate: updatedBooking.bookingDate,
                bookingTime: updatedBooking.bookingTime,
                customerName: updatedBooking.customerName
            }
        });
    } catch (error) {
        console.error('❌ [acceptBookingRequest] Failed to accept booking:', error.message);
        next(error);
    }
};

/**
 * Reject a booking request (barber/freelancer/shop owner)
 * @route POST /api/bookings/:id/reject
 * @access Private/Barber|Freelancer|ShopOwner
 */
const rejectBookingRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

       

        console.log(' [rejectBookingRequest] Barber/freelancer rejecting booking:', {
            bookingId: id,
            providerId: req.user._id,
            
        });

        const updatedBooking = await bookingService.rejectBookingRequest(id, req.user._id, reason);

        console.log(' [rejectBookingRequest] Booking rejected successfully:', {
            bookingId: updatedBooking._id,
            uid: updatedBooking.uid,
            status: updatedBooking.status
        });

        res.status(200).json({
            success: true,
            message: 'Booking request rejected successfully',
            data: {
                bookingId: updatedBooking._id,
                uid: updatedBooking.uid,
                status: updatedBooking.status,
                serviceName: updatedBooking.serviceName,
                bookingDate: updatedBooking.bookingDate,
                bookingTime: updatedBooking.bookingTime,
                customerName: updatedBooking.customerName
            }
        });
    } catch (error) {
        console.error(' [rejectBookingRequest] Failed to reject booking:', error.message);
        next(error);
    }
};

/**
 * Get pending booking requests for current provider (barber/freelancer)
 * @route GET /api/bookings/requests/pending
 * @access Private/Barber|Freelancer
 */
const getPendingBookingRequests = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        console.log('📋 [getPendingBookingRequests] Getting pending requests for provider:', {
            providerId: req.user._id,
            page,
            limit
        });

        const result = await bookingService.getPendingBookingRequests(req.user._id, {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10
        });

        console.log('📋 [getPendingBookingRequests] Retrieved pending requests:', {
            count: result.bookings.length,
            total: result.pagination.total,
            providerId: req.user._id
        });

        res.status(200).json({
            success: true,
            data: result.bookings,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('❌ [getPendingBookingRequests] Failed to get pending requests:', error.message);
        next(error);
    }
};

const processPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const paymentData = req.body;

        // Get booking to check authorization
        const booking = await bookingService.getBookingById(id);

        // Only the customer who made the booking can pay for it
        if (booking.customerId._id.toString() !== req.user._id.toString()) {
            throw new ApiError('You are not authorized to pay for this booking', 403);
        }

        // Process payment
        const payment = await paymentService.createPayment(id, paymentData);

        // If payment is completed, update booking status to confirmed
        if (payment.status === 'completed') {
            await bookingService.updateBookingStatus(id, 'confirmed');

            // Send confirmation notification to customer
            await notificationService.sendBookingNotification(
                booking.customerId.toString(),
                booking,
                'confirmed'
            );

            // Send notification to barber
            await notificationService.sendPaymentNotification(
                booking.barberId.toString(),
                payment,
                'completed'
            );
        }

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
 * Get bookings for authenticated barber
 * @route GET /api/bookings/barber/my
 * @access Private/Barber
 */
const getMyBarberBookings = async (req, res, next) => {
    try {
        const { status, page, limit, sortBy, sortOrder } = req.query;
        // Only allow barbers
        if (req.user.role !== 'barber') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const query = { barberId: req.user._id };
        if (status) query.status = status;
        const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
        const bookings = await Booking.find(query)
            .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit ? parseInt(limit) : 50);
        
        // Transform status for barber view: rejected_barber should show as rejected
        const transformedBookings = bookings.map(booking => ({
            ...booking.toObject(),
            status: booking.status === 'rejected_barber' ? 'rejected' : booking.status
        }));
        
        const total = await Booking.countDocuments(query);
        res.status(200).json({
            success: true,
            data: transformedBookings,
            pagination: { total, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get bookings for authenticated freelancer
 * @route GET /api/bookings/freelancer/my
 * @access Private/Freelancer
 */
const getMyFreelancerBookings = async (req, res, next) => {
    try {
        const { status, page, limit, sortBy, sortOrder } = req.query;
        // Only allow freelancers
        if (req.user.role !== 'freelancer') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const query = { freelancerId: req.user._id };
        if (status) query.status = status;
        const skip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
        const bookings = await Booking.find(query)
            .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit ? parseInt(limit) : 50);
        
        // Transform status for freelancer view: rejected_barber should show as rejected
        const transformedBookings = bookings.map(booking => ({
            ...booking.toObject(),
            status: booking.status === 'rejected_barber' ? 'rejected' : booking.status
        }));
        
        const total = await Booking.countDocuments(query);
        res.status(200).json({
            success: true,
            data: transformedBookings,
            pagination: { total, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get bookings for authenticated user based on their role
 * @route GET /api/bookings/me
 * @access Private
 */
const getMyBookings = async (req, res, next) => {
    try {
        const { page, limit, status, sortBy, sortOrder } = req.query;
        const userRole = req.user.role;
        const userId = req.user._id;

        let query = {};
        let result;

        switch (userRole) {
            case 'customer':
                // Get customer's bookings with populated data
                query = { customerId: userId };
                if (status) query.status = status;
                
                // Get raw booking documents with the SAME query, sort
                const rawBookings = await Booking.find(query)
                    .select('_id barberId')
                    .sort({ [sortBy || 'createdAt']: sortOrder === 'asc' ? 1 : -1 })
                    .lean();
                
                const customerBookings = await Booking.find(query)
                    .populate('customerId', 'firstName lastName email phone')
                    .populate('barberId', 'firstName lastName email phone profileImage')
                    .populate('shopId', 'name location address')
                    .populate('serviceId', 'name description duration price')
                    .sort({ [sortBy || 'createdAt']: sortOrder === 'asc' ? 1 : -1 });
                const customerTotal = await Booking.countDocuments(query);

                // Get ALL barberId values (both populated and unpopulated) from raw booking documents
                const allBarberIds = rawBookings.map(b => b.barberId).filter(Boolean);
                
                const Freelancer = require('../../../models/Freelancer');
                
                // Query both collections with ALL barber IDs
                const [barbers, freelancers] = await Promise.all([
                    Barber.find({ _id: { $in: allBarberIds } }).select('_id role firstName lastName'),
                    Freelancer.find({ _id: { $in: allBarberIds } }).select('_id role firstName lastName')
                ]);
                
                // Create a map of ID to role
                const providerRoleMap = new Map();
                barbers.forEach(b => providerRoleMap.set(b._id.toString(), b.role));
                freelancers.forEach(f => providerRoleMap.set(f._id.toString(), f.role));

                // Create a map of booking ID to raw barberId for quick lookup
                const bookingIdToBarberIdMap = new Map();
                rawBookings.forEach(rb => {
                    if (rb.barberId) {
                        bookingIdToBarberIdMap.set(rb._id.toString(), rb.barberId.toString());
                    }
                });

                // Transform the data to match desired structure
                const transformedCustomerBookings = customerBookings.map(booking => {
                    // Get the raw barberId from the map using booking ID
                    const rawBarberId = bookingIdToBarberIdMap.get(booking._id.toString());
                    // Get role from the map using raw barberId
                    const role = rawBarberId ? (providerRoleMap.get(rawBarberId) || 'barber') : 'barber';
                    
                    return {
                    _id: booking._id,
                    customerId: booking.customerId?._id,
                    customerName: booking.customerName,
                    barberId: {
                        _id: rawBarberId || booking.barberId?._id,
                        name: booking.barberName,
                        phone: booking.barberId?.phone,
                    },
                    barberName: booking.barberName,
                    role: role.charAt(0).toUpperCase() + role.slice(1),

                    shopId: booking.shopId ? {
                        _id: booking.shopId._id,
                        name: booking.shopId.name,
                        location: booking.shopId.location
                    } : null,
                    shopName: booking.shopId?.name ? booking.shopId.name : null,
                    serviceId: {
                        _id: booking.serviceId?._id,
                        name: booking.serviceName,
                        description: booking.serviceId?.description
                    },
                    serviceName: booking.serviceName,
                    serviceType: booking.serviceType,
                    price: booking.price,
                    bookingDate: booking.bookingDate,
                    bookingTime: {
                        start: `${booking.bookingTime.hour.toString().padStart(2, '0')}:${booking.bookingTime.minute.toString().padStart(2, '0')}`,
                        end: `${(booking.bookingTime.hour + Math.floor((booking.bookingTime.minute + booking.duration) / 60)).toString().padStart(2, '0')}:${((booking.bookingTime.minute + booking.duration) % 60).toString().padStart(2, '0')}`
                    },
                    duration: booking.duration,
                    status: booking.status === 'rejected_barber' ? 'pending' : booking.status,
                    notes: booking.notes,
                    paymentStatus: booking.paymentStatus,
                    cancellationReason: booking.cancellationReason,
                    rating: booking.review?.rating,
                    review: booking.review?.comment,
                    countryId: booking.countryId,
                    uid: booking.uid,
                    createdAt: booking.createdAt,
                    updatedAt: booking.updatedAt,
                    __v: booking.__v
                    };
                });

                result = {
                    bookings: transformedCustomerBookings,
                    total: customerTotal
                };
                break;

            case 'barber':
                // Get barber's bookings with populated data, including reassigned ones
                query = {
                    $or: [
                        { barberId: userId },
                        { 
                            reassignedBarberId: userId,
                            status: 'reassigned'
                        }
                    ]
                };
                if (status) {
                    if (status === 'reassigned') {
                        query = { 
                            reassignedBarberId: userId,
                            status: 'reassigned'
                        };
                    } else {
                        query = {
                            barberId: userId,
                            status: status
                        };
                    }
                }
                const barberSkip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
                
                // Get raw booking documents with the SAME query, sort, skip, and limit
                const rawBarberBookings = await Booking.find(query)
                    .select('_id barberId')
                    .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
                    .skip(barberSkip)
                    .limit(limit ? parseInt(limit) : 50)
                    .lean();
                
                const barberBookings = await Booking.find(query)
                    .populate('customerId', 'firstName lastName email phone')
                    .populate('barberId', 'firstName lastName email phone profileImage')
                    .populate('shopId', 'name location address')
                    .populate('serviceId', 'name description duration price')
                    .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
                    .skip(barberSkip)
                    .limit(limit ? parseInt(limit) : 50);
                const barberTotal = await Booking.countDocuments(query);

                // Get ALL barberId values from raw booking documents
                const barberAllBarberIds = rawBarberBookings.map(b => b.barberId).filter(Boolean);
                
                const [barbersInBarberBookings, freelancersInBarberBookings] = await Promise.all([
                    Barber.find({ _id: { $in: barberAllBarberIds } }).select('_id role'),
                    require('../../../models/Freelancer').find({ _id: { $in: barberAllBarberIds } }).select('_id role')
                ]);
                
                const barberProviderRoleMap = new Map();
                barbersInBarberBookings.forEach(b => barberProviderRoleMap.set(b._id.toString(), b.role));
                freelancersInBarberBookings.forEach(f => barberProviderRoleMap.set(f._id.toString(), f.role));

                // Create a map of booking ID to raw barberId for quick lookup
                const barberBookingIdToBarberIdMap = new Map();
                rawBarberBookings.forEach(rb => {
                    if (rb.barberId) {
                        barberBookingIdToBarberIdMap.set(rb._id.toString(), rb.barberId.toString());
                    }
                });

                // Transform the data to match desired structure
                const transformedBarberBookings = barberBookings.map(booking => {
                    const rawBarberId = barberBookingIdToBarberIdMap.get(booking._id.toString());
                    const role = rawBarberId ? (barberProviderRoleMap.get(rawBarberId) || 'barber') : 'barber';
                    
                    return {
                    _id: booking._id,
                    customerId: booking.customerId?._id,
                    customerName: booking.customerName,
                    barberId: {
                        _id: rawBarberId || booking.barberId?._id,
                        name: booking.barberName,
                        phone: booking.barberId?.phone,
                        role: role.charAt(0).toUpperCase() + role.slice(1)
                    },
                    barberName: booking.barberName,
                    shopId: booking.shopId ? {
                        _id: booking.shopId._id,
                        name: booking.shopId.name,
                        location: booking.shopId.location
                    } : null,
                    serviceId: {
                        _id: booking.serviceId?._id,
                        name: booking.serviceName,
                        description: booking.serviceId?.description
                    },
                    serviceName: booking.serviceName,
                    serviceType: booking.serviceType,
                    price: booking.price,
                    bookingDate: booking.bookingDate,
                    bookingTime: {
                        start: `${booking.bookingTime.hour.toString().padStart(2, '0')}:${booking.bookingTime.minute.toString().padStart(2, '0')}`,
                        end: `${(booking.bookingTime.hour + Math.floor((booking.bookingTime.minute + booking.duration) / 60)).toString().padStart(2, '0')}:${((booking.bookingTime.minute + booking.duration) % 60).toString().padStart(2, '0')}`
                    },
                    duration: booking.duration,
                    status: booking.status === 'rejected_barber' ? 'rejected' : booking.status,
                    notes: booking.notes,
                    paymentStatus: booking.paymentStatus,
                    cancellationReason: booking.cancellationReason,
                    rating: booking.review?.rating,
                    review: booking.review?.comment,
                    countryId: booking.countryId,
                    uid: booking.uid,
                    createdAt: booking.createdAt,
                    updatedAt: booking.updatedAt,
                    __v: booking.__v
                    };
                });

                result = {
                    bookings: transformedBarberBookings,
                    pagination: {
                        total: barberTotal,
                        page: page ? parseInt(page) : 1,
                        limit: limit ? parseInt(limit) : 50
                    }
                };
                break;

            case 'freelancer':
                // Get freelancer's bookings (freelancers are stored in barberId field) with populated data
                query = { barberId: userId };
                if (status) query.status = status;
                const freelancerSkip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
                
                // Get raw booking documents with the SAME query, sort, skip, and limit
                const rawFreelancerBookings = await Booking.find(query)
                    .select('_id barberId')
                    .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
                    .skip(freelancerSkip)
                    .limit(limit ? parseInt(limit) : 50)
                    .lean();
                
                const freelancerBookings = await Booking.find(query)
                    .populate('customerId', 'firstName lastName email phone')
                    .populate('barberId', 'firstName lastName email phone profileImage')
                    .populate('shopId', 'name location address')
                    .populate('serviceId', 'name description duration price')
                    .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
                    .skip(freelancerSkip)
                    .limit(limit ? parseInt(limit) : 50);
                const freelancerTotal = await Booking.countDocuments(query);

                // Get ALL barberId values from raw booking documents
                const freelancerAllBarberIds = rawFreelancerBookings.map(b => b.barberId).filter(Boolean);
                
                const [barbersInFreelancerBookings, freelancersInFreelancerBookings] = await Promise.all([
                    Barber.find({ _id: { $in: freelancerAllBarberIds } }).select('_id role'),
                    require('../../../models/Freelancer').find({ _id: { $in: freelancerAllBarberIds } }).select('_id role')
                ]);
                
                const freelancerProviderRoleMap = new Map();
                barbersInFreelancerBookings.forEach(b => freelancerProviderRoleMap.set(b._id.toString(), b.role));
                freelancersInFreelancerBookings.forEach(f => freelancerProviderRoleMap.set(f._id.toString(), f.role));

                // Create a map of booking ID to raw barberId for quick lookup
                const freelancerBookingIdToBarberIdMap = new Map();
                rawFreelancerBookings.forEach(rb => {
                    if (rb.barberId) {
                        freelancerBookingIdToBarberIdMap.set(rb._id.toString(), rb.barberId.toString());
                    }
                });

                // Transform the data to match desired structure
                const transformedFreelancerBookings = freelancerBookings.map(booking => {
                    const rawBarberId = freelancerBookingIdToBarberIdMap.get(booking._id.toString());
                    const role = rawBarberId ? (freelancerProviderRoleMap.get(rawBarberId) || 'freelancer') : 'freelancer';
                    
                    return {
                    _id: booking._id,
                    customerId: booking.customerId?._id,
                    customerName: booking.customerName,
                    barberId: {
                        _id: rawBarberId || booking.barberId?._id,
                        name: booking.barberName,
                        phone: booking.barberId?.phone,
                        role: role.charAt(0).toUpperCase() + role.slice(1)
                    },
                    barberName: booking.barberName,
                    shopId: booking.shopId ? {
                        _id: booking.shopId._id,
                        name: booking.shopId.name,
                        location: booking.shopId.location
                    } : null,
                    serviceId: {
                        _id: booking.serviceId?._id,
                        name: booking.serviceName,
                        description: booking.serviceId?.description
                    },
                    serviceName: booking.serviceName,
                    serviceType: booking.serviceType,
                    price: booking.price,
                    bookingDate: booking.bookingDate,
                    bookingTime: {
                        start: `${booking.bookingTime.hour.toString().padStart(2, '0')}:${booking.bookingTime.minute.toString().padStart(2, '0')}`,
                        end: `${(booking.bookingTime.hour + Math.floor((booking.bookingTime.minute + booking.duration) / 60)).toString().padStart(2, '0')}:${((booking.bookingTime.minute + booking.duration) % 60).toString().padStart(2, '0')}`
                    },
                    duration: booking.duration,
                    status: booking.status === 'rejected_barber' ? 'rejected' : booking.status,
                    notes: booking.notes,
                    paymentStatus: booking.paymentStatus,
                    cancellationReason: booking.cancellationReason,
                    rating: booking.review?.rating,
                    review: booking.review?.comment,
                    countryId: booking.countryId,
                    uid: booking.uid,
                    createdAt: booking.createdAt,
                    updatedAt: booking.updatedAt,
                    __v: booking.__v
                    };
                });

                result = {
                    bookings: transformedFreelancerBookings,
                    pagination: {
                        total: freelancerTotal,
                        page: page ? parseInt(page) : 1,
                        limit: limit ? parseInt(limit) : 50
                    }
                };
                break;

            case 'shop_owner':
                // Get bookings for all shops owned by the user with populated data
                const shops = await Shop.find({ ownerId: userId });
                const shopIds = shops.map(shop => shop._id);
                if (shopIds.length === 0) {
                    result = {
                        bookings: [],
                        pagination: { total: 0, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 }
                    };
                } else {
                    query = { shopId: { $in: shopIds } };
                    if (status) query.status = status;
                    const shopSkip = page && limit ? (parseInt(page) - 1) * parseInt(limit) : 0;
                    
                    // Get raw booking documents with the SAME query, sort, skip, and limit
                    const rawShopBookings = await Booking.find(query)
                        .select('_id barberId')
                        .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
                        .skip(shopSkip)
                        .limit(limit ? parseInt(limit) : 50)
                        .lean();
                    
                    const shopBookings = await Booking.find(query)
                        .populate('customerId', 'firstName lastName email phone')
                        .populate('barberId', 'firstName lastName email phone profileImage')
                        .populate('shopId', 'name location address')
                        .populate('serviceId', 'name description duration price')
                        .sort({ [sortBy || 'bookingDate']: sortOrder === 'desc' ? -1 : 1 })
                        .skip(shopSkip)
                        .limit(limit ? parseInt(limit) : 50);
                    const shopTotal = await Booking.countDocuments(query);

                    // Get ALL barberId values from raw booking documents
                    const shopAllBarberIds = rawShopBookings.map(b => b.barberId).filter(Boolean);
                    
                    const [barbersInShopBookings, freelancersInShopBookings] = await Promise.all([
                        Barber.find({ _id: { $in: shopAllBarberIds } }).select('_id role'),
                        require('../../../models/Freelancer').find({ _id: { $in: shopAllBarberIds } }).select('_id role')
                    ]);
                    
                    const shopProviderRoleMap = new Map();
                    barbersInShopBookings.forEach(b => shopProviderRoleMap.set(b._id.toString(), b.role));
                    freelancersInShopBookings.forEach(f => shopProviderRoleMap.set(f._id.toString(), f.role));

                    // Create a map of booking ID to raw barberId for quick lookup
                    const shopBookingIdToBarberIdMap = new Map();
                    rawShopBookings.forEach(rb => {
                        if (rb.barberId) {
                            shopBookingIdToBarberIdMap.set(rb._id.toString(), rb.barberId.toString());
                        }
                    });

                    // Transform the data to match desired structure
                    const transformedShopBookings = shopBookings.map(booking => {
                        const rawBarberId = shopBookingIdToBarberIdMap.get(booking._id.toString());
                        const role = rawBarberId ? (shopProviderRoleMap.get(rawBarberId) || 'barber') : 'barber';
                        
                        return {
                        _id: booking._id,
                        customerId: booking.customerId?._id,
                        customerName: booking.customerName,
                        barberId: {
                            _id: rawBarberId || booking.barberId?._id,
                            name: booking.barberName,
                            phone: booking.barberId?.phone,
                            role: role.charAt(0).toUpperCase() + role.slice(1)
                        },
                        barberName: booking.barberName,
                        shopId: booking.shopId ? {
                            _id: booking.shopId._id,
                            name: booking.shopId.name,
                            location: booking.shopId.location
                        } : null,
                        serviceId: {
                            _id: booking.serviceId?._id,
                            name: booking.serviceName,
                            description: booking.serviceId?.description
                        },
                        serviceName: booking.serviceName,
                        serviceType: booking.serviceType,
                        price: booking.price,
                        bookingDate: booking.bookingDate,
                        bookingTime: {
                            start: `${booking.bookingTime.hour.toString().padStart(2, '0')}:${booking.bookingTime.minute.toString().padStart(2, '0')}`,
                            end: `${(booking.bookingTime.hour + Math.floor((booking.bookingTime.minute + booking.duration) / 60)).toString().padStart(2, '0')}:${((booking.bookingTime.minute + booking.duration) % 60).toString().padStart(2, '0')}`
                        },
                        duration: booking.duration,
                        status: booking.status,
                        notes: booking.notes,
                        paymentStatus: booking.paymentStatus,
                        cancellationReason: booking.cancellationReason,
                        rating: booking.review?.rating,
                        review: booking.review?.comment,
                        countryId: booking.countryId,
                        uid: booking.uid,
                        createdAt: booking.createdAt,
                        updatedAt: booking.updatedAt,
                        __v: booking.__v
                        };
                    });

                    result = {
                        bookings: transformedShopBookings,
                        pagination: {
                            total: shopTotal,
                            page: page ? parseInt(page) : 1,
                            limit: limit ? parseInt(limit) : 50
                        }
                    };
                }
                break;

            default:
                // For other roles (admin, super_admin, etc.), return empty result
                result = {
                    bookings: [],
                    pagination: { total: 0, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 50 }
                };
                break;
        }

        res.status(200).json({
            success: true,
            data: result.bookings,
            total: result.total,
            userRole: userRole
        });
    } catch (error) {
        next(error);
    }
};

const getBookingsByRole = async (req, res, next) => {
    try {
        const { role } = req.params;
        const { page, limit, status, date, sortBy, sortOrder } = req.query;

        const bookingService = require('../../../services/bookingService');
        const result = await bookingService.getBookingsByRole(role, {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
            status,
            date,
            sortBy,
            sortOrder
        });

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
 * Update customer's own booking details (only if pending)
 * @route PUT /api/bookings/customer/:id
 * @access Public (no authentication required)
 */
const updateMyBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Extract customerId from request body since authentication is not required
        const { customerId } = updateData;


        // Remove customerId from updateData as it's not a booking field
        const bookingUpdateData = { ...updateData };
        delete bookingUpdateData.customerId;

        console.log('🔄 [updateMyBooking] Received update request:', {
            bookingId: id,
            customerId: customerId || 'Not provided (public access)',
            originalBody: updateData
        });

        // Convert bookingTime from "HH:MM" string to { hour: number, minute: number } if needed
        if (bookingUpdateData.bookingTime) {
            if (typeof bookingUpdateData.bookingTime === 'string') {
                const [hour, minute] = bookingUpdateData.bookingTime.split(':').map(Number);
                bookingUpdateData.bookingTime = { hour, minute };
            } else if (typeof bookingUpdateData.bookingTime === 'object' && !bookingUpdateData.bookingTime.hour && !bookingUpdateData.bookingTime.minute) {
                // Handle case where bookingTime is an object like {"10:00": ""}
                const timeString = Object.keys(bookingUpdateData.bookingTime)[0];
                if (timeString && typeof timeString === 'string') {
                    const [hour, minute] = timeString.split(':').map(Number);
                    bookingUpdateData.bookingTime = { hour, minute };
                }
            }
        }

        console.log('🔄 [updateMyBooking] Processed updateData:', bookingUpdateData);

        const updatedBooking = await bookingService.updateBookingDetailsPublic(id, bookingUpdateData);

        console.log('✅ [updateMyBooking] Booking updated successfully:', {
            bookingId: id,
            uid: updatedBooking.uid,
            status: updatedBooking.status
        });

        res.status(200).json({
            success: true,
            message: 'Booking updated successfully',
            data: updatedBooking
        });
    } catch (error) {
        console.error('❌ [updateMyBooking] Failed to update booking:', {
            bookingId: req.params.id,
            customerId: req.body.customerId || 'Not provided',
            error: error.message,
            stack: error.stack
        });
        next(error);
    }
};

/**
 * Update customer booking details by shop owner (only if pending)
 * @route PUT /api/bookings/shop-owner/{id}
 * @access Private/ShopOwner
 */
const updateCustomerBookingByShopOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        let updateData = req.body;

        // If body is a string, try to parse it
        if (typeof updateData === 'string') {
            try {
                updateData = JSON.parse(updateData);
            } catch (err) {
                console.log(' [updateCustomerBookingByShopOwner] Failed to parse updateData string:', updateData);
                throw new ApiError('Invalid JSON format in request body', 400);
            }
        }

        const updatedBooking = await bookingService.updateCustomerBookingByShopOwner(id, req.user._id, updateData);

        res.status(200).json({
            success: true,
            message: 'Customer booking updated successfully',
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel customer's own booking (only if pending)
 * @route DELETE /api/bookings/customer/:id
 * @access Public (no authentication required)
 */
const cancelMyBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const cancelledBooking = await bookingService.cancelBookingPublic(id, reason);

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: cancelledBooking
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBooking,
    getBookingById,
    getBookingByUid,
    getCustomerBookings,
    getBarberBookings,
    getShopBookings,
    getMyBarberBookings,
    getMyFreelancerBookings,
    getMyShopBookings,
    getBookingsByRole,
    updateBookingStatus,
    rateBooking,
    getAvailableTimeSlots,
    getShopAvailableTimeSlots,
    processPayment,
    approveBooking,
    reassignBooking,
    acceptBookingRequest,
    rejectBookingRequest,
    getPendingBookingRequests,
    getMyBookings,
    updateMyBooking,
    updateCustomerBookingByShopOwner,
    cancelMyBooking
};