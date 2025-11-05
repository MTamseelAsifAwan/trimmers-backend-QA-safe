// src/api/customers/controllers/customerController.js
const customerService = require('../../../services/customerService');
const { ApiError } = require('../../../middlewares/errorHandler');
const { EMPLOYMENT_TYPES } = require('../../../models/User');

/**
 * Get all customers with pagination (admin function)
 * @route GET /api/admin/customers
 * @access Private/Admin
 */
const getCustomers = async (req, res, next) => {
    try {
        const { page, limit, search } = req.query;

        const options = {
            page,
            limit,
            search
        };

        const result = await customerService.getCustomers(options);

        res.status(200).json({
            success: true,
            data: result.customers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer by ID
 * @route GET /api/customers/:id
 * @access Private/Admin
 */
const getCustomerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customer = await customerService.getCustomerById(id);

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer by UID
 * @route GET /api/customers/uid/:uid
 * @access Private/Admin
 */
const getCustomerByUid = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const customer = await customerService.getCustomerByUid(uid);

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer profile (for authenticated customer)
 * @route GET /api/customers/profile
 * @access Private/Customer
 */
const getCustomerProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Try to get existing customer profile
        let customer = await customerService.getCustomerByUserId(userId);

        // If no customer profile exists, create one
        if (!customer) {
            try {
                customer = await customerService.createCustomerProfile(userId, {
                    displayName: req.user.displayName || req.user.email || 'Customer',
                    countryId: req.user.countryId
                });
                console.log(`Created new customer profile for user: ${userId}`);
            } catch (createError) {
                console.error(`Failed to create customer profile: ${createError.message}`);
                return next(new ApiError('Failed to create customer profile', 500));
            }
        }

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create customer profile
 * @route POST /api/customers
 * @access Private
 */
const createCustomerProfile = async (req, res, next) => {
    try {
        // For new customer creation, userId is the authenticated user
        const userId = req.user._id;
        const customer = await customerService.createCustomerProfile(userId, req.body);

        res.status(201).json({
            success: true,
            message: 'Customer profile created successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update customer profile
 * @route PUT /api/customers/profile
 * @access Private/Customer
 */
const updateCustomerProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const customer = await customerService.updateCustomerProfile(userId, req.body);

        res.status(200).json({
            success: true,
            message: 'Customer profile updated successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add address to customer
 * @route POST /api/customers/addresses
 * @access Private/Customer
 */
const addAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const address = req.body;

        if (!address.latitude || !address.longitude || !address.formattedAddress) {
            throw new ApiError('Address must include latitude, longitude, and formattedAddress', 400);
        }

        const customer = await customerService.addAddress(userId, address);

        res.status(200).json({
            success: true,
            message: 'Address added successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update customer address
 * @route PUT /api/customers/addresses/:index
 * @access Private/Customer
 */
const updateAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { index } = req.params;
        const updatedAddress = req.body;

        const customer = await customerService.updateAddress(userId, parseInt(index, 10), updatedAddress);

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete customer address
 * @route DELETE /api/customers/addresses/:index
 * @access Private/Customer
 */
const deleteAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { index } = req.params;

        const customer = await customerService.deleteAddress(userId, parseInt(index, 10));

        res.status(200).json({
            success: true,
            message: 'Address deleted successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Set default address
 * @route PUT /api/customers/addresses/:index/default
 * @access Private/Customer
 */
const setDefaultAddress = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { index } = req.params;

        const customer = await customerService.setDefaultAddress(userId, parseInt(index, 10));

        res.status(200).json({
            success: true,
            message: 'Default address set successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add shop to favorites
 * @route POST /api/customers/favorite-shops
 * @access Private/Customer
 */
const addFavoriteShop = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { shopId } = req.body;

        if (!shopId) {
            throw new ApiError('Shop ID is required', 400);
        }

        const customer = await customerService.addFavoriteShop(userId, shopId);

        res.status(200).json({
            success: true,
            message: 'Shop added to favorites successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove shop from favorites
 * @route DELETE /api/customers/favorite-shops/:shopId
 * @access Private/Customer
 */
const removeFavoriteShop = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { shopId } = req.params;

        const customer = await customerService.removeFavoriteShop(userId, shopId);

        res.status(200).json({
            success: true,
            message: 'Shop removed from favorites successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add barber to favorites
 * @route POST /api/customers/favorite-barbers
 * @access Private/Customer
 */
const addFavoriteBarber = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { barberId } = req.body;

        if (!barberId) {
            throw new ApiError('Barber ID is required', 400);
        }

        const customer = await customerService.addFavoriteBarber(userId, barberId);

        res.status(200).json({
            success: true,
            message: 'Barber added to favorites successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove barber from favorites
 * @route DELETE /api/customers/favorite-barbers/:barberId
 * @access Private/Customer
 */
const removeFavoriteBarber = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { barberId } = req.params;

        const customer = await customerService.removeFavoriteBarber(userId, barberId);

        res.status(200).json({
            success: true,
            message: 'Barber removed from favorites successfully',
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Search shops by service and location (within 10km radius)
 * @route GET /api/customers/search-shops
 * @access Private/Customer
 */
const Barber = require('../../../models/Barber');
const searchBarbersNearby = async (req, res, next) => {
    try {
        const { serviceId, latitude, longitude, type } = req.query;
        if (!serviceId || !latitude || !longitude) {
            throw new ApiError('serviceId, latitude, and longitude are required', 400);
        }
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        // Helper for Haversine distance
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const toRad = x => x * Math.PI / 180;
            const R = 6371;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        };

        // Get service type from Service model
        const Service = require('../../../models/Service');
        let serviceType = type;
        if (!serviceType) {
            // If not provided, fetch from serviceId
            const serviceDoc = await Service.findById(serviceId);
            if (serviceDoc && serviceDoc.type) {
                serviceType = serviceDoc.type;
            }
        }

        // Handle different service types
        if (serviceType === 'homeBased') {
            // HOME-BASED: Return freelancers
            const Barber = require('../../../models/Barber');

            // Find services of this type
            const serviceDocs = await Service.find({ _id: serviceId, type: serviceType });
            const validServiceIds = serviceDocs.map(s => String(s._id));

            // Find freelance barbers
                const freelancers = await Barber.find({
                    employmentType: { $in: [EMPLOYMENT_TYPES.FREELANCE, 'freelancer'] },
                    status: 'active',
                    services: { $in: validServiceIds },
                    'location.latitude': { $exists: true },
                    'location.longitude': { $exists: true }
                })
            .populate('userId', 'firstName lastName')
            .populate('services');

            // Filter by distance and servicing area
            const nearbyFreelancers = freelancers
                .filter(barber => {
                    const distance = getDistance(lat, lon, barber.location.latitude, barber.location.longitude);
                    return distance <= 10 && distance <= barber.servicingArea;
                })
                .map(barber => {
                    const distance = getDistance(lat, lon, barber.location.latitude, barber.location.longitude);
                    return {
                        ...barber.toObject(),
                        distance: Math.round(distance * 10) / 10 // Round to 1 decimal
                    };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 20); // Limit results

            return res.status(200).json({
                success: true,
                data: nearbyFreelancers,
                filterType: serviceType,
                resultType: 'freelancers'
            });

        } else {
            // SHOP-BASED: Return shops (existing logic)
            const Barber = require('../../../models/Barber');

            // 1. Shop-based barbers
            const shopBasedBarbers = await Barber.find({
                services: serviceId,
                status: 'active',
                shopId: { $ne: null },
                'location.latitude': { $exists: true },
                'location.longitude': { $exists: true }
            });
            const nearbyShopBarbers = shopBasedBarbers.filter(b => {
                return getDistance(lat, lon, b.location.latitude, b.location.longitude) <= 10;
            });

            // 2. Nearby shops
            const Shop = require('../../../models/Shop');
            const shops = await Shop.find({
                latitude: { $exists: true },
                longitude: { $exists: true },
                isActive: true,
                isVerified: true
            });
            const nearbyShops = shops.filter(shop => {
                return getDistance(lat, lon, shop.latitude, shop.longitude) <= 10;
            });

            const serviceDocs = await Service.find({ _id: serviceId, type: serviceType });
            const validServiceIds = serviceDocs.map(s => String(s._id));
            const filteredShops = [];
            for (const shop of nearbyShops) {
                // Find barbers in this shop who offer the requested service and type
                const barbers = nearbyShopBarbers.filter(b => {
                    if (String(b.shopId) !== String(shop._id)) return false;
                    if (Array.isArray(b.services)) {
                        return b.services.some(s => validServiceIds.includes(String(s)));
                    }
                    return false;
                });
                if (barbers.length) {
                    filteredShops.push({
                        _id: shop._id,
                        name: shop.name,
                        address: shop.address,
                        latitude: shop.latitude,
                        longitude: shop.longitude,
                        description: shop.description,
                        images: shop.images,
                        openingHours: shop.openingHours,
                        amenities: shop.amenities
                    });
                }
            }

            return res.status(200).json({
                success: true,
                data: filteredShops,
                filterType: serviceType,
                resultType: 'shops'
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    getCustomerByUid,
    getCustomerProfile,
    createCustomerProfile,
    updateCustomerProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    addFavoriteShop,
    removeFavoriteShop,
    addFavoriteBarber,
    removeFavoriteBarber,
    searchShopsNearby: searchBarbersNearby
};