// src/api/dashboard/routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const dashboardController = require('./controllers/dashboardController');

// All dashboard routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get dashboard data based on user role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for location-based services (customers only) # optional
 *       - in: query
 *         name: long
 *         schema:
 *           type: number
 *         description: Longitude for location-based services (customers only) # optional
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/CustomerDashboard'
 *                     - $ref: '#/components/schemas/BarberDashboard'
 *                     - $ref: '#/components/schemas/FreelancerDashboard'
 *                     - $ref: '#/components/schemas/ShopOwnerDashboard'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Invalid user role for dashboard access
 *       404:
 *         description: User profile not found
 *       500:
 *         description: Server error
 *     components:
 *       schemas:
 *         CustomerDashboard:
 *           type: object
 *           properties:
 *             bookings:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                 recent:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *                       barberName:
 *                         type: string
 *                       shopName:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       time:
 *                         type: object
 *                         properties:
 *                           hour:
 *                             type: integer
 *                           minute:
 *                             type: integer
 *                       status:
 *                         type: string
 *                         enum: [pending, confirmed, in_progress, completed, cancelled]
 *                       price:
 *                         type: number
 *             notifications:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   message:
 *                     type: string
 *             services:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       uid:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       price:
 *                         type: number
 *                       duration:
 *                         type: integer
 *                       category:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       isPopular:
 *                         type: boolean
 *         BarberDashboard:
 *           type: object
 *           properties:
 *             profile:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 shop:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     rating:
 *                       type: number
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       price:
 *                         type: number
 *                       duration:
 *                         type: integer
 *                       category:
 *                         type: string
 *                 country:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *                     currency:
 *                       type: string
 *             bookings:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     today:
 *                       type: integer
 *                     thisWeek:
 *                       type: integer
 *                     thisMonth:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                 recent:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       time:
 *                         type: object
 *                         properties:
 *                           hour:
 *                             type: integer
 *                           minute:
 *                             type: integer
 *                       status:
 *                         type: string
 *                       price:
 *                         type: number
 *             earnings:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 thisMonth:
 *                   type: number
 *                 thisWeek:
 *                   type: number
 *                 today:
 *                   type: number
 *                 pending:
 *                   type: number
 *             notifications:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   message:
 *                     type: string
 *                   type:
 *                     type: string
 *                   isRead:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *         FreelancerDashboard:
 *           type: object
 *           properties:
 *             profile:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       price:
 *                         type: number
 *                       duration:
 *                         type: integer
 *                       category:
 *                         type: string
 *                 country:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     code:
 *                       type: string
 *                     currency:
 *                       type: string
 *             bookings:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     today:
 *                       type: integer
 *                     thisWeek:
 *                       type: integer
 *                     thisMonth:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                 recent:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       time:
 *                         type: object
 *                         properties:
 *                           hour:
 *                             type: integer
 *                           minute:
 *                             type: integer
 *                       status:
 *                         type: string
 *                       price:
 *                         type: number
 *             earnings:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 thisMonth:
 *                   type: number
 *                 thisWeek:
 *                   type: number
 *                 today:
 *                   type: number
 *                 pending:
 *                   type: number
 *             notifications:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   message:
 *                     type: string
 *                   type:
 *                     type: string
 *                   isRead:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *         ShopOwnerDashboard:
 *           type: object
 *           properties:
 *             bookings:
 *               type: object
 *               properties:
 *                 recent:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       barberName:
 *                         type: string
 *                       shopName:
 *                         type: string
 *                       serviceName:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       time:
 *                         type: object
 *                         properties:
 *                           hour:
 *                             type: integer
 *                           minute:
 *                             type: integer
 *                       status:
 *                         type: string
 *                       price:
 *                         type: number
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *             businessStats:
 *               type: object
 *               properties:
 *                 totalShops:
 *                   type: integer
 *                 totalBarbers:
 *                   type: integer
 *                 totalBookings:
 *                   type: integer
 *                 monthlyRevenue:
 *                   type: number
 *                 yearlyRevenue:
 *                   type: number
 *             notifications:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   message:
 *                     type: string
 *                   type:
 *                     type: string
 *                   isRead:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 */
// Get dashboard data based on user role
router.get('/', dashboardController.getDashboard);

module.exports = router;