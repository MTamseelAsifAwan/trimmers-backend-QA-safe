const express = require('express');
const router = express.Router();

const controller = require("../controllers/LocationsController");
const { authenticate } = require('../../../middlewares/auth');

// router.use(authenticate);

/**
 * @swagger
 * /api/mobile/locations/countries:
 *   get:
 *     tags: [Mobile Location]
 *     summary: Get all countries
 *     responses:
 *       200:
 *         description: Countries retrieved successfully
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
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       currency:
 *                         type: string
 *                       flag:
 *                         type: string
 *       500:
 *         description: Server error
 */
// getCountries
router.get('/countries', controller.getCountries);

/**
 * @swagger
 * /api/mobile/locations/cities/{countryId}:
 *   get:
 *     tags: [Mobile Location]
 *     summary: Get cities by country
 *     parameters:
 *       - in: path
 *         name: countryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
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
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       countryId:
 *                         type: string
 *       404:
 *         description: Country not found
 *       500:
 *         description: Server error
 */
// getCitiesByCountry
router.get('/cities/:countryId', controller.getCitiesByCountry);

/**
 * @swagger
 * /api/mobile/locations/areas/{cityId}:
 *   get:
 *     tags: [Mobile Location]
 *     summary: Get areas by city
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *         description: City ID
 *     responses:
 *       200:
 *         description: Areas retrieved successfully
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
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       cityId:
 *                         type: string
 *       404:
 *         description: City not found
 *       500:
 *         description: Server error
 */
// getAreasByCity
router.get('/areas/:cityId', controller.getAreasByCity);

module.exports = router;