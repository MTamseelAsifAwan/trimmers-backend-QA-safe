
// src/api/shop-owners/routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { requirePermission } = require('../../middlewares/rbac');
const { validate, shopOwnerSchemas } = require('../../utils/validators');
const shopOwnerController = require('./controllers/shopOwnerController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * components:
 *   schemas:
 *     ShopOwner:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Shop owner ID
 *         userId:
 *           type: string
 *           description: Associated user ID
 *         businessName:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           description: Business name
 *         businessAddress:
 *           type: string
 *           description: Business address
 *         businessPhone:
 *           type: string
 *           description: Business phone number
 *         businessEmail:
 *           type: string
 *           format: email
 *           description: Business email address
 *         businessLogo:
 *           type: string
 *           description: Business logo URL
 *         taxId:
 *           type: string
 *           description: Tax identification number
 *         businessRegistrationNumber:
 *           type: string
 *           description: Business registration number
 *         stripeAccountId:
 *           type: string
 *           description: Stripe account ID for payments
 *         verificationDocuments:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of verification document URLs
 *         verificationStatus:
 *           type: string
 *           enum: [pending, verified, rejected]
 *           description: Verification status
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection (if rejected)
 *         countryId:
 *           type: string
 *           description: Country ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AssignBookingRequest:
 *       type: object
 *       required:
 *         - barberId
 *       properties:
 *         barberId:
 *           type: string
 *           description: Barber ID to assign the booking to
 *     RescheduleBookingRequest:
 *       type: object
 *       required:
 *         - newDate
 *         - newTime
 *       properties:
 *         newDate:
 *           type: string
 *           format: date
 *           description: New booking date (YYYY-MM-DD)
 *         newTime:
 *           type: object
 *           required:
 *             - hour
 *             - minute
 *           properties:
 *             hour:
 *               type: integer
 *               minimum: 0
 *               maximum: 23
 *             minute:
 *               type: integer
 *               minimum: 0
 *               maximum: 59
 *           description: New booking time
 *         reason:
 *           type: string
 *           description: Reason for rescheduling
 *     CreateShopOwnerProfileRequest:
 *       type: object
 *       properties:
 *         businessName:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         businessAddress:
 *           type: string
 *         businessPhone:
 *           type: string
 *         businessEmail:
 *           type: string
 *           format: email
 *         businessLogo:
 *           type: string
 *         taxId:
 *           type: string
 *         businessRegistrationNumber:
 *           type: string
 *         stripeAccountId:
 *           type: string
 *         verificationDocuments:
 *           type: array
 *           items:
 *             type: string
 *         countryId:
 *           type: string
 *     UpdateShopOwnerProfileRequest:
 *       type: object
 *       properties:
 *         businessName:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         businessAddress:
 *           type: string
 *         businessPhone:
 *           type: string
 *         businessEmail:
 *           type: string
 *           format: email
 *         businessLogo:
 *           type: string
 *         taxId:
 *           type: string
 *         businessRegistrationNumber:
 *           type: string
 *         stripeAccountId:
 *           type: string
 *         verificationDocuments:
 *           type: array
 *           items:
 *             type: string
 *     UpdateVerificationStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, verified, rejected]
 *         rejectionReason:
 *           type: string
 *           description: Required when status is rejected
 *     ShopOwnerResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/ShopOwner'
 *     ShopOwnersListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ShopOwner'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 */

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/shop-owners/bookings/requested:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get requested bookings for shop owner's shops
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Requested bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Booking details
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bookings/requested',
    authorize('shop_owner'),
    shopOwnerController.getRequestedBookings
);

/**
 * @swagger
 * /api/shop-owners/bookings/all:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get all bookings for shop owner's shops
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All shop bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Booking details
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/bookings/all',
    authorize('shop_owner'),
    shopOwnerController.getAllShopBookings
);

/**
 * @swagger
 * /api/shop-owners/bookings/{bookingId}/assign:
 *   post:
 *     tags: [Shop Owners]
 *     summary: Assign booking to barber/freelancer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignBookingRequest'
 *     responses:
 *       200:
 *         description: Booking assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Booking assigned successfully
 *                 data:
 *                   type: object
 *                   description: Updated booking details
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner or not authorized for this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking or barber not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bookings/:bookingId/assign',
    authorize('shop_owner'),
    shopOwnerController.assignBookingToBarber
);

/**
 * @swagger
 * /api/shop-owners/bookings/{bookingId}/reject:
 *   post:
 *     tags: [Shop Owners]
 *     summary: Reject booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Booking rejected successfully
 *                 data:
 *                   type: object
 *                   description: Updated booking details
 *       400:
 *         description: Booking cannot be rejected in its current state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner or not authorized for this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bookings/:bookingId/reject',
    authorize('shop_owner'),
    shopOwnerController.rejectBooking
);

/**
 * @swagger
 * /api/shop-owners/bookings/{bookingId}/reassign-rejected:
 *   post:
 *     tags: [Shop Owners]
 *     summary: Reassign rejected booking to another barber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignBookingRequest'
 *     responses:
 *       200:
 *         description: Booking reassigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Booking reassigned successfully
 *                 data:
 *                   type: object
 *                   description: Updated booking details
 *       400:
 *         description: Invalid request data or booking not in rejected state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner or not authorized for this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking or barber not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bookings/:bookingId/reassign-rejected',
    authorize('shop_owner'),
    shopOwnerController.reassignRejectedBooking
);

/**
 * @swagger
 * /api/shop-owners/bookings/{bookingId}/reschedule:
 *   post:
 *     tags: [Shop Owners]
 *     summary: Reschedule booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RescheduleBookingRequest'
 *     responses:
 *       200:
 *         description: Booking rescheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Booking rescheduled successfully
 *                 data:
 *                   type: object
 *                   description: Updated booking details
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner or not authorized for this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/bookings/:bookingId/reschedule',
    authorize('shop_owner'),
    shopOwnerController.rescheduleBooking
);

/**
 * @swagger
 * /api/shop-owners/profile:
 *   post:
 *     tags: [Shop Owners]
 *     summary: Create shop owner profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShopOwnerProfileRequest'
 *     responses:
 *       201:
 *         description: Shop owner profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Shop owner profile created successfully
 *                 data:
 *                   $ref: '#/components/schemas/ShopOwner'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Profile already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/profile',
    authorize('shop_owner'),
    validate(shopOwnerSchemas.createShopOwnerProfile),
    shopOwnerController.createShopOwnerProfile
);

/**
 * @swagger
 * /api/shop-owners/documents/upload:
 *   post:
 *     tags: [Shop Owners]
 *     summary: Upload verification document
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *                 description: Verification document file
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Document uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     documentUrl:
 *                       type: string
 *                       description: URL of the uploaded document
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/documents/upload',
    authorize('shop_owner'),
    upload.single('document'),
    shopOwnerController.uploadVerificationDocument
);

/**
 * @swagger
 * /api/shop-owners/profile:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get current shop owner profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shop owner profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopOwnerResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile',
    authorize('shop_owner'),
    shopOwnerController.getShopOwnerProfile
);

/**
 * @swagger
 * /api/shop-owners/profile:
 *   put:
 *     tags: [Shop Owners]
 *     summary: Update shop owner profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateShopOwnerProfileRequest'
 *     responses:
 *       200:
 *         description: Shop owner profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Shop owner profile updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/ShopOwner'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/profile',
    authorize('shop_owner'),
    validate(shopOwnerSchemas.updateShopOwnerProfile),
    shopOwnerController.updateShopOwnerProfile
);

/**
 * @swagger
 * /api/shop-owners/documents/{documentUrl}:
 *   delete:
 *     tags: [Shop Owners]
 *     summary: Remove verification document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentUrl
 *         required: true
 *         schema:
 *           type: string
 *         description: Document URL to remove
 *     responses:
 *       200:
 *         description: Document removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Document removed successfully
 *       400:
 *         description: Document URL is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/documents/:documentUrl',
    authorize('shop_owner'),
    shopOwnerController.removeVerificationDocument
);

/**
 * @swagger
 * /api/shop-owners/uid/{uid}:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get shop owner by unique identifier
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop owner unique identifier
 *     responses:
 *       200:
 *         description: Shop owner retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopOwnerResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop owner not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/uid/:uid',
    authorize(['admin', 'country_manager', 'customer_care']),
    shopOwnerController.getShopOwnerByUid
);

/**
 * @swagger
 * /api/shop-owners/shops:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get shops owned by current user (admin) or current shop owner
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shop'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/shops',
    authorize(...['admin', 'shop_owner']),
    shopOwnerController.getOwnerShops
);

/**
 * @swagger
 * /api/shop-owners/barbers:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get barbers working at shop owner's shops
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Barbers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Barber details
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/barbers',
    authorize('shop_owner'),
    shopOwnerController.getShopBarbers
);

/**
 * @swagger
 * /api/shop-owners/barber-bookings:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get bookings assigned to barbers at shop owner's shops
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Barber bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Booking details
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a shop owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/barber-bookings',
    authorize('shop_owner'),
    shopOwnerController.getBarberBookings
);

/**
 * @swagger
 * /api/shop-owners/{id}:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get shop owner by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop owner ID
 *     responses:
 *       200:
 *         description: Shop owner retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopOwnerResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop owner not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id',
    authorize(['admin', 'country_manager', 'customer_care']),
    shopOwnerController.getShopOwnerById
);

/**
 * @swagger
 * /api/shop-owners/{id}/shops:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get shops owned by a specific shop owner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop owner ID
 *     responses:
 *       200:
 *         description: Shops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shop'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop owner not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/shops',
    authorize(['admin', 'country_manager', 'shop_owner']),
    shopOwnerController.getShopsByOwner
);

/**
 * @swagger
 * /api/shop-owners:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get all shop owners with pagination (admin and country manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: verificationStatus
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected]
 *         description: Filter by verification status
 *     responses:
 *       200:
 *         description: Shop owners retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopOwnersListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not an admin or country manager
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/',
    authorize(['admin', 'country_manager']),
    shopOwnerController.getShopOwners
);

/**
 * @swagger
 * /api/shop-owners/{id}/verification:
 *   put:
 *     tags: [Shop Owners]
 *     summary: Update shop owner verification status (admin and country manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop owner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVerificationStatusRequest'
 *     responses:
 *       200:
 *         description: Verification status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Shop owner verification status updated to verified
 *                 data:
 *                   $ref: '#/components/schemas/ShopOwner'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop owner not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id/verification',
    authorize(['admin', 'country_manager']),
    requirePermission('verify_shop_owner'),
    validate(shopOwnerSchemas.updateVerificationStatus),
    shopOwnerController.updateVerificationStatus
);

/**
 * @swagger
 * /api/shop-owners/{id}:
 *   delete:
 *     tags: [Shop Owners]
 *     summary: Delete shop owner (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop owner ID
 *     responses:
 *       200:
 *         description: Shop owner deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Shop owner deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop owner not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id',
    authorize('admin'),
    requirePermission('delete_shop_owner'),
    shopOwnerController.deleteShopOwner
);

module.exports = router;
// All routes require authentication
router.use(authenticate);

// Booking management routes
router.get('/bookings/requested',
    authorize('shop_owner'),
    shopOwnerController.getRequestedBookings
);

router.get('/bookings/all',
    authorize('shop_owner'),
    shopOwnerController.getAllShopBookings
);

// Assign booking to barber/freelancer
router.post('/bookings/:bookingId/assign',
    authorize('shop_owner'),
    shopOwnerController.assignBookingToBarber
);

// Reject booking
router.post('/bookings/:bookingId/reject',
    authorize('shop_owner'),
    shopOwnerController.rejectBooking
);

// Reassign rejected booking (freelancer or barber) to another barber
router.post('/bookings/:bookingId/reassign-rejected',
    authorize('shop_owner'),
    shopOwnerController.reassignRejectedBooking
);

// Reschedule booking
router.post('/bookings/:bookingId/reschedule',
    authorize('shop_owner'),
    shopOwnerController.rescheduleBooking
);

// Routes for shop owners accessing their own profile
router.post('/profile',
    authorize('shop_owner'),
    validate(shopOwnerSchemas.createShopOwnerProfile),
    shopOwnerController.createShopOwnerProfile
);



// Document upload route
router.post('/documents/upload',
    authorize('shop_owner'),
    upload.single('document'),
    shopOwnerController.uploadVerificationDocument
);

router.get('/profile',
    authorize('shop_owner'),
    shopOwnerController.getShopOwnerProfile
);

router.put('/profile',
    authorize('shop_owner'),
    validate(shopOwnerSchemas.updateShopOwnerProfile),
    shopOwnerController.updateShopOwnerProfile
);

router.delete('/documents/:documentUrl',
    authorize('shop_owner'),
    shopOwnerController.removeVerificationDocument
);

// Admin, Country Manager, and Customer Care routes
router.get('/uid/:uid',
    authorize(['admin', 'country_manager', 'customer_care']),
    shopOwnerController.getShopOwnerByUid
);
router.get('/shops',
    authorize(...['admin', 'shop_owner']),
    shopOwnerController.getOwnerShops
);

router.get('/barbers',
    authorize('shop_owner'),
    shopOwnerController.getShopBarbers
);

router.get('/barber-bookings',
    authorize('shop_owner'),
    shopOwnerController.getBarberBookings
);

router.get('/:id',
    authorize(['admin', 'country_manager', 'customer_care']),
    shopOwnerController.getShopOwnerById
);

router.get('/:id/shops',
    authorize(['admin', 'country_manager', 'shop_owner']),
    shopOwnerController.getShopsByOwner
);


// Admin and Country Manager routes
router.get('/',
    authorize(['admin', 'country_manager']),
    shopOwnerController.getShopOwners
);

router.put('/:id/verification',
    authorize(['admin', 'country_manager']),
    requirePermission('verify_shop_owner'),
    validate(shopOwnerSchemas.updateVerificationStatus),
    shopOwnerController.updateVerificationStatus
);

// Shop Update Request routes for shop owners
/**
 * @swagger
 * /api/shop-owners/shop-update-requests:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get shop update requests for current shop owner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Shop update requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       uid:
 *                         type: string
 *                       shop:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                       priority:
 *                         type: string
 *                         enum: [low, medium, high]
 *                       requestedAt:
 *                         type: string
 *                         format: date-time
 *                       reviewedAt:
 *                         type: string
 *                         format: date-time
 *                       reviewNotes:
 *                         type: string
 *                       changesSummary:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             field:
 *                               type: string
 *                             oldValue:
 *                               type: string
 *                             newValue:
 *                               type: string
 *                             type:
 *                               type: string
 *                       changesCount:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not a shop owner
 *       500:
 *         description: Internal server error
 */
router.get('/shop-update-requests',
    authorize('shop_owner'),
    shopOwnerController.getShopUpdateRequests
);

/**
 * @swagger
 * /api/shop-owners/shop-update-requests/{id}:
 *   get:
 *     tags: [Shop Owners]
 *     summary: Get specific shop update request details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Update request ID
 *     responses:
 *       200:
 *         description: Shop update request details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not a shop owner or not your request
 *       404:
 *         description: Update request not found
 *       500:
 *         description: Internal server error
 */
router.get('/shop-update-requests/:id',
    authorize('shop_owner'),
    shopOwnerController.getShopUpdateRequestById
);

// Admin-only routes
router.delete('/:id',
    authorize('admin'),
    requirePermission('delete_shop_owner'),
    shopOwnerController.deleteShopOwner
);

module.exports = router;