const Booking = require('../models/Booking');

/**
 * Get bookings for report generation
 * @param {Object} params - Parameters for filtering bookings
 * @param {Date} [params.startDate] - Start date for the report period (optional)
 * @param {Date} [params.endDate] - End date for the report period (optional)
 * @param {string} [params.status] - Filter by booking status
 * @param {number} [params.skip] - Number of records to skip for pagination
 * @param {number} [params.limit] - Maximum number of records to return
 * @returns {Promise<Array>} - Array of booking records
 */
const getBookingsForReport = async ({ startDate, endDate, status, skip = 0, limit }) => {
  const query = {};

  // Add date filter only if dates are provided
  if (startDate && endDate) {
    query.bookingDate = {
      $gte: startDate,
      $lte: endDate
    };
  }

  if (status) {
    query.status = status;
  }

  let queryBuilder = Booking.find(query)
    .populate('customerId', 'firstName lastName email phone')
    .populate('barberId', 'firstName lastName email phone')
    .populate('shopId', 'name location')
    .sort({ createdAt: -1 }); // Sort by creation date, newest first

  // Apply pagination if limit is provided
  if (limit) {
    queryBuilder = queryBuilder.skip(skip).limit(limit);
  }

  return await queryBuilder.lean();
};

/**
 * Get total count of bookings for report generation
 * @param {Object} params - Parameters for filtering bookings
 * @param {Date} [params.startDate] - Start date for the report period (optional)
 * @param {Date} [params.endDate] - End date for the report period (optional)
 * @param {string} [params.status] - Filter by booking status
 * @returns {Promise<number>} - Total count of bookings
 */
const getBookingsCountForReport = async ({ startDate, endDate, status }) => {
  const query = {};

  // Add date filter only if dates are provided
  if (startDate && endDate) {
    query.bookingDate = {
      $gte: startDate,
      $lte: endDate
    };
  }

  if (status) {
    query.status = status;
  }

  return await Booking.countDocuments(query);
};

/**
 * Auto-assign pending bookings to available barbers (for shop-based bookings)
 * @returns {Promise<number>} - Number of bookings auto-assigned
 */
const autoAssignPendingBookings = async () => {
  try {
    let assignedCount = 0;

    // Find pending bookings that are older than 10 minutes and shop-based
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const pendingBookings = await Booking.find({
      status: 'pending',
      serviceType: 'shopBased',
      shopId: { $exists: true, $ne: null },
      createdAt: { $lt: tenMinutesAgo }
    }).populate('shopId');

    for (const booking of pendingBookings) {
      try {
        // Find available barbers in the shop for this service
        const shop = booking.shopId;
        if (!shop) continue;

        // Get barbers associated with this shop
        const availableBarbers = await Barber.find({
          _id: { $in: shop.barbers || [] },
          isActive: true
        }).select('_id firstName lastName');

        if (availableBarbers.length === 0) continue;

        // For now, assign to the first available barber
        // In a more sophisticated system, you could check schedules, ratings, etc.
        const assignedBarber = availableBarbers[0];

        // Update booking
        booking.barberId = assignedBarber._id;
        booking.barberName = `${assignedBarber.firstName} ${assignedBarber.lastName}`;
        booking.status = 'assigned';
        await booking.save();

        // Send notifications
        try {
          // Notify assigned barber
          await notificationService.createNotification({
            userId: assignedBarber._id,
            title: 'New Booking Assigned',
            message: `A booking #${booking.uid} for ${booking.serviceName} has been automatically assigned to you on ${booking.bookingDate.toLocaleDateString()} at ${booking.bookingTime.hour}:${booking.bookingTime.minute.toString().padStart(2, '0')}. Please accept or reject within 30 minutes.`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
          });

          // Notify customer
          await notificationService.createNotification({
            userId: booking.customerId,
            title: 'Booking Update',
            message: `Your booking #${booking.uid} for ${booking.serviceName} has been assigned to ${booking.barberName}. They will confirm shortly.`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
          });

          // Notify shop owner
          if (shop.ownerId) {
            await notificationService.createNotification({
              userId: shop.ownerId,
              title: 'Booking Auto-Assigned',
              message: `Booking #${booking.uid} has been automatically assigned to ${booking.barberName}.`,
              type: 'booking',
              relatedId: booking._id,
              onModel: 'Booking'
            });
          }

          logger.info(`Auto-assigned booking ${booking.uid} to barber ${assignedBarber._id}`);
          assignedCount++;

        } catch (notificationError) {
          logger.warn(`Notification failed for auto-assigned booking ${booking.uid}:`, notificationError.message);
        }

      } catch (bookingError) {
        logger.warn(`Failed to auto-assign booking ${booking._id}:`, bookingError.message);
      }
    }

    return assignedCount;

  } catch (error) {
    logger.error('Auto-assign pending bookings error:', error);
    return 0;
  }
};

/**
 * Auto-reschedule bookings older than 30 minutes that are not confirmed
 * @returns {Promise<number>} - Number of bookings auto-rescheduled
 */
const autoRescheduleStaleBookings = async () => {
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const now = Date.now();
  const cutoff = new Date(now - THIRTY_MINUTES);
  // Find bookings not confirmed and older than 30 min
  const staleBookings = await Booking.find({
    status: { $nin: ['confirmed', 'completed', 'cancelled', 'rejected', 'freelancer_rejected', 'rejected_barber', 'rescheduled'] },
    createdAt: { $lte: cutoff }
  });
  let count = 0;
  for (const booking of staleBookings) {
    // Ensure rejected_barber status is excluded explicitly
    if (booking.status === 'rejected_barber') {
      continue;
    }
    // Reschedule by adding 30 minutes to booking time
    const currentTime = new Date(booking.bookingDate);
    currentTime.setMinutes(currentTime.getMinutes() + 30);

    booking.bookingDate = currentTime;
    booking.status = 'rescheduled';
    await booking.save();
    count++;

    // Notify customer about rescheduling
    try {
      await notificationService.createNotification({
        userId: booking.customerId._id || booking.customerId,
        title: 'Booking Rescheduled',
        message: `Your booking for ${booking.serviceName} has been automatically rescheduled to ${currentTime.toLocaleString()}.`,
        type: 'booking',
        relatedId: booking._id,
        onModel: 'Booking'
      });
    } catch (e) { logger.warn('Notification failed (autoRescheduleStaleBookings):', e.message); }

    // Notify barber about rescheduling
    try {
      await notificationService.createNotification({
        userId: booking.barberId._id || booking.barberId,
        title: 'Booking Rescheduled',
        message: `Booking for ${booking.serviceName} has been automatically rescheduled to ${currentTime.toLocaleString()}.`,
        type: 'booking',
        relatedId: booking._id,
        onModel: 'Booking'
      });
    } catch (e) { logger.warn('Barber notification failed (autoRescheduleStaleBookings):', e.message); }
  }
  return count;
};
/**
 * Approve a booking (shop owner)
 * @param {string} id - Booking ID
 * @param {string} shopOwnerId - Shop owner user ID
 * @returns {Promise<Object>} - Updated booking
 */
const approveBooking = async (id, shopOwnerId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw new ApiError('Booking not found', 404);
    // Only allow if booking is pending and shop owner matches
    const shop = await Shop.findById(booking.shopId).session(session);
    if (!shop) {
      throw new ApiError('Shop not found', 404);
    }
    // Check if the logged-in user is the shop owner (_id comparison)
    const ShopOwner = require('../models/ShopOwner');
    const shopOwnerDoc = await ShopOwner.findById(shop.ownerId).session(session);
    if (!shopOwnerDoc || shopOwnerDoc._id.toString() !== shopOwnerId.toString()) {
      throw new ApiError('You are not authorized to approve this booking', 403);
    }
    if (booking.status !== 'pending' && booking.status !== 'rescheduled'  && booking.status !== 'pending0' && booking.status !== 'confirmed') {
      throw new ApiError('Booking is not pending approval or rescheduled', 400);
    }
    
    // Check if barber is a freelancer to set appropriate status
    let isFreelancer = false;
    let actualProviderType = 'barber'; // default

    // Determine the actual provider type from the booking data
    const Barber = require('../models/Barber');
    const Freelancer = require('../models/Freelancer');

    // Check if barberId refers to a freelancer
    const freelancer = await Freelancer.findById(booking.barberId).session(session);
    if (freelancer) {
      isFreelancer = true;
      actualProviderType = 'freelancer';
    } else {
      // Check if it's a barber
      const barber = await Barber.findById(booking.barberId).session(session);
      if (barber) {
        actualProviderType = 'barber';
        isFreelancer = barber.isFreelancer || false;
      } else {
        // Check if it's a shop owner
        const shopOwner = await ShopOwner.findById(booking.barberId).session(session);
        if (shopOwner) {
          actualProviderType = 'shop_owner';
        }
      }
    }

    // Set status based on service type and provider type
    if (booking.serviceType === 'shopBased') {
      // For shop-based bookings, status should be 'confirmed' directly
      booking.status = 'confirmed';
    } else {
      // For home-based bookings, set status based on provider type
      booking.status = (actualProviderType === 'freelancer') ? 'assigned' : 'pending';
    }
    await booking.save({ session });
    // Notify barber and customer about approval
    try {
      // Extract barber and customer user IDs safely
      let barberUserId = booking.barberId;
      let customerUserId = booking.customerId;

      // Get the correct user ID based on provider type
      if (actualProviderType === 'shop_owner') {
        barberUserId = booking.barberId; // Shop owner ID
      } else if (actualProviderType === 'barber') {
        const barberDoc = await Barber.findById(booking.barberId).session(session);
        barberUserId = barberDoc ? barberDoc.userId || barberDoc._id : booking.barberId;
      } else if (actualProviderType === 'freelancer') {
        const freelancerDoc = await Freelancer.findById(booking.barberId).session(session);
        barberUserId = freelancerDoc ? freelancerDoc.userId || freelancerDoc._id : booking.barberId;
      }

      // Ensure we have string IDs for notifications
      barberUserId = barberUserId.toString();
      customerUserId = customerUserId.toString();

      // Handle notifications asynchronously without affecting the main flow
      setImmediate(async () => {
        try {
      // Handle notifications based on booking type and provider type
      if (booking.serviceType === 'shopBased') {
        // For shop-based: booking is now confirmed, notify customer
        await notificationService.createNotification({
          userId: customerUserId,
          title: 'Booking Confirmed',
          message: `Excellent! Your booking #${booking.uid} for ${booking.serviceName} has been confirmed and is ready. We'll see you on ${booking.bookingDate.toLocaleDateString()} at ${booking.bookingTime.hour}:${booking.bookingTime.minute.toString().padStart(2, '0')}.`,
          type: 'booking',
          relatedId: booking._id,
          onModel: 'Booking'
        });
      } else {
        // For home-based: notify both provider and customer
        const providerTypeMessage = actualProviderType === 'freelancer' ? 'freelancer' :
                                   actualProviderType === 'barber' ? 'barber' : 'service provider';

        await Promise.allSettled([
          notificationService.createNotification({
            userId: barberUserId,
            title: 'New Booking Request',
            message: `You have a new booking request for ${booking.serviceName} on ${booking.bookingDate.toLocaleDateString()} at ${booking.bookingTime.hour}:${booking.bookingTime.minute.toString().padStart(2, '0')}. Please confirm or reject this request.`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
          }),
          notificationService.createNotification({
            userId: customerUserId,
            title: 'Booking Confirmed',
            message: `Your booking #${booking.uid} for ${booking.serviceName} has been confirmed with ${booking.barberName}.`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
          })
        ]);
      }
        } catch (err) {
          logger.warn('Failed to process notifications:', err.message);
        }
      });
    } catch (e) { logger.warn('Notification failed (approveBooking):', e.message); }
    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Approve booking error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error approving booking: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Accept a booking request (barber/freelancer)
 * @param {string} bookingId - Booking ID
 * @param {string} providerId - Provider user ID (barber or freelancer)
 * @param {string} reason - Optional reason for acceptance
 * @returns {Promise<Object>} - Updated booking
 */
const acceptBookingRequest = async (bookingId, providerId, reason = '') => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    logger.info('✅ [acceptBookingRequest] Provider accepting booking request:', {
      bookingId,
      providerId,
      reason
    });

    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if the provider is authorized to accept this booking
    let isAuthorizedProvider = false;
    let providerType = '';

    // Check if provider is a barber
    const barber = await Barber.findOne({
      $or: [
        { _id: booking.barberId },
        { userId: providerId }
      ]
    }).session(session);

    if (barber) {
      isAuthorizedProvider = true;
      providerType = 'barber';
    } else {
      // Check if provider is a freelancer
      const freelancer = await Freelancer.findOne({
        $or: [
          { _id: booking.barberId },
          { _id: providerId }
        ]
      }).session(session);

      if (freelancer) {
        isAuthorizedProvider = true;
        providerType = 'freelancer';
      }
    }

    // Check if provider is a shop owner for shop bookings
    if (!isAuthorizedProvider && booking.shopId) {
      const Shop = require('../models/Shop');
      const shop = await Shop.findById(booking.shopId).session(session);
      if (shop && shop.ownerId && shop.ownerId.toString() === providerId.toString()) {
        isAuthorizedProvider = true;
        providerType = 'shop_owner';
      }
    }

    if (!isAuthorizedProvider) {
      throw new ApiError('You are not authorized to accept this booking', 403);
    }

    // Check if booking can be accepted
    if (!['pending', 'assigned','rescheduled', 'reassigned', 'rejected_barber', 'freelancer_rejected'].includes(booking.status)) {
      throw new ApiError(`Cannot accept booking with status: ${booking.status}`, 400);
    }

    // Update booking status
    booking.status = 'confirmed';
    if (reason) {
      booking.notes = (booking.notes || '') + `\nAccepted: ${reason}`;
    }
    await booking.save({ session });

    logger.info('✅ [acceptBookingRequest] Booking accepted successfully:', {
      bookingId: booking._id,
      uid: booking.uid,
      newStatus: booking.status,
      providerType
    });

    // Send notifications
    try {
      // Notify customer about acceptance
      await notificationService.createNotification({
        userId: booking.customerId,
        title: 'Booking Accepted',
        message: `Great news! Your booking #${booking.uid} for ${booking.serviceName} has been accepted by ${booking.barberName}.`,
        type: 'booking',
        relatedId: booking._id,
        onModel: 'Booking'
      }, { session });

      // If shop-based booking, notify shop owner
      if (booking.shopId && providerType === 'barber') {
        const shop = await Shop.findById(booking.shopId).populate('ownerId').session(session);
        if (shop && shop.ownerId) {
          await notificationService.createNotification({
            userId: shop.ownerId._id,
            title: 'Booking Accepted',
            message: `Booking #${booking.uid} has been accepted by ${booking.barberName}.`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
          }, { session });
        }
      }

      logger.info('📤 [acceptBookingRequest] Notifications sent successfully');
    } catch (notificationError) {
      logger.warn('⚠️ [acceptBookingRequest] Failed to send notifications:', notificationError.message);
    }

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ [acceptBookingRequest] Failed to accept booking:', error.message);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error accepting booking: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Reject a booking request (barber/freelancer)
 * @param {string} bookingId - Booking ID
 * @param {string} providerId - Provider user ID (barber or freelancer)
 * @param {string} reason - Reason for rejection (required)
 * @returns {Promise<Object>} - Updated booking
 */
const rejectBookingRequest = async (bookingId, providerId, reason) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    logger.info(' [rejectBookingRequest] Provider rejecting booking request:', {
      bookingId,
      providerId,
      reason
    });


    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if the provider is authorized to reject this booking
    let isAuthorizedProvider = false;
    let providerType = '';

    // Check if provider is a barber
    const barber = await Barber.findOne({
      $or: [
        { _id: booking.barberId },
        { userId: providerId }
      ]
    }).session(session);

    if (barber) {
      isAuthorizedProvider = true;
      providerType = 'barber';
    } else {
      // Check if provider is a freelancer
      const freelancer = await Freelancer.findOne({
        $or: [
          { _id: booking.barberId },
          { _id: providerId }
        ]
      }).session(session);

      if (freelancer) {
        isAuthorizedProvider = true;
        providerType = 'freelancer';
      }
    }

    // Check if provider is a shop owner for shop bookings
    if (!isAuthorizedProvider && booking.shopId) {
      const Shop = require('../models/Shop');
      const shop = await Shop.findById(booking.shopId).session(session);
      if (shop && shop.ownerId && shop.ownerId.toString() === providerId.toString()) {
        isAuthorizedProvider = true;
        providerType = 'shop_owner';
      }
    }

    if (!isAuthorizedProvider) {
      throw new ApiError('You are not authorized to reject this booking', 403);
    }

    // Check if booking can be rejected
    if (!['pending', 'assigned','rescheduled', 'reassigned', 'rejected_barber', 'freelancer_rejected'].includes(booking.status)) {
      throw new ApiError(`Cannot reject booking with status: ${booking.status}`, 400);
    }

    // Update booking status based on provider type
    // Shop-based barbers get 'rejected_barber' status for reassignment
    // Freelancers get 'freelancer_rejected' status
    // Shop owners get 'shop_owner_rejected' status
    let rejectionStatus = 'rejected';
    if (providerType === 'barber' && barber && barber.shopId) {
      rejectionStatus = 'rejected_barber';
    } else if (providerType === 'freelancer') {
      rejectionStatus = 'freelancer_rejected';
    } else if (providerType === 'shop_owner') {
      rejectionStatus = 'shop_owner_rejected';
    }
    
    booking.status = rejectionStatus;
    booking.notes = (booking.notes || '') + `\nRejected by ${providerType}${reason ? `: ${reason}` : ''}`;
    await booking.save({ session });

    logger.info('❌ [rejectBookingRequest] Booking rejected successfully:', {
      bookingId: booking._id,
      uid: booking.uid,
      newStatus: booking.status,
      providerType,
      hasShopId: barber ? !!barber.shopId : false,
      reason
    });

    // Send notifications
    try {
      // Notify customer about rejection (skip if freelancer rejects OR shop-linked barber rejects)
      const shouldNotifyCustomer = !(providerType === 'freelancer' || (providerType === 'barber' && barber && barber.shopId));
      
      if (shouldNotifyCustomer) {
        await notificationService.createNotification({
          userId: booking.customerId,
          title: 'Booking Rejected',
          message: `We're sorry, but your booking #${booking.uid} for ${booking.serviceName} has been rejected by ${booking.barberName}.`,
          type: 'booking',
          relatedId: booking._id,
          onModel: 'Booking'
        }, { session });
      }

      // Notify shop owner about rejection
      if (booking.shopId) {
        const shop = await Shop.findById(booking.shopId).populate('ownerId').session(session);
        if (shop && shop.ownerId) {
          const isBarberRejection = providerType === 'barber' && rejectionStatus === 'rejected_barber';
          const isFreelancerRejection = providerType === 'freelancer';
          
          await notificationService.createNotification({
            userId: shop.ownerId._id,
            title: 'Booking Update',
            message: isBarberRejection
              ? `Booking #${booking.uid} has been rejected by ${booking.barberName}${reason ? `. Reason: ${reason}` : ''}. You can reassign to another barber.`
              : isFreelancerRejection
              ? `Booking #${booking.uid} has been rejected by freelancer ${booking.barberName}${reason ? `. Reason: ${reason}` : ''}.`
              : `Booking #${booking.uid} has been rejected by ${booking.barberName}${reason ? `. Reason: ${reason}` : ''}`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
          }, { session });
        }
      }

      logger.info('📤 [rejectBookingRequest] Notifications sent successfully');
    } catch (notificationError) {
      logger.warn('⚠️ [rejectBookingRequest] Failed to send notifications:', notificationError.message);
    }

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ [rejectBookingRequest] Failed to reject booking:', error.message);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error rejecting booking: ${error.message}`);
  } finally {
    session.endSession();
  }
};
const reassignBooking = async (id, newBarberId, shopOwnerId, bookingDate, bookingTime) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw new ApiError('Booking not found', 404);
    
    // Validate that booking can be reassigned
    const reassignableStatuses = ['rejected', 'rejected_barber', 'pending', 'assigned', 'rescheduled'];
    if (!reassignableStatuses.includes(booking.status)) {
      throw new ApiError(`Cannot reassign booking with status: ${booking.status}`, 400);
    }
    
    // Update booking time if provided
    if (bookingTime) {
      // Ensure we have valid hour and minute values
      const hour = bookingTime.hour;
      const minute = bookingTime.minute;

      // Validate the values
      if (typeof hour !== 'number' || typeof minute !== 'number' ||
          hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new ApiError('Invalid booking time values. Hours must be 0-23, minutes must be 0-59', 400);
      }

      booking.bookingTime = {
        hour: hour,
        minute: minute
      };
    }
    
    // Update booking date if provided
    if (bookingDate) {
      const dateObj = new Date(bookingDate);
      if (isNaN(dateObj.getTime())) {
        throw new ApiError('Invalid booking date format', 400);
      }
      booking.bookingDate = dateObj;
    }
    
    // Only allow if shop owner matches
    const shop = await Shop.findById(booking.shopId).session(session);
    if (!shop || shop.ownerId.toString() !== shopOwnerId.toString()) {
      throw new ApiError('You are not authorized to reassign this booking', 403);
    }
    
    // Validate that newBarberId belongs to the same shop or is the shop owner
    let newProviderValid = false;
    let newProviderType = '';
    let newProviderName = '';

    // Check if newBarberId is the shop owner himself
    if (newBarberId.toString() === shopOwnerId.toString()) {
      newProviderValid = true;
      newProviderType = 'shop_owner';
      // Get shop owner details for name
      const shopOwner = await ShopOwner.findById(shopOwnerId).session(session);
      if (shopOwner) {
        newProviderName = `${shopOwner.firstName} ${shopOwner.lastName}`;
      }
    } else {
      // Check if newBarberId is a barber associated with this shop
      const newBarber = await Barber.findById(newBarberId).session(session);
      if (newBarber && newBarber.shopId && newBarber.shopId.toString() === booking.shopId.toString()) {
        newProviderValid = true;
        newProviderType = 'barber';
        newProviderName = `${newBarber.firstName} ${newBarber.lastName}`;
      } else {
        // Check if newBarberId is a freelancer associated with this shop
        const newFreelancer = await Freelancer.findById(newBarberId).session(session);
        if (newFreelancer && newFreelancer.shopId && newFreelancer.shopId.toString() === booking.shopId.toString()) {
          newProviderValid = true;
          newProviderType = 'freelancer';
          newProviderName = `${newFreelancer.firstName} ${newFreelancer.lastName}`;
        }
      }
    }

    if (!newProviderValid) {
      throw new ApiError('New provider must be associated with the same shop', 400);
    }

    // Update barberId, barberName and set status based on assignment type
    booking.barberId = newBarberId;
    booking.barberName = newProviderName;

    // Set status based on who is being assigned
    if (newBarberId.toString() === shopOwnerId.toString()) {
        // Shop owner assigning to himself - set to confirmed
        booking.status = 'confirmed';
    } else {
        // Shop owner assigning to another barber - set to reassigned
        booking.status = 'reassigned';
    }

    await booking.save({ session });
    // Notify based on assignment type
    try {
      if (newBarberId.toString() === shopOwnerId.toString()) {
        // Shop owner assigned to himself - notify customer of confirmation
        await notificationService.createNotification({
          userId: booking.customerId,
          title: 'Booking Confirmed',
          message: `Great news! Your booking #${booking.uid} for ${booking.serviceName} has been confirmed and is ready.`,
          type: 'booking',
          relatedId: booking._id,
          onModel: 'Booking'
        }, { session });
      } else {
        // Shop owner assigned to another barber - notify barber and customer
        await notificationService.createNotification({
          userId: booking.barberId,
          title: 'Booking Reassigned',
          message: `A booking #${booking.uid} has been reassigned to you. Please accept or reject.`,
          type: 'booking',
          relatedId: booking._id,
          onModel: 'Booking'
        }, { session });
        await notificationService.createNotification({
          userId: booking.customerId,
          title: 'Booking Update',
          message: 'Your booking has been reassigned to another provider.',
          type: 'booking',
          relatedId: booking._id,
          onModel: 'Booking'
        }, { session });
      }
    } catch (e) { logger.warn('Notification failed (reassignBooking):', e.message); }
    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Reassign booking error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error reassigning booking: ${error.message}`);
  } finally {
    session.endSession();
  }
};
// src/services/bookingService.js
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const Freelancer = require('../models/Freelancer');
const Shop = require('../models/Shop');
const ShopOwner = require('../models/ShopOwner');
const Customer = require('../models/Customer');
const { ApiError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Create a new booking
 * @param {Object} bookingData - Booking data
 * @returns {Promise<Object>} - Created booking
 */
const createBooking = async (bookingData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
  // Debug log to inspect incoming bookingData
  logger.info('🔄 [createBooking] Starting booking creation process');
  logger.info('📋 [createBooking] Booking data:', JSON.stringify({
    customerId: bookingData.customerId,
    barberId: bookingData.barberId,
    serviceId: bookingData.serviceId,
    serviceType: bookingData.serviceType,
    bookingDate: bookingData.bookingDate,
    bookingTime: bookingData.bookingTime,
    countryId: bookingData.countryId // optional
  }, null, 2));

    // Check required fields (countryId is now optional)
    if (!bookingData.customerId || !bookingData.serviceId || !bookingData.bookingDate || !bookingData.bookingTime || !bookingData.serviceType) {
      throw new ApiError('Missing required booking information', 400);
    }
    if (!bookingData.barberId) {
      throw new ApiError('barberId is required', 400);
    }

    // Get service details
    const service = await Service.findById(bookingData.serviceId).session(session);
    if (!service) {
      throw new ApiError('Service not found', 404);
    }

    logger.info('💇 [createBooking] Service validation passed:', {
      serviceId: service._id,
      serviceName: service.title,
      duration: service.duration,
      price: service.price
    });

    // Extract duration for time slot validation
    const duration = service.duration || 30;

    // Get customer details
    const customer = await Customer.findById(bookingData.customerId).session(session);
    if (!customer) {
      throw new ApiError('Customer not found', 404);
    }

    // Determine provider type by checking all possible provider collections
    let provider = null;
    let providerType = null;
    let providerId = bookingData.barberId;
    let shopId = null;

    // First, try to find provider in ShopOwner collection
    provider = await ShopOwner.findById(bookingData.barberId).session(session);
    if (provider) {
      providerType = 'shop_owner';
      // Find shop owned by this shop owner
      const shop = await Shop.findOne({ ownerId: bookingData.barberId }).session(session);
      if (shop) {
        shopId = shop._id;
      }
    } else {
      // If not found in ShopOwner, try Barber collection
      provider = await Barber.findById(bookingData.barberId).session(session);
      if (provider) {
        providerType = 'barber';
        // Check if this barber is associated with a shop
        if (provider.shopId) {
          shopId = provider.shopId;
        }
      } else {
        // If not found in Barber, try Freelancer collection
        provider = await Freelancer.findById(bookingData.barberId).session(session);
        if (provider) {
          providerType = 'freelancer';
          // Check if this freelancer is associated with a shop
          if (provider.shopId) {
            shopId = provider.shopId;
          }
        }
      }
    }

    // If no provider found in any collection
    if (!provider) {
      throw new ApiError('Provider not found. Please check the barberId.', 404);
    }

    // Validate provider-service type compatibility
    if (bookingData.serviceType === 'shopBased') {
      // For shop-based services, provider must have an associated shop
      if (!shopId) {
        throw new ApiError(`${providerType} does not have an associated shop for shop-based services`, 400);
      }
    } else if (bookingData.serviceType === 'homeBased') {
      // For home-based services, any provider type is allowed
      // Additional validation can be added here if needed
    }

    // Prevent customers from booking with themselves if they're also providers
    if (providerId === bookingData.customerId) {
      throw new ApiError('You cannot book an appointment with yourself', 400);
    }

    logger.info('👥 [createBooking] Customer and provider validation passed:', {
      customerId: customer._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      providerId: providerId,
      providerType: providerType,
      shopId: shopId,
      serviceType: bookingData.serviceType
    });

    // Parse booking date from string to Date object
    const bookingDate = new Date(bookingData.bookingDate);
    if (isNaN(bookingDate.getTime())) {
      throw new ApiError('Invalid booking date format', 400);
    }

  // Address check removed for home-based services

    // For same-day bookings, ensure minimum advance notice (2 hours)
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(bookingData.bookingTime.hour, bookingData.bookingTime.minute, 0, 0);

    const now = new Date();
    const minAdvanceTime = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // 1 hours from now

    if (bookingDateTime < minAdvanceTime) {
      throw new ApiError('Bookings must be made at least 2 hours in advance', 400);
    }

    logger.info('⏰ [createBooking] Advance booking time validation passed:', {
      bookingDateTime: bookingDateTime.toISOString(),
      minAdvanceTime: minAdvanceTime.toISOString(),
      hoursDifference: Math.round((bookingDateTime - now) / (1000 * 60 * 60) * 10) / 10
    });

    // Check if customer already has a booking at this time slot
    const existingCustomerBooking = await Booking.findOne({
      customerId: bookingData.customerId,
      bookingDate: {
        $gte: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate()),
        $lt: new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate() + 1)
      },
      bookingTime: {
        hour: bookingData.bookingTime.hour,
        minute: bookingData.bookingTime.minute
      },
      status: { $in: ['pending', 'pending', 'assigned', 'confirmed'] }
    }).session(session);

    if (existingCustomerBooking) {
      throw new ApiError('You already have a booking at this time slot', 400);
    }

    logger.info('✅ [createBooking] No duplicate booking found for customer at this time slot');
    const isAvailable = await isTimeSlotAvailable(
        bookingData.barberId, // Using barberId field for now, but this could be providerId
        bookingDate,
        bookingData.bookingTime,
        duration,
        providerType // Pass the provider type
    );

    if (!isAvailable) {
      throw new ApiError('Selected time slot is not available', 400);
    }

    // Validate that the booking time falls within provider's schedule/opening hours
    const dayOfWeek = bookingDate.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    let daySchedule;
    let scheduleType = '';

    if (bookingData.serviceType === 'shopBased' && shopId) {
      // For shop-based bookings, always use shop opening hours
      const shop = await Shop.findById(shopId).session(session);
      if (!shop) {
        throw new ApiError('Shop not found', 404);
      }
      daySchedule = shop.openingHours && shop.openingHours.find(d => d.day.toLowerCase() === dayOfWeek);
      if (!daySchedule || !daySchedule.isOpen) {
        throw new ApiError(`Shop is not open on ${dayOfWeek}`, 400);
      }
      // Parse shop opening times
      var [scheduleStartHour, scheduleStartMinute] = daySchedule.openTime.split(':').map(Number);
      var [scheduleEndHour, scheduleEndMinute] = daySchedule.closeTime.split(':').map(Number);
      scheduleType = 'shop';
    } else {
      // For home-based bookings or when no shop is associated, use provider's personal schedule
      if (providerType === 'barber' || providerType === 'freelancer') {
        daySchedule = provider.schedule && provider.schedule[dayOfWeek];
        if (!daySchedule || daySchedule.status !== 'available') {
          throw new ApiError(`${providerType} is not available on ${dayOfWeek}`, 400);
        }
        // Parse provider's schedule times
        var [scheduleStartHour, scheduleStartMinute] = daySchedule.from.split(':').map(Number);
        var [scheduleEndHour, scheduleEndMinute] = daySchedule.to.split(':').map(Number);
        scheduleType = providerType;
      } else if (providerType === 'shop_owner') {
        // Shop owner doing home service - use their personal schedule if available
        daySchedule = provider.schedule && provider.schedule[dayOfWeek];
        if (!daySchedule || daySchedule.status !== 'available') {
          throw new ApiError(`Shop owner is not available on ${dayOfWeek} for home services`, 400);
        }
        var [scheduleStartHour, scheduleStartMinute] = daySchedule.from.split(':').map(Number);
        var [scheduleEndHour, scheduleEndMinute] = daySchedule.to.split(':').map(Number);
        scheduleType = 'shop owner';
      } else {
        throw new ApiError('Unable to determine schedule for this provider type', 400);
      }
    }
    // Convert to minutes for comparison
    const scheduleStartMinutes = scheduleStartHour * 60 + scheduleStartMinute;
    const scheduleEndMinutes = scheduleEndHour * 60 + scheduleEndMinute;
    const bookingStartMinutes = bookingData.bookingTime.hour * 60 + bookingData.bookingTime.minute;
    const bookingEndMinutes = bookingStartMinutes + duration;

    // Check if booking time is within provider's schedule
    if (bookingStartMinutes < scheduleStartMinutes || bookingEndMinutes > scheduleEndMinutes) {
      throw new ApiError(`Booking time ${bookingData.bookingTime.hour}:${bookingData.bookingTime.minute.toString().padStart(2, '0')} - ${Math.floor(bookingEndMinutes / 60)}:${(bookingEndMinutes % 60).toString().padStart(2, '0')} is outside ${scheduleType}'s available hours (${daySchedule.openTime || daySchedule.from} - ${daySchedule.closeTime || daySchedule.to})`, 400);
    }

  // Set booking status so provider must confirm or reject
  let bookingStatus = 'pending';
  logger.info(`Provider type: ${providerType}, shopId: ${shopId || 'N/A'}`);

    const newBookingData = {
      ...bookingData,
      barberId: providerId, // Use the resolved provider ID
      shopId: shopId, // Use the resolved shop ID (null for home-based)
      customerName: `${customer.firstName} ${customer.lastName}`,
      barberName: providerType === 'shop_owner'
        ? `${provider.firstName} ${provider.lastName}`
        : `${provider.firstName} ${provider.lastName}`,
      serviceName: service.title,
      price: service.price,
      duration: service.duration || 30,
      status: bookingStatus,
      paymentStatus: 'pending',
      bookingDate: bookingDate
    };

    // Create booking
    const booking = await Booking.create([newBookingData], { session });

    // Send notifications based on booking status
    try {
      if (bookingStatus === 'assigned') {
        // Direct notification to provider for confirmation
        const notificationUserId = providerType === 'shop_owner' ? providerId : provider._id;
        await notificationService.createNotification({
          userId: notificationUserId,
          title: 'New Booking Request',
          message: `You have a new booking request for ${service.title} on ${bookingDate.toLocaleDateString()} at ${bookingData.bookingTime.hour}:${bookingData.bookingTime.minute.toString().padStart(2, '0')}. Please confirm or reject.`,
          type: 'booking',
          relatedId: booking[0]._id,
          onModel: 'Booking'
        }, { session });
      } else if (bookingStatus === 'pending') {
        // Notify provider directly for freelancers
        if (providerType === 'freelancer') {
          await notificationService.createNotification({
            userId: provider._id,
            title: 'New Booking Request',
            message: `You have a new booking request from ${customer.firstName} ${customer.lastName} for ${service.title} on ${bookingDate.toLocaleDateString()} at ${bookingData.bookingTime.hour}:${bookingData.bookingTime.minute.toString().padStart(2, '0')}. Please accept or reject this request.`,
            type: 'booking',
            relatedId: booking[0]._id,
            onModel: 'Booking'
          }, { session });
        } else if (providerType === 'shop_owner') {
          // For shop bookings, notify shop owner directly
          await notificationService.createNotification({
            userId: providerId,
            title: 'New Booking Request',
            message: `You have a new booking request from ${customer.firstName} ${customer.lastName} for ${service.title} on ${bookingDate.toLocaleDateString()} at ${bookingData.bookingTime.hour}:${bookingData.bookingTime.minute.toString().padStart(2, '0')}. Please accept or reject this request.`,
            type: 'booking',
            relatedId: booking[0]._id,
            onModel: 'Booking'
          }, { session });
        } else if (providerType === 'barber' && provider.shopId) {
          // For shop-based barbers, notify shop owner first
          const shop = await Shop.findById(provider.shopId)
            .populate('ownerId', '_id')
            .session(session);

          if (shop && shop.ownerId) {
            await notificationService.createNotification({
              userId: shop.ownerId._id,
              title: 'New Booking Approval Required',
              message: `New booking request needs your approval for barber ${provider.firstName} ${provider.lastName}. Service: ${service.title} on ${bookingDate.toLocaleDateString()}.`,
              type: 'booking',
              relatedId: booking[0]._id,
              onModel: 'Booking'
            }, { session });
          }
        }
      }
    } catch (e) {
      logger.warn('Failed to send notifications:', e.message);
      // Continue with booking creation even if notification fails
    }

    // Send booking confirmation to customer
    try {
      await notificationService.createNotification({
        userId: bookingData.customerId,
        title: 'Booking Created Successfully',
        message: `Your booking #${booking[0].uid} for ${service.title} has been created successfully. We'll notify you once a provider accepts your request.`,
        type: 'booking',
        relatedId: booking[0]._id,
        onModel: 'Booking'
      }, { session });
    } catch (customerNotificationError) {
      logger.warn('Failed to send customer booking confirmation:', customerNotificationError.message);
      // Continue with booking creation even if customer notification fails
    }

    await session.commitTransaction();
    logger.info('✅ [createBooking] Booking created successfully:', {
      bookingId: booking[0]._id,
      uid: booking[0].uid,
      status: booking[0].status,
      providerType: providerType,
      customerId: bookingData.customerId
    });
    return booking[0];
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ [createBooking] Booking creation failed:', {
      error: error.message,
      customerId: bookingData.customerId,
      barberId: bookingData.barberId,
      serviceId: bookingData.serviceId
    });
    logger.error('Booking creation error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error creating booking: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Check if a time slot is available
 * @param {string} barberId - Barber ID
 * @param {Date} date - Booking date
 * @param {Object} time - Booking time {hour, minute}
 * @param {number} duration - Service duration in minutes
 * @returns {Promise<boolean>} - Whether the time slot is available
 */
const isTimeSlotAvailable = async (providerId, date, time, duration, providerType = 'barber') => {
  try {
    // Set time to midnight to compare just the date part
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Find all bookings for the provider on that day
    const bookingQuery = {
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'confirmed'] }
    };

    // Set the appropriate ID field based on provider type
    if (providerType === 'shop_owner') {
      // For shop owners, check against shopId
      // We need to get the shop ID from the providerId (shop owner ID)
      const Shop = require('../models/Shop');
      const shop = await Shop.findOne({ ownerId: providerId });
      if (shop) {
        bookingQuery.shopId = shop._id;
      } else {
        // If no shop found, assume no conflicts
        return true;
      }
    } else {
      // For barbers and freelancers, check against barberId
      bookingQuery.barberId = providerId;
    }

    const bookings = await Booking.find(bookingQuery);

    // Calculate start and end minutes for requested slot
    const requestedStartMinutes = time.hour * 60 + time.minute;
    const requestedEndMinutes = requestedStartMinutes + duration;

    // Check for conflicts with existing bookings
    for (const booking of bookings) {
      const existingStartMinutes = booking.bookingTime.hour * 60 + booking.bookingTime.minute;
      const existingEndMinutes = existingStartMinutes + booking.duration;

      // Check for overlap
      if (
          (requestedStartMinutes >= existingStartMinutes && requestedStartMinutes < existingEndMinutes) ||
          (requestedEndMinutes > existingStartMinutes && requestedEndMinutes <= existingEndMinutes) ||
          (requestedStartMinutes <= existingStartMinutes && requestedEndMinutes >= existingEndMinutes)
      ) {
        return false; // Time slot is not available
      }
    }

    return true; // Time slot is available
  } catch (error) {
    logger.error('Time slot availability check error:', error);
    throw new Error(`Error checking time slot availability: ${error.message}`);
  }
};

/**
 * Get available time slots for a barber on a specific date
 * @param {string} barberId - Barber ID
 * @param {Date} date - Date object
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} - List of available time slots
 */
const getAvailableTimeSlots = async (providerId, date, serviceId) => {
  try {
    // Get provider (barber, freelancer, or shop owner) to check availability schedule
    let provider = await Barber.findById(providerId);
    let providerType = 'barber';
    let shop = null;

    if (!provider) {
      // Try to find as freelancer
      const Freelancer = require('../models/Freelancer');
      provider = await Freelancer.findById(providerId);
      providerType = 'freelancer';
    }

    if (!provider) {
      // Try to find as shop owner
      const ShopOwner = require('../models/ShopOwner');
      provider = await ShopOwner.findById(providerId);
      providerType = 'shop_owner';

      if (provider) {
        // For shop owners, get their shop
        const Shop = require('../models/Shop');
        shop = await Shop.findOne({ ownerId: providerId });
        if (!shop) {
          throw new ApiError('Shop not found for this shop owner', 404);
        }
      }
    }

    if (!provider) {
      throw new ApiError('Provider not found', 404);
    }

    logger.info('Provider found:', provider._id, 'Type:', providerType);

    // Get service to check duration
    const service = await Service.findById(serviceId);
    if (!service) {
      logger.info('Service not found:', serviceId);
      throw new ApiError('Service not found', 404);
    }
    logger.info(' Service found:', service._id, service.title, 'duration:', service.duration);

    const serviceDuration = service.duration || 30;

    // Get provider schedule for the specific day
    const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();

    let daySchedule;
    if (providerType === 'shop_owner' && shop) {
      // For shop owners, use shop's openingHours
      daySchedule = shop.openingHours ? shop.openingHours.find(hour => hour.day.toLowerCase() === dayOfWeek) : null;
    } else {
      // For barbers and freelancers, use their personal schedule
      daySchedule = provider.schedule ? provider.schedule[dayOfWeek] : null;
    }

    // Check if provider is available on this day
    if (!daySchedule || (providerType === 'shop_owner' ? !daySchedule.isOpen : daySchedule.status !== 'available')) {
      logger.info(`Provider ${providerId} is not available on ${dayOfWeek}`);
      return []; // Provider is not available on this day
    }

    // Parse schedule times (different format for shops vs personal schedules)
    let startHour, startMinute, endHour, endMinute;
    if (providerType === 'shop_owner') {
      // Shop format: openTime, closeTime
      [startHour, startMinute] = daySchedule.openTime.split(':').map(Number);
      [endHour, endMinute] = daySchedule.closeTime.split(':').map(Number);
    } else {
      // Personal schedule format: from, to
      [startHour, startMinute] = daySchedule.from.split(':').map(Number);
      [endHour, endMinute] = daySchedule.to.split(':').map(Number);
    }

    // Log schedule source and values
    const scheduleSource = providerType === 'shop_owner' ? 'shop' : 'provider';
    logger.info(`Using ${scheduleSource} schedule for ${providerId} on ${dayOfWeek}: ${startHour}:${startMinute.toString().padStart(2, '0')} - ${endHour}:${endMinute.toString().padStart(2, '0')}`);

    // Generate time slots based on shop/freelancer hours
    const availableSlots = [];
    const slotInterval = 30; // 30-minute intervals

    // Convert everything to minutes for easier calculation
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Fetch all bookings for this provider on this date ONCE (optimization!)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookingQuery = {
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['pending', 'confirmed'] }
    };

    // Set the appropriate ID field based on provider type
    if (providerType === 'shop_owner' && shop) {
      bookingQuery.shopId = shop._id;
    } else {
      bookingQuery.barberId = providerId;
    }

    const existingBookings = await Booking.find(bookingQuery).lean();
    logger.info(`Found ${existingBookings.length} existing bookings for ${providerId} on ${date.toISOString().split('T')[0]}`);

    // Now check each slot against the bookings (in memory - much faster!)
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotInterval) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;

      // Skip time slots that would end after closing time
      const slotEndMinutes = currentMinutes + serviceDuration;
      if (slotEndMinutes > endMinutes) continue;

      const requestedStartMinutes = currentMinutes;
      const requestedEndMinutes = currentMinutes + serviceDuration;

      // Check for conflicts with existing bookings (in memory)
      let isAvailable = true;
      for (const booking of existingBookings) {
        const existingStartMinutes = booking.bookingTime.hour * 60 + booking.bookingTime.minute;
        const existingEndMinutes = existingStartMinutes + booking.duration;

        // Check for overlap
        if (
          (requestedStartMinutes >= existingStartMinutes && requestedStartMinutes < existingEndMinutes) ||
          (requestedEndMinutes > existingStartMinutes && requestedEndMinutes <= existingEndMinutes) ||
          (requestedStartMinutes <= existingStartMinutes && requestedEndMinutes >= existingEndMinutes)
        ) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        availableSlots.push({ hour, minute });
      }
    }
    return availableSlots;
  } catch (error) {
    logger.error('Available time slots error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error getting available time slots: ${error.message}`);
  }
};

/**
 * Get general availability for a barber (without specific service)
 * @param {string} barberId - Barber ID
 * @param {Date} date - Date to check availability for
 * @returns {Promise<Array>} - Array of available time slots
 */
const getGeneralAvailability = async (providerId, date) => {
  try {
    // Get provider to check availability schedule (could be barber or freelancer)
    let provider, providerType;
    const barber = await Barber.findById(providerId);
    if (barber) {
      provider = barber;
      providerType = 'barber';
    } else {
      // Try to find as freelancer
      const Freelancer = require('../models/Freelancer');
      const freelancer = await Freelancer.findById(providerId);
      if (!freelancer) {
        throw new ApiError('Provider not found', 404);
      }
      provider = freelancer;
      providerType = 'freelancer';
    }

    // Use default 30-minute slots for general availability
    const defaultDuration = 30;

    // Get provider schedule for the specific day
    const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = provider.schedule[dayOfWeek];

    // Check if provider is available on this day
    if (!daySchedule || daySchedule.status !== 'available') {
      logger.info(`Provider ${providerId} is not available on ${dayOfWeek}`);
      return []; // Provider is not available on this day
    }

    // Parse provider's schedule times (format: "HH:MM")
    const [startHour, startMinute] = daySchedule.from.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.to.split(':').map(Number);

    // Log schedule source and values
    logger.info(`🕐 [getGeneralAvailability] Using provider schedule for ${providerId} on ${dayOfWeek}: ${startHour}:${startMinute.toString().padStart(2, '0')} - ${endHour}:${endMinute.toString().padStart(2, '0')}`);

    // Generate time slots based on shop/freelancer hours
    const availableSlots = [];
    const slotInterval = 30; // 30-minute intervals

    // Convert everything to minutes for easier calculation
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotInterval) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;

      // Skip time slots that would end after closing time
      const slotEndMinutes = currentMinutes + defaultDuration;
      if (slotEndMinutes > endMinutes) continue;

      const timeSlot = { hour, minute };

      // Check if this slot is available
      const isAvailable = await isTimeSlotAvailable(
          providerId,
          date,
          timeSlot,
          defaultDuration,
          providerType
      );

      if (isAvailable) {
        availableSlots.push(timeSlot);
      }
    }
    return availableSlots;
  } catch (error) {
    logger.error('General availability error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error getting general availability: ${error.message}`);
  }
};

/**
 * Get booking by ID
 * @param {string} id - Booking ID
 * @returns {Promise<Object>} - Booking details
 */
const getBookingById = async (id) => {
  try {
  const booking = await Booking.findById(id)
    .populate({
      path: 'barberId',
      select: 'userId firstName lastName profileImage specialization',
      populate: { path: 'userId', select: 'firstName lastName' }
    })
    .populate('serviceId', 'name price duration')
    .populate('shopId', 'name address contactPhone')
    .populate('customerId', 'firstName lastName');

    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    return booking;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(`Error getting booking: ${error.message}`);
  }
};

/**
 * Get all bookings for a specific barber/freelancer
 * @param {string} barberId - Barber ID
 * @param {Object} options - Query options (status, page, limit)
 * @returns {Promise<Object>} - Bookings with pagination
 */
const getBarberBookings = async (barberId, options = {}) => {
  try {
    const { status, page = 1, limit = 10 } = options;

    // Build query
    const query = { barberId };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await Booking.countDocuments(query);

    // Get bookings with population
    const bookings = await Booking.find(query)
      .populate({
        path: 'customerId',
        select: 'firstName lastName phone email'
      })
      .populate({
        path: 'serviceId',
        select: 'title price duration type'
      })
      .populate({
        path: 'shopId',
        select: 'name address phone'
      })
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        pages: totalPages,
        hasNextPage,
        hasPrevPage
      }
    };
  } catch (error) {
    throw new Error(`Error getting barber bookings: ${error.message}`);
  }
};

/**
 * Get booking by UID
 * @param {string} uid - Booking UID
 * @returns {Promise<Object>} - Booking details
 */
const getBookingByUid = async (uid) => {
  try {
    const booking = await Booking.findOne({ uid })
        .populate('barberId', 'firstName lastName profileImage specialization')
        .populate('serviceId', 'name price duration')
        .populate('shopId', 'name address contactPhone')
        .populate('customerId', 'firstName lastName');

    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    return booking;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(`Error getting booking: ${error.message}`);
  }
};

/**
 * Get bookings for a customer
 * @param {string} customerId - Customer ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Bookings and pagination info
 */
const getBookingsByCustomer = async (customerId, options = {}) => {
  try {
    const page = parseInt(options.page) || 1;
    const limit = Math.min(parseInt(options.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = { customerId };

    // Add status filter if provided
    if (options.status) {
      if (Array.isArray(options.status)) {
        filter.status = { $in: options.status };
      } else {
        filter.status = options.status;
      }
    }

    // Set up sorting
    const sort = { createdAt: -1 }; // Default sort by creation date, newest first

    const [bookings, totalCount] = await Promise.all([
      Booking.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('barberId', 'firstName lastName profileImage')
          .populate('serviceId', 'name price duration')
          .populate('shopId', 'name address')
          .lean(),
      Booking.countDocuments(filter)
    ]);

    // Transform status for customer view: rejected_barber should show as pending
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      status: booking.status === 'rejected_barber' ? 'pending' : booking.status
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return {
      bookings: transformedBookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    };
  } catch (error) {
    logger.error('Get customer bookings error:', error);
    throw new Error(`Error getting customer bookings: ${error.message}`);
  }
};

/**
 * Get bookings for a barber
 * @param {string} barberId - Barber ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Bookings and pagination info
 */
const getBookingsByBarber = async (barberId, options = {}) => {
  try {
    const page = parseInt(options.page) || 1;
    const limit = Math.min(parseInt(options.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = { barberId };

    // Add status filter if provided
    if (options.status) {
      if (Array.isArray(options.status)) {
        filter.status = { $in: options.status };
      } else {
        filter.status = options.status;
      }
    }

    // Add date filter if provided
    if (options.date) {
      const startOfDay = new Date(options.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(options.date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.bookingDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Add date range filter if provided
    if (options.startDate || options.endDate) {
      filter.bookingDate = filter.bookingDate || {};
      if (options.startDate) filter.bookingDate.$gte = new Date(options.startDate);
      if (options.endDate) filter.bookingDate.$lte = new Date(options.endDate);
    }

    // Build sort object
    const sortBy = options.sortBy || 'bookingDate';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Execute query with pagination
    const [bookings, totalCount] = await Promise.all([
      Booking.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('customerId', 'firstName lastName')
          .populate('serviceId', 'name price duration')
          .populate('shopId', 'name address')
          .lean(),
      Booking.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return {
      bookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    };
  } catch (error) {
    logger.error('Get barber bookings error:', error);
    throw new Error(`Error getting barber bookings: ${error.message}`);
  }
};

/**
 * Get all bookings for a barber (simple version without pagination)
 * @param {string} barberId - Barber ID
 * @returns {Promise<Array>} - Array of bookings
 */
const getBookingsByBarberId = async (barberId) => {
  try {
    const bookings = await Booking.find({ barberId })
      .populate('customerId', 'firstName lastName')
      .populate('serviceId', 'title price duration category')
      .populate('shopId', 'name address')
      .sort({ bookingDate: -1 });

    return bookings;
  } catch (error) {
    logger.error('Get bookings by barber ID error:', error);
    throw new Error(`Error getting bookings: ${error.message}`);
  }
};

/**
 * Get bookings for a shop
 * @param {string} shopId - Shop ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Bookings and pagination info
 */
const getBookingsByShop = async (shopId, options = {}) => {
  try {
    const page = parseInt(options.page) || 1;
    const limit = Math.min(parseInt(options.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = { shopId };

    // Add status filter if provided
    if (options.status) {
      if (Array.isArray(options.status)) {
        filter.status = { $in: options.status };
      } else {
        filter.status = options.status;
      }
    }

    // Add barber filter if provided
    if (options.barberId) {
      filter.barberId = options.barberId;
    }

    // Add date filter if provided
    if (options.date) {
      const startOfDay = new Date(options.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(options.date);
      endOfDay.setHours(23, 59, 59, 999);

      filter.bookingDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Add date range filter if provided
    if (options.startDate || options.endDate) {
      filter.bookingDate = filter.bookingDate || {};
      if (options.startDate) filter.bookingDate.$gte = new Date(options.startDate);
      if (options.endDate) filter.bookingDate.$lte = new Date(options.endDate);
    }

    // Build sort object
    const sortBy = options.sortBy || 'bookingDate';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Execute query with pagination
    const [bookings, totalCount] = await Promise.all([
      Booking.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('customerId', 'firstName lastName')
          .populate('barberId', 'firstName lastName profileImage')
          .populate('serviceId', 'name price duration')
          .lean(),
      Booking.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return {
      bookings,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    };
  } catch (error) {
    logger.error('Get shop bookings error:', error);
    throw new Error(`Error getting shop bookings: ${error.message}`);
  }
};
 
//GET booking whose barberId is in freelancer table (means they are freelancers) and 
//those barberId is in barber table (means they are barbers)
//using one param flag (barber/freelancer) to determine which table to check
//so for this purpose fetch all the bookings than take the barberId and filter the bookings against barber and freelancer table
//GET booking whose barberId is in freelancer table (means they are freelancers) and
//those barberId is in barber table (means they are barbers)
//using one param flag (barber/freelancer) to determine which table to check
//so for this purpose fetch all the bookings than take the barberId and filter the bookings against barber and freelancer table
const getBookingsByRole = async (role, options = {}) => {
  try {
    const { status, date, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = options;

    // Build match conditions
    const matchConditions = {};

    if (status) {
      matchConditions.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      matchConditions.bookingDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    // Build aggregation pipeline
    const pipeline = [
      // Match initial conditions
      { $match: matchConditions },
      // Lookup barbers
      {
        $lookup: {
          from: 'barbers',
          localField: 'barberId',
          foreignField: '_id',
          as: 'barberInfo'
        }
      },
      // Lookup freelancers
      {
        $lookup: {
          from: 'freelancers',
          localField: 'barberId',
          foreignField: '_id',
          as: 'freelancerInfo'
        }
      },
      // Add computed fields
      {
        $addFields: {
          isBarber: { $gt: [{ $size: '$barberInfo' }, 0] },
          isFreelancer: { $gt: [{ $size: '$freelancerInfo' }, 0] }
        }
      }
    ];

    // Filter based on role
    if (role === 'freelancer') {
      pipeline.push({
        $match: {
          isFreelancer: true,
          isBarber: false
        }
      });
    } else if (role === 'barber') {
      pipeline.push({
        $match: {
          isBarber: true,
          isFreelancer: false
        }
      });
    }

    // Add population for related data
    pipeline.push(
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $lookup: {
          from: 'services',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'serviceInfo'
        }
      },
      {
        $lookup: {
          from: 'shops',
          localField: 'shopId',
          foreignField: '_id',
          as: 'shopInfo'
        }
      },
      {
        $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$shopInfo', preserveNullAndEmptyArrays: true }
      }
    );

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Booking.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sorting and pagination
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push(
      { $sort: { [sortBy]: sortDirection } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute aggregation
    const bookings = await Booking.aggregate(pipeline);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    };
  } catch (error) {
    logger.error('Get bookings by role error:', error);
    throw new Error(`Error getting bookings by role: ${error.message}`);
  }
};


/**
 * Update booking status
 * @param {string} id - Booking ID
 * @param {string} status - New status
 * @param {string} reason - Reason for status change (optional)
 * @returns {Promise<Object>} - Updated booking
 */
const updateBookingStatus = async (id, status, reason = '') => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(id).session(session);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Validate status change
    const validTransitions = {
      pending: ['pending', 'cancelled'],
      pending: ['confirmed', 'cancelled'],
      assigned: ['confirmed', 'rejected', 'cancelled'], // Can be accepted, rejected, or cancelled
      rejected: ['assigned', 'cancelled'], // Can be reassigned or cancelled
      confirmed: ['completed', 'cancelled', 'noShow'],
      cancelled: [], // Cannot transition from cancelled
      completed: [], // Cannot transition from completed
      noShow: [], // Cannot transition from no-show
      rescheduled: ['pending', 'cancelled'] // Can be approved or cancelled after reschedule
    };

    if (!validTransitions[booking.status] || !validTransitions[booking.status].includes(status)) {
      throw new ApiError(`Cannot change booking status from ${booking.status} to ${status}`, 400);
    }

    // Update status and reason if provided
    booking.status = status;
    if (status === 'cancelled' && reason) {
      booking.cancellationReason = reason;
    } else if (status === 'noShow' && reason) {
      booking.cancellationReason = reason;
    }

    await booking.save({ session });

    // If status is changed to completed, update barber rating
    if (status === 'completed') {
      await updateBarberRating(booking.barberId);
    }

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Update booking status error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error updating booking status: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Rate a booking
 * @param {string} id - Booking ID
 * @param {number} rating - Rating (1-5)
 * @param {string} review - Review text (optional)
 * @returns {Promise<Object>} - Updated booking
 */
const rateBooking = async (id, rating, review = '') => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find booking
    const booking = await Booking.findById(id).session(session);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      throw new ApiError('Only completed bookings can be rated', 400);
    }

    // Check if booking is already rated
    if (booking.rating) {
      throw new ApiError('Booking has already been rated', 400);
    }

    // Update booking with rating and review
    booking.rating = rating;
    booking.review = review;
    await booking.save({ session });

    // Update barber's rating
    await updateBarberRating(booking.barberId, session);

    // If shop exists, update shop rating too
    if (booking.shopId) {
      await updateShopRating(booking.shopId, session);
    }

    // Notify barber about the review
    await notificationService.createNotification({
      userId: booking.barberId,
      title: 'New Review',
      message: `You received a ${rating}-star review for booking #${booking.uid}.`,
      type: 'system',
      relatedId: booking._id,
      onModel: 'Booking'
    }, { session });

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Rate booking error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error rating booking: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Update barber's average rating
 * @param {string} barberId - Barber ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<void>}
 */
const updateBarberRating = async (barberId, session) => {
  try {
    // Get all completed and rated bookings for this barber
    const bookings = await Booking.find({
      barberId,
      status: 'completed',
      rating: { $ne: null }
    }).session(session || null);

    if (bookings.length === 0) return;

    // Calculate average rating
    const totalRating = bookings.reduce((sum, booking) => sum + booking.rating, 0);
    const averageRating = totalRating / bookings.length;

    // Update barber
    await Barber.findByIdAndUpdate(barberId, {
      rating: parseFloat(averageRating.toFixed(1)),
      reviewCount: bookings.length
    }).session(session || null);
  } catch (error) {
    logger.error('Update barber rating error:', error);
    throw error;
  }
};

/**
 * Update shop's average rating
 * @param {string} shopId - Shop ID
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Promise<void>}
 */
const updateShopRating = async (shopId, session) => {
  try {
    // Get all completed and rated bookings for this shop
    const bookings = await Booking.find({
      shopId,
      status: 'completed',
      rating: { $ne: null }
    }).session(session || null);

    if (bookings.length === 0) return;

    // Calculate average rating
    const totalRating = bookings.reduce((sum, booking) => sum + booking.rating, 0);
    const averageRating = totalRating / bookings.length;

    // Update shop
    await Shop.findByIdAndUpdate(shopId, {
      rating: parseFloat(averageRating.toFixed(1)),
      reviewCount: bookings.length
    }).session(session || null);
  } catch (error) {
    logger.error('Update shop rating error:', error);
    throw error;
  }
};

/**
 * Count total bookings
 * @param {Object} filter - Query filter
 * @returns {Promise<number>} - Number of bookings
 */
const countBookings = async (filter = {}) => {
  try {
    return await Booking.countDocuments(filter);
  } catch (error) {
    logger.error('Count bookings error:', error);
    throw new Error(`Error counting bookings: ${error.message}`);
  }
};

/**
 * Get recent bookings
 * @param {number} limit - Number of bookings to return
 * @returns {Promise<Array>} - List of recent bookings
 */
const getRecentBookings = async (limit = 10) => {
  try {
    return await Booking.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('customerId', 'firstName lastName')
        .populate('barberId', 'firstName lastName')
        .populate('serviceId', 'name price')
        .populate('shopId', 'name')
        .lean();
  } catch (error) {
    logger.error('Recent bookings error:', error);
    throw new Error(`Error getting recent bookings: ${error.message}`);
  }
};

/**
 * Get booking statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Booking statistics
 */
const getBookingStats = async (options = {}) => {
  try {
    const match = {};

    // Add filter for date range
    if (options.startDate || options.endDate) {
      match.createdAt = {};
      if (options.startDate) match.createdAt.$gte = new Date(options.startDate);
      if (options.endDate) match.createdAt.$lte = new Date(options.endDate);
    }

    // Aggregate booking statistics
    const stats = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            status: '$status',
            serviceType: '$serviceType'
          },
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: '$count' },
          totalRevenue: { $sum: '$revenue' },
          byStatus: {
            $push: {
              status: '$_id.status',
              serviceType: '$_id.serviceType',
              count: '$count',
              revenue: '$revenue'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalBookings: 1,
          totalRevenue: 1,
          byStatus: 1
        }
      }
    ]);

    // Process and format statistics
    let result = {
      totalBookings: 0,
      totalRevenue: 0,
      byStatus: {},
      byServiceType: {}
    };

    if (stats.length > 0) {
      const stat = stats[0];
      result.totalBookings = stat.totalBookings;
      result.totalRevenue = stat.totalRevenue;

      // Process by status and service type
      stat.byStatus.forEach(item => {
        const { status, serviceType, count, revenue } = item;

        // By status
        if (!result.byStatus[status]) {
          result.byStatus[status] = { count: 0, revenue: 0 };
        }
        result.byStatus[status].count += count;
        result.byStatus[status].revenue += revenue;

        // By service type
        if (!result.byServiceType[serviceType]) {
          result.byServiceType[serviceType] = { count: 0, revenue: 0 };
        }
        result.byServiceType[serviceType].count += count;
        result.byServiceType[serviceType].revenue += revenue;
      });
    }

    return result;
  } catch (error) {
    logger.error('Booking stats error:', error);
    throw new Error(`Error getting booking statistics: ${error.message}`);
  }
};

/**
 * Count bookings by country
 * @param {string} countryId - Country ID
 * @param {Object} filter - Additional filters
 * @returns {Promise<number>} - Number of bookings
 */
const countBookingsByCountry = async (countryId, filter = {}) => {
  try {
    filter.countryId = countryId;
    return await Booking.countDocuments(filter);
  } catch (error) {
    logger.error('Count bookings by country error:', error);
    throw new Error(`Error counting bookings by country: ${error.message}`);
  }
};

/**
 * Reschedule a booking
 * @param {string} bookingId - Booking ID
 * @param {Object} body - Booking data
 * @returns {Promise<Object>} - Updated booking
 */
const rescheduleBooking = async (bookingId, body = {}) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }
    // 
    booking.bookingDate = body.newDate;
    booking.bookingTime = body.newTime;
    booking.duration = body.duration;
    await booking.save();

    return booking;
  } catch (error) {
    logger.error('Reschedule booking error:', error);
    throw new Error(`Error rescheduling booking: ${error.message}`);
  }
}

/**
 * Get pending booking requests for a provider (barber/freelancer)
 * @param {string} providerId - Provider user ID
 * @param {Object} options - Query options (page, limit, etc.)
 * @returns {Promise<Object>} - Pending booking requests with pagination
 */
const getPendingBookingRequests = async (providerId, options = {}) => {
  try {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const skip = (page - 1) * limit;

    logger.info('📋 [getPendingBookingRequests] Getting pending requests for provider:', {
      providerId,
      page,
      limit
    });

    // Find bookings where the provider is assigned and status requires action
    const query = {
      $or: [
        { barberId: providerId },
        {
          barberId: {
            $in: await Barber.find({ userId: providerId }).distinct('_id')
          }
        },
        {
          barberId: {
            $in: await Freelancer.find({ _id: providerId }).distinct('_id')
          }
        }
      ],
      status: { $in: ['pending', 'assigned', 'reassigned'] }
    };

    const bookings = await Booking.find(query)
      .populate('customerId', 'firstName lastName phoneNumber')
      .populate('serviceId', 'title price duration')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments(query);

    const result = {
      bookings: bookings.map(booking => ({
        _id: booking._id,
        uid: booking.uid,
        customerName: `${booking.customerId?.firstName || ''} ${booking.customerId?.lastName || ''}`.trim(),
        customerPhone: booking.customerId?.phoneNumber || '',
        serviceName: booking.serviceName,
        servicePrice: booking.price,
        serviceDuration: booking.duration,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime,
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    logger.info('📋 [getPendingBookingRequests] Found pending requests:', {
      count: bookings.length,
      total,
      providerId
    });

    return result;
  } catch (error) {
    logger.error('❌ [getPendingBookingRequests] Failed to get pending requests:', error.message);
    throw new Error(`Error getting pending booking requests: ${error.message}`);
  }
};

/**
 * Update booking details (for customers)
 * @param {string} bookingId - Booking ID
 * @param {string} customerId - Customer ID (to verify ownership)
 * @param {Object} updateData - Data to update (bookingDate, bookingTime, notes)
 * @returns {Promise<Object>} - Updated booking
 */
const updateBookingDetails = async (bookingId, customerId, updateData) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if the booking belongs to the customer
    if (booking.customerId.toString() !== customerId.toString()) {
      throw new ApiError('You can only update your own bookings', 403);
    }

    // Check if booking is in pending state
    if (booking.status !== 'pending') {
      throw new ApiError('You can only update bookings that are in pending state', 400);
    }

    // Update the fields
    if (updateData.bookingDate) {
      booking.bookingDate = new Date(updateData.bookingDate);
    }
    if (updateData.bookingTime) {
      booking.bookingTime = updateData.bookingTime;
    }
    if (updateData.notes !== undefined) {
      booking.notes = updateData.notes;
    }

    await booking.save();
    return booking;
  } catch (error) {
    logger.error('Update booking details error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error updating booking details: ${error.message}`);
  }
};

/**
 * Update booking details (public access - no customer validation)
 * @param {string} bookingId - Booking ID
 * @param {Object} updateData - Data to update (bookingDate, bookingTime, notes)
 * @returns {Promise<Object>} - Updated booking
 */
const updateBookingDetailsPublic = async (bookingId, updateData) => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if booking is in pending state
    if (booking.status !== 'pending') {
      throw new ApiError('You can only update bookings that are in pending state', 400);
    }

    // Update the fields
    if (updateData.bookingDate) {
      booking.bookingDate = new Date(updateData.bookingDate);
    }
    if (updateData.bookingTime) {
      booking.bookingTime = updateData.bookingTime;
    }
    if (updateData.notes !== undefined) {
      booking.notes = updateData.notes;
    }

    await booking.save();
    return booking;
  } catch (error) {
    logger.error('Update booking details (public) error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error updating booking details: ${error.message}`);
  }
};
const updateCustomerBookingByShopOwner = async (bookingId, shopOwnerId, updateData) => {
  try {
    const booking = await Booking.findById(bookingId).populate('shopId');
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if the shop owner owns the shop for this booking
    if (!booking.shopId || booking.shopId.ownerId.toString() !== shopOwnerId.toString()) {
      throw new ApiError('You can only update bookings for your own shops', 403);
    }

    // Check if booking is in pending state
    if (booking.status !== 'pending') {
      throw new ApiError('You can only update bookings that are in pending state', 400);
    }

    // Update the fields
    if (updateData.bookingDate) {
      booking.bookingDate = new Date(updateData.bookingDate);
    }
    if (updateData.bookingTime) {
      booking.bookingTime = updateData.bookingTime;
    }
    if (updateData.notes !== undefined) {
      booking.notes = updateData.notes;
    }

    await booking.save();

    // Send notification to customer
    try {
      await notificationService.sendBookingNotification(
        booking.customerId.toString(),
        booking,
        'updated'
      );
    } catch (notificationError) {
      logger.warn('Failed to send booking update notification to customer:', notificationError.message);
    }

    return booking;
  } catch (error) {
    logger.error('Update customer booking by shop owner error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error updating customer booking: ${error.message}`);
  }
};

/**
 * Cancel booking (public access - no customer validation)
 * @param {string} bookingId - Booking ID
 * @param {string} reason - Cancellation reason (optional)
 * @returns {Promise<Object>} - Updated booking
 */
const cancelBookingPublic = async (bookingId, reason = '') => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if booking is in pending state
    if (booking.status !== 'pending') {
      throw new ApiError('You can only cancel bookings that are in pending state', 400);
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    if (reason) {
      booking.cancellationReason = reason;
    }

    await booking.save();

    // Send notification to barber/provider
    try {
      await notificationService.createNotification({
        userId: booking.barberId,
        title: 'Booking Cancelled',
        message: `Booking #${booking.uid} for ${booking.serviceName} has been cancelled.`,
        type: 'booking',
        relatedId: booking._id,
        onModel: 'Booking'
      });
    } catch (notificationError) {
      logger.warn('Failed to send cancellation notification to barber:', notificationError.message);
    }

    return booking;
  } catch (error) {
    logger.error('Cancel booking (public) error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error cancelling booking: ${error.message}`);
  }
};
const cancelBooking = async (bookingId, customerId, reason = '') => {
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError('Booking not found', 404);
    }

    // Check if the booking belongs to the customer
    if (booking.customerId.toString() !== customerId.toString()) {
      throw new ApiError('You can only cancel your own bookings', 403);
    }

    // Check if booking is in pending state
    if (booking.status !== 'pending') {
      throw new ApiError('You can only cancel bookings that are in pending state', 400);
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    if (reason) {
      booking.cancellationReason = reason;
    }

    await booking.save();

    // Send notification to customer
    try {
      await notificationService.createNotification({
        userId: customerId,
        title: 'Booking Cancelled',
        message: `Your booking #${booking.uid} for ${booking.serviceName} has been cancelled successfully.`,
        type: 'booking',
        relatedId: booking._id,
        onModel: 'Booking'
      });
    } catch (notificationError) {
      logger.warn('Failed to send cancellation notification to customer:', notificationError.message);
    }

    // Send notification to barber/provider
    try {
      await notificationService.createNotification({
        userId: booking.barberId,
        title: 'Booking Cancelled',
        message: `Booking #${booking.uid} for ${booking.serviceName} has been cancelled by the customer.`,
        type: 'booking',
        relatedId: booking._id,
        onModel: 'Booking'
      });
    } catch (notificationError) {
      logger.warn('Failed to send cancellation notification to barber:', notificationError.message);
    }

    return booking;
  } catch (error) {
    logger.error('Cancel booking error:', error);
    if (error instanceof ApiError) throw error;
    throw new Error(`Error cancelling booking: ${error.message}`);
  }
};

module.exports = {
  createBooking,
  getBarberBookings,
  getBookingById,
  getBookingByUid,
  getBookingsByCustomer,
  getBookingsByBarber,
  getBookingsByBarberId,
  getBookingsByShop,
  getBookingsByRole,
  updateBookingStatus,
  rateBooking,
  getAvailableTimeSlots,
  getGeneralAvailability,
  isTimeSlotAvailable,
  countBookings,
  getRecentBookings,
  getBookingStats,
  countBookingsByCountry,
  rescheduleBooking,
  cancelBooking,
  cancelBookingPublic,
  approveBooking,
  reassignBooking,
  getBookingsForReport,
  getBookingsCountForReport,
  acceptBookingRequest,
  rejectBookingRequest,
  getPendingBookingRequests,
  autoRescheduleStaleBookings,
  autoAssignPendingBookings,
  updateBookingDetails,
  updateBookingDetailsPublic,
  updateCustomerBookingByShopOwner,
  cancelBooking
};