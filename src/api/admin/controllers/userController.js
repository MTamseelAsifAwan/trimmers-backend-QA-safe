// src/api/admin/controllers/userController.js
const userService = require('../../../services/userService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all users with pagination
 * @route GET /api/admin/users
 * @access Private/Admin
 */
const getUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;

        // Build filter
        const filter = {};

        if (role) {
            // Get role ID from role name (needs to be joined with roles collection)
            // For simplicity, we'll use the filter later in the service
            filter.role = role.split(',').map(r => r.trim());
        }

        if (search) {
            // Search in user fields
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { 'profile.phoneNumber': { $regex: search, $options: 'i' } }
            ];
        }

        const result = await userService.getUsers({page, limit, role: filter.role, search: filter.$or});

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
 * Get user by ID
 * @route GET /api/admin/users/:id
 * @access Private/Admin
 */
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new user
 * @route POST /api/admin/users
 * @access Private/Admin
 */
const createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user
 * @route PUT /api/admin/users/:id
 * @access Private/Admin
 */
const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await userService.updateUser(id, req.body);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete user
 * @route DELETE /api/admin/users/:id
 * @access Private/Admin
 */
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if trying to delete self
        if (id === req.user._id.toString()) {
            throw new ApiError('Cannot delete your own account', 400);
        }

        const success = await userService.deleteUser(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });
        } else {
            throw new ApiError('User deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Reset user password
 * @route POST /api/admin/users/:id/reset-password
 * @access Private/Admin
 */
const resetUserPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            throw new ApiError('Password is required', 400);
        }

        const success = await userService.resetUserPassword(id, password);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Password reset successfully'
            });
        } else {
            throw new ApiError('Password reset failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword
};