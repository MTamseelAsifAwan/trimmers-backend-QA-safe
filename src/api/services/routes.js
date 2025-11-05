// src/api/services/routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { requirePermission } = require('../../middlewares/rbac');
const { validate, serviceSchemas } = require('../../utils/validators');
const serviceController = require('./controllers/serviceController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Service ID
 *         uid:
 *           type: string
 *           description: Unique identifier
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           description: Service title
 *         description:
 *           type: string
 *           minLength: 10
 *           description: Service description
 *         price:
 *           type: number
 *           description: Service price
 *         duration:
 *           type: integer
 *           description: Service duration in minutes
 *         status:
 *           type: string
 *           enum: [pending, active, rejected, inactive]
 *           description: Service approval status
 *         category:
 *           type: string
 *           description: Service category name
 *         barberId:
 *           type: string
 *           description: Associated barber ID (for barber services)
 *         shopId:
 *           type: string
 *           description: Associated shop ID (for shop services)
 *         countryId:
 *           type: string
 *           description: Country ID
 *         isTemplate:
 *           type: boolean
 *           description: Whether this is a template service
 *         isPopular:
 *           type: boolean
 *           description: Whether this service is marked as popular
 *         imageUrl:
 *           type: string
 *           description: Service image URL
 *         icon:
 *           type: object
 *           description: Service icon data
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection (if rejected)
 *         offeredBy:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               providerType:
 *                 type: string
 *                 enum: [barber, shop]
 *               providerId:
 *                 type: string
 *           description: List of providers offering this service
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ServiceCategory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Category ID
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         icon:
 *           type: string
 *           description: Category icon
 *         isActive:
 *           type: boolean
 *           description: Whether category is active
 *     ServiceProvider:
 *       type: object
 *       properties:
 *         provider:
 *           type: object
 *           description: Provider details (shop or barber/freelancer)
 *         service:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: Service ID
 *             customPrice:
 *               type: number
 *               description: Custom price for this provider
 *             customDuration:
 *               type: integer
 *               description: Custom duration for this provider
 *         distance:
 *           type: number
 *           description: Distance from search location in kilometers
 *     ServiceResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Service'
 *     ServicesListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Service'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *     ServiceCategoriesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ServiceCategory'
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
 *             $ref: '#/components/schemas/ServiceProvider'
 *     CreateServiceRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           minLength: 10
 *         category:
 *           type: string
 *         shopId:
 *           type: string
 *         barberId:
 *           type: string
 *     UpdateServiceRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         description:
 *           type: string
 *           minLength: 10
 *         category:
 *           type: string
 *         shopId:
 *           type: string
 *         barberId:
 *           type: string
 *     ApproveServiceRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [active, rejected]
 *         rejectionReason:
 *           type: string
 *           description: Required when status is rejected
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     tags: [Services]
 *     summary: Get all services with pagination and filtering
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, rejected, inactive]
 *         description: Filter by service status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by service type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
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
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for location-based filtering
 *       - in: query
 *         name: long
 *         schema:
 *           type: number
 *         description: Longitude for location-based filtering
 *     responses:
 *       200:
 *         description: Services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicesListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', serviceController.getAllServices);

/**
 * @swagger
 * /api/services/categories:
 *   get:
 *     tags: [Services]
 *     summary: Get all service categories
 *     responses:
 *       200:
 *         description: Service categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceCategoriesResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/categories', serviceController.getServiceCategories);

/**
 * @swagger
 * /api/services/popular:
 *   get:
 *     tags: [Services]
 *     summary: Get popular services
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum number of services to return
 *     responses:
 *       200:
 *         description: Popular services retrieved successfully
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
 *                     $ref: '#/components/schemas/Service'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/popular', serviceController.getPopularServices);

/**
 * @swagger
 * /api/services/search:
 *   get:
 *     tags: [Services]
 *     summary: Search services with advanced filters
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Service type filter
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category filter
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Shop ID filter
 *       - in: query
 *         name: barberId
 *         schema:
 *           type: string
 *         description: Barber ID filter
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
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: long
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *     responses:
 *       200:
 *         description: Services search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicesListResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', serviceController.searchServices);

/**
 * @swagger
 * /api/services/barber/{barberId}:
 *   get:
 *     tags: [Services]
 *     summary: Get services offered by a specific barber
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
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
 *         description: Barber services retrieved successfully
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
 *                     $ref: '#/components/schemas/Service'
 *       404:
 *         description: Barber not found
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
router.get('/barber/:barberId', serviceController.getServicesByBarber);

/**
 * @swagger
 * /api/services/shop/{shopId}:
 *   get:
 *     tags: [Services]
 *     summary: Get services offered by a specific shop
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, rejected, inactive]
 *         description: Filter by service status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by service type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
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
 *         description: Shop services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServicesListResponse'
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
router.get('/shop/:shopId', serviceController.getServicesByShop);

/**
 * @swagger
 * /api/services/uid/{uid}:
 *   get:
 *     tags: [Services]
 *     summary: Get service by unique identifier
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Service unique identifier
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceResponse'
 *       404:
 *         description: Service not found
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
router.get('/uid/:uid', serviceController.getServiceByUid);

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     tags: [Services]
 *     summary: Get service by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceResponse'
 *       404:
 *         description: Service not found
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
router.get('/:id', serviceController.getServiceById);

/**
 * @swagger
 * /api/services/{serviceId}/providers:
 *   get:
 *     tags: [Services]
 *     summary: Get providers offering a specific service
 *     description: Returns shops and barbers/freelancers who offer the specified service, sorted by distance from the provided coordinates.
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude of search location
 *       - in: query
 *         name: long
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude of search location
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [homeBased, shopBased]
 *         description: Filter by provider type
 *     responses:
 *       200:
 *         description: Service providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceProvidersResponse'
 *       400:
 *         description: Latitude and longitude are required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Service not found
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
router.get('/:serviceId/providers', serviceController.getServiceProviders);

/**
 * @swagger
 * /api/services/nearby/services:
 *   get:
 *     tags: [Services]
 *     summary: Get all services from nearby providers within 50km
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude of search location
 *       - in: query
 *         name: long
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude of search location
 *     responses:
 *       200:
 *         description: Nearby services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   minimum: 0
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 *       400:
 *         description: Latitude and longitude are required
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
router.get('/nearby/services', serviceController.getNearbyServices);

// Protected routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/services:
 *   post:
 *     tags: [Services]
 *     summary: Create a new service (shop owners and barbers only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceRequest'
 *     responses:
 *       201:
 *         description: Service created successfully and pending approval
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
 *                   example: Service created successfully and pending approval
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       400:
 *         description: Invalid request data or unauthorized to create services
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
 *         description: Forbidden - not authorized to create services
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
    requirePermission('create_service'),
    validate(serviceSchemas.createService),
    serviceController.createService
);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     tags: [Services]
 *     summary: Update service (service owner or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *       - in: query
 *         name: isResubmission
 *         schema:
 *           type: boolean
 *         description: Whether this is a resubmission after rejection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateServiceRequest'
 *     responses:
 *       200:
 *         description: Service updated successfully
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
 *                   example: Service updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Service'
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
 *         description: Forbidden - not authorized to update this service
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Service not found
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
router.put('/:id',
    requirePermission('update_service'),
    validate(serviceSchemas.updateService),
    serviceController.updateService
);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     tags: [Services]
 *     summary: Delete service (service owner or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service deleted successfully
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
 *                   example: Service deleted successfully
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - not authorized to delete this service
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Service not found
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
    requirePermission('delete_service'),
    serviceController.deleteService
);

/**
 * @swagger
 * /api/services/{id}/approve:
 *   patch:
 *     tags: [Services]
 *     summary: Approve or reject service (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveServiceRequest'
 *     responses:
 *       200:
 *         description: Service approval status updated successfully
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
 *                   example: Service approved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Service'
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
 *         description: Service not found
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
router.patch('/:id/approve',
    authorize('admin'),
    requirePermission('approve_service'),
    validate(serviceSchemas.approveService),
    serviceController.approveRejectService
);

module.exports = router;

// Public routes
router.get('/', serviceController.getAllServices);
router.get('/categories', serviceController.getServiceCategories);
router.get('/popular', serviceController.getPopularServices);
router.get('/search', serviceController.searchServices);
router.get('/barber/:barberId', serviceController.getServicesByBarber);
router.get('/shop/:shopId', serviceController.getServicesByShop);
router.get('/uid/:uid', serviceController.getServiceByUid);
router.get('/:id', serviceController.getServiceById);
router.get('/:serviceId/providers', serviceController.getServiceProviders);
router.get('/nearby/services', serviceController.getNearbyServices);

// Protected routes require authentication
router.use(authenticate);

// Create service (shop owners and barbers can create services)
router.post('/',
    requirePermission('create_service'),
    validate(serviceSchemas.createService),
    serviceController.createService
);

// Update service
router.put('/:id',
    requirePermission('update_service'),
    validate(serviceSchemas.updateService),
    serviceController.updateService
);

// Delete service
router.delete('/:id',
    requirePermission('delete_service'),
    serviceController.deleteService
);

// Admin-only routes
router.patch('/:id/approve',
    authorize('admin'),
    requirePermission('approve_service'),
    validate(serviceSchemas.approveService),
    serviceController.approveRejectService
);

module.exports = router;