// src/api/payments/routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { requirePermission } = require('../../middlewares/rbac');
const { validate, paymentSchemas } = require('../../utils/validators');
const paymentController = require('./controllers/paymentController');

// Stripe webhook handler (no authentication)
router.post('/webhook', paymentController.handleStripeWebhook);

// All other payment routes require authentication
router.use(authenticate);

// Create a payment
router.post('/',
    validate(paymentSchemas.createPayment),
    paymentController.createPayment
);

// Get payment by ID or UID
router.get('/uid/:uid', paymentController.getPaymentByUid);
router.get('/:id', paymentController.getPaymentById);

// Get customer's payments
router.get('/customer', paymentController.getCustomerPayments);

// Get provider's payments
router.get('/provider/:providerId/:providerModel', paymentController.getProviderPayments);

// Get payment statistics
router.get('/statistics', paymentController.getPaymentStatistics);

// Process refund
router.post('/:id/refund',
    validate(paymentSchemas.refundPayment),
    paymentController.refundPayment
);

// Admin-only routes
router.patch('/:id/status',
    authorize('admin'),
    requirePermission('process_payment'),
    validate(paymentSchemas.updateStatus),
    paymentController.updatePaymentStatus
);

module.exports = router;