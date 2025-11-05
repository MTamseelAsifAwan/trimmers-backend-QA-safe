// src/models/PlatformFee.js
const mongoose = require('mongoose');

const PlatformFeeSchema = new mongoose.Schema({
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: true,
        unique: true
    },
    freelanceBarberFee: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 10 // Default 10% platform fee
    },
    shopFee: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 15 // Default 15% platform fee
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Create a compound index to ensure uniqueness
PlatformFeeSchema.index({ countryId: 1 }, { unique: true });

module.exports = mongoose.model('PlatformFee', PlatformFeeSchema);