// src/models/Shop.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

const OpeningHoursSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    openTime: {
        type: String,
        required: true  // Format: "HH:MM" in 24-hour format
    },
    closeTime: {
        type: String,
        required: true  // Format: "HH:MM" in 24-hour format
    }
});

const SocialMediaSchema = new mongoose.Schema({
    facebook: String,
    instagram: String,
    twitter: String,
    website: String
});

const ShopSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.SHOP),
        index: true
    },
    name: {
        type: String,
        required: [true, 'Shop name is required'],
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShopOwner',
        required: false
    },
    owners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    address: {
        type: String,
        required: [true, 'Shop address is required'],
        trim: true
    },
    latitude: {
        type: Number,
        required: [true, 'Latitude is required']
    },
    longitude: {
        type: Number,
        required: [true, 'Longitude is required']
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        default: ''
    },
    images: {
        type: [String],
        default: []
    },
    mainImage: {
        type: String,
        default: null
    },
    mainImageBlob: {
        data: Buffer,
        contentType: String
    },
    openingHours: [OpeningHoursSchema],
    serviceTypes: {
        type: [String],
        enum: ['shopBased', 'homeBased'],
        default: ['shopBased']
    },
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
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    amenities: {
        type: [String],
        default: []
    },
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }],
    schedules: [{
        from: { type: String, required: true },
        to: { type: String, required: true },
        status: { type: String, enum: ['open', 'closed'], default: 'open' }
    }],
    socialMedia: {
        type: SocialMediaSchema,
        default: {}
    },
    
    // Country-specific fields
    countryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country'
    },
    cityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'City',
        required: false
    },
    areaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area',
        required: false,
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String,
        default: null
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    verifiedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Virtual for barbers
ShopSchema.virtual('barbers', {
    ref: 'Barber',
    localField: '_id',
    foreignField: 'shopId',
    justOne: false
});

// Virtual for services (populated from Service model)
ShopSchema.virtual('populatedServices', {
    ref: 'Service',
    localField: '_id',
    foreignField: 'shopId',
    justOne: false
});

// Virtual for bookings
ShopSchema.virtual('bookings', {
    ref: 'Booking',
    localField: '_id',
    foreignField: 'shopId',
    justOne: false
});

// ==================== OPTIMIZED INDEXES ====================

// 1. Compound index for most common query pattern (isVerified + isActive)
ShopSchema.index({ isVerified: 1, isActive: 1, createdAt: -1 }, { 
    name: 'idx_verified_active',
    background: true 
});

// 2. Compound index for location-based queries with status filters
ShopSchema.index({ isActive: 1, isVerified: 1, latitude: 1, longitude: 1 }, {
    name: 'idx_active_verified_location',
    background: true
});

// 3. Index for owner-specific queries
ShopSchema.index({ ownerId: 1, isActive: 1 }, {
    name: 'idx_owner_active',
    background: true
});

// 4. Index for text search optimization
ShopSchema.index({ name: 1, address: 1, uid: 1 }, {
    name: 'idx_search_fields',
    background: true
});

// 5. Compound index for country-based filtering
ShopSchema.index({ countryId: 1, isVerified: 1, isActive: 1 }, {
    name: 'idx_country_verified_active',
    background: true
});

// 6. Index for rating-based queries
ShopSchema.index({ isActive: 1, isVerified: 1, rating: -1, reviewCount: -1 }, {
    name: 'idx_rating_reviews',
    background: true
});

// 7. Basic location index (legacy support)
ShopSchema.index({ latitude: 1, longitude: 1 }, {
    name: 'idx_location_basic'
});

// 8. 2dsphere index for advanced geospatial queries (if needed)
// Note: This requires a GeoJSON Point field, currently using latitude/longitude
// ShopSchema.index({ "location": "2dsphere" });

// 9. Additional indexes for hierarchical location queries
ShopSchema.index({ cityId: 1 }, { background: true });
ShopSchema.index({ areaId: 1 }, { background: true });
ShopSchema.index({ verificationStatus: 1 }, { background: true });

// ==================== END OPTIMIZED INDEXES ====================

// Method to check if shop is currently open
ShopSchema.methods.isOpenNow = function () {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const todaysHours = this.openingHours.find(hours => hours.day === dayOfWeek);

    if (!todaysHours || !todaysHours.isOpen) {
        return false;
    }

    return currentTime >= todaysHours.openTime && currentTime <= todaysHours.closeTime;
};

module.exports = mongoose.model('Shop', ShopSchema);