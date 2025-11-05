// src/api/payments/controllers/paymentController.js
const paymentService = require('../../../services/paymentService');
const notificationService = require('../../../services/notificationService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get payment by ID
 * @route GET /api/payments/:id
 * @access Private
 */
const getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payment = await paymentService.getPaymentById(id);

        // Check authorization
        const isCustomer = payment.customerId._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isProvider = payment.providerModel === 'Barber' &&
            req.user.role === 'barber' &&
            req.barber &&
            payment.providerId.toString() === req.barber._id.toString();
        const isShopOwner = payment.providerModel === 'Shop' &&
            req.user.role === 'shop_owner' &&
            req.shopOwner;

        if (!isCustomer && !isAdmin && !isProvider && !isShopOwner) {
            throw new ApiError('You are not authorized to view this payment', 403);
        }

        res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get payment by UID
 * @route GET /api/payments/uid/:uid
 * @access Private
 */
const getPaymentByUid = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const payment = await paymentService.getPaymentByUid(uid);

        // Check authorization
        const isCustomer = payment.customerId._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        const isProvider = payment.providerModel === 'Barber' &&
            req.user.role === 'barber' &&
            req.barber &&
            payment.providerId.toString() === req.barber._id.toString();
        const isShopOwner = payment.providerModel === 'Shop' &&
            req.user.role === 'shop_owner' &&
            req.shopOwner;

        if (!isCustomer && !isAdmin && !isProvider && !isShopOwner) {
            throw new ApiError('You are not authorized to view this payment', 403);
        }

        res.status(200).json({
            success: true,
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create payment for a booking
 * @route POST /api/payments
 * @access Private
 */
const createPayment = async (req, res, next) => {
    try {
        const { bookingId, paymentMethod, stripePaymentMethodId } = req.body;

        if (!bookingId) {
            throw new ApiError('Booking ID is required', 400);
        }

        // Create payment payload
        const paymentData = {
            paymentMethod: paymentMethod || 'card',
            stripePaymentMethodId,
            paymentDetails: req.body.paymentDetails || {}
        };

        const payment = await paymentService.createPayment(bookingId, paymentData);

        // Send notification to customer
        await notificationService.sendPaymentNotification(
            req.user._id.toString(),
            payment,
            payment.status
        );

        res.status(201).json({
            success: true,
            message: 'Payment processed successfully',
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update payment status (admin only)
 * @route PATCH /api/payments/:id/status
 * @access Private/Admin
 */
const updatePaymentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            throw new ApiError('Status is required', 400);
        }

        const payment = await paymentService.updatePaymentStatus(id, status);

        // Get customer ID to send notification
        const customerId = payment.customerId.toString();

        // Send notification
        await notificationService.sendPaymentNotification(
            customerId,
            payment,
            status
        );

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            data: payment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Process refund
 * @route POST /api/payments/:id/refund
 * @access Private
 */
const refundPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount, reason } = req.body;

        // First get payment to check authorization
        const payment = await paymentService.getPaymentById(id);

        // Only admin, shop owner, or the provider barber can refund
        const isAdmin = req.user.role === 'admin';
        const isProvider = payment.providerModel === 'Barber' &&
            req.user.role === 'barber' &&
            req.barber &&
            payment.providerId.toString() === req.barber._id.toString();
        const isShopOwner = payment.providerModel === 'Shop' &&
            req.user.role === 'shop_owner' &&
            req.shopOwner;

        if (!isAdmin && !isProvider && !isShopOwner) {
            throw new ApiError('You are not authorized to refund this payment', 403);
        }

        // Process refund
        const refundData = {
            amount,
            reason
        };

        const refundedPayment = await paymentService.refundPayment(id, refundData);

        // Send notification to customer
        await notificationService.sendPaymentNotification(
            payment.customerId.toString(),
            refundedPayment,
            'refunded'
        );

        res.status(200).json({
            success: true,
            message: 'Payment refunded successfully',
            data: refundedPayment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get payments by customer
 * @route GET /api/payments/customer
 * @access Private
 */
const getCustomerPayments = async (req, res, next) => {
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

        const result = await paymentService.getPaymentsByCustomer(customerId, options);

        res.status(200).json({
            success: true,
            data: result.payments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get payments by provider (barber or shop)
 * @route GET /api/payments/provider/:providerId/:providerModel
 * @access Private
 */
const getProviderPayments = async (req, res, next) => {
    try {
        const { providerId, providerModel } = req.params;
        const { page, limit, status, sortBy, sortOrder } = req.query;

        // Check authorization
        const isAdmin = req.user.role === 'admin';
        const isProvider = providerModel === 'Barber' &&
            req.user.role === 'barber' &&
            req.barber &&
            providerId === req.barber._id.toString();
        const isShopOwner = providerModel === 'Shop' &&
            req.user.role === 'shop_owner' &&
            req.shopOwner;

        if (!isAdmin && !isProvider && !isShopOwner) {
            throw new ApiError('You are not authorized to view these payments', 403);
        }

        const options = {
            page,
            limit,
            status,
            sortBy,
            sortOrder
        };

        const result = await paymentService.getPaymentsByProvider(providerId, providerModel, options);

        res.status(200).json({
            success: true,
            data: result.payments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get payment statistics
 * @route GET /api/payments/statistics
 * @access Private
 */
const getPaymentStatistics = async (req, res, next) => {
    try {
        const { providerId, providerModel, customerId, startDate, endDate } = req.query;

        // Check authorization
        const isAdmin = req.user.role === 'admin';
        const isUserRequestingOwnStats =
            (providerId && providerModel === 'Barber' && req.user.role === 'barber' && req.barber && providerId === req.barber._id.toString()) ||
            (providerId && providerModel === 'Shop' && req.user.role === 'shop_owner' && req.shopOwner) ||
            (customerId && customerId === req.user._id.toString());

        if (!isAdmin && !isUserRequestingOwnStats) {
            throw new ApiError('You are not authorized to view these statistics', 403);
        }

        const options = {
            providerId,
            providerModel,
            customerId,
            startDate,
            endDate
        };

        const statistics = await paymentService.getPaymentStatistics(options);

        res.status(200).json({
            success: true,
            data: statistics
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handle Stripe webhook
 * @route POST /api/payments/webhook
 * @access Public
 */
const handleStripeWebhook = async (req, res, next) => {
    try {
        const sig = req.headers['stripe-signature'];

        if (!sig) {
            throw new ApiError('Stripe signature is required', 400);
        }

        // Get the raw request body as a buffer
        const rawBody = req.rawBody;

        if (!rawBody) {
            throw new ApiError('Raw request body not available', 400);
        }

        const result = await paymentService.handleStripeWebhook(req.body);

        res.status(200).json({
            success: true,
            message: 'Webhook handled successfully'
        });
    } catch (error) {
        logger.error(`Stripe webhook error: ${error.message}`);

        // Return a 200 response to avoid Stripe retrying
        res.status(200).json({
            success: false,
            message: 'Webhook handling failed'
        });
    }
};

module.exports = {
    getPaymentById,
    getPaymentByUid,
    createPayment,
    updatePaymentStatus,
    refundPayment,
    getCustomerPayments,
    getProviderPayments,
    getPaymentStatistics,
    handleStripeWebhook
};