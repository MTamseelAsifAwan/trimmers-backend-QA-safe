// src/api/auth/routes.js
const express = require('express');
const router = express.Router();
const authController = require('./controllers/authController');
const { authenticate } = require('../../middlewares/auth');
const { validate, userSchemas } = require('../../utils/validators');

// Public routes
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: Password123!
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: John
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Doe
 *               phoneNumber:  # optional
 *                 type: string
 *                 example: +1234567890
 *               role:
 *                 type: string
 *                 enum: [customer, barber, shop_owner, freelancer]
 *                 example: customer
 *               addresses:  # optional
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     street:
 *                       type: string
 *                       example: 123 Main St
 *                     city:
 *                       type: string
 *                       example: New York
 *                     state:
 *                       type: string
 *                       example: NY
 *                     zipCode:
 *                       type: string
 *                       example: 10001
 *                     country:
 *                       type: string
 *                       example: USA
 *               serviceType:  # optional
 *                 type: string
 *                 enum: [homeBased, shopBased, both]
 *                 example: shopBased
 *               schedule:  # optional
 *                 type: object
 *                 properties:
 *                   monday:
 *                     type: object
 *                     properties:
 *                       from:
 *                         type: string
 *                         example: "09:00"
 *                       to:
 *                         type: string
 *                         example: "18:00"
 *                       status:
 *                         type: string
 *                         enum: [available, unavailable]
 *                         example: available
 *                   # Similar for other days
 *               services:  # optional
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["haircut", "shave"]
 *               location:  # optional
 *                 type: object
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [-74.006, 40.7128]
 *                   formattedAddress:
 *                     type: string
 *                     example: "New York, NY, USA"
 *               countryId:  # optional
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request - validation error
 *       409:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
router.post('/register', validate(userSchemas.register), authController.register);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *               fcmToken:  # optional
 *                 type: string
 *                 example: "fcm_token_here"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "jwt_token_here"
 *                 user:
 *                   $ref: '#/components/schemas/CurrentUserResponse'
 *       400:
 *         description: Bad request - invalid credentials
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/login', validate(userSchemas.login), authController.login);
/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Send email verification OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/verify-email', authController.verifyEmail);
/**
 * @swagger
 * /api/auth/verify-email-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email with OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid OTP or email
 *       500:
 *         description: Server error
 */
router.post('/verify-email-otp', authController.verifyEmailOTP);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Reset OTP sent successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', validate(userSchemas.resetPasswordRequest), authController.forgotPassword);
/**
 * @swagger
 * /api/auth/verify-reset-otp:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify reset password OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP
 *       500:
 *         description: Server error
 */
router.post('/verify-reset-otp', authController.verifyResetOTP);
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 example: "reset_token_here"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid token or password
 *       500:
 *         description: Server error
 */
router.post('/reset-password', validate(userSchemas.resetPassword), authController.resetPassword);

// Protected routes
router.use(authenticate);
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user profile
 *     description: Returns the profile of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrentUserResponse'
 *       401:
 *         description: Unauthorized - No valid authentication token provided
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/me', authController.getCurrentUser);
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/logout', authController.logout);
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "OldPassword123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewPassword123!"
 *               confirmPassword:
 *                 type: string
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/change-password', validate(userSchemas.changePassword), authController.changePassword);
/**
 * @swagger
 * /api/auth/fcm-token:
 *   put:
 *     tags: [Authentication]
 *     summary: Update FCM token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 example: "fcm_token_here"
 *     responses:
 *       200:
 *         description: FCM token updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/fcm-token', authController.updateFCMToken);

// Deactivate (soft delete) account
/**
 * @swagger
 * /api/auth/deactivate-account:
 *   post:
 *     tags: [Authentication]
 *     summary: Deactivate user account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/deactivate-account', authController.deactivateAccount);

module.exports = router;