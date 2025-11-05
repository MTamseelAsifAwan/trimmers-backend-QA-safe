 
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middlewares/auth');
const freelancerController = require('./controllers/freelancerController');

/**
 * @swagger
 * /api/freelancers:
 *   post:
 *     tags: [Freelancer]
 *     summary: Create a new freelancer (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Freelancer email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password (minimum 8 characters)
 *               firstName:
 *                 type: string
 *                 description: First name
 *               lastName:
 *                 type: string
 *                 description: Last name
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number
 *               address:
 *                 type: string
 *                 description: Address
 *               city:
 *                 type: string
 *                 description: City
 *               zipCode:
 *                 type: string
 *                 description: ZIP/Postal code
 *               countryId:
 *                 type: string
 *                 description: Country ID (MongoDB ObjectId)
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of service IDs
 *               schedule:
 *                 type: string
 *                 description: Schedule as JSON string
 *               serviceType:
 *                 type: string
 *                 enum: [homeBased, shopBased, both]
 *                 description: Type of service offered
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   formattedAddress:
 *                     type: string
 *                 required:
 *                   - latitude
 *                   - longitude
 *                   - formattedAddress
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file # optional
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - phoneNumber
 *               - address
 *               - city
 *               - zipCode
 *               - countryId
 *               - services
 *               - schedule
 *               - serviceType
 *               - location
 *     responses:
 *       201:
 *         description: Freelancer created successfully
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
 *                   example: "Freelancer created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Freelancer'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       500:
 *         description: Server error
 */
// Create a new freelancer
router.post('/',
    authenticate,
    authorize('admin'),
    freelancerController.createFreelancer
);

/**
 * @swagger
 * /api/freelancers/profile:
 *   get:
 *     tags: [Freelancer]
 *     summary: Get freelancer profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Freelancer profile retrieved successfully
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
 *                   example: "Freelancer profile retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Freelancer'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - freelancer only
 *       404:
 *         description: Freelancer profile not found
 *       500:
 *         description: Server error
 */
// Get freelancer profile (for authenticated freelancer)
router.get('/profile',
    authenticate,
    authorize('freelancer'),
    freelancerController.getFreelancerProfile
);

/**
 * @swagger
 * /api/freelancers/profile:
 *   put:
 *     tags: [Freelancer]
 *     summary: Update freelancer profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 # optional
 *               lastName:
 *                 type: string
 *                 # optional
 *               phoneNumber:
 *                 type: string
 *                 # optional
 *               address:
 *                 type: string
 *                 # optional
 *               city:
 *                 type: string
 *                 # optional
 *               zipCode:
 *                 type: string
 *                 # optional
 *               countryId:
 *                 type: string
 *                 description: Country ID (MongoDB ObjectId) # optional
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of service IDs # optional
 *               schedule:
 *                 type: string
 *                 description: Schedule as JSON string # optional
 *               serviceType:
 *                 type: string
 *                 enum: [homeBased, shopBased, both]
 *                 # optional
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   formattedAddress:
 *                     type: string
 *                 # optional
 *               profileImage:
 *                 type: string
 *                 # optional
 *               schedules:
 *                 type: object
 *                 description: Schedule object (mapped to schedule field) # optional
 *     responses:
 *       200:
 *         description: Freelancer profile updated successfully
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
 *                   example: "Freelancer profile updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Freelancer'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - freelancer only
 *       404:
 *         description: Freelancer profile not found
 *       500:
 *         description: Server error
 *     components:
 *       schemas:
 *         Freelancer:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: Freelancer ID
 *             email:
 *               type: string
 *               format: email
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             phoneNumber:
 *               type: string
 *             address:
 *               type: string
 *             city:
 *               type: string
 *             zipCode:
 *               type: string
 *             countryId:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 code:
 *                   type: string
 *                 currency:
 *                   type: string
 *             services:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   price:
 *                     type: number
 *                   duration:
 *                     type: integer
 *                   category:
 *                     type: string
 *             schedule:
 *               type: object
 *               description: Schedule configuration
 *             serviceType:
 *               type: string
 *               enum: [homeBased, shopBased, both]
 *             location:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 formattedAddress:
 *                   type: string
 *             profileImage:
 *               type: string
 *             status:
 *               type: string
 *               enum: [pending, approved, rejected]
 *             rating:
 *               type: number
 *             reviewCount:
 *               type: integer
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */
// Update freelancer profile (for authenticated freelancer)
router.put('/profile',
    authenticate,
    authorize('freelancer'),
    freelancerController.updateFreelancerProfile
);

module.exports = router;
