// src/models/Payment.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

const RefundDetailsSchema = new mongoose.Schema({
    amount: {
        type: Number,
        default: 0
    },
    reason: {
        type: String,
        default: null
    },
    refundDate: {
        type: Date,
        default: null
    },
    stripeRefundId: {
        type: String,
        default: null
    }
});

const CommissionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    }
});

const PaymentSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.PAYMENT),
        index: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    providerId: {
        // Could be a barber ID or shop ID depending on payment flow
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'providerModel'
    },
    providerModel: {
        type: String,
        enum: ['Barber', 'Shop'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    stripePaymentIntentId: {
        type: String,
        default: null
    },
    stripeCustomerId: {
        type: String,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'cash', 'wallet'],
        default: 'card'
    },
    paymentDetails: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    commission: {
        type: CommissionSchema,
        default: {}
    },
    refundDetails: {
        type: RefundDetailsSchema,
        default: {}
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: true
    },
    currency: {
        type: String,
        default: function () {
            // This is just a placeholder - in a real implementation, 
            // you'd query the country and get its currency
            return 'USD';
        }
    },
}, {
    timestamps: true
});

// Index for faster lookups
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ providerId: 1, providerModel: 1 });
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);