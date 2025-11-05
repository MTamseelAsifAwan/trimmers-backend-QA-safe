const Barber = require('../models/Barber');
const Freelancer = require('../models/Freelancer');
const Shop = require('../models/Shop');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const moment = require('moment');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Get available time slots for a barber/freelancer on a given date
 * @param {string} providerId - Provider ID
 * @param {string} providerType - Type of provider ('barber' or 'freelancer')
 * @param {Date} date - Date to check availability for
 * @param {string} serviceId - Service ID for getting duration
 * @returns {Promise<Array>} - List of available time slots
 */
const getProviderTimeSlots = async (providerId, providerType, date, serviceId) => {
    try {
        // Find provider
        let provider;
        if (providerType === 'barber') {
            provider = await Barber.findById(providerId);
        } else if (providerType === 'freelancer') {
            provider = await Freelancer.findById(providerId);
        }

        if (!provider) {
            throw new ApiError('Provider not found', 404);
        }

        // Get service for duration
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new ApiError('Service not found', 404);
        }

        const serviceDuration = service.duration || 30;
        const dayOfWeek = moment(date).format('dddd').toLowerCase();

        // Support both array and object schedule formats
        let scheduleForDay = null;
        if (Array.isArray(provider.schedule)) {
            const dayIndex = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(dayOfWeek);
            if (dayIndex !== -1 && provider.schedule[dayIndex]) {
                scheduleForDay = provider.schedule[dayIndex];
            }
        } else if (provider.schedule && typeof provider.schedule === 'object') {
            scheduleForDay = provider.schedule[dayOfWeek];
        }

        if (!scheduleForDay || scheduleForDay.status !== 'available' || !scheduleForDay.from || !scheduleForDay.to) {
            return [];
        }

        const [fromHour, fromMinute] = scheduleForDay.from.split(':').map(Number);
        const [toHour, toMinute] = scheduleForDay.to.split(':').map(Number);
        const startMinutes = fromHour * 60 + fromMinute;
        const endMinutes = toHour * 60 + toMinute;

        // Get all bookings for this provider on the selected date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await Booking.find({
            [`${providerType}Id`]: providerId,
            bookingDate: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['pending', 'confirmed'] }
        });

        const slots = [];
        for (let m = startMinutes; m + serviceDuration <= endMinutes; m += 30) {
            const slotHour = Math.floor(m / 60);
            const slotMinute = m % 60;
            const slotEndMinutes = m + serviceDuration;

            // Check for conflicts
            const conflict = bookings.some(b => {
                const bookingStart = b.bookingTime.hour * 60 + b.bookingTime.minute;
                const bookingEnd = bookingStart + b.duration;
                return m < bookingEnd && slotEndMinutes > bookingStart;
            });

            if (!conflict) {
                slots.push(`${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`);
            }
        }

        return slots;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new Error(`Error getting provider time slots: ${error.message}`);
    }
};

/**
 * Get available slots for all providers (barbers, freelancers, shops) for a given service
 * @param {Array} providers - List of providers
 * @param {string} serviceId - Service ID
 * @returns {Promise<Object>} - Map of provider IDs to their available slots and field names for next 7 days
 */
const getProvidersAvailableSlots = async (providers, serviceId) => {
    try {
        const result = {};
        const days = 7;
        const today = new Date();

        for (const provider of providers) {
            const slots = {};
            const fieldName = 'availableSlots';

            // Get slots for next 7 days
            for (let i = 0; i < days; i++) {
                const date = moment(today).add(i, 'days').toDate();
                const dateString = moment(date).format('YYYY-MM-DD');

                if (provider.providerType === 'shop') {
                    // For shops, use the shop slots service
                    const shopSlotService = require('./bookingService.shopSlots');
                    slots[dateString] = await shopSlotService.getAvailableShopTimeSlots(provider._id, date, serviceId);
                } else {
                    // For barbers and freelancers
                    slots[dateString] = await getProviderTimeSlots(
                        provider._id,
                        provider.providerType,
                        date,
                        serviceId
                    );
                }
            }

            result[provider._id.toString()] = {
                fieldName,
                slots
            };
        }

        return result;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new Error(`Error getting providers available slots: ${error.message}`);
    }
};module.exports = {
    getProviderTimeSlots,
    getProvidersAvailableSlots
};
