// src/api/admin/controllers/shopAdminController.js
const shopService = require('../../../services/shopService');
const barberService = require('../../../services/barberService');
const serviceService = require('../../../services/serviceService');
const bookingService = require('../../../services/bookingService');
const notificationService = require('../../../services/notificationService');
const shopJoinRequestService = require('../../../services/shopJoinRequestService');
const { ApiError } = require('../../../middlewares/errorHandler');
const { default: mongoose } = require('mongoose');
const Shop = require('../../../models/Shop');

/**
 * Create a new shop
 * @route POST /api/admin/shops
 * @access Private/Admin
 */
const createShop = async (req, res, next) => {
    try {
        const { ownerId } = req.body;
        const mainImageBlob = req.file;

        const payload = req.body;

        if (!payload.areaId || !mongoose.Types.ObjectId.isValid(payload.areaId)) {
            delete payload.areaId; // Remove invalid areaId
        }
        // Admin can directly create verified shops
        const shopData = {
            ...payload,
            mainImageBlob,
            services: payload.services || [], // Default to empty array if no services provided
            isVerified: req.body.isVerified !== undefined ? req.body.isVerified : true
        };

        const shop = await shopService.createShop(ownerId, shopData);

        // // Send notification to shop owner
        // await notificationService.createNotification({
        //     userId: shop.ownerId.userId, // assuming shop owner object has userId field
        //     title: 'New Shop Created',
        //     message: `An admin has created a new shop for you: "${shop.name}"`,
        //     type: 'system',
        //     relatedId: shop._id,
        //     onModel: 'Shop'
        // });

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
 * Get all shops with pagination, filtering and sorting
 * @route GET /api/admin/shops
 * @access Private/Admin
 */
const getAllShops = async (req, res, next) => {
    try {
        const { page, limit, isVerified, isActive, ownerId, unassigned, search, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : isVerified,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : isActive,
            ownerId,
            unassigned,
            search,
            sortBy,
            sortOrder
        };

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
 * @route GET /api/admin/shops/:id
 * @access Private/Admin
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
 * Update shop
 * @route PUT /api/admin/shops/:id
 * @access Private/Admin
 */
const updateShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const mainImageBlob = req.file;

        const payload = req.body;

        if (!payload.areaId || !mongoose.Types.ObjectId.isValid(payload.areaId)) {
            delete payload.areaId; // Remove invalid areaId
        }

        const shopData = {
            ...payload,
            mainImageBlob
        };

        const updatedShop = await shopService.updateShop(id, shopData);

        res.status(200).json({
            success: true,
            message: 'Shop updated successfully',
            data: updatedShop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete shop
 * @route DELETE /api/admin/shops/:id
 * @access Private/Admin
 */
const deleteShop = async (req, res, next) => {
    try {
        const { id } = req.params;
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
 * Verify shop
 * @route PATCH /api/admin/shops/:id/verify
 * @access Private/Admin
 */
const verifyShop = async (req, res, next) => {
    try {
        const { id } = req.params;

        // First get shop to get owner ID for notification
        const shop = await shopService.getShopById(id);
        const ownerId = shop.ownerId ? shop.ownerId._id : null;

        // Update shop verification status
        const updatedShop = await shopService.verifyShop(id, true);

        // // Send notification to shop owner
        // if (ownerId) {
        //     await notificationService.createNotification({
        //         userId: shop.ownerId.userId, // assuming shop owner object has userId field
        //         title: 'Shop Verified',
        //         message: `Your shop "${shop.name}" has been verified and is now visible to customers.`,
        //         type: 'system',
        //         relatedId: shop._id,
        //         onModel: 'Shop'
        //     });
        // }

        res.status(200).json({
            success: true,
            message: 'Shop verified successfully',
            data: updatedShop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject shop verification
 * @route PATCH /api/admin/shops/:id/reject
 * @access Private/Admin
 */
const rejectShop = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw new ApiError('Rejection reason is required', 400);
        }

        // First get shop to get owner ID for notification
        const shop = await shopService.getShopById(id);
        const ownerId = shop.ownerId ? shop.ownerId._id : null;

        // Update shop (set isVerified to false and add rejection reason)
        const Shop = require('../../../models/Shop');
        const updatedShop = await Shop.findByIdAndUpdate(
            id,
            { 
                isVerified: false, 
                rejectionReason: reason,
                verifiedAt: new Date(),
                verifiedBy: req.user.id // Assuming req.user is set by auth middleware
            },
            { new: true }
        );

        if (!updatedShop) {
            throw new ApiError('Shop not found', 404);
        }

        // Send notification to shop owner
        if (ownerId) {
            await notificationService.createNotification({
                userId: shop.ownerId.userId, // assuming shop owner object has userId field
                title: 'Shop Verification Rejected',
                message: `Your shop "${shop.name}" verification has been rejected. Reason: ${reason}`,
                type: 'system',
                relatedId: shop._id,
                onModel: 'Shop'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Shop verification rejected',
            data: updatedShop
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending shops
 * @route GET /api/admin/shops/pending/list
 * @access Private/Admin
 */
const getPendingShops = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit,
            isVerified: false,
            sortBy: 'createdAt',
            sortOrder: 'asc'
        };

        const result = await shopService.getShops(options);
        console.log('getPendingShops result:', result);

        res.status(200).json({
            success: true,
            data: result.shops || [],
            pagination: result.pagination || { total: 0, page: 1, limit: 10, pages: 0 }
        });
    } catch (error) {
        console.log('getPendingShops error:', error);
        next(error);
    }
};

/**
 * Get shop barbers
 * @route GET /api/admin/shops/:id/barbers
 * @access Private/Admin
 */
const getShopBarbers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.query;

        const options = { status };
        const barbers = await barberService.getBarbersByShop(id, options);

        res.status(200).json({
            success: true,
            data: barbers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop services
 * @route GET /api/admin/shops/:id/services
 * @access Private/Admin
 */
const getShopServices = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, category, sortBy, sortOrder } = req.query;

        const options = {
            status,
            category,
            sortBy,
            sortOrder
        };

        const services = await serviceService.getServicesByShop(id, options);

        res.status(200).json({
            success: true,
            data: services
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop bookings
 * @route GET /api/admin/shops/:id/bookings
 * @access Private/Admin
 */
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

        const result = await bookingService.getBookingsByShop(id, options);

        res.status(200).json({
            success: true,
            data: result.bookings,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

const getShopJoinRequests = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            shopId,
            userId
        } = req.query;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            search,
            shopId,
            userId
        };

        const result = await shopJoinRequestService.getRequestsForAdmin(options);

        res.status(200).json({
            success: true,
            data: result.requests,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

const approveShopJoinRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reviewerId = req.user._id;

        const request = await shopJoinRequestService.reviewRequest(id, 'approved', reviewerId);

        res.status(200).json({
            success: true,
            message: 'Shop join request approved successfully',
            data: request
        });
    } catch (error) {
        next(error);
    }
};

const rejectShopJoinRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const reviewerId = req.user._id;

        const request = await shopJoinRequestService.reviewRequest(id, 'rejected', reviewerId);

        res.status(200).json({
            success: true,
            message: 'Shop join request rejected successfully',
            data: request
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createShop,
    getAllShops,
    getShopById,
    updateShop,
    deleteShop,
    verifyShop,
    rejectShop,
    getPendingShops,
    getShopBarbers,
    getShopServices,
    getShopBookings,
    getShopJoinRequests,
    approveShopJoinRequest,
    rejectShopJoinRequest
};