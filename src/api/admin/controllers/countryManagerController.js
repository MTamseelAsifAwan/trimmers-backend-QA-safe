// src/api/admin/controllers/countryManagerController.js
const userService = require('../../../services/userService');
const locationService = require('../../../services/locationService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all country managers
 * @route GET /api/admin/country-managers
 * @access Private/Admin
 */
const getCountryManagers = async (req, res, next) => {
    try {
        const { page, limit, search } = req.query;
        
        const options = {
            page,
            limit,
            role: 'country_manager',
            search
        };
        
        const result = await userService.getUsers(options);
        
        res.status(200).json({
            success: true,
            data: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Assign country to manager
 * @route POST /api/admin/country-managers/:userId/assign-country
 * @access Private/Admin
 */
const assignCountryToManager = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { countryId } = req.body;
        
        if (!countryId) {
            throw new ApiError('Country ID is required', 400);
        }
        
        const user = await userService.assignCountryToManager(userId, countryId);
        
        res.status(200).json({
            success: true,
            message: 'Country assigned to manager successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get country stats for a manager
 * @route GET /api/admin/country-managers/countries/:countryId/stats
 * @access Private/CountryManager
 */
const getCountryStatistics = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        
        // Check if user has access to this country
        if (req.user.role === 'country_manager' && 
            (!req.user.countryId || req.user.countryId.toString() !== countryId)) {
            throw new ApiError('You do not have access to this country', 403);
        }
        
        // Get country details
        const country = await locationService.getCountryById(countryId);
        
        // Get cities in the country
        const cities = await locationService.getCitiesByCountry(countryId);
        
        res.status(200).json({
            success: true,
            data: {
                country,
                cities,
                // Additional statistics can be added here
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCountryManagers,
    assignCountryToManager,
    getCountryStatistics
};