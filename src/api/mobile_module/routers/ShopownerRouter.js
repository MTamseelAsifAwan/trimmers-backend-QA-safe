const express = require('express');
const router = express.Router();
const controller = require("../controllers/ShopownerController");
const { authenticate } = require('../../../middlewares/auth');
const { validate, adminSchemas, serviceSchemas } = require('../../../utils/validators');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// URL cleaning middleware (must be first, before any other middleware)
router.use((req, res, next) => {
    console.log('=== URL CLEANING MIDDLEWARE ===');
    console.log('Original URL:', req.originalUrl);
    console.log('Original path:', req.path);

    // Clean the URL by removing trailing spaces and URL-encoded spaces
    if (req.originalUrl) {
        const cleanedUrl = req.originalUrl.trim().replace(/%20/g, '').replace(/\s+$/, '');
        if (cleanedUrl !== req.originalUrl) {
            console.log('URL cleaned from:', req.originalUrl, 'to:', cleanedUrl);
            req.originalUrl = cleanedUrl;

            // Also clean the path
            if (req.path) {
                const cleanedPath = req.path.trim().replace(/%20/g, '').replace(/\s+$/, '');
                if (cleanedPath !== req.path) {
                    console.log('Path cleaned from:', req.path, 'to:', cleanedPath);
                    req.path = cleanedPath;
                }
            }
        }
    }

    console.log('Final URL:', req.originalUrl);
    console.log('Final path:', req.path);
    next();
});

router.use(authenticate);

// Log all registered routes for debugging
router.stack.forEach((layer, index) => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`Route ${index}: ${methods} ${layer.route.path}`);
    }
});

/**
 * @swagger
 * /api/mobile/shopowners/profile:
 *   post:
 *     tags: [Mobile Shop Owner]
 *     summary: Create shop owner profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               businessAddress:
 *                 type: string
 *               businessPhone:
 *                 type: string
 *               businessEmail:
 *                 type: string
 *                 format: email
 *               taxId:
 *                 type: string
 *               businessRegistrationNumber:
 *                 type: string
 *               countryId:
 *                 type: string
 *               operatingCountries:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - businessName
 *               - businessAddress
 *               - businessPhone
 *               - businessEmail
 *               - countryId
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               businessAddress:
 *                 type: string
 *               businessPhone:
 *                 type: string
 *               businessEmail:
 *                 type: string
 *                 format: email
 *               taxId:
 *                 type: string
 *               businessRegistrationNumber:
 *                 type: string
 *               countryId:
 *                 type: string
 *               operatingCountries:
 *                 type: array
 *                 items:
 *                   type: string
 *               businessLogoBlob:
 *                 type: string
 *                 format: binary
 *                 description: Business logo file # optional
 *               businessRegistrationDocBlob:
 *                 type: string
 *                 format: binary
 *                 description: Business registration document file # optional
 *             required:
 *               - businessName
 *               - businessAddress
 *               - businessPhone
 *               - businessEmail
 *               - countryId
 *     responses:
 *       201:
 *         description: Shop owner profile created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Accept JSON first
router.post(
    '/profile',
    validate(adminSchemas.createShopOwner),
    controller.createProfile
);

// Then accept form-data
router.post(
    '/profile',
    upload.fields([
        { name: 'businessLogoBlob', maxCount: 1 },
        { name: 'businessRegistrationDocBlob', maxCount: 1 }
    ]),
    validate(adminSchemas.createShopOwner),
    controller.createProfile
);

/**
 * @swagger
 * /api/mobile/shopowners/profile:
 *   get:
 *     tags: [Mobile Shop Owner]
 *     summary: Get current user's shop owner profile
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
// Get current authenticated user's profile
router.get('/profile', controller.getMyProfile);

/**
 * @swagger
 * /api/mobile/shopowners/profile/{id}:
 *   get:
 *     tags: [Mobile Shop Owner]
 *     summary: Get shop owner profile by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop owner ID
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
router.get('/profile/:id', controller.getShopOwnerProfile);

/**
 * @swagger
 * /api/mobile/shopowners/shops:
 *   post:
 *     tags: [Mobile Shop Owner]
 *     summary: Add shop details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               description:
 *                 type: string
 *               countryId:
 *                 type: string
 *               cityId:
 *                 type: string
 *               areaId:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   formattedAddress:
 *                     type: string
 *               mainImageBlob:
 *                 type: string
 *                 format: binary
 *                 description: Main shop image file
 *             required:
 *               - name
 *               - address
 *               - phone
 *               - countryId
 *               - cityId
 *               - areaId
 *               - location
 *               - mainImageBlob
 *     responses:
 *       201:
 *         description: Shop added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Add shop details
router.post('/shops', upload.single('mainImageBlob'), validate(adminSchemas.createShop), controller.addShopDetails);

/**
 * @swagger
 * /api/mobile/shopowners/shops/add-barber-against-shop:
 *   post:
 *     tags: [Mobile Shop Owner]
 *     summary: Add barber to shop
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shopId:
 *                 type: string
 *                 description: Shop ID
 *               barberId:
 *                 type: string
 *                 description: Barber ID
 *             required:
 *               - shopId
 *               - barberId
 *     responses:
 *       200:
 *         description: Barber added to shop successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop or barber not found
 *       500:
 *         description: Server error
 */
router.post('shops/add-barber-against-shop', controller.addBarberAgainstShop);

/**
 * @swagger
 * /api/mobile/shopowners/barbers:
 *   post:
 *     tags: [Mobile Shop Owner]
 *     summary: Create barber
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               countryId:
 *                 type: string
 *               shopId:
 *                 type: string
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *               serviceType:
 *                 type: string
 *                 enum: [homeBased, shopBased, both]
 *               specialization:
 *                 type: string
 *               employmentType:
 *                 type: string
 *                 enum: [employee, freelancer]
 *               bio:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   formattedAddress:
 *                     type: string
 *               schedule:
 *                 type: object
 *               profileImageBlob:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file # optional
 *               idImageBlob:
 *                 type: string
 *                 format: binary
 *                 description: ID image file # optional
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phoneNumber
 *               - countryId
 *               - shopId
 *               - services
 *               - serviceType
 *               - employmentType
 *               - location
 *               - schedule
 *     responses:
 *       201:
 *         description: Barber created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/barbers', upload.fields([
    { name: 'profileImageBlob', maxCount: 1 },
    { name: 'idImageBlob', maxCount: 1 }
]), validate(adminSchemas.createBarber), controller.createBarber);

/**
 * @swagger
 * /api/mobile/shopowners/shops/remove-barber-from-shop/{shop_id}/{barber_id}:
 *   delete:
 *     tags: [Mobile Shop Owner]
 *     summary: Remove barber from shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shop_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: path
 *         name: barber_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Barber ID
 *     responses:
 *       200:
 *         description: Barber removed from shop successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop or barber not found
 *       500:
 *         description: Server error
 */
// Remove barber from shop
router.delete('shops/remove-barber-from-shop/:shop_id/:barber_id', controller.removeBarberFromShop);

/**
 * @swagger
 * /api/mobile/shopowners/shops/{id}/bookings:
 *   get:
 *     tags: [Mobile Shop Owner]
 *     summary: Get shop bookings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, in_progress, completed, cancelled]
 *         description: Filter by status # optional
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date # optional
 *     responses:
 *       200:
 *         description: Shop bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
// get shop bookings
router.get('/shops/:id/bookings', controller.getShopBookings);

/**
 * @swagger
 * /api/mobile/shopowners/barbers/{id}:
 *   get:
 *     tags: [Mobile Shop Owner]
 *     summary: View barber details
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
 *         description: Barber details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Barber not found
 *       500:
 *         description: Server error
 */
router.get('/barbers/:id', controller.viewBarberDetails);

/**
 * @swagger
 * /api/mobile/shopowners/shops/{id}/services:
 *   get:
 *     tags: [Mobile Shop Owner]
 *     summary: View shop services
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop services retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
router.get('/shops/:id/services', controller.viewServices);

/**
 * @swagger
 * /api/mobile/shopowners/shops/{id}/services:
 *   post:
 *     tags: [Mobile Shop Owner]
 *     summary: Add service to shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 10
 *               price:
 *                 type: number
 *                 minimum: 0
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *               category:
 *                 type: string
 *               barberId:
 *                 type: string
 *                 description: Barber ID # optional
 *               shopId:
 *                 type: string
 *                 description: Shop ID # optional
 *             required:
 *               - title
 *               - description
 *               - price
 *               - duration
 *               - category
 *     responses:
 *       201:
 *         description: Service added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/shops/:id/services', validate(serviceSchemas.createService), controller.addServices);

/**
 * @swagger
 * /api/mobile/shopowners/shops/services/{id}:
 *   delete:
 *     tags: [Mobile Shop Owner]
 *     summary: Remove service
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.delete('/shops/services/:id', controller.removeService);

/**
 * @swagger
 * /api/mobile/shopowners/shops/{id}:
 *   get:
 *     tags: [Mobile Shop Owner]
 *     summary: View shop details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
router.get('/shops/:id', controller.viewShopDetails);

/**
 * @swagger
 * /api/mobile/shopowners/shops/{id}:
 *   delete:
 *     tags: [Mobile Shop Owner]
 *     summary: Delete shop
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shop not found
 *       500:
 *         description: Server error
 */
router.delete('/shops/:id', controller.deleteShop);

/**
 * @swagger
 * /api/mobile/shopowners/barbers:
 *   get:
 *     tags: [Mobile Shop Owner]
 *     summary: Get all barbers for shop owner
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Barbers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// Get all barbers for shop owner
router.get('/barbers', controller.getBarbers);

module.exports = router;