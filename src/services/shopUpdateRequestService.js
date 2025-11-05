// src/services/shopUpdateRequestService.js
const ShopUpdateRequest = require('../models/ShopUpdateRequest');
const Shop = require('../models/Shop');
const { User } = require('../models/User');
const shopService = require('./shopService');
const notificationService = require('./notificationService');
const { ApiError } = require('../middlewares/errorHandler');

const shopUpdateRequestService = {
    /**
     * Create a new shop update request
     * @param {string} shopOwnerId - ID of the shop owner making the request
     * @param {string} shopId - ID of the shop to be updated
     * @param {Object} requestedChanges - Map of changes with fieldName, oldValue, newValue, fieldType
     * @param {string} priority - Priority level (low, medium, high)
     * @returns {Object} Created request
     */
    async createRequest(shopOwnerId, shopId, requestedChanges, priority = 'medium') {
        console.log('[SHOP UPDATE SERVICE] Creating request:', {
            shopOwnerId,
            shopId,
            changesCount: requestedChanges.size,
            priority
        });

        // Validate shop ownership
        const shop = await Shop.findById(shopId);
        if (!shop) {
            throw new ApiError('Shop not found', 404);
        }

        if (shop.ownerId.toString() !== shopOwnerId.toString()) {
            throw new ApiError('You do not own this shop', 403);
        }

        console.log('[SHOP UPDATE SERVICE] Shop validation passed, creating request...');

        // Create the request
        const request = await ShopUpdateRequest.create({
            shopOwnerId,
            shopId,
            requestedChanges,
            priority
        });

        console.log('[SHOP UPDATE SERVICE] Request created with ID:', request._id);
        console.log('[SHOP UPDATE SERVICE] Request details:', {
            uid: request.uid,
            status: request.status,
            changesCount: Object.keys(request.requestedChanges || {}).length
        });

        // Notify admins about the new request
        await this._notifyAdminsOfNewRequest(request);

        return request;
    },

    /**
     * Get pending requests for admin review
     * @param {Object} options - Query options
     * @returns {Object} Paginated results
     */
    async getPendingRequests(options = {}) {
        const {
            page = 1,
            limit = 10,
            shopId,
            shopOwnerId,
            priority,
            sortBy = 'requestedAt',
            sortOrder = 'desc'
        } = options;

        // Build query
        const query = { status: 'pending' };
        if (shopId) query.shopId = shopId;
        if (shopOwnerId) query.shopOwnerId = shopOwnerId;
        if (priority) query.priority = priority;

        const skip = (page - 1) * limit;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const requests = await ShopUpdateRequest.find(query)
            .populate({
                path: 'shopOwnerId',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'shopId',
                select: 'name address city uid'
            })
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await ShopUpdateRequest.countDocuments(query);

        return {
            requests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Approve a shop update request and apply changes
     * @param {string} requestId - ID of the request to approve
     * @param {string} adminId - ID of the admin approving
     * @param {string} reviewNotes - Optional review notes
     * @returns {Object} Updated request
     */
    async approveRequest(requestId, adminId, reviewNotes = '') {
        const request = await ShopUpdateRequest.findById(requestId);
        if (!request) {
            throw new ApiError('Update request not found', 404);
        }

        if (request.status !== 'pending') {
            throw new ApiError('Request has already been reviewed', 400);
        }

        // Apply the changes to the shop
        await this._applyChangesToShop(request);

        // Update request status
        request.status = 'approved';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        request.reviewNotes = reviewNotes;
        await request.save();

        // Notify shop owner
        await this._notifyShopOwner(request, 'approved');

        return request;
    },

    /**
     * Reject a shop update request
     * @param {string} requestId - ID of the request to reject
     * @param {string} adminId - ID of the admin rejecting
     * @param {string} reviewNotes - Review notes explaining rejection
     * @returns {Object} Updated request
     */
    async rejectRequest(requestId, adminId, reviewNotes) {
        const request = await ShopUpdateRequest.findById(requestId);
        if (!request) {
            throw new ApiError('Update request not found', 404);
        }

        if (request.status !== 'pending') {
            throw new ApiError('Request has already been reviewed', 400);
        }

        if (!reviewNotes || reviewNotes.trim() === '') {
            throw new ApiError('Review notes are required when rejecting a request', 400);
        }

        // Update request status
        request.status = 'rejected';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date();
        request.reviewNotes = reviewNotes;
        await request.save();

        // Notify shop owner
        await this._notifyShopOwner(request, 'rejected');

        return request;
    },

    /**
     * Get update requests by shop owner (Frontend-optimized response)
     * @param {string} shopOwnerId - ID of the shop owner
     * @param {Object} options - Query options
     * @returns {Object} Frontend-friendly requests data
     */
    async getRequestsByShopOwner(shopOwnerId, options = {}) {
        const {
            status,
            page = 1,
            limit = 10
        } = options;

        const query = { shopOwnerId };
        if (status) query.status = status;

        const skip = (page - 1) * limit;

        const requests = await ShopUpdateRequest.find(query)
            .populate({
                path: 'shopId',
                select: 'name address city'
            })
            .populate({
                path: 'reviewedBy',
                select: 'firstName lastName'
            })
            .sort({ requestedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await ShopUpdateRequest.countDocuments(query);

        // Transform to frontend-friendly format
        const simplifiedRequests = requests.map(request => ({
            id: request._id,
            uid: request.uid,
            shop: {
                id: request.shopId?._id,
                name: request.shopId?.name || 'Unknown Shop',
                address: request.shopId?.address || '',
                city: request.shopId?.city || ''
            },
            status: request.status,
            priority: request.priority,
            requestedAt: request.requestedAt,
            reviewedAt: request.reviewedAt,
            reviewNotes: request.reviewNotes,
            // Simplified changes for frontend display
            changesSummary: this._summarizeChanges(request.requestedChanges),
            // Count of changes
            changesCount: Object.keys(request.requestedChanges || {}).length
        }));

        return {
            requests: simplifiedRequests,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Summarize changes for frontend display (internal method)
     * @param {Map} requestedChanges - The requested changes map
     * @returns {Array} Simplified changes array
     * @private
     */
    _summarizeChanges(requestedChanges) {
        if (!requestedChanges) return [];

        const summaries = [];

        for (const [fieldName, change] of Object.entries(requestedChanges)) {
            let displayName = fieldName;
            let oldDisplay = change.oldValue;
            let newDisplay = change.newValue;

            // Human-readable field names
            switch (fieldName) {
                case 'name':
                    displayName = 'Shop Name';
                    break;
                case 'address':
                    displayName = 'Address';
                    break;
                case 'phone':
                    displayName = 'Phone';
                    break;
                case 'email':
                    displayName = 'Email';
                    break;
                case 'latitude':
                    displayName = 'Latitude';
                    oldDisplay = change.oldValue ? parseFloat(change.oldValue).toFixed(6) : 'Not set';
                    newDisplay = parseFloat(change.newValue).toFixed(6);
                    break;
                case 'longitude':
                    displayName = 'Longitude';
                    oldDisplay = change.oldValue ? parseFloat(change.oldValue).toFixed(6) : 'Not set';
                    newDisplay = parseFloat(change.newValue).toFixed(6);
                    break;
                case 'openingHours':
                    displayName = 'Opening Hours';
                    oldDisplay = 'Previous schedule';
                    newDisplay = 'Updated schedule';
                    break;
                default:
                    displayName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
            }

            summaries.push({
                field: displayName,
                oldValue: oldDisplay,
                newValue: newDisplay,
                type: change.fieldType
            });
        }

        return summaries;
    },

    /**
     * Get request by ID with full details
     * @param {string} requestId - Request ID
     * @returns {Object} Request details
     */
    async getRequestById(requestId) {
        const request = await ShopUpdateRequest.findById(requestId)
            .populate({
                path: 'shopOwnerId',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'shopId',
                select: 'name address city uid'
            })
            .populate({
                path: 'reviewedBy',
                select: 'firstName lastName'
            })
            .lean();

        if (!request) {
            throw new ApiError('Update request not found', 404);
        }

        return request;
    },

    /**
     * Apply changes to shop (internal method)
     * @param {Object} request - The update request
     * @private
     */
    async _applyChangesToShop(request) {
        const shop = await Shop.findById(request.shopId);
        if (!shop) {
            throw new ApiError('Shop not found', 404);
        }

        const updates = {};

        // Apply each requested change
        for (const [fieldName, change] of request.requestedChanges) {
            updates[fieldName] = change.newValue;
        }

        // Update the shop
        await shopService.updateShop(request.shopId, updates);
    },

    /**
     * Notify admins of new request (internal method)
     * @param {Object} request - The new request
     * @private
     */
    async _notifyAdminsOfNewRequest(request) {
        try {
            // Get all admin users
            const admins = await User.find({ role: 'admin', isActive: true });

            const shop = await Shop.findById(request.shopId).select('name');
            const shopOwner = await User.findById(request.shopOwnerId).select('firstName lastName');

            const ownerName = `${shopOwner.firstName || ''} ${shopOwner.lastName || ''}`.trim() || 'A shop owner';

            // Notify each admin
            for (const admin of admins) {
                await notificationService.createNotification({
                    userId: admin._id,
                    title: 'New Shop Update Request',
                    message: `${ownerName} has requested updates for shop: ${shop.name}`,
                    type: 'system',
                    relatedId: request._id,
                    onModel: 'ShopUpdateRequest'
                });
            }
        } catch (error) {
            console.error('Error notifying admins of new request:', error);
            // Don't throw error - notification failure shouldn't block request creation
        }
    },

    /**
     * Notify shop owner of request status change (internal method)
     * @param {Object} request - The request
     * @param {string} status - 'approved' or 'rejected'
     * @private
     */
    async _notifyShopOwner(request, status) {
        try {
            const shop = await Shop.findById(request.shopId).select('name');

            let title, message;
            if (status === 'approved') {
                title = 'Shop Update Request Approved';
                message = `Your update request for shop "${shop.name}" has been approved and applied.`;
            } else {
                title = 'Shop Update Request Rejected';
                message = `Your update request for shop "${shop.name}" has been rejected. Reason: ${request.reviewNotes}`;
            }

            await notificationService.createNotification({
                userId: request.shopOwnerId,
                title,
                message,
                type: 'system',
                relatedId: request._id,
                onModel: 'ShopUpdateRequest'
            });
        } catch (error) {
            console.error('Error notifying shop owner:', error);
            // Don't throw error - notification failure shouldn't block status update
        }
    }
};

module.exports = shopUpdateRequestService;