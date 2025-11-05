const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Role = require('../models/Role');
const Barber = require('../models/Barber');
const Freelancer = require('../models/Freelancer');
const ShopOwner = require('../models/ShopOwner');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const { User, ROLES } = require('../models/User');
const { ApiError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const barberService = require('./barberService');

/**
 * Register a new user
 * @param {Object} userData - User data
 * @returns {Object} User object and verification token
 */
const register = async (userData) => {
  try {
    console.log('authService.register received userData:', JSON.stringify(userData, null, 2));
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role,
      addresses,
      fcmToken,
      serviceType,
      schedule,
      services,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      taxId,
      businessRegistrationNumber,
      profile,
      countryId
    } = userData;

    // Check if email already exists in any collection
    const existingCustomer = await Customer.findOne({ email });
    const existingBarber = await Barber.findOne({ email });
    const existingFreelancer = await Freelancer.findOne({ email });
    const existingShopOwner = await ShopOwner.findOne({ email });
    const existingUser = await User.findOne({ email });

    if (existingCustomer || existingBarber || existingFreelancer || existingShopOwner || existingUser) {
      throw new ApiError('Email already in use', 400);
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // If it's a customer, we'll handle it directly in the Customer collection
    if (!role || role.toLowerCase() === 'customer') {
      // Get customer role from Role collection
      const customerRole = await Role.findOne({ name: { $regex: new RegExp('^\\s*customer\\s*$', 'i') } });

      const customerData = {
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        role: 'customer',
        roleId: customerRole ? customerRole._id : null,
        countryId,  // Add countryId to customer data
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
        emailVerified: false,
        isActive: true,
        addresses: addresses || [],
        fcmTokens: fcmToken && typeof fcmToken === 'string' ? [{
          token: fcmToken,
          deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date()
        }] : []
      };

      const newCustomer = new Customer(customerData);
      await newCustomer.save();

      return {
        user: {
          _id: newCustomer._id,
          email: newCustomer.email,
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          role: newCustomer.role
        },
        verificationToken
      };
    }

    // Validate and process schedule data
    const processedSchedule = schedule ? {
      monday: schedule.monday || { status: 'unavailable' },
      tuesday: schedule.tuesday || { status: 'unavailable' },
      wednesday: schedule.wednesday || { status: 'unavailable' },
      thursday: schedule.thursday || { status: 'unavailable' },
      friday: schedule.friday || { status: 'unavailable' },
      saturday: schedule.saturday || { status: 'unavailable' },
      sunday: schedule.sunday || { status: 'unavailable' }
    } : {};

    console.log('Extracted values:', { serviceType, schedule: processedSchedule, services }); // Debug log
    console.log('Extracted profile:', profile); // Debug log

    // Block freelancer registration if location is not provided
    if (role && role.toLowerCase() === 'freelancer') {
      console.log('Checking location for freelancer:', profile?.location); // Debug log
      if (profile && (!profile.location || profile.location.latitude === undefined || profile.location.longitude === undefined || profile.location.formattedAddress === undefined)) {
        throw new ApiError('Location (latitude, longitude, formattedAddress) is required for freelancer registration if profile is provided', 400); // Enhanced error message
      }
    }

    // Determine role to assign
    let roleName = 'customer';
    if (role && typeof role === 'string') {
      const validRoles = ['customer', 'shop_owner', 'barber', 'freelancer', 'admin'];
      if (validRoles.includes(role.toLowerCase())) {
        roleName = role.toLowerCase();
      }
    }
    console.log('Requested role:', role);
    console.log('Resolved roleName:', roleName);

    // Handle non-customer roles
    if (roleName !== 'customer') {
      // Get role document
      const assignedRole = await Role.findOne({ name: roleName });
      console.log('Assigned role document:', assignedRole);
      if (!assignedRole) {
        throw new ApiError('Role not found', 500);
      }

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Common user data for non-customer roles
      const commonUserData = {
        email,
        password,
        firstName,
        lastName,
        profile: {
          phoneNumber
        },
        addresses: addresses || [],
        role: roleName,
        roleId: assignedRole._id,
        emailVerificationToken: verificationToken,
        isActive: true,
        emailVerified: false,
        fcmTokens: fcmToken && typeof fcmToken === 'string' ? [{
          token: fcmToken,
          deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date()
        }] : [],
        countryId: countryId || null
      };

      let newUser;

    // Create user based on role
    switch (roleName) {
      case 'barber':
        // Check if email already exists in Barber collection
        const existingBarber = await Barber.findOne({ email });
        if (existingBarber) {
          throw new ApiError('Email already in use', 400);
        }

        // Default schedule template
        const defaultSchedule = {
          monday: { from: '', to: '', status: 'unavailable' },
          tuesday: { from: '', to: '', status: 'unavailable' },
          wednesday: { from: '', to: '', status: 'unavailable' },
          thursday: { from: '', to: '', status: 'unavailable' },
          friday: { from: '', to: '', status: 'unavailable' },
          saturday: { from: '', to: '', status: 'unavailable' },
          sunday: { from: '', to: '', status: 'unavailable' }
        };
        // Merge provided schedule with defaults
        const mergedSchedule = { ...defaultSchedule, ...(schedule || {}) };

        const barberData = {
          ...commonUserData,
          verificationStatus: 'pending',
          services: services || [],
          rating: 0,
          reviewCount: 0,
          joinedDate: new Date(),
          serviceType: serviceType || 'homeBased',
          schedule: mergedSchedule
        };

        // Set profile.location as required by schema
        barberData.profile = {
          phoneNumber,
          ...profile,
          location: profile?.location
        };
        newUser = new Barber(barberData);
        break;

      case 'freelancer':
        // Check if email already exists in Freelancer collection
        const existingFreelancer = await Freelancer.findOne({ email });
        if (existingFreelancer) {
          throw new ApiError('Email already in use', 400);
        }

        const freelancerData = {
          ...commonUserData,
          serviceType: serviceType,
          schedule: schedule,
          services: services || [],
          status: profile?.status || 'active'
        };

        // Set profile.location as optional
        freelancerData.profile = {
          phoneNumber,
          ...profile,
          location: profile?.location
        };
        newUser = new Freelancer(freelancerData);
        break;

      case 'shop_owner':
        // Check if email already exists in ShopOwner collection
        const existingShopOwner = await ShopOwner.findOne({ email });
        if (existingShopOwner) {
          throw new ApiError('Email already in use', 400);
        }

        const shopOwnerData = {
          ...commonUserData,
          businessName,
          businessAddress,
          businessPhone,
          businessEmail,
          taxId,
          businessRegistrationNumber,
          verificationStatus: 'pending'
        };

        newUser = new ShopOwner(shopOwnerData);
        break;

      case 'admin':
        // Check if email already exists in Admin collection
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
          throw new ApiError('Email already in use', 400);
        }

        const adminData = {
          ...commonUserData,
          adminLevel: 'admin'
        };

        newUser = new Admin(adminData);
        break;

      default:
        throw new ApiError('Invalid user role', 400);
    }

    // Save user
    await newUser.save();

    // Create customer profile if role is customer (only for non-customer roles that need profiles)
    if (roleName === 'customer') {
      // Customer data is already stored directly in Customer collection
      // No additional profile creation needed
    }

    return {
      user: {
        _id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      },
      verificationToken
    };
  }
  } catch (error) {
    logger.error('Registration error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} User object and JWT token
 */
const login = async (email, password, fcmToken = null) => {
  try {
    // Try to find user in different collections
    let user = null;
    let userModel = null;

    // First check Customer collection (since customers are now stored directly here)
    user = await Customer.findOne({ email }).select('+password');
    if (user) {
      userModel = Customer;
      logger.info(`[LOGIN] ✅ User found in Customer collection: ${user.email} (${user._id})`);
    } else {
      // Check Barber collection
      user = await Barber.findOne({ email }).select('+password');
      if (user) {
        userModel = Barber;
        logger.info(`[LOGIN] ✅ User found in Barber collection: ${user.email} (${user._id})`);
      } else {
        // Check Freelancer collection
        user = await Freelancer.findOne({ email }).select('+password');
        if (user) {
          userModel = Freelancer;
          logger.info(`[LOGIN] ✅ User found in Freelancer collection: ${user.email} (${user._id})`);
        } else {
          // Check ShopOwner collection
          user = await ShopOwner.findOne({ email }).select('+password');
          if (user) {
            userModel = ShopOwner;
            logger.info(`[LOGIN] ✅ User found in ShopOwner collection: ${user.email} (${user._id})`);
          } else {
            // Check User collection (instead of Admin)
            user = await User.findOne({ email }).select('+password');
            if (user) {
              userModel = User;
              logger.info(`[LOGIN] ✅ User found in User collection: ${user.email} (${user._id})`);
            }
          }
        }
      }
    }

    if (!user) {
      logger.warn(`[LOGIN] ❌ User not found in any collection for email: ${email}`);
      throw new ApiError('Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError('Your account has been deactivated', 403);
    }

    // Check if user email is verified (skip for development)
    if (!user.emailVerified) {
      throw new ApiError('Please verify your email address', 401);
    }

    // Compare passwords using the model's method
    let isMatch = false;
    try {
      isMatch = await user.matchPassword(password);
    } catch (passwordError) {
      // Only catch actual bcrypt/technical errors, not business logic failures
      logger.error('Password comparison technical error:', passwordError);
      throw new ApiError('Authentication error', 500);
    }

    if (!isMatch) {
      logger.warn(`[LOGIN] ❌ Invalid password for user: ${user.email} (${user._id})`);
      throw new ApiError('Invalid credentials', 401);
    }
    logger.info(`[LOGIN] 🔐 Password verification successful for user: ${user.email}`);

    // Get role - handle different role storage methods
    let roleName = user.role;
    if (user.roleId) {
      // For models that use roleId reference
      const role = await Role.findById(user.roleId);
      if (!role) {
        throw new ApiError('Role not found', 500);
      }
      roleName = role.name;
    }

    // Update FCM token if provided
    if (fcmToken && typeof fcmToken === 'string') {
      try {
        // Use a deterministic device ID based on the FCM token (first 8 chars)
        const deviceId = `device_${fcmToken.substring(0, 8)}`;
        
        // Use findOneAndUpdate to atomically update the FCM tokens
        const updateResult = await userModel.findOneAndUpdate(
          { _id: user._id },
          {
            $pull: { fcmTokens: { token: fcmToken } }, // Remove any existing entries with this token
          },
          { new: true }
        );

        await userModel.findOneAndUpdate(
          { _id: user._id },
          {
            $push: {
              fcmTokens: {
                $each: [{
                  token: fcmToken,
                  deviceId: deviceId,
                  createdAt: new Date()
                }],
                $slice: -5 // Keep only the last 5 tokens
              }
            }
          },
          { new: true }
        );

        logger.info(`[LOGIN] 📱 FCM token added for user: ${user.email} (${user._id}), device: ${deviceId}`);
      } catch (fcmError) {
        logger.warn(`[LOGIN] ⚠️ Failed to update FCM token for user: ${user.email} (${user._id}): ${fcmError.message}`);
        // Don't fail login if FCM update fails
      }
    }

    // Generate JWT
    const token = generateToken(user._id, roleName);

    // Update last login using findOneAndUpdate to avoid triggering password hash middleware
    await userModel.findOneAndUpdate(
      { _id: user._id },
      { lastLogin: new Date() },
      { new: true }
    );

    logger.info(`[LOGIN] ✅ Login successful for user: ${user.email} (${user._id}), Role: ${roleName}`);

    return {
      user: {
        _id: user._id,
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImage: user.profileImage,
        isActive: user.isActive,
        emailVerified: user.emailVerified
      },
      token
    };
  } catch (error) {
    logger.error('Login error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
};

/**
 * Get current user
 * @param {string} userId - User ID
 * @returns {Object} User object
 */
const getCurrentUser = async (userId) => {
  try {
    logger.info(`[USER] Looking up user with ID: ${userId}`);
    // Try to find user in different collections
    let user = null;

    // Fields to exclude from all user types
    const excludeFields = '-password -verificationToken -resetPasswordToken -resetPasswordExpire -createdAt -updatedAt -permissions -resetPasswordOTPVerified -accessibleCountries -accessibleShops -accessibleCustomers -lastLogin';

        // Check Barber collection
        user = await Barber.findById(userId)
          .select(excludeFields)
          .populate('countryId', 'name code flagUrl')
          .populate('services', 'title description category price duration isActive');
        if (user) {
            logger.info(`[USER] ✅ User found in Barber collection: ${user.email} (${user._id})`);
        } else {
            // Check Freelancer collection
            user = await Freelancer.findById(userId)
              .select(excludeFields)
              .populate('countryId', 'name code flagUrl')
              .populate('services', 'title description category price duration isActive');
            if (user) {
                logger.info(`[USER] ✅ User found in Freelancer collection: ${user.email} (${user._id})`);
            } else {
                // Check ShopOwner collection
                user = await ShopOwner.findById(userId)
                  .select(excludeFields)
                  .populate('countryId', 'name code flagUrl');
                if (user) {
                    logger.info(`[USER] ✅ User found in ShopOwner collection: ${user.email} (${user._id})`);
                } else {
                    // Check Admin collection
                    user = await Admin.findById(userId)
                      .select(excludeFields)
                      .populate('countryId', 'name code flagUrl');
                    if (user) {
                        logger.info(`[USER] ✅ User found in Admin collection: ${user.email} (${user._id})`);
                    } else {
                        // Check Customer collection
                        user = await Customer.findById(userId)
                          .select(excludeFields)
                          .populate('countryId', 'name code flagUrl');
                        if (user) {
                            logger.info(`[USER] ✅ User found in Customer collection: ${user.email} (${user._id}), Country: ${user.countryId?.name || 'None'}`);
                        }
                    }
                }
            }
        }    if (!user) {
      logger.warn(`[USER] ❌ User not found in any collection for ID: ${userId}`);
      throw new ApiError('User not found', 404);
    }

    // Get role - handle different role storage methods
    let roleData = null;
    if (user.roleId) {
      // For models that use roleId reference
      const role = await Role.findById(user.roleId);
      if (!role) {
        throw new ApiError('Role not found', 500);
      }
      roleData = {
        name: role.name,
        permissions: role.permissions
      };
    } else {
      // For models that store role directly (like Customer)
      roleData = {
        name: user.role,
        permissions: [] // Customers have no special permissions
      };
    }

    // If user is a shop owner, fetch their shops with services
    let shops = [];
    if (user.role === 'shop_owner') {
      const Shop = require('../models/Shop');
      shops = await Shop.find({ ownerId: user._id })
        .select('uid name address phone email latitude longitude description mainImage rating reviewCount isVerified isActive services')
        .populate('services', 'title description category price duration isActive')
        .lean();
      logger.info(`[USER] Found ${shops.length} shops for shop owner: ${user._id}`);
    }

    // Get country data if countryId exists in profile.address or user.countryId
    let countryData = null;
    let countryIdString = null;
    const Country = require('../models/Country');
    try {
      // Log all possible sources of countryId
      logger.debug('[USER] Country data sources:', {
        userCountryId: user.countryId,
        profileAddress: user.profile?.address,
        typeOfCountryId: typeof user.countryId
      });

      // Get the countryId from profile.address first (since that's where it is in your data)
      let countryId = user.profile?.address;
      
      // If not in profile.address, try other sources
      if (!countryId && user.countryId) {
        if (typeof user.countryId === 'object' && user.countryId !== null) {
          countryId = user.countryId._id ?? user.countryId.id ?? user.countryId;
        } else {
          countryId = user.countryId;
        }
      }

      logger.debug('[USER] Final countryId to query:', countryId);

      if (countryId) {
        // Ensure countryId is a string
        countryIdString = typeof countryId === 'string' ? countryId : countryId.toString();
        logger.debug(`[USER] Looking up country with ID: ${countryIdString}`);
        
        countryData = await Country.findById(countryIdString).select('name code flagUrl').lean();
        if (countryData) {
          logger.info(`[USER] Found country: ${countryData.name} (${countryData._id})`);
        } else {
          logger.warn(`[USER] Country not found for ID: ${countryIdString}`);
        }
      }
    } catch (error) {
      logger.error(`Error fetching country:`, error);
    }

    const resolvedCountryId = countryIdString
      ?? (user.profile?.address ? user.profile.address.toString() : null)
      ?? (typeof user.countryId === 'object' && user.countryId !== null && (user.countryId._id || user.countryId.id)
        ? (user.countryId._id || user.countryId.id).toString()
        : null)
      ?? (typeof user.countryId === 'string' ? user.countryId : null);

    const resolvedCountryName = countryData?.name
      ?? (typeof user.countryId === 'object' && user.countryId !== null ? user.countryId.name : null);

    const resolvedCountryCode = countryData?.code
      ?? (typeof user.countryId === 'object' && user.countryId !== null ? user.countryId.code : null);

    const resolvedCountryFlag = countryData?.flagUrl
      ?? (typeof user.countryId === 'object' && user.countryId !== null ? user.countryId.flagUrl : null);

    const locationFromProfile = user.profile?.location ?? null;
    const fallbackAddress = Array.isArray(user.addresses) && user.addresses.length > 0 ? user.addresses[0] : null;

    // Generate schedule for shop owners based on shop opening hours
    let userSchedule = null;
    if (user.role === 'barber' || user.role === 'freelancer') {
      userSchedule = user.schedule;
    } else if (user.role === 'shop_owner' && shops.length > 0) {
      // Use the first shop's opening hours to generate schedule
      const shopOpeningHours = shops[0].openingHours || [];
      userSchedule = {};
      
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      daysOfWeek.forEach(day => {
        const dayHours = shopOpeningHours.find(hours => hours.day === day);
        if (dayHours && dayHours.isOpen) {
          userSchedule[day] = {
            from: dayHours.openTime,
            to: dayHours.closeTime,
            status: 'available'
          };
        } else {
          userSchedule[day] = {
            from: '',
            to: '',
            status: 'unavailable'
          };
        }
      });
    }

    const userResponse = {
      _id: user._id,
      uid: user.uid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImage: user.profileImage,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      profile: {
        phoneNumber: user.profile?.phoneNumber ?? user.phoneNumber ?? null,
        location: locationFromProfile ?? fallbackAddress ?? null,
        countryId: resolvedCountryId,
        countryName: resolvedCountryName,
        countryCode: resolvedCountryCode,
        latitude: locationFromProfile?.latitude ?? user.profile?.location?.latitude ?? fallbackAddress?.latitude ?? null,
        longitude: locationFromProfile?.longitude ?? user.profile?.location?.longitude ?? fallbackAddress?.longitude ?? null
      },
      schedule: userSchedule,
      services: user.services || []  // Add services for barbers and freelancers
    };

    return {
      user: userResponse,
      role: { name: roleData.name },
      shops: user.role === 'shop_owner' ? shops : undefined
    };
  } catch (error) {
    logger.error('Get current user error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
};

/**
 * Step 1: Handle email verification link (token)
 * If not verified, generate/send OTP and save it
 * @param {string} token - Verification token
 * @returns {string} status ("already_verified" or "otp_sent")
 */
const sendEmail = require('../utils/sendEmail');
// this function should take email to find the user instead of token
const verifyEmail = async (email) => {
  try {
    logger.info(`[VERIFY EMAIL DEBUG] Received email: ${email}`);
    
    // Try to find user in different collections
    let user = null;
    
    // Check Barber collection
    user = await Barber.findOne({ email });
    if (!user) {
      // Check Freelancer collection
      user = await Freelancer.findOne({ email });
      if (!user) {
        // Check ShopOwner collection
        user = await ShopOwner.findOne({ email });
        if (!user) {
          // Check Admin collection
          user = await Admin.findOne({ email });
          if (!user) {
            // Check Customer collection for customers
            user = await Customer.findOne({ email });
          }
        }
      }
    }
    
    logger.info(`[VERIFY EMAIL DEBUG] User found: ${user ? JSON.stringify({ email: user.email, emailVerificationToken: user.emailVerificationToken }) : 'none'}`);
    if (!user) {
      throw new ApiError('User not found', 400);
    }
    if (user.emailVerified) {
      return 'already_verified';
    }

    // Static OTP for testing
    
    const staticOtp = '1234';

    const otpExpire = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.emailOTP = staticOtp;
    user.emailOTPExpire = otpExpire;

    // Debug log
    console.log('Setting OTP:', { email: user.email, otp: staticOtp });

    // Send OTP email
    await sendEmail({
      to: user.email,
      subject: 'Your Email Verification OTP',
      text: `Your OTP is: ${staticOtp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px; border-radius: 10px; max-width: 400px; margin: auto;">
          <h2 style="color: #2d8cf0; text-align: center;">Email Verification</h2>
          <p style="font-size: 16px; color: #333; text-align: center;">Use the OTP below to verify your email address:</p>
          <div style="background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <span style="font-size: 2.2em; letter-spacing: 8px; color: #27ae60; font-weight: bold;">${staticOtp}</span>
          </div>
          <p style="font-size: 15px; color: #555; text-align: center;">This OTP will expire in <b>5 minutes</b>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 13px; color: #aaa; text-align: center;">If you did not request this, please ignore this email.</p>
        </div>
      `
    });
    console.log(`OTP sent to ${user.email}: ${staticOtp}`);
    await user.save();
    return 'otp_sent';
  } catch (error) {
    logger.error('Email verification error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
}

/**
 * Step 2: Verify email OTP
 * @param {string} email - User email
 * @param {string} otp - OTP code
 * @returns {boolean} Success
 */
const verifyEmailOTP = async (email, otp) => {
  try {
    // Debug: print email and otp
    logger.info(`[OTP DEBUG] Verifying OTP for email: ${email}, otp: ${otp}`);
    
    // Try to find user in different collections
    let user = null;
    
    // Check Barber collection
    user = await Barber.findOne({ email });
    if (!user) {
      // Check Freelancer collection
      user = await Freelancer.findOne({ email });
      if (!user) {
        // Check ShopOwner collection
        user = await ShopOwner.findOne({ email });
        if (!user) {
          // Check Admin collection
          user = await Admin.findOne({ email });
          if (!user) {
            // Check Customer collection for customers
            user = await Customer.findOne({ email });
          }
        }
      }
    }
    
    logger.info(`[OTP DEBUG] User found: ${user ? JSON.stringify({ email: user.email, emailOTP: user.emailOTP, emailOTPExpire: user.emailOTPExpire }) : 'none'}`);
    console.log(`[OTP DEBUG] Comparing user.emailOTP (${user ? user.emailOTP : 'undefined'}) with provided otp (${otp})`);
    if (!user || user.emailOTP !== otp) {
      logger.warn(`[OTP DEBUG] OTP mismatch. user.emailOTP: ${user ? user.emailOTP : 'undefined'}, provided otp: ${otp}`);
      throw new ApiError('Invalid OTP', 400);
    }
    if (!user.emailOTPExpire || user.emailOTPExpire < Date.now()) {
      throw new ApiError('OTP expired', 400);
    }
    user.emailVerified = true;
    user.emailOTP = '1234';
    user.emailOTPExpire = undefined;
    await user.save();
    return true;
  } catch (error) {
    logger.error('Email OTP verification error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {string} Reset token
 */
const requestPasswordReset = async (email) => {
  try {
    // Try to find user in different collections
    let user = null;
    
    // Check Barber collection
    user = await Barber.findOne({ email });
    if (!user) {
      // Check Freelancer collection
      user = await Freelancer.findOne({ email });
      if (!user) {
        // Check ShopOwner collection
        user = await ShopOwner.findOne({ email });
        if (!user) {
          // Check Admin collection
          user = await Admin.findOne({ email });
          if (!user) {
            // Check Customer collection for customers
            user = await Customer.findOne({ email });
          }
        }
      }
    }

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expire time
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

    await user.save();

    return resetToken;
  } catch (error) {
    logger.error('Password reset request error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
};

/**
 * Reset password
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {boolean} Success
 */
const resetPassword = async (token, newPassword) => {
  try {
    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by reset token and check expiry in different collections
    let user = null;

    // Check Barber collection
    user = await Barber.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });
    if (!user) {
      // Check Freelancer collection
      user = await Freelancer.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: { $gt: Date.now() }
      });
      if (!user) {
        // Check ShopOwner collection
        user = await ShopOwner.findOne({
          resetPasswordToken: hashedToken,
          resetPasswordExpiry: { $gt: Date.now() }
        });
        if (!user) {
          // Check Admin collection
          user = await Admin.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: Date.now() }
          });
          if (!user) {
            // Check Customer collection
            user = await Customer.findOne({
              resetPasswordToken: hashedToken,
              resetPasswordExpiry: { $gt: Date.now() }
            });
          }
        }
      }
    }

    if (!user) {
      throw new ApiError('Invalid or expired token', 400);
    }

    // Update password and clear reset token fields (pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    await user.save();

    return true;
  } catch (error) {
    logger.error('Password reset error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
};

/**
 * Change password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} Success
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Try to find user in different collections
    let user = null;

    // Check Barber collection
    user = await Barber.findById(userId).select('+password');
    if (!user) {
      // Check Freelancer collection
      user = await Freelancer.findById(userId).select('+password');
      if (!user) {
        // Check ShopOwner collection
        user = await ShopOwner.findById(userId).select('+password');
        if (!user) {
          // Check Admin collection
          user = await Admin.findById(userId).select('+password');
          if (!user) {
            // Check Customer collection
            user = await Customer.findById(userId).select('+password');
          }
        }
      }
    }

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Check current password using the model's method
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      throw new ApiError('Current password is incorrect', 400);
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;

    await user.save();

    return true;
  } catch (error) {
    logger.error('Change password error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message || 'Password change failed', 500);
  }
};

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role: role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Object} User object
 */
const findUserByEmail = async (email) => {
  try {
    // Make email search case-insensitive
    let user = null;
    
    // Check Barber collection
    user = await Barber.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
    if (!user) {
      // Check Freelancer collection
      user = await Freelancer.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
      if (!user) {
        // Check ShopOwner collection
        user = await ShopOwner.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        if (!user) {
          // Check User collection (instead of Admin)
          user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
          if (!user) {
            // Check Customer collection
            user = await Customer.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
          }
        }
      }
    }
    
    console.log('[DEBUG] findUserByEmail - Found user:', user ? { email: user.email, id: user._id } : null);
    return user;
  } catch (error) {
    logger.error('Find user by email error:', error);
    throw error instanceof ApiError ? error : new ApiError(error.message, 500);
  }
};

/**
 * Logout user - Remove specific FCM token
 * @param {Object} user - User document from any collection
 * @param {string} fcmToken - FCM token to remove (optional - if not provided, clears all tokens)
 * @returns {Promise<void>}
 */
const logout = async (user, fcmToken = null) => {
  try {
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (fcmToken) {
      // Remove only the specific FCM token
      if (!user.fcmTokens) {
        user.fcmTokens = [];
      }
      
      const initialLength = user.fcmTokens.length;
      user.fcmTokens = user.fcmTokens.filter(tokenObj => tokenObj.token !== fcmToken);
      
      if (user.fcmTokens.length < initialLength) {
        await user.save();
        logger.info(`[LOGOUT] ✅ Removed specific FCM token for user: ${user.email} (${user._id})`);
      } else {
        logger.warn(`[LOGOUT] ⚠️ FCM token not found for user: ${user.email} (${user._id})`);
      }
    } else {
      // Clear all FCM tokens (fallback behavior)
      user.fcmTokens = [];
      await user.save();
      logger.info(`[LOGOUT] ✅ Cleared all FCM tokens for user: ${user.email} (${user._id})`);
    }
  } catch (error) {
    logger.error(`[LOGOUT] ❌ Error during logout for user: ${user.email}: ${error.message}`);
    throw error instanceof ApiError ? error : new ApiError('Logout error', 500);
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  verifyEmail,
  verifyEmailOTP,
  requestPasswordReset,
  resetPassword,
  changePassword,
  findUserByEmail
};