import { ApiError } from '../middlewares/errorHandler.js';
import Joi from 'joi';

// Add missing constants used in Joi schemas
const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
};

const SERVICE_TYPES = {
    SHOP_BASED: 'shopBased',
    HOME_BASED: 'homeBased',
    BOTH: 'both'
};

const EMPLOYMENT_TYPES = {
    FULL_TIME: 'fullTime',
    PART_TIME: 'partTime',
    FREELANCE: 'freelance'
};

const PAYMENT_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};

const ROLES = {
    CUSTOMER: 'customer',
    BARBER: 'barber',
    SHOP_OWNER: 'shop_owner',
    FREELANCER: 'freelancer',
    ADMIN: 'admin'
};

/**
 * Reconstructs arrays from FormData that uses bracket notation (e.g., services[0], services[1])
 * @param {Object} formData - The parsed FormData object from multer
 * @returns {Object} - The reconstructed object with proper arrays
 */
const reconstructFormDataArrays = (formData) => {
    const result = { ...formData };
    
    // Find all keys that match array notation
    const arrayKeys = new Set();
    Object.keys(formData).forEach(key => {
        const match = key.match(/^(.+)\[(\d+)\]$/);
        if (match) {
            arrayKeys.add(match[1]);
        }
    });
    
    // Reconstruct arrays
    arrayKeys.forEach(arrayKey => {
        const arrayItems = [];
        let index = 0;
        
        // Collect all items for this array
        while (formData[`${arrayKey}[${index}]`] !== undefined) {
            arrayItems.push(formData[`${arrayKey}[${index}]`]);
            index++;
        }
        
        // Set the reconstructed array
        result[arrayKey] = arrayItems;
        
        // Remove the individual array items
        for (let i = 0; i < index; i++) {
            delete result[`${arrayKey}[${i}]`];
        }
    });
    
    // Handle nested objects like schedule[monday][from]
    const nestedKeys = new Set();
    Object.keys(result).forEach(key => {
        const match = key.match(/^(.+)\[(.+)\]\[(.+)\]$/);
        if (match) {
            nestedKeys.add(`${match[1]}.${match[2]}.${match[3]}`);
        }
    });
    
    // Reconstruct nested objects
    nestedKeys.forEach(nestedKey => {
        const [parentKey, childKey, prop] = nestedKey.split('.');
        if (!result[parentKey]) result[parentKey] = {};
        if (!result[parentKey][childKey]) result[parentKey][childKey] = {};
        result[parentKey][childKey][prop] = result[`${parentKey}[${childKey}][${prop}]`];
        delete result[`${parentKey}[${childKey}][${prop}]`];
    });
    
    return result;
};

const validate = (schema, type = 'body') => {
    return (req, res, next) => {
        let data = req[type];
        
        // Handle FormData - multer populates req.body with form fields
        // For FormData requests, data is already available directly on req.body
        if (type === 'body' && req.body && !req.body.data) {
            // This is a FormData request, data is already parsed by multer
            data = reconstructFormDataArrays(req.body);
            console.log(`[DEBUG] Using FormData from req.body:`, JSON.stringify(data, null, 2));
        }
        
        // Handle FormData with JSON payload (fallback for mixed requests)
        if (type === 'body' && req.body && req.body.data) {
            try {
                data = JSON.parse(req.body.data);
                console.log(`[DEBUG] Parsed JSON data from FormData:`, JSON.stringify(data, null, 2));
            } catch (parseError) {
                console.log(`[DEBUG] Failed to parse JSON data:`, parseError.message);
                return next(new ApiError('Invalid JSON data in request', 400));
            }
        }
        
        console.log(`[DEBUG] Original ${type} data:`, JSON.stringify(data, null, 2));
        console.log(`[DEBUG] Data before validation:`, JSON.stringify(data, null, 2));
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: false,
            allowUnknown: true
        });

        console.log(`[DEBUG] Validation result:`, {
            error: error ? JSON.stringify(error.details, null, 2) : null,
            value: JSON.stringify(value, null, 2)
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            console.log(`[DEBUG] Validation errors:`, JSON.stringify(errors, null, 2));
            return next(new ApiError('Validation error', 400, errors));
        }

        console.log(`[DEBUG] Assigning validated data to req.${type}:`, JSON.stringify(value, null, 2));
        req[type] = value;
        console.log(`[DEBUG] Request data after validation:`, JSON.stringify(req[type], null, 2));

        next();
    };
};

/**
 * User validation schemas
 */
const userSchemas = {
    // Register new user
    register: Joi.object({
        email: Joi.string().email().required().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        password: Joi.string().min(8).required().pattern(REGEX.PASSWORD)
            .message('Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'),
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phoneNumber: Joi.string().optional(),
        role: Joi.string().valid('customer', 'barber', 'shop_owner', 'freelancer').required(),
        addresses: Joi.array().items(Joi.object({
            street: Joi.string().required(),
            city: Joi.string().required(),
            state: Joi.string().required(),
            zipCode: Joi.string().required(),
            country: Joi.string().required()
        })).optional().allow(null),
        // Barber and Freelancer specific fields - now optional
        serviceType: Joi.string().valid('homeBased', 'shopBased', 'both').optional(),
        schedule: Joi.object().pattern(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/, Joi.object({
            from: Joi.when('status', {
                is: 'unavailable',
                then: Joi.string().allow(''),
                otherwise: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
            }),
            to: Joi.when('status', {
                is: 'unavailable',
                then: Joi.string().allow(''),
                otherwise: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
            }),
            status: Joi.string().valid('available', 'unavailable').required()
        })).when('role', {
            is: Joi.valid('barber', 'freelancer'),
            then: Joi.optional(),
            otherwise: Joi.optional()
        }),
        services: Joi.array().items(Joi.string()).optional(),
        location: Joi.when('role', {
            is: 'freelancer',
            then: Joi.object({
                coordinates: Joi.array().items(Joi.number()).length(2).required(),
                formattedAddress: Joi.string().required()
            }).optional(),
            otherwise: Joi.optional()
        }),
        countryId: Joi.string().hex().length(24).optional().allow('', null)
    }),

    // Login user
    login: Joi.object({
        email: Joi.string().email().required().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        password: Joi.string().required(),
        fcmToken: Joi.string().optional()
    }),

    // Update user profile
    updateProfile: Joi.object({
        firstName: Joi.string().min(2).max(50),
        lastName: Joi.string().min(2).max(50),
        phoneNumber: Joi.string(),
        profileImage: Joi.string()
    }),

    // Change password
    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(8).required().pattern(REGEX.PASSWORD)
            .message('New password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'),
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
            .messages({ 'any.only': 'Passwords do not match' })
    }),

    // Reset password request
    resetPasswordRequest: Joi.object({
        email: Joi.string().email().required().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address')
    }),

    // Reset password
    resetPassword: Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(8).required().pattern(REGEX.PASSWORD)
            .message('Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character')
    })
};

/**
 * Admin validation schemas
 */
const adminSchemas = {
    // Create user
    createUser: Joi.object({
        email: Joi.string().email().required().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        password: Joi.string().min(8).required().pattern(REGEX.PASSWORD)
            .message('Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'),
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phoneNumber: Joi.string(),
        role: Joi.string().required(),
        isActive: Joi.boolean().default(true),
        status: Joi.string().valid('active', 'inactive').default('active'),
        emailVerified: Joi.boolean().default(false)
    }),

    // Update user
    updateUser: Joi.object({
        firstName: Joi.string().min(2).max(50),
        lastName: Joi.string().min(2).max(50),
        phoneNumber: Joi.string(),
        role: Joi.string(),
        isActive: Joi.boolean(),
        status: Joi.string().valid('active', 'inactive')
    }),

    // Create role
    createRole: Joi.object({
        name: Joi.string().min(2).max(50).required(),
        description: Joi.string().max(255),
        permissions: Joi.array().items(Joi.string()).required()
    }),

    // Update role
    updateRole: Joi.object({
        name: Joi.string().min(2).max(50),
        description: Joi.string().max(255),
        permissions: Joi.array().items(Joi.string())
    }),

    // Create setting
    createSetting: Joi.object({
        key: Joi.string().required(),
        value: Joi.any().required(),
        description: Joi.string(),
        type: Joi.string().valid('string', 'number', 'boolean', 'object', 'array').required()
    }),

    // Update email settings
    updateEmailSettings: Joi.object({
        smtpHost: Joi.string().required(),
        smtpPort: Joi.number().required(),
        smtpUser: Joi.string().required(),
        smtpPassword: Joi.string().required(),
        senderEmail: Joi.string().email().required(),
        senderName: Joi.string().required()
    }),

    // Update payment settings
    updatePaymentSettings: Joi.object({
        stripeSecretKey: Joi.string(),
        stripePublishableKey: Joi.string(),
        stripeCurrency: Joi.string().default('usd'),
        stripeWebhookSecret: Joi.string(),
        taxRate: Joi.number().min(0).max(100),
        commissionRate: Joi.number().min(0).max(100)
    }),

    // Update notification settings
    updateNotificationSettings: Joi.object({
        pushEnabled: Joi.boolean().default(true),
        emailEnabled: Joi.boolean().default(true),
        smsEnabled: Joi.boolean().default(false),
        reminderTime: Joi.number().integer().min(1).default(24) // Hours before appointment
    }),

    // Create barber (admin function)
    createBarber: Joi.object({
        // User account information
        email: Joi.string().email().required().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        password: Joi.string().min(8).required().pattern(REGEX.PASSWORD)
            .message('Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'),
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phoneNumber: Joi.string(),
        address: Joi.string().required(),
        city: Joi.string().required(),
        zipCode: Joi.string().required(),
        // Barber profile information
        shopId: Joi.string().hex().length(24).allow(null),
        services: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
        countryId: Joi.string().hex().length(24).required(),
        serviceType: Joi.string().valid('homeBased', 'shopBased', 'both').required(),
        schedule: Joi.object().pattern(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/, Joi.object({
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
            status: Joi.string().valid('available', 'unavailable').required()
        })).required(),
        // Profile image
        profileImage: Joi.string().uri().allow(null, ''),
        // National ID information (optional)
        nationalId: Joi.object({
            idNumber: Joi.string(),
            idImageUrl: Joi.string(),
            expiryDate: Joi.date().allow(null)
        }).optional()
    }),

    // Update barber (admin function)
    updateBarber: Joi.object({
        // Barber profile information
        firstName: Joi.string().min(2).max(50),
        lastName: Joi.string().min(2).max(50),
        phoneNumber: Joi.string().allow(''),
        address: Joi.string().allow(''),
        city: Joi.string().allow(''),
        zipCode: Joi.string().allow(''),
        password: Joi.string().min(8).pattern(REGEX.PASSWORD).allow(null, ''),
        shopId: Joi.string().hex().length(24).allow(null, ''),
        services: Joi.array().items(Joi.string().hex().length(24)).allow(null),
        countryId: Joi.string().hex().length(24).allow(null),
        serviceType: Joi.string().valid('homeBased', 'shopBased', 'both'),
        schedule: Joi.object().pattern(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/, Joi.object({
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
            status: Joi.string().valid('available', 'unavailable').required()
        })),
        status: Joi.string().valid('active', 'inactive', 'onLeave', 'online', 'offline', 'blocked'),
        verificationStatus: Joi.string().valid('pending', 'verified', 'rejected'),
        blockReason: Joi.string().when('status', {
            is: 'blocked',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),
        // Profile image
        profileImage: Joi.string().allow(null, ''),
        // National ID information (optional)
        nationalId: Joi.object({
            idNumber: Joi.string().allow(''),
            idImageUrl: Joi.string().allow(''),
            expiryDate: Joi.date().allow(null)
        }).optional()
    }),

    // Update freelancer (admin function)
    updateFreelancer: Joi.object({
        // Freelancer profile information
        firstName: Joi.string().min(2).max(50),
        lastName: Joi.string().min(2).max(50),
        phoneNumber: Joi.string().allow(''),
        address: Joi.string().allow(''),
        city: Joi.string().allow(''),
        zipCode: Joi.string().allow(''),
        password: Joi.string().min(8).pattern(REGEX.PASSWORD).allow(null, ''),
        services: Joi.array().items(Joi.string().hex().length(24)).allow(null),
        countryId: Joi.string().hex().length(24).allow(null),
        serviceType: Joi.string().valid('homeBased'),
        schedule: Joi.object().pattern(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/, Joi.object({
            from: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
            to: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(''),
            status: Joi.string().valid('available', 'unavailable').required()
        })),
        status: Joi.string().valid('active', 'inactive', 'pending', 'rejected'),
        verificationStatus: Joi.string().valid('pending', 'verified', 'rejected'),
        rejectionReason: Joi.string().when('status', {
            is: 'rejected',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),
        // Profile image
        profileImage: Joi.string().allow(null, ''),
        // National ID information (optional)
        nationalId: Joi.object({
            idNumber: Joi.string().allow(''),
            idImageUrl: Joi.string().allow(''),
            expiryDate: Joi.date().allow(null)
        }).optional()
    }),

    // Add barber service
    addBarberService: Joi.object({
        serviceId: Joi.string().hex().length(24).required()
    }),

    // Update shop owner
    updateShopOwner: Joi.object({
        verificationStatus: Joi.string().valid('pending', 'verified', 'rejected'),
        rejectionReason: Joi.string()
    }),

    // Update shop
    updateShop: Joi.object({
        name: Joi.string().min(2).max(100),
        description: Joi.string().max(500),
        images: Joi.array().items(Joi.string()),
        logo: Joi.string(),
        location: Joi.object({
            address: Joi.string(),
            latitude: Joi.number(),
            longitude: Joi.number(),
            formattedAddress: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            country: Joi.string(),
            postalCode: Joi.string()
        }),
        contactPhone: Joi.string(),
        contactEmail: Joi.string().email().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        businessHours: Joi.array().items(Joi.object({
            day: Joi.number().integer().min(0).max(6).required(),
            openTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            closeTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            isClosed: Joi.boolean().default(false)
        })),
        serviceTypes: Joi.array().items(Joi.string().valid(...Object.values(SERVICE_TYPES))),
        services: Joi.array().items(Joi.string().hex().length(24))
            .messages({
                'string.hex': 'Service ID must be a valid ObjectId',
                'string.length': 'Service ID must be 24 characters long'
            }),
        amenities: Joi.array().items(Joi.string()),
        socialLinks: Joi.object({
            website: Joi.string().uri(),
            instagram: Joi.string(),
            facebook: Joi.string(),
            twitter: Joi.string(),
            youtube: Joi.string()
        }),
        isActive: Joi.boolean()
    }),

    // Create shop (for admin)
    createShop: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        address: Joi.string().required(),
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
        phone: Joi.string().required(),
        email: Joi.string().email(),
        description: Joi.string(),
        images: Joi.array().items(Joi.string()),
        mainImage: Joi.string().optional().allow(''),
        openingHours: Joi.array().items(Joi.object({
            day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
            isOpen: Joi.boolean().default(true),
            openTime: Joi.string(),
            closeTime: Joi.string()
        })),
        serviceTypes: Joi.array().items(Joi.string().valid('shopBased', 'homeBased')),
        isVerified: Joi.boolean().default(true),
        isActive: Joi.boolean().default(true),
        amenities: Joi.array().items(Joi.string()),
        socialMedia: Joi.object({
            facebook: Joi.string(),
            instagram: Joi.string(),
            twitter: Joi.string(),
            website: Joi.string()
        }),
        countryId: Joi.string().hex().length(24).required(),
        cityId: Joi.string().hex().length(24).optional().allow(''),
        areaId: Joi.string().hex().length(24).optional().allow(''),
        services: Joi.array().items(Joi.string().hex().length(24)).optional()
    }),

    // Create shop owner (for admin)
    createShopOwner: Joi.object({
        // User account info
        email: Joi.string().email().required().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        password: Joi.string().min(8).pattern(REGEX.PASSWORD)
            .message('Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character'),
        firstName: Joi.string().min(2).max(50).required(),
        lastName: Joi.string().min(2).max(50).required(),
        phoneNumber: Joi.string().allow(''),
        address: Joi.string().allow(''),
        city: Joi.string().allow(''),
        zipCode: Joi.string().allow(''),

        // Business info
        businessName: Joi.string().min(3).max(100).required(),
        businessAddress: Joi.string().required(),
        businessPhone: Joi.string().required(),
        businessEmail: Joi.string().email().required().pattern(REGEX.EMAIL)
            .message('Please provide a valid business email address'),
        businessLogo: Joi.string().allow(''),
        businessRegistrationDoc: Joi.string().allow(''),
        taxId: Joi.string().allow(''),
        businessRegistrationNumber: Joi.string().allow(''),
        stripeAccountId: Joi.string().allow(''),
        operatingCountries: Joi.array().items(Joi.string().hex().length(24)),
        countryId: Joi.string().hex().length(24).required(),
        shopId: Joi.string().hex().length(24).optional(),
        verificationStatus: Joi.string().valid('pending', 'verified', 'rejected').default('verified')
    }),

    createPlatformFee: Joi.object({
        countryId: Joi.string().hex().length(24).optional().allow('', null),
        freelanceBarberFee: Joi.number().min(0).max(100).required()
            .messages({
                'number.base': 'Freelance barber fee must be a number',
                'number.min': 'Freelance barber fee must be at least 0',
                'number.max': 'Freelance barber fee cannot exceed 100',
                'any.required': 'Freelance barber fee is required'
            }),
        shopFee: Joi.number().min(0).max(100).required()
            .messages({
                'number.base': 'Shop fee must be a number',
                'number.min': 'Shop fee must be at least 0',
                'number.max': 'Shop fee cannot exceed 100',
                'any.required': 'Shop fee is required'
            }),
        isActive: Joi.boolean().default(true)
    }),
    updatePlatformFee: Joi.object({
        freelanceBarberFee: Joi.number().min(0).max(100).required()
            .messages({
                'number.base': 'Freelance barber fee must be a number',
                'number.min': 'Freelance barber fee must be at least 0',
                'number.max': 'Freelance barber fee cannot exceed 100',
                'any.required': 'Freelance barber fee is required'
            }),
        shopFee: Joi.number().min(0).max(100).required()
            .messages({
                'number.base': 'Shop fee must be a number',
                'number.min': 'Shop fee must be at least 0',
                'number.max': 'Shop fee cannot exceed 100',
                'any.required': 'Shop fee is required'
            }),
        isActive: Joi.boolean().default(true)
    }),

    // Create category
    createCategory: Joi.object({
        name: Joi.string().min(2).max(50).required()
            .messages({
                'string.empty': 'Category name is required',
                'string.min': 'Category name must be at least 2 characters long',
                'string.max': 'Category name cannot exceed 50 characters',
                'any.required': 'Category name is required'
            }),
        description: Joi.string().max(255).allow(null, '')
            .messages({
                'string.max': 'Category description cannot exceed 255 characters'
            }),
        icon: Joi.string().max(100).allow(null, '')
            .messages({
                'string.max': 'Category icon cannot exceed 100 characters'
            }),
        isActive: Joi.boolean().default(true)
    }),

    // Update category
    updateCategory: Joi.object({
        name: Joi.string().min(2).max(50)
            .messages({
                'string.min': 'Category name must be at least 2 characters long',
                'string.max': 'Category name cannot exceed 50 characters'
            }),
        description: Joi.string().max(255).allow(null, '')
            .messages({
                'string.max': 'Category description cannot exceed 255 characters'
            }),
        icon: Joi.string().max(100).allow(null, '')
            .messages({
                'string.max': 'Category icon cannot exceed 100 characters'
            }),
        isActive: Joi.boolean()
    }),

    // Block barber
    blockBarber: Joi.object({
        blockReason: Joi.string().min(1).max(500).required()
            .messages({
                'string.empty': 'Block reason is required',
                'string.min': 'Block reason must be at least 1 character long',
                'string.max': 'Block reason cannot exceed 500 characters',
                'any.required': 'Block reason is required'
            })
    })
};

/**
 * Barber validation schemas
 */
const barberSchemas = {
    // Create barber profile
    createBarber: Joi.object({
        displayName: Joi.string().min(2).max(50).required(),
        bio: Joi.string().max(500),
        employmentType: Joi.string().valid(...Object.values(EMPLOYMENT_TYPES)).required(),
        yearsOfExperience: Joi.number().integer().min(0),
        specialties: Joi.array().items(Joi.string()),
        languages: Joi.array().items(Joi.string()),
        shopId: Joi.string().hex().length(24),
        location: Joi.object({
            address: Joi.string().required(),
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            formattedAddress: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            country: Joi.string(),
            postalCode: Joi.string()
        }),
        availability: Joi.array().items(Joi.object({
            day: Joi.number().integer().min(0).max(6).required(),
            startTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            endTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            isAvailable: Joi.boolean().default(true)
        })),
        profileImage: Joi.string(),
        servicesOffered: Joi.array().items(Joi.string().hex().length(24))
    }),

    // Update barber profile
    updateBarber: Joi.object({
        displayName: Joi.string().min(2).max(50),
        bio: Joi.string().max(500),
        employmentType: Joi.string().valid(...Object.values(EMPLOYMENT_TYPES)),
        yearsOfExperience: Joi.number().integer().min(0),
        specialties: Joi.array().items(Joi.string()),
        languages: Joi.array().items(Joi.string()),
        shopId: Joi.string().hex().length(24),
        status: Joi.string().valid('pending', 'active', 'inactive'),
        location: Joi.object({
            address: Joi.string(),
            latitude: Joi.number(),
            longitude: Joi.number(),
            formattedAddress: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            country: Joi.string(),
            postalCode: Joi.string()
        }),
        availability: Joi.array().items(Joi.object({
            day: Joi.number().integer().min(0).max(6).required(),
            startTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            endTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            isAvailable: Joi.boolean().default(true)
        })),
        profileImage: Joi.string(),
        servicesOffered: Joi.array().items(Joi.string().hex().length(24)),
        rejectionReason: Joi.string()
    })
};

/**
 * Booking validation schemas
 */
const bookingSchemas = {
    // Create booking
    createBooking: Joi.object({
        customerId: Joi.string().hex().length(24).required(),
        barberId: Joi.string().hex().length(24).required(), // Can be shop owner, barber, or freelancer ID
        serviceId: Joi.string().hex().length(24).required(),
        serviceType: Joi.string().valid('shopBased', 'homeBased').required(),
        countryId: Joi.string().hex().length(24).optional().allow('', null),
        bookingDate: Joi.date().min(new Date().setHours(0,0,0,0)).required(),
        bookingTime: Joi.object({
            hour: Joi.number().integer().min(0).max(23).required(),
            minute: Joi.number().integer().min(0).max(59).required()
        }).required(),
        notes: Joi.string().max(500)
    }),
        isHomeService: Joi.boolean().default(false),
        addressIndex: Joi.number().integer().min(0),
        customAddress: Joi.object({
            address: Joi.string(),
            latitude: Joi.number(),
            longitude: Joi.number(),
            formattedAddress: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            country: Joi.string(),
            postalCode: Joi.string()
        })
    ,

    // Update booking status
    updateStatus: Joi.object({
        status: Joi.string().valid('pending', 'assigned', 'confirmed', 'completed', 'cancelled', 'noShow', 'rejected', 'reassigned').required(),
        reason: Joi.string().max(500)
    }),

    // Rate booking
    rateBooking: Joi.object({
        rating: Joi.number().min(1).max(5).required(),
        review: Joi.string().max(500)
    }),

    // Process payment
    processPayment: Joi.object({
        paymentMethod: Joi.string().valid('card', 'cash', 'wallet').required(),
        stripePaymentMethodId: Joi.string(),
        paymentDetails: Joi.object()
    }),

    // Accept booking request
    acceptBookingRequest: Joi.object({
        reason: Joi.string().max(500)
    }),

    // Reject booking request
    rejectBookingRequest: Joi.object({
        reason: Joi.string().min(1).max(500).optional()
    }),

    // Reassign booking
    reassignBooking: Joi.object({
        newBarberId: Joi.string().hex().length(24).required(),
        shopOwnerId: Joi.string().hex().length(24).required()
    }),

    // Update booking details (for customers)
    updateBookingDetails: Joi.object({
        bookingDate: Joi.date().min(new Date().setHours(0,0,0,0)).optional(),
        bookingTime: Joi.alternatives().try(
            Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }),
            Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        ).optional(),
        notes: Joi.string().max(500).optional()
    }).or('bookingDate', 'bookingTime', 'notes'),

    // Cancel booking (for customers)
    cancelBooking: Joi.object({
        reason: Joi.string().max(500)
            .messages({
                'string.max': 'Cancellation reason cannot exceed 500 characters'
            }).optional()
    })
};
const customerSchemas = {
    // Create customer profile
    createCustomer: Joi.object({
        displayName: Joi.string().min(2).max(50),
        profileImage: Joi.string(),
        countryId: Joi.string().hex().length(24).optional().allow('', null),
        addresses: Joi.array().items(Joi.object({
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            formattedAddress: Joi.string(), // Made optional
        }))
    }),

    // Update customer profile
    updateCustomer: Joi.object({
        firstName: Joi.string().min(2).max(50),
        lastName: Joi.string().min(2).max(50),
        phoneNumber: Joi.string(),
        profileImage: Joi.string().uri(),
        stripeCustomerId: Joi.string(),
        profile: Joi.object({
            phoneNumber: Joi.string(),
            address: Joi.string(),
            city: Joi.string(),
            zipCode: Joi.string()
        })
    }),

    // Create address
    createAddress: Joi.object({
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
        formattedAddress: Joi.string(), // Made optional
    }),

    // Update address
    updateAddress: Joi.object({
        latitude: Joi.number(),
        longitude: Joi.number(),
        formattedAddress: Joi.string(),
    })
};

/**
 * Service validation schemas
 */
const serviceSchemas = {
    createService: Joi.object({
        title: Joi.string().min(3).max(100).required(),
        description: Joi.string().min(10).required(),
        category: Joi.string().required(),
        shopId: Joi.string().hex().length(24).allow(null),
        barberId: Joi.string().hex().length(24).allow(null)
    }),

    updateService: Joi.object({
        title: Joi.string().min(3).max(100),
        description: Joi.string().min(10),
        category: Joi.string(),
        shopId: Joi.string().hex().length(24).allow(null),
        barberId: Joi.string().hex().length(24).allow(null)
    }),

    approveService: Joi.object({
        status: Joi.string().valid('active', 'rejected').required(),
        rejectionReason: Joi.when('status', {
            is: 'rejected',
            then: Joi.string().required(),
            otherwise: Joi.string().allow(null, '')
        })
    })
};

/**
 * Shop validation schemas
 */
const shopSchemas = {
    // Review join request
    reviewJoinRequest: Joi.object({
        requestId: Joi.string().hex().length(24).required()
            .messages({
                'string.hex': 'Request ID must be a valid ObjectId',
                'string.length': 'Request ID must be 24 characters long',
                'any.required': 'Request ID is required'
            }),
        status: Joi.string().valid('approve', 'reject', 'linked', 'unlinked').required()
            .messages({
                'any.only': 'Status must be one of: approve, reject, linked, unlinked',
                'any.required': 'Status is required'
            })
    }),
    // Create shop
    createShop: Joi.object({
        name: Joi.string().min(2).max(100).required(),
        description: Joi.string().max(500),
        images: Joi.array().items(Joi.string()),
        logo: Joi.string(),
        location: Joi.object({
            address: Joi.string().required(),
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            formattedAddress: Joi.string(), // Made optional
            city: Joi.string(),
            state: Joi.string(),
            country: Joi.string(),
            postalCode: Joi.string()
        }).required(),
        contactPhone: Joi.string(),
        contactEmail: Joi.string().email().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        businessHours: Joi.array().items(Joi.object({
            day: Joi.number().integer().min(0).max(6).required(),
            openTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            closeTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            isClosed: Joi.boolean().default(false)
        })),
        serviceTypes: Joi.array().items(Joi.string().valid(...Object.values(SERVICE_TYPES))),
        services: Joi.array().items(Joi.string().hex().length(24))
            .messages({
                'string.hex': 'Service ID must be a valid ObjectId',
                'string.length': 'Service ID must be 24 characters long'
            }),
        amenities: Joi.array().items(Joi.string()),
        socialLinks: Joi.object({
            website: Joi.string().uri(),
            instagram: Joi.string(),
            facebook: Joi.string(),
            twitter: Joi.string(),
            youtube: Joi.string()
        })
    }),

    // Update shop
    updateShop: Joi.object({
        name: Joi.string().min(2).max(100),
        description: Joi.string().max(500),
        images: Joi.array().items(Joi.string()),
        logo: Joi.string(),
        location: Joi.object({
            address: Joi.string(),
            latitude: Joi.number(),
            longitude: Joi.number(),
            formattedAddress: Joi.string(),
            city: Joi.string(),
            state: Joi.string(),
            country: Joi.string(),
            postalCode: Joi.string()
        }),
        contactPhone: Joi.string(),
        contactEmail: Joi.string().email().pattern(REGEX.EMAIL)
            .message('Please provide a valid email address'),
        businessHours: Joi.array().items(Joi.object({
            day: Joi.number().integer().min(0).max(6).required(),
            openTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            closeTime: Joi.object({
                hour: Joi.number().integer().min(0).max(23).required(),
                minute: Joi.number().integer().min(0).max(59).required()
            }).required(),
            isClosed: Joi.boolean().default(false)
        })),
        serviceTypes: Joi.array().items(Joi.string().valid(...Object.values(SERVICE_TYPES))),
        services: Joi.array().items(Joi.string().hex().length(24))
            .messages({
                'string.hex': 'Service ID must be a valid ObjectId',
                'string.length': 'Service ID must be 24 characters long'
            }),
        amenities: Joi.array().items(Joi.string()),
        socialLinks: Joi.object({
            website: Joi.string().uri(),
            instagram: Joi.string(),
            facebook: Joi.string(),
            twitter: Joi.string(),
            youtube: Joi.string()
        }),
        isActive: Joi.boolean()
    }),

    // Verify shop
    verifyShop: Joi.object({
        isVerified: Joi.boolean().required(),
        rejectionReason: Joi.string().when('isVerified', {
            is: false,
            then: Joi.string(),
            otherwise: Joi.string().allow(null, '')
        })
    })
};

/**
 * Shop Owner validation schemas
 */
const shopOwnerSchemas = {
    // Create shop owner profile
    createShopOwnerProfile: Joi.object({
        businessName: Joi.string().min(3).max(100).optional()
            .messages({ 'string.min': 'Business name must be between 3 and 100 characters' }),
        businessAddress: Joi.string().optional(),
        businessPhone: Joi.string().optional()
            .messages({ 'string.pattern.base': 'Please provide a valid business phone number' }),
        businessEmail: Joi.string().email().pattern(REGEX.EMAIL).optional()
            .messages({ 'string.pattern.base': 'Please provide a valid business email address' }),
        businessLogo: Joi.string().allow(null),
        taxId: Joi.string().optional(),
        businessRegistrationNumber: Joi.string().optional(),
        stripeAccountId: Joi.string().allow(null),
        verificationDocuments: Joi.array().items(Joi.string()),
        countryId: Joi.string().hex().length(24).optional().allow('', null)
    }),

    // Update shop owner profile
    updateShopOwnerProfile: Joi.object({
        businessName: Joi.string().min(3).max(100),
        businessAddress: Joi.string(),
        businessPhone: Joi.string()
            .messages({ 'string.pattern.base': 'Please provide a valid business phone number' }),
        businessEmail: Joi.string().email().pattern(REGEX.EMAIL)
            .messages({ 'string.pattern.base': 'Please provide a valid business email address' }),
        businessLogo: Joi.string().allow(null),
        taxId: Joi.string(),
        businessRegistrationNumber: Joi.string(),
        stripeAccountId: Joi.string().allow(null),
        verificationDocuments: Joi.array().items(Joi.string())
    }),

    // Update verification status
    updateVerificationStatus: Joi.object({
        status: Joi.string().valid('pending', 'verified', 'rejected').required(),
        rejectionReason: Joi.string().when('status', {
            is: 'rejected',
            then: Joi.string().required(),
            otherwise: Joi.string().allow(null, '')
        })
    })
};

/**
 * Payment validation schemas
 */
const paymentSchemas = {
    // Create payment
    createPayment: Joi.object({
        bookingId: Joi.string().hex().length(24).required(),
        paymentMethod: Joi.string().valid('card', 'cash', 'wallet').required(),
        stripePaymentMethodId: Joi.string(),
        paymentDetails: Joi.object()
    }),

    // Update payment status
    updateStatus: Joi.object({
        status: Joi.string().valid(...Object.values(PAYMENT_STATUS)).required()
    }),

    // Refund payment
    refundPayment: Joi.object({
        amount: Joi.number().min(0),
        reason: Joi.string().max(500)
    }),

    // Create or process a cash payment
    processCashPayment: Joi.object({
        bookingId: Joi.string().hex().length(24).required()
            .messages({
                'string.hex': 'Booking ID must be a valid ID',
                'string.length': 'Booking ID must be 24 characters long',
                'any.required': 'Booking ID is required'
            })
    }),

    // Create a payment intent for Stripe
    createPaymentIntent: Joi.object({
        bookingId: Joi.string().hex().length(24).required()
            .messages({
                'string.hex': 'Booking ID must be a valid ID',
                'string.length': 'Booking ID must be 24 characters long',
                'any.required': 'Booking ID is required'
            })
    }),

    // Confirm a Stripe payment
    confirmPayment: Joi.object({
        paymentIntentId: Joi.string().required()
            .messages({
                'any.required': 'Payment Intent ID is required'
            }),
        bookingId: Joi.string().hex().length(24).required()
            .messages({
                'string.hex': 'Booking ID must be a valid ID',
                'string.length': 'Booking ID must be 24 characters long',
                'any.required': 'Booking ID is required'
            })
    }),

    // Cancel a booking with optional reason
    cancelBooking: Joi.object({
        reason: Joi.string().max(500)
            .messages({
                'string.max': 'Cancellation reason cannot exceed 500 characters'
            })
    }),

    // Reassign booking to another barber/freelancer/shop owner
    reassignBooking: Joi.object({
        newBarberId: Joi.string().hex().length(24).required()
            .messages({
                'string.hex': 'Barber ID must be a valid ID',
                'string.length': 'Barber ID must be 24 characters long',
                'any.required': 'Barber ID is required'
            })
    })
};

/**
 * Notification validation schemas
 */
const notificationSchemas = {
    // Send notification
    sendNotification: Joi.object({
        userId: Joi.string().hex().length(24).required(),
        title: Joi.string().required().max(100),
        message: Joi.string().required().max(500),
        type: Joi.string().valid('system', 'booking', 'payment', 'offer'),
        relatedId: Joi.string().hex().length(24),
        onModel: Joi.string().valid('Booking', 'Payment', 'Shop', 'Barber', 'Service')
    }),

    // Send to all
    sendToAll: Joi.object({
        title: Joi.string().required().max(100),
        message: Joi.string().required().max(500),
        role: Joi.string().valid(...Object.values(ROLES))
    })
};

export {
    validate,
    userSchemas,
    adminSchemas,
    barberSchemas,
    bookingSchemas,
    customerSchemas,
    serviceSchemas,
    shopSchemas,
    shopOwnerSchemas,
    paymentSchemas,
    notificationSchemas
};