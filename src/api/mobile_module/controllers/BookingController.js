
const Booking = require("../../../models/Booking");
const { updateBookingStatus } = require("../../../services/bookingService");

const updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const updatedBooking = await updateBookingStatus(id, status, reason);

        res.status(200).json({
            success: true,
            message: 'Booking status updated successfully',
            data: updatedBooking
        })
    } catch (error) {
        next(error);
    }
}

const removeAllBookings = async (req, res, next) => {
    try {
        await Booking.deleteMany({});

        res.status(200).json({
            success: true,
            message: 'All bookings removed successfully'
        })
    } catch (error) {
        next(error);
    }
}

module.exports = { 
    updateStatus,
    removeAllBookings
 };