// Customer Controller Routes goes here for mobile module
const express = require('express');
const router = express.Router();
const controller = require("../controllers/CustomerController");
const { authenticate } = require('../../../middlewares/auth');

// const multer = require('multer');
// const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

/**
 * @swagger
 * /api/mobile/customers/shops/{areaId}:
 *   get:
 *     tags: [Mobile Customer]
 *     summary: Get shops in specific area
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: areaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Area ID
 *     responses:
 *       200:
 *         description: Shops retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// getShopsInSpecificArea
router.get('/shops/:areaId', controller.getShopsInSpecificArea);

/**
 * @swagger
 * /api/mobile/customers/book-appointment:
 *   post:
 *     tags: [Mobile Customer]
 *     summary: Book an appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               barberId:
 *                 type: string
 *                 description: Barber ID
 *               serviceId:
 *                 type: string
 *                 description: Service ID
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Appointment date
 *               time:
 *                 type: string
 *                 description: Appointment time
 *               notes:
 *                 type: string
 *                 description: Additional notes # optional
 *             required:
 *               - barberId
 *               - serviceId
 *               - date
 *               - time
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Time slot not available
 *       500:
 *         description: Server error
 */
// bookAppointment
router.post('/book-appointment', controller.bookAppointment);

/**
 * @swagger
 * /api/mobile/customers/get-appointments/{id}:
 *   get:
 *     tags: [Mobile Customer]
 *     summary: Get customer appointments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, in_progress, completed, cancelled]
 *         description: Filter by status # optional
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
// fetchAppointments
router.get('/get-appointments/:id', controller.fetchAppointments);

/**
 * @swagger
 * /api/mobile/customers/reschedule-appointment/{id}:
 *   put:
 *     tags: [Mobile Customer]
 *     summary: Reschedule an appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: New appointment date
 *               time:
 *                 type: string
 *                 description: New appointment time
 *               notes:
 *                 type: string
 *                 description: Additional notes # optional
 *             required:
 *               - date
 *               - time
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
 *       400:
 *         description: Validation error or cannot reschedule
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       409:
 *         description: New time slot not available
 *       500:
 *         description: Server error
 */
// rescheduleAppointment
router.put('/reschedule-appointment/:id', controller.rescheduleAppointment);

/**
 * @swagger
 * /api/mobile/customers/cancel-appointment/{id}:
 *   delete:
 *     tags: [Mobile Customer]
 *     summary: Cancel an appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 *       409:
 *         description: Cannot cancel appointment
 *       500:
 *         description: Server error
 */
// cancelAppointment
router.delete('/cancel-appointment/:id', controller.cancelAppointment);

/**
 * @swagger
 * /api/mobile/customers/add-favorite-shop/{userId}/{shopId}:
 *   post:
 *     tags: [Mobile Customer]
 *     summary: Add shop to favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop added to favorites successfully
 *       400:
 *         description: Already in favorites
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or shop not found
 *       500:
 *         description: Server error
 */
// addFavoriteShop
router.post('/add-favorite-shop/:userId/:shopId', controller.addFavoriteShop);

/**
 * @swagger
 * /api/mobile/customers/remove-favorite-shop/{userId}/{shopId}:
 *   delete:
 *     tags: [Mobile Customer]
 *     summary: Remove shop from favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: User or shop not found
 *       500:
 *         description: Server error
 */
// removeFavoriteShop
router.delete('/remove-favorite-shop/:userId/:shopId', controller.removeFavoriteShop);

/**
 * @swagger
 * /api/mobile/customers/add-favorite-barber/{userId}/{barberId}:
 *   post:
 *     tags: [Mobile Customer]
 *     summary: Add barber to favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: barberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     responses:
 *       200:
 *         description: Barber added to favorites successfully
 *       400:
 *         description: Already in favorites
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or barber not found
 *       500:
 *         description: Server error
 */
// addFavoriteBarber
router.post('/add-favorite-barber/:userId/:barberId', controller.addFavoriteBarber);

/**
 * @swagger
 * /api/mobile/customers/remove-favorite-barber/{userId}/{barberId}:
 *   delete:
 *     tags: [Mobile Customer]
 *     summary: Remove barber from favorites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: User or barber not found
 *       500:
 *         description: Server error
 */
// removeFavoriteBarber
router.delete('/remove-favorite-barber/:userId/:barberId', controller.removeFavoriteBarber);

module.exports = router;