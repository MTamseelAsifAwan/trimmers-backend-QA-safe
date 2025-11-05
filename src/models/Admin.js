// src/models/Admin.js
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

const AdminSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.ADMIN),
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
        default: ROLES.ADMIN
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: [true, 'Country ID is required']
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
    adminLevel: {
        type: String,
        enum: ['super_admin', 'country_manager', 'customer_care', 'admin'],
        default: 'admin'
    }
}, {
    timestamps: true
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
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
AdminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
AdminSchema.methods.generateAuthToken = function () {
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
AdminSchema.methods.generatePasswordResetToken = function () {
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
AdminSchema.methods.generateEmailVerificationToken = function () {
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
AdminSchema.methods.hasPermission = function (permission) {
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
AdminSchema.methods.hasCountryAccess = function (countryId) {
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

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;
