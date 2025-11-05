// src/services/userService.js
const Role = require('../models/Role');
const Customer = require('../models/Customer');
const ShopOwner = require('../models/ShopOwner');
const Barber = require('../models/Barber');
const Freelancer = require('../models/Freelancer');
const Admin = require('../models/Admin');
const { User } = require('../models/User');
const logger = require('../utils/logger');

/**
 * UserService provides methods for user management
 */
class UserService {
    /**
     * Get all users with pagination, filtering and sorting
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of users
     */
    async getUsers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                role,
                search,
                isActive
            } = options;

            // If no specific role filter, get users from all models
            if (!role || (Array.isArray(role) && role.length === 0)) {
                return await this.getUsersFromAllModels(options);
            }

            // Route to appropriate model based on role
            const roleArray = Array.isArray(role) ? role : [role];
            const results = [];

            for (const roleName of roleArray) {
                let modelResult;
                switch (roleName) {
                    case 'admin':
                    case 'super_admin':
                    case 'country_manager':
                    case 'customer_care':
                        modelResult = await this.getAdmins({ ...options, role: roleName });
                        break;
                    case 'barber':
                        modelResult = await this.getBarbers({ ...options, role: roleName });
                        break;
                    case 'freelancer':
                        modelResult = await this.getFreelancers({ ...options, role: roleName });
                        break;
                    case 'shop_owner':
                        modelResult = await this.getShopOwners({ ...options, role: roleName });
                        break;
                    case 'customer':
                    default:
                        modelResult = await this.getCustomers({ ...options, role: roleName });
                        break;
                }
                results.push(...modelResult.users);
            }

            // Sort combined results
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
            results.sort((a, b) => {
                if (sort[sortBy] === 1) {
                    return a[sortBy] > b[sortBy] ? 1 : -1;
                } else {
                    return a[sortBy] < b[sortBy] ? 1 : -1;
                }
            });

            // Apply pagination to combined results
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const paginatedUsers = results.slice(skip, skip + parseInt(limit));

            return {
                users: paginatedUsers,
                pagination: {
                    total: results.length,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(results.length / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get users error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get users from all models when no role filter is specified
     */
    async getUsersFromAllModels(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
                isActive
            } = options;

            const allUsers = [];

            // Get from all models
            const adminResult = await this.getAdmins({ ...options, role: null });
            const barberResult = await this.getBarbers({ ...options, role: null });
            const freelancerResult = await this.getFreelancers({ ...options, role: null });
            const shopOwnerResult = await this.getShopOwners({ ...options, role: null });
            const customerResult = await this.getCustomers({ ...options, role: null });

            allUsers.push(...adminResult.users);
            allUsers.push(...barberResult.users);
            allUsers.push(...freelancerResult.users);
            allUsers.push(...shopOwnerResult.users);
            allUsers.push(...customerResult.users);

            // Sort combined results
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
            allUsers.sort((a, b) => {
                if (sort[sortBy] === 1) {
                    return a[sortBy] > b[sortBy] ? 1 : -1;
                } else {
                    return a[sortBy] < b[sortBy] ? 1 : -1;
                }
            });

            // Apply pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const paginatedUsers = allUsers.slice(skip, skip + parseInt(limit));

            return {
                users: paginatedUsers,
                pagination: {
                    total: allUsers.length,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(allUsers.length / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get users from all models error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get admins with filtering
     */
    async getAdmins(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                role,
                search,
                isActive
            } = options;

            const filter = {};

            if (role) {
                filter.role = role;
            }

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true' || isActive === true;
            }

            if (search) {
                filter.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { uid: { $regex: search, $options: 'i' } }
                ];
            }

            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const admins = await User.find(filter)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await User.countDocuments(filter);

            return {
                users: admins,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get admins error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get barbers with filtering
     */
    async getBarbers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
                isActive
            } = options;

            const filter = {};

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true' || isActive === true;
            }

            if (search) {
                filter.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { uid: { $regex: search, $options: 'i' } }
                ];
            }

            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const barbers = await Barber.find(filter)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Barber.countDocuments(filter);

            return {
                users: barbers,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get barbers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get freelancers with filtering
     */
    async getFreelancers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
                isActive
            } = options;

            const filter = {};

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true' || isActive === true;
            }

            if (search) {
                filter.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { uid: { $regex: search, $options: 'i' } }
                ];
            }

            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const freelancers = await Freelancer.find(filter)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments(filter);

            return {
                users: freelancers,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get shop owners with filtering
     */
    async getShopOwners(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
                isActive
            } = options;

            const filter = {};

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true' || isActive === true;
            }

            if (search) {
                filter.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { uid: { $regex: search, $options: 'i' } },
                    { businessName: { $regex: search, $options: 'i' } }
                ];
            }

            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const shopOwners = await ShopOwner.find(filter)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await ShopOwner.countDocuments(filter);

            return {
                users: shopOwners,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get shop owners error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get customers with filtering
     */
    async getCustomers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
                isActive
            } = options;

            const filter = {};

            if (isActive !== undefined) {
                filter.isActive = isActive === 'true' || isActive === true;
            }

            if (search) {
                filter.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { uid: { $regex: search, $options: 'i' } }
                ];
            }

            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const customers = await Customer.find(filter)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Customer.countDocuments(filter);

            return {
                users: customers,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get customers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get user by ID
     * @param {string} id - User ID
     * @returns {Promise<Object>} - User data
     */
    async getUserById(id) {
        try {
            // Try to find in each model
            let user = await Admin.findById(id).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await Barber.findById(id).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await Freelancer.findById(id).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await ShopOwner.findById(id).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await Customer.findById(id).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            throw new Error('User not found');
        } catch (error) {
            logger.error(`Get user by ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get user by UID
     * @param {string} uid - User UID
     * @returns {Promise<Object>} - User data
     */
    async getUserByUid(uid) {
        try {
            // Try to find in each model by uid
            let user = await User.findOne({ uid }).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await Barber.findOne({ uid }).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await Freelancer.findOne({ uid }).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await ShopOwner.findOne({ uid }).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            user = await Customer.findOne({ uid }).select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');
            if (user) return user;

            throw new Error('User not found');
        } catch (error) {
            logger.error(`Get user by UID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a new user (admin function)
     * @param {Object} userData - User data
     * @returns {Promise<Object>} - Created user
     */
    async createUser(userData) {
        try {
            const { role } = userData;

            // Route to appropriate model based on role
            switch (role) {
                case 'admin':
                case 'super_admin':
                case 'country_manager':
                case 'customer_care':
                    return await this.createAdmin(userData);
                case 'barber':
                    return await this.createBarber(userData);
                case 'freelancer':
                    return await this.createFreelancer(userData);
                case 'shop_owner':
                    return await this.createShopOwner(userData);
                case 'customer':
                default:
                    return await this.createCustomer(userData);
            }
        } catch (error) {
            logger.error(`Create user error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create admin user
     */
    async createAdmin(adminData) {
        try {
            // Check if email already exists
            const existingUser = await User.findOne({ email: adminData.email });
            if (existingUser) {
                throw new Error('Email already in use');
            }

            // Create admin object using User model
            const admin = new User({
                email: adminData.email,
                password: adminData.password,
                firstName: adminData.firstName,
                lastName: adminData.lastName,
                profile: {
                    phoneNumber: adminData.phoneNumber || ''
                },
                role: adminData.role || 'admin',
                isActive: adminData.isActive !== undefined ? adminData.isActive : true,
                emailVerified: adminData.emailVerified !== undefined ? adminData.emailVerified : false,
                countryId: adminData.countryId,
                accessibleCountries: adminData.accessibleCountries || []
            });

            await admin.save();

            // Remove sensitive fields
            const adminObj = admin.toObject();
            delete adminObj.password;
            delete adminObj.emailVerificationToken;
            delete adminObj.emailVerificationExpiry;
            delete adminObj.resetPasswordToken;
            delete adminObj.resetPasswordExpiry;

            return adminObj;
        } catch (error) {
            logger.error(`Create admin error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create barber user
     */
    async createBarber(barberData) {
        try {
            // Check if email already exists
            const existingBarber = await Barber.findOne({ email: barberData.email });
            if (existingBarber) {
                throw new Error('Email already in use');
            }

            // Create barber object
            const barber = new Barber({
                email: barberData.email,
                password: barberData.password,
                firstName: barberData.firstName,
                lastName: barberData.lastName,
                profile: {
                    phoneNumber: barberData.phoneNumber || ''
                },
                role: 'barber',
                isActive: barberData.isActive !== undefined ? barberData.isActive : true,
                emailVerified: barberData.emailVerified !== undefined ? barberData.emailVerified : false,
                countryId: barberData.countryId
            });

            await barber.save();

            // Remove sensitive fields
            const barberObj = barber.toObject();
            delete barberObj.password;
            delete barberObj.emailVerificationToken;
            delete barberObj.emailVerificationExpiry;
            delete barberObj.resetPasswordToken;
            delete barberObj.resetPasswordExpiry;

            return barberObj;
        } catch (error) {
            logger.error(`Create barber error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create freelancer user
     */
    async createFreelancer(freelancerData) {
        try {
            // Check if email already exists
            const existingFreelancer = await Freelancer.findOne({ email: freelancerData.email });
            if (existingFreelancer) {
                throw new Error('Email already in use');
            }

            // Create freelancer object
            const freelancer = new Freelancer({
                email: freelancerData.email,
                password: freelancerData.password,
                firstName: freelancerData.firstName,
                lastName: freelancerData.lastName,
                profile: {
                    phoneNumber: freelancerData.phoneNumber || ''
                },
                role: 'freelancer',
                isActive: freelancerData.isActive !== undefined ? freelancerData.isActive : true,
                emailVerified: freelancerData.emailVerified !== undefined ? freelancerData.emailVerified : false,
                countryId: freelancerData.countryId
            });

            await freelancer.save();

            // Remove sensitive fields
            const freelancerObj = freelancer.toObject();
            delete freelancerObj.password;
            delete freelancerObj.emailVerificationToken;
            delete freelancerObj.emailVerificationExpiry;
            delete freelancerObj.resetPasswordToken;
            delete freelancerObj.resetPasswordExpiry;

            return freelancerObj;
        } catch (error) {
            logger.error(`Create freelancer error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create shop owner user
     */
    async createShopOwner(shopOwnerData) {
        try {
            // Check if email already exists
            const existingShopOwner = await ShopOwner.findOne({ email: shopOwnerData.email });
            if (existingShopOwner) {
                throw new Error('Email already in use');
            }

            // Create shop owner object
            const shopOwner = new ShopOwner({
                email: shopOwnerData.email,
                password: shopOwnerData.password,
                firstName: shopOwnerData.firstName,
                lastName: shopOwnerData.lastName,
                profile: {
                    phoneNumber: shopOwnerData.phoneNumber || ''
                },
                role: 'shop_owner',
                isActive: shopOwnerData.isActive !== undefined ? shopOwnerData.isActive : true,
                emailVerified: shopOwnerData.emailVerified !== undefined ? shopOwnerData.emailVerified : false,
                countryId: shopOwnerData.countryId
            });

            await shopOwner.save();

            // Remove sensitive fields
            const shopOwnerObj = shopOwner.toObject();
            delete shopOwnerObj.password;
            delete shopOwnerObj.emailVerificationToken;
            delete shopOwnerObj.emailVerificationExpiry;
            delete shopOwnerObj.resetPasswordToken;
            delete shopOwnerObj.resetPasswordExpiry;

            return shopOwnerObj;
        } catch (error) {
            logger.error(`Create shop owner error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create customer user
     */
    async createCustomer(customerData) {
        try {
            // Check if email already exists
            const existingCustomer = await Customer.findOne({ email: customerData.email });
            if (existingCustomer) {
                throw new Error('Email already in use');
            }

            // Create customer object
            const customer = new Customer({
                email: customerData.email,
                password: customerData.password,
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                phoneNumber: customerData.phoneNumber || '',
                role: 'customer',
                isActive: customerData.isActive !== undefined ? customerData.isActive : true,
                emailVerified: customerData.emailVerified !== undefined ? customerData.emailVerified : false,
                countryId: customerData.countryId
            });

            await customer.save();

            // Remove sensitive fields
            const customerObj = customer.toObject();
            delete customerObj.password;
            delete customerObj.emailVerificationToken;
            delete customerObj.emailVerificationExpiry;
            delete customerObj.resetPasswordToken;
            delete customerObj.resetPasswordExpiry;

            return customerObj;
        } catch (error) {
            logger.error(`Create customer error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update user
     * @param {string} id - User ID
     * @param {Object} updateData - User data to update
     * @returns {Promise<Object>} - Updated user
     */
    async updateUser(id, updateData) {
        try {
            const user = await User.findById(id);

            if (!user) {
                throw new Error('User not found');
            }

            // Update allowed fields
            if (updateData.firstName) user.firstName = updateData.firstName;
            if (updateData.lastName) user.lastName = updateData.lastName;
            if (updateData.profileImage) user.profileImage = updateData.profileImage;
            if (updateData.isActive !== undefined) user.isActive = updateData.isActive;
            if (updateData.emailVerified !== undefined) user.emailVerified = updateData.emailVerified;

            // Update FCM token if provided
            if (updateData.fcmToken !== undefined) {
                if (typeof updateData.fcmToken === 'object' && updateData.fcmToken.token) {
                    user.fcmToken = updateData.fcmToken.token;
                } else if (typeof updateData.fcmToken === 'string') {
                    user.fcmToken = updateData.fcmToken;
                } else if (updateData.fcmToken) {
                    user.fcmToken = String(updateData.fcmToken);
                } else {
                    user.fcmToken = null;
                }
            }

            // Update phone number if provided
            if (updateData.phoneNumber) {
                if (!user.profile) user.profile = {};
                user.profile.phoneNumber = updateData.phoneNumber;
            }

            // Update role if provided
            if (updateData.role) {
                const role = await Role.findOne({ name: updateData.role });
                if (!role) {
                    throw new Error('Role not found');
                }
                user.role = role.name;
                user.roleId = role._id;
            }

            // Save changes
            await user.save();

            // Remove sensitive fields
            const userObj = user.toObject();
            delete userObj.password;
            delete userObj.emailVerificationToken;
            delete userObj.emailVerificationExpiry;
            delete userObj.resetPasswordToken;
            delete userObj.resetPasswordExpiry;

            return userObj;
        } catch (error) {
            logger.error(`Update user error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update user FCM token
     * @param {string} userId - User ID
     * @param {string} fcmToken - FCM token
     * @returns {Promise<Object>} - Updated user
     */
    async updateFCMToken(userId, fcmToken) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            // Handle different types of FCM token input
            if (typeof fcmToken === 'object' && fcmToken.token) {
                user.fcmToken = fcmToken.token;
            } else if (typeof fcmToken === 'string') {
                user.fcmToken = fcmToken;
            } else if (fcmToken) {
                user.fcmToken = String(fcmToken);
            } else {
                user.fcmToken = null;
            }

            await user.save();

            logger.info(`FCM token updated for user ${userId}`);
            
            return {
                success: true,
                message: 'FCM token updated successfully'
            };
        } catch (error) {
            logger.error(`Update FCM token error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete user
     * @param {string} id - User ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteUser(id) {
        try {
            const user = await User.findById(id);

            if (!user) {
                throw new Error('User not found');
            }

            // Delete user profile based on role
            switch (user.role) {
                case ROLES.CUSTOMER:
                    await Customer.findOneAndDelete({ userId: user._id });
                    break;
                case ROLES.SHOP_OWNER:
                    await ShopOwner.findOneAndDelete({ userId: user._id });
                    break;
                case ROLES.BARBER:
                    await Barber.findOneAndDelete({ userId: user._id });
                    break;
            }

            // Delete the user
            await User.findByIdAndDelete(id);

            return true;
        } catch (error) {
            logger.error(`Delete user error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update user password (admin function)
     * @param {string} id - User ID
     * @param {string} newPassword - New password
     * @returns {Promise<boolean>} - Success status
     */
    async resetUserPassword(id, newPassword) {
        try {
            // Try to find user in different collections
            let user = null;

            // Check Customer collection
            user = await Customer.findById(id);
            if (!user) {
                // Check Barber collection
                user = await Barber.findById(id);
                if (!user) {
                    // Check Freelancer collection
                    user = await Freelancer.findById(id);
                    if (!user) {
                        // Check ShopOwner collection
                        user = await ShopOwner.findById(id);
                        if (!user) {
                            // Check Admin collection
                            user = await Admin.findById(id);
                        }
                    }
                }
            }

            if (!user) {
                throw new Error('User not found');
            }

            // Update password (pre-save hook will hash it)
            user.password = newPassword;
            await user.save();

            return true;
        } catch (error) {
            logger.error(`Reset user password error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get users by role
     * @param {string} roleName - Role name
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of users
     */
    async getUsersByRole(roleName, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search,
                emailVerified
            } = options;

            // Build filter query
            const filter = { role: roleName };
            if (typeof emailVerified === 'boolean' || emailVerified === true || emailVerified === false) {
                filter.emailVerified = emailVerified;
            }
            if (search) {
                filter.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { uid: { $regex: search, $options: 'i' } }
                ];
            }

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Execute query with pagination
            const users = await User.find(filter)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            // Get total count for pagination
            const total = await User.countDocuments(filter);

            return {
                users,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get users by role error: ${error.message}`);
            throw error;
        }
    }

    async assignCountryToManager(userId, countryId) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            // Check if user is a country manager
            if (user.role !== ROLES.COUNTRY_MANAGER) {
                throw new Error('User must have country_manager role');
            }

            // Check if country exists
            const country = await Country.findById(countryId);
            if (!country) {
                throw new Error('Country not found');
            }

            // Update user's country
            user.countryId = countryId;

            // Add to accessible countries if not already there
            if (!user.accessibleCountries.includes(countryId)) {
                user.accessibleCountries.push(countryId);
            }

            await user.save();

            return user;
        } catch (error) {
            logger.error(`Assign country to manager error: ${error.message}`);
            throw error;
        }
    }

    async assignShopToCustomerCare(userId, shopId) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            // Check if user is a customer care
            if (user.role !== ROLES.CUSTOMER_CARE) {
                throw new Error('User must have customer_care role');
            }

            // Check if shop exists
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw new Error('Shop not found');
            }

            // Add to accessible shops if not already there
            if (!user.accessibleShops) {
                user.accessibleShops = [];
            }

            if (!user.accessibleShops.includes(shopId)) {
                user.accessibleShops.push(shopId);
            }

            await user.save();

            return user;
        } catch (error) {
            logger.error(`Assign shop to customer care error: ${error.message}`);
            throw error;
        }
    }

    async assignCustomerToCustomerCare(userId, customerId) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            // Check if user is a customer care
            if (user.role !== ROLES.CUSTOMER_CARE) {
                throw new Error('User must have customer_care role');
            }

            // Check if customer exists
            const customer = await User.findById(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Add to accessible customers if not already there
            if (!user.accessibleCustomers) {
                user.accessibleCustomers = [];
            }

            if (!user.accessibleCustomers.includes(customerId)) {
                user.accessibleCustomers.push(customerId);
            }

            await user.save();

            return user;
        } catch (error) {
            logger.error(`Assign customer to customer care error: ${error.message}`);
            throw error;
        }
    }

    /**
 * Count users with optional filtering
 * @param {Object} filter - Filter criteria
 * @returns {Promise<number>} - Count of users
 */
    async countUsers(filter = {}) {
        try {
            return await User.countDocuments(filter);
        } catch (error) {
            logger.error(`Count users error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get user growth statistics
     * @param {Object} options - Query options including date range
     * @returns {Promise<Object>} - User growth statistics
     */
    async getUserGrowthStats(options = {}) {
        try {
            const { startDate, endDate } = options;

            // Build date filter
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }

            // Get total users by role
            const [
                totalUsers,
                customers,
                shopOwners,
                barbers
            ] = await Promise.all([
                this.countUsers(dateFilter),
                this.countUsers({ ...dateFilter, role: ROLES.CUSTOMER }),
                this.countUsers({ ...dateFilter, role: ROLES.SHOP_OWNER }),
                this.countUsers({ ...dateFilter, role: ROLES.BARBER })
            ]);

            // Get daily user registration counts
            const userGrowth = await this.getDailyUserCounts(startDate, endDate);

            // Get user distribution by country
            const usersByCountry = await User.aggregate([
                { $match: dateFilter },
                {
                    $lookup: {
                        from: 'customers',
                        localField: '_id',
                        foreignField: 'userId',
                        as: 'customerInfo'
                    }
                },
                { $unwind: { path: '$customerInfo', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'barbers',
                        localField: '_id',
                        foreignField: 'userId',
                        as: 'barberInfo'
                    }
                },
                { $unwind: { path: '$barberInfo', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $ifNull: ['$barberInfo.countryId', false] },
                                '$barberInfo.countryId',
                                { $cond: [{ $ifNull: ['$countryId', false] }, '$countryId', null] }
                            ]
                        },
                        count: { $sum: 1 }
                    }
                },
                { $match: { '_id': { $ne: null } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]);

            return {
                counts: {
                    total: totalUsers,
                    customers,
                    shopOwners,
                    barbers
                },
                growthTrend: userGrowth,
                countryDistribution: usersByCountry
            };
        } catch (error) {
            logger.error(`Get user growth stats error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get daily user registration counts for a date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Array>} - Daily user counts
     * @private
     */
    async getDailyUserCounts(startDate, endDate) {
        try {
            const dateFilter = {};
            if (startDate || endDate) {
                dateFilter.createdAt = {};
                if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
                if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
            }

            const dailyCounts = await User.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' },
                            day: { $dayOfMonth: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        customers: {
                            $sum: { $cond: [{ $eq: ['$role', ROLES.CUSTOMER] }, 1, 0] }
                        },
                        barbers: {
                            $sum: { $cond: [{ $eq: ['$role', ROLES.BARBER] }, 1, 0] }
                        },
                        shopOwners: {
                            $sum: { $cond: [{ $eq: ['$role', ROLES.SHOP_OWNER] }, 1, 0] }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: {
                                    $dateFromParts: {
                                        year: '$_id.year',
                                        month: '$_id.month',
                                        day: '$_id.day'
                                    }
                                }
                            }
                        },
                        totalUsers: '$count',
                        customers: 1,
                        barbers: 1,
                        shopOwners: 1
                    }
                },
                { $sort: { date: 1 } }
            ]);

            return dailyCounts;
        } catch (error) {
            logger.error(`Get daily user counts error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new UserService();