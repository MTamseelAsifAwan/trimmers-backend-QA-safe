// src/models/Country.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

/**
 * Country Schema
 */
const CountrySchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.COUNTRY),
        index: true
    },
    name: {
        type: String,
        required: [true, 'Country name is required'],
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Country code is required'],
        unique: true,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 3
    },
    flagUrl: {
        type: String,
        default: null
    },
    currency: {
        code: {
            type: String,
            default: 'USD'
        },
        symbol: {
            type: String,
            default: '$'
        }
    },
    timeZone: {
        type: String,
        default: 'UTC'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    phoneCode: {
        type: String,
        default: ''
    },
    languageCode: {
        type: String,
        default: 'en'
    },
    cities: [{
        name: {
            type: String,
            required: true
        },
        code: {
            type: String,
            default:''
        },
        areas: [{
            name: {
                type: String,
                required: true
            },
            code: {
                type: String,
               default:''
            }
        }]
    }]
}, {
    timestamps: true
});

// Indexes for faster lookups
CountrySchema.index({ code: 1 });
CountrySchema.index({ isActive: 1 });
CountrySchema.index({ 'cities.code': 1 });

module.exports = mongoose.model('Country', CountrySchema);