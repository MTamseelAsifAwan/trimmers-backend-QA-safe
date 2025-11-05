// src/api/admin/controllers/platformFeeController.js
const platformFeeService = require('../../../services/platformFeeService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Create platform fees for a country
 * @route POST /api/admin/platform-fees
 * @access Private/Admin
 */
const createPlatformFees = async (req, res, next) => {
    try {
        const { countryId, freelanceBarberFee, shopFee, isActive } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!countryId) {
            throw new ApiError('Country ID is required', 400);
        }

        if (freelanceBarberFee === undefined || shopFee === undefined) {
            throw new ApiError('Freelance barber fee and shop fee are required', 400);
        }

        // Validate fees
        if (freelanceBarberFee < 0 || freelanceBarberFee > 100) {
            throw new ApiError('Freelance barber platform fee must be between 0 and 100', 400);
        }

        if (shopFee < 0 || shopFee > 100) {
            throw new ApiError('Shop platform fee must be between 0 and 100', 400);
        }

        const platformFee = await platformFeeService.createPlatformFees(
            countryId,
            { freelanceBarberFee, shopFee, isActive },
            userId
        );

        res.status(201).json({
            success: true,
            message: 'Platform fees created successfully',
            data: platformFee
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Set platform fees for a country
 * @route PUT /api/admin/platform-fees/:countryId
 * @access Private/Admin
 */
const setPlatformFees = async (req, res, next) => {
    try {
        const { countryId } = req.params;
        const { freelanceBarberFee, shopFee, isActive } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (freelanceBarberFee === undefined || shopFee === undefined) {
            throw new ApiError('Freelance barber fee and shop fee are required', 400);
        }

        // Validate fees
        if (freelanceBarberFee < 0 || freelanceBarberFee > 100) {
            throw new ApiError('Freelance barber platform fee must be between 0 and 100', 400);
        }

        if (shopFee < 0 || shopFee > 100) {
            throw new ApiError('Shop platform fee must be between 0 and 100', 400);
        }

        const platformFee = await platformFeeService.setPlatformFees(
            countryId,
            { freelanceBarberFee, shopFee, isActive },
            userId
        );

        res.status(200).json({
            success: true,
            message: 'Platform fees updated successfully',
            data: platformFee
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get platform fees for a country
 * @route GET /api/admin/platform-fees/:countryId
 * @access Private/Admin
 */
const getPlatformFees = async (req, res, next) => {
    try {
        const { countryId } = req.params;

        const platformFee = await platformFeeService.getPlatformFees(countryId);

        res.status(200).json({
            success: true,
            data: platformFee
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all platform fees
 * @route GET /api/admin/platform-fees
 * @access Private/Admin
 */
const getAllPlatformFees = async (req, res, next) => {
    try {
        const { isActive, sortBy, sortOrder, page, limit } = req.query;

        const options = {
            isActive: isActive === 'true',
            sortBy,
            sortOrder,
            page,
            limit
        };

        const result = await platformFeeService.getAllPlatformFees(options);

        res.status(200).json({
            success: true,
            data: result.platformFees,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete platform fee
 * @route DELETE /api/admin/platform-fees/:countryId
 * @access Private/Admin
 */
const deletePlatformFee = async (req, res, next) => {
    try {
        const { countryId } = req.params;

        const success = await platformFeeService.deletePlatformFee(countryId);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Platform fee deleted successfully'
            });
        } else {
            throw new ApiError('Platform fee not found', 404);
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPlatformFees,
    setPlatformFees,
    getPlatformFees,
    getAllPlatformFees,
    deletePlatformFee
};