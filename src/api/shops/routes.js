// src/api/shops/routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, requirePermission, checkCountryAccess } = require('../../middlewares/auth');
const { validate, shopSchemas } = require('../../utils/validators');
const shopController = require('./controllers/shopController');
const shopJoinRequestController = require('./controllers/shopJoinRequestController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Shop:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Shop ID
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: Shop name
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Shop description
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of shop image URLs
 *         logo:
 *           type: string
 *           description: Shop logo URL
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *               description: Street address
 *             latitude:
 *               type: number
 *               description: Latitude coordinate
 *             longitude:
 *               type: number
 *               description: Longitude coordinate
 *             formattedAddress:
 *               type: string
 *               description: Formatted address
 *             city:
 *               type: string
 *               description: City name
 *             state:
 *               type: string
 *               description: State name
 *             country:
 *               type: string
 *               description: Country name
 *             postalCode:
 *               type: string
 *               description: Postal code
 *         contactPhone:
 *           type: string
 *           description: Contact phone number
 *         contactEmail:
 *           type: string
 *           format: email
 *           description: Contact email address
 *         businessHours:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Day of week (0=Sunday, 6=Saturday)
 *               openTime:
 *                 type: object
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *               closeTime:
 *                 type: object
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *               isClosed:
 *                 type: boolean
 *                 default: false
 *         serviceTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [haircut, beard_trim, hair_coloring, hair_washing, massage, facial, manicure, pedicure, waxing, threading, other]
 *           description: Types of services offered
 *         services:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of service IDs
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           description: Shop amenities
 *         socialLinks:
 *           type: object
 *           properties:
 *             website:
 *               type: string
 *               format: uri
 *             instagram:
 *               type: string
 *             facebook:
 *               type: string
 *             twitter:
 *               type: string
 *             youtube:
 *               type: string
 *         ownerId:
 *           type: string
 *           description: Shop owner user ID
 *         isVerified:
 *           type: boolean
 *           description: Whether shop is verified by admin
 *         isActive:
 *           type: boolean
 *           description: Whether shop is active
 *         uid:
 *           type: string
 *           description: Unique identifier for shop
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ShopJoinRequest:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Join request ID
 *         freelancerId:
 *           type: string
 *           description: Freelancer/barber user ID
 *         shopId:
 *           type: string
 *           description: Shop ID
 *         status:
 *           type: string
 *           enum: [pending, linked, unlinked, rejected]
 *           description: Request status
 *         message:
 *           type: string
 *           description: Optional message from freelancer
 *         reviewedBy:
 *           type: string
 *           description: User ID who reviewed the request
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           minimum: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *         total:
 *           type: integer
 *           minimum: 0
 *         pages:
 *           type: integer
 *           minimum: 0
 *     ShopResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Shop'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *     ShopsListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Shop'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *     JoinRequestResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/ShopJoinRequest'
 *     JoinRequestsListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ShopJoinRequest'
 *     ServiceProvidersResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           minimum: 0
 *         providers:
 *           type: array
 *           items:
 *             type: object
 *             description: Service provider details
 *     CreateShopRequest:
 *       type: object
 *       required:
 *         - name
 *         - location
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 500
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         logo:
 *           type: string
 *         location:
 *           type: object
 *           required:
 *             - address
 *             - latitude
 *             - longitude
 *           properties:
 *             address:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             formattedAddress:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             postalCode:
 *               type: string
 *         contactPhone:
 *           type: string
 *         contactEmail:
 *           type: string
 *           format: email
 *         businessHours:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - day
 *               - openTime
 *               - closeTime
 *             properties:
 *               day:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *               openTime:
 *                 type: object
 *                 required:
 *                   - hour
 *                   - minute
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *               closeTime:
 *                 type: object
 *                 required:
 *                   - hour
 *                   - minute
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *               isClosed:
 *                 type: boolean
 *                 default: false
 *         serviceTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [haircut, beard_trim, hair_coloring, hair_washing, massage, facial, manicure, pedicure, waxing, threading, other]
 *         services:
 *           type: array
 *           items:
 *             type: string
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *         socialLinks:
 *           type: object
 *           properties:
 *             website:
 *               type: string
 *               format: uri
 *             instagram:
 *               type: string
 *             facebook:
 *               type: string
 *             twitter:
 *               type: string
 *             youtube:
 *               type: string
 *     UpdateShopRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 500
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         logo:
 *           type: string
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             formattedAddress:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             postalCode:
 *               type: string
 *         contactPhone:
 *           type: string
 *         contactEmail:
 *           type: string
 *           format: email
 *         businessHours:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - day
 *               - openTime
 *               - closeTime
 *             properties:
 *               day:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *               openTime:
 *                 type: object
 *                 required:
 *                   - hour
 *                   - minute
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *               closeTime:
 *                 type: object
 *                 required:
 *                   - hour
 *                   - minute
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *               isClosed:
 *                 type: boolean
 *                 default: false
 *         serviceTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [haircut, beard_trim, hair_coloring, hair_washing, massage, facial, manicure, pedicure, waxing, threading, other]
 *         services:
 *           type: array
 *           items:
 *             type: string
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *         socialLinks:
 *           type: object
 *           properties:
 *             website:
 *               type: string
 *               format: uri
 *             instagram:
 *               type: string
 *             facebook:
 *               type: string
 *             twitter:
 *               type: string
 *             youtube:
 *               type: string
 *         isActive:
 *           type: boolean
 *     VerifyShopRequest:
 *       type: object
 *       required:
 *         - isVerified
 *       properties:
 *         isVerified:
 *           type: boolean
 *           description: Verification status
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection (required if isVerified is false)
 *     SendJoinRequest:
 *       type: object
 *       required:
 *         - shopId
 *       properties:
 *         shopId:
 *           type: string
 *           description: Shop ID to join
 *         message:
 *           type: string
 *           description: Optional message to shop owner
 *     ReviewJoinRequest:
 *       type: object
 *       required:
 *         - requestId
 *         - status
 *       properties:
 *         requestId:
 *           type: string
 *           description: Join request ID
 *         status:
 *           type: string
 *           enum: [approve, reject, linked, unlinked]
 *           description: Review status
 *     AddBarberRequest:
 *       type: object
 *       required:
 *         - barberId
 *       properties:
 *         barberId:
 *           type: string
 *           description: Barber ID to add to shop
 */

/**
 * @swagger
 * /api/shops:
 *   get:
 *     tags: [Shops]
 *     summary: Get all shops with pagination and filtering
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
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *         description: Filter by owner ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
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
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in kilometers
 *     responses:
 *       200:
 *         description: Shops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopsListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', shopController.getShops);

/**
 * @swagger
 * /api/shops/search:
 *   get:
 *     tags: [Shops]
 *     summary: Search shops with location and service filters
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *       - in: query
 *         name: serviceTypes
 *         schema:
 *           type: string
 *         description: Comma-separated service types
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
 *           default: distance
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Shops search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopsListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', shopController.searchShops);

/**
 * @swagger
 * /api/shops/uid/{uid}:
 *   get:
 *     tags: [Shops]
 *     summary: Get shop by unique identifier
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop unique identifier
 *     responses:
 *       200:
 *         description: Shop retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopResponse'
 *       404:
 *         description: Shop not found
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
router.get('/uid/:uid', shopController.getShopByUid);

/**
 * @swagger
 * /api/shops/{id}:
 *   get:
 *     tags: [Shops]
 *     summary: Get shop by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopResponse'
 *       404:
 *         description: Shop not found
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
router.get('/:id', shopController.getShopById);

/**
 * @swagger
 * /api/shops/{id}/services:
 *   get:
 *     tags: [Shops]
 *     summary: Get services offered by a shop
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           default: approved
 *         description: Service status filter
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
 *         name: category
 *         schema:
 *           type: string
 *         description: Service category filter
 *     responses:
 *       200:
 *         description: Shop services retrieved successfully
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
 *                     description: Service details
 *       404:
 *         description: Shop not found
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
router.get('/:id/services', shopController.getShopServices);

/**
 * @swagger
 * /api/shops/{id}/barbers:
 *   get:
 *     tags: [Shops]
 *     summary: Get barbers working at a shop
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           default: active
 *         description: Barber status filter
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
 *     responses:
 *       200:
 *         description: Shop barbers retrieved successfully
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
 *       404:
 *         description: Shop not found
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
router.get('/:id/barbers', shopController.getShopBarbers);

/**
 * @swagger
 * /api/shops/{id}/service-providers:
 *   get:
 *     tags: [Shops]
 *     summary: Get service providers for a shop and service
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceProvidersResponse'
 *       400:
 *         description: Service ID is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop not found
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
router.get('/:id/service-providers', shopController.getServiceProviders);

// Protected routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/shops/join-request:
 *   post:
 *     tags: [Shops]
 *     summary: Send join request to a shop (barber/freelancer only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendJoinRequest'
 *     responses:
 *       200:
 *         description: Join request sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinRequestResponse'
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
 *         description: Forbidden - not a barber or freelancer
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
router.post('/join-request', authorize('barber', 'freelancer'), shopJoinRequestController.sendJoinRequest);

/**
 * @swagger
 * /api/shops/shops/join-requests/me:
 *   get:
 *     tags: [Shops]
 *     summary: Get join requests for current freelancer/barber
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Join requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinRequestsListResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a barber or freelancer
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
router.get('/shops/join-requests/me', authorize('barber', 'freelancer'), shopJoinRequestController.getRequestsForFreelancer);

/**
 * @swagger
 * /api/shops/unlink:
 *   post:
 *     tags: [Shops]
 *     summary: Unlink from current shop (barber/freelancer only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully unlinked from shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ShopJoinRequest'
 *                 message:
 *                   type: string
 *                   example: Successfully unlinked from shop
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not a barber or freelancer
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
router.post('/unlink', authorize('barber', 'freelancer'), shopJoinRequestController.unlinkFromShop);

/**
 * @swagger
 * /api/shops/join-requests/shop-owner:
 *   get:
 *     tags: [Shops]
 *     summary: Get join requests for shop owner's shops
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Join requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinRequestsListResponse'
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
router.get('/join-requests/shop-owner', authorize('shop_owner'), shopJoinRequestController.getRequestsForShopOwner);

/**
 * @swagger
 * /api/shops/join-requests/admin:
 *   get:
 *     tags: [Shops]
 *     summary: Get all join requests (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Join requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinRequestsListResponse'
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/join-requests/admin', authorize('admin'), shopJoinRequestController.getRequestsForAdmin);

/**
 * @swagger
 * /api/shops/join-request/review:
 *   post:
 *     tags: [Shops]
 *     summary: Review join request (shop owner only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewJoinRequest'
 *     responses:
 *       200:
 *         description: Join request reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinRequestResponse'
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/join-request/review',
    authorize('shop_owner'),
    requirePermission('edit_shop'),
    validate(shopSchemas.reviewJoinRequest),
    shopJoinRequestController.reviewRequest
);

/**
 * @swagger
 * /api/shops:
 *   post:
 *     tags: [Shops]
 *     summary: Create a new shop (shop owner only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShopRequest'
 *     responses:
 *       201:
 *         description: Shop created successfully
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
 *                   example: Shop created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *       400:
 *         description: Invalid request data or shop owner already has a shop
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
router.post('/',
    authorize('shop_owner'),
    requirePermission('create_shop'),
    validate(shopSchemas.createShop),
    shopController.createShop
);

/**
 * @swagger
 * /api/shops:
 *   put:
 *     tags: [Shops]
 *     summary: Update shop (shop owner only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateShopRequest'
 *     responses:
 *       200:
 *         description: Shop updated successfully
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
 *                   example: Shop updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
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
 *         description: Shop not found
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
router.put('/',
    authorize('shop_owner'),
    validate(shopSchemas.updateShop),
    shopController.updateShop
);

/**
 * @swagger
 * /api/shops/{id}:
 *   delete:
 *     tags: [Shops]
 *     summary: Delete shop (shop owner or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deleted successfully
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
 *                   example: Shop deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not authorized to delete this shop
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop not found
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
    requirePermission('delete_shop'),
    shopController.deleteShop
);

/**
 * @swagger
 * /api/shops/{id}/barbers:
 *   post:
 *     tags: [Shops]
 *     summary: Add barber to shop (shop owner or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddBarberRequest'
 *     responses:
 *       200:
 *         description: Barber added to shop successfully
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
 *                   example: Barber added to shop successfully
 *                 data:
 *                   type: object
 *                   description: Barber details
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
 *         description: Forbidden - not authorized to manage this shop
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop or barber not found
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
router.post('/:id/barbers',
    requirePermission('update_shop'),
    shopController.addBarberToShop
);

/**
 * @swagger
 * /api/shops/{id}/barbers:
 *   get:
 *     tags: [Shops]
 *     summary: Get barbers for a shop (legacy endpoint)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop barbers retrieved successfully
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
 *       404:
 *         description: Shop not found
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
router.get('/:id/barbers',
    shopController.getShopsBarbers
);

/**
 * @swagger
 * /api/shops/{id}/barbers/{barberId}:
 *   delete:
 *     tags: [Shops]
 *     summary: Remove barber from shop (shop owner or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     responses:
 *       200:
 *         description: Barber removed from shop successfully
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
 *                   example: Barber removed from shop successfully
 *                 data:
 *                   type: object
 *                   description: Barber details
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not authorized to manage this shop
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop or barber not found
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
router.delete('/:id/barbers/:barberId',
    requirePermission('update_shop'),
    shopController.removeBarberFromShop
);

/**
 * @swagger
 * /api/shops/country/{countryId}:
 *   get:
 *     tags: [Shops]
 *     summary: Get shops by country
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: countryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID
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
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *         description: Filter by owner ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
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
 *     responses:
 *       200:
 *         description: Shops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopsListResponse'
 *       401:
 *         description: Unauthorized
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
router.get('/country/:countryId', 
    authenticate,
    checkCountryAccess,
    shopController.getShopsByCountry
);

/**
 * @swagger
 * /api/shops/{id}/verify:
 *   patch:
 *     tags: [Shops]
 *     summary: Verify or unverify a shop (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyShopRequest'
 *     responses:
 *       200:
 *         description: Shop verification status updated successfully
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
 *                   example: Shop verified successfully
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
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
 *         description: Forbidden - not an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Shop not found
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
router.patch('/:id/verify',
    authorize('admin'),
    requirePermission('approve_shop'),
    validate(shopSchemas.verifyShop),
    shopController.verifyShop
);

module.exports = router;


// List all shops for freelancers (move above /:id)
router.get('/', shopController.getShops);
router.get('/search', shopController.searchShops);
router.get('/uid/:uid', shopController.getShopByUid);
router.get('/:id', shopController.getShopById);
router.get('/:id/services', shopController.getShopServices);
router.get('/:id/barbers', shopController.getShopBarbers);
router.get('/:id/service-providers', shopController.getServiceProviders);

// Protected routes require authentication
router.use(authenticate);

// Freelancer: send join request, view own requests
router.post('/join-request', authorize('barber', 'freelancer'), shopJoinRequestController.sendJoinRequest);
router.get('/shops/join-requests/me', authorize('barber', 'freelancer'), shopJoinRequestController.getRequestsForFreelancer);
router.post('/unlink', authorize('barber', 'freelancer'), shopJoinRequestController.unlinkFromShop);

// Shop owner: view join requests for their shops
router.get('/join-requests/shop-owner', authorize('shop_owner'), shopJoinRequestController.getRequestsForShopOwner);

// Admin: view all join requests
router.get('/join-requests/admin', authorize('admin'), shopJoinRequestController.getRequestsForAdmin);

// Shop owner or admin: review join request
router.post('/join-request/review',
    authorize('shop_owner'),
    requirePermission('edit_shop'),
    validate(shopSchemas.reviewJoinRequest),
    shopJoinRequestController.reviewRequest
);
// Shop owner routes
router.post('/',
    authorize('shop_owner'),
    requirePermission('create_shop'),
    validate(shopSchemas.createShop),
    shopController.createShop
);

router.put('/',
    authorize('shop_owner'),
    validate(shopSchemas.updateShop),
    shopController.updateShop
);

router.delete('/:id',
    requirePermission('delete_shop'),
    shopController.deleteShop
);

// Barber management
router.post('/:id/barbers',
    requirePermission('update_shop'),
    shopController.addBarberToShop
);
router.get('/:id/barbers',
    shopController.getShopsBarbers
);

router.delete('/:id/barbers/:barberId',
    requirePermission('update_shop'),
    shopController.removeBarberFromShop
);

router.get('/country/:countryId', 
    authenticate,
    checkCountryAccess,
    shopController.getShopsByCountry
);

// Admin-only routes
router.patch('/:id/verify',
    authorize('admin'),
    requirePermission('approve_shop'),
    validate(shopSchemas.verifyShop),
    shopController.verifyShop
);

module.exports = router;