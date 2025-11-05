const authService = require('../../../services/authService');
const { ApiError } = require('../../../middlewares/errorHandler');
const logger = require('../../../utils/logger');

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
    try {
        console.log('Register request body Received:', req.body);
        // Pass the entire req.body directly to authService.register
        const result = await authService.register(req.body);

        // Remove verification token from response
        const { verificationToken, ...response } = result;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: response,
            ...(process.env.NODE_ENV !== 'production' && { verificationToken }) // Only include in dev/test!
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
    try {
        const { email, password, fcmToken } = req.body;
        console.log(req.body);
        const result = await authService.login(email, password, fcmToken);

        // Set JWT as cookie
        if (process.env.NODE_ENV === 'production') {
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        
        // Remove specific FCM token or clear all if not provided
        await authService.logout(req.user, fcmToken);

        // Clear JWT cookie
        res.cookie('token', '', {
            httpOnly: true,
            expires: new Date(0)
        });

        res.status(200).json({
            success: true,
            message: fcmToken ? 'Logout successful - FCM token removed' : 'Logout successful - all FCM tokens cleared'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user
 * @route GET /api/auth/me
 * @access Private
 */
const getCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user._id;
        logger.info(`[GET_CURRENT_USER] Request received for user ID: ${userId}, Role: ${req.user.role}`);
        const result = await authService.getCurrentUser(userId);
        const user = result.user;
        // Build response structure using resolved data from service
        const responseUser = {
            _id: user._id,
            uid: user.uid,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
            profileImage: user.profileImage ?? null,
            profile: {
                phoneNumber: user.profile?.phoneNumber ?? user.phoneNumber ?? null,
                location: (user.role === 'shop_owner' || user.role === 'barber' || user.role === 'freelancer') ? {
                    latitude: user.role === 'shop_owner' && result.shops && result.shops.length > 0 
                        ? result.shops[0].latitude 
                        : user.profile?.latitude ?? null,
                    longitude: user.role === 'shop_owner' && result.shops && result.shops.length > 0 
                        ? result.shops[0].longitude 
                        : user.profile?.longitude ?? null,
                    formattedAddress: user.profile?.location ?? null,
                    countryId: user.profile?.countryId ?? null,
                    countryName: user.profile?.countryName ?? null
                } : user.profile?.location ?? null,
                countryCode: user.profile?.countryCode ?? null
            },
            schedule: user.schedule ?? null,
            services: result.user.services || null  // Add services to response
        };
        // Add shop if shop owner
        if (user.role === 'shop_owner' && result.shops) {
            responseUser.shop = result.shops;
            // For shop owners, collect all services from their shops
            const allServices = [];
            result.shops.forEach(shop => {
                if (shop.services && Array.isArray(shop.services)) {
                    allServices.push(...shop.services);
                }
            });
            // Remove duplicates based on _id
            const uniqueServices = allServices.filter((service, index, self) => 
                index === self.findIndex(s => s._id?.toString() === service._id?.toString())
            );
            responseUser.services = uniqueServices;
        }
        res.status(200).json({
            success: true,
            message: 'User profile fetched successfully',
            data: {
                user: responseUser
            }
        });
        logger.info(`[GET_CURRENT_USER] Response sent for user ID: ${userId}`);
    } catch (error) {
        logger.error(`[GET_CURRENT_USER] Error for user ID: ${req.user?._id}: ${error.message}`);
        next(error);
    }
};

/**
 * Verify email
 * @route POST /api/auth/verify-email
 * @access Public
 */
const verifyEmail = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            throw new ApiError('Email is required', 400);
        }

        // Use email to verify
        const result = await authService.verifyEmail(email);
        if (result === 'already_verified') {
            res.status(200).json({
                status: true,
                message: 'User is already verified'
            });
        } else if (result === 'otp_sent') {
            res.status(200).json({
                status: false,
                message: 'OTP has been sent to your email'
            });
        } else {
            throw new ApiError('Email verification failed', 400);
        }
    } catch (error) {
        next(error);
    }
}

/**
 * Verify email OTP
 * @route POST /api/auth/verify-email-otp
 * @access Public
 */
const verifyEmailOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        console.log('[DEBUG] Verify Email OTP Request:', { email, otp });

        if (!email || !otp) {
            throw new ApiError('Email and OTP are required', 400);
        }

        const result = await authService.verifyEmailOTP(email, otp);
        
        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const authService = require('../../../services/authService');
        const sendEmail = require('../../../utils/sendEmail');
        const user = await authService.findUserByEmail(email);
        if (!user) {
            // For security, always respond success, but do NOT send OTP
            return res.status(200).json({ success: true, message: 'OTP sent to email if account exists' });
        }
        // Generate OTP and expiry, save to user, send email
        const otp = '1234';
        const otpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
        user.resetPasswordOTP = otp;
        user.resetPasswordOTPExpire = otpExpire;
        user.resetPasswordOTPVerified = false;
        await user.save();
        await sendEmail({
            to: email,
            subject: 'Your Password Reset OTP',
            text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
            html: `<div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; border-radius: 10px; max-width: 400px; margin: auto;"><h2 style="color: #2d8cf0; text-align: center;">Password Reset OTP</h2><p style="font-size: 16px; color: #333; text-align: center;">Use the OTP below to reset your password:</p><div style="background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;"><span style="font-size: 2.2em; letter-spacing: 8px; color: #27ae60; font-weight: bold;">${otp}</span></div><p style="font-size: 15px; color: #555; text-align: center;">This OTP will expire in <b>5 minutes</b>.</p><hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"><p style="font-size: 13px; color: #aaa; text-align: center;">If you did not request this, please ignore this email.</p></div>`
        });
        console.log('[DEBUG] OTP sent to email:', email);
        console.log('[DEBUG] OTP:', otp);
        res.status(200).json({ success: true, message: 'OTP sent to email if account exists' });
    } catch (error) {
        res.status(200).json({ success: true, message: 'OTP sent to email if account exists' });
    }
}

/**
 * Verify password reset OTP
 * @route POST /api/auth/verify-reset-otp
 * @access Public
 */
const verifyResetOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        console.log('[DEBUG] Verify Reset OTP Request:', { email, otp });
        
        if (!email || !otp) {
            throw new ApiError('Email and OTP are required', 400);
        }

        const authService = require('../../../services/authService');
        const user = await authService.findUserByEmail(email);
        console.log('[DEBUG] User found for OTP verification:', user ? user.email : null);
        console.log('[DEBUG] Provided OTP:', otp);
        console.log('[DEBUG] User resetPasswordOTP:', user ? user.resetPasswordOTP : null);
        console.log('[DEBUG] User resetPasswordOTPExpire:', user ? user.resetPasswordOTPExpire : null);
        
        if (!user) {
            throw new ApiError('User not found', 400);
        }
        
        if (!user.resetPasswordOTP) {
            throw new ApiError('No OTP requested for this email', 400);
        }

        if (user.resetPasswordOTP !== otp) {
            throw new ApiError('Invalid OTP', 400);
        }
        
        if (!user.resetPasswordOTPExpire || user.resetPasswordOTPExpire < Date.now()) {
            throw new ApiError('OTP expired', 400);
        }
        // Generate secure reset token using the model's method
        const resetToken = user.generatePasswordResetToken();
        user.resetPasswordOTPVerified = true;
        await user.save();
        const expiryMinutes = 10; // Matches the model's 10-minute expiry
        res.status(200).json({
            success: true,
            message: `OTP verified. You may now reset your password. Token expires in ${expiryMinutes} minutes.`,
            token: resetToken,
            expiresInMinutes: expiryMinutes
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Reset password
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res, next) => {
    try {
        console.log('[DEBUG] Reset Password Request Body:', req.body);
        const { token, password } = req.body;
        if (!token || !password) {
            throw new ApiError('Token and password are required', 400);
        }
        
        const authService = require('../../../services/authService');
        const success = await authService.resetPassword(token, password);
        
        if (success) {
            res.status(200).json({ success: true, message: 'Password reset successful' });
        } else {
            throw new ApiError('Password reset failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Change password
 * @route POST /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;

        const success = await authService.changePassword(userId, currentPassword, newPassword);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Password changed successfully'
            });
        } else {
            throw new ApiError('Password change failed', 400);
        }
    } catch (error) {
        next(error);
    }
};



/**
 * Update FCM token for push notifications
 * @route PUT /api/auth/fcm-token
 * @access Private
 */
const updateFCMToken = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user._id;

        if (!fcmToken) {
            throw new ApiError('FCM token is required', 400);
        }

        // Try to find and update user in different collections
        let user = null;

        // Check Customer collection
        user = await Customer.findById(userId);
        if (user) {
            user.fcmToken = fcmToken;
            await user.save();
        } else {
            // Check Barber collection
            user = await Barber.findById(userId);
            if (user) {
                user.fcmToken = fcmToken;
                await user.save();
            } else {
                // Check Freelancer collection
                user = await Freelancer.findById(userId);
                if (user) {
                    user.fcmToken = fcmToken;
                    await user.save();
                } else {
                    // Check ShopOwner collection
                    user = await ShopOwner.findById(userId);
                    if (user) {
                        user.fcmToken = fcmToken;
                        await user.save();
                    } else {
                        // Check Admin collection
                        user = await Admin.findById(userId);
                        if (user) {
                            user.fcmToken = fcmToken;
                            await user.save();
                        }
                    }
                }
            }
        }

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'FCM token updated successfully'
        });
    } catch (error) {
        next(error);
    }
};
/**
 * Deactivate (soft delete) current user account
 * @route POST /api/auth/deactivate-account
 * @access Private
 */
const deactivateAccount = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Try to find and deactivate user in different collections
        let user = null;
        let collectionType = null;

        // Check Customer collection
        user = await Customer.findById(userId);
        if (user) {
            collectionType = 'customer';
            user.isActive = false;
            await user.save();
        } else {
            // Check Barber collection
            user = await Barber.findById(userId);
            if (user) {
                collectionType = 'barber';
                user.status = 'inactive';
                await user.save();
            } else {
                // Check Freelancer collection
                user = await Freelancer.findById(userId);
                if (user) {
                    collectionType = 'freelancer';
                    user.status = 'inactive';
                    await user.save();
                } else {
                    // Check ShopOwner collection
                    user = await ShopOwner.findById(userId);
                    if (user) {
                        collectionType = 'shop_owner';
                        user.isActive = false;
                        await user.save();
                    } else {
                        // Check Admin collection
                        user = await Admin.findById(userId);
                        if (user) {
                            collectionType = 'admin';
                            user.isActive = false;
                            await user.save();
                        }
                    }
                }
            }
        }

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser,
    verifyEmail,
    verifyEmailOTP,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    changePassword,
    updateFCMToken,
    deactivateAccount
};