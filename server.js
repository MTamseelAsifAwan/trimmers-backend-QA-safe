// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const { connectDB } = require('./src/config/db');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./src/middlewares/errorHandler');
const logger = require('./src/utils/logger');
// Initialize Express app
const setupSwagger = require('./swagger-auth');
// Initialize Express app
const app = express();
setupSwagger(app);
// Connect to MongoDB
connectDB().catch(err => {
  logger.error(`MongoDB connection error: ${err.message}`);
  process.exit(1);
});

// Middleware
app.use(helmet()); // Set security headers
app.set('trust proxy', 1); // Trust first proxy
// app.use(cors({
//   origin: process.env.FRONTEND_URL || '*',
//   credentials: true
// }));
app.use(cors('*'));

// Handle double-encoded JSON for specific endpoint
app.use((req, res, next) => {
  // Only apply to the specific endpoint and PUT method
  if (req.method === 'PUT' && req.path === '/api/bookings/customer/6909a7371fa6416f2f07e066') {
    let rawBody = '';
    
    req.on('data', chunk => {
      rawBody += chunk.toString();
    });
    
    req.on('end', () => {
      console.log('🔍 [Raw Body Debug] PUT /api/bookings/customer/6909a7371fa6416f2f07e066 - Raw body:', rawBody);
      
      try {
        // Check if it's double-encoded JSON (string wrapped in quotes)
        if (rawBody.startsWith('"') && rawBody.endsWith('"')) {
          // Parse twice to handle double encoding
          const parsedOnce = JSON.parse(rawBody); // First parse removes outer quotes
          const finalData = JSON.parse(parsedOnce); // Second parse gets actual object
          req.body = finalData;
          console.log('✅ [Success] Parsed double-encoded JSON:', finalData);
        } else {
          // Normal JSON parsing
          req.body = JSON.parse(rawBody);
          console.log('✅ [Success] Parsed normal JSON:', req.body);
        }
        next();
      } catch (error) {
        console.error('❌ [Error] Failed to parse JSON:', error.message);
        req.body = {};
        next();
      }
    });
    
    req.on('error', (error) => {
      console.error('❌ [Stream Error]:', error);
      req.body = {};
      next();
    });
  } else {
    next();
  }
});

// Configure compression for optimal performance
app.use(compression({
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use default filter function
    return compression.filter(req, res);
  }
}));

// Use express.json() but skip our custom endpoint
app.use((req, res, next) => {
  // Skip express.json for our custom endpoint since we handle it above
  if (req.method === 'PUT' && req.path === '/api/bookings/customer/6909a7371fa6416f2f07e066') {
    return next();
  }
  
  // Use express.json for all other routes
  express.json({ 
    limit: '10mb',
    reviver: (key, value) => {
      // Handle stringified JSON values
      if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        try {
          return JSON.parse(value);
        } catch (err) {
          return value;
        }
      }
      return value;
    }
  })(req, res, next);
});

// Alternative: Custom middleware that works with body-parser
app.use((req, res, next) => {
  // Skip if it's our custom endpoint or if body is already parsed
  if ((req.method === 'PUT' && req.path === '/api/bookings/customer/6909a7371fa6416f2f07e066') || !req.body) {
    return next();
  }
  
  // Only process JSON content after express.json has parsed it
  if (typeof req.body === 'string' && req.body.startsWith('"') && req.body.endsWith('"')) {
    try {
      req.body = JSON.parse(req.body);
    } catch (err) {
      // Keep original body if parsing fails
    }
  }
  next();
});
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded body

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  // Handle undefined IP addresses
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  // Skip rate limiting for health checks and static assets
  skip: (req) => req.path === '/health' || req.path.startsWith('/api-docs')
});
app.use('/api', limiter);

// Routes
app.use('/api', require('./src/api'));

// Serve static files from uploads directory with permissive cross-origin headers
app.use(
  '/uploads',
  // small middleware to set headers allowing cross-origin embedding of images
  (req, res, next) => {
    // Allow access from the frontend origin or any origin in dev
    const allowedOrigin = process.env.FRONTEND_URL || '*';
    try {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      // Allow embedding of these resources across origins
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // Basic CORS preflight allowances
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    } catch (e) {
      // ignore header set failures
    }
    // Short-circuit OPTIONS
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

// Serve static files from root directory for any other static assets
app.use(
  '/',
  // small middleware to set headers allowing cross-origin embedding of static assets
  (req, res, next) => {
    // Only apply to static file requests (not API routes)
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }

    // Allow access from the frontend origin or any origin in dev
    const allowedOrigin = process.env.FRONTEND_URL || '*';
    try {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      // Allow embedding of these resources across origins
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // Basic CORS preflight allowances
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    } catch (e) {
      // ignore header set failures
    }
    // Short-circuit OPTIONS
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  },
  express.static(path.join(__dirname, 'public'))
);

// Use mobile module routes
app.use('/api/mobile', require('./src/api/mobile_module'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Server is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to Barber App API',
    version: '1.0.0',
    documentation: `${process.env.API_URL || ''}/api-docs`
  });
});

// Handle specific static file requests that might be misdirected
app.get('/download.webp', (req, res) => {
  // Set CORS headers to allow cross-origin requests
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  res.status(404).json({
    success: false,
    error: 'File not found',
    message: 'The requested file download.webp does not exist'
  });
});

// 404 handler
app.use((req, res, next) => {
  // Set CORS headers for 404 responses
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  res.status(404).json({
    success: false,
    error: 'Resource not found'
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const host = process.env.HOST || '0.0.0.0';
const port =   process.env.PORT || 5000;

const server = app.listen(port, host, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on ${host}:${port} url http://localhost:${port}`);
});

// Schedule auto-reschedule and auto-assign for bookings every 5 minutes
const cron = require('node-cron');
const bookingService = require('./src/services/bookingService');
cron.schedule('*/5 * * * *', async () => {
  try {
    // Auto-assign pending bookings
    const assignedCount = await bookingService.autoAssignPendingBookings();
    if (assignedCount > 0) {
      logger.info(`Auto-assigned ${assignedCount} pending bookings.`);
    }

    // Auto-reschedule stale bookings
    const rescheduledCount = await bookingService.autoRescheduleStaleBookings();
    if (rescheduledCount > 0) {
      logger.info(`Auto-rescheduled ${rescheduledCount} stale bookings.`);
    }
  } catch (err) {
    logger.error('Auto booking management cron error:', err);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  logger.error(err);
  
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = server; // Export for testing