// src/api/admin/routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { authenticate, authorize, requirePermission, checkCountryAccess } = require('../../middlewares/auth');
const { validate, adminSchemas, barberSchemas } = require('../../utils/validators');

// Import controllers
const userController = require('./controllers/userController');
// ...existing code...
const roleController = require('./controllers/roleController');
const dashboardController = require('./controllers/dashboardController');
const reportController = require('./controllers/reportController');
const settingsController = require('./controllers/settingsController');
const barberAdminController = require('./controllers/barberAdminController');
const freelancerAdminController = require('./controllers/freelancerAdminController');
const shopOwnerAdminController = require('./controllers/shopOwnerAdminController');
const shopAdminController = require('./controllers/shopAdminController');
const customerAdminController = require('./controllers/customerAdminController');
const countryManagerController = require('./controllers/countryManagerController');
const locationController = require('./controllers/locationController');
const customerCareController = require('./controllers/customerCareController');
const platformFeeController = require('./controllers/platformFeeController');
const analyticsController = require('./controllers/analyticsController');
const shopUpdateRequestAdminController = require('./controllers/shopUpdateRequestAdminController');



// All admin routes require authentication
router.use(authenticate);

// All admin routes require admin role
router.use(authorize('admin'));

router.get('/analytics', analyticsController.getAnalytics);

// Dashboard routes
router.get('/dashboard', dashboardController.getDashboardStats);
router.get('/dashboard/bookings-stats', dashboardController.getBookingStats);
router.get('/dashboard/revenue-stats', dashboardController.getRevenueStats);
router.get('/dashboard/user-stats', dashboardController.getUserStats);
router.get('/dashboard/popular-services', dashboardController.getPopularServices);
router.get('/dashboard/top-barbers', dashboardController.getTopBarbers);
router.get('/dashboard/top-shops', dashboardController.getTopShops);
router.get('/dashboard/countries/:countryId',
    authenticate,
    authorize('admin', 'country_manager'),
    checkCountryAccess,
    dashboardController.getCountryStats
);

// User routes
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUserById);
router.post('/users', validate(adminSchemas.createUser), userController.createUser);
router.put('/users/:id', validate(adminSchemas.updateUser), userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.post('/users/:id/reset-password', userController.resetUserPassword);

// Role routes
router.get('/roles', roleController.getRoles);
router.get('/roles/permissions', roleController.getPermissions);
router.get('/roles/:id', roleController.getRoleById);
router.post('/roles', validate(adminSchemas.createRole), roleController.createRole);
router.put('/roles/:id', validate(adminSchemas.updateRole), roleController.updateRole);
router.delete('/roles/:id', roleController.deleteRole);
router.post('/roles/:roleId/assign/:userId', roleController.assignRoleToUser);
router.get('/roles/:id/users', roleController.getUsersByRole);

// Report routes
router.get('/reports/bookings', reportController.generateBookingReport);
router.get('/reports/revenue', reportController.generateRevenueReport);
router.get('/reports/users', reportController.generateUserReport);
router.get('/reports/barbers', reportController.generateBarberReport);
router.get('/reports/shops', reportController.generateShopReport);

// Settings routes
router.get('/settings', settingsController.getAllSettings);
router.get('/settings/system-info', settingsController.getSystemInfo);
router.get('/settings/:key', settingsController.getSettingByKey);
router.post('/settings', validate(adminSchemas.createSetting), settingsController.createSetting);
router.put('/settings/:key', settingsController.updateSetting);
router.delete('/settings/:key', settingsController.deleteSetting);

// Email settings
router.get('/settings/email', settingsController.getEmailSettings);
router.put('/settings/email', validate(adminSchemas.updateEmailSettings), settingsController.updateEmailSettings);
router.post('/settings/email/test', settingsController.sendTestEmail);

// Payment settings
router.get('/settings/payment', settingsController.getPaymentSettings);
router.put('/settings/payment', validate(adminSchemas.updatePaymentSettings), settingsController.updatePaymentSettings);

// Notification settings
router.get('/settings/notification', settingsController.getNotificationSettings);
router.put('/settings/notification', validate(adminSchemas.updateNotificationSettings), settingsController.updateNotificationSettings);

// Enums endpoints
router.get('/enums', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            barber: {
                status: ['active', 'inactive', 'onLeave', 'online', 'offline', 'blocked'],
                serviceType: ['shopBased', 'homeBased', 'both']
            },
            freelancer: {
                status: ['active', 'inactive', 'onLeave', 'online', 'offline', 'blocked'],
                serviceType: ['homeBased'],
                verificationStatus: ['pending', 'verified', 'rejected']
            }
        }
    });
});
router.get('/barbers/enums', (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: ['active', 'inactive', 'onLeave', 'online', 'offline', 'blocked'],
            serviceType: ['shopBased', 'homeBased', 'both']
        }
    });
});

// Barber management routes - Basic routes
router.get('/barbers', barberAdminController.getAllBarbers);
router.get('/barbers/active', barberAdminController.getActiveBarbers);
router.get('/barbers/blocked', barberAdminController.getBlockedBarbers);
router.get('/barbers/online', barberAdminController.getOnlineBarbers);
router.get('/barbers/pending/list', barberAdminController.getPendingBarbers);

// Verification routes
router.get('/barbers/verification/pending', barberAdminController.getPendingVerificationBarbers);
router.get('/barbers/verification/verified', barberAdminController.getVerifiedBarbers);
router.get('/barbers/verification/rejected', barberAdminController.getRejectedBarbers);

// Individual barber management
router.get('/barbers/:id', barberAdminController.getBarberById);
router.post('/barbers', upload.fields([
    { name: 'profileImageBlob', maxCount: 1 },
    { name: 'idImageBlob', maxCount: 1 }
]), validate(adminSchemas.createBarber), barberAdminController.createBarber);

// Freelancer management
router.post('/freelancers', upload.fields([
    { name: 'profileImageBlob', maxCount: 1 },
    { name: 'idImageBlob', maxCount: 1 }
]), barberAdminController.createFreelancer);

// Middleware to parse JSON fields in FormData
const parseJsonFields = (fields) => (req, res, next) => {
    fields.forEach(field => {
        if (req.body[field] && typeof req.body[field] === 'string') {
            try {
                req.body[field] = JSON.parse(req.body[field]);
            } catch (e) {
                // If parsing fails, keep as string
            }
        }
    });
    next();
};

// Freelancer CRUD operations
router.get('/freelancers', freelancerAdminController.getAllFreelancers);
router.get('/freelancers/:id', freelancerAdminController.getFreelancerById);
router.put('/freelancers/:id', upload.fields([
    { name: 'profileImageBlob', maxCount: 1 },
    { name: 'idImageBlob', maxCount: 1 }
]), parseJsonFields(['nationalId', 'schedule', 'services']), validate(adminSchemas.updateFreelancer), freelancerAdminController.updateFreelancer);
router.delete('/freelancers/:id', freelancerAdminController.deleteFreelancer);

// Profile image upload
router.post('/freelancers/:id/profile-image',
    upload.single('profileImageBlob'),
    freelancerAdminController.uploadProfileImage
);

// Freelancer status management
router.patch('/freelancers/:id/block',
    validate(adminSchemas.blockBarber),
    freelancerAdminController.blockFreelancer
);
router.patch('/freelancers/:id/unblock', freelancerAdminController.unblockFreelancer);
router.patch('/freelancers/:id/on-leave', freelancerAdminController.setFreelancerOnLeave);

// Freelancer verification management
router.get('/freelancers/pending/list', freelancerAdminController.getPendingFreelancers);
router.get('/freelancers/verification/pending', freelancerAdminController.getPendingVerificationFreelancers);
router.get('/freelancers/verification/verified', freelancerAdminController.getVerifiedFreelancers);
router.get('/freelancers/verification/rejected', freelancerAdminController.getRejectedFreelancers);
router.patch('/freelancers/:id/verify', freelancerAdminController.verifyFreelancerIdentity);
router.patch('/freelancers/:id/reject-verification',
    freelancerAdminController.rejectFreelancerIdentity
);

// Freelancer additional operations
router.put('/freelancers/:id/national-id',
    upload.single('idImageBlob'),
    validate(adminSchemas.updateBarberNationalId),
    freelancerAdminController.updateNationalId
);
router.post('/freelancers/:id/services',
    validate('addService'),
    freelancerAdminController.addService
);
router.delete('/freelancers/:id/services/:serviceId', freelancerAdminController.removeService);

// Freelancer status queries
router.get('/freelancers/active', freelancerAdminController.getActiveFreelancers);
router.get('/freelancers/blocked', freelancerAdminController.getBlockedFreelancers);
router.get('/freelancers/online', freelancerAdminController.getOnlineFreelancers);
router.put('/barbers/:id', upload.fields([
    { name: 'profileImageBlob', maxCount: 1 },
    { name: 'idImageBlob', maxCount: 1 }
]), validate(adminSchemas.updateBarber), barberAdminController.updateBarber);
router.delete('/barbers/:id', barberAdminController.deleteBarber);


// Status management
router.patch('/barbers/:id/block',
    validate(adminSchemas.blockBarber),
    barberAdminController.blockBarber
);
router.patch('/barbers/:id/unblock', barberAdminController.unblockBarber);
router.patch('/barbers/:id/on-leave', barberAdminController.setBarberOnLeave);

// Verification management
router.patch('/barbers/:id/verify', barberAdminController.verifyBarberIdentity);
router.patch('/barbers/:id/reject-verification',
    barberAdminController.rejectBarberIdentity
);
router.put('/barbers/:id/national-id',
    validate(adminSchemas.updateBarberNationalId),
    barberAdminController.updateNationalId
);

// Service management
router.post('/barbers/:id/services',
    validate('addService'),
    barberAdminController.addService
);
router.delete('/barbers/:id/services/:serviceId', barberAdminController.removeService);

// Profile image upload
router.post('/barbers/:id/profile-image',
    upload.single('profileImageBlob'),
    barberAdminController.uploadProfileImage
);

// Shop Owner management routes
router.post('/shop-owners', 
    upload.fields([
    { name: 'businessLogoBlob', maxCount: 1 },
    { name: 'businessRegistrationDocBlob', maxCount: 1 }
]),
    validate(adminSchemas.createShopOwner), shopOwnerAdminController.createShopOwner);
router.get('/shop-owners', shopOwnerAdminController.getAllShopOwners);
// ... existing routes
router.get('/shop-owners/:id', shopOwnerAdminController.getShopOwnerById);
router.put('/shop-owners/:id', validate(adminSchemas.updateShopOwner), shopOwnerAdminController.updateShopOwner);
router.delete('/shop-owners/:id', shopOwnerAdminController.deleteShopOwner);
router.patch('/shop-owners/:id/verify', shopOwnerAdminController.verifyShopOwner);
router.patch('/shop-owners/:id/reject', shopOwnerAdminController.rejectShopOwner);
router.get('/shop-owners/pending/list', shopOwnerAdminController.getPendingShopOwners);
router.get('/shop-owners/:id/documents', shopOwnerAdminController.getVerificationDocuments);
router.post('/shop-owners/:id/documents', upload.single('document'), shopOwnerAdminController.uploadVerificationDocument);

// Shop management routes
router.post('/shops', upload.single('mainImageBlob'), validate(adminSchemas.createShop), shopAdminController.createShop);
router.get('/shops', shopAdminController.getAllShops);
// ... existing routes
router.get('/shops/:id', shopAdminController.getShopById);
router.put('/shops/:id', upload.single('mainImageBlob'), validate(adminSchemas.updateShop), shopAdminController.updateShop);
router.delete('/shops/:id', shopAdminController.deleteShop);
router.patch('/shops/:id/verify', shopAdminController.verifyShop);
router.patch('/shops/:id/reject', shopAdminController.rejectShop);
router.get('/shops/pending/list', shopAdminController.getPendingShops);
router.get('/shops/:id/barbers', shopAdminController.getShopBarbers);
router.get('/shops/:id/services', shopAdminController.getShopServices);
router.get('/shops/:id/bookings', shopAdminController.getShopBookings);

// Customer management routes
router.get('/customers', customerAdminController.getAllCustomers);
router.get('/customers/:id', customerAdminController.getCustomerById);
router.put('/customers/:id', validate(adminSchemas.updateCustomer), customerAdminController.updateCustomer);
router.delete('/customers/:id', customerAdminController.deleteCustomer);
router.get('/customers/:id/bookings', customerAdminController.getCustomerBookings);
router.get('/customers/:id/payments', customerAdminController.getCustomerPayments);


router.get('/country-managers',
    authorize('admin'),
    countryManagerController.getCountryManagers
);

router.post('/country-managers/:userId/assign-country',
    authorize('admin'),
    countryManagerController.assignCountryToManager
);

router.get('/locations/countries', locationController.getCountries);
router.get('/locations/countries/:countryId', locationController.getCountryById);
router.post('/locations/countries', authorize('admin'), locationController.createCountry);
router.put('/locations/countries/:countryId', authorize('admin'), locationController.updateCountry);
router.delete('/locations/countries/:countryId', authorize('admin'), locationController.deleteCountry);

// City routes
router.get('/locations/countries/:countryId/cities', locationController.getCitiesByCountry);
router.post('/locations/countries/:countryId/cities', authorize('admin'), locationController.createCity);
router.put('/locations/cities/:cityId', authorize('admin'), locationController.updateCity);
router.delete('/locations/cities/:cityId', authorize('admin'), locationController.deleteCity);

// Area routes
router.get('/locations/cities/:cityId/areas', locationController.getAreasByCity);
router.post('/locations/cities/:cityId/areas', authorize('admin'), locationController.createArea);
router.put('/locations/areas/:areaId', authorize('admin'), locationController.updateArea);
router.delete('/locations/areas/:areaId', authorize('admin'), locationController.deleteArea);



router.get('/customer-care',
    authorize('admin'),
    customerCareController.getCustomerCareUsers
);

router.post('/customer-care/:userId/assign-shop',
    authorize('admin'),
    customerCareController.assignShopToCustomerCare
);

router.post('/customer-care/:userId/assign-customer',
    authorize('admin'),
    customerCareController.assignCustomerToCustomerCare
);

// Platform Fee routes
router.get('/platform-fees', platformFeeController.getAllPlatformFees);
router.post('/platform-fees', validate(adminSchemas.createPlatformFee), platformFeeController.createPlatformFees);
router.get('/platform-fees/:countryId', platformFeeController.getPlatformFees);
router.put('/platform-fees/:countryId', validate(adminSchemas.updatePlatformFee), platformFeeController.setPlatformFees);
router.delete('/platform-fees/:countryId', platformFeeController.deletePlatformFee);

// Shop Join Request routes
router.get('/shop-join-requests', shopAdminController.getShopJoinRequests);
router.patch('/shop-join-requests/:id/approve', shopAdminController.approveShopJoinRequest);
router.patch('/shop-join-requests/:id/reject', shopAdminController.rejectShopJoinRequest);

// Shop Update Request routes
router.get('/shop-updates', shopUpdateRequestAdminController.getShopUpdateRequests);
router.get('/shop-updates/stats', shopUpdateRequestAdminController.getShopUpdateRequestStats);
router.get('/shop-updates/:id', shopUpdateRequestAdminController.getShopUpdateRequestById);
router.put('/shop-updates/:id/approve', shopUpdateRequestAdminController.approveShopUpdateRequest);
router.put('/shop-updates/:id/reject', shopUpdateRequestAdminController.rejectShopUpdateRequest);

module.exports = router;