// src/models/Location.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

/**
 * City Schema
 */
const CitySchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.CITY),
        index: true
    },
    name: {
        type: String,
        required: [true, 'City name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'City code is required'],
        trim: true,
        uppercase: true
    },
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

/**
 * Area Schema
 */
const AreaSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.AREA),
        index: true
    },
    name: {
        type: String,
        required: [true, 'Area name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Area code is required'],
        trim: true,
        uppercase: true
    },
    cityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    zipCodes: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Indexes for faster lookups
CitySchema.index({ countryId: 1 });
CitySchema.index({ code: 1, countryId: 1 }, { unique: true });
AreaSchema.index({ cityId: 1 });
AreaSchema.index({ code: 1, cityId: 1 }, { unique: true });

const City = mongoose.model('City', CitySchema);
const Area = mongoose.model('Area', AreaSchema);

module.exports = {
    City,
    Area
};