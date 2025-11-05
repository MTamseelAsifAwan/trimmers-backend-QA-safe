// src/models/Barber.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

// Define user roles as constants
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    COUNTRY_MANAGER: 'country_manager',
    CUSTOMER_CARE: 'customer_care',
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    SHOP_OWNER: 'shop_owner',
    BARBER: 'barber',
    FREELANCER: 'freelancer'
};

// Define employment types for barbers
const EMPLOYMENT_TYPES = {
    FREELANCE: 'freelance',
    EMPLOYED: 'employed'
};

const LocationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
    },
    coordinates: {
        type: [Number],  // [longitude, latitude]
        required: true
    },
    formattedAddress: String
});

// Create a 2dsphere index on the location field
LocationSchema.index({ coordinates: '2dsphere' });

// National ID Schema
const NationalIdSchema = new mongoose.Schema({
    idNumber: {
        type: String,
    },
    idImageUrl: {
        type: String,
    },
    idImageBlob: {
        data: Buffer,
        contentType: String
    },
    expiryDate: {
        type: Date
    }
});

const BarberSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.BARBER),
        index: true
    },
    userId: {
        type: String,
        default: () => generateModelId(MODEL_PREFIXES.USER),
        index: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't return password by default
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    profile: {
        phoneNumber: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        zipCode: {
            type: String,
            trim: true
        }
    },
    addresses: [{
        street: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        state: {
            type: String,
            trim: true
        },
        zipCode: {
            type: String,
            trim: true
        },
        country: {
            type: String,
            trim: true
        }
    }],
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: Object.values(ROLES),
        default: ROLES.BARBER
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'onLeave', 'online', 'offline', 'blocked'],
        default: 'active'
    },
    blockReason: {
        type: String,
        default: null
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: null
    },
    fcmTokens: [{
        token: {
            type: String,
            required: true
        },
        deviceId: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    emailVerificationToken: String,
    emailVerificationExpiry: Date,
    emailOTP: String,
    emailOTPExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    resetPasswordOTP: String,
    resetPasswordOTPExpire: Date,
    resetPasswordOTPVerified: {
        type: Boolean,
        default: false
    },
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: false
    },
    accessibleCountries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country'
    }],
    accessibleShops: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
    }],
    accessibleCustomers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    permissions: [{
        type: String
    }],
    lastLogin: {
        type: Date,
        default: null
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null  // Null for freelance barbers
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    // National ID field
    nationalId: {
        type: NationalIdSchema,
        default: null
    },
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    }],
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    joinedDate: {
        type: Date,
        default: Date.now
    },
    profile: {
        phoneNumber: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        zipCode: {
            type: String,
            trim: true
        },
        location: {
            latitude: { type: Number, required: false },
            longitude: { type: Number, required: false },
            formattedAddress: { type: String, required: false }
        }
    },
    schedule: {
        type: {
            monday: {
                from: String,
                to: String,
                status: {
                    type: String,
                    enum: ['available', 'unavailable'],
                    default: 'unavailable'
                }
            },
            tuesday: {
                from: String,
                to: String,
                status: {
                    type: String,
                    enum: ['available', 'unavailable'],
                    default: 'unavailable'
                }
            },
            wednesday: {
                from: String,
                to: String,
                status: {
                    type: String,
                    enum: ['available', 'unavailable'],
                    default: 'unavailable'
                }
            },
            thursday: {
                from: String,
                to: String,
                status: {
                    type: String,
                    enum: ['available', 'unavailable'],
                    default: 'unavailable'
                }
            },
            friday: {
                from: String,
                to: String,
                status: {
                    type: String,
                    enum: ['available', 'unavailable'],
                    default: 'unavailable'
                }
            },
            saturday: {
                from: String,
                to: String,
                status: {
                    type: String,
                    enum: ['available', 'unavailable'],
                    default: 'unavailable'
                }
            },
            sunday: {
                from: String,
                to: String,
                status: {
                    type: String,
                    enum: ['available', 'unavailable'],
                    default: 'unavailable'
                }
            }
        },
        required: false,
        _id: false
    },
    serviceType: {
        type: String,
        enum: ['homeBased', 'shopBased', 'both'],
        required: true
    }
}, {
    timestamps: true
});

// Virtual for bookings
BarberSchema.virtual('bookings', {
    ref: 'Booking',
    localField: '_id',
    foreignField: 'barberId',
    justOne: false
});

// Hash password before saving
BarberSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    // Only hash if not already hashed (bcrypt hashes start with $2)
    if (!this.password.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

// Match password
BarberSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
BarberSchema.methods.generateAuthToken = function () {
    const payload = {
        id: this._id,
        uid: this.uid,
        role: this.role
    };

    // Add country data for country-based roles
    if (this.countryId) {
        payload.countryId = this.countryId;
    }

    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

// Generate and hash password reset token
BarberSchema.methods.generatePasswordResetToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    return resetToken;
};

// Generate email verification token
BarberSchema.methods.generateEmailVerificationToken = function () {
    // Generate token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to emailVerificationToken field
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    // Set expire
    this.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
};

// Check if user has specific permission
BarberSchema.methods.hasPermission = function (permission) {
    // Super admin has all permissions
    if (this.role === ROLES.SUPER_ADMIN) {
        return true;
    }

    // Check user's direct permissions
    if (this.permissions && this.permissions.includes(permission)) {
        return true;
    }

    return false;
};

// Check if user has access to a specific country
BarberSchema.methods.hasCountryAccess = function (countryId) {
    // Super admin has access to all countries
    if (this.role === ROLES.SUPER_ADMIN) {
        return true;
    }

    // Country managers only have access to their assigned country
    if (this.role === ROLES.COUNTRY_MANAGER) {
        return this.countryId && this.countryId.toString() === countryId.toString();
    }

    // Admin might have multiple countries assigned
    if (this.accessibleCountries && this.accessibleCountries.length > 0) {
        return this.accessibleCountries.some(id => id.toString() === countryId.toString());
    }

    return false;
};

// Index for location-based queries
BarberSchema.index({ 'profile.location.latitude': 1, 'profile.location.longitude': 1 });

// Index for verification status queries
BarberSchema.index({ verificationStatus: 1 });

// Index for combined queries
BarberSchema.index({ status: 1, verificationStatus: 1 });
BarberSchema.index({ countryId: 1, verificationStatus: 1 });

BarberSchema.index({ location: '2dsphere' });

const Barber = mongoose.model('Barber', BarberSchema);

module.exports = Barber;