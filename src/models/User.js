// src/models/User.js
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
    FREELANCER: 'freelancer' // new role type
};

// Define employment types for barbers
const EMPLOYMENT_TYPES = {
    FREELANCE: 'freelance',
    EMPLOYED: 'employed'
};

const UserSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
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
        default: ROLES.CUSTOMER
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
        enum: ['active', 'inactive'],
        default: 'active'
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
    
    // Country-based access fields
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: [true, 'Country ID is required']
    },
    accessibleCountries: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country'
    }],
    
    // For Customer Care role
    accessibleShops: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
    }],
    accessibleCustomers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Permission overrides
    permissions: [{
        type: String
    }],
    
    lastLogin: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual references
UserSchema.virtual('customer', {
    ref: 'Customer',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

UserSchema.virtual('shopOwner', {
    ref: 'ShopOwner',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

UserSchema.virtual('barber', {
    ref: 'Barber',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

UserSchema.virtual('freelancer', {
    ref: 'Freelancer',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
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
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
UserSchema.methods.generateAuthToken = function () {
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
UserSchema.methods.generatePasswordResetToken = function () {
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
UserSchema.methods.generateEmailVerificationToken = function () {
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
UserSchema.methods.hasPermission = function (permission) {
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
UserSchema.methods.hasCountryAccess = function (countryId) {
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

module.exports = {
    User: mongoose.model('User', UserSchema),
    ROLES,
    EMPLOYMENT_TYPES
};