// src/services/platformFeeService.js
const PlatformFee = require('../models/PlatformFee');
const Country = require('../models/Country');
const logger = require('../utils/logger');

/**
 * PlatformFeeService provides methods for managing country-based platform fees
 */
class PlatformFeeService {
    /**
     * Create platform fees for a country
     * @param {string} countryId - Country ID
     * @param {Object} feeData - Platform fee data (freelanceBarberFee, shopFee)
     * @param {string} userId - Admin user ID who created the fees
     * @returns {Promise<Object>} - Created platform fee
     */
    async createPlatformFees(countryId, feeData, userId) {
        try {
            // Check if country exists
            const country = await Country.findById(countryId);
            if (!country) {
                throw new Error('Country not found');
            }

            // Check if platform fee already exists for this country
            const existingPlatformFee = await PlatformFee.findOne({ countryId });
            if (existingPlatformFee) {
                throw new Error('Platform fee already exists for this country');
            }

            // Validate fees
            if (feeData.freelanceBarberFee < 0 || feeData.freelanceBarberFee > 100) {
                throw new Error('Freelance barber platform fee must be between 0 and 100');
            }

            if (feeData.shopFee < 0 || feeData.shopFee > 100) {
                throw new Error('Shop platform fee must be between 0 and 100');
            }

            // Create new platform fee
            const platformFee = new PlatformFee({
                countryId,
                freelanceBarberFee: feeData.freelanceBarberFee,
                shopFee: feeData.shopFee,
                isActive: feeData.isActive !== undefined ? feeData.isActive : true,
                lastUpdatedBy: userId
            });

            await platformFee.save();
            return platformFee;
        } catch (error) {
            logger.error(`Create platform fees error: ${error.message}`);
            throw error;
        }
    }
    /**
     * Set platform fees for a country
     * @param {string} countryId - Country ID
     * @param {Object} feeData - Platform fee data (freelanceBarberFee, shopFee)
     * @param {string} userId - Admin user ID who updated the fees
     * @returns {Promise<Object>} - Updated platform fee
     */
    async setPlatformFees(countryId, feeData, userId) {
        try {
            // Check if country exists
            const country = await Country.findById(countryId);
            if (!country) {
                throw new Error('Country not found');
            }

            // Validate fees
            if (feeData.freelanceBarberFee < 0 || feeData.freelanceBarberFee > 100) {
                throw new Error('Freelance barber platform fee must be between 0 and 100');
            }

            if (feeData.shopFee < 0 || feeData.shopFee > 100) {
                throw new Error('Shop platform fee must be between 0 and 100');
            }

            // Find existing fee or create new one
            let platformFee = await PlatformFee.findOne({ countryId });

            if (platformFee) {
                // Update existing fee
                platformFee.freelanceBarberFee = feeData.freelanceBarberFee;
                platformFee.shopFee = feeData.shopFee;
                platformFee.isActive = feeData.isActive !== undefined ? feeData.isActive : platformFee.isActive;
                platformFee.lastUpdatedBy = userId;
            } else {
                // Create new fee
                platformFee = new PlatformFee({
                    countryId,
                    freelanceBarberFee: feeData.freelanceBarberFee,
                    shopFee: feeData.shopFee,
                    isActive: feeData.isActive !== undefined ? feeData.isActive : true,
                    lastUpdatedBy: userId
                });
            }

            await platformFee.save();
            return platformFee;
        } catch (error) {
            logger.error(`Set platform fees error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get platform fees for a country
     * @param {string} countryId - Country ID
     * @returns {Promise<Object>} - Platform fee data
     */
    async getPlatformFees(countryId) {
        try {
            const platformFee = await PlatformFee.findOne({ countryId })
                .populate('countryId', 'name code')
                .populate('lastUpdatedBy', 'firstName lastName email');

            if (!platformFee) {
                // Return default fees if not set
                return {
                    countryId,
                    freelanceBarberFee: 10, // Default freelance barber fee
                    shopFee: 15,            // Default shop fee
                    isActive: true,
                    isDefault: true
                };
            }

            return platformFee;
        } catch (error) {
            logger.error(`Get platform fees error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all platform fees with optional filtering
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - List of platform fees
     */
    async getAllPlatformFees(options = {}) {
        try {
            const {
                isActive,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                page = 1,
                limit = 20
            } = options;

            // Build filter
            const filter = {};
            if (isActive !== undefined) {
                filter.isActive = isActive;
            }

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Execute query
            const platformFees = await PlatformFee.find(filter)
                .populate('countryId', 'name code')
                .populate('lastUpdatedBy', 'firstName lastName email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count
            const total = await PlatformFee.countDocuments(filter);

            return {
                platformFees,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get all platform fees error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete platform fee
     * @param {string} countryId - Country ID
     * @returns {Promise<boolean>} - Success status
     */
    async deletePlatformFee(countryId) {
        try {
            const result = await PlatformFee.deleteOne({ countryId });
            return result.deletedCount > 0;
        } catch (error) {
            logger.error(`Delete platform fee error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get applicable platform fee for a booking
     * @param {Object} booking - Booking object with barberId and shopId
     * @returns {Promise<Object>} - Applicable fees
     */
    async getApplicableFee(booking) {
        try {
            // Get barber to determine employment type
            const Barber = require('../models/Barber');
            const barber = await Barber.findById(booking.barberId);

            if (!barber) {
                throw new Error('Barber not found');
            }

            // Get country-based platform fees
            const platformFee = await PlatformFee.findOne({
                countryId: barber.countryId,
                isActive: true
            });

            let freelanceBarberFee = 10; // Default
            let shopFee = 15; // Default

            if (platformFee) {
                freelanceBarberFee = platformFee.freelanceBarberFee;
                shopFee = platformFee.shopFee;
            }

            // Determine which fee to apply based on barber's employment type
            const { User } = require('../models/User');
            const { EMPLOYMENT_TYPES } = User;

            const isFreelance = barber.employmentType === EMPLOYMENT_TYPES.FREELANCE;

            return {
                freelanceBarberFee,
                shopFee,
                isFreelance,
                // For employed barbers, only shop fee applies
                // For freelance barbers, only freelance barber fee applies
                applicableFee: isFreelance ? freelanceBarberFee : shopFee,
                feeType: isFreelance ? 'barber' : 'shop'
            };
        } catch (error) {
            logger.error(`Get applicable fee error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new PlatformFeeService();