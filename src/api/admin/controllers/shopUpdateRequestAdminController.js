// src/api/admin/controllers/shopUpdateRequestAdminController.js
const shopUpdateRequestService = require('../../../services/shopUpdateRequestService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all shop update requests with filtering and pagination
 * @route GET /api/admin/shop-updates
 * @access Admin only
 */
const getShopUpdateRequests = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            shopId,
            shopOwnerId,
            priority,
            sortBy = 'requestedAt',
            sortOrder = 'desc'
        } = req.query;

        const result = await shopUpdateRequestService.getPendingRequests({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            shopId,
            shopOwnerId,
            priority,
            sortBy,
            sortOrder
        });

        res.status(200).json({
            success: true,
            data: result.requests,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get a specific shop update request by ID
 * @route GET /api/admin/shop-updates/:id
 * @access Admin only
 */
const getShopUpdateRequestById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const request = await shopUpdateRequestService.getRequestById(id);

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Approve a shop update request
 * @route PUT /api/admin/shop-updates/:id/approve
 * @access Admin only
 */
const approveShopUpdateRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reviewNotes } = req.body;
        const adminId = req.user._id;

        const request = await shopUpdateRequestService.approveRequest(id, adminId, reviewNotes);

        res.status(200).json({
            success: true,
            message: 'Shop update request approved and changes applied successfully',
            data: request
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject a shop update request
 * @route PUT /api/admin/shop-updates/:id/reject
 * @access Admin only
 */
const rejectShopUpdateRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reviewNotes } = req.body;
        const adminId = req.user._id;

        if (!reviewNotes || reviewNotes.trim() === '') {
            return next(new ApiError('Review notes are required when rejecting a request', 400));
        }

        const request = await shopUpdateRequestService.rejectRequest(id, adminId, reviewNotes);

        res.status(200).json({
            success: true,
            message: 'Shop update request rejected',
            data: request
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop update request statistics
 * @route GET /api/admin/shop-updates/stats
 * @access Admin only
 */
const getShopUpdateRequestStats = async (req, res, next) => {
    try {
        const ShopUpdateRequest = require('../../../models/ShopUpdateRequest');

        const stats = await ShopUpdateRequest.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsObject = {
            pending: 0,
            approved: 0,
            rejected: 0
        };

        stats.forEach(stat => {
            statsObject[stat._id] = stat.count;
        });

        // Get recent requests (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentRequests = await ShopUpdateRequest.countDocuments({
            requestedAt: { $gte: sevenDaysAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                ...statsObject,
                recentRequests
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getShopUpdateRequests,
    getShopUpdateRequestById,
    approveShopUpdateRequest,
    rejectShopUpdateRequest,
    getShopUpdateRequestStats
};