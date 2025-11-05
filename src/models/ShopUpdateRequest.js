// src/models/ShopUpdateRequest.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

const RequestedChangeSchema = new mongoose.Schema({
    fieldName: {
        type: String,
        required: true
    },
    oldValue: {
        type: mongoose.Schema.Types.Mixed
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    fieldType: {
        type: String,
        enum: ['openingHours', 'location', 'businessInfo', 'contact', 'other'],
        required: true
    }
}, { _id: false });

const ShopUpdateRequestSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.SHOP_UPDATE_REQUEST),
        index: true
    },
    shopOwnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    requestedChanges: {
        type: Map,
        of: RequestedChangeSchema,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    requestedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    reviewedAt: {
        type: Date
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewNotes: {
        type: String
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    }
});

// Compound indexes for efficient queries
ShopUpdateRequestSchema.index({ shopId: 1, status: 1 });
ShopUpdateRequestSchema.index({ shopOwnerId: 1, status: 1 });
ShopUpdateRequestSchema.index({ status: 1, requestedAt: 1 });

module.exports = mongoose.model('ShopUpdateRequest', ShopUpdateRequestSchema);