const { default: mongoose } = require("mongoose");
const { ApiError } = require("../../../middlewares/errorHandler");
const barberService = require("../../../services/barberService");
const { getServiceByShopId, createService, deleteService } = require("../../../services/serviceService");
const shopOwnerService = require("../../../services/shopOwnerService");
const shopService = require("../../../services/shopService");
const userService = require("../../../services/userService");

const { getBookingsByShop } = require("../../../services/bookingService");


const createProfile = async (req, res, next) => {
    try {
        let shopOwnerData = req.body;
        // Accept both form-data and JSON
        let businessLogoBlob = null;
        let businessRegistrationDocBlob = null;
        if (req.files) {
            businessLogoBlob = req.files.businessLogoBlob?.[0] || null;
            businessRegistrationDocBlob = req.files.businessRegistrationDocBlob?.[0] || null;
        } else {
            businessLogoBlob = shopOwnerData.businessLogoBlob || null;
            businessRegistrationDocBlob = shopOwnerData.businessRegistrationDocBlob || null;
        }

        if (!shopOwnerData.userId) {
            throw new ApiError('User ID is required', 400);
        }
        if (!shopOwnerData.businessName || !shopOwnerData.businessAddress || !shopOwnerData.businessPhone || !shopOwnerData.businessEmail) {
            throw new ApiError('Business details are required', 400);
        }
        shopOwnerData = {
            ...shopOwnerData,
            businessLogoBlob,
            businessRegistrationDocBlob,
        };
        const shopOwner = await shopOwnerService.createShopOwnerProfile(shopOwnerData.userId, shopOwnerData);

        res.status(201).json({
            success: true,
            message: 'Shop owner created successfully',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
}

const getShopOwnerProfile = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const shopOwner = await shopOwnerService.getShopOwnerByUserId(userId);
        res.status(200).json({
            success: true,
            message: 'Shop owner profile fetched successfully',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
}

const getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const shopOwner = await shopOwnerService.getShopOwnerByUserId(userId);

        if (!shopOwner) {
            return res.status(404).json({
                success: false,
                message: 'Shop owner profile not found. Please create your profile using POST /api/mobile/shop-owner/profile',
                data: null,
                profileRequired: true
            });
        }

        res.status(200).json({
            success: true,
            message: 'Shop owner profile fetched successfully',
            data: shopOwner
        });
    } catch (error) {
        // Handle specific error messages
        if (error.message === 'Shop owner profile not found') {
            return res.status(404).json({
                success: false,
                message: 'Shop owner profile not found. Please create your profile using POST /api/mobile/shop-owner/profile',
                data: null,
                profileRequired: true
            });
        }
        next(error);
    }
}

const addShopDetails = async (req, res, next) => {
    try {
        let shopData = req.body;
        const mainImageBlob = req.file;

        // Verify user is a shop owner
        if (req.user.role !== 'shop_owner') {
            throw new ApiError('Only shop owners can create shops', 403);
        }

        // Find shop owner profile in UserProfile
        const mongoose = require('mongoose');
        const UserProfile = mongoose.model('UserProfile');
        const ownerProfile = await UserProfile.findOne({ _id: req.user._id, profileType: 'shop_owner' });
        if (!ownerProfile) {
            throw new ApiError('Shop owner profile not found in UserProfile. Please create a profile first', 404);
        }

        const ownerId = ownerProfile._id;

        if (!shopData.areaId || !mongoose.Types.ObjectId.isValid(shopData.areaId)) {
            delete shopData.areaId;
        }

        shopData = {
            ...shopData,
            ownerId, // Use the UserProfile _id
            mainImageBlob,
            isVerified: req.body.isVerified !== undefined ? req.body.isVerified : true
        };
        const shop = await shopService.createShop(ownerId, shopData);
        res.status(200).json({
            success: true,
            message: 'Shop details added successfully',
            data: shop
        });
    } catch (error) {
        next(error);
    }
}

const deleteShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        await shopService.deleteShop(id);
        res.status(200).json({
            success: true,
            message: 'Shop deleted successfully'
        });
    } catch (error) {
        next(error);
    }
}

const viewShopDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shop = await shopService.getShopById(id);
        if (!shop) {
            throw new ApiError('Shop not found', 404);
        }
        res.status(200).json({
            success: true,
            data: shop
        });
    } catch (error) {
        next(error);
    }
}

const createBarber = async (req, res, next) => {
    try {
        const {
            // User account info
            email,
            password,
            firstName,
            lastName,
            phoneNumber,

            // Barber profile info
            specialization,
            employmentType,
            shopId,
            bio,
            location,
            services,
            servicingArea,
            countryId,
            profileImage,

            // National ID info (optional)
            nationalId
        } = req.body;
        const { profileImageBlob, idImageBlob } = req.files;
        // Create user account first with barber role
        const userData = {
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            role: 'barber',
            emailVerified: true // Admin-created accounts are verified by default
        };

        let user;
        try {
            user = await userService.createUser(userData);
            req.createdUserId = user._id; // Store ID for cleanup if needed
        } catch (error) {
            throw new Error(`User creation failed: ${error.message}`);
        }

        // Create barber profile
        const barberData = {
            specialization,
            employmentType,
            shopId,
            bio,
            location,
            services,
            servicingArea,
            countryId,
            profileImage,
            profileImageBlob: profileImageBlob?.[0],
            idImageBlob: idImageBlob?.[0],
            nationalId,
            status: 'active', // Admin-created barbers are active by default
            verificationStatus: nationalId ? 'verified' : 'pending' // Auto-verify if ID is provided
        };

        const barber = await barberService.createBarberProfile(user._id, barberData);

        res.status(201).json({
            success: true,
            message: 'Barber account created successfully',
            data: {
                user,
                barber
            }
        });
    } catch (error) {
        if (error.message.includes('Barber profile') && req.createdUserId) {
            try {
                await userService.deleteUser(req.createdUserId);
            } catch (cleanupError) {
                logger.error(`Cleanup error: ${cleanupError.message}`);
            }
        }

        next(error);
    }
}

const addBarberAgainstShop = async (req, res, next) => {
    try {
        const { shop_id, barber_id } = req.body;
        if (!shop_id || !barber_id) {
            throw new ApiError('Shop ID and Barber ID are required', 400);
        }
        const updatedShop = await shopService.addBarberToShop(shop_id, barber_id);
        res.status(200).json({
            success: true,
            message: 'Barber added to shop successfully',
            data: updatedShop
        });
    } catch (error) {
        next(error);
    }
}

// Get bookings by shop id 
const getShopBookings = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page, limit, status, date, barberId, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            status,
            date,
            barberId,
            sortBy,
            sortOrder
        };

        const bookings = await getBookingsByShop(id, options);
        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        next(error);
    }
}

const removeBarberFromShop = async (req, res, next) => {
    try {
        const { shop_id, barber_id } = req.params;
        if (!shop_id || !barber_id) {
            throw new ApiError('Shop ID and Barber ID are required', 400);
        }
        const updatedShop = await shopService.removeBarberFromShop(shop_id, barber_id);
        res.status(200).json({
            success: true,
            message: 'Barber removed from shop successfully',
            data: updatedShop
        });
    } catch (error) {
        next(error);
    }
}

const viewBarberDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError('Barber ID is required', 400);
        }
        const barberDetails = await barberService.getBarberById(id);
        if (!barberDetails) {
            throw new ApiError('Barber not found', 404);
        }
        res.status(200).json({
            success: true,
            data: barberDetails
        });
    } catch (error) {
        next(error);
    }
}

const addServices = async (req, res, next) => {
    try {
        const shopId = req.params.id;
        const services = req.body;
        // if (!shopId || !Array.isArray(services) || services.length === 0) {
        //     throw new ApiError('Shop ID and services are required', 400);
        // }
        const updatedShop = await createService(services, { shopId });
        res.status(200).json({
            success: true,
            message: 'Services added successfully',
            data: updatedShop
        });
    } catch (error) {
        next(error);
    }
}

const viewServices = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError('Shop ID is required', 400);
        }
        const services = await getServiceByShopId(id);
        if (!services || services.length === 0) {
            throw new ApiError('No services found for this shop', 404);
        }
        res.status(200).json({
            success: true,
            data: services
        });
    } catch (error) {
        next(error);
    }
}

const removeService = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError('Service ID is required', 400);
        }
        await deleteService(id);
        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        next(error);
    }
}

const getBarbers = async (req, res, next) => {
    try {
        // Verify user is a shop owner
        if (req.user.role !== 'shop_owner') {
            throw new ApiError('Only shop owners can view barbers', 403);
        }

        // Find shop owner profile in UserProfile
        const mongoose = require('mongoose');
        const UserProfile = mongoose.model('UserProfile');
        const ownerProfile = await UserProfile.findOne({ _id: req.user._id, profileType: 'shop_owner' });
        if (!ownerProfile) {
            throw new ApiError('Shop owner profile not found in UserProfile. Please create a profile first', 404);
        }

        // Find the ShopOwner document
        const shopOwner = await shopOwnerService.getShopOwnerByUserId(ownerProfile._id);
        if (!shopOwner) {
            throw new ApiError('Shop owner not found', 404);
        }

        // Get shop owner's shops
        const shops = await shopService.getShops({ ownerId: shopOwner._id });
        if (!shops.shops || shops.shops.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No shops found for this shop owner',
                data: []
            });
        }

        // Get barbers for all shops owned by this shop owner
        const shopIds = shops.shops.map(shop => shop._id);
        const { page, limit, status, search, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            status,
            search,
            sortBy,
            sortOrder
        };

        // Get barbers for these shops
        let allBarbers = [];
        for (const shopId of shopIds) {
            const barbers = await barberService.getBarbersByShop(shopId, options);
            allBarbers = allBarbers.concat(barbers);
        }

        // Remove duplicates if any
        const uniqueBarbers = allBarbers.filter((barber, index, self) => 
            index === self.findIndex(b => b._id.toString() === barber._id.toString())
        );

        res.status(200).json({
            success: true,
            message: 'Barbers fetched successfully',
            data: uniqueBarbers
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createProfile,
    getShopOwnerProfile,
    getMyProfile,
    addShopDetails,
    getShopBookings,
    deleteShop,
    viewShopDetails,
    addBarberAgainstShop,
    removeBarberFromShop,
    viewBarberDetails,
    addServices,
    viewServices,
    removeService,
    createBarber,
    getBarbers
};