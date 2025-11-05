// src/api/shopOwner/controllers/shopOwnerController.js
const shopOwnerService = require('../../../services/shopOwnerService');
const notificationService = require('../../../services/notificationService');
const shopService = require('../../../services/shopService');
const bookingService = require('../../../services/bookingService');
const fileUploadService = require('../../../services/fileUploadService');
const { ApiError } = require('../../../middlewares/errorHandler');
const logger = require('../../../utils/logger');

/**
 * Reject a booking (shop owner)
 * @route POST /api/shop-owners/bookings/:bookingId/reject
 * @access Private/ShopOwner
 */
const rejectBooking = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;

        // Validate shop owner owns the booking's shop
        const booking = await shopOwnerService.getBookingById(bookingId);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Ensure the requester is the owner of the booking's shop
        const currentShopOwner = await shopOwnerService.getShopOwnerByUserId(userId);
        if (!booking.shopId) {
            throw new ApiError('Booking is not associated with a shop', 400);
        }
        const shop = await shopService.getShopById(booking.shopId);
        if (!shop) {
            throw new ApiError('Shop not found for booking', 404);
        }
        const shopOwnerId = shop.ownerId._id ? shop.ownerId._id : shop.ownerId;
        if (shopOwnerId.toString() !== currentShopOwner._id.toString()) {
            throw new ApiError('You are not authorized to manage this booking', 403);
        }

        // Check if booking can be rejected (allow rejecting any non-final status)
        if (['completed', 'cancelled', 'noShow'].includes(booking.status)) {
            throw new ApiError('Booking cannot be rejected in its current state', 400);
        }

        // Update booking status to rejected
        const updatedBooking = await bookingService.updateBookingStatus(bookingId, 'rejected');

        // Notify customer about rejection
        await notificationService.createNotification({
            userId: updatedBooking.customerId,
            title: 'Booking Rejected',
            message: `Your booking for ${updatedBooking.serviceName} has been rejected by the shop owner.`,
            type: 'booking',
            relatedId: updatedBooking._id,
            onModel: 'Booking'
        });

        // Notify assigned barber/freelancer if any
        if (updatedBooking.barberId) {
            await notificationService.createNotification({
                userId: updatedBooking.barberId,
                title: 'Booking Rejected',
                message: `The booking for ${updatedBooking.serviceName} has been rejected by the shop owner.`,
                type: 'booking',
                relatedId: updatedBooking._id,
                onModel: 'Booking'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking rejected successfully',
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get requested bookings for shop owner's shops;

/**
 * Create shop owner profile
 * @route POST /api/shop-owners/profile
 * @access Private/ShopOwner
 */
const createShopOwnerProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const shopOwnerData = req.body;

        const shopOwner = await shopOwnerService.createShopOwnerProfile(userId, shopOwnerData);

        res.status(201).json({
            success: true,
            message: 'Shop owner profile created successfully',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current shop owner profile
 * @route GET /api/shop-owners/profile
 * @access Private/ShopOwner
 */
const getShopOwnerProfile = async (req, res, next) => {
    try {
        // For shop_owner role, req.user is already the ShopOwner document
        const shopOwner = req.user;

        res.status(200).json({
            success: true,
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update shop owner profile
 * @route PUT /api/shop-owners/profile
 * @access Private/ShopOwner
 */
const updateShopOwnerProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const updateData = req.body;

        const shopOwner = await shopOwnerService.updateShopOwnerProfile(userId, updateData);

        res.status(200).json({
            success: true,
            message: 'Shop owner profile updated successfully',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop owner by ID
 * @route GET /api/shop-owners/:id
 * @access Private/Admin,CountryManager,CustomerCare
 */
const getShopOwnerById = async (req, res, next) => {
    try {
        const shopOwner = await shopOwnerService.getShopOwnerById(req.params.id);

        res.status(200).json({
            success: true,
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop owner by UID
 * @route GET /api/shop-owners/uid/:uid
 * @access Private/Admin,CountryManager,CustomerCare
 */
const getShopOwnerByUid = async (req, res, next) => {
    try {
        const shopOwner = await shopOwnerService.getShopOwnerByUid(req.params.uid);

        res.status(200).json({
            success: true,
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all shop owners with pagination
 * @route GET /api/shop-owners
 * @access Private/Admin,CountryManager
 */
const getShopOwners = async (req, res, next) => {
    try {
        // Extract query parameters
        const { page, limit, sortBy, sortOrder, search, verificationStatus } = req.query;

        // Get shop owners with pagination
        const result = await shopOwnerService.getShopOwners({
            page,
            limit,
            sortBy,
            sortOrder,
            search,
            verificationStatus
        });

        res.status(200).json({
            success: true,
            data: result.shopOwners,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update shop owner verification status
 * @route PUT /api/shop-owners/:id/verification
 * @access Private/Admin,CountryManager
 */
const updateVerificationStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!status) {
            throw new ApiError('Status is required', 400);
        }

        const shopOwner = await shopOwnerService.updateVerificationStatus(id, status, rejectionReason);

        res.status(200).json({
            success: true,
            message: `Shop owner verification status updated to ${status}`,
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove verification document
 * @route DELETE /api/shop-owners/documents/:documentUrl
 * @access Private/ShopOwner
 */
const removeVerificationDocument = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { documentUrl } = req.params;

        if (!documentUrl) {
            throw new ApiError('Document URL is required', 400);
        }

        const shopOwner = await shopOwnerService.removeVerificationDocument(userId, documentUrl);

        res.status(200).json({
            success: true,
            message: 'Document removed successfully',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all shops owned by a shop owner
 * @route GET /api/shop-owners/:id/shops
 * @access Private/Admin,CountryManager,ShopOwner
 */
const getShopsByOwner = async (req, res, next) => {
    try {
        const { id } = req.params;

        // If user is shop owner, ensure they only access their own shops
        if (req.user.role === 'shop_owner') {
            if (req.user._id.toString() !== id) {
                throw new ApiError('You can only view your own shops', 403);
            }
        }

        const shops = await shopOwnerService.getShopsByOwner(id);

        res.status(200).json({
            success: true,
            data: shops
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete shop owner
 * @route DELETE /api/shop-owners/:id
 * @access Private/Admin
 */
const deleteShopOwner = async (req, res, next) => {
    try {
        const { id } = req.params;

        const success = await shopOwnerService.deleteShopOwner(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Shop owner deleted successfully'
            });
        } else {
            throw new ApiError('Shop owner deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
* Upload verification document
* @route POST /api/shop-owners/documents/upload
* @access Private/ShopOwner
*/
const uploadVerificationDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError('Document file is required', 400);
        }

        const userId = req.user.id;
        const { documentType } = req.body;

        if (!documentType) {
            throw new ApiError('Document type is required', 400);
        }

        // Upload file to storage
        const fileUrl = await fileUploadService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            'verification-documents'
        );

        // Add document to shop owner profile
        const shopOwner = await shopOwnerService.addVerificationDocument(userId, fileUrl, documentType);

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documentUrl: fileUrl,
                documentType
            }
        });
    } catch (error) {
        next(error);
    }
};


const getOwnerShops = async (req, res, next) => {
    try {
        // For shop_owner role, req.user is already the ShopOwner document
        const shopOwner = req.user;

        const shops = await shopOwnerService.getShopsByOwner(shopOwner._id);

        res.status(200).json({
            success: true,
            data: shops
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Assign a booking to a barber/freelancer
 * @route POST /api/shop-owners/bookings/:bookingId/assign
 * @access Private/ShopOwner
 */
const assignBookingToBarber = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { bookingId } = req.params;
        const { barberId } = req.body || {};

        // Validate shop owner owns the booking's shop
        const booking = await shopOwnerService.getBookingById(bookingId);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Ensure the requester is the owner of the booking's shop
        // Get current shop owner profile (by userId)
        const currentShopOwner = req.user;
        if (!booking.shopId) {
            throw new ApiError('Booking is not associated with a shop', 400);
        }
        const shop = await shopService.getShopById(booking.shopId);
        logger.debug('DEBUG booking.shopId:', booking.shopId);
        logger.debug('DEBUG shop:', shop);
        logger.debug('DEBUG currentShopOwner:', currentShopOwner);
        logger.debug('DEBUG shop.ownerId:', shop.ownerId ? shop.ownerId.toString() : shop.ownerId);
        logger.debug('DEBUG currentShopOwner._id:', currentShopOwner._id ? currentShopOwner._id.toString() : currentShopOwner._id);
        if (!shop) {
            throw new ApiError('Shop not found for booking.shopId', 404);
        }
        if (!shop.ownerId) {
            throw new ApiError('Shop ownerId is not set', 400);
        }
        if (!currentShopOwner._id) {
            throw new ApiError('ShopOwner _id is not set', 400);
        }
        // Handle case where shop.ownerId is populated (object) or just ObjectId
        const shopOwnerId = shop.ownerId && shop.ownerId._id ? shop.ownerId._id : shop.ownerId;
        if (shopOwnerId.toString() !== currentShopOwner._id.toString()) {
            throw new ApiError('You are not authorized to manage this booking', 403);
        }

        // Optionally, check if booking is already assigned/confirmed/rejected
        if (booking.status !== 'pending') {
            throw new ApiError('Booking is not in a pending state', 400);
        }

        // Determine target barber: prefer the one provided, else keep the pre-selected one
        const targetBarberId = barberId || booking.barberId;
        if (!targetBarberId) {
            throw new ApiError('Barber/Freelancer ID is required', 400);
        }

        // Assign the booking
        const updatedBooking = await shopOwnerService.assignBookingToBarber(bookingId, targetBarberId);

        // Notify assigned barber/freelancer
        await notificationService.createNotification({
            userId: targetBarberId,
            title: 'Booking Assigned',
            message: `You have been assigned a booking for ${updatedBooking.serviceName} on ${new Date(updatedBooking.bookingDate).toLocaleDateString()}`,
            type: 'booking',
            relatedId: updatedBooking._id,
            onModel: 'Booking'
        });

        // Notify customer
        await notificationService.createNotification({
            userId: updatedBooking.customerId,
            title: 'Booking Update',
            message: `Your booking for ${updatedBooking.serviceName} has been assigned to a barber/freelancer.`,
            type: 'booking',
            relatedId: updatedBooking._id,
            onModel: 'Booking'
        });

        res.status(200).json({
            success: true,
            message: 'Booking assigned to barber/freelancer successfully',
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Get requested bookings for shop owner's shops
 * @route GET /api/shop-owners/bookings/requested
 * @access Private/ShopOwner
 */
const getRequestedBookings = async (req, res, next) => {
    try {
        // For shop_owner role, req.user is already the ShopOwner document
        const shopOwner = req.user;
        
        const bookings = await shopOwnerService.getRequestedBookings(shopOwner._id);
        
        res.status(200).json({
            success: true,
            message: 'Requested bookings retrieved successfully',
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all bookings for shop owner's shops
 * @route GET /api/shop-owners/bookings/all
 * @access Private/ShopOwner
 */
const getAllShopBookings = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        // For shop_owner role, req.user is already the ShopOwner document
        const shopOwner = req.user;
        
        const bookings = await shopOwnerService.getAllShopBookings(shopOwner._id, {
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
        res.status(200).json({
            success: true,
            message: 'Shop bookings retrieved successfully',
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reassign a rejected booking (freelancer or barber) to another barber
 * @route POST /api/shop-owners/bookings/:bookingId/reassign-rejected
 * @access Private/ShopOwner
 */
const reassignRejectedBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { barberId } = req.body;

        if (!barberId) {
            throw new ApiError('Barber ID is required', 400);
        }

        // Get current shop owner
        const currentShopOwner = req.user;
        if (!currentShopOwner) {
            throw new ApiError('Shop owner profile not found', 404);
        }

        // Validate shop owner owns the booking's shop
        const booking = await shopOwnerService.getBookingById(bookingId);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Check if booking is in rejected state (freelancer_rejected or rejected_barber)
        if (!['freelancer_rejected', 'rejected_barber'].includes(booking.status)) {
            throw new ApiError('Booking is not in a rejected state that can be reassigned', 400);
        }

        // Ensure the requester is the owner of the booking's shop
        if (!booking.shopId) {
            throw new ApiError('Booking is not associated with a shop', 400);
        }

        const shop = await shopService.getShopById(booking.shopId);
        if (!shop) {
            throw new ApiError('Shop not found for booking', 404);
        }

        const shopOwnerId = shop.ownerId._id ? shop.ownerId._id : shop.ownerId;
        if (shopOwnerId.toString() !== currentShopOwner._id.toString()) {
            throw new ApiError('You are not authorized to manage this booking', 403);
        }

        // Reassign the booking to new barber
        const updatedBooking = await shopOwnerService.reassignBooking(bookingId, barberId, currentShopOwner._id);

        // Notify new barber/freelancer
        await notificationService.createNotification({
            userId: barberId,
            title: 'Booking Reassigned',
            message: `A rejected booking for ${updatedBooking.serviceName} has been reassigned to you. Please accept or reject.`,
            type: 'booking',
            relatedId: updatedBooking._id,
            onModel: 'Booking'
        });

        // Notify customer about reassignment
        await notificationService.createNotification({
            userId: updatedBooking.customerId,
            title: 'Booking Update',
            message: `Your booking for ${updatedBooking.serviceName} has been reassigned to another barber/freelancer.`,
            type: 'booking',
            relatedId: updatedBooking._id,
            onModel: 'Booking'
        });

        res.status(200).json({
            success: true,
            message: 'Rejected booking reassigned successfully',
            data: updatedBooking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reschedule a booking (shop owner)
 * @route POST /api/shop-owners/bookings/:bookingId/reschedule
 * @access Private/ShopOwner
 */
const rescheduleBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        // Get current shop owner
        const currentShopOwner = req.user;
        if (!currentShopOwner) {
            throw new ApiError('Shop owner profile not found', 404);
        }

        // Validate shop owner owns the booking's shop
        const booking = await shopOwnerService.getBookingById(bookingId);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Check if booking can be rescheduled
        if (!['assigned', 'pending',  'rescheduled'].includes(booking.status)) {
            throw new ApiError('Booking cannot be rescheduled in its current state', 400);
        }

        // Ensure the requester is the owner of the booking's shop
        if (!booking.shopId) {
            throw new ApiError('Booking is not associated with a shop', 400);
        }

        const shop = await shopService.getShopById(booking.shopId);
        if (!shop) {
            throw new ApiError('Shop not found for booking', 404);
        }

        const shopOwnerId = shop.ownerId._id ? shop.ownerId._id : shop.ownerId;
        if (shopOwnerId.toString() !== currentShopOwner._id.toString()) {
            throw new ApiError('You are not authorized to manage this booking', 403);
        }

        // Reschedule by adding 30 minutes to current booking time
        const currentTime = new Date(booking.bookingDate);
        currentTime.setMinutes(currentTime.getMinutes() + 30);

        booking.bookingDate = currentTime;
        booking.status = 'rescheduled';
        await booking.save();

        // Notify customer about rescheduling
        await notificationService.createNotification({
            userId: booking.customerId._id || booking.customerId,
            title: 'Booking Rescheduled',
            message: `Your booking for ${booking.serviceName} has been rescheduled by the shop owner to ${currentTime.toLocaleString()}.`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
        });

        // Notify barber about rescheduling
        await notificationService.createNotification({
            userId: booking.barberId._id || booking.barberId,
            title: 'Booking Rescheduled',
            message: `Booking for ${booking.serviceName} has been rescheduled by shop owner to ${currentTime.toLocaleString()}.`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
        });

        res.status(200).json({
            success: true,
            message: 'Booking rescheduled successfully',
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barbers for the authenticated shop owner's shops
 * @route GET /api/shop-owners/barbers
 * @access Private/ShopOwner
 */
const getShopBarbers = async (req, res, next) => {
    try {
        const userId = req.user.id;
        logger.debug('getShopBarbers - Starting for userId:', userId);
        logger.debug('getShopBarbers - req.user role:', req.user.role);
        logger.debug('getShopBarbers - req.role:', req.role ? req.role.name : 'No role object');
        
        // For shop_owner role, req.user is already the ShopOwner document
        const shopOwner = req.user;
        logger.debug('getShopBarbers - shopOwner found:', !!shopOwner);
        if (shopOwner) {
            logger.debug('getShopBarbers - shopOwner._id:', shopOwner._id);
            logger.debug('getShopBarbers - shopOwner.role:', shopOwner.role);
        }
        
        if (!shopOwner) {
            throw new ApiError('Shop owner profile not found', 404);
        }

        // Get shops owned by this shop owner
        const shops = await shopOwnerService.getShopsByOwner(shopOwner._id);
        logger.debug('getShopBarbers - shops found:', shops ? shops.length : 0);
        if (shops && shops.length > 0) {
            logger.debug('getShopBarbers - shop IDs:', shops.map(s => s._id));
        }
        
        if (!shops || shops.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No shops found for this shop owner'
            });
        }

        // Get barbers for all shops
        const allBarbers = [];
        for (const shop of shops) {
            logger.debug('getShopBarbers - Getting barbers for shop:', shop._id.toString());
            try {
                const barbers = await shopService.getShopBarbers(shop._id);
                logger.debug('getShopBarbers - Barbers returned:', Array.isArray(barbers) ? 'array' : typeof barbers);
                logger.debug('getShopBarbers - Barbers found for shop:', barbers ? barbers.length : 'null/undefined');
                if (barbers && barbers.length > 0) {
                    logger.debug('getShopBarbers - First barber:', barbers[0]._id, barbers[0].firstName);
                    allBarbers.push(...barbers);
                }
            } catch (error) {
                logger.error('getShopBarbers - Error getting barbers for shop:', shop._id, error.message);
            }
        }
        
        logger.debug('getShopBarbers - Final allBarbers length:', allBarbers.length);
        logger.debug('getShopBarbers - allBarbers is array:', Array.isArray(allBarbers));
        
        // Filter barbers to only include required fields
        const filteredBarbers = allBarbers.map(barber => ({
            _id: barber._id,
            firstName: barber.firstName,
            lastName: barber.lastName,
            email: barber.email,
            phone: barber.profile?.phoneNumber || ''
        }));
        
        logger.debug('getShopBarbers - About to send response with', filteredBarbers.length, 'barbers');
        const responseData = {
            success: true,
            data: filteredBarbers
        };
        logger.debug('getShopBarbers - Response data keys:', Object.keys(responseData));

        res.status(200).json(responseData);
    } catch (error) {
        logger.error('getShopBarbers - Error:', error.message);
        logger.error('getShopBarbers - Error stack:', error.stack);
        next(error);
    }
};

/**
 * Get barbers and their bookings for the authenticated shop owner's shops
 * @route GET /api/shop-owners/barber-bookings
 * @access Private/ShopOwner
 */
const getBarberBookings = async (req, res, next) => {
    try {
        const userId = req.user.id;
        logger.debug('getBarberBookings - Starting for userId:', userId);
        
        // For shop_owner role, req.user is already the ShopOwner document
        const shopOwner = req.user;
        if (!shopOwner) {
            throw new ApiError('Shop owner profile not found', 404);
        }

        // Get shops owned by this shop owner
        const shops = await shopOwnerService.getShopsByOwner(shopOwner._id);
        if (!shops || shops.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                message: 'No shops found for this shop owner'
            });
        }

        const result = [];

        // For each shop, get barbers and their bookings
        for (const shop of shops) {
            const barbers = await shopService.getShopBarbers(shop._id);
            if (barbers && barbers.length > 0) {
                for (const barber of barbers) {
                    // Get bookings for this barber
                    const bookings = await bookingService.getBookingsByBarberId(barber._id);
                    
                    // Format bookings with required fields
                    const formattedBookings = (bookings || []).map(booking => ({
                        _id: booking._id,
                        barberName: `${barber.firstName} ${barber.lastName}`,
                        customerName: `${booking.customerId?.firstName || ''} ${booking.customerId?.lastName || ''}`.trim(),
                        serviceName: booking.serviceId?.title || '',
                        bookingTime: booking.bookingTime,
                        bookingDate: booking.bookingDate,
                        status: booking.status,
                        price: booking.serviceId?.price || 0
                    }));
                    
                    result.push(formattedBookings);
                }
            }
        }

        logger.debug('getBarberBookings - Total barbers with bookings:', result.length);

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('getBarberBookings - Error:', error.message);
        next(error);
    }
};

/**
 * Get shop update requests for current shop owner
 * @route GET /api/shop-owners/shop-update-requests
 * @access Private/ShopOwner
 */
const getShopUpdateRequests = async (req, res, next) => {
    try {
        const shopUpdateRequestService = require('../../../services/shopUpdateRequestService');
        const { status, page = 1, limit = 10 } = req.query;

        const result = await shopUpdateRequestService.getRequestsByShopOwner(req.user._id, {
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.status(200).json({
            success: true,
            data: result.requests,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get specific shop update request details
 * @route GET /api/shop-owners/shop-update-requests/:id
 * @access Private/ShopOwner
 */
const getShopUpdateRequestById = async (req, res, next) => {
    try {
        const shopUpdateRequestService = require('../../../services/shopUpdateRequestService');
        const { id } = req.params;

        const request = await shopUpdateRequestService.getRequestById(id);

        // Verify ownership
        if (request.shopOwnerId._id.toString() !== req.user._id.toString()) {
            throw new ApiError('Access denied', 403);
        }

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createShopOwnerProfile,
    getShopOwnerProfile,
    updateShopOwnerProfile,
    getShopOwnerById,
    getShopOwnerByUid,
    getShopOwners,
    updateVerificationStatus,
    removeVerificationDocument,
    getShopsByOwner,
    deleteShopOwner,
    uploadVerificationDocument,
    getOwnerShops,
    assignBookingToBarber,
    rejectBooking,
    reassignRejectedBooking,
    rescheduleBooking,
    getRequestedBookings,
    getAllShopBookings,
    getShopBarbers,
    getBarberBookings,
    getShopUpdateRequests,
    getShopUpdateRequestById
};