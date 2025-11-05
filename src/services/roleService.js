// src/services/roleService.js
const Role = require('../models/Role');
const { User } = require('../models/User');
const { ApiError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { clearAllCache, clearRoleCache } = require('../middlewares/rbac');

/**
 * RoleService provides methods for role management
 */
class RoleService {
    /**
     * Get all roles with pagination
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {Object} filter - Filter criteria
     * @returns {Promise<Object>} - Paginated roles
     */
    async getRoles(page = 1, limit = 10, filter = {}) {
        try {
            // Convert page and limit to numbers
            page = parseInt(page, 10);
            limit = parseInt(limit, 10);

            // Calculate skip value for pagination
            const skip = (page - 1) * limit;

            // Count total roles
            const total = await Role.countDocuments(filter);

            // Get roles with pagination
            const roles = await Role.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit);

            // Calculate pagination info
            const pagination = {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            };

            return {
                roles,
                pagination
            };
        } catch (error) {
            logger.error(`Get roles error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get role by ID
     * @param {string} id - Role ID
     * @returns {Promise<Object>} - Role data
     */
    async getRoleById(id) {
        try {
            const role = await Role.findById(id);

            if (!role) {
                throw new ApiError('Role not found', 404);
            }

            return role;
        } catch (error) {
            logger.error(`Get role by ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get role by name
     * @param {string} name - Role name
     * @returns {Promise<Object>} - Role data
     */
    async getRoleByName(name) {
        try {
            const role = await Role.findOne({ name });

            if (!role) {
                throw new ApiError('Role not found', 404);
            }

            return role;
        } catch (error) {
            logger.error(`Get role by name error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a new role
     * @param {Object} roleData - Role data
     * @returns {Promise<Object>} - Created role
     */
    async createRole(roleData) {
        try {
            // Check if role name already exists
            const existingRole = await Role.findOne({ name: roleData.name });

            if (existingRole) {
                throw new ApiError('Role name already exists', 400);
            }

            // Create role object
            const role = new Role({
                name: roleData.name,
                description: roleData.description || '',
                permissions: roleData.permissions || []
            });

            // Save role
            await role.save();

            // Clear RBAC cache
            clearAllCache();

            return role;
        } catch (error) {
            logger.error(`Create role error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update role
     * @param {string} id - Role ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} - Updated role
     */
    async updateRole(id, updateData) {
        try {
            // Check if role exists
            const role = await Role.findById(id);

            if (!role) {
                throw new ApiError('Role not found', 404);
            }

            // Don't allow changing admin role name
            if (role.name === 'admin' && updateData.name && updateData.name !== 'admin') {
                throw new ApiError('Cannot change admin role name', 400);
            }

            // Check if new role name already exists
            if (updateData.name && updateData.name !== role.name) {
                const existingRole = await Role.findOne({ name: updateData.name });

                if (existingRole) {
                    throw new ApiError('Role name already exists', 400);
                }
            }

            // Update role fields
            if (updateData.name) role.name = updateData.name;
            if (updateData.description !== undefined) role.description = updateData.description;
            if (updateData.permissions) role.permissions = updateData.permissions;

            // Save updated role
            await role.save();

            // Clear RBAC cache for this role
            clearRoleCache(id);

            return role;
        } catch (error) {
            logger.error(`Update role error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete role
     * @param {string} id - Role ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteRole(id) {
        try {
            // Check if role exists
            const role = await Role.findById(id);

            if (!role) {
                throw new ApiError('Role not found', 404);
            }

            // Don't allow deleting default roles
            if (['admin', 'customer', 'shop_owner', 'barber'].includes(role.name)) {
                throw new ApiError('Cannot delete default roles', 400);
            }

            // Check if role is in use
            const usersWithRole = await User.countDocuments({ roleId: id });

            if (usersWithRole > 0) {
                throw new ApiError('Role is in use by users and cannot be deleted', 400);
            }

            // Delete role
            await Role.findByIdAndDelete(id);

            // Clear RBAC cache for this role
            clearRoleCache(id);

            return true;
        } catch (error) {
            logger.error(`Delete role error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get available permissions
     * @returns {Promise<Object>} - Available permissions
     */
    async getPermissions() {
        try {
            // Define core permissions grouped by module
            const permissions = {
                // User management
                users: [
                    'view_users',
                    'create_user',
                    'update_user',
                    'delete_user',
                    'view_user_details',
                    'reset_user_password',
                    'manage_user_status'
                ],
                // Role management
                roles: [
                    'view_roles',
                    'create_role',
                    'update_role',
                    'delete_role',
                    'assign_role',
                    'manage_permissions'
                ],
                // Shop management
                shops: [
                    'view_shops',
                    'create_shop',
                    'update_shop',
                    'delete_shop',
                    'approve_shop',
                    'view_shop_details',
                    'reject_shop',
                    'manage_shop_services',
                    'manage_shop_barbers'
                ],
                // Barber management
                barbers: [
                    'view_barbers',
                    'create_barber',
                    'update_barber',
                    'delete_barber',
                    'approve_barber',
                    'reject_barber',
                    'view_barber_details',
                    'manage_barber_portfolio',
                    'manage_barber_services',
                    'manage_barber_availability'
                ],
                // Service management
                services: [
                    'view_services',
                    'create_service',
                    'update_service',
                    'delete_service',
                    'approve_service',
                    'reject_service',
                    'view_service_details',
                    'manage_service_categories'
                ],
                // Booking management
                bookings: [
                    'view_bookings',
                    'create_booking',
                    'update_booking',
                    'cancel_booking',
                    'complete_booking',
                    'view_booking_details',
                    'manage_booking_status',
                    'rate_booking'
                ],
                // Payment management
                payments: [
                    'view_payments',
                    'process_payment',
                    'refund_payment',
                    'view_payment_details',
                    'manage_payment_status',
                    'view_payment_statistics'
                ],
                // Reports
                reports: [
                    'view_reports',
                    'export_reports',
                    'view_analytics',
                    'generate_booking_report',
                    'generate_revenue_report',
                    'generate_user_report',
                    'generate_barber_report',
                    'generate_shop_report'
                ],
                // Settings
                settings: [
                    'view_settings',
                    'update_settings',
                    'manage_system_settings',
                    'manage_email_settings',
                    'manage_payment_settings',
                    'manage_notification_settings',
                    'send_test_email'
                ],
                // Customer management
                customers: [
                    'view_customers',
                    'update_customer',
                    'delete_customer',
                    'view_customer_details',
                    'view_customer_bookings',
                    'view_customer_payments',
                    'manage_customer_addresses'
                ],
                // Shop owner management
                shop_owners: [
                    'view_shop_owners',
                    'update_shop_owner',
                    'delete_shop_owner',
                    'verify_shop_owner',
                    'reject_shop_owner',
                    'view_shop_owner_details',
                    'view_verification_documents'
                ],
                // Notification management
                notifications: [
                    'view_notifications',
                    'send_notification',
                    'send_system_notification',
                    'manage_notification_templates',
                    'mark_notification_read',
                    'delete_notification'
                ],
                // File management
                uploads: [
                    'upload_file',
                    'delete_file',
                    'manage_file_access',
                    'upload_profile_image',
                    'upload_shop_image',
                    'upload_service_image',
                    'upload_portfolio_image',
                    'upload_verification_document'
                ],
                // Location management
                locations: [
                    'view_countries',
                    'view_cities',
                    'view_areas',
                    'manage_locations',
                    'assign_country_manager'
                ],
                // Dashboard
                dashboard: [
                    'view_dashboard',
                    'view_dashboard_stats',
                    'view_booking_stats',
                    'view_revenue_stats',
                    'view_user_stats',
                    'view_popular_services',
                    'view_top_barbers',
                    'view_top_shops',
                    'view_country_stats'
                ],
                // Country management
                country_management: [
                    'manage_country_managers',
                    'assign_country_to_manager',
                    'view_country_statistics'
                ],
                // Customer care
                customer_care: [
                    'manage_customer_care',
                    'assign_shop_to_customer_care',
                    'assign_customer_to_customer_care',
                    'handle_support_tickets',
                    'resolve_disputes'
                ]
            };
            
            return permissions;
        } catch (error) {
            logger.error(`Get permissions error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Assign role to user
     * @param {string} userId - User ID
     * @param {string} roleId - Role ID
     * @returns {Promise<Object>} - Updated user
     */
    async assignRoleToUser(userId, roleId) {
        try {
            // Check if user exists
            const user = await User.findById(userId);

            if (!user) {
                throw new ApiError('User not found', 404);
            }

            // Check if role exists
            const role = await Role.findById(roleId);

            if (!role) {
                throw new ApiError('Role not found', 404);
            }

            // Update user role
            user.roleId = roleId;
            user.role = role.name;

            await user.save();

            // Get updated user without sensitive fields
            const updatedUser = await User.findById(userId)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

            return updatedUser;
        } catch (error) {
            logger.error(`Assign role to user error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get users by role
     * @param {string} roleId - Role ID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Promise<Object>} - Paginated users
     */
    async getUsersByRole(roleId, page = 1, limit = 10) {
        try {
            // Convert page and limit to numbers
            page = parseInt(page, 10);
            limit = parseInt(limit, 10);

            // Calculate skip value for pagination
            const skip = (page - 1) * limit;

            // Check if role exists
            const role = await Role.findById(roleId);

            if (!role) {
                throw new ApiError('Role not found', 404);
            }

            // Count total users with this role
            const total = await User.countDocuments({ roleId });
            console.log({ roleId });
            // Get users with this role
            const users = await User.find({ roleId })
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            console.log(users);

            // Calculate pagination info
            const pagination = {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            };

            return {
                users,
                pagination,
                role
            };
        } catch (error) {
            logger.error(`Get users by role error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new RoleService();