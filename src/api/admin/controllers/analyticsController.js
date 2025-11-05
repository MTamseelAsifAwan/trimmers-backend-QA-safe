const barberService = require("../../../services/barberService");
const { countBookings } = require("../../../services/bookingService");
const customerService = require("../../../services/customerService");
const shopService = require("../../../services/shopService");
const freelancerService = require("../../../services/freelancerService");


const getAnalytics = async (req, res, next) => {
    try {
        const barberCount = await barberService.getNumberOfBarbers();
        const shopCount = await shopService.getNumberOfShops();
        const customerCount = await customerService.getNumberOfCustomers();
        const freelancerCount = await freelancerService.getNumberOfFreelancers();
        const totalBookings = await countBookings({ status: { $ne: 'cancelled' } });
        const analytics = {
            totalBarbers: barberCount,
            totalShops: shopCount,
            totalCustomers: customerCount,
            totalFreelancers: freelancerCount,
            totalBookings: totalBookings,
            // You can add more analytics data here as needed
        };

        res.status(200).json({
            success: true,
            data: analytics
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAnalytics
};