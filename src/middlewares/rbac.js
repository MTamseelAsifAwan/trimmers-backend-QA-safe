// src/middlewares/rbac.js
const Role = require('../models/Role');
const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Permission cache to reduce database queries
 * Structure: { roleId: { permissionName: true|false, ... }, ... }
 */
const permissionCache = {};

/**
 * Cache time-to-live in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Cache timestamps for each role
 * Structure: { roleId: timestamp, ... }
 */
const cacheTimestamps = {};

/**
 * Clear the permission cache for a specific role
 * @param {string} roleId - Role ID
 */
const clearRoleCache = (roleId) => {
    if (roleId && permissionCache[roleId]) {
        delete permissionCache[roleId];
        delete cacheTimestamps[roleId];
    }
};

/**
 * Clear the entire permission cache
 */
const clearAllCache = () => {
    Object.keys(permissionCache).forEach(key => {
        delete permissionCache[key];
    });

    Object.keys(cacheTimestamps).forEach(key => {
        delete cacheTimestamps[key];
    });
};

/**
 * Check if a role has a specific permission
 * @param {string} roleId - Role ID
 * @param {string} permission - Permission name
 * @returns {Promise<boolean>} - Whether the role has the permission
 */
const checkPermission = async (roleId, permission) => {
    try {
        // Check if permission is cached and not expired
        if (
            permissionCache[roleId] &&
            typeof permissionCache[roleId][permission] !== 'undefined' &&
            cacheTimestamps[roleId] &&
            (Date.now() - cacheTimestamps[roleId]) < CACHE_TTL
        ) {
            return permissionCache[roleId][permission];
        }

    // Get role from database using Mongoose
    const role = await Role.findById(roleId);

        if (!role) {
            throw new Error('Role not found');
        }

        // Admin role or wildcard permission has access to everything
        if (role.name === 'admin' || role.permissions.includes('*')) {
            // Update cache
            permissionCache[roleId] = permissionCache[roleId] || {};
            permissionCache[roleId][permission] = true;
            cacheTimestamps[roleId] = Date.now();

            return true;
        }

        // Check if role has the specific permission
        const hasPermission = role.permissions.includes(permission);

        // Update cache
        permissionCache[roleId] = permissionCache[roleId] || {};
        permissionCache[roleId][permission] = hasPermission;
        cacheTimestamps[roleId] = Date.now();

        return hasPermission;
    } catch (error) {
        logger.error(`Error checking permission (${permission}) for role ${roleId}:`, error);
        return false;
    }
};

/**
 * Middleware to check if user has required permissions
 * @param {...string} requiredPermissions - Required permissions
 * @returns {function} - Middleware function
 */
const requirePermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        try {
            // User must be authenticated
            if (!req.user || !req.user.roleId) {
                return next(new ApiError('Authentication required', 401));
            }

            // For admin role, skip permission check
            if (req.role && req.role.name === 'admin') {
                return next();
            }

            // Check if user has all required permissions
            const permissionChecks = await Promise.all(
                requiredPermissions.map(permission =>
                    checkPermission(req.user.roleId, permission)
                )
            );

            const hasAllPermissions = permissionChecks.every(result => result === true);

            if (!hasAllPermissions) {
                return next(new ApiError('You do not have permission to access this resource', 403));
            }

            next();
        } catch (error) {
            logger.error('Permission check error:', error);
            next(new ApiError('Permission check failed', 500));
        }
    };
};

module.exports = {
    requirePermission,
    checkPermission,
    clearRoleCache,
    clearAllCache
};