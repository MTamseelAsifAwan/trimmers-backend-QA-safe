// src/services/paymentService.js
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Barber = require('../models/Barber');
const Shop = require('../models/Shop');
const { ApiError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Get payment by ID
 * @param {string} id - Payment ID
 * @returns {Promise<Object>} - Payment details
 */
const getPaymentById = async (id) => {
    try {
        const payment = await Payment.findById(id)
            .populate('bookingId', 'uid serviceName bookingDate bookingTime status')
            .populate('customerId', 'firstName lastName email')
            .populate({
                path: 'providerId',
                refPath: 'providerModel',
                select: 'firstName lastName name'
            });

        if (!payment) {
            throw new ApiError('Payment not found', 404);
        }

        return payment;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new Error(`Error getting payment: ${error.message}`);
    }
};

/**
 * Get payment by UID
 * @param {string} uid - Payment UID
 * @returns {Promise<Object>} - Payment details
 */
const getPaymentByUid = async (uid) => {
    try {
        const payment = await Payment.findOne({ uid })
            .populate('bookingId', 'uid serviceName bookingDate bookingTime status')
            .populate('customerId', 'firstName lastName email')
            .populate({
                path: 'providerId',
                refPath: 'providerModel',
                select: 'firstName lastName name'
            });

        if (!payment) {
            throw new ApiError('Payment not found', 404);
        }

        return payment;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new Error(`Error getting payment: ${error.message}`);
    }
};

/**
 * Process cash payment for a booking
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Payment details
 */
const processCashPayment = async (bookingId, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get booking details
        const booking = await Booking.findById(bookingId).session(session);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Verify booking belongs to user
        if (booking.customerId.toString() !== userId.toString()) {
            throw new ApiError('Unauthorized access to booking', 403);
        }

        // Verify booking hasn't been paid already
        if (booking.paymentStatus === 'paid') {
            throw new ApiError('Booking has already been paid', 400);
        }

        // Create payment record
        const payment = await Payment.create([{
            bookingId,
            customerId: userId,
            providerId: booking.barberId,
            providerModel: 'Barber',
            amount: booking.price,
            currency: 'USD', // Or get from booking.currency
            status: 'pending', // Cash payments start as pending until collected
            paymentMethod: 'cash',
            paymentDetails: { payOnSite: true },
            countryId: booking.countryId
        }], { session });

        // Update booking payment status and ID
        booking.paymentStatus = 'pending';
        booking.paymentId = payment[0]._id;
        await booking.save({ session });

        // Send notification to barber
        await notificationService.createNotification({
            userId: booking.barberId,
            title: 'Cash Payment Selected',
            message: `Customer has selected cash payment for booking #${booking.uid}. Payment will be collected at the time of service.`,
            type: 'payment',
            relatedId: booking._id,
            onModel: 'Booking'
        }, { session });

        await session.commitTransaction();
        return payment[0];
    } catch (error) {
        await session.abortTransaction();
        logger.error('Cash payment processing error:', error);
        if (error instanceof ApiError) throw error;
        throw new Error(`Error processing cash payment: ${error.message}`);
    } finally {
        session.endSession();
    }
};

/**
 * Create Stripe payment intent
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Payment intent details
 */
const createPaymentIntent = async (bookingId, userId) => {
    try {
        // Get booking details
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Verify booking belongs to user
        if (booking.customerId.toString() !== userId.toString()) {
            throw new ApiError('Unauthorized access to booking', 403);
        }

        // Verify booking hasn't been paid already
        if (booking.paymentStatus === 'paid') {
            throw new ApiError('Booking has already been paid', 400);
        }

        // Create payment intent
        const amountInCents = Math.round(booking.price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd', // Or get from booking.currency
            metadata: {
                bookingId: booking._id.toString(),
                customerId: userId.toString(),
                serviceName: booking.serviceName
            }
        });

        return {
            clientSecret: paymentIntent.client_secret,
            amount: booking.price,
            paymentIntentId: paymentIntent.id
        };
    } catch (error) {
        logger.error('Payment intent creation error:', error);
        if (error instanceof ApiError) throw error;
        throw new Error(`Error creating payment intent: ${error.message}`);
    }
};

/**
 * Process Stripe payment
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Payment details
 */
const processStripePayment = async (paymentIntentId, bookingId, userId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get booking details
        const booking = await Booking.findById(bookingId).session(session);
        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Verify booking belongs to user
        if (booking.customerId.toString() !== userId.toString()) {
            throw new ApiError('Unauthorized access to booking', 403);
        }

        // Verify booking hasn't been paid already
        if (booking.paymentStatus === 'paid') {
            throw new ApiError('Booking has already been paid', 400);
        }

        // Verify payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            throw new ApiError('Payment has not been completed', 400);
        }

        // Get payment method details for saving
        const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentIntent.payment_method
        );

        // Create payment record
        const payment = await Payment.create([{
            bookingId,
            customerId: userId,
            providerId: booking.barberId,
            providerModel: 'Barber',
            amount: booking.price,
            currency: paymentIntent.currency || 'usd',
            status: 'completed',
            paymentMethod: 'card',
            stripePaymentIntentId: paymentIntentId,
            paymentDetails: {
                paymentMethodType: paymentMethod.type,
                brand: paymentMethod.card ? paymentMethod.card.brand : null,
                last4: paymentMethod.card ? paymentMethod.card.last4 : null
            },
            countryId: booking.countryId
        }], { session });

        // Update booking payment status and status
        booking.paymentStatus = 'paid';
        booking.paymentId = payment[0]._id;

        // If the booking was pending, confirm it now
        if (booking.status === 'pending') {
            booking.status = 'confirmed';
        }

        await booking.save({ session });

        // Notify barber about payment
        await notificationService.createNotification({
            userId: booking.barberId,
            title: 'Payment Received',
            message: `Payment for booking #${booking.uid} has been processed successfully.`,
            type: 'payment',
            relatedId: booking._id,
            onModel: 'Booking'
        }, { session });

        await session.commitTransaction();
        return payment[0];
    } catch (error) {
        await session.abortTransaction();
        logger.error('Stripe payment processing error:', error);
        if (error instanceof ApiError) throw error;
        throw new Error(`Error processing Stripe payment: ${error.message}`);
    } finally {
        session.endSession();
    }
};

/**
 * Get payments by customer
 * @param {string} customerId - Customer ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Payments and pagination info
 */
const getPaymentsByCustomer = async (customerId, options = {}) => {
    try {
        const page = parseInt(options.page) || 1;
        const limit = Math.min(parseInt(options.limit) || 10, 100);
        const skip = (page - 1) * limit;

        const filter = { customerId };

        // Add status filter if provided
        if (options.status) {
            filter.status = options.status;
        }

        // Build sort object
        const sortBy = options.sortBy || 'createdAt';
        const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortBy]: sortOrder };

        // Execute query with pagination
        const [payments, totalCount] = await Promise.all([
            Payment.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('bookingId', 'uid serviceName bookingDate bookingTime status')
                .lean(),
            Payment.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);

        return {
            payments,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limit
            }
        };
    } catch (error) {
        throw new Error(`Error getting customer payments: ${error.message}`);
    }
};

/**
 * Get payments by provider (barber or shop)
 * @param {string} providerId - Provider ID
 * @param {string} providerModel - Provider model (Barber or Shop)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Payments and pagination info
 */
const getPaymentsByProvider = async (providerId, providerModel, options = {}) => {
    try {
        const page = parseInt(options.page) || 1;
        const limit = Math.min(parseInt(options.limit) || 10, 100);
        const skip = (page - 1) * limit;

        const filter = { providerId, providerModel };

        // Add status filter if provided
        if (options.status) {
            filter.status = options.status;
        }

        // Build sort object
        const sortBy = options.sortBy || 'createdAt';
        const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
        const sort = { [sortBy]: sortOrder };

        // Execute query with pagination
        const [payments, totalCount] = await Promise.all([
            Payment.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('bookingId', 'uid serviceName bookingDate bookingTime status')
                .populate('customerId', 'firstName lastName')
                .lean(),
            Payment.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limit);

        return {
            payments,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                itemsPerPage: limit
            }
        };
    } catch (error) {
        throw new Error(`Error getting provider payments: ${error.message}`);
    }
};

/**
 * Update payment status
 * @param {string} id - Payment ID
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated payment
 */
const updatePaymentStatus = async (id, status) => {
    try {
        const payment = await Payment.findById(id);
        if (!payment) {
            throw new ApiError('Payment not found', 404);
        }

        // Update status
        payment.status = status;
        await payment.save();

        return payment;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new Error(`Error updating payment status: ${error.message}`);
    }
};

/**
 * Cancel booking and process refund if paid with Stripe
 * @param {string} bookingId - Booking ID
 * @param {string} userId - User ID (customer)
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} - Updated booking and refund details
 */
const cancelAndRefundBooking = async (bookingId, userId, reason) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get booking details
        const booking = await Booking.findById(bookingId)
            .populate('paymentId')
            .session(session);

        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        // Verify booking belongs to user
        if (booking.customerId.toString() !== userId.toString()) {
            throw new ApiError('Unauthorized access to booking', 403);
        }

        // Check if booking can be cancelled
        if (['completed', 'cancelled'].includes(booking.status)) {
            throw new ApiError(`Booking cannot be cancelled because it is already ${booking.status}`, 400);
        }

        // Check cancellation time policy (e.g., can only cancel X hours before appointment)
        const now = new Date();
        const bookingDateTime = new Date(booking.bookingDate);
        bookingDateTime.setHours(booking.bookingTime.hour, booking.bookingTime.minute);

        const hoursBeforeBooking = (bookingDateTime - now) / (1000 * 60 * 60);

        // For example, require cancellation at least 2 hours before appointment
        const minimumHoursForCancellation = 2;
        if (hoursBeforeBooking < minimumHoursForCancellation) {
            throw new ApiError(`Bookings must be cancelled at least ${minimumHoursForCancellation} hours before the appointment time`, 400);
        }

        // Process refund if paid with Stripe
        let refundResult = null;
        if (booking.paymentStatus === 'paid' && booking.paymentId) {
            const payment = booking.paymentId;

            // Only process refund for card payments with Stripe
            if (payment.paymentMethod === 'card' && payment.stripePaymentIntentId) {
                try {
                    // Create refund in Stripe
                    const stripeRefund = await stripe.refunds.create({
                        payment_intent: payment.stripePaymentIntentId,
                        reason: 'requested_by_customer'
                    });

                    // Update payment status and add refund details
                    payment.status = 'refunded';
                    payment.refundDetails = {
                        amount: payment.amount,
                        reason: reason || 'Customer cancelled booking',
                        refundDate: new Date(),
                        stripeRefundId: stripeRefund.id
                    };

                    await payment.save({ session });
                    refundResult = {
                        amount: payment.amount,
                        currency: payment.currency,
                        refundId: stripeRefund.id
                    };
                } catch (stripeError) {
                    logger.error('Stripe refund error:', stripeError);
                    throw new ApiError(`Failed to process refund: ${stripeError.message}`, 500);
                }
            }
        }

        // Update booking status
        booking.status = 'cancelled';
        booking.cancellationReason = reason || 'Customer requested cancellation';

        // Update payment status if not already handled
        if (booking.paymentStatus === 'pending') {
            booking.paymentStatus = 'cancelled';
        } else if (booking.paymentStatus === 'paid' && refundResult) {
            booking.paymentStatus = 'refunded';
        }

        await booking.save({ session });

        // Notify barber about cancellation
        await notificationService.createNotification({
            userId: booking.barberId,
            title: 'Booking Cancelled',
            message: `Booking #${booking.uid} has been cancelled by the customer. ${refundResult ? 'Payment has been refunded.' : ''}`,
            type: 'booking',
            relatedId: booking._id,
            onModel: 'Booking'
        }, { session });

        await session.commitTransaction();

        return {
            booking,
            refund: refundResult
        };
    } catch (error) {
        await session.abortTransaction();
        logger.error('Booking cancellation error:', error);
        if (error instanceof ApiError) throw error;
        throw new Error(`Error cancelling booking with refund: ${error.message}`);
    } finally {
        session.endSession();
    }
};

/**
 * Refund payment
 * @param {string} paymentId - Payment ID
 * @param {Object} refundData - Refund data
 * @returns {Promise<Object>} - Updated payment
 */
const refundPayment = async (paymentId, refundData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const payment = await Payment.findById(paymentId).session(session);
        if (!payment) {
            throw new ApiError('Payment not found', 404);
        }

        // Check if payment can be refunded
        if (payment.status !== 'completed') {
            throw new ApiError('Only completed payments can be refunded', 400);
        }

        // Check if already refunded
        if (payment.status === 'refunded') {
            throw new ApiError('Payment has already been refunded', 400);
        }

        // For Stripe payments, process refund through Stripe
        if (payment.paymentMethod === 'card' && payment.stripePaymentIntentId) {
            try {
                // Set refund amount (defaults to full amount if not specified)
                const refundAmount = refundData.amount !== undefined
                    ? Math.round(refundData.amount * 100)
                    : undefined;

                // Create refund in Stripe
                const stripeRefund = await stripe.refunds.create({
                    payment_intent: payment.stripePaymentIntentId,
                    amount: refundAmount,
                    reason: 'requested_by_customer'
                });

                // Update refund details
                payment.refundDetails = {
                    amount: refundData.amount || payment.amount,
                    reason: refundData.reason || 'Merchant initiated refund',
                    refundDate: new Date(),
                    stripeRefundId: stripeRefund.id
                };
            } catch (stripeError) {
                logger.error('Stripe refund error:', stripeError);
                throw new ApiError(`Failed to process refund: ${stripeError.message}`, 500);
            }
        } else {
            // For non-Stripe payments, just update the refund details
            payment.refundDetails = {
                amount: refundData.amount || payment.amount,
                reason: refundData.reason || 'Merchant initiated refund',
                refundDate: new Date()
            };
        }

        // Update payment status
        payment.status = 'refunded';
        await payment.save({ session });

        // Also update booking payment status if it exists
        if (payment.bookingId) {
            const booking = await Booking.findById(payment.bookingId).session(session);
            if (booking) {
                booking.paymentStatus = 'refunded';
                await booking.save({ session });
            }
        }

        await session.commitTransaction();
        return payment;
    } catch (error) {
        await session.abortTransaction();
        if (error instanceof ApiError) throw error;
        throw new Error(`Error refunding payment: ${error.message}`);
    } finally {
        session.endSession();
    }
};

/**
 * Get payment statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Payment statistics
 */
const getPaymentStatistics = async (options = {}) => {
    try {
        const match = {};

        // Add filter for date range
        if (options.startDate || options.endDate) {
            match.createdAt = {};
            if (options.startDate) match.createdAt.$gte = new Date(options.startDate);
            if (options.endDate) match.createdAt.$lte = new Date(options.endDate);
        }

        // Add filter for provider
        if (options.providerId && options.providerModel) {
            match.providerId = mongoose.Types.ObjectId(options.providerId);
            match.providerModel = options.providerModel;
        }

        // Add filter for customer
        if (options.customerId) {
            match.customerId = mongoose.Types.ObjectId(options.customerId);
        }

        // Aggregate payment statistics
        const stats = await Payment.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        status: '$status',
                        paymentMethod: '$paymentMethod'
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            {
                $group: {
                    _id: null,
                    totalPayments: { $sum: '$count' },
                    totalAmount: { $sum: '$totalAmount' },
                    byStatus: {
                        $push: {
                            status: '$_id.status',
                            paymentMethod: '$_id.paymentMethod',
                            count: '$count',
                            amount: '$totalAmount'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalPayments: 1,
                    totalAmount: 1,
                    byStatus: 1
                }
            }
        ]);

        // Process and format statistics
        let result = {
            totalPayments: 0,
            totalAmount: 0,
            byStatus: {},
            byPaymentMethod: {}
        };

        if (stats.length > 0) {
            const stat = stats[0];
            result.totalPayments = stat.totalPayments;
            result.totalAmount = stat.totalAmount;

            // Process by status and payment method
            stat.byStatus.forEach(item => {
                const { status, paymentMethod, count, amount } = item;

                // By status
                if (!result.byStatus[status]) {
                    result.byStatus[status] = { count: 0, amount: 0 };
                }
                result.byStatus[status].count += count;
                result.byStatus[status].amount += amount;

                // By payment method
                if (!result.byPaymentMethod[paymentMethod]) {
                    result.byPaymentMethod[paymentMethod] = { count: 0, amount: 0 };
                }
                result.byPaymentMethod[paymentMethod].count += count;
                result.byPaymentMethod[paymentMethod].amount += amount;
            });
        }

        return result;
    } catch (error) {
        throw new Error(`Error getting payment statistics: ${error.message}`);
    }
};

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe event
 * @returns {Promise<boolean>} - Success status
 */
const handleStripeWebhook = async (event) => {
    try {
        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;

            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;

            // Add other event types as needed

            default:
                logger.info(`Unhandled Stripe event type: ${event.type}`);
        }

        return true;
    } catch (error) {
        logger.error('Error handling Stripe webhook:', error);
        throw new Error(`Error handling Stripe webhook: ${error.message}`);
    }
};

/**
 * Handle successful payment intent
 * @param {Object} paymentIntent - Stripe payment intent
 * @returns {Promise<void>}
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
    try {
        // Extract booking ID from metadata
        const { bookingId } = paymentIntent.metadata;

        if (!bookingId) {
            logger.warn('Payment intent succeeded without booking ID in metadata');
            return;
        }

        // Find payment by Stripe payment intent ID
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });

        if (payment) {
            // Update payment status
            payment.status = 'completed';
            await payment.save();

            // Find and update booking
            const booking = await Booking.findById(bookingId);
            if (booking) {
                booking.paymentStatus = 'paid';
                // Also confirm the booking
                if (booking.status === 'pending') {
                    booking.status = 'confirmed';
                }
                await booking.save();

                // Send notification
                await notificationService.createNotification({
                    userId: booking.barberId,
                    title: 'Payment Received',
                    message: `Payment for booking #${booking.uid} has been processed successfully.`,
                    type: 'payment',
                    relatedId: booking._id,
                    onModel: 'Booking'
                });
            }
        } else {
            logger.warn(`Payment not found for payment intent ${paymentIntent.id}`);
        }
    } catch (error) {
        logger.error('Error handling payment intent succeeded:', error);
    }
}

/**
 * Handle failed payment intent
 * @param {Object} paymentIntent - Stripe payment intent
 * @returns {Promise<void>}
 */
async function handlePaymentIntentFailed(paymentIntent) {
    try {
        // Extract booking ID from metadata
        const { bookingId } = paymentIntent.metadata;

        if (!bookingId) {
            logger.warn('Payment intent failed without booking ID in metadata');
            return;
        }

        // Find payment by Stripe payment intent ID
        const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntent.id });

        if (payment) {
            // Update payment status
            payment.status = 'failed';
            await payment.save();

            // Find and update booking
            const booking = await Booking.findById(bookingId);
            if (booking) {
                booking.paymentStatus = 'failed';
                await booking.save();

                // Send notification to customer
                await notificationService.createNotification({
                    userId: booking.customerId,
                    title: 'Payment Failed',
                    message: `Your payment for booking #${booking.uid} has failed. Please try again or choose a different payment method.`,
                    type: 'payment',
                    relatedId: booking._id,
                    onModel: 'Booking'
                });
            }
        } else {
            logger.warn(`Payment not found for payment intent ${paymentIntent.id}`);
        }
    } catch (error) {
        logger.error('Error handling payment intent failed:', error);
    }
}

/**
 * Handle charge refunded
 * @param {Object} charge - Stripe charge
 * @returns {Promise<void>}
 */
async function handleChargeRefunded(charge) {
    try {
        // Find payment by Stripe payment intent ID
        const payment = await Payment.findOne({ stripePaymentIntentId: charge.payment_intent });

        if (payment) {
            // Update payment status and refund details
            payment.status = 'refunded';
            payment.refundDetails = {
                amount: charge.amount_refunded / 100, // Convert from cents
                reason: 'Refunded via Stripe',
                refundDate: new Date(),
                stripeRefundId: charge.refunds.data[0]?.id
            };
            await payment.save();

            // Find and update booking
            const booking = await Booking.findById(payment.bookingId);
            if (booking) {
                booking.paymentStatus = 'refunded';
                await booking.save();

                // Send notification to customer
                await notificationService.createNotification({
                    userId: booking.customerId,
                    title: 'Payment Refunded',
                    message: `Your payment for booking #${booking.uid} has been refunded.`,
                    type: 'payment',
                    relatedId: booking._id,
                    onModel: 'Booking'
                });
            }
        } else {
            logger.warn(`Payment not found for charge ${charge.id}`);
        }
    } catch (error) {
        logger.error('Error handling charge refunded:', error);
    }
}

module.exports = {
    getPaymentById,
    getPaymentByUid,
    processCashPayment,
    createPaymentIntent,
    processStripePayment,
    getPaymentsByCustomer,
    getPaymentsByProvider,
    updatePaymentStatus,
    cancelAndRefundBooking,
    refundPayment,
    getPaymentStatistics,
    handleStripeWebhook
};