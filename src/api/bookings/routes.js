// src/api/bookings/routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { requirePermission } = require('../../middlewares/rbac');
const { validate, bookingSchemas } = require('../../utils/validators');
const bookingController = require('./controllers/bookingController');
// Barber: get all bookings for authenticated barber

// Freelancer: get all bookings for authenticated freelancer

// Get available time slots (public access)
/**
 * @swagger
 * /api/bookings/available-slots:
 *   get:
 *     tags: [Booking]
 *     summary: Get available time slots for a provider
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *         description: Provider ID (barber or freelancer)
 *       - in: query
 *         name: barberId
 *         schema:
 *           type: string
 *         description: Barber ID (legacy support)
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Available time slots retrieved successfully
 *       400:
 *         description: Provider ID, date, and service ID are required
 *       500:
 *         description: Server error
 */
router.get('/available-slots', bookingController.getAvailableTimeSlots);
// Get available time slots for a shop (public access)
/**
 * @swagger
 * /api/bookings/shop-available-slots:
 *   get:
 *     tags: [Booking]
 *     summary: Get available time slots for a shop
 *     parameters:
 *       - in: query
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Shop available time slots retrieved successfully
 *       400:
 *         description: Shop ID, date, and service ID are required
 *       500:
 *         description: Server error
 */
router.get('/shop-available-slots', bookingController.getShopAvailableTimeSlots);

// Customer booking routes (public access - no authentication required)
router.put('/customer/:id',
    validate(bookingSchemas.updateBookingDetails),
    bookingController.updateMyBooking
);

router.delete('/customer/:id',
    validate(bookingSchemas.cancelBooking),
    bookingController.cancelMyBooking
);

// All other booking routes require authentication
router.use(authenticate);

// Barber: get all bookings for authenticated barber
/**
 * @swagger
 * /api/bookings/barber/my:
 *   get:
 *     tags: [Booking]
 *     summary: Get authenticated barber's bookings
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
 *         description: Barber bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/barber/my', requirePermission('view_bookings'), bookingController.getMyBarberBookings);

// Freelancer: get all bookings for authenticated freelancer
/**
 * @swagger
 * /api/bookings/freelancer/my:
 *   get:
 *     tags: [Booking]
 *     summary: Get authenticated freelancer's bookings
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
 *         description: Freelancer bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/freelancer/my', requirePermission('view_bookings'), bookingController.getMyFreelancerBookings);

// Create a new booking
/**
 * @swagger
 * /api/bookings:
 *   post:
 *     tags: [Booking]
 *     summary: Create a new booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - barberId
 *               - serviceId
 *               - serviceType
 *               - bookingDate
 *               - bookingTime
 *             properties:
 *               customerId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               barberId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               serviceId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               serviceType:
 *                 type: string
 *                 enum: [shopBased, homeBased]
 *                 example: shopBased
 *               countryId:  # optional
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-15"
 *               bookingTime:
 *                 type: object
 *                 required:
 *                   - hour
 *                   - minute
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                     example: 14
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *                     example: 30
 *               notes:  # optional
 *                 type: string
 *                 maxLength: 500
 *                 example: "Please be on time"
 *               isHomeService:  # optional
 *                 type: boolean
 *                 example: false
 *               addressIndex:  # optional
 *                 type: integer
 *                 minimum: 0
 *                 example: 0
 *               customAddress:  # optional
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
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', 
    validate(bookingSchemas.createBooking), 
    bookingController.createBooking
);

// Get booking by ID or UID
/**
 * @swagger
 * /api/bookings/uid/{uid}:
 *   get:
 *     tags: [Booking]
 *     summary: Get booking by UID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking UID
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.get('/uid/:uid', bookingController.getBookingByUid);
/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     tags: [Booking]
 *     summary: Get booking by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.get('/:id', bookingController.getBookingById);

// Get authenticated user's bookings (works for all user types)
/**
 * @swagger
 * /api/bookings/customer/me:
 *   get:
 *     tags: [Booking]
 *     summary: Get authenticated user's bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/customer/me', bookingController.getMyBookings);

// Barber routes
/**
 * @swagger
 * /api/bookings/barber/{barberId}:
 *   get:
 *     tags: [Booking]
 *     summary: Get bookings for a specific barber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
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
 *         description: Barber bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/barber/:barberId', 
    requirePermission('view_bookings'),
    bookingController.getBarberBookings
);

// Shop owner: get all bookings for all owned shops
/**
 * @swagger
 * /api/bookings/shop/my:
 *   get:
 *     tags: [Booking]
 *     summary: Get authenticated shop owner's bookings
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
 *         description: Shop bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/shop/my', requirePermission('view_bookings'), bookingController.getMyShopBookings);

// Update customer booking by shop owner (only if pending)
/**
 * @swagger
 * /api/bookings/shop-owner/{id}:
 *   put:
 *     tags: [Booking]
 *     summary: Update customer booking details by shop owner (only if pending)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-15"
 *               bookingTime:
 *                 type: object
 *                 properties:
 *                   hour:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 23
 *                     example: 14
 *                   minute:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 59
 *                     example: 30
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Please be on time"
 *     responses:
 *       200:
 *         description: Customer booking updated successfully
 *       400:
 *         description: Validation error or booking not in pending state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - shop owner only or not shop owner for this booking
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.put('/shop-owner/:id',
    authorize('shop_owner'),
    validate(bookingSchemas.updateBookingDetails),
    bookingController.updateCustomerBookingByShopOwner
);

// Shop routes
/**
 * @swagger
 * /api/bookings/shop/{shopId}:
 *   get:
 *     tags: [Booking]
 *     summary: Get bookings for a specific shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
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
 *         description: Shop bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/shop/:shopId', 
    requirePermission('view_bookings'),
    bookingController.getShopBookings
);

// Update booking status
/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     tags: [Booking]
 *     summary: Update booking status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, assigned, confirmed, completed, cancelled, noShow, rejected, reassigned]
 *                 example: confirmed
 *               reason:  # optional
 *                 type: string
 *                 maxLength: 500
 *                 example: "Customer confirmed"
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', 
    validate(bookingSchemas.updateStatus),
    bookingController.updateBookingStatus
);

// Approve booking (shop owner)
/**
 * @swagger
 * /api/bookings/{id}/approve:
 *   post:
 *     tags: [Booking]
 *     summary: Approve booking (shop owner)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - shop owner only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/:id/approve',
    authorize('shop_owner'),
    // requirePermission('manage_bookings'), // Temporarily disabled for testing
    bookingController.approveBooking
);

// Reassign booking (shop owner)
/**
 * @swagger
 * /api/bookings/{id}/reassign:
 *   post:
 *     tags: [Booking]
 *     summary: Reassign booking to another barber
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - newBarberId
 *               - shopOwnerId
 *             properties:
 *               newBarberId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               shopOwnerId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Booking reassigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - shop owner only
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reassign',
    authorize('shop_owner'),
    // requirePermission('manage_bookings'), // Temporarily disabled for testing
    validate(bookingSchemas.reassignBooking),
    bookingController.reassignBooking
);

// Get pending booking requests for current provider
/**
 * @swagger
 * /api/bookings/requests/pending:
 *   get:
 *     tags: [Booking]
 *     summary: Get pending booking requests for current provider
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending booking requests retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/requests/pending',
    // requirePermission('manage_bookings'), // Temporarily disabled for testing
    bookingController.getPendingBookingRequests
);

// Accept booking request (barber/freelancer)
/**
 * @swagger
 * /api/bookings/{id}/accept:
 *   post:
 *     tags: [Booking]
 *     summary: Accept booking request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:  # optional
 *                 type: string
 *                 maxLength: 500
 *                 example: "Happy to accept this booking"
 *     responses:
 *       200:
 *         description: Booking request accepted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/:id/accept',
    // requirePermission('manage_bookings'), // Temporarily disabled for testing
    validate(bookingSchemas.acceptBookingRequest),
    bookingController.acceptBookingRequest
);

// Reject booking request (barber/freelancer)
/**
 * @swagger
 * /api/bookings/{id}/reject:
 *   post:
 *     tags: [Booking]
 *     summary: Reject booking request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:  # optional
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 example: "Not available at that time"
 *     responses:
 *       200:
 *         description: Booking request rejected successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/:id/reject',
    // requirePermission('manage_bookings'), // Temporarily disabled for testing
    validate(bookingSchemas.rejectBookingRequest),
    bookingController.rejectBookingRequest
);

// Rate and review a booking
/**
 * @swagger
 * /api/bookings/{id}/rate:
 *   post:
 *     tags: [Booking]
 *     summary: Rate and review a booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               review:  # optional
 *                 type: string
 *                 maxLength: 500
 *                 example: "Excellent service!"
 *     responses:
 *       200:
 *         description: Booking rated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/:id/rate', 
    validate(bookingSchemas.rateBooking),
    bookingController.rateBooking
);

// Get all bookings for shops owned by the authenticated shop owner
// (This is a duplicate route, already defined above)

// Get bookings by role (admin only)
/**
 * @swagger
 * /api/bookings/role/{role}:
 *   get:
 *     tags: [Booking]
 *     summary: Get bookings by user role (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *         description: User role (customer, barber, shop_owner, freelancer)
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
 *       403:
 *         description: Forbidden - admin only
 *       500:
 *         description: Server error
 */
router.get('/role/:role', 
    authorize('admin'),
    bookingController.getBookingsByRole
);

// Process payment for a booking
/**
 * @swagger
 * /api/bookings/{id}/payment:
 *   post:
 *     tags: [Booking]
 *     summary: Process payment for a booking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, cash, wallet]
 *                 example: card
 *               stripePaymentMethodId:  # optional
 *                 type: string
 *                 example: "pm_1234567890"
 *               paymentDetails:  # optional
 *                 type: object
 *                 example: {}
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/:id/payment', 
    validate(bookingSchemas.processPayment),
    bookingController.processPayment
);

module.exports = router;