// src/api/profile/routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../utils/validators');
const Joi = require('joi');
const profileController = require('./controllers/profileController');

// Profile update validation schema - includes all possible fields from all user types
const profileUpdateSchema = Joi.object({
    // Common user fields
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    phoneNumber: Joi.string().allow(''),
    profileImage: Joi.string().allow(null, ''),
    
    // Customer specific fields
    stripeCustomerId: Joi.string().allow(null, ''),
    profile: Joi.object({
        phoneNumber: Joi.string().allow(''),
        address: Joi.string().allow(''),
        city: Joi.string().allow(''),
        zipCode: Joi.string().allow('')
    }),
    
    // Barber/Freelancer specific fields
    address: Joi.string().allow(''),
    city: Joi.string().allow(''),
    zipCode: Joi.string().allow(''),
    shopId: Joi.string().hex().length(24).allow(null, ''),
    services: Joi.array().items(Joi.string().hex().length(24)).allow(null),
    countryId: Joi.string().hex().length(24).allow(null),
    serviceType: Joi.string().valid('homeBased', 'shopBased', 'both'),
    specialization: Joi.string().allow(''),
    employmentType: Joi.string().valid('employee', 'freelancer'),
    bio: Joi.string().allow(''),
    displayName: Joi.string().allow(''),
    location: Joi.object({
        latitude: Joi.number(),
        longitude: Joi.number(),
        address: Joi.string()
    }),
    servicingArea: Joi.object({
        radius: Joi.number(),
        unit: Joi.string().valid('km', 'miles')
    }),
    schedule: Joi.alternatives().try(
        Joi.object().pattern(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/, Joi.object({
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').allow(/^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').allow(/^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i),
            status: Joi.string().valid('available', 'unavailable').default('available')
        })),
        Joi.array().items(Joi.object({
            day: Joi.string().valid('monday','tuesday','wednesday','thursday','friday','saturday','sunday').required(),
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').allow(/^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').allow(/^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i),
            status: Joi.string().valid('available', 'unavailable').default('available')
        }))
    ),
    status: Joi.string().valid('active', 'inactive', 'onLeave', 'online', 'offline'),
    nationalId: Joi.object({
        idNumber: Joi.string().allow(''),
        idImageUrl: Joi.string().allow(''),
        expiryDate: Joi.date().allow(null)
    }),
    portfolio: Joi.array().items(Joi.object({
        imageUrl: Joi.string().required(),
        description: Joi.string().allow('')
    })),
    
    // Shop Owner specific fields
    businessName: Joi.string().min(3).max(100),
    businessAddress: Joi.string(),
    businessPhone: Joi.string(),
    businessEmail: Joi.string().email(),
    businessLogo: Joi.string().allow(null),
    taxId: Joi.string(),
    businessRegistrationNumber: Joi.string(),
    stripeAccountId: Joi.string().allow(null),
    verificationDocuments: Joi.array().items(Joi.string())
}).min(1); // At least one field must be provided

// All profile routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get user profile based on role
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     - $ref: '#/components/schemas/CustomerProfile'
 *                     - $ref: '#/components/schemas/BarberProfile'
 *                     - $ref: '#/components/schemas/FreelancerProfile'
 *                     - $ref: '#/components/schemas/ShopOwnerProfile'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 *     components:
 *       schemas:
 *         CustomerProfile:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             phoneNumber:
 *               type: string
 *             profileImage:
 *               type: string
 *             stripeCustomerId:
 *               type: string
 *             profile:
 *               type: object
 *               properties:
 *                 phoneNumber:
 *                   type: string
 *                 address:
 *                   type: string
 *                 city:
 *                   type: string
 *                 zipCode:
 *                   type: string
 *             favoriteShops:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   rating:
 *                     type: number
 *                   reviewCount:
 *                     type: integer
 *                   mainImage:
 *                     type: string
 *             favoriteBarbers:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   rating:
 *                     type: number
 *                   reviewCount:
 *                     type: integer
 *                   profileImage:
 *                     type: string
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
 *             role:
 *               type: string
 *               example: customer
 *             isActive:
 *               type: boolean
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *         BarberProfile:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
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
 *             profileImage:
 *               type: string
 *             shopId:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 address:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 rating:
 *                   type: number
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
 *             serviceType:
 *               type: string
 *               enum: [homeBased, shopBased, both]
 *             specialization:
 *               type: string
 *             employmentType:
 *               type: string
 *               enum: [employee, freelancer]
 *             bio:
 *               type: string
 *             location:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 address:
 *                   type: string
 *             schedule:
 *               type: object
 *             status:
 *               type: string
 *               enum: [active, inactive, onLeave, online, offline]
 *             rating:
 *               type: number
 *             reviewCount:
 *               type: integer
 *             role:
 *               type: string
 *               example: barber
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *         FreelancerProfile:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
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
 *             profileImage:
 *               type: string
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
 *             serviceType:
 *               type: string
 *               enum: [homeBased, shopBased, both]
 *             bio:
 *               type: string
 *             location:
 *               type: object
 *               properties:
 *                 latitude:
 *                   type: number
 *                 longitude:
 *                   type: number
 *                 address:
 *                   type: string
 *             schedule:
 *               type: object
 *             status:
 *               type: string
 *               enum: [active, inactive, onLeave, online, offline]
 *             rating:
 *               type: number
 *             reviewCount:
 *               type: integer
 *             role:
 *               type: string
 *               example: freelancer
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *         ShopOwnerProfile:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             phoneNumber:
 *               type: string
 *             businessName:
 *               type: string
 *             businessAddress:
 *               type: string
 *             businessPhone:
 *               type: string
 *             businessEmail:
 *               type: string
 *               format: email
 *             businessLogo:
 *               type: string
 *             taxId:
 *               type: string
 *             businessRegistrationNumber:
 *               type: string
 *             stripeAccountId:
 *               type: string
 *             verificationDocuments:
 *               type: array
 *               items:
 *                 type: string
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
 *             operatingCountries:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   code:
 *                     type: string
 *                   currency:
 *                     type: string
 *             shops:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   address:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   rating:
 *                     type: number
 *             role:
 *               type: string
 *               example: shop_owner
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 */
// Get user profile based on their role
router.get('/', profileController.getProfile);

/**
 * @swagger
 * /api/profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update user profile based on role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Common fields
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 # optional
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 # optional
 *               phoneNumber:
 *                 type: string
 *                 # optional
 *               profileImage:
 *                 type: string
 *                 # optional
 *               
 *               # Customer specific
 *               stripeCustomerId:
 *                 type: string
 *                 # optional
 *               profile:
 *                 type: object
 *                 properties:
 *                   phoneNumber:
 *                     type: string
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                 # optional
 *               
 *               # Barber/Freelancer specific
 *               address:
 *                 type: string
 *                 # optional
 *               city:
 *                 type: string
 *                 # optional
 *               zipCode:
 *                 type: string
 *                 # optional
 *               shopId:
 *                 type: string
 *                 # optional
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *                 # optional
 *               countryId:
 *                 type: string
 *                 # optional
 *               serviceType:
 *                 type: string
 *                 enum: [homeBased, shopBased, both]
 *                 # optional
 *               specialization:
 *                 type: string
 *                 # optional
 *               employmentType:
 *                 type: string
 *                 enum: [employee, freelancer]
 *                 # optional
 *               bio:
 *                 type: string
 *                 # optional
 *               displayName:
 *                 type: string
 *                 # optional
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *                 # optional
 *               servicingArea:
 *                 type: object
 *                 properties:
 *                   radius:
 *                     type: number
 *                   unit:
 *                     type: string
 *                     enum: [km, miles]
 *                 # optional
 *               schedule:
 *                 oneOf:
 *                   - type: object
 *                     description: Object with day keys
 *                   - type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         day:
 *                           type: string
 *                           enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                         from:
 *                           type: string
 *                         to:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [available, unavailable]
 *                 # optional
 *               status:
 *                 type: string
 *                 enum: [active, inactive, onLeave, online, offline]
 *                 # optional
 *               nationalId:
 *                 type: object
 *                 properties:
 *                   idNumber:
 *                     type: string
 *                   idImageUrl:
 *                     type: string
 *                   expiryDate:
 *                     type: string
 *                     format: date
 *                 # optional
 *               portfolio:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                     description:
 *                       type: string
 *                 # optional
 *               
 *               # Shop Owner specific
 *               businessName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 # optional
 *               businessAddress:
 *                 type: string
 *                 # optional
 *               businessPhone:
 *                 type: string
 *                 # optional
 *               businessEmail:
 *                 type: string
 *                 format: email
 *                 # optional
 *               businessLogo:
 *                 type: string
 *                 # optional
 *               taxId:
 *                 type: string
 *                 # optional
 *               businessRegistrationNumber:
 *                 type: string
 *                 # optional
 *               stripeAccountId:
 *                 type: string
 *                 # optional
 *               verificationDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 # optional
 *             minProperties: 1
 *             description: At least one field must be provided for update
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: "Profile updated successfully"
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/CustomerProfile'
 *                     - $ref: '#/components/schemas/BarberProfile'
 *                     - $ref: '#/components/schemas/FreelancerProfile'
 *                     - $ref: '#/components/schemas/ShopOwnerProfile'
 *       400:
 *         description: Validation error or no fields provided
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
// Update user profile based on their role
router.put('/', validate(profileUpdateSchema), profileController.updateProfile);

/**
 * @swagger
 * /api/profile/update-requests:
 *   get:
 *     tags: [Profile]
 *     summary: Get shop update requests for the current shop owner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by request status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Shop update requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     requests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           uid:
 *                             type: string
 *                           shopId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                           requestedChanges:
 *                             type: object
 *                             description: Map of requested changes
 *                           status:
 *                             type: string
 *                             enum: [pending, approved, rejected]
 *                           requestedAt:
 *                             type: string
 *                             format: date-time
 *                           reviewedAt:
 *                             type: string
 *                             format: date-time
 *                           reviewNotes:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a shop owner
 *       500:
 *         description: Server error
 */
// Get shop update requests for the current shop owner
router.get('/update-requests', profileController.getShopUpdateRequests);

module.exports = router;