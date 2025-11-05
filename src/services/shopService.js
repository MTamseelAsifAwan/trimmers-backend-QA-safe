// src/services/shopService.js
const Shop = require('../models/Shop');
const ShopOwner = require('../models/ShopOwner');
const Barber = require('../models/Barber');
const Service = require('../models/Service');
const {EMPLOYMENT_TYPES} = require('../models/User');
const logger = require('../utils/logger');
const Country = require('../models/Country');
const { convertFileToUrl } = require('../utils/helpers');
const fileUploadService = require('./fileUploadService');
const mongoose = require('mongoose');

/**
 * ShopService provides methods for shop management
 */
class ShopService {
    /**
     * Create a new shop
     * @param {string} ownerId - Shop owner ID
     * @param {Object} shopData - Shop data
     * @returns {Promise<Object>} - Created shop
     */
    async createShop(ownerId, shopData) {
        try {
            // Check if shop owner exists (only if ownerId is provided)
            if (ownerId) {
                const shopOwner = await ShopOwner.findById(ownerId);
                if (!shopOwner) {
                    throw new Error('Shop owner not found');
                }

                // Check if shop owner email is verified
                if (!shopOwner.emailVerified) {
                    throw new Error('Shop owner must be verified to create a shop');
                }
            }

            // Extract fields from nested location structure if present
            const processedData = { ...shopData };
            if (shopData.location) {
                processedData.address = shopData.location.address || shopData.address;
                processedData.latitude = shopData.location.latitude || shopData.latitude;
                processedData.longitude = shopData.location.longitude || shopData.longitude;
                processedData.city = shopData.location.city;
                processedData.state = shopData.location.state;
                processedData.country = shopData.location.country;
                processedData.postalCode = shopData.location.postalCode;
            }

            // Map contact fields
            if (shopData.contactPhone) processedData.phone = shopData.contactPhone;
            if (shopData.contactEmail) processedData.email = shopData.contactEmail;

            // Map business hours to opening hours
            if (shopData.businessHours) {
                processedData.openingHours = shopData.businessHours.map(hour => ({
                    day: this.mapDayNumberToName(hour.day),
                    isOpen: !hour.isClosed,
                    openTime: hour.isClosed ? '00:00' : `${hour.openTime.hour.toString().padStart(2, '0')}:${hour.openTime.minute.toString().padStart(2, '0')}`,
                    closeTime: hour.isClosed ? '00:00' : `${hour.closeTime.hour.toString().padStart(2, '0')}:${hour.closeTime.minute.toString().padStart(2, '0')}`
                }));
            }

            // Map social links to social media
            if (shopData.socialLinks) {
                processedData.socialMedia = shopData.socialLinks;
            }

            // Validate required fields
            if (!processedData.name) {
                throw new Error('Shop name is required');
            }
            if (!processedData.address) {
                throw new Error('Shop address is required');
            }
            if (processedData.latitude === undefined || processedData.longitude === undefined) {
                throw new Error('Shop location coordinates are required');
            }
            if (!processedData.phone) {
                // throw new Error('Shop phone is required');
            }
            if (!processedData.countryId) {
                // throw new Error('Country ID is required');
            }
            // Skip country validation if not provided
            if (processedData.countryId) {
                const country = await Country.findById(processedData.countryId);
                if (!country) {
                    throw new Error('Country not found');
                }
            }

            // Validate services are required
            // if (!processedData.services || !Array.isArray(processedData.services) || processedData.services.length === 0) {
            //     throw new Error('Services are required for shop creation');
            // }

            // Validate services if provided (optional for now)
            if (processedData.services && processedData.services.length > 0) {
                const Service = require('../models/Service');
                try {
                    const validServices = await Service.find({
                        _id: { $in: processedData.services }
                    });

                    if (validServices.length !== processedData.services.length) {
                        // Find which services are invalid
                        const foundIds = validServices.map(s => s._id.toString());
                        const invalidIds = processedData.services.filter(id => !foundIds.includes(id));
                        console.warn(`Warning: Invalid service IDs: ${invalidIds.join(', ')}. These services don't exist in database.`);

                        // Remove invalid services from the list
                        processedData.services = processedData.services.filter(id => foundIds.includes(id));
                        console.log(`Proceeding with valid services only: ${processedData.services.join(', ')}`);
                    }
                } catch (error) {
                    console.warn('Service validation failed, proceeding without services:', error.message);
                    processedData.services = []; // Clear services if validation fails
                }
            }

            // Handle main image upload
            let mainImageUrl = null;
            if (processedData.mainImageBlob) {
                mainImageUrl = await fileUploadService.uploadFile(
                    processedData.mainImageBlob.buffer,
                    processedData.mainImageBlob.originalname,
                    'shops/mainimages'
                );
                logger.info(`Main shop image uploaded: ${mainImageUrl}`);
            }

            // Create shop
            const shop = new Shop({
                name: processedData.name,
                ownerId,
                address: processedData.address,
                latitude: processedData.latitude,
                longitude: processedData.longitude,
                phone: processedData.phone,
                email: processedData.email || '',
                description: processedData.description || '',
                images: processedData.images || [],
                mainImage: mainImageUrl || null,
                mainImageBlob: processedData.mainImageBlob || null,
                openingHours: processedData.openingHours || this.getDefaultOpeningHours(),
                serviceTypes: processedData.serviceTypes || ['shopBased'],
                services: processedData.services || [], // Add services to shop
                isVerified: processedData.isVerified !== undefined ? processedData.isVerified : false, // Use provided value or default to false
                isActive: true,
                amenities: processedData.amenities || [],
                socialMedia: processedData.socialMedia || {},
                countryId: processedData.countryId,
                cityId: processedData.cityId,
                areaId: processedData.areaId
            });

            await shop.save();

            // Update services to reference this shop (optional - for backward compatibility)
            if (shopData.services && shopData.services.length > 0) {
                const Service = require('../models/Service');
                await Service.updateMany(
                    { _id: { $in: shopData.services } },
                    { shopId: shop._id }
                );
            }

            return shop;
        } catch (error) {
            logger.error(`Create shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Map day number to day name
     * @param {number} dayNumber - Day number (0 = Sunday, 1 = Monday, etc.)
     * @returns {string} - Day name
     */
    mapDayNumberToName(dayNumber) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[dayNumber] || 'monday';
    }

    /**
     * Get default opening hours
     * @returns {Array} - Default opening hours for all days
     */
    getDefaultOpeningHours() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        return days.map(day => ({
            day,
            isOpen: day !== 'sunday', // Closed on Sundays by default
            openTime: '09:00',
            closeTime: '18:00'
        }));
    }

    /**
     * Get shop by ID
     * @param {string} id - Shop ID
     * @returns {Promise<Object>} - Shop data
     */
    async getShopById(id) {
        try {
            const shop = await Shop.findById(id).populate('ownerId');

            if (!shop) {
                throw new Error('Shop not found');
            }

            return shop;
        } catch (error) {
            logger.error(`Get shop by ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get shop by UID
     * @param {string} uid - Shop UID
     * @returns {Promise<Object>} - Shop data
     */
    async getShopByUid(uid) {
        try {
            const shop = await Shop.findOne({uid}).populate('ownerId');

            if (!shop) {
                throw new Error('Shop not found');
            }

            return shop;
        } catch (error) {
            logger.error(`Get shop by UID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update shop
     * @param {string} id - Shop ID
     * @param {Object} updateData - Shop data to update
     * @returns {Promise<Object>} - Updated shop
     */
    async updateShop(id, updateData) {
        try {
            const shop = await Shop.findById(id);

            if (!shop) {
                throw new Error('Shop not found');
            }

            // Handle main image upload if provided
            if (updateData.mainImageBlob) {
                try {
                    const mainImageUrl = await fileUploadService.uploadFile(
                        updateData.mainImageBlob.buffer,
                        updateData.mainImageBlob.originalname,
                        'shops/mainimages'
                    );
                    updateData.mainImage = mainImageUrl;
                } catch (uploadError) {
                    logger.error(`Main image upload failed: ${uploadError.message}`);
                    throw new Error('Failed to upload main image');
                }
            }

            // Update basic fields
            if (updateData.name) shop.name = updateData.name;
            if (updateData.address) shop.address = updateData.address;
            if (updateData.latitude !== undefined) shop.latitude = updateData.latitude;
            if (updateData.longitude !== undefined) shop.longitude = updateData.longitude;
            if (updateData.phone) shop.phone = updateData.phone;
            if (updateData.email !== undefined) shop.email = updateData.email;
            if (updateData.description !== undefined) shop.description = updateData.description;
            if (updateData.mainImage !== undefined) shop.mainImage = updateData.mainImage;
            if (updateData.isActive !== undefined) shop.isActive = updateData.isActive;

            // Update arrays
            if (updateData.images && Array.isArray(updateData.images)) {
                shop.images = updateData.images;
            }

            if (updateData.serviceTypes && Array.isArray(updateData.serviceTypes)) {
                // Validate service types
                const validTypes = ['shopBased', 'homeBased'];
                const allValid = updateData.serviceTypes.every(type => validTypes.includes(type));

                if (!allValid) {
                    throw new Error('Invalid service type. Must be one of: shopBased, homeBased');
                }

                shop.serviceTypes = updateData.serviceTypes;
            }

            // Handle services update
            if (updateData.services !== undefined) {
                if (Array.isArray(updateData.services)) {
                    // Validate services if provided
                    if (updateData.services.length > 0) {
                        const Service = require('../models/Service');
                        const validServices = await Service.find({
                            _id: { $in: updateData.services }
                        });
                        
                        if (validServices.length !== updateData.services.length) {
                            throw new Error('One or more service IDs are invalid');
                        }

                        // Update shopId for services being assigned to this shop
                        await Service.updateMany(
                            { _id: { $in: updateData.services } },
                            { $set: { shopId: id } }
                        );
                    }

                    // Update shop's services array
                    shop.services = updateData.services;

                    // Remove services that are no longer in the list from Service model
                    const Service = require('../models/Service');
                    await Service.updateMany(
                        { shopId: id, _id: { $nin: updateData.services } },
                        { shopId: null }
                    );

                    // Assign new services to the shop in Service model
                    if (updateData.services.length > 0) {
                        await Service.updateMany(
                            { _id: { $in: updateData.services } },
                            { shopId: id }
                        );
                    }
                }
            }

            if (updateData.amenities && Array.isArray(updateData.amenities)) {
                shop.amenities = updateData.amenities;
            }

            // Update opening hours
            if (updateData.openingHours && Array.isArray(updateData.openingHours)) {
                // Validate opening hours
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                console.log('[DEBUG] Validating opening hours:', JSON.stringify(updateData.openingHours, null, 2));
                
                let invalidReason = '';
                const allValid = updateData.openingHours.every(hour => {
                    if (!days.includes(hour.day)) {
                        invalidReason = `Invalid day: ${hour.day}`;
                        return false;
                    }
                    if (typeof hour.isOpen !== 'boolean') {
                        invalidReason = `isOpen must be boolean for ${hour.day}, got: ${typeof hour.isOpen}`;
                        return false;
                    }

                    // Time format validation - required for all days
                    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
                    if (!timeRegex.test(hour.openTime)) {
                        invalidReason = `Invalid openTime format for ${hour.day}: ${hour.openTime}`;
                        return false;
                    }
                    if (!timeRegex.test(hour.closeTime)) {
                        invalidReason = `Invalid closeTime format for ${hour.day}: ${hour.closeTime}`;
                        return false;
                    }

                    return true;
                });

                if (!allValid) {
                    console.error('[DEBUG] Opening hours validation failed:', invalidReason);
                    throw new Error(`Invalid opening hours format: ${invalidReason}`);
                }

                shop.openingHours = updateData.openingHours;
            }

            // Update social media
            if (updateData.socialMedia && typeof updateData.socialMedia === 'object') {
                shop.socialMedia = {
                    ...shop.socialMedia,
                    ...updateData.socialMedia
                };
            }

            await shop.save();

            return shop;
        } catch (error) {
            logger.error(`Update shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verify shop (admin only)
     * @param {string} id - Shop ID
     * @param {boolean} isVerified - Verification status
     * @returns {Promise<Object>} - Updated shop
     */
    async verifyShop(id, isVerified) {
        try {
            const shop = await Shop.findById(id);

            if (!shop) {
                throw new Error('Shop not found');
            }

            logger.info(`Verifying shop ${id}: current isVerified=${shop.isVerified}, isActive=${shop.isActive}`);

            shop.isVerified = isVerified;
            if (isVerified) {
                shop.isActive = true; // Activate shop when verified
            }

            await shop.save();

            logger.info(`Shop ${id} verified successfully: isVerified=${shop.isVerified}, isActive=${shop.isActive}`);

            return shop;
        } catch (error) {
            logger.error(`Verify shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete shop
     * @param {string} id - Shop ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteShop(id) {
        try {
            const shop = await Shop.findById(id);

            if (!shop) {
                throw new Error('Shop not found');
            }

            // Find associated barbers and remove their shop association
            const barbers = await Barber.find({shopId: id});
            if (barbers.length > 0) {
                // Update all associated barbers to remove shop association
                await Barber.updateMany(
                    { shopId: id },
                    {
                        shopId: null
                    }
                );
                logger.info(`Removed shop association from ${barbers.length} barbers`);
            }

            // Delete shop
            await Shop.findByIdAndDelete(id);

            return true;
        } catch (error) {
            logger.error(`Delete shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add barber to shop
     * @param {string} shopId - Shop ID
     * @param {string} barberId - Barber ID
     * @returns {Promise<Object>} - Updated barber
     */
    async addBarberToShop(shopId, barberId) {
        try {
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw new Error('Shop not found');
            }

            const barber = await Barber.findById(barberId);
            if (!barber) {
                throw new Error('Barber not found');
            }

            // Update barber with shop association
            barber.shopId = shopId;
            barber.employmentType = EMPLOYMENT_TYPES.EMPLOYED;

            await barber.save();

            return barber;
        } catch (error) {
            logger.error(`Add barber to shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Remove barber from shop
     * @param {string} shopId - Shop ID
     * @param {string} barberId - Barber ID
     * @returns {Promise<Object>} - Updated barber
     */
    async removeBarberFromShop(shopId, barberId) {
        try {
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw new Error('Shop not found');
            }

            const barber = await Barber.findById(barberId);
            if (!barber) {
                throw new Error('Barber not found');
            }

            // Verify barber belongs to this shop
            if (barber.shopId?.toString() !== shopId.toString()) {
                throw new Error('Barber does not belong to this shop');
            }

            // Update barber to freelance
            barber.shopId = null;
            barber.employmentType = EMPLOYMENT_TYPES.FREELANCE;

            await barber.save();

            return barber;
        } catch (error) {
            logger.error(`Remove barber from shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get services offered by a shop
     * @param {string} shopId - Shop ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Services
     */
    async getShopServices(shopId, options = {}) {
        try {
            const {
                status = 'active',
                sortBy = 'createdAt',
                sortOrder = 'desc',
                category
            } = options;

            // First, find the shop and get its services array
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw new ApiError('Shop not found', 404);
            }

            logger.info(`Found shop: ${shop.name} with services: ${JSON.stringify(shop.services)}`);

            if (!shop.services || shop.services.length === 0) {
                logger.info('No services found in shop');
                return [];
            }

            // Build query to get services using the IDs from shop.services
            const query = {
                _id: { $in: shop.services }
            };

            if (category) {
                query.category = category;
            }

            const sort = {[sortBy]: sortOrder === 'asc' ? 1 : -1};

            // Get services data from Service model
            logger.info(`Querying services with: ${JSON.stringify(query)}`);
            const services = await Service.find(query)
                .sort(sort)
                .lean();

            logger.info(`Found ${services.length} services`);
            logger.info(`Service details: ${JSON.stringify(services)}`);

            // Filter services that are either 'active' or 'approved'
            const validStatuses = ['active', 'approved'];
            const filteredServices = status ? 
                services.filter(service => service.status === status) : 
                services.filter(service => validStatuses.includes(service.status));
            
            logger.info(`Filtered services: ${JSON.stringify(filteredServices)}`);
            return filteredServices;
        } catch (error) {
            throw new ApiError(`Failed to get shop services: ${error.message}`, 500);
        }
    }

    /**
     * Get barbers working at shop
     * @param {string} shopId - Shop ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - List of barbers
     */
    async getShopBarbers(shopId, options = {}) {
        try {
            const {
                status = 'active',
                sortBy = 'experience',
                sortOrder = 'desc'
            } = options;

            // Build filter - find barbers linked to this shop
            const filter = {
                shopId,
                status
            };

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            logger.debug('getShopBarbers - Filter:', filter);

            // Get barbers
            const barbers = await Barber.find(filter)
                .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .populate('services')
                .sort(sort);

            logger.debug('getShopBarbers - Query executed, found barbers:', barbers.length);
            if (barbers.length > 0) {
                logger.debug('getShopBarbers - First barber ID:', barbers[0]._id);
            }

            return barbers;
        } catch (error) {
            logger.error(`Get shop barbers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Search shops
     * @param {Object} options - Search options
     * @returns {Promise<Object>} - Paginated search results
     */
    async searchShops(options = {}) {
        try {
            const {
                countryId,
                query = '',
                latitude,
                longitude,
                radius = 10, // in kilometers
                serviceTypes,
                isVerified = true,
                isActive = true,
                page = 1,
                limit = 10,
                sortBy = 'distance',
                sortOrder = 'asc'
            } = options;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build base filter
            const filter = {isActive};

            if (countryId) {
                filter.countryId = countryId;
            }
            if (isVerified !== undefined) {
                filter.isVerified = isVerified;
            }

            // Filter by service types
            if (serviceTypes && serviceTypes.length > 0) {
                filter.serviceTypes = {$in: Array.isArray(serviceTypes) ? serviceTypes : [serviceTypes]};
            }

            // Add text search if query provided
            if (query && query.trim()) {
                filter.$or = [
                    {name: {$regex: query, $options: 'i'}},
                    {address: {$regex: query, $options: 'i'}},
                    {description: {$regex: query, $options: 'i'}},
                    {uid: {$regex: query, $options: 'i'}}
                ];
            }

            // Get shops
            let shops = await Shop.find(filter).populate('ownerId');

            // Calculate distance if coordinates provided
            if (latitude !== undefined && longitude !== undefined) {
                shops = shops.map(shop => {
                    const distance = this.calculateDistance(
                        latitude,
                        longitude,
                        shop.latitude,
                        shop.longitude
                    );

                    return {
                        ...shop.toObject(),
                        distance
                    };
                });

                // Filter by distance if radius provided
                if (radius) {
                    shops = shops.filter(shop => shop.distance <= radius);
                }
            }

            // Calculate total for pagination
            const total = shops.length;

            // Sort results
            if (sortBy === 'distance' && latitude !== undefined && longitude !== undefined) {
                shops.sort((a, b) => {
                    if (sortOrder === 'asc') {
                        return a.distance - b.distance;
                    } else {
                        return b.distance - a.distance;
                    }
                });
            } else {
                // Sort by other fields
                shops.sort((a, b) => {
                    let aValue = a[sortBy];
                    let bValue = b[sortBy];

                    // Handle rating sorting with consideration for review count
                    if (sortBy === 'rating') {
                        // Adjust rating by review count to prioritize shops with more reviews
                        aValue = a.reviewCount > 0 ? a.rating : 0;
                        bValue = b.reviewCount > 0 ? b.rating : 0;
                    }

                    if (sortOrder === 'asc') {
                        return aValue > bValue ? 1 : -1;
                    } else {
                        return aValue < bValue ? 1 : -1;
                    }
                });
            }

            // Apply pagination
            shops = shops.slice(skip, skip + parseInt(limit));

            return {
                shops,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Search shops error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    }

    /**
     * Convert degrees to radians
     * @param {number} deg - Degrees
     * @returns {number} - Radians
     */
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Get all shops (OPTIMIZED)
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of shops
     */
    async getShops(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                isVerified,
                isActive,
                ownerId,
                unassigned,
                search,
                latitude,
                longitude,
                radius = 50
            } = options;

            // Parse and validate pagination parameters
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Cap at 100
            const skip = (pageNum - 1) * limitNum;

            // Build filter object
            const filter = {};

            // Add boolean filters (indexed fields)
            if (isVerified !== undefined) {
                filter.isVerified = isVerified;
            }

            if (isActive !== undefined) {
                filter.isActive = isActive;
            }

            // Add ownerId filter
            if (ownerId) {
                // Convert string ownerId to ObjectId for proper MongoDB comparison
                filter.ownerId = new mongoose.Types.ObjectId(ownerId);
            }

            // Build unassigned filter
            let unassignedFilter = null;
            if (unassigned === 'true') {
                unassignedFilter = {
                    $or: [
                        { ownerId: null },
                        { ownerId: { $exists: false } }
                    ]
                };
            }

            // Add text search filter
            let searchFilter = null;
            if (search && search.trim()) {
                const searchRegex = new RegExp(search.trim(), 'i');
                searchFilter = {
                    $or: [
                        { name: searchRegex },
                        { address: searchRegex },
                        { phone: searchRegex },
                        { email: searchRegex },
                        { uid: searchRegex }
                    ]
                };
            }

            // Combine filters if both exist
            if (unassignedFilter && searchFilter) {
                filter.$and = [unassignedFilter, searchFilter];
            } else if (unassignedFilter) {
                Object.assign(filter, unassignedFilter);
            } else if (searchFilter) {
                Object.assign(filter, searchFilter);
            }

            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // OPTIMIZED: Use aggregation pipeline for all queries
            const pipeline = [
                // Stage 1: Match filters
                { $match: filter },
            ];

            // Add geospatial filtering if coordinates provided
            if (latitude !== undefined && longitude !== undefined) {
                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);
                const radiusInRadians = radius / 6371; // Earth radius in km

                // Add geospatial filter using $geoWithin
                pipeline.push({
                    $addFields: {
                        location: {
                            type: "Point",
                            coordinates: ["$longitude", "$latitude"]
                        }
                    }
                });

                pipeline.push({
                    $match: {
                        location: {
                            $geoWithin: {
                                $centerSphere: [[lng, lat], radiusInRadians]
                            }
                        }
                    }
                });

                // Calculate distance for each shop
                pipeline.push({
                    $addFields: {
                        distance: {
                            $let: {
                                vars: {
                                    earthRadius: 6371,
                                    lat1: { $degreesToRadians: lat },
                                    lng1: { $degreesToRadians: lng },
                                    lat2: { $degreesToRadians: "$latitude" },
                                    lng2: { $degreesToRadians: "$longitude" }
                                },
                                in: {
                                    $multiply: [
                                        "$$earthRadius",
                                        {
                                            $acos: {
                                                $add: [
                                                    {
                                                        $multiply: [
                                                            { $sin: "$$lat1" },
                                                            { $sin: "$$lat2" }
                                                        ]
                                                    },
                                                    {
                                                        $multiply: [
                                                            { $cos: "$$lat1" },
                                                            { $cos: "$$lat2" },
                                                            { $cos: { $subtract: ["$$lng2", "$$lng1"] } }
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                });
            }

            // Stage 2: Use $facet to get both count and data in one query
            pipeline.push({
                $facet: {
                    metadata: [
                        { $count: "total" }
                    ],
                    shops: [
                        { $sort: sort },
                        { $skip: skip },
                        { $limit: limitNum },
                        // Lookup owner data efficiently with full projection
                        {
                            $lookup: {
                                from: 'shopowners',
                                localField: 'ownerId',
                                foreignField: '_id',
                                as: 'ownerData',
                                pipeline: [
                                    {
                                        $project: {
                                            _id: 1,
                                            uid: 1,
                                            userId: 1,
                                            email: 1,
                                            firstName: 1,
                                            lastName: 1,
                                            profile: 1,
                                            addresses: 1,
                                            role: 1,
                                            roleId: 1,
                                            isActive: 1,
                                            status: 1,
                                            emailVerified: 1,
                                            profileImage: 1,
                                            fcmTokens: 1,
                                            emailVerificationToken: 1,
                                            emailVerificationExpiry: 1,
                                            emailOTP: 1,
                                            emailOTPExpire: 1,
                                            resetPasswordToken: 1,
                                            resetPasswordExpiry: 1,
                                            resetPasswordOTP: 1,
                                            resetPasswordOTPExpire: 1,
                                            resetPasswordOTPVerified: 1,
                                            countryId: 1,
                                            accessibleCountries: 1,
                                            accessibleShops: 1,
                                            accessibleCustomers: 1,
                                            permissions: 1,
                                            lastLogin: 1,
                                            businessName: 1,
                                            businessAddress: 1,
                                            businessPhone: 1,
                                            businessEmail: 1,
                                            businessLogo: 1,
                                            businessLogoBlob: 1,
                                            businessRegistrationDoc: 1,
                                            businessRegistrationDocBlob: 1,
                                            taxId: 1,
                                            businessRegistrationNumber: 1,
                                            stripeAccountId: 1,
                                            verificationStatus: 1,
                                            verificationDocuments: 1,
                                            operatingCountries: 1,
                                            createdAt: 1,
                                            updatedAt: 1
                                        }
                                    }
                                ]
                            }
                        },
                        // Unwind owner data
                        {
                            $unwind: {
                                path: '$ownerData',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        // Project all needed fields
                        {
                            $project: {
                                _id: 1,
                                uid: 1,
                                name: 1,
                                ownerId: { $ifNull: ['$ownerData', null] },
                                address: 1,
                                latitude: 1,
                                longitude: 1,
                                phone: 1,
                                email: 1,
                                description: 1,
                                images: 1,
                                mainImage: 1,
                                openingHours: 1,
                                serviceTypes: 1,
                                rating: 1,
                                reviewCount: 1,
                                isVerified: 1,
                                isActive: 1,
                                amenities: 1,
                                socialMedia: 1,
                                countryId: 1,
                                cityId: 1,
                                areaId: 1,
                                verificationStatus: 1,
                                rejectionReason: 1,
                                verifiedBy: 1,
                                verifiedAt: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                distance: 1
                            }
                        }
                    ]
                }
            });

            // Execute aggregation pipeline
            const result = await Shop.aggregate(pipeline).allowDiskUse(true);

            // Extract results
            const total = result[0]?.metadata[0]?.total || 0;
            const shops = result[0]?.shops || [];

            logger.info(`getShops query executed: filter=${JSON.stringify(filter)}, total=${total}, returned=${shops.length}`);

            return {
                shops,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            };
        } catch (error) {
            logger.error(`Get shops error: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }


    /**
     * Retrieves shops filtered by country with pagination, sorting, and search capabilities
     * @async
     * @param {string|ObjectId} countryId - The ID of the country to filter shops by
     * @param {Object} [options={}] - Optional parameters for filtering and pagination
     * @param {number} [options.page=1] - Page number for pagination
     * @param {number} [options.limit=10] - Number of items per page
     * @param {boolean} [options.isVerified=true] - Filter by verification status
     * @param {boolean} [options.isActive=true] - Filter by active status
     * @param {string|ObjectId} [options.ownerId] - Filter shops by owner ID
     * @param {string} [options.search] - Search term for filtering shops by name, address, phone, email, or uid
     * @param {string} [options.sortBy='createdAt'] - Field to sort by
     * @param {string} [options.sortOrder='desc'] - Sort order ('asc' or 'desc')
     * @returns {Promise<Object>} Object containing shops array and pagination details
     * @throws {Error} If there's an error retrieving shops
     */
    async getShopsByCountry(countryId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                isVerified = true,
                isActive = true,
                ownerId,
                search,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build filter
            const filter = {countryId, isActive};

            if (isVerified !== undefined) {
                filter.isVerified = isVerified;
            }

            if (ownerId) {
                filter.ownerId = ownerId;
            }

            if (search) {
                filter.$or = [
                    {name: {$regex: search, $options: 'i'}},
                    {address: {$regex: search, $options: 'i'}},
                    {phone: {$regex: search, $options: 'i'}},
                    {email: {$regex: search, $options: 'i'}},
                    {uid: {$regex: search, $options: 'i'}}
                ];
            }

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Get total count
            const total = await Shop.countDocuments(filter);

            // Get shops
            const shops = await Shop.find(filter)
                .populate('ownerId')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));

            return {
                shops,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get shops by country error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get shops by area id
     * @param {*} areaId 
     * @param {*} options 
     * @returns 
     */
    async getShopsByAreaId (areaId) {
        try {
            const shops = await Shop.find({areaId}).populate('ownerId');
            return shops;
        } catch (error) {
            logger.error(`Get shop by area id error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Count shops with optional filtering
     * @param {Object} filter - Filter criteria
     * @returns {Promise<number>} - Count of shops
     */
    async countShops(filter = {}) {
        try {
            return await Shop.countDocuments(filter);
        } catch (error) {
            logger.error(`Count shops error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get top-rated or most booked shops
     * @param {number} limit - Number of shops to return
     * @returns {Promise<Array>} - List of top shops
     */
    async getTopShops(limit = 10) {
        try {
            // Get shops with highest ratings and at least 5 reviews
            const topShops = await Shop.find({
                isActive: true,
                isVerified: true,
                reviewCount: {$gte: 5}
            })
                .populate('ownerId')
                .sort({rating: -1, reviewCount: -1})
                .limit(parseInt(limit));

            return topShops;
        } catch (error) {
            logger.error(`Get top shops error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get top cities by booking volume in a country
     * @param {string} countryId - Country ID
     * @param {number} limit - Number of cities to return
     * @returns {Promise<Array>} - List of top cities with stats
     */
    async getTopCitiesByCountry(countryId, limit = 5) {
        try {
            // Get all shops in the country
            const shops = await Shop.find({
                countryId,
                isActive: true,
                isVerified: true
            }).select('_id cityId');

            // Group shops by city
            const shopsByCity = {};
            shops.forEach(shop => {
                if (shop.cityId) {
                    const cityId = shop.cityId.toString();
                    if (!shopsByCity[cityId]) {
                        shopsByCity[cityId] = [];
                    }
                    shopsByCity[cityId].push(shop._id);
                }
            });

            // Get cities
            const cityIds = Object.keys(shopsByCity);
            const cities = await City.find({_id: {$in: cityIds}});

            // Calculate bookings and revenue for each city
            const cityStats = await Promise.all(
                cities.map(async city => {
                    const cityShops = shopsByCity[city._id.toString()] || [];

                    // Get bookings for shops in this city
                    const bookings = await Booking.find({
                        shopId: {$in: cityShops},
                        status: {$in: ['completed', 'confirmed']}
                    });

                    // Calculate city stats
                    const totalBookings = bookings.length;
                    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.price, 0);

                    return {
                        _id: city._id,
                        name: city.name,
                        shopCount: cityShops.length,
                        bookingCount: totalBookings,
                        revenue: totalRevenue
                    };
                })
            );

            // Sort by booking count and limit results
            return cityStats
                .sort((a, b) => b.bookingCount - a.bookingCount)
                .slice(0, limit);
        } catch (error) {
            logger.error(`Get top cities by country error: ${error.message}`);
            throw error;
        }
    }

    async getShopBarbers(shopId, options = {}) {
        try {
            const {
                status = 'active',
                sortBy = 'experience',
                sortOrder = 'desc'
            } = options;

            // Build filter - find barbers linked to this shop
            const filter = {
                shopId,
                status
            };

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            logger.debug('getShopBarbers - Filter:', filter);

            // Get barbers
            const barbers = await Barber.find(filter)
                .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .populate('services')
                .sort(sort);

            logger.debug('getShopBarbers - Query executed, found barbers:', barbers.length);
            if (barbers.length > 0) {
                logger.debug('getShopBarbers - First barber ID:', barbers[0]._id);
            }

            return barbers;
        } catch (error) {
            logger.error(`Get shop barbers error: ${error.message}`);
            throw error;
        }
    }

    async getNumberOfShops(filter = {}) {
        try {
            return await Shop.countDocuments(filter);
        } catch (error) {
            logger.error(`Get number of shops error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get service providers for a shop and service
     * @param {string} shopId - Shop ID
     * @param {Object} options - Query options
     * @param {string} options.serviceId - Service ID
     * @param {string} options.serviceType - 'homeBased' or 'shopBased'
     * @returns {Promise<Array>} - Array of service providers
     */
    async getServiceProviders(shopId, options) {
        try {
            const { serviceId, serviceType } = options;
            const Service = require('../models/Service');
            const ShopOwner = require('../models/ShopOwner');

            // For all services, find barbers from this shop and shop owner who offer this service
            const providers = [];

            // Get shop details
            const shop = await Shop.findById(shopId).populate('ownerId');
            if (!shop) {
                throw new Error('Shop not found');
            }

            // Include the shop owner always for services
            if (shop.ownerId) {
                // Check if shop owner also offers this service
                const shopOwnerService = await Service.findOne({
                    _id: serviceId,
                    'offeredBy.providerId': shop.ownerId._id,
                    'offeredBy.providerType': 'Shop'
                }).select('offeredBy').lean();

                const ownerOffering = shopOwnerService?.offeredBy?.find(o => o.providerId.toString() === shop.ownerId._id.toString());

                providers.push({
                    provider: {
                        id: shop.ownerId._id,
                        userId: shop.ownerId.userId || '',
                        uid: shop.ownerId.uid || '',
                        type: 'shopowner',
                        status: shop.ownerId.status || 'active',
                        serviceType: 'shopBased',
                        shopId: shop._id,
                        user: {
                            firstName: shop.ownerId.firstName,
                            lastName: shop.ownerId.lastName,
                            fullName: `${shop.ownerId.firstName} ${shop.ownerId.lastName}`,
                            phone: shop.ownerId.profile?.phoneNumber || ''
                        }
                    },
                    service: {
                        id: serviceId,
                        customPrice: ownerOffering?.customPrice || 0,
                        customDuration: ownerOffering?.customDuration || 30
                    },
                    distance: 0
                });
            }

            // Find barbers working at this shop who offer the service (both homeBased and shopBased)
            const barberQuery = {
                shopId,
                services: serviceId,
                isActive: true,
                status: 'active',
                serviceType: { $in: ['homeBased', 'shopBased', 'both'] }
            };

            const barbers = await Barber.find(barberQuery)
                .select('_id userId uid email firstName lastName profileImage rating reviewCount serviceType status shopId')
                .lean();

            for (const barber of barbers) {
                // Find the service offering for this barber
                const service = await Service.findOne({
                    _id: serviceId,
                    'offeredBy.providerId': barber._id,
                    'offeredBy.providerType': 'Barber'
                }).select('offeredBy').lean();

                const offering = service?.offeredBy?.find(o => o.providerId.toString() === barber._id.toString());

                providers.push({
                    provider: {
                        id: barber._id,
                        userId: barber.userId,
                        uid: barber.uid,
                        type: 'barber',
                        status: barber.status,
                        serviceType: barber.serviceType,
                        shopId: barber.shopId,
                        user: {
                            firstName: barber.firstName,
                            lastName: barber.lastName,
                            fullName: `${barber.firstName} ${barber.lastName}`,
                            phone: barber.profile?.phoneNumber || ''
                        }
                    },
                    service: {
                        id: serviceId,
                        customPrice: offering?.customPrice || 0,
                        customDuration: offering?.customDuration || 30
                    },
                    distance: 0
                });
            }

            return providers;
        } catch (error) {
            logger.error(`Get service providers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - Latitude 1
     * @param {number} lon1 - Longitude 1
     * @param {number} lat2 - Latitude 2
     * @param {number} lon2 - Longitude 2
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees
     * @returns {number} - Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}

module.exports = new ShopService();