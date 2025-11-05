const shopOwnerService = require('../../../services/shopOwnerService');
const notificationService = require('../../../services/notificationService');
const emailService = require('../../../services/emailService');
const { ApiError } = require('../../../middlewares/errorHandler');
const { generateRandomPassword } = require('../../../utils/helpers');
const logger = require('../../../utils/logger');


/**
 * Create a shop owner
 * @route POST /api/admin/shop-owners
 * @access Private/Admin
 */
const createShopOwner = async (req, res, next) => {
    try {
        const {
            // Shop owner account info
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            address,
            city,
            zipCode,

            // Business info
            businessName,
            businessAddress,
            businessPhone,
            businessEmail,
            businessLogo,
            businessRegistrationDoc,
            taxId,
            businessRegistrationNumber,
            stripeAccountId,
            operatingCountries,
            countryId,
            shopId
        } = req.body;
        const { businessLogoBlob, businessRegistrationDocBlob } = req.files || {};

        // Always generate a random password for security
        const defaultPassword = generateRandomPassword();

        if (!businessName || !businessAddress || !businessPhone || !businessEmail) {
            throw new ApiError('Business details are required', 400);
        }

        // Create shop owner directly using new service method
        const shopOwnerData = {
            email,
            password: defaultPassword,
            firstName,
            lastName,
            phoneNumber,
            address,
            city,
            zipCode,
            businessName,
            businessAddress,
            businessPhone,
            businessEmail,
            businessLogo,
            businessRegistrationDoc,
            taxId,
            businessRegistrationNumber,
            stripeAccountId,
            operatingCountries,
            countryId,
            shopId,
            businessLogoBlob: businessLogoBlob?.[0],
            businessRegistrationDocBlob: businessRegistrationDocBlob?.[0],
            verificationStatus: req.body.verificationStatus || 'verified',
            isActive: true,
            emailVerified: true // Admin-created accounts are verified by default
        };

        const shopOwner = await shopOwnerService.createShopOwner(shopOwnerData);

        // Send account credentials email to the new shop owner
        try {
            await emailService.sendAccountCredentials(
                email,
                defaultPassword,
                'shop owner',
                firstName,
                lastName
            );
            logger.info(`Account credentials email sent successfully to shop owner: ${email}`);
        } catch (emailError) {
            logger.error(`Failed to send account credentials email to shop owner ${email}: ${emailError.message}`);
            // Don't fail the account creation if email fails
        }

        res.status(201).json({
            success: true,
            message: 'Shop owner created successfully',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all shop owners with pagination, filtering and sorting
 * @route GET /api/admin/shop-owners
 * @access Private/Admin
 */
const getAllShopOwners = async (req, res, next) => {
    try {
        const { page, limit, search, verificationStatus, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            search,
            verificationStatus,
            sortBy,
            sortOrder
        };

        const result = await shopOwnerService.getShopOwners(options);

        res.status(200).json({
            success: true,
            data: result.shopOwners,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get shop owner by ID
 * @route GET /api/admin/shop-owners/:id
 * @access Private/Admin
 */
const getShopOwnerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shopOwner = await shopOwnerService.getShopOwnerById(id);

        res.status(200).json({
            success: true,
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update shop owner
 * @route PUT /api/admin/shop-owners/:id
 * @access Private/Admin
 */
const updateShopOwner = async (req, res, next) => {
    try {
        const { id } = req.params;

        // First get shop owner to get userId
        const shopOwner = await shopOwnerService.getShopOwnerById(id);
        const userId = shopOwner.userId._id;

        // Then update the profile
        const updatedShopOwner = await shopOwnerService.updateShopOwnerProfile(userId, req.body);

        res.status(200).json({
            success: true,
            message: 'Shop owner updated successfully',
            data: updatedShopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete shop owner
 * @route DELETE /api/admin/shop-owners/:id
 * @access Private/Admin
 */
const deleteShopOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await shopOwnerService.deleteShopOwner(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Shop owner deleted successfully'
            });
        } else {
            throw new ApiError('Shop owner deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Verify shop owner
 * @route PATCH /api/admin/shop-owners/:id/verify
 * @access Private/Admin
 */
const verifyShopOwner = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Update verification status
        const shopOwner = await shopOwnerService.updateVerificationStatus(id, 'verified');

        // Send notification to user
        await notificationService.createNotification({
            userId: shopOwner.userId,
            title: 'Verification Approved',
            message: 'Your shop owner profile has been verified. You can now create shops and manage services.',
            type: 'system'
        });

        res.status(200).json({
            success: true,
            message: 'Shop owner verified successfully',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reject shop owner verification
 * @route PATCH /api/admin/shop-owners/:id/reject
 * @access Private/Admin
 */
const rejectShopOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            throw new ApiError('Rejection reason is required', 400);
        }

        // Update verification status
        const shopOwner = await shopOwnerService.updateVerificationStatus(id, 'rejected', reason);

        // Send notification to user
        await notificationService.createNotification({
            userId: shopOwner.userId,
            title: 'Verification Rejected',
            message: `Your shop owner verification has been rejected. Reason: ${reason}`,
            type: 'system'
        });

        res.status(200).json({
            success: true,
            message: 'Shop owner verification rejected',
            data: shopOwner
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get pending shop owners
 * @route GET /api/admin/shop-owners/pending/list
 * @access Private/Admin
 */
const getPendingShopOwners = async (req, res, next) => {
    try {
        const { page, limit } = req.query;

        console.log('getPendingShopOwners called with query:', req.query);

        const options = {
            page,
            limit,
            verificationStatus: 'pending',
            sortBy: 'createdAt',
            sortOrder: 'asc'
        };

        console.log('Calling shopOwnerService.getShopOwners with options:', options);

        const result = await shopOwnerService.getShopOwners(options);

        console.log('shopOwnerService.getShopOwners returned:', result);

        res.status(200).json({
            success: true,
            data: result.shopOwners,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error in getPendingShopOwners:', error);
        next(error);
    }
};

/**
 * Get verification documents
 * @route GET /api/admin/shop-owners/:id/documents
 * @access Private/Admin
 */
const getVerificationDocuments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const shopOwner = await shopOwnerService.getShopOwnerById(id);

        // Include business registration document along with verification documents
        const documents = [];

        // Add business registration document if it exists
        if (shopOwner.businessRegistrationDoc) {
            documents.push({
                type: 'business_registration',
                url: shopOwner.businessRegistrationDoc,
                uploadedAt: shopOwner.createdAt,
                documentType: 'Business Registration Document'
            });
        }

        // Add any additional verification documents
        if (shopOwner.verificationDocuments && shopOwner.verificationDocuments.length > 0) {
            shopOwner.verificationDocuments.forEach((docUrl, index) => {
                documents.push({
                    type: 'verification',
                    url: docUrl,
                    uploadedAt: shopOwner.updatedAt, // Use updatedAt as we don't have individual timestamps
                    documentType: `Verification Document ${index + 1}`
                });
            });
        }

        res.status(200).json({
            success: true,
            data: documents
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload verification document for shop owner (admin)
 * @route POST /api/admin/shop-owners/:id/documents
 * @access Private/Admin
 */
const uploadVerificationDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError('Document file is required', 400);
        }

        const { id } = req.params;
        const { documentType } = req.body;

        if (!documentType) {
            throw new ApiError('Document type is required', 400);
        }

        // Upload file to storage
        const fileUrl = await fileUploadService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            'verification-documents'
        );

        // Add document to shop owner profile
        const shopOwner = await shopOwnerService.addVerificationDocument(id, fileUrl, documentType);

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                documentUrl: fileUrl,
                documentType
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createShopOwner,
    getAllShopOwners,
    getShopOwnerById,
    updateShopOwner,
    deleteShopOwner,
    verifyShopOwner,
    rejectShopOwner,
    getPendingShopOwners,
    getVerificationDocuments,
    uploadVerificationDocument
};