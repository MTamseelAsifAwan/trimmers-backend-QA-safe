// src/api/admin/controllers/locationController.js - Updated to use LocationService
const locationService = require('../../../services/locationService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all countries
 * @route GET /api/admin/locations/countries
 * @access Private/Admin
 */
const getCountries = async (req, res, next) => {
    try {
        const { isActive, includeCities, includeAreas } = req.query;
        
        // Convert string query params to appropriate types
        const options = {
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            includeCities: includeCities !== undefined ? includeCities === 'true' : false,
            includeAreas: includeAreas !== undefined ? includeAreas === 'true' : false
        };
        
        const countries = await locationService.getAllCountries(options);
        
        res.status(200).json({
            success: true,
            data: countries
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get country by ID
 * @route GET /api/admin/locations/countries/:countryId
 * @access Private/Admin
 */
const getCountryById = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        const { includeCities, includeAreas } = req.query;
        
        // Convert string query params to appropriate types
        const options = {
            includeCities: includeCities !== undefined ? includeCities === 'true' : true,
            includeAreas: includeAreas !== undefined ? includeAreas === 'true' : false
        };
        
        const country = await locationService.getCountryById(countryId, options);
        
        res.status(200).json({
            success: true,
            data: country
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new country
 * @route POST /api/admin/locations/countries
 * @access Private/Admin
 */
const createCountry = async (req, res, next) => {
    try {
        const { 
            name, 
            code, 
            timeZone, 
            currency, 
            phoneCode, 
            languageCode,
            flagUrl,
            isActive 
        } = req.body;
        
        if (!name || !code) {
            throw new ApiError('Country name and code are required', 400);
        }
        
        const countryData = {
            name,
            code,
            timeZone: timeZone || 'UTC',
            currency: currency || { code: 'USD', symbol: '$' },
            phoneCode: phoneCode || '',
            languageCode: languageCode || 'en',
            flagUrl: flagUrl || null,
            isActive: isActive !== undefined ? isActive : true
        };
        
        const country = await locationService.createCountry(countryData);
        
        res.status(201).json({
            success: true,
            message: 'Country created successfully',
            data: country
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update country
 * @route PUT /api/admin/locations/countries/:countryId
 * @access Private/Admin
 */
const updateCountry = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        const { 
            name, 
            code, 
            timeZone, 
            currency, 
            phoneCode, 
            languageCode,
            flagUrl,
            isActive 
        } = req.body;
        
        const countryData = {};
        
        if (name !== undefined) countryData.name = name;
        if (code !== undefined) countryData.code = code;
        if (timeZone !== undefined) countryData.timeZone = timeZone;
        if (phoneCode !== undefined) countryData.phoneCode = phoneCode;
        if (languageCode !== undefined) countryData.languageCode = languageCode;
        if (flagUrl !== undefined) countryData.flagUrl = flagUrl;
        if (isActive !== undefined) countryData.isActive = isActive;
        if (currency !== undefined) countryData.currency = currency;
        
        const updatedCountry = await locationService.updateCountry(countryId, countryData);
        
        res.status(200).json({
            success: true,
            message: 'Country updated successfully',
            data: updatedCountry
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete country
 * @route DELETE /api/admin/locations/countries/:countryId
 * @access Private/Admin
 */
const deleteCountry = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        
        await locationService.deleteCountry(countryId);
        
        res.status(200).json({
            success: true,
            message: 'Country deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get cities by country
 * @route GET /api/admin/locations/countries/:countryId/cities
 * @access Private/Admin
 */
const getCitiesByCountry = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        const { isActive, includeAreas } = req.query;
        
        // Convert string query params to appropriate types
        const options = {
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            includeAreas: includeAreas !== undefined ? includeAreas === 'true' : false
        };
        
        const cities = await locationService.getCitiesByCountry(countryId, options);
        
        res.status(200).json({
            success: true,
            data: cities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new city
 * @route POST /api/admin/locations/countries/:countryId/cities
 * @access Private/Admin
 */
const createCity = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        const { name, code, isActive, description } = req.body;
        console.log({ countryId, name, code, isActive, description });
        if (!name || !code) {
            throw new ApiError('City name and code are required', 400);
        }
        
        const cityData = {
            name,
            code,
            isActive: isActive !== undefined ? isActive : true,
            description: description || ''
        };
        
        const result = await locationService.createCity(countryId, cityData);
        
        res.status(201).json({
            success: true,
            message: 'City created successfully',
            data: result.city
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update city
 * @route PUT /api/admin/locations/cities/:cityId
 * @access Private/Admin
 */
const updateCity = async (req, res, next) => {
    try {
        const { cityId } = req.params;
        const { name, code, isActive, description } = req.body;
        
        const cityData = {};
        
        if (name !== undefined) cityData.name = name;
        if (code !== undefined) cityData.code = code;
        if (description !== undefined) cityData.description = description;
        if (isActive !== undefined) cityData.isActive = isActive;
        
        const result = await locationService.updateCity(cityId, cityData);
        
        res.status(200).json({
            success: true,
            message: 'City updated successfully',
            data: result.city
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete city
 * @route DELETE /api/admin/locations/cities/:cityId
 * @access Private/Admin
 */
const deleteCity = async (req, res, next) => {
    try {
        const { cityId } = req.params;
        
        await locationService.deleteCity(cityId);
        
        res.status(200).json({
            success: true,
            message: 'City deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get areas by city
 * @route GET /api/admin/locations/cities/:cityId/areas
 * @access Private/Admin
 */
const getAreasByCity = async (req, res, next) => {
    try {
        const { cityId } = req.params;
        const { isActive, includeCity, includeCountry } = req.query;
        
        // Convert string query params to appropriate types
        const options = {
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            includeCity: includeCity !== undefined ? includeCity === 'true' : false,
            includeCountry: includeCountry !== undefined ? includeCountry === 'true' : false
        };
        
        const result = await locationService.getAreasByCity(cityId, options);
        
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new area
 * @route POST /api/admin/locations/cities/:cityId/areas
 * @access Private/Admin
 */
const createArea = async (req, res, next) => {
    try {
        const { cityId } = req.params;
        const { name, code, isActive, description } = req.body;
        
        if (!name || !code) {
            throw new ApiError('Area name and code are required', 400);
        }
        
        const areaData = {
            name,
            code,
            isActive: isActive !== undefined ? isActive : true,
            description: description || ''
        };
        
        const result = await locationService.createArea(cityId, areaData);
        
        res.status(201).json({
            success: true,
            message: 'Area created successfully',
            data: result.area
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update area
 * @route PUT /api/admin/locations/areas/:areaId
 * @access Private/Admin
 */
const updateArea = async (req, res, next) => {
    try {
        const { areaId } = req.params;
        const { name, code, isActive, description } = req.body;
        
        const areaData = {};
        
        if (name !== undefined) areaData.name = name;
        if (code !== undefined) areaData.code = code;
        if (description !== undefined) areaData.description = description;
        if (isActive !== undefined) areaData.isActive = isActive;
        
        const result = await locationService.updateArea(areaId, areaData);
        
        res.status(200).json({
            success: true,
            message: 'Area updated successfully',
            data: result.area
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete area
 * @route DELETE /api/admin/locations/areas/:areaId
 * @access Private/Admin
 */
const deleteArea = async (req, res, next) => {
    try {
        const { areaId } = req.params;
        
        await locationService.deleteArea(areaId);
        
        res.status(200).json({
            success: true,
            message: 'Area deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCountries,
    getCountryById,
    createCountry,
    updateCountry,
    deleteCountry,
    getCitiesByCountry,
    createCity,
    updateCity,
    deleteCity,
    getAreasByCity,
    createArea,
    updateArea,
    deleteArea
};