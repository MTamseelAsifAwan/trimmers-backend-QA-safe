const shopJoinRequestService = require('../../../services/shopJoinRequestService');
const { ApiError } = require('../../../middlewares/errorHandler');

module.exports = {
    async listShops(req, res, next) {
            try {
                // Delegate to shopService.getShops for consistent logic
                const shopService = require('../../../services/shopService');
                // Pass query params for pagination, filtering, etc.
                const { page, limit, isVerified, isActive, ownerId, countryId, search, sortBy, sortOrder } = req.query;

                const options = {
                    page,
                    limit,
                    isVerified: isVerified === 'true',
                    isActive: isActive === 'true',
                    ownerId,
                    countryId,
                    search,
                    sortBy,
                    sortOrder
                };

                const result = await shopService.getShops(options);
                res.json({ success: true, data: result.shops, pagination: result.pagination });
            } catch (err) {
                next(err);
            }
    },

    async sendJoinRequest(req, res, next) {
        try {
            const { shopId, message } = req.body;
            const userId = req.user._id; // User ID from auth middleware
            const request = await shopJoinRequestService.createJoinRequest(userId, shopId, message);
            res.json({ success: true, data: request });
        } catch (err) {
            next(err);
        }
    },

    async getRequestsForShopOwner(req, res, next) {
        try {
            const shopOwnerId = req.user._id;
            const requests = await shopJoinRequestService.getRequestsForShopOwner(shopOwnerId);
            res.json({ success: true, data: requests });
        } catch (err) {
            next(err);
        }
    },

    async getRequestsForAdmin(req, res, next) {
        try {
            const requests = await shopJoinRequestService.getRequestsForAdmin();
            res.json({ success: true, data: requests });
        } catch (err) {
            next(err);
        }
    },

    async reviewRequest(req, res, next) {
        try {
            const { requestId, status } = req.body;

            // Convert user-friendly status to internal status
            let internalStatus;
            if (status === 'approve') {
                internalStatus = 'linked';
            } else if (status === 'reject') {
                internalStatus = 'unlinked';
            } else {
                // If already using internal status, use as-is
                internalStatus = status;
            }

            const reviewerId = req.user._id;
            const request = await shopJoinRequestService.reviewRequest(requestId, internalStatus, reviewerId);
            res.json({ success: true, data: request });
        } catch (err) {
            next(err);
        }
    },

    async getRequestsForFreelancer(req, res, next) {
        try {
            const freelancerId = req.user._id;
            const requests = await shopJoinRequestService.getRequestsForFreelancer(freelancerId);
            res.json({ success: true, data: requests });
        } catch (err) {
            next(err);
        }
    },

    async unlinkFromShop(req, res, next) {
        try {
            const userId = req.user._id;
            const request = await shopJoinRequestService.unlinkFromShop(userId);
            res.json({ success: true, data: request, message: 'Successfully unlinked from shop' });
        } catch (err) {
            next(err);
        }
    }
};
