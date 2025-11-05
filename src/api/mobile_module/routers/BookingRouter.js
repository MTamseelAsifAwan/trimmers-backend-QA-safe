const express = require('express');
const router = express.Router();

const controller = require("../controllers/BookingController");
const { authenticate } = require('../../../middlewares/auth');

router.use(authenticate);

/**
 * @swagger
 * /api/mobile/bookings/update-status/{id}:
 *   put:
 *     tags: [Mobile Booking]
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, in_progress, completed, cancelled, noShow, rejected]
 *                 description: New booking status
 *               reason:
 *                 type: string
 *                 description: Reason for status change # optional
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.put('/update-status/:id', controller.updateStatus);

/**
 * @swagger
 * /api/mobile/bookings/all:
 *   delete:
 *     tags: [Mobile Booking]
 *     summary: Remove all bookings (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All bookings removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       500:
 *         description: Server error
 */
router.delete('/all', controller.removeAllBookings);

module.exports = router;