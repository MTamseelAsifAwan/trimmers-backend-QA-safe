// src/api/admin/controllers/roleController.js
const roleService = require('../../../services/roleService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all roles with pagination
 * @route GET /api/admin/roles
 * @access Private/Admin
 */
const getRoles = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        // Build filter
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const result = await roleService.getRoles(page, limit, filter);

        res.status(200).json({
            success: true,
            data: result.roles,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get role by ID
 * @route GET /api/admin/roles/:id
 * @access Private/Admin
 */
const getRoleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const role = await roleService.getRoleById(id);

        res.status(200).json({
            success: true,
            data: role
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create new role
 * @route POST /api/admin/roles
 * @access Private/Admin
 */
const createRole = async (req, res, next) => {
    try {
        const role = await roleService.createRole(req.body);

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: role
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update role
 * @route PUT /api/admin/roles/:id
 * @access Private/Admin
 */
const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const role = await roleService.updateRole(id, req.body);

        res.status(200).json({
            success: true,
            message: 'Role updated successfully',
            data: role
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete role
 * @route DELETE /api/admin/roles/:id
 * @access Private/Admin
 */
const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await roleService.deleteRole(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Role deleted successfully'
            });
        } else {
            throw new ApiError('Role deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get available permissions
 * @route GET /api/admin/roles/permissions
 * @access Private/Admin
 */
const getPermissions = async (req, res, next) => {
    try {
        const permissions = await roleService.getPermissions();

        res.status(200).json({
            success: true,
            data: permissions
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Assign role to user
 * @route POST /api/admin/roles/:roleId/assign/:userId
 * @access Private/Admin
 */
const assignRoleToUser = async (req, res, next) => {
    try {
        const { roleId, userId } = req.params;
        const user = await roleService.assignRoleToUser(userId, roleId);

        res.status(200).json({
            success: true,
            message: 'Role assigned successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get users by role
 * @route GET /api/admin/roles/:id/users
 * @access Private/Admin
 */
const getUsersByRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const result = await roleService.getUsersByRole(id, page, limit);

        res.status(200).json({
            success: true,
            data: result.users,
            pagination: result.pagination,
            role: result.role
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getPermissions,
    assignRoleToUser,
    getUsersByRole
};