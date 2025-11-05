const bookingService = require('./bookingService');
const paymentService = require('./paymentService');
const userService = require('./userService');
const barberService = require('./barberService');
const shopService = require('./shopService');
const locationService = require('./locationService')
class ReportService {
    async generateCountryReport(countryId, options = {}) {
        try {
            const {
                startDate,
                endDate,
                groupBy = 'city',
                format = 'json'
            } = options;

            // Validate date range
            const parsedStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const parsedEndDate = endDate ? new Date(endDate) : new Date();

            // Get country details
            const country = await locationService.getCountryById(countryId);

            // Get all shops in the country
            const shops = await shopService.getShopsByCountry(countryId, { limit: 1000 });

            // Get cities in the country
            const cities = await locationService.getCitiesByCountry(countryId);

            // Group data
            let groupedData = [];

            if (groupBy === 'city') {
                // Group by city
                groupedData = await Promise.all(cities.map(async (city) => {
                    // Get shops in this city
                    const cityShops = shops.shops.filter(shop => shop.cityId && shop.cityId.toString() === city._id.toString());

                    // Get shop IDs
                    const shopIds = cityShops.map(shop => shop._id);

                    // Get bookings for these shops
                    const bookings = await bookingService.getBookingsByShopIds(shopIds, {
                        startDate: parsedStartDate,
                        endDate: parsedEndDate
                    });

                    // Calculate revenue
                    const revenue = bookings.reduce((sum, booking) => sum + booking.price, 0);

                    return {
                        cityId: city._id,
                        cityName: city.name,
                        shopCount: cityShops.length,
                        bookingCount: bookings.length,
                        revenue
                    };
                }));
            }

            // Generate report in requested format
            if (format === 'csv') {
                // Return CSV format
                const json2csv = require('json2csv').parse;
                const csv = json2csv(groupedData);

                return {
                    data: csv,
                    contentType: 'text/csv',
                    filename: `country-report-${country.name}-${new Date().toISOString().split('T')[0]}.csv`
                };
            } else if (format === 'excel') {
                // Return Excel format
                const XLSX = require('xlsx');
                const worksheet = XLSX.utils.json_to_sheet(groupedData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Country Report');

                const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

                return {
                    data: buffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    filename: `country-report-${country.name}-${new Date().toISOString().split('T')[0]}.xlsx`
                };
            } else {
                // Default to JSON
                return {
                    country,
                    dateRange: {
                        startDate: parsedStartDate,
                        endDate: parsedEndDate
                    },
                    data: groupedData
                };
            }
        } catch (error) {
            logger.error(`Generate country report error: ${error.message}`);
        }
    }
}

module.exports = new ReportService();   
