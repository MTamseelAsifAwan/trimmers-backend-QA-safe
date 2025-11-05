// src/api/admin/controllers/customerCareController.js
const userService = require('../../../services/userService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all customer care users
 * @route GET /api/admin/customer-care
 * @access Private/Admin
 */
const getCustomerCareUsers = async (req, res, next) => {
    try {
        const { page, limit, search } = req.query;

        const options = {
            page,
            limit,
            role: 'customer_care',
            search
        };

        const result = await userService.getUsers(options);

        res.status(200).json({
            success: true,
            data: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Assign shop to customer care
 * @route POST /api/admin/customer-care/:userId/assign-shop
 * @access Private/Admin
 */
const assignShopToCustomerCare = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { shopId } = req.body;

        if (!shopId) {
            throw new ApiError('Shop ID is required', 400);
        }

        const user = await userService.assignShopToCustomerCare(userId, shopId);

        res.status(200).json({
            success: true,
            message: 'Shop assigned to customer care successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Assign customer to customer care
 * @route POST /api/admin/customer-care/:userId/assign-customer
 * @access Private/Admin
 */
const assignCustomerToCustomerCare = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { customerId } = req.body;

        if (!customerId) {
            throw new ApiError('Customer ID is required', 400);
        }

        const user = await userService.assignCustomerToCustomerCare(userId, customerId);

        res.status(200).json({
            success: true,
            message: 'Customer assigned to customer care successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomerCareUsers,
    assignShopToCustomerCare,
    assignCustomerToCustomerCare
};