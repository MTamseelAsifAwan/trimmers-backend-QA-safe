// src/api/admin/controllers/freelancerAdminController.js
const freelancerService = require('../../../services/freelancerService');
const userService = require('../../../services/userService');
const { ApiError } = require('../../../middlewares/errorHandler');
const logger = require('../../../utils/logger');

/**
 * Get all freelancers with pagination and filtering
 * @route GET /api/admin/freelancers
 * @access Private/Admin
 */
const getAllFreelancers = async (req, res, next) => {
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

        const result = await freelancerService.getFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get freelancer by ID
 * @route GET /api/admin/freelancers/:id
 * @access Private/Admin
 */
const getFreelancerById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const freelancer = await freelancerService.getFreelancerById(id);

        if (!freelancer) {
            throw new ApiError('Freelancer not found', 404);
        }

        res.status(200).json({
            success: true,
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update freelancer
 * @route PUT /api/admin/freelancers/:id
 * @access Private/Admin
 */
const updateFreelancer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { profileImageBlob, idImageBlob } = req.files || {};

        // Merge file data with body data
        const updateData = {
            ...req.body,
            profileImageBlob: profileImageBlob?.[0],
            idImageBlob: idImageBlob?.[0]
        };

        const freelancer = await freelancerService.updateFreelancer(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Freelancer updated successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete freelancer
 * @route DELETE /api/admin/freelancers/:id
 * @access Private/Admin
 */
const deleteFreelancer = async (req, res, next) => {
    try {
        const { id } = req.params;

        await freelancerService.deleteFreelancer(id);

        res.status(200).json({
            success: true,
            message: 'Freelancer deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Block freelancer
 * @route PATCH /api/admin/freelancers/:id/block
 * @access Private/Admin
 */
const blockFreelancer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { blockReason } = req.body;

        if (!blockReason) {
            throw new ApiError('Block reason is required', 400);
        }

        const freelancer = await freelancerService.blockFreelancer(id, blockReason);

        res.status(200).json({
            success: true,
            message: 'Freelancer blocked successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unblock freelancer
 * @route PATCH /api/admin/freelancers/:id/unblock
 * @access Private/Admin
 */
const unblockFreelancer = async (req, res, next) => {
    try {
        const { id } = req.params;

        const freelancer = await freelancerService.unblockFreelancer(id);

        res.status(200).json({
            success: true,
            message: 'Freelancer unblocked successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Set freelancer on leave
 * @route PATCH /api/admin/freelancers/:id/on-leave
 * @access Private/Admin
 */
const setFreelancerOnLeave = async (req, res, next) => {
    try {
        const { id } = req.params;

        const freelancer = await freelancerService.setFreelancerOnLeave(id);

        res.status(200).json({
            success: true,
            message: 'Freelancer set on leave successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending freelancers
 * @route GET /api/admin/freelancers/pending/list
 * @access Private/Admin
 */
const getPendingFreelancers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await freelancerService.getPendingFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending verification freelancers
 * @route GET /api/admin/freelancers/verification/pending
 * @access Private/Admin
 */
const getPendingVerificationFreelancers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await freelancerService.getPendingVerificationFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get verified freelancers
 * @route GET /api/admin/freelancers/verification/verified
 * @access Private/Admin
 */
const getVerifiedFreelancers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await freelancerService.getVerifiedFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get rejected freelancers
 * @route GET /api/admin/freelancers/verification/rejected
 * @access Private/Admin
 */
const getRejectedFreelancers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await freelancerService.getRejectedFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify freelancer's identity
 * @route PATCH /api/admin/freelancers/:id/verify
 * @access Private/Admin
 */
const verifyFreelancerIdentity = async (req, res, next) => {
    try {
        const { id } = req.params;

        const freelancer = await freelancerService.verifyFreelancerIdentity(id);

        res.status(200).json({
            success: true,
            message: 'Freelancer identity verified successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject freelancer's identity verification
 * @route PATCH /api/admin/freelancers/:id/reject-verification
 * @access Private/Admin
 */
const rejectFreelancerIdentity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason) {
            throw new ApiError('Rejection reason is required', 400);
        }

        const freelancer = await freelancerService.rejectFreelancerIdentity(id, rejectionReason);

        res.status(200).json({
            success: true,
            message: 'Freelancer identity verification rejected',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update freelancer's national ID
 * @route PUT /api/admin/freelancers/:id/national-id
 * @access Private/Admin
 */
const updateNationalId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const nationalIdData = {
            ...req.body,
            idImageBlob: req.file
        };

        const freelancer = await freelancerService.updateNationalId(id, nationalIdData);

        res.status(200).json({
            success: true,
            message: 'Freelancer national ID updated successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add service to freelancer
 * @route POST /api/admin/freelancers/:id/services
 * @access Private/Admin
 */
const addService = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { serviceId } = req.body;

        if (!serviceId) {
            throw new ApiError('Service ID is required', 400);
        }

        const freelancer = await freelancerService.addService(id, serviceId);

        res.status(200).json({
            success: true,
            message: 'Service added to freelancer successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove service from freelancer
 * @route DELETE /api/admin/freelancers/:id/services/:serviceId
 * @access Private/Admin
 */
const removeService = async (req, res, next) => {
    try {
        const { id, serviceId } = req.params;

        const freelancer = await freelancerService.removeService(id, serviceId);

        res.status(200).json({
            success: true,
            message: 'Service removed from freelancer successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get active freelancers
 * @route GET /api/admin/freelancers/active
 * @access Private/Admin
 */
const getActiveFreelancers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await freelancerService.getActiveFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get blocked freelancers
 * @route GET /api/admin/freelancers/blocked
 * @access Private/Admin
 */
const getBlockedFreelancers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await freelancerService.getBlockedFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get online freelancers
 * @route GET /api/admin/freelancers/online
 * @access Private/Admin
 */
const getOnlineFreelancers = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        const options = {
            page,
            limit
        };

        const result = await freelancerService.getOnlineFreelancers(options);

        res.status(200).json({
            success: true,
            data: result.freelancers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload profile image
 * @route POST /api/admin/freelancers/:id/profile-image
 * @access Private/Admin
 */
const uploadProfileImage = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            throw new ApiError('No image file provided', 400);
        }

        const freelancer = await freelancerService.uploadProfileImage(id, req.file);

        res.status(200).json({
            success: true,
            message: 'Profile image uploaded successfully',
            data: {
                profileImage: freelancer.profileImage
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllFreelancers,
    getFreelancerById,
    updateFreelancer,
    deleteFreelancer,
    blockFreelancer,
    unblockFreelancer,
    setFreelancerOnLeave,
    getPendingFreelancers,
    getPendingVerificationFreelancers,
    getVerifiedFreelancers,
    getRejectedFreelancers,
    verifyFreelancerIdentity,
    rejectFreelancerIdentity,
    updateNationalId,
    addService,
    removeService,
    getActiveFreelancers,
    getBlockedFreelancers,
    getOnlineFreelancers,
    uploadProfileImage
};