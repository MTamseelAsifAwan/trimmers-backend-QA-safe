/**
 * Get available time slots for a shop
 * @param {string} shopId - Shop ID
 * @param {Date} date - Date to check availability for
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} - List of available time slots
 */
const Shop = require('../models/Shop');
const Service = require('../models/Service');
const ApiError = require('../middlewares/errorHandler').ApiError;

const getAvailableShopTimeSlots = async (shopId, date, serviceId) => {
  try {
    // Find shop
    const shop = await Shop.findById(shopId);
    if (!shop) {
      throw new ApiError('Shop not found', 404);
    }
    // Find service
    const service = await Service.findById(serviceId);
    if (!service) {
      throw new ApiError('Service not found', 404);
    }
    const serviceDuration = service.duration || 30;
    // Use shop.openingHours array for schedule
    const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const daySchedule = shop.openingHours && shop.openingHours.find(d => d.day.toLowerCase() === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen) {
      return [];
    }
    const [startHour, startMinute] = daySchedule.openTime.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.closeTime.split(':').map(Number);
    const slotInterval = 30;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const availableSlots = [];
    // Find all bookings for this shop on the given day
    const Booking = require('../models/Booking');
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const bookings = await Booking.find({
      shopId,
      bookingDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    });

    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotInterval) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + serviceDuration;
      if (slotEndMinutes > endMinutes) continue;

      // Check for booking conflicts
      let isAvailable = true;
      for (const booking of bookings) {
        const existingStartMinutes = booking.bookingTime.hour * 60 + booking.bookingTime.minute;
        const existingEndMinutes = existingStartMinutes + booking.duration;
        if (
          (currentMinutes >= existingStartMinutes && currentMinutes < existingEndMinutes) ||
          (slotEndMinutes > existingStartMinutes && slotEndMinutes <= existingEndMinutes) ||
          (currentMinutes <= existingStartMinutes && slotEndMinutes >= existingEndMinutes)
        ) {
          isAvailable = false;
          break;
        }
      }
      if (isAvailable) {
        availableSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    return availableSlots;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(`Error getting shop available time slots: ${error.message}`);
  }
};

module.exports = {
  // ...existing exports...
  getAvailableShopTimeSlots,
};
