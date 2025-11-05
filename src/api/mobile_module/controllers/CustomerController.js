
const customerService = require("../../../services/customerService");
const shopService = require("../../../services/shopService");
const bookingService = require("../../../services/bookingService");
const notificationService = require("../../../services/notificationService");

const getShopsInSpecificArea = async (req, res, next) => {
    try {
        const shops = await shopService.getShopsByAreaId(req.params.areaId);
        res.status(200).json({
            success: true,
            message: 'Shops fetched successfully',
            data: shops
        });
    } catch (error) {
        next(error);
    }
}

// Fetch appointments for customer
const fetchAppointments = async (req, res, next) => {
    try {
        const appointments = await bookingService.getBookingsByCustomer(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Appointments fetched successfully',
            data: appointments
        });
    } catch (error) {
        next(error);
    }
}

// Book an appointment for a service
const bookAppointment = async (req, res, next) => {
    try {
        const appointment = await bookingService.createBooking(req.body);
        // Send notification to barber
        await notificationService.sendBookingNotification(
            appointment.barberId.toString(),
            appointment,
            'created'
        );
        res.status(200).json({
            success: true,
            message: 'Appointment booked successfully',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
}

// Reschedule appointment
const rescheduleAppointment = async (req, res, next) => {
    try {
        const appointment = await bookingService.rescheduleBooking(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
}

// Cancel appointment
const cancelAppointment = async (req, res, next) => {
    try {
        const appointment = await bookingService.cancelBooking(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: appointment
        });
    } catch (error) {
        next(error);
    }
}

// Add favorite shop
const addFavoriteShop = async (req, res, next) => {
    try {
        const shop = await customerService.addFavoriteShop(req.params.userId, req.params.shopId);
        res.status(200).json({
            success: true,
            message: 'Shop added/removed from favorites successfully',
            data: shop
        });
    } catch (error) {
        next(error);
    }
}

// Remove favorite shop
const removeFavoriteShop = async (req, res, next) => {
    try {
        const shop = await customerService.removeFavoriteShop(req.params.userId, req.params.shopId);
        res.status(200).json({
            success: true,
            message: 'Shop removed from favorites successfully',
            data: shop
        });
    } catch (error) {
        next(error);
    }
}

// Add favorite barber
const addFavoriteBarber = async (req, res, next) => {
    try {
        const barber = await customerService.addFavoriteBarber(req.params.userId, req.params.barberId);
        res.status(200).json({
            success: true,
            message: 'Barber added/removed from favorites successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
}

// Remove favorite barber
const removeFavoriteBarber = async (req, res, next) => {
    try {
        const barber = await customerService.removeFavoriteBarber(req.params.userId, req.params.barberId);
        res.status(200).json({
            success: true,
            message: 'Barber removed from favorites successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getShopsInSpecificArea,
    fetchAppointments,
    bookAppointment,
    rescheduleAppointment,
    cancelAppointment,
    addFavoriteShop,
    removeFavoriteShop,
    addFavoriteBarber,
    removeFavoriteBarber,
}
