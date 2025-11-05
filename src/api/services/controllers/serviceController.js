// src/api/services/controllers/serviceController.js
const serviceService = require('../../../services/serviceService');
const shopService = require('../../../services/shopService');
const providerSlotsService = require('../../../services/providerSlotsService');
const { ApiError } = require('../../../middlewares/errorHandler');
const Barber = require('../../../models/Barber');

/**
 * Get all services with pagination
 * @route GET /api/services
 * @access Public
 */
const getAllServices = async (req, res, next) => {
    try {
        const { page, limit, status, type, category, search, sortBy, sortOrder, lat, long } = req.query;

        const options = {
            page,
            limit,
            status,
            type,
            category,
            search,
            sortBy,
            sortOrder,
            lat,
            long
        };

        const result = await serviceService.getAllServices(options);

            // Transform each service to match the ideal response structure
            const transformedServices = result.services.map(service => {
                // Always include updatedAt
                // Always include shopId: if missing, try to get from offeredBy
                let shopId = service.shopId || null;
                if (!shopId && Array.isArray(service.offeredBy)) {
                    const shopOffer = service.offeredBy.find(offer => offer.providerType === 'shop' && offer.providerId);
                    if (shopOffer) shopId = shopOffer.providerId;
                }
                return {
                    barberId: service.barberId || null,
                    isTemplate: service.isTemplate || false,
                    imageUrl: service.imageUrl || null,
                    isPopular: service.isPopular || false,
                    rejectionReason: service.rejectionReason || null,
                    _id: service._id,
                    uid: service.uid,
                    title: service.title,
                    description: service.description,
                    price: service.price,
                    duration: service.duration,
                    status: service.status,
                    category: typeof service.category === 'string' ? service.category : (service.category?.name || null),
                    shopId,
                    countryId: service.countryId || null,
                    icon: service.icon || {},
                    updatedAt: service.updatedAt,
                    offeredBy: Array.isArray(service.offeredBy) ? service.offeredBy : []
                };
            });

            res.status(200).json({
                success: true,
                data: transformedServices,
                pagination: result.pagination
            });
    } catch (error) {
        next(error);
    }
};

/**
 * Get service by ID
 * @route GET /api/services/:id
 * @access Public
 */
const getServiceById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const service = await serviceService.getServiceById(id);

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get service by UID
 * @route GET /api/services/uid/:uid
 * @access Public
 */
const getServiceByUid = async (req, res, next) => {
    try {
        const { uid } = req.params;
        const service = await serviceService.getServiceByUid(uid);

        res.status(200).json({
            success: true,
            data: service
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new service
 * @route POST /api/services
 * @access Private
 */
const createService = async (req, res, next) => {
    try {
        // Determine creator context
        const creator = {};

        if (req.user.role === 'shop_owner' && req.shopOwner) {
            // Get shop owner's shops
            const shops = await shopService.getShopsByOwner(req.shopOwner._id);

            if (!shops || shops.length === 0) {
                throw new ApiError('Shop owner must have at least one shop to create services', 400);
            }

            // Use the first shop for service creation
            creator.shopId = shops[0]._id;

        } else if (req.user.role === 'barber' && req.barber) {
            // For barbers, check if they're freelance
            if (req.barber.employmentType !== 'freelance' && !req.barber.shopId) {
                throw new ApiError('Non-freelance barbers must be associated with a shop', 400);
            }

            // Set the barber's ID
            creator.barberId = req.barber._id;

            // If the barber is employed by a shop, also set the shop ID
            if (req.barber.employmentType !== 'freelance' && req.barber.shopId) {
                creator.shopId = req.barber.shopId;
            }
        } else {
            throw new ApiError('Unauthorized to create services', 403);
        }

        const service = await serviceService.createService(req.body, creator);

        res.status(201).json({
            success: true,
            message: 'Service created successfully and pending approval',
            data: service
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update service
 * @route PUT /api/services/:id
 * @access Private
 */
const updateService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isResubmission } = req.query;

        // Get current service to check ownership
        const service = await serviceService.getServiceById(id);

        // Check authorization
        const isShopOwner = req.user.role === 'shop_owner' && req.shopOwner &&
            service.offeredBy.some(offer =>
                offer.providerType === 'shop' &&
                offer.providerId &&
                offer.providerId.ownerId &&
                offer.providerId.ownerId.toString() === req.shopOwner._id.toString()
            );

        const isBarber = req.user.role === 'barber' && req.barber &&
            service.offeredBy.some(offer =>
                offer.providerType === 'barber' &&
                offer.providerId &&
                offer.providerId.toString() === req.barber._id.toString()
            );

        const isAdmin = req.user.role === 'admin';

        if (!isShopOwner && !isBarber && !isAdmin) {
            throw new ApiError('You are not authorized to update this service', 403);
        }

        const updatedService = await serviceService.updateService(
            id,
            req.body,
            isResubmission === 'true'
        );

        res.status(200).json({
            success: true,
            message: isResubmission === 'true'
                ? 'Service resubmitted successfully'
                : 'Service updated successfully',
            data: updatedService
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete service
 * @route DELETE /api/services/:id
 * @access Private
 */
const deleteService = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get current service to check ownership
        const service = await serviceService.getServiceById(id);

        // Check authorization
        const isShopOwner = req.user.role === 'shop_owner' && req.shopOwner &&
            service.offeredBy.some(offer =>
                offer.providerType === 'shop' &&
                offer.providerId &&
                offer.providerId.ownerId &&
                offer.providerId.ownerId.toString() === req.shopOwner._id.toString()
            );

        const isBarber = req.user.role === 'barber' && req.barber &&
            service.offeredBy.some(offer =>
                offer.providerType === 'barber' &&
                offer.providerId &&
                offer.providerId.toString() === req.barber._id.toString()
            );

        const isAdmin = req.user.role === 'admin';

        if (!isShopOwner && !isBarber && !isAdmin) {
            throw new ApiError('You are not authorized to delete this service', 403);
        }

        const success = await serviceService.deleteService(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Service deleted successfully'
            });
        } else {
            throw new ApiError('Service deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Approve or reject service (admin only)
 * @route PATCH /api/services/:id/approve
 * @access Private/Admin
 */
const approveRejectService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!status || !['active', 'rejected'].includes(status)) {
            throw new ApiError('Valid status (active or rejected) is required', 400);
        }

        if (status === 'rejected' && !rejectionReason) {
            throw new ApiError('Rejection reason is required', 400);
        }

        const service = await serviceService.approveRejectService(id, status, rejectionReason);

        res.status(200).json({
            success: true,
            message: `Service ${status === 'active' ? 'approved' : 'rejected'} successfully`,
            data: service
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get services by barber
 * @route GET /api/services/barber/:barberId
 * @access Public
 */
const getServicesByBarber = async (req, res, next) => {
    try {
        const { barberId } = req.params;
        const { category, sortBy, sortOrder } = req.query;

        const options = {
            category,
            sortBy,
            sortOrder
        };

        const services = await serviceService.getServicesByBarber(barberId, options);

        res.status(200).json({
            success: true,
            data: services
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get services by shop
 * @route GET /api/services/shop/:shopId
 * @access Public
 */
const getServicesByShop = async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { page, limit, status, type, category, search, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            status,
            type,
            category,
            search,
            sortBy,
            sortOrder,
            shopId
        };

        const result = await serviceService.getAllServices(options);

        res.status(200).json({
            success: true,
            data: result.services,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                pages: result.pages
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get service categories
 * @route GET /api/services/categories
 * @access Public
 */
const getServiceCategories = async (req, res, next) => {
    try {
        const categories = await serviceService.getServiceCategories();

        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Search services
 * @route GET /api/services/search
 * @access Public
 */
const searchServices = async (req, res, next) => {
    try {
        const { query, type, category, minPrice, maxPrice, shopId, barberId, page, limit, sortBy, sortOrder, lat, long } = req.query;

        const options = {
            query,
            type,
            category,
            minPrice,
            maxPrice,
            shopId,
            barberId,
            page,
            limit,
            sortBy,
            sortOrder,
            lat,
            long
        };

        const result = await serviceService.searchServices(options);

        res.status(200).json({
            success: true,
            data: result.services,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get popular services
 * @route GET /api/services/popular
 * @access Public
 */
const getPopularServices = async (req, res, next) => {
    try {
        const { limit } = req.query;
        const services = await serviceService.getPopularServices(limit);

        res.status(200).json({
            success: true,
            data: services
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get providers for a specific service
 * @route GET /api/services/:serviceId/providers
 * @access Public
 */
const getServiceProviders = async (req, res, next) => {
    try {
        const { serviceId } = req.params;
        const { lat, long, type } = req.query;

        if (!lat || !long) {
            throw new ApiError('Latitude and longitude are required', 400);
        }

        // If type is missing, fetch all providers (homeBased, shopBased, shops)
        const options = {
            lat: parseFloat(lat),
            long: parseFloat(long),
            type: type && ['homeBased', 'shopBased'].includes(type) ? type : undefined,
            includeSlots: false  // Skip slot calculation in main query for better performance
        };

        const { providers = [], slots = {} } = await serviceService.getServiceProviders(serviceId, options) || {};

        // Separate shops and other providers
        const shops = providers.filter(p => p?.providerType === 'shop') || [];
        const otherProviders = providers.filter(p => p?.providerType !== 'shop') || [];

        // Fetch barbers for all shops
        const shopBarbersPromises = shops.map(shop =>
            Barber.find({ shopId: shop._id, status: 'active' })
                .select('uid firstName lastName profile services location status serviceType employmentType rating reviewCount')
                .populate('userId', 'email phoneNumber')
                .limit(20)  // Limit barbers per shop for performance
        );
        const shopBarbersResults = await Promise.all(shopBarbersPromises);

        // Map shops with their barbers
        const shopsWithBarbers = shops.map((shop, index) => {
            let shopOwnerData = null;
            if (shop.ownerId && shop.ownerId._id) {
                shopOwnerData = {
                    id: shop.ownerId._id,
                    email: shop.ownerId.email,
                    firstName: shop.ownerId.firstName,
                    lastName: shop.ownerId.lastName,
                    fullName: `${shop.ownerId.firstName} ${shop.ownerId.lastName}`,
                    phone: shop.ownerId.phoneNumber
                };
            }
            const barbersData = shopBarbersResults[index].map((barber) => {
                return {
                    id: barber._id,
                    uid: barber.uid,
                    firstName: barber.firstName,
                    lastName: barber.lastName,
                    fullName: `${barber.firstName} ${barber.lastName}`,
                    phone: barber.userId?.phoneNumber || barber.profile?.phoneNumber,
                    status: barber.status,
                    serviceType: barber.serviceType,
                    rating: barber.rating,
                    reviewCount: barber.reviewCount
                };
            });

            return {
                provider: {
                    id: shop._id,
                    uid: shop.uid,
                    type: "shop",
                    name: shop.name,
                    email: shop.email,
                    phone: shop.phone,
                    address: shop.address,
                    rating: shop.rating,
                    reviewCount: shop.reviewCount,
                    description: shop.description,
                    images: shop.images || [],
                    mainImage: shop.mainImage,
                    serviceType: "shopBased",
                    location: {
                        latitude: shop.latitude,
                        longitude: shop.longitude
                    },
                    shopOwner: shopOwnerData,
                    user: shopOwnerData ? {
                        firstName: shopOwnerData.firstName,
                        lastName: shopOwnerData.lastName,
                        fullName: shop.name,
                        phone: shopOwnerData.phone
                    } : null,
                    barbers: barbersData,
                    status: shop.status || "active",
                    shopId: shop._id
                },
                service: {
                    id: serviceId,
                    customPrice: shop.customPrice,
                    customDuration: shop.customDuration
                },
                distance: shop.distance
            };
        });

        // Map other providers (freelancers/barbers)
        const otherProvidersMapped = otherProviders.map(p => {
            return {
                provider: {
                    id: p._id,
                    uid: p.uid,
                    type: "freelancer",
                    name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
                    email: p.email,
                    phone: p.phone || p.profile?.phoneNumber,
                    address: p.address || p.profile?.address,
                    rating: p.rating,
                    reviewCount: p.reviewCount,
                    description: p.bio || p.description || "",
                    images: p.images || [],
                    mainImage: p.mainImage || p.profileImage,
                    serviceType: "homeBased",
                    location: {
                        latitude: p.latitude || p.profile?.location?.latitude,
                        longitude: p.longitude || p.profile?.location?.longitude
                    },
                    shopOwner: null,
                    user: {
                        firstName: p.firstName,
                        lastName: p.lastName,
                        fullName: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
                        phone: p.phone || p.profile?.phoneNumber
                    },
                    barbers: [],
                    status: p.status || "active",
                    shopId: null
                },
                service: {
                    id: serviceId,
                    customPrice: p.customPrice,
                    customDuration: p.customDuration
                },
                distance: p.distance
            };
        });

        // Combine all providers
        const allProviders = [...shopsWithBarbers, ...otherProvidersMapped];

        // Sort by distance
        allProviders.sort((a, b) => a.distance - b.distance);

        res.status(200).json({
            success: true,
            count: allProviders.length,
            providers: allProviders
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all services from nearby providers within 50km
 * @route GET /api/services/nearby/services?lat=:lat&long=:long
 * @access Public
 */
const getNearbyServices = async (req, res, next) => {
    try {
        const { lat, long } = req.query;

        if (!lat || !long) {
            throw new ApiError('Latitude and longitude are required', 400);
        }

        const options = {
            lat: parseFloat(lat),
            long: parseFloat(long)
        };

        const services = await serviceService.getNearbyServices(options);

        res.status(200).json({
            success: true,
            count: services.length,
            data: services
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllServices,
    getServiceById,
    getServiceByUid,
    createService,
    updateService,
    deleteService,
    approveRejectService,
    getServicesByBarber,
    getServicesByShop,
    getServiceCategories,
    searchServices,
    getPopularServices,
    getServiceProviders,
    getNearbyServices
};