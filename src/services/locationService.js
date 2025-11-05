// src/services/locationService.js - Backend implementation
const Country = require('../models/Country');
const { ApiError } = require('../middlewares/errorHandler');

/**
 * Service for managing locations
 */
const locationService = {
    /**
     * Get all countries
     * @param {Object} options - Filter options
     * @param {boolean} options.isActive - Filter by active status
     * @param {boolean} options.includeCities - Include cities in response (default: false)
     * @param {boolean} options.includeAreas - Include areas in cities (default: false)
     * @returns {Promise<Array>} List of countries
     */
    getAllCountries: async (options = {}) => {
        const { isActive, includeCities = false, includeAreas = false } = options;

        const filter = {};
        if (isActive !== undefined) {
            filter.isActive = isActive;
        }

        // Base query to get countries
        let query = Country.find(filter).sort({ name: 1 });

        // If cities should not be included, exclude them from the response
        if (!includeCities) {
            query = query.select('-cities');
        }
        // If cities included but areas not, exclude areas
        else if (!includeAreas) {
            query = query.select('-cities.areas');
        }

        return await query;
    },

    /**
     * Get country by ID
     * @param {string} id - Country ID
     * @param {Object} options - Filter options
     * @param {boolean} options.includeCities - Include cities in response (default: true)
     * @param {boolean} options.includeAreas - Include areas in cities (default: false)
     * @returns {Promise<Object>} Country object
     */
    getCountryById: async (id, options = {}) => {
        const { includeCities = true, includeAreas = false } = options;

        let query = Country.findById(id);

        // If cities should not be included, exclude them from the response
        if (!includeCities) {
            query = query.select('-cities');
        }
        // If cities included but areas not, exclude areas
        else if (!includeAreas) {
            query = query.select('-cities.areas');
        }

        const country = await query;

        if (!country) {
            throw new ApiError('Country not found', 404);
        }

        return country;
    },

    /**
     * Get country by code
     * @param {string} code - Country code
     * @param {Object} options - Filter options
     * @param {boolean} options.includeCities - Include cities in response (default: true)
     * @param {boolean} options.includeAreas - Include areas in cities (default: false)
     * @returns {Promise<Object>} Country object
     */
    getCountryByCode: async (code, options = {}) => {
        const { includeCities = true, includeAreas = false } = options;

        let query = Country.findOne({ code: code.toUpperCase() });

        // If cities should not be included, exclude them from the response
        if (!includeCities) {
            query = query.select('-cities');
        }
        // If cities included but areas not, exclude areas
        else if (!includeAreas) {
            query = query.select('-cities.areas');
        }

        return await query;
    },

    /**
     * Create a new country
     * @param {Object} countryData - Country data
     * @returns {Promise<Object>} Created country
     */
    createCountry: async (countryData) => {
        // Validate required fields
        if (!countryData.name || !countryData.code) {
            throw new ApiError('Country name and code are required', 400);
        }

        // Check if country with code already exists
        const existingCountry = await Country.findOne({ code: countryData.code.toUpperCase() });
        if (existingCountry) {
            throw new ApiError(`Country with code ${countryData.code} already exists`, 400);
        }

        // Check if country with name already exists
        const existingCountryName = await Country.findOne({
            name: { $regex: new RegExp(`^${countryData.name}$`, 'i') }
        });
        if (existingCountryName) {
            throw new ApiError(`Country with name ${countryData.name} already exists`, 400);
        }

        // Create country
        const country = await Country.create({
            ...countryData,
            code: countryData.code.toUpperCase(),
            cities: []
        });

        return country;
    },

    /**
     * Update a country
     * @param {string} id - Country ID
     * @param {Object} countryData - Updated country data
     * @returns {Promise<Object>} Updated country
     */
    updateCountry: async (id, countryData) => {
        // Verify country exists
        const country = await Country.findById(id);
        if (!country) {
            throw new ApiError('Country not found', 404);
        }

        // If code is being updated, check if it already exists
        if (countryData.code && countryData.code !== country.code) {
            const existingCountry = await Country.findOne({ code: countryData.code.toUpperCase() });
            if (existingCountry && existingCountry._id.toString() !== id) {
                throw new ApiError(`Country with code ${countryData.code} already exists`, 400);
            }

            // Uppercase the code
            countryData.code = countryData.code.toUpperCase();
        }

        // If name is being updated, check if it already exists
        if (countryData.name && countryData.name !== country.name) {
            const existingCountry = await Country.findOne({
                name: { $regex: new RegExp(`^${countryData.name}$`, 'i') },
                _id: { $ne: id }
            });

            if (existingCountry) {
                throw new ApiError(`Country with name ${countryData.name} already exists`, 400);
            }
        }

        // Update country
        const updatedCountry = await Country.findByIdAndUpdate(
            id,
            { $set: countryData },
            { new: true, runValidators: true }
        );

        return updatedCountry;
    },

    /**
     * Delete a country
     * @param {string} id - Country ID
     * @returns {Promise<void>}
     */
    deleteCountry: async (id) => {
        const country = await Country.findById(id);

        if (!country) {
            throw new ApiError('Country not found', 404);
        }

        await Country.findByIdAndDelete(id);
    },

    /**
     * Get cities by country
     * @param {string} countryId - Country ID
     * @param {Object} options - Filter options
     * @param {boolean} options.isActive - Filter by active status
     * @param {boolean} options.includeAreas - Include areas in response (default: false)
     * @returns {Promise<Array>} List of cities
     */
    getCitiesByCountry: async (countryId, options = {}) => {
        const { isActive, includeAreas = false } = options;

        let query = Country.findById(countryId);


        // If areas should not be included, exclude them from the response
        if (!includeAreas) {
            query = query.select('-cities.areas');
        }

        const country = await query;
        console.log("Country", country);
        if (!country) {
            throw new ApiError('Country not found', 404);
        }

        let cities = country.cities || [];


        return cities;
    },

    /**
     * Get city by ID
     * @param {string} cityId - City ID
     * @param {Object} options - Filter options
     * @param {boolean} options.includeAreas - Include areas in response (default: true)
     * @param {boolean} options.includeCountry - Include country in response (default: true)
     * @returns {Promise<Object>} City object and its country
     */
    getCityById: async (cityId, options = {}) => {
        const { includeAreas = true, includeCountry = true } = options;

        let query = Country.findOne({ 'cities._id': cityId });

        // If areas should not be included, exclude them from the response
        if (!includeAreas) {
            query = query.select('-cities.areas');
        }

        const country = await query;

        if (!country) {
            throw new ApiError('City not found', 404);
        }

        const city = country.cities.find(city => city._id.toString() === cityId);

        if (!city) {
            throw new ApiError('City not found', 404);
        }

        // Return based on includeCountry option
        if (includeCountry) {
            return { city, country };
        } else {
            return { city };
        }
    },

    /**
     * Create a city
     * @param {Object} cityData - City data
     * @param {string} countryId - Country ID
     * @returns {Promise<Object>} Created city and its country
     */
    createCity: async (countryId, cityData) => {
        // Validate required fields
        if (!cityData.name || !cityData.code) {
            throw new ApiError('City name and code are required', 400);
        }

        const country = await Country.findById(countryId);

        if (!country) {
            throw new ApiError('Country not found', 404);
        }

        // Check if city with code already exists in this country
        const existingCity = country.cities.find(
            city => city.code.toLowerCase() === cityData.code.toLowerCase()
        );

        if (existingCity) {
            throw new ApiError(`City with code ${cityData.code} already exists in ${country.name}`, 400);
        }

        // Check if city with name already exists in this country
        const existingCityName = country.cities.find(
            city => city.name.toLowerCase() === cityData.name.toLowerCase()
        );

        if (existingCityName) {
            throw new ApiError(`City with name ${cityData.name} already exists in ${country.name}`, 400);
        }

        // Create city
        const newCity = {
            ...cityData,
            code: cityData.code.toUpperCase(),
            areas: []
        };

        country.cities.push(newCity);
        await country.save();

        // Get the newly created city
        const city = country.cities.find(
            city => city.code.toUpperCase() === cityData.code.toUpperCase()
        );

        return { city, country };
    },

    /**
     * Update a city
     * @param {string} cityId - City ID
     * @param {Object} cityData - Updated city data
     * @returns {Promise<Object>} Updated city and its country
     */
    updateCity: async (cityId, cityData) => {
        const country = await Country.findOne({ 'cities._id': cityId });

        if (!country) {
            throw new ApiError('City not found', 404);
        }

        const cityIndex = country.cities.findIndex(city => city._id.toString() === cityId);

        if (cityIndex === -1) {
            throw new ApiError('City not found', 404);
        }

        const city = country.cities[cityIndex];

        // If code is being updated, check if it already exists
        if (cityData.code && cityData.code !== city.code) {
            const existingCity = country.cities.find(
                c => c.code.toLowerCase() === cityData.code.toLowerCase() && c._id.toString() !== cityId
            );

            if (existingCity) {
                throw new ApiError(
                    `City with code ${cityData.code} already exists in ${country.name}`,
                    400
                );
            }

            // Uppercase the code
            cityData.code = cityData.code.toUpperCase();
        }

        // If name is being updated, check if it already exists
        if (cityData.name && cityData.name !== city.name) {
            const existingCity = country.cities.find(
                c => c.name.toLowerCase() === cityData.name.toLowerCase() && c._id.toString() !== cityId
            );

            if (existingCity) {
                throw new ApiError(
                    `City with name ${cityData.name} already exists in ${country.name}`,
                    400
                );
            }
        }

        // Update the city
        Object.keys(cityData).forEach(key => {
            country.cities[cityIndex][key] = cityData[key];
        });

        await country.save();

        return { city: country.cities[cityIndex], country };
    },

    /**
     * Delete a city
     * @param {string} cityId - City ID
     * @returns {Promise<void>}
     */
    deleteCity: async (cityId) => {
        const country = await Country.findOne({ 'cities._id': cityId });

        if (!country) {
            throw new ApiError('City not found', 404);
        }

        // Remove the city
        country.cities = country.cities.filter(city => city._id.toString() !== cityId);

        await country.save();
    },

    /**
     * Get areas by city
     * @param {string} cityId - City ID
     * @param {Object} options - Filter options
     * @param {boolean} options.isActive - Filter by active status
     * @param {boolean} options.includeCity - Include city in response (default: false)
     * @param {boolean} options.includeCountry - Include country in response (default: false)
     * @returns {Promise<Array>} List of areas
     */
    getAreasByCity: async (cityId, options = {}) => {
        const { isActive, includeCity = false, includeCountry = false } = options;

        const country = await Country.findOne({ 'cities._id': cityId });

        if (!country) {
            throw new ApiError('City not found', 404);
        }

        const city = country.cities.find(city => city._id.toString() === cityId);

        if (!city) {
            throw new ApiError('City not found', 404);
        }

        let areas = city.areas || [];

        // Filter by isActive if specified
        if (isActive !== undefined) {
            areas = areas.filter(area => area.isActive === isActive);
        }

        // Return based on include options
        if (includeCity && includeCountry) {
            return { areas, city, country };
        } else if (includeCity) {
            return { areas, city };
        } else if (includeCountry) {
            return { areas, country };
        } else {
            return areas;
        }
    },

    /**
     * Get area by ID
     * @param {string} areaId - Area ID
     * @param {Object} options - Filter options
     * @param {boolean} options.includeCity - Include city in response (default: true)
     * @param {boolean} options.includeCountry - Include country in response (default: true)
     * @returns {Promise<Object>} Area object, its city and country
     */
    getAreaById: async (areaId, options = {}) => {
        const { includeCity = true, includeCountry = true } = options;

        const country = await Country.findOne({ 'cities.areas._id': areaId });

        if (!country) {
            throw new ApiError('Area not found', 404);
        }

        let city = null;
        let area = null;

        for (const c of country.cities) {
            const a = c.areas.find(a => a._id.toString() === areaId);
            if (a) {
                city = c;
                area = a;
                break;
            }
        }

        if (!city || !area) {
            throw new ApiError('Area not found', 404);
        }

        // Return based on include options
        if (includeCity && includeCountry) {
            return { area, city, country };
        } else if (includeCity) {
            return { area, city };
        } else if (includeCountry) {
            return { area, country };
        } else {
            return { area };
        }
    },

    /**
     * Create an area
     * @param {Object} areaData - Area data
     * @param {string} cityId - City ID
     * @returns {Promise<Object>} Created area, its city and country
     */
    createArea: async (areaData, cityId) => {
        // Validate required fields
        if (!areaData.name || !areaData.code) {
            throw new ApiError('Area name and code are required', 400);
        }

        const country = await Country.findOne({ 'cities._id': cityId });

        if (!country) {
            throw new ApiError('City not found', 404);
        }

        const cityIndex = country.cities.findIndex(city => city._id.toString() === cityId);

        if (cityIndex === -1) {
            throw new ApiError('City not found', 404);
        }

        const city = country.cities[cityIndex];

        // Check if area with code already exists in this city
        const existingArea = city.areas.find(
            area => area.code.toLowerCase() === areaData.code.toLowerCase()
        );

        if (existingArea) {
            throw new ApiError(
                `Area with code ${areaData.code} already exists in ${city.name}`,
                400
            );
        }

        // Check if area with name already exists in this city
        const existingAreaName = city.areas.find(
            area => area.name.toLowerCase() === areaData.name.toLowerCase()
        );

        if (existingAreaName) {
            throw new ApiError(
                `Area with name ${areaData.name} already exists in ${city.name}`,
                400
            );
        }

        // Create area
        const newArea = {
            ...areaData,
            code: areaData.code.toUpperCase()
        };

        country.cities[cityIndex].areas.push(newArea);
        await country.save();

        // Get the newly created area
        const area = country.cities[cityIndex].areas.find(
            area => area.code.toUpperCase() === areaData.code.toUpperCase()
        );

        return { area, city: country.cities[cityIndex], country };
    },

    /**
     * Update an area
     * @param {string} areaId - Area ID
     * @param {Object} areaData - Updated area data
     * @returns {Promise<Object>} Updated area, its city and country
     */
    updateArea: async (areaId, areaData) => {
        const country = await Country.findOne({ 'cities.areas._id': areaId });

        if (!country) {
            throw new ApiError('Area not found', 404);
        }

        let cityIndex = -1;
        let areaIndex = -1;

        // Find the city and area indices
        for (let i = 0; i < country.cities.length; i++) {
            const index = country.cities[i].areas.findIndex(area => area._id.toString() === areaId);
            if (index !== -1) {
                cityIndex = i;
                areaIndex = index;
                break;
            }
        }

        if (cityIndex === -1 || areaIndex === -1) {
            throw new ApiError('Area not found', 404);
        }

        const city = country.cities[cityIndex];
        const area = city.areas[areaIndex];

        // If code is being updated, check if it already exists
        if (areaData.code && areaData.code !== area.code) {
            const existingArea = city.areas.find(
                a => a.code.toLowerCase() === areaData.code.toLowerCase() && a._id.toString() !== areaId
            );

            if (existingArea) {
                throw new ApiError(
                    `Area with code ${areaData.code} already exists in ${city.name}`,
                    400
                );
            }

            // Uppercase the code
            areaData.code = areaData.code.toUpperCase();
        }

        // If name is being updated, check if it already exists
        if (areaData.name && areaData.name !== area.name) {
            const existingArea = city.areas.find(
                a => a.name.toLowerCase() === areaData.name.toLowerCase() && a._id.toString() !== areaId
            );

            if (existingArea) {
                throw new ApiError(
                    `Area with name ${areaData.name} already exists in ${city.name}`,
                    400
                );
            }
        }

        // Update the area
        Object.keys(areaData).forEach(key => {
            country.cities[cityIndex].areas[areaIndex][key] = areaData[key];
        });

        await country.save();

        return {
            area: country.cities[cityIndex].areas[areaIndex],
            city: country.cities[cityIndex],
            country
        };
    },

    /**
     * Delete an area
     * @param {string} areaId - Area ID
     * @returns {Promise<void>}
     */
    deleteArea: async (areaId) => {
        const country = await Country.findOne({ 'cities.areas._id': areaId });

        if (!country) {
            throw new ApiError('Area not found', 404);
        }

        let cityIndex = -1;

        // Find the city containing this area
        for (let i = 0; i < country.cities.length; i++) {
            const index = country.cities[i].areas.findIndex(area => area._id.toString() === areaId);
            if (index !== -1) {
                cityIndex = i;
                break;
            }
        }

        if (cityIndex === -1) {
            throw new ApiError('Area not found', 404);
        }

        // Remove the area
        country.cities[cityIndex].areas = country.cities[cityIndex].areas.filter(
            area => area._id.toString() !== areaId
        );

        await country.save();
    }
};

module.exports = locationService;