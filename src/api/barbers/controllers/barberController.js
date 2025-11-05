const barberService = require('../../../services/barberService');
const notificationService = require('../../../services/notificationService');
const bookingService = require('../../../services/bookingService');
const { ApiError } = require('../../../middlewares/errorHandler');
const moment = require('moment');
const logger = require('../../../utils/logger');

/*/**
 * Get barber/freelancer profile
 * @route GET /api/barbers/profile/me
 * @access Private/Barber,Freelancer
 */
const getBarberProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let profile;

        if (userRole === 'freelancer') {
            // For freelancers, get freelancer profile
            const freelancerService = require('../../../services/freelancerService');
            profile = await freelancerService.getFreelancerByUserId(userId);
        } else {
            // For barbers, get barber profile
            profile = await barberService.getBarberByUserId(userId);
        }

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Respond to assigned booking (accept/reject)
 * @route POST /api/barbers/bookings/:bookingId/respond
 * @access Private/Barber,Freelancer
 */
const respondToBookingAssignment = async (req, res, next) => {
    try {
     // Map authenticated user to their barber profile
    const currentUserId = req.user._id || req.user.id;
    const barberProfile = await barberService.getBarberByUserId(currentUserId);
    const barberId = barberProfile._id.toString();
        const { bookingId } = req.params;
        const { response, rejectReason } = req.body; // 'accept' or 'reject', optional rejectReason

        if (!['accept', 'reject'].includes(response)) {
            throw new ApiError('Response must be "accept" or "reject"', 400);
        }

        // Validate reject reason if rejecting
        if (response === 'reject' && !rejectReason) {
            throw new ApiError('Reject reason is required when rejecting a booking', 400);
        }

    // Find booking and validate assignment
    const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }
    const assignedBarberId = (booking.barberId && booking.barberId._id) ? booking.barberId._id.toString() : booking.barberId.toString();
    if (assignedBarberId !== barberId) {
            throw new ApiError('You are not assigned to this booking', 403);
        }
        // Find the barber document to check isFreelancer
        const barberDoc = await require('../../../models/Barber').findById(assignedBarberId);
        if (!barberDoc) {
            throw new ApiError('Barber profile not found', 404);
        }
        // Allow freelancers to confirm/reject pending bookings if serviceType is homeBased
        if (booking.status === 'pending' && barberDoc.isFreelancer && booking.serviceType !== 'homeBased') {
            throw new ApiError('Freelancers cannot confirm bookings in pending state for shop-based services. Wait for shop owner assignment.', 403);
        }
        if (!['assigned', 'pending',  'rescheduled'].includes(booking.status)) {
            throw new ApiError('Booking is not in a state that can be confirmed or rejected by barber', 400);
        }

        // Update status
        let newStatus;
        if (response === 'accept') {
            newStatus = 'confirmed';
        } else {
            // Differentiate rejection status based on barber type
            // Shop-based barbers (have shopId) get 'rejected_barber' status for reassignment
            // Freelancers/home-based barbers get 'rejected' status
            newStatus = barberDoc.shopId ? 'rejected_barber' : 'rejected';
        }
        booking.status = newStatus;
        if (response === 'reject') {
            booking.rejectReason = rejectReason;
        }
        await booking.save();

        // Notify customer (skip if freelancer rejects)
        const shouldNotifyCustomer = !(barberDoc.isFreelancer && response === 'reject');
        
        if (shouldNotifyCustomer) {
            await notificationService.createNotification({
                userId: booking.customerId,
                title: 'Booking Update',
                message: response === 'accept'
                    ? `Your booking for ${booking.serviceName} has been confirmed by the barber/freelancer.`
                    : `Your booking for ${booking.serviceName} was rejected by the barber/freelancer. Reason: ${rejectReason}`,
                type: 'booking',
                relatedId: booking._id,
                onModel: 'Booking'
            });
        }

        // Notify shop owner
        if (booking.shopId && booking.shopId.ownerId) {
            const ownerId = booking.shopId.ownerId._id ? booking.shopId.ownerId._id : booking.shopId.ownerId;
            const isBarberRejection = !barberDoc.isFreelancer && response === 'reject';
            const isFreelancerRejection = barberDoc.isFreelancer && response === 'reject';
            
            await notificationService.createNotification({
                userId: ownerId,
                title: 'Booking Update',
                message: response === 'accept'
                    ? `The assigned barber/freelancer has accepted the booking for ${booking.serviceName}.`
                    : isBarberRejection
                    ? `The assigned barber has rejected the booking for ${booking.serviceName}. Reason: ${rejectReason}. You can reassign to another barber.`
                    : isFreelancerRejection
                    ? `The assigned freelancer has rejected the booking for ${booking.serviceName}. Reason: ${rejectReason}.`
                    : `The assigned barber/freelancer has rejected the booking for ${booking.serviceName}. Reason: ${rejectReason}`,
                type: 'booking',
                relatedId: booking._id,
                onModel: 'Booking'
            });
        }
        
    // Notifications are temporarily disabled per current setup

        res.status(200).json({
            success: true,
            message: `Booking ${response}ed successfully`,
            data: booking
        });
    } catch (error) {
    next(error);
    }
};

/**
 * Reschedule a booking (barber/freelancer)
 * @route POST /api/barbers/bookings/:bookingId/reschedule
 * @access Private/Barber,Freelancer
 */
const rescheduleBooking = async (req, res, next) => {
    try {
        // Map authenticated user to their barber profile
        const currentUserId = req.user._id || req.user.id;
        const barberProfile = await barberService.getBarberByUserId(currentUserId);
        const barberId = barberProfile._id.toString();
        const { bookingId } = req.params;

        // Find booking and validate assignment
        const booking = await bookingService.getBookingById(bookingId);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        const assignedBarberId = (booking.barberId && booking.barberId._id) ? booking.barberId._id.toString() : booking.barberId.toString();
        if (assignedBarberId !== barberId) {
            throw new ApiError('You are not assigned to this booking', 403);
        }

        // Check if booking can be rescheduled
        if (booking.status === 'reassigned') {
            throw new ApiError('Reassigned bookings cannot be rescheduled', 400);
        }
        if (!['assigned', 'pending', 'rescheduled'].includes(booking.status)) {
            throw new ApiError('Booking cannot be rescheduled in its current state', 400);
        }

        // Inform user that rescheduling will happen after 1 minute
        res.status(200).json({
            success: true,
            message: 'Booking will be rescheduled after 1 minute (testing mode)',
            data: booking
        });

        // Perform booking update and notifications after 30 minute (60000 ms)
        setTimeout(async () => {
            try {
                const freshBooking = await bookingService.getBookingById(bookingId);
                if (!freshBooking) return;
                const currentTime = new Date(freshBooking.bookingDate);
                currentTime.setMinutes(currentTime.getMinutes() + 30);
                freshBooking.bookingDate = currentTime;
                freshBooking.status = 'rescheduled';
                await freshBooking.save();

                // Notify customer about rescheduling
                await notificationService.createNotification({
                    userId: freshBooking.customerId._id || freshBooking.customerId,
                    title: 'Booking Rescheduled',
                    message: `Your booking for ${freshBooking.serviceName} has been rescheduled by the barber to ${currentTime.toLocaleString()}.`,
                    type: 'booking',
                    relatedId: freshBooking._id,
                    onModel: 'Booking'
                });

                // Notify shop owner about rescheduling
                if (freshBooking.shopId && freshBooking.shopId.ownerId) {
                    const ownerId = freshBooking.shopId.ownerId._id ? freshBooking.shopId.ownerId._id : freshBooking.shopId.ownerId;
                    await notificationService.createNotification({
                        userId: ownerId,
                        title: 'Booking Rescheduled',
                        message: `The assigned barber/freelancer has rescheduled the booking for ${freshBooking.serviceName} to ${currentTime.toLocaleString()}.`,
                        type: 'booking',
                        relatedId: freshBooking._id,
                        onModel: 'Booking'
                    });
                }
            } catch (err) {
                // Log error but do not crash server
                console.error('Error in delayed reschedule:', err);
            }
        }, 60000);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all bookings for the authenticated barber/freelancer
 * @route GET /api/barbers/bookings
 * @access Private/Barber,Freelancer
 */
const getBarberBookings = async (req, res, next) => {
    try {
        // Map authenticated user to their barber profile
        const currentUserId = req.user._id || req.user.id;
        const barberProfile = await barberService.getBarberByUserId(currentUserId);
        const barberId = barberProfile._id.toString();

        // Get query parameters for filtering
        const { status, page = 1, limit = 10 } = req.query;

        // Get bookings for this barber
        const bookings = await bookingService.getBarberBookings(barberId, {
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.status(200).json({
            success: true,
            message: 'Barber bookings retrieved successfully',
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};

// src/api/barbers/controllers/barberController.js

/**
 * Get all barbers with pagination
 * @route GET /api/barbers
 * @access Public
 */
const getBarbers = async (req, res, next) => {
    try {
        const { page, limit, status, employmentType, search, shopId } = req.query;

        // Build options
        const options = {
            page,
            limit,
            status,
            employmentType,
            search,
            shopId
        };

        const result = await barberService.getBarbers(options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barber by ID
 * @route GET /api/barbers/:id
 * @access Public
 */
const getBarberById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const barber = await barberService.getBarberById(id);

        res.status(200).json({
            success: true,
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barber by UID
 * @route GET /api/barbers/uid/:uid
 * @access Public
 */
const getBarberByUid = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const barber = await barberService.getBarberByUid(uid);

        res.status(200).json({
            success: true,
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

// /**
//  * Get barber profile (for authenticated barber)
//  * @route GET /api/barbers/profile
//  * @access Private/Barber
//  */
// const getBarberProfile = async (req, res, next) => {
//     try {
//         const userId = req.user._id;
//         const barber = await barberService.getBarberByUserId(userId);

//         res.status(200).json({
//             success: true,
//             data: barber
//         });
//     } catch (error) {
//         next(error);
//     }
// };

/**
 * Create barber profile
 * @route POST /api/barbers
 * @access Private
 */
const createBarberProfile = async (req, res, next) => {
    try {
        // For new barber creation, userId is the authenticated user
        const userId = req.user._id;
        const barber = await barberService.createBarberProfile(userId, req.body);

        res.status(201).json({
            success: true,
            message: 'Barber profile created successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update barber profile
 * @route PUT /api/barbers/profile
 * @access Private/Barber
 */
const updateBarberProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        console.log('Decoded userId from token:', userId);
        // Only accept countryId and schedules from body, plus any existing fields
        const updateData = {
            ...req.body,
            countryId: req.body.countryId,
            schedule: req.body.schedules // Map schedules to schedule field in model
        };
        // Remove schedules from updateData since we've mapped it to schedule
        delete updateData.schedules;
        const barber = await barberService.updateBarberProfile(userId, updateData);

        res.status(200).json({
            success: true,
            message: 'Barber profile updated successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update barber (admin function)
 * @route PUT /api/barbers/:id
 * @access Private/Admin
 */
const updateBarber = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Update the barber
        const updatedBarber = await barberService.updateBarber(id, req.body);

        res.status(200).json({
            success: true,
            message: 'Barber updated successfully',
            data: updatedBarber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barbers by shop
 * @route GET /api/barbers/shop/:shopId
 * @access Public
 */
const getBarbersByShop = async (req, res, next) => {
    try {
        const { shopId: shopOwnerId } = req.params; // shopId parameter is actually shopOwnerId
        const { status, date: requestDate } = req.query;

        if (!requestDate) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required'
            });
        }

        // Parse the date from the format like "2025-09-29 10:50:10"
        const parsedDate = moment(requestDate, 'YYYY-MM-DD HH:mm:ss').startOf('day').toDate();
        if (!moment(parsedDate).isValid()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Expected format: YYYY-MM-DD HH:mm:ss'
            });
        }

        // Find the shop owned by this shop owner
        const mongoose = require('mongoose');
        const Shop = require('../../../models/Shop');
        const shop = await Shop.findOne({ ownerId: new mongoose.Types.ObjectId(shopOwnerId.trim()) });

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found for this shop owner'
            });
        }

        const options = { status };
        const barbers = await barberService.getBarbersByShop(shop._id, options);
        const providerSlotsService = require('../../../services/providerSlotsService');

        // Get slots for the specified date for each barber
        const barbersWithSlots = await Promise.all(barbers.map(async barber => {
            // Get the first service of the barber to use for slot calculation
            // This is a temporary solution - ideally we should show slots by service
            const defaultService = barber.services && barber.services.length > 0 ? barber.services[0] : null;
            
            let timeSlots = [];
            if (defaultService) {
                const rawTimeSlots = await providerSlotsService.getProviderTimeSlots(
                    barber._id,
                    'barber',
                    parsedDate,
                    defaultService._id
                );
                
                // Convert time strings (e.g., "10:00") to hour/minute objects
                timeSlots = rawTimeSlots.map(slot => {
                    const [hour, minute] = slot.split(':').map(num => parseInt(num));
                    return {
                        hour,
                        minute
                    };
                });
            }

            return {
                id: barber._id,
                name: `${barber.firstName} ${barber.lastName}`,
                availableSlots: timeSlots
            };
        }));

        res.status(200).json({
            success: true,
            data: barbersWithSlots
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get nearby barbers
 * @route GET /api/barbers/nearby
 * @access Public
 */
const getNearbyBarbers = async (req, res, next) => {
    try {
        const { latitude, longitude, radius, serviceType } = req.query;

        if (!latitude || !longitude) {
            throw new ApiError('Latitude and longitude are required', 400);
        }

        const options = {
            radius: parseFloat(radius) || 10,
            serviceType
        };

        const barbers = await barberService.getNearbyBarbers(
            parseFloat(latitude),
            parseFloat(longitude),
            options
        );

        res.status(200).json({
            success: true,
            data: barbers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add service to barber
 * @route POST /api/barbers/:id/services
 * @access Private
 */
const addService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { serviceId } = req.body;

        if (!serviceId) {
            throw new ApiError('Service ID is required', 400);
        }

        // Check if user is barber or admin
        const isBarber = req.user.role === 'barber';
        const isAdmin = req.user.role === 'admin';

        // If user is barber, verify they're modifying their own profile
        if (isBarber) {
            const barber = await barberService.getBarberByUserId(req.user._id);
            if (barber._id.toString() !== id) {
                throw new ApiError('Unauthorized to modify this barber', 403);
            }
        } else if (!isAdmin) {
            throw new ApiError('Unauthorized', 403);
        }

        const barber = await barberService.addService(id, serviceId);

        res.status(200).json({
            success: true,
            message: 'Service added to barber successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove service from barber
 * @route DELETE /api/barbers/:id/services/:serviceId
 * @access Private
 */
const removeService = async (req, res, next) => {
    try {
        const { id, serviceId } = req.params;

        // Check if user is barber or admin
        const isBarber = req.user.role === 'barber';
        const isAdmin = req.user.role === 'admin';

        // If user is barber, verify they're modifying their own profile
        if (isBarber) {
            const barber = await barberService.getBarberByUserId(req.user._id);
            if (barber._id.toString() !== id) {
                throw new ApiError('Unauthorized to modify this barber', 403);
            }
        } else if (!isAdmin) {
            throw new ApiError('Unauthorized', 403);
        }

        const barber = await barberService.removeService(id, serviceId);

        res.status(200).json({
            success: true,
            message: 'Service removed from barber successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update barber availability
 * @route PUT /api/barbers/:id/availability
 * @access Private
 */
const updateAvailability = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { availability } = req.body;

        if (!availability || !Array.isArray(availability)) {
            throw new ApiError('Valid availability array is required', 400);
        }

        // Check if user is barber or admin
        const isBarber = req.user.role === 'barber';
        const isAdmin = req.user.role === 'admin';

        // If user is barber, verify they're modifying their own profile
        if (isBarber) {
            const barber = await barberService.getBarberByUserId(req.user._id);
            if (barber._id.toString() !== id) {
                throw new ApiError('Unauthorized to modify this barber', 403);
            }
        } else if (!isAdmin) {
            throw new ApiError('Unauthorized', 403);
        }

        const barber = await barberService.updateAvailability(id, availability);

        res.status(200).json({
            success: true,
            message: 'Barber availability updated successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add portfolio item
 * @route POST /api/barbers/:id/portfolio
 * @access Private
 */
const addPortfolioItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const portfolioItem = req.body;

        if (!portfolioItem.imageUrl) {
            throw new ApiError('Image URL is required', 400);
        }

        // Check if user is barber or admin
        const isBarber = req.user.role === 'barber';
        const isAdmin = req.user.role === 'admin';

        // If user is barber, verify they're modifying their own profile
        if (isBarber) {
            const barber = await barberService.getBarberByUserId(req.user._id);
            if (barber._id.toString() !== id) {
                throw new ApiError('Unauthorized to modify this barber', 403);
            }
        } else if (!isAdmin) {
            throw new ApiError('Unauthorized', 403);
        }

        const barber = await barberService.addPortfolioItem(id, portfolioItem);

        res.status(200).json({
            success: true,
            message: 'Portfolio item added successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove portfolio item
 * @route DELETE /api/barbers/:id/portfolio/:itemIndex
 * @access Private
 */
const removePortfolioItem = async (req, res, next) => {
    try {
        const { id, itemIndex } = req.params;

        // Check if user is barber or admin
        const isBarber = req.user.role === 'barber';
        const isAdmin = req.user.role === 'admin';

        // If user is barber, verify they're modifying their own profile
        if (isBarber) {
            const barber = await barberService.getBarberByUserId(req.user._id);
            if (barber._id.toString() !== id) {
                throw new ApiError('Unauthorized to modify this barber', 403);
            }
        } else if (!isAdmin) {
            throw new ApiError('Unauthorized', 403);
        }

        const barber = await barberService.removePortfolioItem(id, parseInt(itemIndex, 10));

        res.status(200).json({
            success: true,
            message: 'Portfolio item removed successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete barber
 * @route DELETE /api/barbers/:id
 * @access Private/Admin
 */
const deleteBarber = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await barberService.deleteBarber(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Barber deleted successfully'
            });
        } else {
            throw new ApiError('Barber deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get barber's linked shop or pending join request
 * @route GET /api/barbers/check/shop
 * @access Private/Barber
 */
const getBarberShop = async (req, res, next) => {
    try {
        const userId = req.user.id; // Use id from token instead of _id

        // Get barber profile
        const barberProfile = await barberService.getBarberByUserId(userId);

        if (!barberProfile) {
            return res.status(404).json({
                success: false,
                message: 'Barber profile not found'
            });
        }

        // Check if barber is linked to a shop
        if (barberProfile.shopId) {
            // Get shop details
            const shopService = require('../../../services/shopService');
            const shop = await shopService.getShopById(barberProfile.shopId);

            if (!shop) {
                return res.status(404).json({
                    success: false,
                    message: 'Linked shop not found'
                });
            }

            // Check for join request status
            const ShopJoinRequest = require('../../../models/ShopJoinRequest');
            const joinRequest = await ShopJoinRequest.findOne({
                userId: userId,
                shopId: barberProfile.shopId
            }).sort({ requestedAt: -1 });

            return res.status(200).json({
                success: true,
                data: {
                    _id: shop._id,
                    name: shop.name,
                    status: joinRequest ? joinRequest.status : 'linked'
                }
            });
        }

        // If not linked, check for pending join requests
        const ShopJoinRequest = require('../../../models/ShopJoinRequest');
        const pendingRequest = await ShopJoinRequest.findOne({
            userId: userId,
            status: { $in: ['requested', 'linked', 'unlinked'] }
        }).sort({ requestedAt: -1 }).populate('shopId'); // Get the latest request

        if (pendingRequest) {
            return res.status(200).json({
                success: true,
                data: {
                    _id: pendingRequest.shopId._id,
                    name: pendingRequest.shopId.name,
                    status: pendingRequest.status
                }
            });
        }

        // No shop link or pending requests
        return res.status(200).json({
            success: true,
            data: null
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBarbers,
    getBarberBookings,
    getBarberById,
    getBarberByUid,
    getBarberProfile,
    getBarberShop,
    createBarberProfile,
    updateBarberProfile,
    updateBarber,
    getBarbersByShop,
    getNearbyBarbers,
    addService,
    removeService,
    updateAvailability,
    addPortfolioItem,
    removePortfolioItem,
    deleteBarber,
    respondToBookingAssignment,
    rescheduleBooking
};