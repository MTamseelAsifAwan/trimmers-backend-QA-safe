// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Barber = require('../models/Barber');
const Freelancer = require('../models/Freelancer');
const ShopOwner = require('../models/ShopOwner');
const Admin = require('../models/Admin');
const { User } = require('../models/User');
const Role = require('../models/Role');
const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

// Define ROLES constant
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    CUSTOMER_CARE: 'customer_care',
    COUNTRY_MANAGER: 'country_manager',
    SHOP_OWNER: 'shop_owner',
    BARBER: 'barber',
    FREELANCER: 'freelancer',
    CUSTOMER: 'customer'
};

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        let token;

        // Check Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        // If no token, return unauthorized error
        if (!token) {
            logger.warn(`[AUTH] ❌ No authentication token provided`);
            return next(new ApiError('Authentication required. Please login.', 401));
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            logger.info(`[AUTH] 🔐 JWT token verified for user ID: ${decoded.id}`);

            // Get user from appropriate collection based on role
            let user = null;
            const userRole = decoded.role;

            logger.info(`[AUTH] Authenticating user with ID: ${decoded.id}, Role: ${userRole}`);

            switch (userRole) {
                case 'customer':
                    user = await Customer.findById(decoded.id).select('-password');
                    if (user) logger.info(`[AUTH] ✅ User found in Customer collection: ${user.email} (${user._id})`);
                    break;
                case 'barber':
                    user = await Barber.findById(decoded.id).select('-password');
                    if (user) logger.info(`[AUTH] ✅ User found in Barber collection: ${user.email} (${user._id})`);
                    break;
                case 'freelancer':
                    user = await Freelancer.findById(decoded.id).select('-password');
                    logger.info(`[AUTH] User lookup result:`, user);
                    if (user) logger.info(`[AUTH] ✅ User found in Freelancer collection: ${user.email} (${user._id})`);
                    break;
                case 'shop_owner':
                    user = await ShopOwner.findById(decoded.id).select('-password');
                    if (user) logger.info(`[AUTH] ✅ User found in ShopOwner collection: ${user.email} (${user._id})`);
                    break;
                case 'admin':
                case 'super_admin':
                case 'country_manager':
                case 'customer_care':
                    // First try User collection
                    user = await User.findById(decoded.id).select('-password');
                    if (user) {
                        logger.info(`[AUTH] ✅ User found in User collection: ${user.email} (${user._id})`);
                        break;
                    }
                    // Fallback to Admin collection for legacy support
                    user = await Admin.findById(decoded.id).select('-password');
                    if (user) logger.info(`[AUTH] ✅ User found in Admin collection: ${user.email} (${user._id})`);
                    break;
                default:
                    logger.warn(`[AUTH] ❌ Invalid user role encountered: ${userRole}`);
                    return next(new ApiError('Invalid user role.', 401));
            }

            // If user not found, return unauthorized error
            if (!user) {
                logger.warn(`[AUTH] ❌ User not found in any collection for ID: ${decoded.id}, Role: ${userRole}`);
                return next(new ApiError('User not found.', 401));
            }

            // Check if user is active
            if (!user.isActive) {
                logger.warn(`[AUTH] ❌ User account deactivated: ${user.email} (${user._id})`);
                return next(new ApiError('Your account has been deactivated.', 403));
            }

            // Get user role using Mongoose
            let role = null;
            if (user.roleId) {
                role = await Role.findById(user.roleId);
                if (role) {
                    logger.info(`[AUTH] 📋 Found role by roleId: ${role.name} for user: ${user.email} (${user._id})`);
                }
            }

            // If no roleId found, try to find role by user.role field (for models that store role directly)
            if (!role && user.role) {
                role = await Role.findOne({ name: { $regex: new RegExp(`^\\s*${user.role}\\s*$`, 'i') } });
                if (role) {
                    logger.info(`[AUTH] 📋 Found role by user.role field: ${role.name} for user: ${user.email} (${user._id})`);
                } else {
                    // If no role found in Role collection, create a temporary role object from user.role
                    logger.info(`[AUTH] 📋 Creating temporary role object from user.role: ${user.role} for user: ${user.email} (${user._id})`);
                    role = {
                        name: user.role,
                        permissions: []
                    };
                }
            }

            // If still no role found, assign default customer role
            if (!role) {
                role = await Role.findOne({ name: { $regex: new RegExp('^\\s*customer\\s*$', 'i') } });
                if (!role) {
                    logger.error(`[AUTH] ❌ Default customer role not found in database`);
                    return next(new ApiError('Default customer role not configured.', 500));
                }
                logger.info(`[AUTH] 📋 Assigned default customer role for user: ${user.email} (${user._id})`);
            } else {
                logger.info(`[AUTH] 📋 Role verified: ${role.name} for user: ${user.email}`);
            }

            // Add user and role to request
            req.user = user;
            req.role = role.toObject ? role.toObject() : role;

            logger.info(`[AUTH] ✅ Authentication successful for user: ${user.email} (${user._id}), Role: ${role.name}`);

            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                logger.warn(`[AUTH] ❌ Invalid JWT token provided`);
                return next(new ApiError('Invalid token.', 401));
            } else if (error.name === 'TokenExpiredError') {
                logger.warn(`[AUTH] ❌ JWT token has expired`);
                return next(new ApiError('Token has expired. Please login again.', 401));
            }

            logger.error('[AUTH] ❌ Authentication error:', error);
            return next(new ApiError('Authentication failed.', 401));
        }
    } catch (error) {
        logger.error('Authentication error:', error);
        return next(new ApiError('Authentication failed.', 500));
    }
};

/**
 * Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 * @returns {function} Middleware function
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        try {
            // Check if user and role exist
            if (!req.user || !req.role) {
                logger.warn(`[AUTHZ] ❌ Missing user or role in request - user: ${!!req.user}, role: ${!!req.role}`);
                return next(new ApiError('Unauthorized. Authentication required.', 401));
            }

            // Support both single string and array of strings for roles
            let allowedRoles;
            if (roles.length === 1 && Array.isArray(roles[0])) {
                allowedRoles = roles[0].map(r => r.toLowerCase().trim());
            } else {
                allowedRoles = roles.map(r => r.toLowerCase().trim());
            }

            // Handle Mongoose document properly
            const roleObj = req.role.toObject ? req.role.toObject() : req.role;
            const userRole = (roleObj.name || '').toString().toLowerCase().trim();

            logger.info(`[AUTHZ] 🔍 Authorization check - User: ${req.user.email || req.user._id}, UserRole: '${userRole}', AllowedRoles: [${allowedRoles.join(', ')}]`);

            // Normalize allowed roles for comparison
            const allowedRolesNormalized = allowedRoles.map(r => r.toString().toLowerCase().trim());

            // Check if user has required role
            if (allowedRolesNormalized.length > 0 && !allowedRolesNormalized.includes(userRole)) {
                logger.warn(`[AUTHZ] ❌ Role '${userRole}' not in allowed roles: [${allowedRolesNormalized.join(', ')}]`);
                return next(new ApiError(`Unauthorized. ${roleObj.name || userRole || 'unknown'} role does not have access to this resource.`, 403));
            }

            logger.info(`[AUTHZ] ✅ Authorization successful for user: ${req.user.email || req.user._id}, role: ${userRole}`);
            next();
        } catch (error) {
            logger.error('[AUTHZ] ❌ Authorization error:', error);
            return next(new ApiError('Authorization failed.', 500));
        }
    };
};

/**
 * Permission-based authorization middleware
 * @param {...string} permissions - Required permissions
 * @returns {function} Middleware function
 */
const hasPermission = (...permissions) => {
    return (req, res, next) => {
        // Check if user and role exist
        if (!req.user || !req.role) {
            return next(new ApiError('Unauthorized. Authentication required.', 401));
        }

        // Admin role has all permissions
        if (req.role.name === 'admin' || req.role.permissions.includes('*')) {
            return next();
        }

        // Special case: shop_owners can create shops
        if (req.role.name === 'shop_owner' && permissions.includes('create_shop')) {
            return next();
        }

        // Check if user has required permissions
        const hasAllPermissions = permissions.every(
            permission => req.role.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
            return next(new ApiError('You do not have permission to access this resource.', 403));
        }

        next();
    };
};

/**
 * Country access check middleware
 * Checks if user has access to the requested country
 */
const checkCountryAccess = async (req, res, next) => {
    try {
        const { countryId } = req.params;

        if (!countryId) return next();

        // Super admin has access to all countries
        if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
            return next();
        }

        // Country managers only have access to their assigned country
        if (req.user.role === ROLES.COUNTRY_MANAGER) {
            if (!req.user.countryId || req.user.countryId.toString() !== countryId) {
                return next(new ApiError('You do not have access to this country', 403));
            }
        }

        // Check accessible countries for other roles
        if (req.user.accessibleCountries && req.user.accessibleCountries.length > 0) {
            const hasAccess = req.user.accessibleCountries.some(
                id => id.toString() === countryId
            );

            if (!hasAccess) {
                return next(new ApiError('You do not have access to this country', 403));
            }
        }

        next();
    } catch (error) {
        next(new ApiError('Country access check failed', 500));
    }
};

/**
 * Customer care access check middleware
 * Checks if customer care user has access to the requested shop or customer
 */
const checkCustomerCareAccess = async (req, res, next) => {
    try {
        if (req.user.role !== ROLES.CUSTOMER_CARE) {
            return next();
        }

        const { shopId, customerId } = req.params;

        if (shopId && (!req.user.accessibleShops || !req.user.accessibleShops.includes(shopId))) {
            return next(new ApiError('You do not have access to this shop', 403));
        }

        if (customerId && (!req.user.accessibleCustomers || !req.user.accessibleCustomers.includes(customerId))) {
            return next(new ApiError('You do not have access to this customer', 403));
        }

        next();
    } catch (error) {
        next(new ApiError('Access check failed', 500));
    }
};

// Alias for hasPermission for better naming in route files
const requirePermission = hasPermission;

module.exports = {
    authenticate,
    authorize,
    hasPermission,
    requirePermission,
    checkCountryAccess,
    checkCustomerCareAccess,
    ROLES
};