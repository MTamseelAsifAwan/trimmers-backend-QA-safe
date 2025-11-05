// src/api/shops/controllers/shopController.js
const shopService = require('../../../services/shopService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all shops with pagination
 * @route GET /api/shops
 * @access Public
 */
const getShops = async (req, res, next) => {
    try {
        const { page, limit, isVerified, isActive, ownerId, search, sortBy, sortOrder, latitude, longitude, radius } = req.query;

        const options = {
            page,
            limit,
            ownerId,
            search,
            sortBy,
            sortOrder,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            radius: radius ? parseFloat(radius) : 50 // Default 50km radius
        };

        if (typeof isVerified !== 'undefined') {
            options.isVerified = isVerified === 'true';
        }
        if (typeof isActive !== 'undefined') {
            options.isActive = isActive === 'true';
        }

        const result = await shopService.getShops(options);

        res.status(200).json({
            success: true,
            data: result.shops,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop by ID
 * @route GET /api/shops/:id
 * @access Public
 */
const getShopById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shop = await shopService.getShopById(id);

        res.status(200).json({
            success: true,
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop by UID
 * @route GET /api/shops/uid/:uid
 * @access Public
 */
const getShopByUid = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const shop = await shopService.getShopByUid(uid);

        res.status(200).json({
            success: true,
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new shop
 * @route POST /api/shops
 * @access Private/ShopOwner
 */
const createShop = async (req, res, next) => {
    try {
        // Check if user is authenticated and has shop_owner role
        if (!req.user || req.role.name !== 'shop_owner') {
            throw new ApiError('Only shop owners can create shops', 403);
        }

        // Check if shop owner already has a shop
        const Shop = require('../../../models/Shop');
        const existingShop = await Shop.findOne({ ownerId: req.user._id });
        if (existingShop) {
            throw new ApiError('You already have a shop. Shop owners can only create one shop.', 400);
        }

        // Use the authenticated user's ID as the owner ID
        const ownerId = req.user._id;

        const shop = await shopService.createShop(ownerId, req.body);

        res.status(201).json({
            success: true,
            message: 'Shop created successfully',
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update shop
 * @route PUT /api/shops/:id
 * @access Private
 */
const updateShop = async (req, res, next) => {
    try {
        // For shop owners, find their shop by ownerId since they can only have one shop
        const Shop = require('../../../models/Shop');
        const shopUpdateRequestService = require('../../../services/shopUpdateRequestService');
        const shop = await Shop.findOne({ ownerId: req.user._id });

        if (!shop) {
            throw new ApiError('Shop not found', 404);
        }

        // Create original data snapshot for comparison
        const originalData = {
            name: shop.name,
            address: shop.address,
            latitude: shop.latitude,
            longitude: shop.longitude,
            phone: shop.phone,
            email: shop.email,
            description: shop.description,
            services: shop.services,
            serviceTypes: shop.serviceTypes,
            amenities: shop.amenities,
            openingHours: shop.openingHours,
            socialMedia: shop.socialMedia
        };

        // Process nested location data if provided
        let processedReqData = { ...req.body };
        if (req.body.location) {
            if (req.body.location.address) processedReqData.address = req.body.location.address;
            if (req.body.location.latitude !== undefined) processedReqData.latitude = req.body.location.latitude;
            if (req.body.location.longitude !== undefined) processedReqData.longitude = req.body.location.longitude;
        }

        // Build requested changes map
        const requestedChanges = new Map();
        const fieldsToCheck = ['name', 'address', 'latitude', 'longitude', 'phone', 'email', 'description', 'services', 'serviceTypes', 'amenities', 'openingHours', 'socialMedia'];
        
        let hasChanges = false;
        fieldsToCheck.forEach(field => {
            if (processedReqData[field] !== undefined) {
                const oldValue = originalData[field];
                const newValue = processedReqData[field];
                
                // Deep comparison for arrays and objects
                const isChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
                
                if (isChanged) {
                    hasChanges = true;
                    requestedChanges.set(field, {
                        fieldName: field,
                        oldValue: oldValue,
                        newValue: newValue,
                        fieldType: getFieldType(field)
                    });
                    console.log(`[SHOP UPDATE] Change detected for ${field}:`, {
                        oldValue: oldValue,
                        newValue: newValue
                    });
                }
            }
        });

        console.log(`[SHOP UPDATE] Total changes detected: ${requestedChanges.size}`);

        if (!hasChanges) {
            // No changes detected, return current shop data
            console.log('[SHOP UPDATE] No changes detected, returning original data');
            return res.status(200).json({
                success: true,
                message: 'Shop updated successfully',
                data: shop
            });
        }

        // Create update request using the service
        console.log('[SHOP UPDATE] Creating update request...');
        const updateRequest = await shopUpdateRequestService.createRequest(
            req.user._id,
            shop._id,
            requestedChanges,
            'medium'
        );
        
        console.log('[SHOP UPDATE] Update request created:', updateRequest._id);

        // Return the original shop data but with success message
        // This maintains the same response structure while the changes are pending approval
        res.status(200).json({
            success: true,
            message: 'Shop updated successfully',
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper function to determine field type for categorization
 */
const getFieldType = (fieldName) => {
    const fieldTypeMap = {
        'openingHours': 'openingHours',
        'latitude': 'location',
        'longitude': 'location',
        'address': 'location',
        'name': 'businessInfo',
        'description': 'businessInfo',
        'services': 'businessInfo',
        'serviceTypes': 'businessInfo',
        'amenities': 'businessInfo',
        'phone': 'contact',
        'email': 'contact',
        'socialMedia': 'contact'
    };
    return fieldTypeMap[fieldName] || 'other';
};

/**
 * Verify shop (admin only)
 * @route PATCH /api/shops/:id/verify
 * @access Private/Admin
 */
const verifyShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isVerified } = req.body;

        if (isVerified === undefined) {
            throw new ApiError('Verification status is required', 400);
        }

        const shop = await shopService.verifyShop(id, isVerified);

        res.status(200).json({
            success: true,
            message: `Shop ${isVerified ? 'verified' : 'unverified'} successfully`,
            data: shop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete shop
 * @route DELETE /api/shops/:id
 * @access Private
 */
const deleteShop = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get current shop to check ownership
        const shop = await shopService.getShopById(id);

        // Check authorization - shop owner can delete their own shop, admin can delete any shop
        const isOwner = req.user && req.role.name === 'shop_owner' && shop.ownerId.toString() === req.user._id.toString();
        const isAdmin = req.user && req.role.name === 'admin';

        if (!isOwner && !isAdmin) {
            throw new ApiError('You are not authorized to delete this shop', 403);
        }

        const success = await shopService.deleteShop(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Shop deleted successfully'
            });
        } else {
            throw new ApiError('Shop deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Search shops
 * @route GET /api/shops/search
 * @access Public
 */
const searchShops = async (req, res, next) => {
    try {
        const { query, latitude, longitude, radius, serviceTypes, page, limit, sortBy, sortOrder } = req.query;

        const options = {
            query,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            radius: radius ? parseFloat(radius) : 10,
            serviceTypes: serviceTypes ? serviceTypes.split(',') : undefined,
            isVerified: true,
            isActive: true,
            page,
            limit,
            sortBy: sortBy || 'distance',
            sortOrder: sortOrder || 'asc'
        };

        const result = await shopService.searchShops(options);

        res.status(200).json({
            success: true,
            data: result.shops,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get services offered by shop
 * @route GET /api/shops/:id/services
 * @access Public
 */
const getShopServices = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, sortBy, sortOrder, category } = req.query;

        const options = {
            status: status || 'approved', // Changed default to 'approved' since that's what services use
            sortBy,
            sortOrder,
            category
        };
        const services = await shopService.getShopServices(id, options);

        res.status(200).json({
            success: true,
            data: services
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barbers working at shop
 * @route GET /api/shops/:id/barbers
 * @access Public
 */
const getShopBarbers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, sortBy, sortOrder } = req.query;

        const options = {
            status: status || 'active',
            sortBy,
            sortOrder
        };

        const barbers = await shopService.getShopBarbers(id, options);

        res.status(200).json({
            success: true,
            data: barbers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add barber to shop
 * @route POST /api/shops/:id/barbers
 * @access Private
 */
const addBarberToShop = async (req, res, next) => {
    try {
        const { id } = req.params; // Shop ID
        const { barberId } = req.body;

        if (!barberId) {
            throw new ApiError('Barber ID is required', 400);
        }

        // Get current shop to check ownership
        const shop = await shopService.getShopById(id);

        // Check authorization - shop owner can manage their own shop, admin can manage any shop
        const isOwner = req.user && req.role.name === 'shop_owner' && shop.ownerId.toString() === req.user._id.toString();
        const isAdmin = req.user && req.role.name === 'admin';

        if (!isOwner && !isAdmin) {
            throw new ApiError('You are not authorized to add barbers to this shop', 403);
        }

        const barber = await shopService.addBarberToShop(id, barberId);

        res.status(200).json({
            success: true,
            message: 'Barber added to shop successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove barber from shop
 * @route DELETE /api/shops/:id/barbers/:barberId
 * @access Private
 */
const removeBarberFromShop = async (req, res, next) => {
    try {
        const { id, barberId } = req.params;

        // Get current shop to check ownership
        const shop = await shopService.getShopById(id);

        // Check authorization - shop owner can manage their own shop, admin can manage any shop
        const isOwner = req.user && req.role.name === 'shop_owner' && shop.ownerId.toString() === req.user._id.toString();
        const isAdmin = req.user && req.role.name === 'admin';

        if (!isOwner && !isAdmin) {
            throw new ApiError('You are not authorized to remove barbers from this shop', 403);
        }

        const barber = await shopService.removeBarberFromShop(id, barberId);

        res.status(200).json({
            success: true,
            message: 'Barber removed from shop successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shops by country
 * @route GET /api/shops/country/:countryId
 * @access Public
 */
const getShopsByCountry = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        const { page, limit, isVerified, isActive, ownerId, search, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            isVerified: isVerified === 'true',
            isActive: isActive === 'true',
            ownerId,
            search,
            sortBy,
            sortOrder
        };

        const result = await shopService.getShopsByCountry(countryId, options);

        res.status(200).json({
            success: true,
            data: result.shops,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barbers for shops (legacy endpoint)
 * @route GET /api/shops/:id/barbers-list
 * @access Public
 */
const getShopsBarbers = async (req, res, next) => {
    try {
        const id = req.params.id; // Shop ID

        const barbers = await shopService.getShopBarbers(id);

        res.status(200).json({
            success: true,
            data: barbers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get service providers for a shop and service
 * @route GET /api/shops/:id/service-providers
 * @access Public
 */
const getServiceProviders = async (req, res, next) => {
    try {
        const { id: shopId } = req.params;
        const { serviceId } = req.query;

        if (!serviceId) {
            throw new ApiError('Service ID is required', 400);
        }

  

        const options = {
            serviceId,
            
        };

        const providers = await shopService.getServiceProviders(shopId, options);

        res.status(200).json({
            success: true,
            count: providers.length,
            providers: providers
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getShops,
    getShopById,
    getShopByUid,
    createShop,
    updateShop,
    verifyShop,
    deleteShop,
    searchShops,
    getShopServices,
    getShopBarbers,
    addBarberToShop,
    removeBarberFromShop,
    getShopsByCountry,
    getShopsBarbers,
    getServiceProviders
};