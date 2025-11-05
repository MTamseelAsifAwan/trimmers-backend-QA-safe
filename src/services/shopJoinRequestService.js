const ShopJoinRequest = require('../models/ShopJoinRequest');
const Shop = require('../models/Shop');
const { User, EMPLOYMENT_TYPES } = require('../models/User');
const Barber = require('../models/Barber'); // Ensure this is imported
const Freelancer = require('../models/Freelancer'); // Ensure this is imported
const logger = require('../utils/logger'); // For debugging
const notificationService = require('./notificationService');

const shopJoinRequestService = {
    async createJoinRequest(userId, shopId, message) {
        // userId is the role document's _id
        const roleDoc = await Barber.findById(userId) || await Freelancer.findById(userId) || await User.findById(userId);
        const user = roleDoc;
        if (!user) {
            throw new Error('User not found');
        }
        if ((user.role !== 'barber' && user.role !== 'freelancer') || user.isActive !== true) {
            throw new Error('Only active shopbarbers or freelancers can send join requests');
        }
        const shop = await Shop.findById(shopId);
        if (!shop) throw new Error('Shop not found');
        const existing = await ShopJoinRequest.findOne({ userId: user._id, shopId, status: 'requested' });
        if (existing) throw new Error('Already requested to join this shop');
        const joinRequest = await ShopJoinRequest.create({ userId: user._id, shopId, message, role: user.role });

        // Notify shop owner
        if (shop.ownerId) {
            const barberName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'A barber';
            await notificationService.createNotification({
                userId: shop.ownerId,
                title: 'New Shop Join Request',
                message: `${barberName} wants to join your shop: ${shop.name}`,
                type: 'system',
                relatedId: joinRequest._id,
                onModel: 'Shop'
            });
        }
        return joinRequest;
    },

    async getRequestsForShopOwner(shopOwnerId) {
        const shops = await Shop.find({ ownerId: shopOwnerId });
        const shopIds = shops.map(s => s._id);
        const requests = await ShopJoinRequest.find({ shopId: { $in: shopIds }, status: 'requested' })
            .select('_id userId requestedAt')
            .populate('userId')
            .populate('shopId');

        // For each request, get barber details from Barber collection
        const requestsWithBarberInfo = await Promise.all(
            requests.map(async (request) => {
                const barber = await Barber.findById(request.userId._id).select('firstName');
                return {
                    requestId: request._id,
                    barberId: request.userId,
                    requestedAt: request.requestedAt,
                    name: barber ? barber.firstName : null
                };
            })
        );

        return requestsWithBarberInfo;
    },

    async getRequestsForAdmin(options = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            shopId,
            userId
        } = options;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (shopId) query.shopId = shopId;
        if (userId) query.userId = userId;

        // Search functionality
        if (search) {
            query.$or = [
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const requests = await ShopJoinRequest.find(query)
            .populate({
                path: 'userId',
                select: 'firstName lastName email profile.phoneNumber'
            })
            .populate({
                path: 'shopId',
                select: 'name address city'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await ShopJoinRequest.countDocuments(query);

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

    async reviewRequest(requestId, status, reviewerId) {
        const request = await ShopJoinRequest.findById(requestId);
        if (!request) {
            throw new Error('Join request not found');
        }
        if (request.status === 'linked') {
            throw new Error('This join request has already been linked');
        }

        // Fetch user to determine role
        let user = await Barber.findById(request.userId) || await Freelancer.findById(request.userId) || await User.findById(request.userId);
        if (!user) {
            logger.error(`User ${request.userId} not found during review`);
            throw new Error('User not found');
        }

        // Ensure request has role
        request.role = user.role;
        request.status = status;
        request.reviewedBy = reviewerId;
        request.reviewedAt = new Date();
        await request.save();

        // Notify user on approval/rejection
        if (status === 'linked' || status === 'unlinked') {
            const shop = await Shop.findById(request.shopId);
            if (user && shop) {
                let title, message;
                if (status === 'linked') {
                    title = 'Shop Join Request Linked';
                    message = `Your request to join shop '${shop.name}' has been linked.`;
                } else {
                    title = 'Shop Join Request Unlinked';
                    message = `Your request to join shop '${shop.name}' has been unlinked.`;
                }
                await notificationService.createNotification({
                    userId: user._id,
                    title,
                    message,
                    type: 'system',
                    relatedId: request._id,
                    onModel: 'Shop'
                });
            }
        }
        // If linked, delete all other join requests for this user to other shops
        if (status === 'linked') {
            logger.info(`Deleting other join requests for user ${request.userId} since they are now linked to shop ${request.shopId}`);
            await ShopJoinRequest.deleteMany({
                userId: request.userId,
                _id: { $ne: requestId }, // Exclude the current request
                status: { $in: ['requested', 'pending'] } // Only delete pending/requested ones, keep historical linked/unlinked
            });
            logger.info(`Deleted other pending join requests for user ${request.userId}`);
        }

        // If linked, associate user with shop and update Barber document
        if (status === 'linked') {
            const shop = await Shop.findById(request.shopId);
            if (!shop) throw new Error('Shop not found');

            // Fetch user
            // user already found above

            // Ensure request has role for saving
            request.role = user.role;
            await request.save();

            if (user.role === 'barber' || user.role === 'freelancer') {
                // Update Shop owners array
                if (!shop.owners) shop.owners = [];
                if (!shop.owners.map(id => id.toString()).includes(request.userId.toString())) {
                    shop.owners.push(request.userId);
                    await shop.save();
                    logger.info(`Shop ${shop._id} owners updated with user ${request.userId}`);
                }

                // Update role document shopId
                user.shopId = shop._id;
                await user.save();
                logger.info(`${user.role} ${user._id} shopId updated to ${shop._id}`);

                // Update Barber/Freelancer specific
                if (user.role === 'barber') {
                    const barber = user; // since user is barber

                    // Update barber
                    if (barber.employmentType !== EMPLOYMENT_TYPES.EMPLOYED) {
                        barber.employmentType = EMPLOYMENT_TYPES.EMPLOYED;
                    }
                    if (user.role === 'freelancer' && !barber.isFreelancer) {
                        barber.isFreelancer = true;
                        logger.warn(`Corrected isFreelancer to true for Barber ${barber._id}`);
                    }
                    await barber.save();
                    logger.info(`Barber ${barber._id} updated`);
                }
            }
        }
        return request;
    },

    async getRequestsForFreelancer(userId) {
        const barber = await Barber.findById(userId);
        if (!barber) throw new Error('Barber profile not found');
        return await ShopJoinRequest.find({ userId: barber._id })
            .populate('shopId');
    },

    async unlinkFromShop(userId) {
        // Find the linked request for this user
        const linkedRequest = await ShopJoinRequest.findOne({
            userId: userId,
            status: 'linked'
        });

        if (!linkedRequest) {
            throw new Error('No linked shop found for this user');
        }

        // Fetch user and shop
        const user = await Barber.findById(userId) || await Freelancer.findById(userId) || await User.findById(userId);
        const shop = await Shop.findById(linkedRequest.shopId);

        if (!user || !shop) {
            throw new Error('User or shop not found');
        }

        // Update request status
        linkedRequest.status = 'unlinked';
        linkedRequest.reviewedBy = userId; // Self-unlinked
        linkedRequest.reviewedAt = new Date();
        await linkedRequest.save();

        // Remove user from shop owners array
        if (shop.owners && shop.owners.length > 0) {
            shop.owners = shop.owners.filter(id => id.toString() !== userId.toString());
            await shop.save();
            logger.info(`Removed user ${userId} from shop ${shop._id} owners`);
        }

        // Clear user's shopId and reset employment type
        user.shopId = null;
        if (user.role === 'barber' && user.employmentType === EMPLOYMENT_TYPES.EMPLOYED) {
            user.employmentType = EMPLOYMENT_TYPES.FREELANCE; // Reset to freelance when unlinked
        }
        await user.save();
        logger.info(`Cleared shopId for ${user.role} ${userId}`);

        // Notify shop owner
        if (shop.ownerId) {
            const barberName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'A barber';
            await notificationService.createNotification({
                userId: shop.ownerId,
                title: 'Barber Unlinked from Shop',
                message: `${barberName} has unlinked themselves from your shop: ${shop.name}`,
                type: 'system',
                relatedId: linkedRequest._id,
                onModel: 'Shop'
            });
        }

        return linkedRequest;
    }
};

module.exports = shopJoinRequestService;