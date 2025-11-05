// src/services/barberService.js
const Barber = require('../models/Barber');
const Freelancer = require('../models/Freelancer');
const Shop = require('../models/Shop');
const Service = require('../models/Service');
const Country = require('../models/Country');
const User = require('../models/User');
const logger = require('../utils/logger');
const { convertFileToUrl } = require('../utils/helpers');
const { ApiError } = require('../middlewares/errorHandler');
// const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
const { uploadToLocal } = require('../config/localStorage'); // Using local storage instead

// Constants
const EMPLOYMENT_TYPES = {
    EMPLOYED: 'employed',
    FREELANCE: 'freelance'
};

const SERVICE_TYPES = {
    SHOP_BASED: 'shopBased',
    HOME_BASED: 'homeBased'
};

/**
 * BarberService provides methods for barber management
 */
class BarberService {
    /**
     * Create a new barber directly (no user profile linking)
     * @param {Object} barberData - Barber data
     * @returns {Promise<Object>} - Created barber
     */
    async createBarber(barberData) {
        try {
            console.log('barberService.createBarber received barberData:', barberData); // Debug log

            // Handle profile image upload if provided
            let profileImageUrl = barberData.profileImage || null;
            if (barberData.profileImageBlob) {
                // const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
                // const uploadResult = await uploadToS3(barberData.profileImageBlob, 'barber-profiles');
                const uploadResult = await uploadToLocal(barberData.profileImageBlob, 'barber-profiles');
                profileImageUrl = uploadResult.Key; // Store relative path instead of full URL
            }

            // Handle ID document upload if provided
            let idImageUrl = barberData.nationalId?.idImageUrl || null;
            if (barberData.idImageBlob) {
                const uploadResult = await uploadToLocal(barberData.idImageBlob, 'barber-documents');
                idImageUrl = uploadResult.Key; // Store relative path instead of full URL
            }

            // Create initial national ID if provided
            let nationalId = null;
            if (barberData.nationalId && barberData.nationalId.idNumber) {
                nationalId = {
                    idNumber: barberData.nationalId.idNumber,
                    idImageUrl: idImageUrl || barberData.nationalId.idImageUrl,
                    expiryDate: barberData.nationalId.expiryDate || null
                };
            }

            // Create new barber directly
            const barber = new Barber({
                email: barberData.email,
                password: barberData.password,
                firstName: barberData.firstName,
                lastName: barberData.lastName,
                profile: {
                    phoneNumber: barberData.phoneNumber,
                    address: barberData.address,
                    city: barberData.city,
                    zipCode: barberData.zipCode
                },
                addresses: barberData.addresses || [],
                role: 'barber',
                shopId: barberData.shopId || null,
                services: barberData.services || [],
                rating: barberData.rating || 0,
                reviewCount: barberData.reviewCount || 0,
                joinedDate: barberData.joinedDate || new Date(),
                profile: barberData.profile || {},
                schedule: barberData.schedule || {},
                serviceType: barberData.serviceType,
                verificationStatus: nationalId ? 'verified' : 'pending',
                nationalId: nationalId,
                countryId: barberData.countryId,
                status: barberData.status || 'active',
                isActive: barberData.isActive !== undefined ? barberData.isActive : true,
                emailVerified: barberData.emailVerified || false,
                profileImage: profileImageUrl
            });

            console.log('Creating barber with data:', {
                serviceType: barberData.serviceType,
                schedule: barberData.schedule
            }); // Debug log

            await barber.save();
            return barber;
        } catch (error) {
            logger.error(`Create barber error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create barber profile
     * @param {string} userId - User ID
     * @param {Object} barberData - Barber data
     * @returns {Promise<Object>} - Created barber
     */
    async createBarberProfile(userId, barberData) {
        try {
            const barber = new Barber({
                _id: userId,
                ...barberData,
                password: barberData.password || 'defaultPassword123' // Provide default password if not specified
            });

            await barber.save();
            logger.info(`Created barber profile for user: ${userId}`);
            return barber;
        } catch (error) {
            logger.error(`Create barber profile error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a freelancer directly
     * @param {Object} freelancerData - Freelancer data
     * @returns {Promise<Object>} - Created freelancer
     */
    async createFreelancer(freelancerData) {
        try {
            // Handle profile image upload if provided
            let profileImageUrl = freelancerData.profileImage || null;
            if (freelancerData.profileImageBlob) {
                // const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
                // const uploadResult = await uploadToS3(freelancerData.profileImageBlob, 'freelancer-profiles');
                const uploadResult = await uploadToLocal(freelancerData.profileImageBlob, 'freelancer-profiles');
                profileImageUrl = uploadResult.Location;
            }

            // Create initial national ID if provided
            let nationalId = null;
            if (freelancerData.nationalId && freelancerData.nationalId.idNumber && freelancerData.nationalId.idImageUrl) {
                nationalId = {
                    idNumber: freelancerData.nationalId.idNumber,
                    idImageUrl: freelancerData.nationalId.idImageUrl,
                    expiryDate: freelancerData.nationalId.expiryDate || null
                };
            }

            // Create new freelancer directly
            const freelancer = new Freelancer({
                email: freelancerData.email,
                password: freelancerData.password,
                firstName: freelancerData.firstName,
                lastName: freelancerData.lastName,
                profile: {
                    phoneNumber: freelancerData.phoneNumber,
                    address: freelancerData.address,
                    city: freelancerData.city,
                    zipCode: freelancerData.zipCode,
                    ...freelancerData.profile
                },
                addresses: freelancerData.addresses || [],
                role: 'freelancer',
                services: freelancerData.services || [],
                schedule: freelancerData.schedule || {},
                serviceType: freelancerData.serviceType,
                verificationStatus: 'pending', // Admin-created freelancers need verification
                nationalId: nationalId,
                countryId: freelancerData.countryId,
                status: freelancerData.status || 'active',
                isActive: freelancerData.isActive !== undefined ? freelancerData.isActive : true,
                emailVerified: freelancerData.emailVerified || false,
                profileImage: profileImageUrl
            });

            await freelancer.save();
            return freelancer;
        } catch (error) {
            logger.error(`Create freelancer error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Upload profile image for barber
     * @param {string} id - Barber ID
     * @param {Object} file - Uploaded file object
     * @returns {Promise<Object>} - Updated barber
     */
    async uploadProfileImage(id, file) {
        try {
            // const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
            // const uploadResult = await uploadToS3(file, 'barber-profiles');
            const uploadResult = await uploadToLocal(file, 'barber-profiles');

            const barber = await Barber.findByIdAndUpdate(
                id,
                { profileImage: uploadResult.Location },
                { new: true }
            );

            if (!barber) {
                throw new Error('Barber not found');
            }

            return barber;
        } catch (error) {
            logger.error(`Upload profile image error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Upload profile image for freelancer
     * @param {string} id - Freelancer ID
     * @param {Object} file - Uploaded file object
     * @returns {Promise<Object>} - Updated freelancer
     */
    async uploadFreelancerProfileImage(id, file) {
        try {
            // const { uploadToS3 } = require('../config/s3'); // Commented out AWS S3
            // const uploadResult = await uploadToS3(file, 'freelancer-profiles');
            const uploadResult = await uploadToLocal(file, 'freelancer-profiles');

            const freelancer = await Freelancer.findByIdAndUpdate(
                id,
                { profileImage: uploadResult.Location },
                { new: true }
            );

            if (!freelancer) {
                throw new Error('Freelancer not found');
            }

            return freelancer;
        } catch (error) {
            logger.error(`Upload freelancer profile image error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get barber by user ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Barber data
     */
    async getBarberByUserId(userId) {
        try {
            const barber = await Barber.findById(userId)
                .populate('shopId')
                .populate('services');

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            return barber;
        } catch (error) {
            logger.error(`Get barber by user ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get barber by ID
     * @param {string} id - Barber ID
     * @returns {Promise<Object>} - Barber data
     */
    async getBarberById(id) {
        try {
            const barber = await Barber.findById(id)
                .populate('shopId')
                .populate('services');

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            return barber;
        } catch (error) {
            logger.error(`Get barber by ID error: ${error.message}`);
            throw error;
            // Set default countryId if not provided
            const defaultCountryId = '67e6d6f22d52ed9c73cca17f';
        }
    }

    /**
     * Get barber by UID
     * @param {string} uid - Barber UID
     * @returns {Promise<Object>} - Barber data
     */
    async getBarberByUid(uid) {
        try {
            const barber = await Barber.findOne({ uid })
                .populate('shopId')
                .populate('services');

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            return barber;
        } catch (error) {
            logger.error(`Get barber by UID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update barber directly (no user profile linking)
     * @param {string} barberId - Barber ID
     * @param {Object} updateData - Barber data to update
     * @returns {Promise<Object>} - Updated barber
     */
    async updateBarber(barberId, updateData) {
        try {
            const barber = await Barber.findById(barberId);

            if (!barber) {
                throw new Error('Barber not found');
            }

            // Handle profile image upload if provided
            if (updateData.profileImageBlob) {
                const uploadResult = await uploadToLocal(updateData.profileImageBlob, 'barber-profiles');
                updateData.profileImage = uploadResult.Key; // Store relative path instead of full URL
            }

            // Handle ID document upload if provided
            if (updateData.idImageBlob) {
                const uploadResult = await uploadToLocal(updateData.idImageBlob, 'barber-documents');
                if (updateData.nationalId) {
                    updateData.nationalId.idImageUrl = uploadResult.Key;
                } else {
                    updateData.nationalId = { idImageUrl: uploadResult.Key };
                }
            }

            // Update basic fields
            if (updateData.firstName !== undefined) barber.firstName = updateData.firstName || '';
            if (updateData.lastName !== undefined) barber.lastName = updateData.lastName || '';
            if (updateData.password && updateData.password !== '') barber.password = updateData.password;
            if (updateData.phoneNumber !== undefined) barber.profile.phoneNumber = updateData.phoneNumber || '';
            if (updateData.address !== undefined) barber.profile.address = updateData.address || '';
            if (updateData.city !== undefined) barber.profile.city = updateData.city || '';
            if (updateData.zipCode !== undefined) barber.profile.zipCode = updateData.zipCode || '';

            // Update barber-specific fields
            if ('shopId' in updateData) barber.shopId = updateData.shopId === null ? null : (updateData.shopId || null);
            if (updateData.services !== undefined) barber.services = updateData.services || [];
            if (updateData.countryId !== undefined) barber.countryId = updateData.countryId || null;
            if (updateData.serviceType !== undefined) barber.serviceType = updateData.serviceType || '';
            if (updateData.schedule !== undefined) barber.schedule = updateData.schedule || {};
            if ('profileImage' in updateData) barber.profileImage = updateData.profileImage === null ? null : (updateData.profileImage || '');

            // Update status fields
            if (updateData.status !== undefined) barber.status = updateData.status;
            if (updateData.verificationStatus !== undefined) barber.verificationStatus = updateData.verificationStatus;

            // Handle block reason
            if (updateData.status === 'blocked' && updateData.blockReason) {
                barber.blockReason = updateData.blockReason;
            } else if (updateData.status === 'active') {
                barber.blockReason = null;
            }

            // Update national ID if provided
            if (updateData.nationalId) {
                barber.nationalId = {
                    ...barber.nationalId,
                    ...updateData.nationalId
                };
            }

            await barber.save();
            return barber;
        } catch (error) {
            logger.error(`Update barber error: ${error.message}`);
            throw error;
        }
    }


    /**
     * Update barber profile by user ID
     * @param {string} userId - User ID (barber's _id)
     * @param {Object} updateData - Update data
     * @returns {Promise<Object>} - Updated barber
     */
    async updateBarberProfile(userId, updateData) {
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

            const barber = await Barber.findByIdAndUpdate(
                userId,
                { $set: setData },
                { new: true }
            )
                .populate('services')
                .populate('countryId')
                .populate('shopId');

            if (!barber) {
                throw new Error('Barber not found');
            }

            return barber;
        } catch (error) {
            logger.error(`Update barber profile error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Add a service to a barber
     * @param {string} barberId - Barber ID
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Updated barber
     */
    async addService(barberId, serviceId) {
        try {
            // Check if service exists
            const service = await Service.findById(serviceId);
            if (!service) {
                throw new ApiError('Service not found', 404);
            }

            // Check if barber exists
            const barber = await Barber.findById(barberId);
            if (!barber) {
                throw new ApiError('Barber not found', 404);
            }

            // Check if service type is compatible with barber's service type
            if (barber.serviceType === 'shopBased' && service.type === SERVICE_TYPES.HOME_BASED) {
                throw new ApiError('Shop-based barbers cannot offer home-based services', 400);
            }

            // Check if barber already has this service
            if (barber.services.includes(serviceId)) {
                throw new ApiError('Barber already offers this service', 400);
            }

            // Add service to barber
            const updatedBarber = await Barber.findByIdAndUpdate(
                barberId,
                { $addToSet: { services: serviceId } },
                { new: true }
            );

            return updatedBarber;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Failed to add service to barber: ${error.message}`, 500);
        }
    }

    /**
     * Remove a service from a barber
     * @param {string} barberId - Barber ID
     * @param {string} serviceId - Service ID
     * @returns {Promise<Object>} Updated barber
     */
    async removeService(barberId, serviceId) {
        try {
            // Check if barber exists
            const barber = await Barber.findById(barberId);
            if (!barber) {
                throw new ApiError('Barber not found', 404);
            }

            // Check if barber has this service
            if (!barber.services.includes(serviceId)) {
                throw new ApiError('Barber does not offer this service', 400);
            }

            // Remove service from barber
            const updatedBarber = await Barber.findByIdAndUpdate(
                barberId,
                { $pull: { services: serviceId } },
                { new: true }
            );

            return updatedBarber;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(`Failed to remove service from barber: ${error.message}`, 500);
        }
    }

    /**
     * Get barbers by shop
     * @param {string} shopId - Shop ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - List of barbers
     */
    async getBarbersByShop(shopId, options = {}) {
        try {
            const {
                countryId,
                status,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            // Build filter
            const filter = { shopId };

            if (countryId) {
                filter.countryId = countryId;
            }

            if (status) {
                filter.status = status;
            }

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Execute query
            const barbers = await Barber.find(filter)
                // Removed .populate('shopId') to exclude shop data
                .populate('services')
                .sort(sort);

            return barbers.map(barber => {
                const { shopId, ...barberWithoutShop } = barber.toObject();
                return barberWithoutShop;
            });
        } catch (error) {
            logger.error(`Get barbers by shop error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get nearby barbers
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - List of nearby barbers
     */
    async getNearbyBarbers(latitude, longitude, options = {}) {
        try {
            const {
                radius = 10, // in kilometers
                limit = 10,
                serviceType
            } = options;

            // Build filter
            const filter = {
                status: 'active',
                isOnline: true, // Only online barbers
                serviceType: { $in: ['homeBased', 'both'] } // Only barbers who can work from home
            };

            // Add filter by service type if provided
            if (serviceType) {
                // Find services of this type
                const services = await Service.find({ type: serviceType }).select('_id');
                const serviceIds = services.map(service => service._id);

                // Filter barbers who offer these services
                filter.services = { $in: serviceIds };
            }

            // Get all freelance barbers
            const barbers = await Barber.find(filter)
                .populate('shopId')
                .populate('services');

            // Calculate distance for each barber
            const barbersWithDistance = barbers
                .filter(barber => barber.location && barber.location.latitude && barber.location.longitude)
                .map(barber => {
                    const distance = this.calculateDistance(
                        latitude,
                        longitude,
                        barber.location.latitude,
                        barber.location.longitude
                    );

                    return {
                        ...barber.toObject(),
                        distance
                    };
                })
                // Filter barbers within radius and with adequate servicing area
                .filter(barber =>
                    barber.distance <= radius && barber.distance <= barber.servicingArea
                )
                // Sort by distance
                .sort((a, b) => a.distance - b.distance)
                // Limit results
                .slice(0, limit);

            return barbersWithDistance;
        } catch (error) {
            logger.error(`Get nearby barbers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    }

    /**
     * Convert degrees to radians
     * @param {number} deg - Degrees
     * @returns {number} - Radians
     */
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Get all barbers with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of barbers
     */
    async getBarbers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                status,
                serviceType,
                search,
                shopId,
                verificationStatus,
                countryId,
                isOnline
            } = options;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build filter
            const filter = {};

            if (status) {
                filter.status = status;
            }

            if (serviceType) {
                filter.serviceType = serviceType;
            }

            if (shopId) {
                filter.shopId = shopId;
            }

            if (verificationStatus) {
                filter.verificationStatus = verificationStatus;
            }

            if (countryId) {
                filter.countryId = countryId;
            }

            if (isOnline !== undefined) {
                filter.isOnline = isOnline;
            }

            if (search) {
                // Search in barber fields directly
                filter.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { 'profile.phoneNumber': { $regex: search, $options: 'i' } },
                    { serviceType: { $regex: search, $options: 'i' } }
                ];
            }

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Execute query
            const barbers = await Barber.find(filter)
                .populate('shopId')
                .populate('services')
                .populate('countryId')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count
            const total = await Barber.countDocuments(filter);

            return {
                barbers,
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
     * Delete barber profile
     * @param {string} id - Barber ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteBarber(id) {
        try {
            const barber = await Barber.findById(id);

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            // Check for active bookings
            // This would require importing BookingService, but to avoid circular dependencies,
            // we'll assume a check would be made here in a real implementation

            // Delete barber
            await Barber.findByIdAndDelete(id);

            return true;
        } catch (error) {
            logger.error(`Delete barber error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Count barbers with optional filtering
     * @param {Object} filter - Filter criteria
     * @returns {Promise<number>} - Count of barbers
     */
    async countBarbers(filter = {}) {
        try {
            return await Barber.countDocuments(filter);
        } catch (error) {
            logger.error(`Count barbers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get top-rated barbers
     * @param {number} limit - Number of barbers to return
     * @returns {Promise<Array>} - List of top barbers
     */
    async getTopBarbers(limit = 10) {
        try {
            // Get barbers with highest ratings and at least 3 reviews
            const topBarbers = await Barber.find({
                status: 'active',
                reviewCount: { $gte: 3 }
            })
                .populate('shopId')
                .populate('services')
                .sort({ rating: -1, reviewCount: -1 })
                .limit(parseInt(limit));

            return topBarbers;
        } catch (error) {
            logger.error(`Get top barbers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update barber's national ID information
     * @param {string} barberId - Barber ID
     * @param {Object} nationalIdData - National ID data
     * @returns {Promise<Object>} - Updated barber
     */
    async updateNationalId(barberId, nationalIdData) {
        try {
            const barber = await Barber.findById(barberId);

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            // Validate required fields
            if (!nationalIdData.idNumber || !nationalIdData.idImageUrl) {
                throw new Error('ID number and ID image URL are required');
            }

            // Update national ID information
            barber.nationalId = {
                idNumber: nationalIdData.idNumber,
                idImageUrl: nationalIdData.idImageUrl,
                expiryDate: nationalIdData.expiryDate || null
            };

            // If national ID is updated, set verification status to pending
            barber.verificationStatus = 'pending';
            barber.rejectionReason = null;

            await barber.save();

            return barber;
        } catch (error) {
            logger.error(`Update barber national ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update barber verification status (admin function)
     * @param {string} barberId - Barber ID
     * @param {Object} verificationData - Verification data
     * @returns {Promise<Object>} - Updated barber
     */
    async updateVerificationStatus(barberId, verificationData) {
        try {
            const barber = await Barber.findById(barberId);

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            // Check if barber has national ID information - now optional
            // if (!barber.nationalId) {
            //     throw new Error('Barber does not have national ID information');
            // }

            // Validate status
            if (!verificationData.status || !['pending', 'verified', 'rejected'].includes(verificationData.status)) {
                throw new Error('Valid verification status is required');
            }

            // If status is rejected, reason is required
            if (verificationData.status === 'rejected' && !verificationData.rejectionReason) {
                throw new Error('Rejection reason is required when status is rejected');
            }

            // Update verification status
            barber.verificationStatus = verificationData.status;

            // Update rejection reason if provided or clear it if verified
            if (verificationData.status === 'rejected') {
                barber.rejectionReason = verificationData.rejectionReason;
            } else if (verificationData.status === 'verified') {
                barber.rejectionReason = null;
            }

            await barber.save();

            return barber;
        } catch (error) {
            logger.error(`Update barber verification status error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get barbers by verification status
     * @param {string} status - Verification status
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of barbers
     */
    async getBarbersByVerificationStatus(status, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build filter
            const filter = { verificationStatus: status };

            // Build sort
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            // Execute query
            const barbers = await Barber.find(filter)
                .populate('shopId')
                .populate('services')
                .populate('countryId')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count
            const total = await Barber.countDocuments(filter);

            return {
                barbers,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error(`Get barbers by verification status error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update barber's online status (barber function)
     * @param {string} userId - User ID
     * @param {boolean} isOnline - Online status
     * @returns {Promise<Object>} - Updated barber
     */
    async updateOnlineStatus(userId, isOnline) {
        try {
            const barber = await Barber.findOne({ userId });

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            // Check if barber is active
            if (barber.status !== 'active') {
                throw new Error(`Cannot change online status. Your account is ${barber.status}${barber.blockReason ? `. Reason: ${barber.blockReason}` : ''}`);
            }

            // Update online status
            barber.isOnline = isOnline;
            await barber.save();

            return barber;
        } catch (error) {
            logger.error(`Update online status error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get online barbers
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - List of online barbers
     */
    async getOnlineBarbers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                countryId,
                shopId
            } = options;

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build filter
            const filter = {
                status: 'active',
                isOnline: true
            };

            if (countryId) {
                filter.countryId = countryId;
            }

            if (shopId) {
                filter.shopId = shopId;
            }

            // Execute query
            const barbers = await Barber.find(filter)
                .populate('shopId')
                .populate('services')
                .populate('countryId');

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            return barber;
        } catch (error) {
            logger.error(`Get barber by user ID error: ${error.message}`);
            throw error;
        }
    }

 

    /**
     * Get barber by user reference ID (userId field in barber document)
     * @param {string} userId - User reference ID
     * @returns {Promise<Object>} - Barber data
     */
    async getBarberByUserReferenceId(userId) {
        try {
            const barber = await Barber.findOne({ userId })
                .populate('shopId')
                .populate('services')
                .populate('countryId');
            if (!barber) {
                throw new Error('Barber profile not found');
            }
            return barber;
        } catch (error) {
            logger.error(`Get barber by user reference ID error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get blocked barbers
     * @param {Object} options - Query options
     * @returns {Promise<Object>} - Paginated list of blocked barbers
     */
    async getBlockedBarbers(options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                countryId
            } = options;

            // Build filter
            const filter = { status: 'blocked' };

            if (countryId) {
                filter.countryId = countryId;
            }

            // Add other filter options here
            const result = await this.getBarbers({
                ...options,
                status: 'blocked'
            });

            return result;
        } catch (error) {
            logger.error(`Get blocked barbers error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Set barber on leave status
     * @param {string} barberId - Barber ID
     * @returns {Promise<Object>} - Updated barber
     */
    async setBarberOnLeave(barberId) {
        try {
            const barber = await Barber.findById(barberId);

            if (!barber) {
                throw new Error('Barber profile not found');
            }

            // Set status to onLeave and force offline
            barber.status = 'onLeave';
            barber.isOnline = false;

            await barber.save();

            return barber;
        } catch (error) {
            logger.error(`Set barber on leave error: ${error.message}`);
            throw error;
        }
    }

    async getNumberOfBarbers(filters = {}) {
        try {
            const count = await Barber.countDocuments(filters);
            return count;
        } catch (error) {
            logger.error(`Get number of barbers error: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new BarberService();