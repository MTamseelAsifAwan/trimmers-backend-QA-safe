// src/utils/logger.js
const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
    // Safe stringify to avoid circular structure errors
    function safeStringify(obj) {
        const seen = new WeakSet();
        return JSON.stringify(obj, function(key, value) {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        });
    }
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? safeStringify(meta) : ''}`;
});

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        logFormat
    ),
    defaultMeta: { service: 'barber-app' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        })
    ]
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    const logsDir = path.join(process.cwd(), 'logs');

    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));

    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
}

// Stream for Morgan
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger;