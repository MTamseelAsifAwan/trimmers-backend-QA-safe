// src/services/freelancerService.js
const Freelancer = require('../models/Freelancer');
const { User, ROLES } = require('../models/User');
const Service = require('../models/Service');
const logger = require('../utils/logger');
const { generateModelId, MODEL_PREFIXES } = require('../utils/idGenerator');
// const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
const { uploadToLocal } = require('../config/localStorage'); // Using local storage instead

/**
 * Convert schedule from object format to array format for Freelancer model
 * @param {Object} scheduleObj - Schedule object with day keys
 * @returns {Array} - Schedule array for database storage
 */
const convertScheduleToArray = (scheduleObj) => {
    if (!scheduleObj || typeof scheduleObj !== 'object') {
        return [];
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const scheduleArray = [];

    days.forEach(day => {
        const daySchedule = scheduleObj[day];
        if (daySchedule) {
            // For unavailable days, provide default time values since model requires them
            const from = daySchedule.status === 'unavailable' ? '00:00' : (daySchedule.from || '00:00');
            const to = daySchedule.status === 'unavailable' ? '00:00' : (daySchedule.to || '00:00');
            scheduleArray.push({
                from: from,
                to: to,
                status: daySchedule.status || 'unavailable'
            });
        } else {
            scheduleArray.push({
                from: '00:00',
                to: '00:00',
                status: 'unavailable'
            });
        }
    });

    return scheduleArray;
};

/**
 * FreelancerService provides methods for freelancer management
 */
class FreelancerService {
    /**
     * Create a new freelancer profile
     * @param {string} userId - User ID
     * @param {Object} freelancerData - Freelancer data
     * @returns {Promise<Object>} - Created freelancer
     */
    async createFreelancerProfile(userId, freelancerData) {
        try {
            // For freelancers, the userId is the freelancer's _id, so check if freelancer exists
            const existingFreelancer = await Freelancer.findById(userId);
            if (existingFreelancer) {
                logger.warn(`Freelancer profile already exists for ${userId}. Returning existing profile.`);
                return existingFreelancer;
            }

            // Handle profile image upload if provided
            let profileImageUrl = freelancerData.profileImage || null;
            if (freelancerData.profileImageBlob) {
                // const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
                // const uploadResult = await uploadToS3(freelancerData.profileImageBlob, 'freelancer-profiles');
                const uploadResult = await uploadToLocal(freelancerData.profileImageBlob, 'freelancer-profiles');
                profileImageUrl = uploadResult.Key; // Store relative path instead of full URL
            }

            // Handle ID document upload if provided
            let idImageUrl = freelancerData.nationalId?.idImageUrl || null;
            if (freelancerData.idImageBlob) {
                const uploadResult = await uploadToLocal(freelancerData.idImageBlob, 'freelancer-documents');
                idImageUrl = uploadResult.Key; // Store relative path instead of full URL
            }

            // Create new freelancer
            const freelancer = new Freelancer({
                _id: userId, // Set the _id to userId
                uid: freelancerData.uid || generateModelId(MODEL_PREFIXES.FREELANCER),
                userId: userId, // Set userId to the same
                email: freelancerData.email,
                firstName: freelancerData.firstName || '',
                lastName: freelancerData.lastName || '',
                phoneNumber: freelancerData.phoneNumber,
                serviceType: freelancerData.serviceType || 'homeBased',
                schedule: convertScheduleToArray(freelancerData.schedule),
                services: freelancerData.services || [],
                addresses: freelancerData.addresses || [],
                profile: {
                    ...freelancerData.profile,
                    location: freelancerData.profile && freelancerData.profile.location ? freelancerData.profile.location : undefined
                },
                profileImage: profileImageUrl,
                nationalId: freelancerData.nationalId ? {
                    ...freelancerData.nationalId,
                    idImageUrl: idImageUrl || freelancerData.nationalId.idImageUrl
                } : undefined,
                status: freelancerData.status || 'inactive',
                verificationStatus: freelancerData.verificationStatus || 'pending',
                role: 'freelancer'
            });

            await freelancer.save();
            return freelancer;
        } catch (error) {
            logger.error(`Create freelancer profile error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get freelancer by user ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Freelancer data
     */
    async getFreelancerByUserId(userId) {
        try {
            const freelancer = await Freelancer.findById(userId)
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                });

            if (!freelancer) {
                throw new Error('Freelancer profile not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Get freelancer by user ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get freelancer by ID
     * @param {string} id - Freelancer ID
     * @returns {Promise<Object>} - Freelancer data with populated services
     */
    async getFreelancerById(id) {
        try {
            const freelancer = await Freelancer.findById(id)
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                });

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Get freelancer by ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all freelancers with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Freelancers with pagination
     */
    async getFreelancers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                serviceType,
                search,
                shopId,
                verificationStatus,
                countryId,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            // Build query
            const query = {};

            // Filter by status (operational status)
            if (status) {
                query.status = status;
            }

            // Filter by service type
            if (serviceType) {
                query.serviceType = serviceType;
            }

            // Filter by verification status
            if (verificationStatus) {
                query.verificationStatus = verificationStatus;
            }

            // Search by name or email
            if (search) {
                query.$or = [
                    { 'profile.firstName': { $regex: search, $options: 'i' } },
                    { 'profile.lastName': { $regex: search, $options: 'i' } }
                ];
            }

            // Filter by shop
            if (shopId) {
                query.shopId = shopId;
            }

            // Filter by country
            if (countryId) {
                query['profile.location.countryId'] = countryId;
            }

            // Calculate pagination
            const skip = (page - 1) * limit;
            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Execute query with population
            const freelancers = await Freelancer.find(query)
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            // Get total count for pagination
            const total = await Freelancer.countDocuments(query);

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get freelancer by ID
     * @param {string} id - Freelancer ID
     * @returns {Promise<Object>} - Freelancer data
     */
    async getFreelancerById(id) {
        try {
            const freelancer = await Freelancer.findById(id)
                .populate('countryId', 'name')
                .populate('services');

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Get freelancer by ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update freelancer
     * @param {string} id - Freelancer ID
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} - Updated freelancer
     */
    async updateFreelancer(id, updateData) {
        try {
            // Handle profile image upload if provided
            if (updateData.profileImageBlob) {
                const uploadResult = await uploadToLocal(updateData.profileImageBlob, 'freelancer-profiles');
                updateData.profileImage = uploadResult.Key; // Store relative path instead of full URL
                delete updateData.profileImageBlob; // Remove blob from update data
            }

            // Handle ID document upload if provided
            if (updateData.idImageBlob) {
                const uploadResult = await uploadToLocal(updateData.idImageBlob, 'freelancer-documents');
                if (updateData.nationalId) {
                    updateData.nationalId = { ...updateData.nationalId, idImageUrl: uploadResult.Key };
                } else {
                    updateData.nationalId = { idImageUrl: uploadResult.Key };
                }
                delete updateData.idImageBlob; // Remove blob from update data
            }

            // Handle approval/rejection workflow
            const finalUpdateData = { ...updateData };
            
            if (finalUpdateData.status === 'active') {
                finalUpdateData.verificationStatus = 'verified';
                finalUpdateData.verifiedAt = new Date();
            } else if (finalUpdateData.status === 'rejected') {
                // For rejection, only set verificationStatus to 'rejected', keep status as 'active'
                finalUpdateData.verificationStatus = 'rejected';
                finalUpdateData.status = 'active'; // Keep status active even when rejected
                finalUpdateData.rejectedAt = new Date();
                // rejectionReason should be provided in updateData
            }

            const freelancer = await Freelancer.findByIdAndUpdate(id, finalUpdateData, { new: true })
                .populate('countryId', 'name')
                .populate('services');

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Update freelancer error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update freelancer profile by user ID
     * @param {string} userId - User ID (freelancer's _id)
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} - Updated freelancer
     */
    async updateFreelancerProfile(userId, updateData) {
        try {
            // Handle location field mapping - API accepts 'location' but model stores 'profile.location'
            if (updateData.location) {
                updateData.profile = updateData.profile || {};
                updateData.profile.location = {
                    ...updateData.location,
                    formattedAddress: updateData.location.address // Map 'address' to 'formattedAddress'
                };
                delete updateData.location;
            }

            // Handle profile image upload if provided
            if (updateData.profileImageBlob) {
                const uploadResult = await uploadToLocal(updateData.profileImageBlob, 'freelancer-profiles');
                updateData.profileImage = uploadResult.Key; // Store relative path instead of full URL
            }

            // Handle ID document upload if provided
            if (updateData.idImageBlob) {
                const uploadResult = await uploadToLocal(updateData.idImageBlob, 'freelancer-documents');
                if (updateData.nationalId) {
                    updateData.nationalId.idImageUrl = uploadResult.Key;
                } else {
                    updateData.nationalId = { idImageUrl: uploadResult.Key };
                }
            }

            // Convert nested updates to dot notation to avoid replacing entire objects
            const setData = {};

            const convertToDotNotation = (obj, prefix = '') => {
                Object.keys(obj).forEach(key => {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                        // Recursively handle nested objects
                        convertToDotNotation(obj[key], fullKey);
                    } else {
                        setData[fullKey] = obj[key];
                    }
                });
            };

            convertToDotNotation(updateData);

            const freelancer = await Freelancer.findByIdAndUpdate(
                userId,
                { $set: setData },
                { new: true }
            )
                .populate('services')
                .populate('countryId', 'name');

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Update freelancer profile error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Upload profile image for freelancer
     * @param {string} id - Freelancer ID
     * @param {Object} file - Uploaded file object
     * @returns {Promise<Object>} - Updated freelancer
     */
    async uploadProfileImage(id, file) {
        try {
            // const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
            // const uploadResult = await uploadToS3(file, 'freelancer-profiles');
            const uploadResult = await uploadToLocal(file, 'freelancer-profiles');

            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                { profileImage: uploadResult.Key }, // Store relative path instead of full URL
                { new: true }
            );

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Upload profile image error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete freelancer
     * @param {string} id - Freelancer ID
     * @returns {Promise<void>}
     */
    async deleteFreelancer(id) {
        try {
            const freelancer = await Freelancer.findByIdAndDelete(id);

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Delete freelancer error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Block freelancer
     * @param {string} id - Freelancer ID
     * @param {string} blockReason - Reason for blocking
     * @returns {Promise<Object>} - Updated freelancer
     */
    async blockFreelancer(id, blockReason) {
        try {
            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                {
                    status: 'blocked',
                    blockReason,
                    blockedAt: new Date()
                },
                { new: true }
            ).populate('countryId', 'name')
             .populate({
                 path: 'services',
                 select: 'title description price duration category icon status uid _id'
             });

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Block freelancer error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Unblock freelancer
     * @param {string} id - Freelancer ID
     * @returns {Promise<Object>} - Updated freelancer
     */
    async unblockFreelancer(id) {
        try {
            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                {
                    status: 'active',
                    blockReason: null,
                    blockedAt: null
                },
                { new: true }
            ).populate('countryId', 'name')
             .populate({
                 path: 'services',
                 select: 'title description price duration category icon status uid _id'
             });

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Unblock freelancer error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Set freelancer on leave
     * @param {string} id - Freelancer ID
     * @returns {Promise<Object>} - Updated freelancer
     */
    async setFreelancerOnLeave(id) {
        try {
            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                { status: 'on_leave' },
                { new: true }
            ).populate('countryId', 'name')
             .populate({
                 path: 'services',
                 select: 'title description price duration category icon status uid _id'
             });

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Set freelancer on leave error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get pending freelancers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Pending freelancers with pagination
     */
    async getPendingFreelancers(options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;

            const freelancers = await Freelancer.find({ verificationStatus: 'pending' })
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments({ verificationStatus: 'pending' });

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get pending freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get pending verification freelancers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Pending verification freelancers with pagination
     */
    async getPendingVerificationFreelancers(options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;

            const freelancers = await Freelancer.find({ verificationStatus: 'pending' })
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments({ verificationStatus: 'pending' });

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get pending verification freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get verified freelancers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Verified freelancers with pagination
     */
    async getVerifiedFreelancers(options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;

            const freelancers = await Freelancer.find({ verificationStatus: 'verified' })
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments({ verificationStatus: 'verified' });

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get verified freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get rejected freelancers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Rejected freelancers with pagination
     */
    async getRejectedFreelancers(options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;

            const freelancers = await Freelancer.find({ verificationStatus: 'rejected' })
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments({ verificationStatus: 'rejected' });

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get rejected freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verify freelancer identity
     * @param {string} id - Freelancer ID
     * @returns {Promise<Object>} - Updated freelancer
     */
    async verifyFreelancerIdentity(id) {
        try {
            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                {
                    verificationStatus: 'verified',
                    status: 'active',
                    verifiedAt: new Date()
                },
                { new: true }
            ).populate('countryId', 'name')
             .populate('services');

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Verify freelancer identity error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Reject freelancer identity verification
     * @param {string} id - Freelancer ID
     * @param {string} rejectionReason - Reason for rejection
     * @returns {Promise<Object>} - Updated freelancer
     */
    async rejectFreelancerIdentity(id, rejectionReason) {
        try {
            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                {
                    verificationStatus: 'rejected',
                    status: 'rejected',
                    rejectionReason,
                    rejectedAt: new Date()
                },
                { new: true }
            ).populate('countryId', 'name')
             .populate('services');

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Reject freelancer identity error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update freelancer's national ID
     * @param {string} id - Freelancer ID
     * @param {Object} nationalIdData - National ID data
     * @returns {Promise<Object>} - Updated freelancer
     */
    async updateNationalId(id, nationalIdData) {
        try {
            // Handle ID document upload if provided
            let idImageUrl = nationalIdData.idImageUrl || null;
            if (nationalIdData.idImageBlob) {
                const uploadResult = await uploadToLocal(nationalIdData.idImageBlob, 'freelancer-documents');
                idImageUrl = uploadResult.Key; // Store relative path instead of full URL
            }

            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                {
                    nationalId: {
                        ...nationalIdData,
                        idImageUrl: idImageUrl
                    },
                    updatedAt: new Date()
                },
                { new: true }
            ).populate({
                 path: 'services',
                 select: 'title description price duration category icon status uid _id'
             });

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Update national ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add service to freelancer
     * @param {string} id - Freelancer ID
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} - Updated freelancer
     */
    async addService(id, serviceId) {
        try {
            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                { $addToSet: { services: serviceId } },
                { new: true }
            ).populate('countryId', 'name')
             .populate({
                 path: 'services',
                 select: 'title description price duration category icon status uid _id'
             });

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Add service error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Remove service from freelancer
     * @param {string} id - Freelancer ID
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} - Updated freelancer
     */
    async removeService(id, serviceId) {
        try {
            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                { $pull: { services: serviceId } },
                { new: true }
            ).populate('countryId', 'name')
             .populate({
                 path: 'services',
                 select: 'title description price duration category icon status uid _id'
             });

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Remove service error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get active freelancers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Active freelancers with pagination
     */
    async getActiveFreelancers(options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;

            const freelancers = await Freelancer.find({ status: 'active' })
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments({ status: 'active' });

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get active freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get blocked freelancers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Blocked freelancers with pagination
     */
    async getBlockedFreelancers(options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;

            const freelancers = await Freelancer.find({ status: 'blocked' })
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments({ status: 'blocked' });

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get blocked freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get online freelancers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Online freelancers with pagination
     */
    async getOnlineFreelancers(options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const skip = (page - 1) * limit;

            const freelancers = await Freelancer.find({ isOnline: true })
                .populate('countryId', 'name')
                .populate({
                    path: 'services',
                    select: 'title description price duration category icon status uid _id'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Freelancer.countDocuments({ isOnline: true });

            return {
                freelancers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error(`Get online freelancers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get total number of freelancers
     * @returns {Promise<number>} - Total number of freelancers
     */
    async getNumberOfFreelancers() {
        try {
            const count = await Freelancer.countDocuments();
            return count;
        } catch (error) {
            logger.error(`Get number of freelancers error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new FreelancerService();
