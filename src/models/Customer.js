// src/models/Customer.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

const AddressSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },
  formattedAddress: {
    type: String,
    required: [true, 'Formatted address is required']
  }
});

const CustomerSchema = new mongoose.Schema({
  uid: {
    type: String,
    unique: true,
    default: () => generateModelId(MODEL_PREFIXES.CUSTOMER),
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
    select: false
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
  role: {
    type: String,
    default: 'customer',
    enum: ['customer']
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
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
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  permissions: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
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
  addresses: {
    type: [AddressSchema],
    default: [],
    required: false
  },
  defaultAddress: {
    type: Number,  // Index of the default address in the addresses array
    default: 0
  },
  favoriteShops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  }],
  favoriteBarbers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Barber'
  }],
  stripeCustomerId: {
    type: String,
    default: null
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: false
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: false,
  },
}, {
  timestamps: true
});

// Virtual for bookings
CustomerSchema.virtual('bookings', {
  ref: 'Booking',
  localField: 'userId',
  foreignField: 'customerId',
  justOne: false
});

// Pre-save hook to hash password
CustomerSchema.pre('save', async function(next) {
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

// Method to compare passwords
CustomerSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
CustomerSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Method to generate password reset token
CustomerSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

module.exports = mongoose.model('Customer', CustomerSchema);