// src/services/serviceService.js
const Service = require('../models/Service');
const Shop = require('../models/Shop');
const Barber = require('../models/Barber');
const Freelancer = require('../models/Freelancer');
const { ApiError } = require('../middlewares/errorHandler');
const { calculateDistance } = require('../utils/helpers');
const mongoose = require('mongoose');

/**
 * Create a new service
 * @param {Object} serviceData - Service data
 * @param {Object} creator - Creator context (shopId or barberId)
 * @returns {Promise<Object>} Created service
 */
const createService = async (serviceData, creator) => {
    try {
        // Ensure either shopId or barberId is provided
        if (!creator.shopId && !creator.barberId) {
            throw new ApiError('Service must be associated with a shop or barber', 400);
        }

        // Validate icon data structure
        if (!serviceData.icon || typeof serviceData.icon !== 'object') {
            throw new ApiError('Service icon is required and must be an object', 400);
        }

        // Validate type matches enum values
        if (!['shopBased', 'homeBased'].includes(serviceData.type)) {
            throw new ApiError('Service type must be either shopBased or homeBased', 400);
        }

        // Validate duration
        if (serviceData.duration <= 0 || serviceData.duration > 240) {
            throw new ApiError('Duration must be between 1 and 240 minutes', 400);
        }

        // Validate title
        if (serviceData.title.length < 3) {
            throw new ApiError('Title must be at least 3 characters', 400);
        }

        // Validate description
        if (serviceData.description.length < 10) {
            throw new ApiError('Description must be at least 10 characters', 400);
        }

        // If creator is barber, validate service type based on employment type
        if (creator.barberId) {
            const barber = await Barber.findById(creator.barberId);

            if (!barber) {
                throw new ApiError('Barber not found', 404);
            }

            // If barber is employed by a shop, ensure service type is valid
            if (barber.shopId && serviceData.type === 'homeBased') {
                throw new ApiError('Shop-employed barbers can only create shop-based services', 400);
            }

            // Set countryId from barber's profile
            serviceData.countryId = barber.countryId;
        }

        // If creator is shop, validate and set countryId
        if (creator.shopId) {
            const shop = await Shop.findById(creator.shopId);

            if (!shop) {
                throw new ApiError('Shop not found', 404);
            }

            // Validate service type based on shop's serviceTypes
            if (!shop.serviceTypes.includes(serviceData.type)) {
                throw new ApiError(`Shop does not support ${serviceData.type} services`, 400);
            }

            // Set countryId from shop's profile
            serviceData.countryId = shop.countryId;
        }

        // Validate price based on service type
        if (serviceData.type === 'homeBased' && serviceData.price < 50) {
            throw new ApiError('Home-based service price must be at least 50', 400);
        }

        // Set initial status to pending for approval
        if (!serviceData.status) {
            serviceData.status = 'pending';
        }

        // Initialize offeredBy array if not provided
        if (!serviceData.offeredBy) {
            serviceData.offeredBy = [];
        }

        // Add creator to offeredBy array
        if (creator.shopId) {
            serviceData.offeredBy.push({
                providerId: creator.shopId,
                providerType: 'Shop',
                customPrice: serviceData.price,
                customDuration: serviceData.duration
            });
        } else if (creator.barberId) {
            serviceData.offeredBy.push({
                providerId: creator.barberId,
                providerType: 'Barber',
                customPrice: serviceData.price,
                customDuration: serviceData.duration
            });
        }

        // Remove direct assignments to maintain backward compatibility if needed
        // if (creator.shopId) serviceData.shopId = creator.shopId;
        // if (creator.barberId) serviceData.barberId = creator.barberId;

        // Create the service
        const service = new Service(serviceData);
        await service.save();

        return service;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to create service: ${error.message}`, 500);
    }
};

/**
 * Get service by ID
 * @param {string} id - Service ID
 * @returns {Promise<Object>} Service
 */
const getServiceById = async (id) => {
    try {
        const service = await Service.findById(id)
            .populate('offeredBy.providerId', 'name uid specialization')
            .populate('countryId', 'name code');

        if (!service) {
            throw new ApiError('Service not found', 404);
        }

        return service;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to get service: ${error.message}`, 500);
    }
};


/**
 * Get services by shop ID with options
 * @param {string} shopId - Shop ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Services
 */
const getServicesByShop = async (shopId, options = {}) => {
    try {
        const {
            status,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        const query = {
            'offeredBy.providerId': shopId,
            'offeredBy.providerType': 'Shop'
        };

        if (status) {
            query.status = status;
        }

        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const services = await Service.find(query)
            .sort(sort)
            .populate('offeredBy.providerId', 'name uid specialization')
            .populate('countryId', 'name code');

        return services;
    } catch (error) {
        throw new ApiError(`Failed to get services by shop: ${error.message}`, 500);
    }
};

/**
 * Get service by UID
 * @param {string} uid - Service UID
 * @returns {Promise<Object>} Service
 */
const getServiceByUid = async (uid) => {
    try {
        const service = await Service.findOne({ uid })
            .populate('offeredBy.providerId', 'name uid specialization')
            .populate('countryId', 'name code');

        if (!service) {
            throw new ApiError('Service not found', 404);
        }

        return service;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to get service: ${error.message}`, 500);
    }
};

/**
 * Update service by ID
 * @param {string} id - Service ID
 * @param {Object} updateData - Service update data
 * @param {boolean} isResubmission - Whether this is a resubmission of rejected service
 * @returns {Promise<Object>} Updated service
 */
const updateService = async (id, updateData, isResubmission = false) => {
    try {
        // Get existing service
        const service = await getServiceById(id);

        // Handle resubmission logic
        if (isResubmission || service.status === 'rejected') {
            updateData.status = 'pending';
            updateData.rejectionReason = null;
        }

        // Don't allow updating shopId or barberId
        delete updateData.shopId;
        delete updateData.barberId;
        delete updateData.countryId;

        // Validate type if provided
        if (updateData.type && !['shopBased', 'homeBased'].includes(updateData.type)) {
            throw new ApiError('Service type must be either shopBased or homeBased', 400);
        }

        // Validate price based on service type
        const type = updateData.type || service.type;
        const price = updateData.price !== undefined ? updateData.price : service.price;

        if (type === 'homeBased' && price < 50) {
            throw new ApiError('Home-based service price must be at least 50', 400);
        }

        // Validate duration if provided
        if (updateData.duration && (updateData.duration <= 0 || updateData.duration > 240)) {
            throw new ApiError('Duration must be between 1 and 240 minutes', 400);
        }

        // Validate title if provided
        if (updateData.title && updateData.title.length < 3) {
            throw new ApiError('Title must be at least 3 characters', 400);
        }

        // Validate description if provided
        if (updateData.description && updateData.description.length < 10) {
            throw new ApiError('Description must be at least 10 characters', 400);
        }

        // Update service
        const updatedService = await Service.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return updatedService;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to update service: ${error.message}`, 500);
    }
};

/**
 * Delete service by ID
 * @param {string} id - Service ID
 * @returns {Promise<boolean>} Success indicator
 */
const deleteService = async (id) => {
    try {
        const result = await Service.findByIdAndDelete(id);
        return !!result;
    } catch (error) {
        throw new ApiError(`Failed to delete service: ${error.message}`, 500);
    }
};

/**
 * Approve or reject service by ID (admin only)
 * @param {string} id - Service ID
 * @param {string} status - New status ('active' or 'rejected')
 * @param {string} rejectionReason - Reason for rejection (required if rejected)
 * @returns {Promise<Object>} Updated service
 */
const approveRejectService = async (id, status, rejectionReason) => {
    try {
        const service = await getServiceById(id);

        const updateData = { status };

        if (status === 'rejected') {
            if (!rejectionReason) {
                throw new ApiError('Rejection reason is required', 400);
            }
            updateData.rejectionReason = rejectionReason;
        } else {
            updateData.rejectionReason = null;
        }

        const updatedService = await Service.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return updatedService;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to approve/reject service: ${error.message}`, 500);
    }
};

/**
 * Get services by barber ID
 * @param {string} barberId - Barber ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Services
 */
const getServicesByBarber = async (barberId, options = {}) => {
    try {
        const {
            category,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        const query = {
            'offeredBy.providerId': barberId,
            'offeredBy.providerType': 'Barber',
            status: 'active'
        };

        if (category) {
            query.category = category;
        }

        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const services = await Service.find(query)
            .sort(sort)
            .populate('offeredBy.providerId', 'name uid specialization')
            .populate('countryId', 'name code');

        return services;
    } catch (error) {
        throw new ApiError(`Failed to get barber services: ${error.message}`, 500);
    }
};

/**
 * Get service categories
 * @returns {Promise<Array>} Categories
 */
const getServiceCategories = async () => {
    try {
        const categories = await Service.distinct('category');
        return categories;
    } catch (error) {
        throw new ApiError(`Failed to get service categories: ${error.message}`, 500);
    }
};

/**
 * Search services with various filters
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Services and pagination
 */
const searchServices = async (options = {}) => {
    try {
        const {
            query,
            type,
            category,
            minPrice,
            maxPrice,
            shopId,
            barberId,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            lat,
            long
        } = options;

        const searchQuery = {
            status: 'active'
        };

        if (query) {
            searchQuery.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }

        if (type) searchQuery.type = type;
        if (category) searchQuery.category = category;
        if (shopId) {
            searchQuery['offeredBy.providerId'] = shopId;
            searchQuery['offeredBy.providerType'] = 'Shop';
        }
        if (barberId) {
            searchQuery['offeredBy.providerId'] = barberId;
            searchQuery['offeredBy.providerType'] = 'Barber';
        }

        if (minPrice !== undefined) {
            searchQuery.price = { $gte: parseFloat(minPrice) };
        }

        if (maxPrice !== undefined) {
            if (searchQuery.price) {
                searchQuery.price.$lte = parseFloat(maxPrice);
            } else {
                searchQuery.price = { $lte: parseFloat(maxPrice) };
            }
        }

        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // First, get services without location filtering
        let servicesQuery = Service.find(searchQuery)
            .sort(sort)
            .populate('offeredBy.providerId', 'name uid specialization latitude longitude location')
            .populate('countryId', 'name code');

        // If location is provided, we need to get all services first and filter by distance
        let allServices = [];
        if (lat && long) {
            // Get all services matching criteria (without pagination)
            allServices = await servicesQuery;

            // Filter services by distance (50km radius)
            const customerLat = parseFloat(lat);
            const customerLong = parseFloat(long);

            allServices = allServices.filter(service => {
                // Check if any provider is within 50km
                return service.offeredBy.some(offer => {
                    let providerLat, providerLong;

                    if (offer.providerType === 'Shop') {
                        // For shops, use shop's latitude/longitude
                        providerLat = offer.providerId?.latitude;
                        providerLong = offer.providerId?.longitude;
                    } else if (offer.providerType === 'barber') {
                        // For barbers, use barber's location
                        if (offer.providerId?.location) {
                            providerLat = offer.providerId.location.latitude;
                            providerLong = offer.providerId.location.longitude;
                        }
                    }

                    // If we have coordinates, calculate distance
                    if (providerLat && providerLong) {
                        const distance = calculateDistance(
                            customerLat, customerLong,
                            providerLat, providerLong
                        );
                        return distance <= 50; // 50km radius
                    }

                    return false; // No location data available
                });
            });

            // Apply pagination after filtering
            const totalFiltered = allServices.length;
            const startIndex = skip;
            const endIndex = startIndex + parseInt(limit);
            allServices = allServices.slice(startIndex, endIndex);

            const pagination = {
                total: totalFiltered,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalFiltered / parseInt(limit))
            };

            return { services: allServices, pagination };
        } else {
            // No location filtering, use normal pagination
            const [services, total] = await Promise.all([
                servicesQuery.skip(skip).limit(parseInt(limit)),
                Service.countDocuments(searchQuery)
            ]);

            const pagination = {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            };

            return { services, pagination };
        }
    } catch (error) {
        throw new ApiError(`Failed to search services: ${error.message}`, 500);
    }
};

/**
 * Get all services with pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Services and pagination info
 */
const getAllServices = async (options = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            type,
            category,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            lat,
            long,
            shopId
        } = options;

        const query = {};

        if (status) query.status = status;
        if (type) query.type = type;
        if (category) query.category = category;
        if (shopId) {
            query.$or = [
                { shopId: shopId },
                { 'offeredBy.providerId': shopId, 'offeredBy.providerType': 'Shop' }
            ];
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // First, get services without location filtering
        let servicesQuery = Service.find(query)
            .sort(sort)
            .populate('offeredBy.providerId', 'name uid specialization latitude longitude location')
            .populate('countryId', 'name code');

        // If location is provided, use nearby services logic
        let allServices = [];
        if (lat && long) {
            const services = [];
            const serviceIds = new Set();

            console.log('Finding nearby services for location:', lat, long);

            // 1. Find nearby freelancers and their services
            const freelancers = await Freelancer.find({
                status: 'active',
                'location.latitude': { $exists: true },
                'location.longitude': { $exists: true }
            })
            .select('uid firstName lastName profile services location status serviceType');

            console.log('Total freelancers found:', freelancers.length);

            for (const freelancer of freelancers) {
                if (freelancer.location && freelancer.location.latitude && freelancer.location.longitude) {
                    const distance = calculateDistance(lat, long, freelancer.location.latitude, freelancer.location.longitude);

                    if (distance <= 50) {
                        console.log('Freelancer within range:', freelancer.uid, 'Distance:', distance);
                        console.log('Freelancer services:', freelancer.services);

                        // Get services offered by this freelancer
                        for (const serviceId of freelancer.services) {
                            console.log('Processing service ID:', serviceId);
                            if (!serviceIds.has(serviceId.toString())) {
                                serviceIds.add(serviceId.toString());

                                const service = await Service.findById(serviceId)
                                    .populate('category', 'name uid')
                                    .select('uid title description price duration type icon category status');

                                console.log('Service found:', service ? service.title : 'null', 'Status:', service ? service.status : 'N/A');

                                if (service && (service.status === 'approved' || service.status === 'pending')) {
                                    services.push({
                                        ...service.toObject(),
                                        provider: {
                                            id: freelancer._id,
                                            uid: freelancer.uid,
                                            type: 'freelancer',
                                            name: `${freelancer.firstName} ${freelancer.lastName}`,
                                            phone: freelancer.profile?.phoneNumber,
                                            distance: Math.round(distance * 10) / 10,
                                            location: freelancer.location
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // 2. Find nearby barbers and their services
            const barbers = await Barber.find({
                status: 'active'
            })
            .populate('shopId', 'name uid latitude longitude address')
            .select('uid firstName lastName profile shopId services location status serviceType employmentType');

            console.log('Total barbers found:', barbers.length);

            for (const barber of barbers) {
                let providerLat, providerLong, providerLocation;

                // Determine location based on service type and employment type
                if (barber.serviceType === 'homeBased' || barber.employmentType === 'freelance') {
                    if (barber.location && barber.location.latitude && barber.location.longitude) {
                        providerLat = barber.location.latitude;
                        providerLong = barber.location.longitude;
                        providerLocation = barber.location;
                    }
                } else if (barber.employmentType === 'employed' && barber.shopId) {
                    if (barber.shopId.latitude && barber.shopId.longitude) {
                        providerLat = barber.shopId.latitude;
                        providerLong = barber.shopId.longitude;
                        providerLocation = {
                            latitude: barber.shopId.latitude,
                            longitude: barber.shopId.longitude,
                            formattedAddress: barber.shopId.address
                        };
                    }
                }

                if (providerLat && providerLong) {
                    const distance = calculateDistance(lat, long, providerLat, providerLong);

                    if (distance <= 50) {
                        console.log('Barber within range:', barber.uid, 'Distance:', distance);
                        console.log('Barber services:', barber.services);

                        // Get services offered by this barber
                        for (const serviceId of barber.services) {
                            console.log('Processing barber service ID:', serviceId);
                            if (!serviceIds.has(serviceId.toString())) {
                                serviceIds.add(serviceId.toString());

                                const service = await Service.findById(serviceId)
                                    .populate('category', 'name uid')
                                    .select('uid title description price duration type icon category status');

                                console.log('Barber service found:', service ? service.title : 'null', 'Status:', service ? service.status : 'N/A');

                                if (service && (service.status === 'approved' || service.status === 'pending')) {
                                    const providerName = barber.employmentType === 'employed' && barber.shopId
                                        ? barber.shopId.name
                                        : `${barber.firstName} ${barber.lastName}`;

                                    services.push({
                                        ...service.toObject(),
                                        provider: {
                                            id: barber._id,
                                            uid: barber.uid,
                                            type: barber.employmentType === 'employed' ? 'shop_barber' : 'freelance_barber',
                                            name: providerName,
                                            phone: barber.profile?.phoneNumber,
                                            distance: Math.round(distance * 10) / 10,
                                            location: providerLocation,
                                            shopId: barber.shopId?._id,
                                            shopName: barber.shopId?.name
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }

            // 3. Find nearby shops and their services
            const shops = await Shop.find({
                status: 'active',
                latitude: { $exists: true },
                longitude: { $exists: true }
            })
            .select('uid name latitude longitude address phone email serviceTypes status');

            console.log('Total shops found:', shops.length);

            for (const shop of shops) {
                if (shop.latitude && shop.longitude) {
                    const distance = calculateDistance(lat, long, shop.latitude, shop.longitude);

                    if (distance <= 50) {
                        console.log('Shop within range:', shop.uid, 'Distance:', distance);

                        // Find all services offered by barbers in this shop
                        const shopBarbers = await Barber.find({
                            shopId: shop._id,
                            status: 'active'
                        }).select('services');

                        const shopServiceIds = new Set();
                        shopBarbers.forEach(barber => {
                            barber.services.forEach(serviceId => shopServiceIds.add(serviceId.toString()));
                        });

                        // Get services for this shop
                        for (const serviceId of shopServiceIds) {
                            if (!serviceIds.has(serviceId)) {
                                serviceIds.add(serviceId);

                                const service = await Service.findById(serviceId)
                                    .populate('category', 'name uid')
                                    .select('uid title description price duration type icon category status');

                                if (service && (service.status === 'approved' || service.status === 'pending')) {
                                    services.push({
                                        ...service.toObject(),
                                        provider: {
                                            id: shop._id,
                                            uid: shop.uid,
                                            type: 'shop',
                                            name: shop.name,
                                            distance: Math.round(distance * 10) / 10,
                                            location: {
                                                latitude: shop.latitude,
                                                longitude: shop.longitude,
                                                formattedAddress: shop.address
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }

            console.log('Total nearby services found:', services.length);

            // If no services found from providers within 50km, try to get services from providers within 100km
            if (services.length === 0) {
                console.log('No services found within 50km, trying 100km radius...');

                // Reset services array for broader search
                services.length = 0;
                serviceIds.clear();

                // Search with 100km radius
                const searchRadius = 100;

                // 1. Find freelancers within 100km
                for (const freelancer of freelancers) {
                    if (freelancer.location && freelancer.location.latitude && freelancer.location.longitude) {
                        const distance = calculateDistance(lat, long, freelancer.location.latitude, freelancer.location.longitude);

                        if (distance <= searchRadius) {
                            console.log('Freelancer within 100km range:', freelancer.uid, 'Distance:', distance);

                            for (const serviceId of freelancer.services) {
                                if (!serviceIds.has(serviceId.toString())) {
                                    serviceIds.add(serviceId.toString());

                                    const service = await Service.findById(serviceId)
                                        .populate('category', 'name uid')
                                        .select('uid title description price duration type icon category status');

                                    if (service && (service.status === 'approved' || service.status === 'pending')) {
                                        services.push({
                                            ...service.toObject(),
                                            provider: {
                                                id: freelancer._id,
                                                uid: freelancer.uid,
                                                type: 'freelancer',
                                                name: `${freelancer.firstName} ${freelancer.lastName}`,
                                                phone: freelancer.profile?.phoneNumber,
                                                distance: Math.round(distance * 10) / 10,
                                                location: freelancer.location
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Find barbers within 100km
                for (const barber of barbers) {
                    let providerLat, providerLong, providerLocation;

                    if (barber.serviceType === 'homeBased' || barber.employmentType === 'freelance') {
                        if (barber.location && barber.location.latitude && barber.location.longitude) {
                            providerLat = barber.location.latitude;
                            providerLong = barber.location.longitude;
                            providerLocation = barber.location;
                        }
                    } else if (barber.employmentType === 'employed' && barber.shopId) {
                        if (barber.shopId.latitude && barber.shopId.longitude) {
                            providerLat = barber.shopId.latitude;
                            providerLong = barber.shopId.longitude;
                            providerLocation = {
                                latitude: barber.shopId.latitude,
                                longitude: barber.shopId.longitude,
                                formattedAddress: barber.shopId.address
                            };
                        }
                    }

                    if (providerLat && providerLong) {
                        const distance = calculateDistance(lat, long, providerLat, providerLong);

                        if (distance <= searchRadius) {
                            console.log('Barber within 100km range:', barber.uid, 'Distance:', distance);

                            for (const serviceId of barber.services) {
                                if (!serviceIds.has(serviceId.toString())) {
                                    serviceIds.add(serviceId.toString());

                                    const service = await Service.findById(serviceId)
                                        .populate('category', 'name uid')
                                        .select('uid title description price duration type icon category status');

                                    if (service && (service.status === 'approved' || service.status === 'pending')) {
                                        const providerName = barber.employmentType === 'employed' && barber.shopId
                                            ? barber.shopId.name
                                            : `${barber.firstName} ${barber.lastName}`;

                                        services.push({
                                            ...service.toObject(),
                                            provider: {
                                                id: barber._id,
                                                uid: barber.uid,
                                                type: barber.employmentType === 'employed' ? 'shop_barber' : 'freelance_barber',
                                                name: providerName,
                                                phone: barber.profile?.phoneNumber,
                                                distance: Math.round(distance * 10) / 10,
                                                location: providerLocation,
                                                shopId: barber.shopId?._id,
                                                shopName: barber.shopId?.name
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                // 3. Find shops within 100km
                for (const shop of shops) {
                    if (shop.latitude && shop.longitude) {
                        const distance = calculateDistance(lat, long, shop.latitude, shop.longitude);

                        if (distance <= searchRadius) {
                            console.log('Shop within 100km range:', shop.uid, 'Distance:', distance);

                            const shopBarbers = await Barber.find({
                                shopId: shop._id,
                                status: 'active'
                            }).select('services');

                            const shopServiceIds = new Set();
                            shopBarbers.forEach(barber => {
                                barber.services.forEach(serviceId => shopServiceIds.add(serviceId.toString()));
                            });

                            for (const serviceId of shopServiceIds) {
                                if (!serviceIds.has(serviceId)) {
                                    serviceIds.add(serviceId);

                                    const service = await Service.findById(serviceId)
                                        .populate('category', 'name uid')
                                        .select('uid title description price duration type icon category status');

                                    if (service && (service.status === 'approved' || service.status === 'pending')) {
                                        services.push({
                                            ...service.toObject(),
                                            provider: {
                                                id: shop._id,
                                                uid: shop.uid,
                                                type: 'shop',
                                                name: shop.name,
                                                distance: Math.round(distance * 10) / 10,
                                                location: {
                                                    latitude: shop.latitude,
                                                    longitude: shop.longitude,
                                                    formattedAddress: shop.address
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                console.log('Total services found within 100km:', services.length);
            }

            // If still no services found from providers, try to get some approved services as fallback
            if (services.length === 0) {
                console.log('No services found from providers within 100km, trying fallback...');

                // Try to get services that have actual providers (not just approved status)
                const servicesWithProviders = await Service.find({
                    status: { $in: ['approved', 'pending'] },
                    $or: [
                        { barberId: { $exists: true, $ne: null } },
                        { offeredBy: { $exists: true, $not: { $size: 0 } } }
                    ]
                })
                .populate('category', 'name uid')
                .populate('barberId', 'firstName lastName uid profile')
                .populate('offeredBy.providerId', 'name uid')
                .select('uid title description price duration type icon category status barberId offeredBy')
                .limit(10);

                console.log('Services with providers found:', servicesWithProviders.length);

                for (const service of servicesWithProviders) {
                    let providerInfo = {
                        id: null,
                        uid: 'available',
                        type: 'available',
                        name: 'Available Service',
                        distance: null,
                        location: null
                    };

                    // Try to get provider information
                    if (service.barberId) {
                        providerInfo = {
                            id: service.barberId._id,
                            uid: service.barberId.uid,
                            type: 'barber',
                            name: `${service.barberId.firstName} ${service.barberId.lastName}`,
                            distance: null,
                            location: null
                        };
                    } else if (service.offeredBy && service.offeredBy.length > 0) {
                        const primaryOffer = service.offeredBy[0];
                        if (primaryOffer.providerId) {
                            providerInfo = {
                                id: primaryOffer.providerId._id,
                                uid: primaryOffer.providerId.uid || 'provider',
                                type: primaryOffer.providerType,
                                name: primaryOffer.providerId.name || 'Service Provider',
                                distance: null,
                                location: null
                            };
                        }
                    }

                    services.push({
                        ...service.toObject(),
                        provider: providerInfo
                    });
                }

                // If still no services with providers, fall back to general approved services
                if (services.length === 0) {
                    console.log('No services with providers found, using general approved services');
                    const fallbackServices = await Service.find({ status: { $in: ['approved', 'pending'] } })
                        .populate('category', 'name uid')
                        .select('uid title description price duration type icon category status')
                        .limit(5);

                    console.log('General fallback services found:', fallbackServices.length);

                    for (const service of fallbackServices) {
                        services.push({
                            ...service.toObject(),
                            provider: {
                                id: null,
                                uid: 'general',
                                type: 'general',
                                name: 'General Service',
                                distance: null,
                                location: null
                            }
                        });
                    }
                }
            }

            // Sort services by provider distance
            services.sort((a, b) => a.provider.distance - b.provider.distance);

            allServices = services;

            // Apply pagination after getting all nearby services
            const totalFiltered = allServices.length;
            const startIndex = skip;
            const endIndex = startIndex + parseInt(limit);
            allServices = allServices.slice(startIndex, endIndex);

            const pagination = {
                total: totalFiltered,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalFiltered / parseInt(limit))
            };

            return { services: allServices, pagination };
        } else {
            // No location filtering, use normal pagination
            const [services, total] = await Promise.all([
                servicesQuery.skip(skip).limit(parseInt(limit)),
                Service.countDocuments(query)
            ]);

            const pagination = {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            };

            return { services, pagination };
        }
    } catch (error) {
        throw new ApiError(`Failed to get services: ${error.message}`, 500);
    }
};

/**
 * Get popular services
 * @param {number} limit - Number of services to return
 * @returns {Promise<Array>} Popular services
 */
const getPopularServices = async (limit = 10) => {
    try {
        const services = await Service.find({
            status: 'active',
            isPopular: true
        })
            .limit(parseInt(limit))
            .populate('offeredBy.providerId', 'name uid specialization')
            .populate('countryId', 'name code');

        return services;
    } catch (error) {
        throw new ApiError(`Failed to get popular services: ${error.message}`, 500);
    }
};

/**
 * Get providers for a specific service within radius
 * @param {string} serviceId - Service ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Providers
 */
const getServiceProviders = async (serviceId, options) => {
    try {
        const { lat, long, type } = options;

        // Get the service to ensure it exists
        const service = await Service.findById(serviceId);
        if (!service) {
            throw new ApiError('Service not found', 404);
        }

        console.log('Service found:', service._id, 'Type requested:', type);

        const providers = [];
        const maxDistanceKm = 50;
        const earthRadiusKm = 6371;

        // Helper function to build aggregation pipeline for geospatial query
        const buildProviderPipeline = (providerType, additionalMatch = {}) => {
            let locationPath, latPath, longPath;
            
            if (providerType.toLowerCase() === 'shop') {
                latPath = '$latitude';
                longPath = '$longitude';
            } else {
                latPath = '$profile.location.latitude';
                longPath = '$profile.location.longitude';
            }

            return [
                {
                    $match: {
                        services: new mongoose.Types.ObjectId(serviceId),
                        ...additionalMatch
                    }
                },
                {
                    $addFields: {
                        lat: { $ifNull: [latPath, null] },
                        long: { $ifNull: [longPath, null] }
                    }
                },
                {
                    $match: {
                        lat: { $ne: null, $exists: true },
                        long: { $ne: null, $exists: true }
                    }
                },
                {
                    $addFields: {
                        distance: {
                            $let: {
                                vars: {
                                    dLat: { $degreesToRadians: { $subtract: ['$lat', lat] } },
                                    dLon: { $degreesToRadians: { $subtract: ['$long', long] } },
                                    lat1: { $degreesToRadians: lat },
                                    lat2: { $degreesToRadians: '$lat' }
                                },
                                in: {
                                    $multiply: [
                                        earthRadiusKm,
                                        {
                                            $multiply: [
                                                2,
                                                {
                                                    $asin: {
                                                        $sqrt: {
                                                            $add: [
                                                                {
                                                                    $multiply: [
                                                                        { $sin: { $divide: ['$$dLat', 2] } },
                                                                        { $sin: { $divide: ['$$dLat', 2] } }
                                                                    ]
                                                                },
                                                                {
                                                                    $multiply: [
                                                                        { $cos: '$$lat1' },
                                                                        { $cos: '$$lat2' },
                                                                        { $sin: { $divide: ['$$dLon', 2] } },
                                                                        { $sin: { $divide: ['$$dLon', 2] } }
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        distance: { $lte: maxDistanceKm }
                    }
                },
                {
                    $addFields: {
                        providerType: providerType.toLowerCase(),
                        customPrice: service.price,
                        customDuration: service.duration,
                        distance: { $round: [{ $multiply: ['$distance', 10] }] }
                    }
                },
                {
                    $addFields: {
                        distance: { $divide: ['$distance', 10] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        uid: 1,
                        userId: 1,
                        name: 1,
                        firstName: 1,
                        lastName: 1,
                        email: 1,
                        phone: 1,
                        address: 1,
                        description: 1,
                        images: 1,
                        mainImage: 1,
                        latitude: 1,
                        longitude: 1,
                        ownerId: 1,
                        profile: 1,
                        addresses: 1,
                        status: 1,
                        specialization: 1,
                        employmentType: 1,
                        rating: 1,
                        reviewCount: 1,
                        bio: 1,
                        profileImage: 1,
                        joinedDate: 1,
                        servicingArea: 1,
                        serviceType: 1,
                        services: 1,
                        shopId: 1,
                        location: 1,
                        distance: 1,
                        providerType: 1,
                        customPrice: 1,
                        customDuration: 1
                    }
                },
                {
                    $sort: { distance: 1 }
                },
                {
                    $limit: 50  // Limit results per provider type to improve performance
                }
            ];
        };

        // Execute queries in parallel using Promise.all
        const queries = [];

        console.log('🔍 Building queries for type:', type || 'ALL');

        if (!type || type === 'homeBased') {
            console.log('  ➜ Adding homeBased freelancer query');
            // Freelancers (homeBased or both)
            queries.push(
                Freelancer.aggregate(
                    buildProviderPipeline('freelancer', {
                        serviceType: { $in: ['homeBased', 'both'] },
                        status: 'active'
                    })
                )
            );
            
            console.log('  ➜ Adding homeBased barber query');
            // Barbers (homeBased or both)
            queries.push(
                Barber.aggregate(
                    buildProviderPipeline('barber', {
                        status: 'active',
                        serviceType: { $in: ['homeBased', 'both'] }
                    })
                )
            );
        }

        if (!type || type === 'shopBased') {
            console.log('  ➜ Adding shopBased freelancer query');
            // Shop-based freelancers
            queries.push(
                Freelancer.aggregate(
                    buildProviderPipeline('freelancer', {
                        serviceType: { $in: ['shopBased', 'both'] },
                        status: 'active'
                    })
                )
            );
            
            console.log('  ➜ Adding shopBased barber query');
            // Shop-based barbers
            queries.push(
                Barber.aggregate(
                    buildProviderPipeline('barber', {
                        status: 'active',
                        serviceType: { $in: ['shopBased', 'both'] }
                    })
                )
            );
            
            console.log('  ➜ Adding shop query');
            // Shops
            queries.push(
                Shop.aggregate(
                    buildProviderPipeline('shop', {
                        isActive: true
                    })
                ).then(shops => {
                    console.log(`  ✓ Shop aggregation returned ${shops.length} shops`);
                    return Shop.populate(shops, { path: 'ownerId', select: 'name email firstName lastName phoneNumber' });
                })
            );
        }

        console.log(`📋 Total queries to execute: ${queries.length}`);

        // Execute all queries in parallel
        const results = await Promise.all(queries);
        
        console.log('📊 Query Results:', {
            totalQueries: queries.length,
            resultsPerQuery: results.map((r, i) => ({ queryIndex: i, count: r?.length || 0 }))
        });
        
        // Flatten and combine all results
        results.forEach((result, index) => {
            if (result && result.length > 0) {
                console.log(`✅ Query ${index} returned ${result.length} providers`);
                providers.push(...result);
            } else {
                console.log(`⚠️ Query ${index} returned no providers`);
            }
        });

        // Remove duplicates (in case a provider matches multiple queries)
        const uniqueProviders = [];
        const seenIds = new Set();
        
        for (const provider of providers) {
            const id = provider._id.toString();
            if (!seenIds.has(id)) {
                seenIds.add(id);
                uniqueProviders.push(provider);
            }
        }

        // Sort all providers by distance
        uniqueProviders.sort((a, b) => a.distance - b.distance);

        console.log('Total unique providers found within 50km:', uniqueProviders.length);

        // Get available slots for all providers (only if requested)
        let availableSlots = {};
        if (options.includeSlots !== false) {
            const providerSlotsService = require('./providerSlotsService');
            availableSlots = await providerSlotsService.getProvidersAvailableSlots(uniqueProviders, serviceId);
        }

        return { providers: uniqueProviders, slots: availableSlots };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to get service providers: ${error.message}`, 500);
    }
};

/**
 * Get all services from nearby providers within 50km
 * @param {Object} options - Query options with lat, long
 * @returns {Promise<Array>} Services from nearby providers
 */
const getNearbyServices = async (options) => {
    try {
        const { lat, long } = options;
        const services = [];
        const serviceIds = new Set();

        console.log('Finding nearby services for location:', lat, long);

        // 1. Find nearby freelancers and their services
        const freelancers = await Freelancer.find({
            status: 'active',
            'location.latitude': { $exists: true },
            'location.longitude': { $exists: true }
        })
        .select('uid firstName lastName profile services location status serviceType');

        console.log('Total freelancers found:', freelancers.length);

        for (const freelancer of freelancers) {
            if (freelancer.location && freelancer.location.latitude && freelancer.location.longitude) {
                const distance = calculateDistance(lat, long, freelancer.location.latitude, freelancer.location.longitude);

                if (distance <= 50) {
                    console.log('Freelancer within range:', freelancer.uid, 'Distance:', distance);
                    console.log('Freelancer services:', freelancer.services);

                    // Get services offered by this freelancer
                    for (const serviceId of freelancer.services) {
                        console.log('Processing service ID:', serviceId);
                        if (!serviceIds.has(serviceId.toString())) {
                            serviceIds.add(serviceId.toString());

                            const service = await Service.findById(serviceId)
                                .populate('category', 'name uid')
                                .select('uid title description price duration type icon category status');

                            console.log('Service found:', service ? service.title : 'null', 'Status:', service ? service.status : 'N/A');

                            if (service && (service.status === 'approved' || service.status === 'pending')) {
                                services.push({
                                    ...service.toObject(),
                                    provider: {
                                        id: freelancer._id,
                                        uid: freelancer.uid,
                                        type: 'freelancer',
                                        name: `${freelancer.firstName} ${freelancer.lastName}`,
                                        phone: freelancer.profile?.phoneNumber,
                                        distance: Math.round(distance * 10) / 10,
                                        location: freelancer.location
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }

        // 2. Find nearby barbers and their services
        const barbers = await Barber.find({
            status: 'active'
        })
        .populate('shopId', 'name uid latitude longitude address')
        .select('uid firstName lastName profile shopId services location status serviceType employmentType');

        console.log('Total barbers found:', barbers.length);

        for (const barber of barbers) {
            let providerLat, providerLong, providerLocation;

            // Determine location based on service type and employment type
            if (barber.serviceType === 'homeBased' || barber.employmentType === 'freelance') {
                if (barber.location && barber.location.latitude && barber.location.longitude) {
                    providerLat = barber.location.latitude;
                    providerLong = barber.location.longitude;
                    providerLocation = barber.location;
                }
            } else if (barber.employmentType === 'employed' && barber.shopId) {
                if (barber.shopId.latitude && barber.shopId.longitude) {
                    providerLat = barber.shopId.latitude;
                    providerLong = barber.shopId.longitude;
                    providerLocation = {
                        latitude: barber.shopId.latitude,
                        longitude: barber.shopId.longitude,
                        formattedAddress: barber.shopId.address
                    };
                }
            }

            if (providerLat && providerLong) {
                const distance = calculateDistance(lat, long, providerLat, providerLong);

                if (distance <= 50) {
                    console.log('Barber within range:', barber.uid, 'Distance:', distance);
                    console.log('Barber services:', barber.services);

                    // Get services offered by this barber
                    for (const serviceId of barber.services) {
                        console.log('Processing barber service ID:', serviceId);
                        if (!serviceIds.has(serviceId.toString())) {
                            serviceIds.add(serviceId.toString());

                            const service = await Service.findById(serviceId)
                                .populate('category', 'name uid')
                                .select('uid title description price duration type icon category status');

                            console.log('Barber service found:', service ? service.title : 'null', 'Status:', service ? service.status : 'N/A');

                            if (service && (service.status === 'approved' || service.status === 'pending')) {
                                const providerName = barber.employmentType === 'employed' && barber.shopId
                                    ? barber.shopId.name
                                    : `${barber.firstName} ${barber.lastName}`;

                                services.push({
                                    ...service.toObject(),
                                    provider: {
                                        id: barber._id,
                                        uid: barber.uid,
                                        type: barber.employmentType === 'employed' ? 'shop_barber' : 'freelance_barber',
                                        name: providerName,
                                        phone: barber.profile?.phoneNumber,
                                        distance: Math.round(distance * 10) / 10,
                                        location: providerLocation,
                                        shopId: barber.shopId?._id,
                                        shopName: barber.shopId?.name
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }

        // 3. Find nearby shops and their services
        const shops = await Shop.find({
            status: 'active',
            latitude: { $exists: true },
            longitude: { $exists: true }
        })
        .select('uid name latitude longitude address phone email serviceTypes status');

        console.log('Total shops found:', shops.length);

        for (const shop of shops) {
            if (shop.latitude && shop.longitude) {
                const distance = calculateDistance(lat, long, shop.latitude, shop.longitude);

                if (distance <= 50) {
                    console.log('Shop within range:', shop.uid, 'Distance:', distance);

                    // Find all services offered by barbers in this shop
                    const shopBarbers = await Barber.find({
                        shopId: shop._id,
                        status: 'active'
                    }).select('services');

                    const shopServiceIds = new Set();
                    shopBarbers.forEach(barber => {
                        barber.services.forEach(serviceId => shopServiceIds.add(serviceId.toString()));
                    });

                    // Get services for this shop
                    for (const serviceId of shopServiceIds) {
                        if (!serviceIds.has(serviceId)) {
                            serviceIds.add(serviceId);

                            const service = await Service.findById(serviceId)
                                .populate('category', 'name uid')
                                .select('uid title description price duration type icon category status');

                            if (service && (service.status === 'approved' || service.status === 'pending')) {
                                services.push({
                                    ...service.toObject(),
                                    provider: {
                                        id: shop._id,
                                        uid: shop.uid,
                                        type: 'shop',
                                        serviceType: 'shopBased',
                                        name: shop.name,
                                        distance: Math.round(distance * 10) / 10,
                                        location: {
                                            latitude: shop.latitude,
                                            longitude: shop.longitude,
                                            formattedAddress: shop.address
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }

        console.log('Total nearby services found:', services.length);

        // If no services found from providers, try to get some approved services as fallback
        if (services.length === 0) {
            console.log('No services found from providers, trying fallback...');
            const fallbackServices = await Service.find({ status: { $in: ['approved', 'pending'] } })
                .populate('category', 'name uid')
                .select('uid title description price duration type icon category status')
                .limit(5);

            console.log('Fallback services found:', fallbackServices.length);

            for (const service of fallbackServices) {
                services.push({
                    ...service.toObject(),
                    provider: {
                        id: null,
                        uid: 'system',
                        type: 'system',
                        name: 'System Service',
                        distance: 0,
                        location: null
                    }
                });
            }
        }

        // Sort services by provider distance
        services.sort((a, b) => a.provider.distance - b.provider.distance);

        // Get available slots for all providers
        const providerSlotsService = require('./providerSlotsService');
        const availableSlots = await providerSlotsService.getProvidersAvailableSlots(services, serviceId);

        return { providers: services, slots: availableSlots };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(`Failed to get nearby services: ${error.message}`, 500);
    }
};

module.exports = {
    createService,
    getServiceById,
    getServicesByShop,
    getServiceByUid,
    updateService,
    deleteService,
    approveRejectService,
    getServicesByBarber,
    getServiceCategories,
    searchServices,
    getAllServices,
    getPopularServices,
    getServiceProviders,
    getNearbyServices
};