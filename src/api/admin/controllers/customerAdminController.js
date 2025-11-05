// src/api/admin/controllers/customerAdminController.js
const customerService = require('../../../services/customerService');
const bookingService = require('../../../services/bookingService');
const paymentService = require('../../../services/paymentService');
const { ApiError } = require('../../../middlewares/errorHandler');

/**
 * Get all customers with pagination and filtering
 * @route GET /api/admin/customers
 * @access Private/Admin
 */
const getAllCustomers = async (req, res, next) => {
    try {
        const { page, limit, search, sortBy, sortOrder } = req.query;

        const options = {
            page,
            limit,
            search,
            sortBy,
            sortOrder
        };

        const result = await customerService.getCustomers(options);

        res.status(200).json({
            success: true,
            data: result.customers,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer by ID
 * @route GET /api/admin/customers/:id
 * @access Private/Admin
 */
const getCustomerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customer = await customerService.getCustomerById(id);

        res.status(200).json({
            success: true,
            data: customer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update customer
 * @route PUT /api/admin/customers/:id
 * @access Private/Admin
 */
const updateCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // First get customer to get userId
        const customer = await customerService.getCustomerById(id);
        const userId = customer.userId._id;
        
        // Then update the profile
        const updatedCustomer = await customerService.updateCustomerProfile(userId, req.body);

        res.status(200).json({
            success: true,
            message: 'Customer updated successfully',
            data: updatedCustomer
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete customer
 * @route DELETE /api/admin/customers/:id
 * @access Private/Admin
 */
const deleteCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Note: You would need to implement a delete customer function in the customer service
        // This would typically include:
        // 1. Delete or cancel active bookings
        // 2. Remove favorite references
        // 3. Delete customer profile
        // 4. Optionally deactivate user account
        
        // For now, we'll call a hypothetical function
        const success = await customerService.deleteCustomer(id);

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Customer deleted successfully'
            });
        } else {
            throw new ApiError('Customer deletion failed', 400);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer bookings
 * @route GET /api/admin/customers/:id/bookings
 * @access Private/Admin
 */
const getCustomerBookings = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page, limit, status, sortBy, sortOrder } = req.query;
        
        // Get customer to get the userId
        const customer = await customerService.getCustomerById(id);
        const customerId = customer.userId._id;

        const options = {
            page,
            limit,
            status,
            sortBy,
            sortOrder
        };

        const result = await bookingService.getBookingsByCustomer(customerId, options);

        res.status(200).json({
            success: true,
            data: result.bookings,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get customer payments
 * @route GET /api/admin/customers/:id/payments
 * @access Private/Admin
 */
const getCustomerPayments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page, limit, status, sortBy, sortOrder } = req.query;
        
        // Get customer to get the userId
        const customer = await customerService.getCustomerById(id);
        const customerId = customer.userId._id;

        const options = {
            page,
            limit,
            status,
            sortBy,
            sortOrder
        };

        const result = await paymentService.getPaymentsByCustomer(customerId, options);

        res.status(200).json({
            success: true,
            data: result.payments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
    getCustomerBookings,
    getCustomerPayments
};