// src/api/admin/controllers/reportController.js
const bookingService = require('../../../services/bookingService');
const paymentService = require('../../../services/paymentService');
const userService = require('../../../services/userService');
const barberService = require('../../../services/barberService');
const shopService = require('../../../services/shopService');
const { ApiError } = require('../../../middlewares/errorHandler');
const fs = require('fs');
const path = require('path');
const json2csv = require('json2csv').parse;
const XLSX = require('xlsx');
const moment = require('moment');
const logger = require('../../../utils/logger');

/**
 * Generate booking report
 * @route GET /api/admin/reports/bookings
 * @access Private/Admin
 */
const generateBookingReport = async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            status,
            format = 'json',
            includeDetails = false,
            page = 1,
            limit = 50
        } = req.query;

        // Validate date range - if no dates provided, don't filter by date (show all bookings)
        let parsedStartDate = null;
        let parsedEndDate = null;

        if (startDate) {
            parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw new ApiError('Invalid start date format', 400);
            }
        }

        if (endDate) {
            parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw new ApiError('Invalid end date format', 400);
            }
        }

        // If only one date is provided, use reasonable defaults
        if (parsedStartDate && !parsedEndDate) {
            parsedEndDate = new Date(); // Default to today if only start date provided
        } else if (!parsedStartDate && parsedEndDate) {
            parsedStartDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default to 1 year ago if only end date provided
        }

        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(500, Math.max(1, parseInt(limit))); // Cap at 500 per page
        const skip = (pageNum - 1) * limitNum;

        // Get booking data with pagination
        const bookings = await bookingService.getBookingsForReport({
            ...(parsedStartDate && parsedEndDate && { startDate: parsedStartDate, endDate: parsedEndDate }),
            status,
            skip,
            limit: limitNum
        });

        // Get total count for pagination
        const totalCount = await bookingService.getBookingsCountForReport({
            ...(parsedStartDate && parsedEndDate && { startDate: parsedStartDate, endDate: parsedEndDate }),
            status
        });

        // Process data for report
        const reportData = bookings.map(booking => {
            const basic = {
                id: booking._id.toString(),
                uid: booking.uid,
                bookingDate: moment(booking.bookingDate).format('YYYY-MM-DD'),
                bookingTime: booking.bookingTime,
                customerName: booking.customerName || `${booking.customerId?.firstName || ''} ${booking.customerId?.lastName || ''}`.trim() || 'N/A',
                barberName: booking.barberName || `${booking.barberId?.firstName || ''} ${booking.barberId?.lastName || ''}`.trim() || 'N/A',
                serviceName: booking.serviceName,
                price: booking.price,
                status: booking.status,
                paymentStatus: booking.paymentStatus || 'N/A',
                createdAt: moment(booking.createdAt).format('YYYY-MM-DD HH:mm:ss')
            };

            // Include additional details if requested
            if (includeDetails === 'true') {
                return {
                    ...basic,
                    duration: booking.duration,
                    serviceType: booking.serviceType || 'N/A',
                    shopName: booking.shopId?.name || 'N/A',
                    shopLocation: booking.shopId?.location || 'N/A',
                    customerEmail: booking.customerId?.email || 'N/A',
                    customerPhone: booking.customerId?.phone || 'N/A',
                    barberEmail: booking.barberId?.email || 'N/A',
                    barberPhone: booking.barberId?.phone || 'N/A',
                    notes: booking.notes || 'N/A',
                    cancellationReason: booking.cancellationReason || 'N/A',
                    rating: booking.rating || 'N/A',
                    review: booking.review || 'N/A'
                };
            }

            return basic;
        });

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / limitNum);

        // Generate report in requested format
        if (format === 'json') {
            return res.status(200).json({
                success: true,
                data: reportData,
                pagination: {
                    total: totalCount,
                    page: pageNum,
                    limit: limitNum,
                    pages: totalPages,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            });
        } else if (format === 'csv') {
            const csv = json2csv(reportData);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${moment().format('YYYY-MM-DD')}.csv`);

            return res.send(csv);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(reportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=bookings-report-${moment().format('YYYY-MM-DD')}.xlsx`);

            return res.send(buffer);
        } else {
            // Default to JSON
            return res.status(200).json({
                success: true,
                data: reportData,
                pagination: {
                    total: totalCount,
                    page: pageNum,
                    limit: limitNum,
                    pages: totalPages,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Generate revenue report
 * @route GET /api/admin/reports/revenue
 * @access Private/Admin
 */
const generateRevenueReport = async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            groupBy = 'day',
            format = 'json'
        } = req.query;

        // Validate date range
        const parsedStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const parsedEndDate = endDate ? new Date(endDate) : new Date();

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            throw new ApiError('Invalid date format', 400);
        }

        // Get revenue data
        const revenueData = await paymentService.getRevenueReport({
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            groupBy
        });

        // Generate report in requested format
        if (format === 'csv') {
            const csv = json2csv(revenueData);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${moment().format('YYYY-MM-DD')}.csv`);

            return res.send(csv);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(revenueData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Revenue');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${moment().format('YYYY-MM-DD')}.xlsx`);

            return res.send(buffer);
        } else {
            // Default to JSON
            return res.status(200).json({
                success: true,
                data: revenueData
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Generate user growth report
 * @route GET /api/admin/reports/users
 * @access Private/Admin
 */
const generateUserReport = async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            role,
            groupBy = 'day',
            format = 'json'
        } = req.query;

        // Validate date range
        const parsedStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const parsedEndDate = endDate ? new Date(endDate) : new Date();

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            throw new ApiError('Invalid date format', 400);
        }

        // Get user growth data
        const userData = await userService.getUserGrowthReport({
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            role,
            groupBy
        });

        // Generate report in requested format
        if (format === 'csv') {
            const csv = json2csv(userData);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=user-growth-report-${moment().format('YYYY-MM-DD')}.csv`);

            return res.send(csv);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(userData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'User Growth');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=user-growth-report-${moment().format('YYYY-MM-DD')}.xlsx`);

            return res.send(buffer);
        } else {
            // Default to JSON
            return res.status(200).json({
                success: true,
                data: userData
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Generate barber performance report
 * @route GET /api/admin/reports/barbers
 * @access Private/Admin
 */
const generateBarberReport = async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            format = 'json',
            barberId
        } = req.query;

        // Validate date range
        const parsedStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const parsedEndDate = endDate ? new Date(endDate) : new Date();

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            throw new ApiError('Invalid date format', 400);
        }

        // Get barber performance data
        const barberData = await barberService.getBarberPerformanceReport({
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            barberId
        });

        // Generate report in requested format
        if (format === 'csv') {
            const csv = json2csv(barberData);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=barber-performance-report-${moment().format('YYYY-MM-DD')}.csv`);

            return res.send(csv);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(barberData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Barber Performance');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=barber-performance-report-${moment().format('YYYY-MM-DD')}.xlsx`);

            return res.send(buffer);
        } else {
            // Default to JSON
            return res.status(200).json({
                success: true,
                data: barberData
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Generate shop performance report
 * @route GET /api/admin/reports/shops
 * @access Private/Admin
 */
const generateShopReport = async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            format = 'json',
            shopId
        } = req.query;

        // Validate date range
        const parsedStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const parsedEndDate = endDate ? new Date(endDate) : new Date();

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            throw new ApiError('Invalid date format', 400);
        }

        // Get shop performance data
        const shopData = await shopService.getShopPerformanceReport({
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            shopId
        });

        // Generate report in requested format
        if (format === 'csv') {
            const csv = json2csv(shopData);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=shop-performance-report-${moment().format('YYYY-MM-DD')}.csv`);

            return res.send(csv);
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(shopData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Shop Performance');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=shop-performance-report-${moment().format('YYYY-MM-DD')}.xlsx`);

            return res.send(buffer);
        } else {
            // Default to JSON
            return res.status(200).json({
                success: true,
                data: shopData
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateBookingReport,
    generateRevenueReport,
    generateUserReport,
    generateBarberReport,
    generateShopReport
};