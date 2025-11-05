// src/api/customers/routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const { requirePermission } = require('../../middlewares/rbac');
const { validate, customerSchemas,bookingSchemas,paymentSchemas } = require('../../utils/validators');
const customerController = require('./controllers/customerController');
const customerBookingController = require('./controllers/customerBookingController');
// All customer routes require authentication
router.use(authenticate);

// Get customer profile
/**
 * @swagger
 * /api/customers/profile:
 *   get:
 *     tags: [Customer]
 *     summary: Get customer profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.get('/profile', authorize('customer'), customerController.getCustomerProfile);

// Create customer profile
/**
 * @swagger
 * /api/customers:
 *   post:
 *     tags: [Customer]
 *     summary: Create customer profile
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
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John Doe
 *               profileImage:  # optional
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *               countryId:  # optional
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               addresses:  # optional
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       example: 40.7128
 *                     longitude:
 *                       type: number
 *                       example: -74.006
 *                     formattedAddress:  # optional
 *                       type: string
 *                       example: "New York, NY, USA"
 *     responses:
 *       201:
 *         description: Customer profile created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/',
    authorize('customer'),
    validate(customerSchemas.createCustomer),
    customerController.createCustomerProfile
);

// Update customer profile
/**
 * @swagger
 * /api/customers/profile:
 *   put:
 *     tags: [Customer]
 *     summary: Update customer profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:  # optional
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               lastName:  # optional
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               phoneNumber:  # optional
 *                 type: string
 *                 example: "+1234567890"
 *               profileImage:  # optional
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/image.jpg"
 *               stripeCustomerId:  # optional
 *                 type: string
 *                 example: "cus_1234567890"
 *               profile:  # optional
 *                 type: object
 *                 properties:
 *                   phoneNumber:
 *                     type: string
 *                     example: "+1234567890"
 *                   address:
 *                     type: string
 *                     example: "123 Main St"
 *                   city:
 *                     type: string
 *                     example: "New York"
 *                   zipCode:
 *                     type: string
 *                     example: "10001"
 *     responses:
 *       200:
 *         description: Customer profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/profile',
    authorize('customer'),
    validate(customerSchemas.updateCustomer),
    customerController.updateCustomerProfile
);

// Address management
/**
 * @swagger
 * /api/customers/addresses:
 *   post:
 *     tags: [Customer]
 *     summary: Add address to customer profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 example: -74.006
 *               formattedAddress:  # optional
 *                 type: string
 *                 example: "New York, NY, USA"
 *     responses:
 *       201:
 *         description: Address added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/addresses',
    authorize('customer'),
    validate(customerSchemas.createAddress),
    customerController.addAddress
);

/**
 * @swagger
 * /api/customers/addresses/{index}:
 *   put:
 *     tags: [Customer]
 *     summary: Update customer address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address index
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               latitude:  # optional
 *                 type: number
 *                 example: 40.7128
 *               longitude:  # optional
 *                 type: number
 *                 example: -74.006
 *               formattedAddress:  # optional
 *                 type: string
 *                 example: "New York, NY, USA"
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Server error
 */
router.put('/addresses/:index',
    authorize('customer'),
    validate(customerSchemas.updateAddress),
    customerController.updateAddress
);

/**
 * @swagger
 * /api/customers/addresses/{index}:
 *   delete:
 *     tags: [Customer]
 *     summary: Delete customer address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address index
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Server error
 */
router.delete('/addresses/:index',
    authorize('customer'),
    customerController.deleteAddress
);

/**
 * @swagger
 * /api/customers/addresses/{index}/default:
 *   put:
 *     tags: [Customer]
 *     summary: Set default address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address index
 *     responses:
 *       200:
 *         description: Default address set successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Server error
 */
router.put('/addresses/:index/default',
    authorize('customer'),
    customerController.setDefaultAddress
);

// Favorite shops
/**
 * @swagger
 * /api/customers/favorite-shops:
 *   post:
 *     tags: [Customer]
 *     summary: Add shop to favorites
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *             properties:
 *               shopId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Shop added to favorites successfully
 *       400:
 *         description: Shop ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/favorite-shops',
    authorize('customer'),
    customerController.addFavoriteShop
);

/**
 * @swagger
 * /api/customers/favorite-shops/{shopId}:
 *   delete:
 *     tags: [Customer]
 *     summary: Remove shop from favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop removed from favorites successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found in favorites
 *       500:
 *         description: Server error
 */
router.delete('/favorite-shops/:shopId',
    authorize('customer'),
    customerController.removeFavoriteShop
);

// Favorite barbers
/**
 * @swagger
 * /api/customers/favorite-barbers:
 *   post:
 *     tags: [Customer]
 *     summary: Add barber to favorites
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barberId
 *             properties:
 *               barberId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Barber added to favorites successfully
 *       400:
 *         description: Barber ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/favorite-barbers',
    authorize('customer'),
    customerController.addFavoriteBarber
);

/**
 * @swagger
 * /api/customers/favorite-barbers/{barberId}:
 *   delete:
 *     tags: [Customer]
 *     summary: Remove barber from favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     responses:
 *       200:
 *         description: Barber removed from favorites successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Barber not found in favorites
 *       500:
 *         description: Server error
 */
router.delete('/favorite-barbers/:barberId',
    authorize('customer'),
    customerController.removeFavoriteBarber
);

// Search shops or freelancers by service and location (within 10km radius)
// Supports both shopBased (returns shops) and homeBased (returns freelancers)
/**
 * @swagger
 * /api/customers/search-shops:
 *   get:
 *     tags: [Customer]
 *     summary: Search shops/freelancers by service and location
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
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
 *         name: type
 *         schema:
 *           type: string
 *         description: Service type (shopBased or homeBased)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Service ID, latitude, and longitude are required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/search-shops',
    authorize('customer'),
    customerController.searchShopsNearby
);

// Admin routes
/**
 * @swagger
 * /api/customers:
 *   get:
 *     tags: [Customer]
 *     summary: Get all customers (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       500:
 *         description: Server error
 */
router.get('/',
    authorize('admin'),
    requirePermission('view_users'),
    customerController.getCustomers
);

/**
 * @swagger
 * /api/customers/uid/{uid}:
 *   get:
 *     tags: [Customer]
 *     summary: Get customer by UID (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer UID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.get('/uid/:uid',
    authorize('admin'),
    requirePermission('view_user_details'),
    customerController.getCustomerByUid
);

// Booking routes with validation - MUST be before parameterized routes
/**
 * @swagger
 * /api/customers/bookings:
 *   get:
 *     tags: [Customer]
 *     summary: Get my bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, in_progress, completed, cancelled]
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/bookings', authorize('customer'), customerBookingController.getMyBookings);

/**
 * @swagger
 * /api/customers/bookings/upcoming:
 *   get:
 *     tags: [Customer]
 *     summary: Get upcoming bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Upcoming bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/bookings/upcoming', authorize('customer'), customerBookingController.getUpcomingBookings);

/**
 * @swagger
 * /api/customers/bookings/past:
 *   get:
 *     tags: [Customer]
 *     summary: Get past bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Past bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/bookings/past', authorize('customer'), customerBookingController.getPastBookings);

/**
 * @swagger
 * /api/customers/bookings/{id}:
 *   get:
 *     tags: [Customer]
 *     summary: Get booking details
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
 *         description: Booking details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.get('/bookings/:id', authorize('customer'), customerBookingController.getBookingDetails);

/**
 * @swagger
 * /api/customers/bookings/available-slots:
 *   get:
 *     tags: [Customer]
 *     summary: Get available time slots
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: barberId
 *         schema:
 *           type: string
 *         description: Barber ID
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: Service ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for slots (YYYY-MM-DD)
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *       400:
 *         description: Bad request - missing required parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/bookings/available-slots', authorize('customer'), customerBookingController.getAvailableTimeSlots);

/**
 * @swagger
 * /api/customers/shop-availability/{shopId}:
 *   get:
 *     tags: [Customer]
 *     summary: Get shop availability
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
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for availability (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Shop availability retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
router.get('/shop-availability/:shopId', authorize('customer'), customerBookingController.getShopAvailability);

router.get('/shop-availability/:shopId', authorize('customer'), customerBookingController.getShopAvailability);

// Create booking with validation
/**
 * @swagger
 * /api/customers/bookings:
 *   post:
 *     tags: [Customer]
 *     summary: Create a new booking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Customer ID (MongoDB ObjectId)
 *               barberId:
 *                 type: string
 *                 description: Barber/Shop Owner/Freelancer ID (MongoDB ObjectId)
 *               serviceId:
 *                 type: string
 *                 description: Service ID (MongoDB ObjectId)
 *               serviceType:
 *                 type: string
 *                 enum: [shopBased, homeBased]
 *               countryId:
 *                 type: string
 *                 description: Country ID (MongoDB ObjectId) # optional
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 description: Booking date (YYYY-MM-DD)
 *               bookingTime:
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
 *                 required:
 *                   - hour
 *                   - minute
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *                 # optional
 *               isHomeService:
 *                 type: boolean
 *                 default: false
 *                 # optional
 *               addressIndex:
 *                 type: integer
 *                 minimum: 0
 *                 # optional
 *               customAddress:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   formattedAddress:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   country:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                 # optional
 *             required:
 *               - customerId
 *               - barberId
 *               - serviceId
 *               - serviceType
 *               - bookingDate
 *               - bookingTime
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Time slot not available
 *       500:
 *         description: Server error
 */
router.post('/bookings',
    authorize('customer'),
    validate(bookingSchemas.createBooking),
    customerBookingController.createBooking
);

// Cancel booking with validation
/**
 * @swagger
 * /api/customers/bookings/{id}/cancel:
 *   post:
 *     tags: [Customer]
 *     summary: Cancel a booking
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Cancellation reason # optional
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Validation error or booking cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.post('/bookings/:id/cancel',
    authorize('customer'),
    validate(paymentSchemas.cancelBooking),
    customerBookingController.cancelBooking
);

// Rate booking with validation
/**
 * @swagger
 * /api/customers/bookings/{id}/rate:
 *   post:
 *     tags: [Customer]
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
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5
 *               review:
 *                 type: string
 *                 maxLength: 500
 *                 description: Review text # optional
 *             required:
 *               - rating
 *     responses:
 *       200:
 *         description: Booking rated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Booking already rated
 *       500:
 *         description: Server error
 */
router.post('/bookings/:id/rate',
    authorize('customer'),
    validate(bookingSchemas.rateBooking),
    customerBookingController.rateBooking
);

// Payment routes with validation
/**
 * @swagger
 * /api/customers/bookings/{id}/pay/cash:
 *   post:
 *     tags: [Customer]
 *     summary: Process cash payment for booking
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
 *         description: Cash payment processed successfully
 *       400:
 *         description: Payment processing failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Payment already processed
 *       500:
 *         description: Server error
 */
router.post('/bookings/:id/pay/cash',
    authorize('customer'),
    validate(paymentSchemas.processCashPayment),
    customerBookingController.processCashPayment
);

/**
 * @swagger
 * /api/customers/bookings/{id}/pay/card/intent:
 *   post:
 *     tags: [Customer]
 *     summary: Create payment intent for card payment
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
 *         description: Payment intent created successfully
 *       400:
 *         description: Failed to create payment intent
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Payment already processed
 *       500:
 *         description: Server error
 */
router.post('/bookings/:id/pay/card/intent',
    authorize('customer'),
    validate(paymentSchemas.createPaymentIntent),
    customerBookingController.createCardPaymentIntent
);

/**
 * @swagger
 * /api/customers/bookings/{id}/pay/card/confirm:
 *   post:
 *     tags: [Customer]
 *     summary: Confirm card payment
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
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID
 *               bookingId:
 *                 type: string
 *                 description: Booking ID (MongoDB ObjectId)
 *             required:
 *               - paymentIntentId
 *               - bookingId
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Payment confirmation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Payment already processed
 *       500:
 *         description: Server error
 */
router.post('/bookings/:id/pay/card/confirm',
    authorize('customer'),
    validate(paymentSchemas.confirmPayment),
    customerBookingController.confirmCardPayment
);

// Parameterized routes - MUST be after specific routes
/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     tags: [Customer]
 *     summary: Get customer by ID (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
router.get('/:id',
    authorize('admin'),
    requirePermission('view_user_details'),
    customerController.getCustomerById
);

module.exports = router;