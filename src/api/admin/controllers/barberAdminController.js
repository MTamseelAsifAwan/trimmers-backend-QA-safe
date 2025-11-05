// src/api/admin/controllers/barberAdminController.js
const barberService = require('../../../services/barberService');
const userService = require('../../../services/userService');
const emailService = require('../../../services/emailService');
const { ApiError } = require('../../../middlewares/errorHandler');
const logger = require('../../../utils/logger');

/**
 * Get all barbers with pagination and filtering
 * @route GET /api/admin/barbers
 * @access Private/Admin
 */
const getAllBarbers = async (req, res, next) => {
    try {
        const {
            page,
            limit,
            status,
            serviceType,
            search,
            shopId,
            verificationStatus,
            countryId
        } = req.query;

        const options = {
            page,
            limit,
            status,
            serviceType,
            search,
            shopId,
            verificationStatus,
            countryId
        };

        const result = await barberService.getBarbers(options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barber by ID
 * @route GET /api/admin/barbers/:id
 * @access Private/Admin
 */
const getBarberById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const barber = await barberService.getBarberById(id);

        res.status(200).json({
            success: true,
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create barber account (admin function)
 * @route POST /api/admin/barbers
 * @access Private/Admin
 */
const createBarber = async (req, res, next) => {
    const defaultPassword = 'Barber@123';
    try {
        const {
            // Barber account info
            email,
            password = defaultPassword,
            firstName,
            lastName,
            phoneNumber,
            address,
            city,
            zipCode,

            // Barber profile info
            shopId,
            services,
            countryId,
            profileImage,
            serviceType,
            schedule,

            // National ID info (optional)
            nationalId
        } = req.body;
        const { profileImageBlob, idImageBlob } = req.files;

        // Create barber directly using new service method
        const barberData = {
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            address,
            city,
            zipCode,
            shopId,
            services,
            countryId,
            profileImage,
            serviceType,
            schedule,
            profileImageBlob: profileImageBlob?.[0],
            idImageBlob: idImageBlob?.[0],
            nationalId,
            status: 'active',
            isActive: true,
            emailVerified: true // Admin-created accounts are verified by default
        };

        const barber = await barberService.createBarber(barberData);

        // Send account credentials email to the new barber
        try {
            await emailService.sendAccountCredentials(
                email,
                password,
                'barber',
                firstName,
                lastName
            );
            logger.info(`Account credentials email sent successfully to barber: ${email}`);
        } catch (emailError) {
            logger.error(`Failed to send account credentials email to barber ${email}: ${emailError.message}`);
            // Don't fail the account creation if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Barber account created successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update barber (admin function)
 * @route PUT /api/admin/barbers/:id
 * @access Private/Admin
 */
const updateBarber = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { profileImageBlob, idImageBlob } = req.files || {};

        // Merge file data with body data
        const updateData = {
            ...req.body,
            profileImageBlob: profileImageBlob?.[0],
            idImageBlob: idImageBlob?.[0]
        };

        // Update barber directly using new service method
        const updatedBarber = await barberService.updateBarber(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Barber updated successfully',
            data: updatedBarber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete barber
 * @route DELETE /api/admin/barbers/:id
 * @access Private/Admin
 */
const deleteBarber = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await barberService.deleteBarber(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Barber deleted successfully'
            });
        } else {
            throw new ApiError('Barber deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Upload profile image
 * @route POST /api/admin/barbers/:id/profile-image
 * @access Private/Admin
 */
const uploadProfileImage = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            throw new ApiError('No image file provided', 400);
        }

        const barber = await barberService.uploadProfileImage(id, req.file);

        res.status(200).json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                profileImage: barber.profileImage
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Block barber
 * @route PATCH /api/admin/barbers/:id/block
 * @access Private/Admin
 */
const blockBarber = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { blockReason } = req.body;

        if (!blockReason || blockReason.trim().length === 0) {
            throw new ApiError('Block reason is required', 400);
        }

        // Update barber status to blocked using new service method
        const updatedBarber = await barberService.updateBarber(id, {
            status: 'blocked',
            blockReason: blockReason.trim()
        });

        res.status(200).json({
            success: true,
            message: 'Barber blocked successfully',
            data: updatedBarber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unblock barber
 * @route PATCH /api/admin/barbers/:id/unblock
 * @access Private/Admin
 */
const unblockBarber = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Update barber status to active and clear block reason using new service method
        const updatedBarber = await barberService.updateBarber(id, {
            status: 'active',
            blockReason: null
        });

        res.status(200).json({
            success: true,
            message: 'Barber unblocked successfully',
            data: updatedBarber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Set barber on leave
 * @route PATCH /api/admin/barbers/:id/on-leave
 * @access Private/Admin
 */
const setBarberOnLeave = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Update barber status to onLeave using new service method
        const updatedBarber = await barberService.updateBarber(id, {
            status: 'onLeave'
        });

        res.status(200).json({
            success: true,
            message: 'Barber set to on leave status successfully',
            data: updatedBarber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending barbers
 * @route GET /api/admin/barbers/pending/list
 * @access Private/Admin
 */
const getPendingBarbers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        console.log('getPendingBarbers called with query:', req.query);

        const options = {
            page,
            limit,
            verificationStatus: 'pending'
        };

        console.log('Calling barberService.getBarbers with options:', options);

        const result = await barberService.getBarbers(options);

        console.log('barberService.getBarbers returned:', result);
        console.log('Number of pending barbers:', result.barbers.length);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get barbers pending verification
 * @route GET /api/admin/barbers/verification/pending
 * @access Private/Admin
 */
const getPendingVerificationBarbers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await barberService.getBarbersByVerificationStatus('pending', options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get verified barbers
 * @route GET /api/admin/barbers/verification/verified
 * @access Private/Admin
 */
const getVerifiedBarbers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await barberService.getBarbersByVerificationStatus('verified', options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get rejected barbers
 * @route GET /api/admin/barbers/verification/rejected
 * @access Private/Admin
 */
const getRejectedBarbers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await barberService.getBarbersByVerificationStatus('rejected', options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify barber's identity
 * @route PATCH /api/admin/barbers/:id/verify
 * @access Private/Admin
 */
const verifyBarberIdentity = async (req, res, next) => {
    try {
        const { id } = req.params;

        const verificationData = {
            status: 'verified'
        };

        const barber = await barberService.updateVerificationStatus(id, verificationData);

        res.status(200).json({
            success: true,
            message: 'Barber identity verified successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject barber's identity verification
 * @route PATCH /api/admin/barbers/:id/reject-verification
 * @access Private/Admin
 */
const rejectBarberIdentity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason) {
            throw new ApiError('Rejection reason is required', 400);
        }

        const verificationData = {
            status: 'rejected',
            rejectionReason
        };

        const barber = await barberService.updateVerificationStatus(id, verificationData);

        res.status(200).json({
            success: true,
            message: 'Barber identity verification rejected',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update barber's national ID
 * @route PUT /api/admin/barbers/:id/national-id
 * @access Private/Admin
 */
const updateNationalId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const nationalIdData = req.body;

        const barber = await barberService.updateNationalId(id, nationalIdData);

        res.status(200).json({
            success: true,
            message: 'National ID updated successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add service to barber
 * @route POST /api/admin/barbers/:id/services
 * @access Private/Admin
 */
const addService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { serviceId } = req.body;

        if (!serviceId) {
            throw new ApiError('Service ID is required', 400);
        }

        const barber = await barberService.addService(id, serviceId);

        res.status(200).json({
            success: true,
            message: 'Service added to barber successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove service from barber
 * @route DELETE /api/admin/barbers/:id/services/:serviceId
 * @access Private/Admin
 */
const removeService = async (req, res, next) => {
    try {
        const { id, serviceId } = req.params;

        const barber = await barberService.removeService(id, serviceId);

        res.status(200).json({
            success: true,
            message: 'Service removed from barber successfully',
            data: barber
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get blocked barbers
 * @route GET /api/admin/barbers/blocked
 * @access Private/Admin
 */
const getBlockedBarbers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit,
            status: 'blocked'
        };

        const result = await barberService.getBarbers(options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get active barbers
 * @route GET /api/admin/barbers/active
 * @access Private/Admin
 */
const getActiveBarbers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit,
            status: 'active'
        };

        const result = await barberService.getBarbers(options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get online barbers
 * @route GET /api/admin/barbers/online
 * @access Private/Admin
 */
const getOnlineBarbers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit,
            isOnline: true,
            status: 'active' // Must be active and online
        };

        const result = await barberService.getBarbers(options);

        res.status(200).json({
            success: true,
            data: result.barbers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create freelancer account (admin function)
 * @route POST /api/admin/freelancers
 * @access Private/Admin
 */
const createFreelancer = async (req, res, next) => {
    const defaultPassword = 'freelancer@123';
    try {
        const {
            // Freelancer account info
            email,
            password = defaultPassword,
            firstName,
            lastName,
            phoneNumber,
            address,
            city,
            zipCode,

            // Freelancer profile info
            services,
            countryId,
            profileImage,
            serviceType,
            schedule,

            // National ID info (optional)
            nationalId
        } = req.body;
        const { profileImageBlob, idImageBlob } = req.files || {};

        // Parse JSON fields
        let parsedServices = services;
        let parsedSchedule = schedule;
        try {
            if (typeof services === 'string') {
                parsedServices = JSON.parse(services);
            }
            if (typeof schedule === 'string') {
                parsedSchedule = JSON.parse(schedule);
            }
        } catch (error) {
            console.error('Error parsing services or schedule:', error);
        }

        // Create freelancer directly using new service method
        const freelancerData = {
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            address,
            city,
            zipCode,
            services: parsedServices,
            countryId,
            profileImage,
            serviceType,
            schedule: parsedSchedule,
            profileImageBlob: profileImageBlob?.[0],
            idImageBlob: idImageBlob?.[0],
            nationalId,
            status: 'active',
            isActive: true,
            emailVerified: true // Admin-created accounts are verified by default
        };

        const freelancer = await barberService.createFreelancer(freelancerData);

        // Send account credentials email to the new freelancer
        try {
            await emailService.sendAccountCredentials(
                email,
                password,
                'freelancer',
                firstName,
                lastName
            );
            logger.info(`Account credentials email sent successfully to freelancer: ${email}`);
        } catch (emailError) {
            logger.error(`Failed to send account credentials email to freelancer ${email}: ${emailError.message}`);
            // Don't fail the account creation if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Freelancer account created successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllBarbers,
    getBarberById,
    createBarber,
    createFreelancer,
    updateBarber,
    deleteBarber,
    uploadProfileImage,
    blockBarber,
    unblockBarber,
    setBarberOnLeave,
    getPendingBarbers,
    getPendingVerificationBarbers,
    getVerifiedBarbers,
    getRejectedBarbers,
    verifyBarberIdentity,
    rejectBarberIdentity,
    updateNationalId,
    addService,
    removeService,
    getBlockedBarbers,
    getActiveBarbers,
    getOnlineBarbers
};