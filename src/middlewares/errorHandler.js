// src/middlewares/errorHandler.js
const logger = require('../utils/logger');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
    constructor(message, statusCode, errors = []) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle 404 errors (resource not found)
 */
const notFound = (req, res, next) => {
    const error = new ApiError(`Resource not found - ${req.originalUrl}`, 404);
    next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    // Log error
    if (!err.isOperational) {
        logger.error(`[Unhandled Error] ${err.message}`, {
            stack: err.stack,
            path: req.path,
            method: req.method,
            body: req.body
        });
    } else {
        logger.warn(`[API Error] ${err.message}`, {
            statusCode: err.statusCode,
            path: req.path,
            errors: err.errors
        });
    }

    // Set status code
    const statusCode = err.statusCode || 500;

    // Prepare response data
    const response = {
        success: false,
        message: statusCode === 500 && process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    };

    // Add validation errors if they exist
    if (err.errors && err.errors.length > 0) {
        response.errors = err.errors;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && err.stack) {
        response.stack = err.stack;
    }

    // Send response
    res.status(statusCode).json(response);
};

module.exports = {
    ApiError,
    notFound,
    errorHandler
};