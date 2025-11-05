// src/api/barbers/routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { requirePermission } = require('../../middlewares/rbac');
const { validate, barberSchemas } = require('../../utils/validators');
const barberController = require('./controllers/barberController');

// Public routes
/**
 * @swagger
 * /api/barbers:
 *   get:
 *     tags: [Barber]
 *     summary: Get all barbers with pagination and filters
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: employmentType
 *         schema:
 *           type: string
 *         description: Filter by employment type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Filter by shop ID
 *     responses:
 *       200:
 *         description: Barbers retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', barberController.getBarbers);
/**
 * @swagger
 * /api/barbers/uid/{uid}:
 *   get:
 *     tags: [Barber]
 *     summary: Get barber by UID
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber UID
 *     responses:
 *       200:
 *         description: Barber retrieved successfully
 *       404:
 *         description: Barber not found
 *       500:
 *         description: Server error
 */
router.get('/uid/:uid', barberController.getBarberByUid);
/**
 * @swagger
 * /api/barbers/nearby:
 *   get:
 *     tags: [Barber]
 *     summary: Get nearby barbers
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in km (default 10)
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *         description: Filter by service type
 *     responses:
 *       200:
 *         description: Nearby barbers retrieved successfully
 *       400:
 *         description: Latitude and longitude are required
 *       500:
 *         description: Server error
 */
router.get('/nearby', barberController.getNearbyBarbers);

// Protected routes
router.use(authenticate);

// Respond to assigned booking (accept/reject)
/**
 * @swagger
 * /api/barbers/bookings/{bookingId}/respond:
 *   post:
 *     tags: [Barber]
 *     summary: Respond to assigned booking
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
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [accept, reject]
 *                 example: accept
 *               rejectReason:  # optional
 *                 type: string
 *                 example: "Not available at that time"
 *     responses:
 *       200:
 *         description: Response recorded successfully
 *       400:
 *         description: Invalid response or missing reject reason
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not assigned to this booking
 *       500:
 *         description: Server error
 */
router.post('/bookings/:bookingId/respond',
    authorize(['barber', 'freelancer']),
    barberController.respondToBookingAssignment
);

// Reschedule assigned booking
/**
 * @swagger
 * /api/barbers/bookings/{bookingId}/reschedule:
 *   post:
 *     tags: [Barber]
 *     summary: Reschedule assigned booking
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
 *         description: Booking rescheduled successfully
 *       400:
 *         description: Booking cannot be rescheduled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not assigned to this booking
 *       500:
 *         description: Server error
 */
router.post('/bookings/:bookingId/reschedule',
    authorize(['barber', 'freelancer']),
    barberController.rescheduleBooking
);

// Get barber bookings
/**
 * @swagger
 * /api/barbers/bookings:
 *   get:
 *     tags: [Barber]
 *     summary: Get barber bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by booking status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/bookings',
    authorize(['barber', 'freelancer']),
    barberController.getBarberBookings
);

// Shop-specific routes
/**
 * @swagger
 * /api/barbers/shop/{shopId}:
 *   get:
 *     tags: [Barber]
 *     summary: Get barbers by shop
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
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: employmentType
 *         schema:
 *           type: string
 *         description: Filter by employment type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Barbers retrieved successfully
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
router.get('/shop/:shopId', barberController.getBarbersByShop);

// Generic barber routes (must come last)
/**
 * @swagger
 * /api/barbers/{id}:
 *   get:
 *     tags: [Barber]
 *     summary: Get barber by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     responses:
 *       200:
 *         description: Barber retrieved successfully
 *       404:
 *         description: Barber not found
 *       500:
 *         description: Server error
 */
router.get('/:id', barberController.getBarberById);

// Get barber/freelancer profile (for authenticated barber or freelancer)
/**
 * @swagger
 * /api/barbers/profile/me:
 *   get:
 *     tags: [Barber]
 *     summary: Get barber/freelancer profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
router.get('/profile/me', authorize(['barber', 'freelancer']), barberController.getBarberProfile);

// Check barber's linked shop
/**
 * @swagger
 * /api/barbers/check/shop:
 *   get:
 *     tags: [Barber]
 *     summary: Check barber's linked shop
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shop info retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
router.get('/check/shop', authorize('barber'), barberController.getBarberShop);

// Create barber profile (requires either barber role or admin role)
/**
 * @swagger
 * /api/barbers:
 *   post:
 *     tags: [Barber]
 *     summary: Create barber profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - displayName
 *               - employmentType
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: John Doe
 *               bio:  # optional
 *                 type: string
 *                 example: Experienced barber with 5 years in the field
 *               employmentType:
 *                 type: string
 *                 enum: [fullTime, partTime, freelance]
 *                 example: fullTime
 *               yearsOfExperience:  # optional
 *                 type: integer
 *                 example: 5
 *               specialties:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["haircut", "shave"]
 *               languages:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["English", "Spanish"]
 *               shopId:  # optional
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               location:  # optional
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "123 Main St"
 *                   latitude:
 *                     type: number
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     example: -74.006
 *                   formattedAddress:
 *                     type: string
 *                     example: "New York, NY, USA"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   postalCode:
 *                     type: string
 *                     example: "10001"
 *               availability:  # optional
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                       example: 1
 *                     startTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 9
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     endTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 18
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *               profileImage:  # optional
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *               servicesOffered:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       201:
 *         description: Barber profile created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/',
    authorize('barber', 'admin', 'shop_owner'),
    validate(barberSchemas.createBarber),
    barberController.createBarberProfile
);

// Update barber profile (for authenticated barber)
/**
 * @swagger
 * /api/barbers/profile:
 *   put:
 *     tags: [Barber]
 *     summary: Update barber profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:  # optional
 *                 type: string
 *                 example: John Doe
 *               bio:  # optional
 *                 type: string
 *                 example: Experienced barber with 5 years in the field
 *               employmentType:  # optional
 *                 type: string
 *                 enum: [fullTime, partTime, freelance]
 *                 example: fullTime
 *               yearsOfExperience:  # optional
 *                 type: integer
 *                 example: 5
 *               specialties:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["haircut", "shave"]
 *               languages:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["English", "Spanish"]
 *               shopId:  # optional
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               status:  # optional
 *                 type: string
 *                 enum: [pending, active, inactive]
 *                 example: active
 *               location:  # optional
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "123 Main St"
 *                   latitude:
 *                     type: number
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     example: -74.006
 *                   formattedAddress:
 *                     type: string
 *                     example: "New York, NY, USA"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   postalCode:
 *                     type: string
 *                     example: "10001"
 *               availability:  # optional
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                       example: 1
 *                     startTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 9
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     endTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 18
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *               profileImage:  # optional
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *               servicesOffered:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011"]
 *               rejectionReason:  # optional
 *                 type: string
 *                 example: "Incomplete profile"
 *     responses:
 *       200:
 *         description: Barber profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put('/profile',
    authorize('barber','freelancer'),
    validate(barberSchemas.updateBarber),
    barberController.updateBarberProfile
);

// Routes for both barber and admin
/**
 * @swagger
 * /api/barbers/{id}/services:
 *   post:
 *     tags: [Barber]
 *     summary: Add service to barber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *             properties:
 *               serviceId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Service added successfully
 *       400:
 *         description: Service ID is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/:id/services',
    requirePermission('update_barber'),
    barberController.addService
);

/**
 * @swagger
 * /api/barbers/{id}/services/{serviceId}:
 *   delete:
 *     tags: [Barber]
 *     summary: Remove service from barber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/services/:serviceId',
    requirePermission('update_barber'),
    barberController.removeService
);

/**
 * @swagger
 * /api/barbers/{id}/availability:
 *   put:
 *     tags: [Barber]
 *     summary: Update barber availability
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - availability
 *             properties:
 *               availability:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                       example: 1
 *                     startTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 9
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     endTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 18
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       400:
 *         description: Invalid availability array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.put('/:id/availability',
    requirePermission('update_barber'),
    barberController.updateAvailability
);

/**
 * @swagger
 * /api/barbers/{id}/portfolio:
 *   post:
 *     tags: [Barber]
 *     summary: Add portfolio item to barber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/portfolio.jpg"
 *               description:  # optional
 *                 type: string
 *                 example: "Great haircut style"
 *               title:  # optional
 *                 type: string
 *                 example: "Modern Cut"
 *     responses:
 *       200:
 *         description: Portfolio item added successfully
 *       400:
 *         description: Image URL is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post('/:id/portfolio',
    requirePermission('update_barber'),
    barberController.addPortfolioItem
);

/**
 * @swagger
 * /api/barbers/{id}/portfolio/{itemIndex}:
 *   delete:
 *     tags: [Barber]
 *     summary: Remove portfolio item from barber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *       - in: path
 *         name: itemIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Portfolio item index
 *     responses:
 *       200:
 *         description: Portfolio item removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */
router.delete('/:id/portfolio/:itemIndex',
    requirePermission('update_barber'),
    barberController.removePortfolioItem
);

// Admin only routes
/**
 * @swagger
 * /api/barbers/{id}:
 *   put:
 *     tags: [Barber]
 *     summary: Update barber (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:  # optional
 *                 type: string
 *                 example: John Doe
 *               bio:  # optional
 *                 type: string
 *                 example: Experienced barber with 5 years in the field
 *               employmentType:  # optional
 *                 type: string
 *                 enum: [fullTime, partTime, freelance]
 *                 example: fullTime
 *               yearsOfExperience:  # optional
 *                 type: integer
 *                 example: 5
 *               specialties:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["haircut", "shave"]
 *               languages:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["English", "Spanish"]
 *               shopId:  # optional
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               status:  # optional
 *                 type: string
 *                 enum: [pending, active, inactive]
 *                 example: active
 *               location:  # optional
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "123 Main St"
 *                   latitude:
 *                     type: number
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     example: -74.006
 *                   formattedAddress:
 *                     type: string
 *                     example: "New York, NY, USA"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   state:
 *                     type: string
 *                     example: "NY"
 *                   country:
 *                     type: string
 *                     example: "USA"
 *                   postalCode:
 *                     type: string
 *                     example: "10001"
 *               availability:  # optional
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *                       example: 1
 *                     startTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 9
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     endTime:
 *                       type: object
 *                       properties:
 *                         hour:
 *                           type: integer
 *                           example: 18
 *                         minute:
 *                           type: integer
 *                           example: 0
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *               profileImage:  # optional
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *               servicesOffered:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011"]
 *               rejectionReason:  # optional
 *                 type: string
 *                 example: "Incomplete profile"
 *     responses:
 *       200:
 *         description: Barber updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Barber not found
 *       500:
 *         description: Server error
 */
router.put('/:id',
    authorize('admin'),
    validate(barberSchemas.updateBarber),
    barberController.updateBarber
);

/**
 * @swagger
 * /api/barbers/{id}:
 *   delete:
 *     tags: [Barber]
 *     summary: Delete barber (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     responses:
 *       200:
 *         description: Barber deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Barber not found
 *       500:
 *         description: Server error
 */
router.delete('/:id',
    authorize('admin'),
    barberController.deleteBarber
);

module.exports = router;