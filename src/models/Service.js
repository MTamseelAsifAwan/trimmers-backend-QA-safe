// src/models/Service.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

const ServiceSchema = new mongoose.Schema({
  uid: {
    type: String,
    unique: true,
    default: () => generateModelId(MODEL_PREFIXES.SERVICE),
    index: true
  },
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Service price is required'],
    min: 0
  },
  duration: {
    type: Number,
    required: [true, 'Service duration is required'],
    min: 5  // Minimum duration in minutes
  },
  icon: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'rejected'],
    default: 'active'
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    trim: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null  // Null for services offered by freelance barbers
  },
  barberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Barber',
    default: null  // Can be null for generic services offered by multiple providers
  },
  // New field to support multiple providers
  offeredBy: [{
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'offeredBy.providerType'
    },
    providerType: {
      type: String,
      required: true,
      enum: ['Barber', 'Freelancer', 'Shop']
    },
    customPrice: {
      type: Number,
      min: 0
    },
    customDuration: {
      type: Number,
      min: 5
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Flag to indicate if this is a generic service template
  isTemplate: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    default: null
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String,
    default: null
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
}, {
  timestamps: true
});

// Virtual for available barbers (for services offered by multiple providers)
ServiceSchema.virtual('availableBarbers', {
  ref: 'Barber',
  localField: 'offeredBy.providerId',
  foreignField: '_id',
  justOne: false,
  match: { 'offeredBy.providerType': 'Barber' }
});

// Virtual for available freelancers
ServiceSchema.virtual('availableFreelancers', {
  ref: 'Freelancer',
  localField: 'offeredBy.providerId',
  foreignField: '_id',
  justOne: false,
  match: { 'offeredBy.providerType': 'Freelancer' }
});

// Virtual for available shops
ServiceSchema.virtual('availableShops', {
  ref: 'Shop',
  localField: 'offeredBy.providerId',
  foreignField: '_id',
  justOne: false,
  match: { 'offeredBy.providerType': 'Shop' }
});

// Compound index for queries
ServiceSchema.index({ shopId: 1, type: 1, status: 1 });
ServiceSchema.index({ barberId: 1, type: 1, status: 1 });
ServiceSchema.index({ category: 1, type: 1, status: 1 });
ServiceSchema.index({ status: 1 });

module.exports = mongoose.model('Service', ServiceSchema);