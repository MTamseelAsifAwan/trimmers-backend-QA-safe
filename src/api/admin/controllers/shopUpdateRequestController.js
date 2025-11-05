// src/api/admin/controllers/shopUpdateRequestController.js
const ShopUpdateRequest = require('../../../models/ShopUpdateRequest');
const Shop = require('../../../models/Shop');
const shopService = require('../../../services/shopService');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../utils/logger');

/**
 * Get all pending shop update requests
 * @route GET /api/admin/shop-update-requests
 * @access Private/Admin
 */
const getPendingUpdateRequests = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status = 'pending', sortBy = 'requestedAt', sortOrder = 'desc' } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const filter = {};
        if (status) {
            filter.status = status;
        }

        const total = await ShopUpdateRequest.countDocuments(filter);
        
        const requests = await ShopUpdateRequest.find(filter)
            .populate('shopId', 'name address uid')
            .populate('shopOwnerId', 'firstName lastName email')
            .populate('reviewedBy', 'firstName lastName')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get specific shop update request
 * @route GET /api/admin/shop-update-requests/:id
 * @access Private/Admin
 */
const getUpdateRequestById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const request = await ShopUpdateRequest.findById(id)
            .populate('shopId')
            .populate('shopOwnerId', 'firstName lastName email')
            .populate('reviewedBy', 'firstName lastName');

        if (!request) {
            throw new ApiError('Update request not found', 404);
        }

        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Approve shop update request
 * @route POST /api/admin/shop-update-requests/:id/approve
 * @access Private/Admin
 */
const approveUpdateRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        
        const updateRequest = await ShopUpdateRequest.findById(id).populate('shopId');
        
        if (!updateRequest) {
            throw new ApiError('Update request not found', 404);
        }

        if (updateRequest.status !== 'pending') {
            throw new ApiError('Update request has already been processed', 400);
        }

        // Build update data from requested changes
        const updateData = {};
        updateRequest.requestedChanges.forEach((change, fieldName) => {
            updateData[fieldName] = change.newValue;
        });

        // Apply the changes to the shop
        await shopService.updateShop(updateRequest.shopId._id, updateData);

        // Update the request status
        updateRequest.status = 'approved';
        updateRequest.reviewedBy = req.user._id;
        updateRequest.reviewedAt = new Date();
        if (adminNotes) {
            updateRequest.reviewNotes = adminNotes;
        }
        
        await updateRequest.save();

        // Get the updated shop
        const updatedShop = await Shop.findById(updateRequest.shopId._id).populate('ownerId');

        logger.info(`Shop update request ${id} approved by admin ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: 'Shop update request approved successfully',
            data: {
                request: updateRequest,
                updatedShop: updatedShop
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject shop update request
 * @route POST /api/admin/shop-update-requests/:id/reject
 * @access Private/Admin
 */
const rejectUpdateRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejectionReason, adminNotes } = req.body;
        
        if (!rejectionReason) {
            throw new ApiError('Rejection reason is required', 400);
        }

        const updateRequest = await ShopUpdateRequest.findById(id);
        
        if (!updateRequest) {
            throw new ApiError('Update request not found', 404);
        }

        if (updateRequest.status !== 'pending') {
            throw new ApiError('Update request has already been processed', 400);
        }

        // Update the request status
        updateRequest.status = 'rejected';
        updateRequest.reviewedBy = req.user._id;
        updateRequest.reviewedAt = new Date();
        updateRequest.rejectionReason = rejectionReason;
        if (adminNotes) {
            updateRequest.reviewNotes = adminNotes;
        }
        
        await updateRequest.save();

        logger.info(`Shop update request ${id} rejected by admin ${req.user._id}: ${rejectionReason}`);

        res.status(200).json({
            success: true,
            message: 'Shop update request rejected successfully',
            data: updateRequest
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop update history
 * @route GET /api/admin/shops/:shopId/update-history
 * @access Private/Admin
 */
const getShopUpdateHistory = async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const total = await ShopUpdateRequest.countDocuments({ shopId });
        
        const history = await ShopUpdateRequest.find({ shopId })
            .populate('shopOwnerId', 'firstName lastName email')
            .populate('reviewedBy', 'firstName lastName')
            .sort({ requestedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: history,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPendingUpdateRequests,
    getUpdateRequestById,
    approveUpdateRequest,
    rejectUpdateRequest,
    getShopUpdateHistory
};