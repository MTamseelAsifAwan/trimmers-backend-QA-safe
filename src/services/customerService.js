// src/services/customerService.js
const Customer = require('../models/Customer');
const { User, ROLES } = require('../models/User');
const logger = require('../utils/logger');

/**
 * CustomerService provides methods for customer management
 */
class CustomerService {
    /**
     * Create a new customer profile
     * @param {string} userId - User ID
     * @param {Object} customerData - Customer data
     * @returns {Promise<Object>} - Created customer
     */
    async createCustomerProfile(userId, customerData = {}) {
        try {
            // For customer users, they already exist in Customer collection
            // Just return the existing customer data
            const existingCustomer = await Customer.findById(userId)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

            if (existingCustomer) {
                logger.info(`Customer profile already exists for user: ${userId}`);
                return existingCustomer;
            }

            // If somehow we get here, try the old logic as fallback
            logger.warn(`Customer not found by _id, trying alternative lookup for user: ${userId}`);

            // First try to find user in User collection
            let user = await User.findById(userId).populate('roleId');

            // If not found in User collection, try Customer collection (for existing customer users)
            if (!user) {
                const customerUser = await Customer.findById(userId);
                if (customerUser) {
                    // Create a minimal user object from customer data
                    user = {
                        _id: customerUser._id,
                        email: customerUser.email || customerData.email,
                        displayName: customerUser.displayName || customerData.displayName,
                        countryId: customerUser.countryId || customerData.countryId,
                        role: 'customer',
                        roleId: null // Will be handled by auth middleware
                    };
                    logger.info(`Using customer data for user creation: ${user.email}`);
                }
            }

            if (!user) {
                throw new Error('User not found in any collection');
            }

            // Check if user has customer role (either from role field or roleId)
            const userRole = user.role || (user.roleId && user.roleId.name);
            if (userRole !== 'customer' && userRole !== ROLES.CUSTOMER) {
                throw new Error('Only users with customer role can have a customer profile');
            }

            // Check if customer profile already exists (using userId field)
            const existingCustomerAlt = await Customer.findOne({ userId });
            if (existingCustomerAlt) {
                throw new Error('Customer profile already exists for this user');
            }

            // Create new customer
            const customer = new Customer({
                userId,
                displayName: customerData.displayName || user.displayName || user.email || 'Customer',
                areaId: customerData?.areaId,
                addresses: customerData.addresses || [],
                defaultAddress: customerData.defaultAddress || 0,
                countryId: customerData.countryId || user.countryId || null,
                favoriteShops: customerData.favoriteShops || [],
                favoriteBarbers: customerData.favoriteBarbers || [],
                stripeCustomerId: customerData.stripeCustomerId || null
            });

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Create customer profile error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get customer by user ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Customer data
     */
    async getCustomerByUserId(userId) {
        try {
            // Since customer users are stored directly in Customer collection,
            // we should find by _id, not by userId field
            const customer = await Customer.findById(userId)
                .select('-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

            // Return null instead of throwing error if customer not found
            if (!customer) {
                return null;
            }

            return customer;
        } catch (error) {
            logger.error(`Get customer by user ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get customer by ID
     * @param {string} id - Customer ID
     * @returns {Promise<Object>} - Customer data
     */
    async getCustomerById(id) {
        try {
            const customer = await Customer.findById(id)
                .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            return customer;
        } catch (error) {
            logger.error(`Get customer by ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get customer by UID
     * @param {string} uid - Customer UID
     * @returns {Promise<Object>} - Customer data
     */
    async getCustomerByUid(uid) {
        try {
            const customer = await Customer.findOne({ uid })
                .populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            return customer;
        } catch (error) {
            logger.error(`Get customer by UID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update customer profile
     * @param {string} userId - User ID
     * @param {Object} updateData - Customer data to update
     * @returns {Promise<Object>} - Updated customer
     */
    async updateCustomerProfile(userId, updateData) {
        try {
            // Find customer by _id since customers are stored directly in Customer collection
            const customer = await Customer.findById(userId);

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Update allowed fields
            const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'profileImage', 'stripeCustomerId'];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    customer[field] = updateData[field];
                }
            });
           
                // Update countryId if provided
                if (updateData.countryId !== undefined) {
                    customer.countryId = updateData.countryId;
                }

            // Update profile sub-fields if provided
            if (updateData.profile) {
                if (!customer.profile) customer.profile = {};
                if (updateData.profile.phoneNumber !== undefined) {
                    customer.profile.phoneNumber = updateData.profile.phoneNumber;
                }
                if (updateData.profile.address !== undefined) {
                    customer.profile.address = updateData.profile.address;
                }
                if (updateData.profile.city !== undefined) {
                    customer.profile.city = updateData.profile.city;
                }
                if (updateData.profile.zipCode !== undefined) {
                    customer.profile.zipCode = updateData.profile.zipCode;
                }
            }

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Update customer profile error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add address to customer
     * @param {string} userId - User ID
     * @param {Object} address - Address data
     * @returns {Promise<Object>} - Updated customer
     */
    async addAddress(userId, address) {
        try {
            // Validate address
            if (!address.latitude || !address.longitude || !address.formattedAddress) {
                throw new Error('Address must include latitude, longitude, and formattedAddress');
            }

            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Add address
            customer.addresses.push(address);

            // If this is the first address, set it as default
            if (customer.addresses.length === 1) {
                customer.defaultAddress = 0;
            }

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Add customer address error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update customer address
     * @param {string} userId - User ID
     * @param {number} addressIndex - Index of the address to update
     * @param {Object} updatedAddress - Updated address data
     * @returns {Promise<Object>} - Updated customer
     */
    async updateAddress(userId, addressIndex, updatedAddress) {
        try {
            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Check if address exists
            if (!customer.addresses[addressIndex]) {
                throw new Error(`Address at index ${addressIndex} not found`);
            }

            // Update address fields
            customer.addresses[addressIndex] = {
                ...customer.addresses[addressIndex],
                ...updatedAddress
            };

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Update customer address error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete customer address
     * @param {string} userId - User ID
     * @param {number} addressIndex - Index of the address to delete
     * @returns {Promise<Object>} - Updated customer
     */
    async deleteAddress(userId, addressIndex) {
        try {
            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Check if address exists
            if (!customer.addresses[addressIndex]) {
                throw new Error(`Address at index ${addressIndex} not found`);
            }

            // Remove address
            customer.addresses.splice(addressIndex, 1);

            // Update default address if needed
            if (customer.defaultAddress === addressIndex) {
                customer.defaultAddress = customer.addresses.length > 0 ? 0 : -1;
            } else if (customer.defaultAddress > addressIndex) {
                // Adjust default address index if it was after the deleted one
                customer.defaultAddress--;
            }

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Delete customer address error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Set default address
     * @param {string} userId - User ID
     * @param {number} addressIndex - Index of the address to set as default
     * @returns {Promise<Object>} - Updated customer
     */
    async setDefaultAddress(userId, addressIndex) {
        try {
            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Check if address exists
            if (!customer.addresses[addressIndex]) {
                throw new Error(`Address at index ${addressIndex} not found`);
            }

            // Set as default
            customer.defaultAddress = addressIndex;

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Set default address error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add shop to favorites
     * @param {string} userId - User ID
     * @param {string} shopId - Shop ID
     * @returns {Promise<Object>} - Updated customer
     */
    async addFavoriteShop(userId, shopId) {
        try {
            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Check if already in favorites
            if (customer.favoriteShops.includes(shopId)) {
                return customer; // Already a favorite, no need to add again
            }

            // Add to favorites
            customer.favoriteShops.push(shopId);

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Add favorite shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Remove shop from favorites
     * @param {string} userId - User ID
     * @param {string} shopId - Shop ID
     * @returns {Promise<Object>} - Updated customer
     */
    async removeFavoriteShop(userId, shopId) {
        try {
            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Filter out the shop
            customer.favoriteShops = customer.favoriteShops.filter(
                id => id.toString() !== shopId.toString()
            );

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Remove favorite shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add barber to favorites
     * @param {string} userId - User ID
     * @param {string} barberId - Barber ID
     * @returns {Promise<Object>} - Updated customer
     */
    async addFavoriteBarber(userId, barberId) {
        try {
            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Check if already in favorites
            if (customer.favoriteBarbers.includes(barberId)) {
                return customer; // Already a favorite, no need to add again
            }

            // Add to favorites
            customer.favoriteBarbers.push(barberId);

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Add favorite barber error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Remove barber from favorites
     * @param {string} userId - User ID
     * @param {string} barberId - Barber ID
     * @returns {Promise<Object>} - Updated customer
     */
    async removeFavoriteBarber(userId, barberId) {
        try {
            const customer = await Customer.findOne({ userId });

            if (!customer) {
                throw new Error('Customer profile not found');
            }

            // Filter out the barber
            customer.favoriteBarbers = customer.favoriteBarbers.filter(
                id => id.toString() !== barberId.toString()
            );

            await customer.save();

            return customer;
        } catch (error) {
            logger.error(`Remove favorite barber error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all customers with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of customers
     */
    async getCustomers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                search
            } = options;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build basic query
            let query = Customer.find();

            // Apply search if provided
            if (search) {
                // Get user IDs matching the search
                const users = await User.find({
                    $or: [
                        { email: { $regex: search, $options: 'i' } },
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { uid: { $regex: search, $options: 'i' } }
                    ]
                }).select('_id');

                const userIds = users.map(user => user._id);

                if (userIds.length > 0) {
                    query = query.where('userId').in(userIds);
                } else {
                    // No users match search, return empty result
                    return {
                        customers: [],
                        pagination: {
                            total: 0,
                            page: parseInt(page),
                            limit: parseInt(limit),
                            pages: 0
                        }
                    };
                }
            }

            // Apply sorting
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
            query = query.sort(sort);

            // Apply pagination
            query = query.skip(skip).limit(parseInt(limit));

            // Execute query
            const customers = await query.populate('userId', '-password -emailVerificationToken -emailVerificationExpiry -resetPasswordToken -resetPasswordExpiry');

            // Get total count
            const total = await Customer.countDocuments(query.getFilter());

            return {
                customers,
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

    async getNumberOfCustomers(filters = {}) {
        try {
            const count = await Customer.countDocuments(filters);
            return count;
        } catch (error) {
            logger.error(`Get number of customers error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new CustomerService();