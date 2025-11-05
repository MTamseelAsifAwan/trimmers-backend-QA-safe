const freelancerService = require('../../../services/freelancerService');
const { ApiError } = require('../../../middlewares/errorHandler');
// const { uploadToS3 } = require('../../../config/s3'); // Commented out AWS S3
const { uploadToLocal } = require('../../../config/localStorage'); // Using local storage instead
const { freelancerValidationSchema } = require('../validators');

/**
 * Create a new freelancer
 * @route POST /api/freelancers
 * @access Private/Admin
 */
const createFreelancer = async (req, res, next) => {
    try {
        // Validate request body
        const { error } = freelancerValidationSchema.validate(req.body);
        if (error) {
            throw new ApiError(error.details[0].message, 400);
        }

        // Handle file uploads if present
        let profileImageUrl = null;
        if (req.files && req.files.profileImage) {
            const profileImage = req.files.profileImage;
            // const uploadResult = await uploadToS3(profileImage, 'freelancer-profiles'); // Commented out AWS S3
            const uploadResult = await uploadToLocal(profileImage, 'freelancer-profiles');
            profileImageUrl = uploadResult.Location;
        }

        const freelancerData = {
            ...req.body,
            profileImage: profileImageUrl,
            role: 'freelancer'
        };

        const freelancer = await freelancerService.createFreelancer(freelancerData);

        res.status(201).json({
            success: true,
            message: 'Freelancer created successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get freelancer profile
 * @route GET /api/freelancers/profile
 * @access Private/Freelancer
 */
const getFreelancerProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const freelancer = await freelancerService.getFreelancerByUserId(userId);
        res.status(200).json({
            success: true,
            message: 'Freelancer profile retrieved successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update freelancer profile
 * @route PUT /api/freelancers/profile
 * @access Private/Freelancer
 */
const updateFreelancerProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        // Accept countryId (optional) and schedules (required)
        const updateData = {
            ...req.body,
            countryId: req.body.countryId,
            schedule: req.body.schedules // Map schedules to schedule field in model
        };
        // Remove schedules from updateData since we've mapped it to schedule
        delete updateData.schedules;
        const freelancer = await freelancerService.updateFreelancerProfile(userId, updateData);
        res.status(200).json({
            success: true,
            message: 'Freelancer profile updated successfully',
            data: freelancer
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createFreelancer,
    getFreelancerProfile,
    updateFreelancerProfile
};
