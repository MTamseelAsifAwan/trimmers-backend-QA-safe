// src/models/Setting.js
const mongoose = require('mongoose');

/**
 * Schema for application settings
 */
const SettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json'],
        default: 'string'
    },
    description: {
        type: String,
        default: ''
    },
    isSystem: {
        type: Boolean,
        default: false
    },
    isProtected: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Pre-save middleware to convert value to appropriate type
SettingSchema.pre('save', function (next) {
    if (this.isModified('value') || this.isModified('type')) {
        try {
            // Convert value to the specified type
            switch (this.type) {
                case 'number':
                    this.value = Number(this.value);
                    break;
                case 'boolean':
                    if (typeof this.value === 'string') {
                        this.value = this.value.toLowerCase() === 'true';
                    } else {
                        this.value = Boolean(this.value);
                    }
                    break;
                case 'json':
                    if (typeof this.value === 'string') {
                        try {
                            this.value = JSON.parse(this.value);
                        } catch (e) {
                            // Keep as is if parsing fails
                        }
                    }
                    break;
                case 'string':
                default:
                    if (typeof this.value !== 'string') {
                        this.value = String(this.value);
                    }
                    break;
            }
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

module.exports = mongoose.model('Setting', SettingSchema);