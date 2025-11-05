const express = require('express');
const router = express.Router();
const { getAvailableSlots } = require('./controllers/availableSlotsController');

/**
 * @swagger
 * components:
 *   schemas:
 *     TimeSlot:
 *       type: object
 *       properties:
 *         hour:
 *           type: integer
 *           minimum: 0
 *           maximum: 23
 *           description: Hour of the time slot
 *         minute:
 *           type: integer
 *           minimum: 0
 *           maximum: 59
 *           description: Minute of the time slot
 *       required:
 *         - hour
 *         - minute
 *     AvailableSlotsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         slots:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TimeSlot'
 *           description: Array of available time slots
 */

/**
 * @swagger
 * /api/providers/{providerId}/available-slots:
 *   get:
 *     tags: [Providers]
 *     summary: Get available time slots for a provider on a specific date
 *     description: Returns available 30-minute time slots for a barber, freelancer, or shop owner on the specified date. Provider can be identified by their ID from Barber, Freelancer, or ShopOwner collections.
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider ID (barber, freelancer, or shop owner)
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *         example: 2024-01-15
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AvailableSlotsResponse'
 *             examples:
 *               available_slots:
 *                 summary: Available slots example
 *                 value:
 *                   success: true
 *                   slots:
 *                     - hour: 9
 *                       minute: 0
 *                     - hour: 9
 *                       minute: 30
 *                     - hour: 10
 *                       minute: 0
 *                     - hour: 14
 *                       minute: 30
 *               no_slots:
 *                 summary: No available slots
 *                 value:
 *                   success: true
 *                   slots: []
 *       400:
 *         description: Date parameter is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Date is required
 *       404:
 *         description: Provider or shop not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     provider_not_found:
 *                       value: Provider not found
 *                     shop_not_found:
 *                       value: Shop not found for this shop owner
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:providerId/available-slots', getAvailableSlots);

module.exports = router;
