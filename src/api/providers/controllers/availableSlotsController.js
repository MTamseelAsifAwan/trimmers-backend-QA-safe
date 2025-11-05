const Booking = require('../../../models/Booking');
const Barber = require('../../../models/Barber');
const Freelancer = require('../../../models/Freelancer');
const ShopOwner = require('../../../models/ShopOwner');
const Shop = require('../../../models/Shop');
const moment = require('moment');

/**
 * Get available time slots for a provider (barber, freelancer, or shop owner) on a given date
 * @route GET /api/providers/:providerId/available-slots?date=YYYY-MM-DD
 * @access Public
 */
const getAvailableSlots = async (req, res, next) => {
    try {
        const { providerId } = req.params;
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }
        const dayOfWeek = moment(date).format('dddd').toLowerCase();

        // Try to find provider in all collections
        let provider = await Barber.findById(providerId);
        let providerType = 'barber';
        let shop = null;

        if (!provider) {
            provider = await Freelancer.findById(providerId);
            providerType = 'freelancer';
        }

        if (!provider) {
            // Check if it's a shop owner
            provider = await ShopOwner.findById(providerId);
            providerType = 'shop_owner';

            if (provider) {
                // For shop owners, get their shop and use shop's schedule
                shop = await Shop.findOne({ ownerId: providerId });
                if (!shop) {
                    return res.status(404).json({ success: false, message: 'Shop not found for this shop owner' });
                }
            }
        }

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        // Get schedule based on provider type
        let scheduleForDay = null;

        if (providerType === 'shop_owner' && shop) {
            // For shop owners, use shop's openingHours
            scheduleForDay = shop.openingHours ? shop.openingHours.find(hour => hour.day.toLowerCase() === dayOfWeek) : null;
        } else {
            // For barbers and freelancers, use their personal schedule
            if (Array.isArray(provider.schedule)) {
                // Assume order: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
                const dayIndex = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].indexOf(dayOfWeek);
                if (dayIndex !== -1 && provider.schedule[dayIndex]) {
                    scheduleForDay = provider.schedule[dayIndex];
                }
            } else if (provider.schedule && typeof provider.schedule === 'object') {
                scheduleForDay = provider.schedule[dayOfWeek];
            }
        }

        if (!scheduleForDay || (providerType === 'shop_owner' ? !scheduleForDay.isOpen : scheduleForDay.status !== 'available') || !scheduleForDay.from || !scheduleForDay.to) {
            return res.status(200).json({ success: true, slots: [] });
        }

        // Parse start and end times (different format for shops vs personal schedules)
        let fromHour, fromMinute, toHour, toMinute;
        if (providerType === 'shop_owner') {
            // Shop format: openTime, closeTime
            [fromHour, fromMinute] = scheduleForDay.openTime.split(':').map(Number);
            [toHour, toMinute] = scheduleForDay.closeTime.split(':').map(Number);
        } else {
            // Personal schedule format: from, to
            [fromHour, fromMinute] = scheduleForDay.from.split(':').map(Number);
            [toHour, toMinute] = scheduleForDay.to.split(':').map(Number);
        }
        const startMinutes = fromHour * 60 + fromMinute;
        const endMinutes = toHour * 60 + toMinute;

        // Get all bookings for this provider on the selected date
        let bookingQuery;
        if (providerType === 'shop_owner') {
            // For shop owners, check bookings against the shop
            bookingQuery = {
                shopId: shop._id,
                bookingDate: new Date(date),
                status: { $in: ['pending', 'confirmed'] }
            };
        } else {
            // For barbers and freelancers, check bookings against the provider
            bookingQuery = {
                [`${providerType}Id`]: provider._id,
                bookingDate: new Date(date),
                status: { $in: ['pending', 'confirmed'] }
            };
        }

        const bookings = await Booking.find(bookingQuery);

        // Build slots in 30-minute increments
        const slots = [];
        for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
            const slotHour = Math.floor(m / 60);
            const slotMinute = m % 60;
            // Check for conflicts
            const conflict = bookings.some(b => {
                const bookingStart = b.bookingTime.hour * 60 + b.bookingTime.minute;
                const bookingEnd = bookingStart + b.duration;
                return m < bookingEnd && m + 30 > bookingStart;
            });
            if (!conflict) {
                slots.push({ hour: slotHour, minute: slotMinute });
            }
        }
        res.status(200).json({ success: true, slots });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAvailableSlots };
