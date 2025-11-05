// src/api/profile/controllers/profileController.js
const customerService = require('../../../services/customerService');
const barberService = require('../../../services/barberService');
const freelancerService = require('../../../services/freelancerService');
const shopOwnerService = require('../../../services/shopOwnerService');
const shopService = require('../../../services/shopService');
const shopJoinRequestService = require('../../../services/shopJoinRequestService');
const { ApiError } = require('../../../middlewares/errorHandler');

const toPlainObject = (doc) => {
    if (!doc) return null;
    if (typeof doc.toObject === 'function') {
        return doc.toObject({ virtuals: true });
    }
    if (typeof doc.toJSON === 'function') {
        return doc.toJSON();
    }
    return doc;
};

const pickContactField = (profile = {}, fallback = {}, key) => {
    if (profile && profile[key] !== undefined && profile[key] !== null) {
        return profile[key];
    }
    if (profile && profile.profile && profile.profile[key] !== undefined && profile.profile[key] !== null) {
        return profile.profile[key];
    }
    if (fallback && fallback[key] !== undefined && fallback[key] !== null) {
        return fallback[key];
    }
    if (fallback && fallback.profile && fallback.profile[key] !== undefined && fallback.profile[key] !== null) {
        return fallback.profile[key];
    }
    return null;
};

const buildCommonProfileData = (profile = {}, fallback = {}, role, extraFields = {}) => {
    return {
        id: profile._id || fallback._id || null,
        uid: profile.uid || fallback.uid || null,
        role: role || profile.role || fallback.role || null,
        email: profile.email || fallback.email || null,
        firstName: profile.firstName || fallback.firstName || null,
        lastName: profile.lastName || fallback.lastName || null,
        displayName: profile.displayName || fallback.displayName || null,
        phoneNumber: pickContactField(profile, fallback, 'phoneNumber'),
        address: pickContactField(profile, fallback, 'address'),
        city: pickContactField(profile, fallback, 'city'),
        zipCode: pickContactField(profile, fallback, 'zipCode'),
        countryId: profile.countryId || fallback.countryId || null,
        status: profile.status !== undefined ? profile.status : (fallback.status !== undefined ? fallback.status : null),
        verificationStatus: profile.verificationStatus !== undefined ? profile.verificationStatus : (fallback.verificationStatus !== undefined ? fallback.verificationStatus : null),
        profileImage: profile.profileImage !== undefined ? profile.profileImage : (fallback.profileImage !== undefined ? fallback.profileImage : null),
        createdAt: profile.createdAt || fallback.createdAt || null,
        updatedAt: profile.updatedAt || fallback.updatedAt || null,
        ...extraFields
    };
};

const toPlainArray = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map(item => toPlainObject(item));
};

const DAYS_OF_WEEK = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

// Convert 12-hour format to 24-hour format
const convertTo24Hour = (timeStr) => {
    if (!timeStr || timeStr.trim() === '') return '';
    
    // If already in 24-hour format (HH:MM), return as is
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
        return timeStr;
    }
    
    // Convert 12-hour format (H:MM AM/PM) to 24-hour
    const match = timeStr.match(/^([1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/i);
    if (!match) {
        throw new ApiError(`Invalid time format: "${timeStr}". Expected format: "HH:MM" or "H:MM AM/PM"`, 400);
    }
    
    let [, hour, minute, period] = match;
    hour = parseInt(hour);
    
    if (period.toUpperCase() === 'PM' && hour !== 12) {
        hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute}`;
};

// Validate schedule object format
const validateScheduleObject = (schedule) => {
    if (!schedule || typeof schedule !== 'object') {
        throw new ApiError('Schedule must be an object with day keys', 400);
    }

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const scheduleDays = Object.keys(schedule);

    for (const day of scheduleDays) {
        if (!validDays.includes(day.toLowerCase())) {
            throw new ApiError(`Invalid day: "${day}". Must be one of: ${validDays.join(', ')}`, 400);
        }

        const daySchedule = schedule[day];
        if (daySchedule && typeof daySchedule === 'object') {
            // Validate from/to times if provided
            if (daySchedule.from && typeof daySchedule.from !== 'string') {
                throw new ApiError(`Invalid "from" time for ${day}: must be a string`, 400);
            }
            if (daySchedule.to && typeof daySchedule.to !== 'string') {
                throw new ApiError(`Invalid "to" time for ${day}: must be a string`, 400);
            }
            if (daySchedule.status && !['available', 'unavailable'].includes(daySchedule.status)) {
                throw new ApiError(`Invalid status for ${day}: must be "available" or "unavailable"`, 400);
            }
        }
    }
};

const scheduleArrayToObject = (scheduleArray = []) => {
    if (!Array.isArray(scheduleArray)) {
        return scheduleArray;
    }

    return scheduleArray.reduce((acc, entry = {}) => {
        if (!entry || !entry.day) {
            return acc;
        }

        const dayKey = entry.day.toLowerCase();
        if (!DAYS_OF_WEEK.includes(dayKey)) {
            return acc;
        }

        acc[dayKey] = {
            from: convertTo24Hour(entry.from ?? ''),
            to: convertTo24Hour(entry.to ?? ''),
            status: entry.status || 'available'
        };

        return acc;
    }, {});
};

const scheduleToArray = (schedule) => {
    if (!schedule) {
        return [];
    }

    if (Array.isArray(schedule)) {
        return schedule;
    }

    return DAYS_OF_WEEK
        .filter(day => schedule[day])
        .map(day => ({
            day,
            from: convertTo24Hour(schedule[day]?.from ?? ''),
            to: convertTo24Hour(schedule[day]?.to ?? ''),
            status: schedule[day]?.status || 'available'
        }));
};

// Convert unified schedule format to openingHours format for shops
const scheduleToOpeningHours = (schedule = {}) => {
    if (Array.isArray(schedule)) {
        // Convert array format to object format first
        schedule = schedule.reduce((acc, entry) => {
            if (entry && entry.day) {
                acc[entry.day] = {
                    from: entry.from || '',
                    to: entry.to || '',
                    status: entry.status || 'available'
                };
            }
            return acc;
        }, {});
    }

    console.log('[DEBUG] Original schedule:', JSON.stringify(schedule, null, 2));

    // Ensure we have all days of the week
    const result = DAYS_OF_WEEK.map(day => {
        const daySchedule = schedule[day] || {};
        const hasValidTimes = daySchedule.from && daySchedule.to && daySchedule.from !== '' && daySchedule.to !== '';
        const status = daySchedule.status || 'available';
        
        // Convert times to 24-hour format only if they're provided
        const from24 = hasValidTimes ? convertTo24Hour(daySchedule.from) : '09:00';
        const to24 = hasValidTimes ? convertTo24Hour(daySchedule.to) : '17:00';

        // A day is considered open if it has valid times and is marked as available
        const isOpen = status === 'available' && hasValidTimes;

        const result = {
            day,
            isOpen: false, // Default to closed for empty times
            openTime: from24,
            closeTime: to24
        };

        // Only set isOpen to true if the day has valid times and is marked as available
        if (hasValidTimes && status === 'available') {
            result.isOpen = true;
        }

        console.log(`[DEBUG] Converted ${day}:`, JSON.stringify(result, null, 2));
        return result;
    });

    console.log('[DEBUG] Final result:', JSON.stringify(result, null, 2));
    return result;
};

/**
 * Get user profile based on their role
 * @route GET /api/profile
 * @access Private
 */
const getProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let profile = null;
        let roleData = {};
        let profileType = userRole;

        switch (userRole) {
            case 'customer': {
                profile = await customerService.getCustomerByUserId(userId);

                if (!profile) {
                    try {
                        profile = await customerService.createCustomerProfile(userId, {
                            displayName: req.user.displayName || req.user.email || 'Customer',
                            countryId: req.user.countryId
                        });
                        console.log(`Created new customer profile for user: ${userId}`);
                    } catch (createError) {
                        console.error(`Failed to create customer profile: ${createError.message}`);
                        return next(new ApiError('Failed to create customer profile', 500));
                    }
                }

                profile = toPlainObject(profile) || {};
                roleData = {
                    displayName: profile.displayName || req.user.displayName || req.user.email || null,
                    addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
                    defaultAddress: profile.defaultAddress ?? null,
                    favoriteShops: toPlainArray(profile.favoriteShops),
                    favoriteBarbers: toPlainArray(profile.favoriteBarbers),
                    stripeCustomerId: profile.stripeCustomerId || null,
                    areaId: profile.areaId || null
                };
                break;
            }

            case 'barber': {
                profile = req.user;
                await profile.populate('shopId');
                await profile.populate('services');

                profile = toPlainObject(profile) || {};
                const shop = profile.shopId ? toPlainObject(profile.shopId) : null;

                roleData = {
                    serviceType: profile.serviceType || null,
                    status: profile.status || null,
                    verificationStatus: profile.verificationStatus || null,
                    rating: profile.rating ?? null,
                    reviewCount: profile.reviewCount ?? 0,
                    joinedDate: profile.joinedDate || null,
                    schedule: scheduleToArray(profile.schedule),
                    services: toPlainArray(profile.services),
                    shop,
                    shopId: shop?._id || profile.shopId || null
                };
                break;
            }

            case 'freelancer': {
                try {
                    profile = await freelancerService.getFreelancerByUserId(userId);
                } catch (error) {
                    if (error.message === 'Freelancer profile not found') {
                        try {
                            profile = await freelancerService.createFreelancerProfile(userId, {
                                firstName: req.user.firstName || '',
                                lastName: req.user.lastName || '',
                                email: req.user.email,
                                serviceType: 'homeBased',
                                status: 'inactive',
                                verificationStatus: 'pending'
                            });
                            console.log(`Created new freelancer profile for user: ${userId}`);
                        } catch (createError) {
                            console.error(`Failed to create freelancer profile: ${createError.message}`);
                            return next(new ApiError('Failed to create freelancer profile', 500));
                        }
                    } else {
                        throw error;
                    }
                }

                profile = toPlainObject(profile) || {};
                roleData = {
                    serviceType: profile.serviceType || null,
                    status: profile.status || null,
                    verificationStatus: profile.verificationStatus || null,
                    services: toPlainArray(profile.services),
                    schedule: scheduleToArray(profile.schedule),
                    addresses: toPlainArray(profile.addresses),
                    profileDetails: profile.profile || null
                };
                break;
            }

            case 'shop_owner': {
                profile = await shopOwnerService.getShopOwnerByUserId(userId);

                if (!profile) {
                    profile = req.user;
                }

                if (!profile) {
                    return next(new ApiError('Shop owner profile not found', 404));
                }

                let shops = [];
                try {
                    const profileId = profile._id || userId;
                    shops = await shopOwnerService.getShopsByOwner(profileId);
                } catch (shopsError) {
                    console.error(`Failed to fetch shops for shop owner ${userId}: ${shopsError.message}`);
                }

                profile = toPlainObject(profile) || {};
                const shopsData = toPlainArray(shops).map(shop => ({
                    id: shop._id || null,
                    uid: shop.uid || null,
                    name: shop.name || null,
                    address: shop.address || null,
                    phone: shop.phone || null,
                    email: shop.email || null,
                    latitude: shop.latitude || null,
                    longitude: shop.longitude || null,
                    serviceTypes: shop.serviceTypes || [],
                    verificationStatus: shop.verificationStatus || null,
                    isActive: shop.isActive ?? null,
                    rating: shop.rating ?? null,
                    reviewCount: shop.reviewCount ?? null,
                    images: shop.images || [],
                    mainImage: shop.mainImage || null,
                    amenities: shop.amenities || [],
                    openingHours: shop.openingHours || [],
                    schedules: shop.schedules || [],
                    createdAt: shop.createdAt || null,
                    updatedAt: shop.updatedAt || null
                }));

                roleData = {
                    businessName: profile.businessName || null,
                    businessAddress: profile.businessAddress || null,
                    businessPhone: profile.businessPhone || null,
                    businessEmail: profile.businessEmail || null,
                    taxId: profile.taxId || null,
                    businessRegistrationNumber: profile.businessRegistrationNumber || null,
                    stripeAccountId: profile.stripeAccountId || null,
                    verificationDocuments: profile.verificationDocuments || [],
                    shops: shopsData
                };
                break;
            }

            default:
                return next(new ApiError('Invalid user role for profile access', 403));
        }

        const fallbackUser = toPlainObject(req.user) || {};
        const profilePlain = toPlainObject(profile) || {};
        const roleInfo = toPlainObject(req.role) || {};
        const commonData = buildCommonProfileData(profilePlain, fallbackUser, profileType);
        const responseData = {
            ...commonData,
            roleData: roleData || {},
            permissions: Array.isArray(roleInfo.permissions) ? roleInfo.permissions : []
        };

        return res.status(200).json({
            success: true,
            data: responseData,
            profileType
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        next(error);
    }
};

/**
 * Update user profile based on their role
 * @route PUT /api/profile
 * @access Private
 * @description Updates profile data. All fields are optional. Available fields vary by user role:
 * 
 * Customer: firstName, lastName, phoneNumber, profileImage, stripeCustomerId, 
 *          profile: { phoneNumber, address, city, zipCode }
 * 
 * Barber: firstName, lastName, phoneNumber, profileImage, address, city, zipCode, 
 *        shopId, services, countryId, serviceType, specialization, employmentType, 
 *        bio, displayName, location, servicingArea, schedule, status, nationalId, portfolio
 * 
 * Freelancer: firstName, lastName, phoneNumber, profileImage, address, city, zipCode, 
 *            services, countryId, serviceType, specialization, employmentType, 
 *            bio, displayName, location, servicingArea, schedule, status, nationalId, portfolio
 * 
 * Shop Owner: businessName, businessAddress, businessPhone, businessEmail, 
 *            businessLogo, taxId, businessRegistrationNumber, stripeAccountId, 
 *            verificationDocuments
 */

/**
 * Separate shop-related fields from profile-only fields for shop owners
 * @param {Object} updateData - All update data from request
 * @returns {Object} { shopRelatedFields, profileOnlyFields }
 */
const separateShopRelatedFields = (updateData) => {
    // Fields that affect the shop directly and need approval
    const shopRelatedFieldMappings = {
        // schedule becomes openingHours
        openingHours: 'openingHours',
        // location fields
        location: 'location',
        // business info that maps to shop
        businessName: 'name',
        businessAddress: 'address',
        businessPhone: 'phone',
        businessEmail: 'email'
    };

    const shopRelatedFields = {};
    const profileOnlyFields = {};

    Object.keys(updateData).forEach(key => {
        if (shopRelatedFieldMappings[key]) {
            shopRelatedFields[key] = updateData[key];
        } else {
            profileOnlyFields[key] = updateData[key];
        }
    });

    return { shopRelatedFields, profileOnlyFields };
};

/**
 * Build requested changes map for shop update request
 * @param {Object} shopRelatedFields - Fields that affect the shop
 * @param {Object} currentShop - Current shop document
 * @returns {Map} Requested changes map
 */
const buildRequestedChanges = (shopRelatedFields, currentShop) => {
    const requestedChanges = new Map();

    // Handle opening hours (from schedule)
    if (shopRelatedFields.openingHours) {
        requestedChanges.set('openingHours', {
            fieldName: 'openingHours',
            oldValue: currentShop.openingHours || [],
            newValue: shopRelatedFields.openingHours,
            fieldType: 'openingHours'
        });
    }

    // Handle location
    if (shopRelatedFields.location) {
        // Latitude
        if (shopRelatedFields.location.latitude !== undefined) {
            requestedChanges.set('latitude', {
                fieldName: 'latitude',
                oldValue: currentShop.latitude || null,
                newValue: shopRelatedFields.location.latitude,
                fieldType: 'location'
            });
        }

        // Longitude
        if (shopRelatedFields.location.longitude !== undefined) {
            requestedChanges.set('longitude', {
                fieldName: 'longitude',
                oldValue: currentShop.longitude || null,
                newValue: shopRelatedFields.location.longitude,
                fieldType: 'location'
            });
        }

        // Address
        if (shopRelatedFields.location.address !== undefined) {
            requestedChanges.set('address', {
                fieldName: 'address',
                oldValue: currentShop.address || null,
                newValue: shopRelatedFields.location.address,
                fieldType: 'location'
            });
        }
    }

    // Handle business name
    if (shopRelatedFields.businessName !== undefined) {
        requestedChanges.set('name', {
            fieldName: 'name',
            oldValue: currentShop.name || null,
            newValue: shopRelatedFields.businessName,
            fieldType: 'businessInfo'
        });
    }

    // Handle business address
    if (shopRelatedFields.businessAddress !== undefined) {
        requestedChanges.set('address', {
            fieldName: 'address',
            oldValue: currentShop.address || null,
            newValue: shopRelatedFields.businessAddress,
            fieldType: 'businessInfo'
        });
    }

    // Handle business phone
    if (shopRelatedFields.businessPhone !== undefined) {
        requestedChanges.set('phone', {
            fieldName: 'phone',
            oldValue: currentShop.phone || null,
            newValue: shopRelatedFields.businessPhone,
            fieldType: 'contact'
        });
    }

    // Handle business email
    if (shopRelatedFields.businessEmail !== undefined) {
        requestedChanges.set('email', {
            fieldName: 'email',
            oldValue: currentShop.email || null,
            newValue: shopRelatedFields.businessEmail,
            fieldType: 'contact'
        });
    }

    return requestedChanges;
};
const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const updateData = { ...req.body };

        if ((userRole === 'barber' || userRole === 'freelancer') && updateData.schedule) {
            validateScheduleObject(updateData.schedule);
            updateData.schedule = scheduleArrayToObject(updateData.schedule);
        }

        // Handle schedule updates for shop owners
        if (userRole === 'shop_owner' && updateData.schedule) {
            validateScheduleObject(updateData.schedule);
            updateData.openingHours = scheduleToOpeningHours(updateData.schedule);
            delete updateData.schedule; // Remove schedule from profile update data
        }

        let profile = null;
        let profileType = '';

        // Determine which service to use based on user role
        switch (userRole) {
            case 'customer':
                profile = await customerService.updateCustomerProfile(userId, updateData);
                profileType = 'customer';
                break;

            case 'barber':
                profile = await barberService.updateBarberProfile(userId, updateData);
                
                // If shopId is provided, automatically send a join request
                if (updateData.shopId) {
                    try {
                        await shopJoinRequestService.createJoinRequest(userId, updateData.shopId, 'Profile update: Request to join shop');
                        console.log(`[INFO] Auto join request sent for barber ${userId} to shop ${updateData.shopId}`);
                    } catch (joinError) {
                        // Log the error but don't fail the profile update
                        console.error('Error sending auto join request:', joinError);
                        console.log(`[WARNING] Failed to send auto join request for barber ${userId}, but continuing with profile update`);
                    }
                }
                
                profileType = 'barber';
                break;

            case 'freelancer':
                profile = await freelancerService.updateFreelancerProfile(userId, updateData);
                profileType = 'freelancer';
                break;

            case 'shop_owner':
                // Separate shop-related fields from profile-only fields
                const { shopRelatedFields, profileOnlyFields } = separateShopRelatedFields(updateData);

                // Update profile with non-shop fields
                if (Object.keys(profileOnlyFields).length > 0) {
                    profile = await shopOwnerService.updateShopOwnerProfile(userId, profileOnlyFields);
                }

                // Handle shop-related updates via approval system
                if (Object.keys(shopRelatedFields).length > 0) {
                    try {
                        // Find the shop owner's shop
                        const Shop = require('../../../models/Shop');
                        const shop = await Shop.findOne({ ownerId: userId });

                        if (!shop) {
                            console.log(`[INFO] Shop owner ${userId} tried to update shop details but no shop found. Skipping shop update request.`);
                        } else {
                            // Create shop update request for approval
                            const shopUpdateRequestService = require('../../../services/shopUpdateRequestService');

                            // Build requested changes map
                            const requestedChanges = buildRequestedChanges(shopRelatedFields, shop);

                            await shopUpdateRequestService.createRequest(
                                userId,
                                shop._id,
                                requestedChanges,
                                'medium' // Default priority
                            );

                            console.log(`[INFO] Shop update request created for shop owner ${userId}, shop ${shop._id}`);
                        }
                    } catch (shopError) {
                        // Log the error but don't fail the profile update
                        console.error('Error creating shop update request:', shopError);
                        console.log(`[WARNING] Failed to create shop update request for shop owner ${userId}, but continuing with profile update`);
                    }
                }

                profileType = 'shop_owner';
                break;

            default:
                return next(new ApiError('Invalid user role for profile update', 403));
        }

        // Prepare response message based on what was updated
        let responseMessage = 'Profile updated successfully';
        let hasPendingChanges = false;

        if (userRole === 'shop_owner') {
            const { shopRelatedFields } = separateShopRelatedFields(req.body);
            if (Object.keys(shopRelatedFields).length > 0) {
                responseMessage = 'Profile updated successfully. Shop-related changes are pending admin approval.';
                hasPendingChanges = true;
            }
        }

        res.status(200).json({
            success: true,
            statusCode: 200,
            message: responseMessage,
            hasPendingChanges: hasPendingChanges
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        next(error);
    }
};

/**
 * Get shop update requests for the current shop owner
 * @route GET /api/profile/update-requests
 * @access Private (Shop Owners only)
 */
const getShopUpdateRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        // Only shop owners can access this endpoint
        if (userRole !== 'shop_owner') {
            return next(new ApiError('This endpoint is only available for shop owners', 403));
        }

        const {
            status,
            page = 1,
            limit = 10
        } = req.query;

        const shopUpdateRequestService = require('../../../services/shopUpdateRequestService');
        const result = await shopUpdateRequestService.getRequestsByShopOwner(userId, {
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error fetching shop update requests:', error);
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getShopUpdateRequests
};