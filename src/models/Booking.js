// src/models/Booking.js
const mongoose = require('mongoose');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');

const BookingTimeSchema = new mongoose.Schema({
    hour: {
        type: Number,
        required: true,
        min: 0,
        max: 23
    },
    minute: {
        type: Number,
        required: true,
        min: 0,
        max: 59
    }
});

const BookingAddressSchema = new mongoose.Schema({
    latitude: Number,
    longitude: Number,
    formattedAddress: String
});

const BookingSchema = new mongoose.Schema({
    uid: {
        type: String,
        unique: true,
        default: () => generateModelId(MODEL_PREFIXES.BOOKING),
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    barberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barber',
        required: true
    },
    barberName: {
        type: String,
        required: true
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
        // Not required for home-based services by freelance barbers
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    serviceName: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
        enum: ['shopBased', 'homeBased'],
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    bookingDate: {
        type: Date,
        required: true
    },
    bookingTime: {
        type: BookingTimeSchema,
        required: true
    },
    duration: {
        type: Number,  // in minutes
        required: true,
        min: 5
    },
    status: {
    type: String,
    enum: ['pending',  'reassigned', 'confirmed', 'completed', 'cancelled', 'noShow', 'assigned', 'rejected', 'freelancer_rejected', 'rejected_barber', 'rescheduled'],
    default: 'pending'
    },
    address: BookingAddressSchema, // For home-based services
    notes: {
        type: String,
        default: ''
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending'
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    cancellationReason: {
        type: String,
        default: null
    },
    rejectReason: {
        type: String,
        default: null
    },
    review: {
        type: String,
        default: null
    },
    countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: false
    },
}, {
    timestamps: true
});

// Index to help query bookings for a specific day
BookingSchema.index({ bookingDate: 1 });

// Index to help query bookings by status
BookingSchema.index({ status: 1 });

// Compound index to help query bookings for a specific barber on a specific day
BookingSchema.index({ barberId: 1, bookingDate: 1 });

// Compound index for slot availability queries (optimized)
BookingSchema.index({ barberId: 1, bookingDate: 1, status: 1 });
BookingSchema.index({ shopId: 1, bookingDate: 1, status: 1 });

// Index for customer dashboard queries
BookingSchema.index({ customerId: 1, status: 1 });
BookingSchema.index({ customerId: 1, bookingDate: 1 });

// Helper method to check for time conflicts
BookingSchema.statics.checkForConflicts = async function (barberId, date, startTime, duration) {
    const bookings = await this.find({
        barberId,
        bookingDate: date,
        status: { $in: ['pending', 'confirmed'] }
    });

    // Convert startTime to minutes since midnight for easier comparison
    const startTimeMinutes = startTime.hour * 60 + startTime.minute;
    const endTimeMinutes = startTimeMinutes + duration;

    return bookings.some(booking => {
        const bookingStartMinutes = booking.bookingTime.hour * 60 + booking.bookingTime.minute;
        const bookingEndMinutes = bookingStartMinutes + booking.duration;

        // Check for overlap
        return (
            (startTimeMinutes >= bookingStartMinutes && startTimeMinutes < bookingEndMinutes) ||
            (endTimeMinutes > bookingStartMinutes && endTimeMinutes <= bookingEndMinutes) ||
            (startTimeMinutes <= bookingStartMinutes && endTimeMinutes >= bookingEndMinutes)
        );
    });
};

module.exports = mongoose.model('Booking', BookingSchema);