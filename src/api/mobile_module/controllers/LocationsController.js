const locationService = require("../../../services/locationService");



// Get all countries
const getCountries = async (req, res, next) => {
    try {
        const countries = await locationService.getAllCountries();
        res.status(200).json({
            success: true,
            message: 'Countries fetched successfully',
            data: countries
        });
    } catch (error) {
        next(error);
    }
}

// Get Cities by Country
const getCitiesByCountry = async (req, res, next) => {
    try {
        const cities = await locationService.getCitiesByCountry(req.params.countryId);
        res.status(200).json({
            success: true,
            message: 'Cities fetched successfully',
            data: cities
        });
    } catch (error) {
        next(error);
    }
}

// Get Areas by City
const getAreasByCity = async (req, res, next) => {
    try {
        const areas = await locationService.getAreasByCity(req.params.cityId);
        res.status(200).json({
            success: true,
            message: 'Areas fetched successfully',
            data: areas
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCountries,
    getCitiesByCountry,
    getAreasByCity
}
