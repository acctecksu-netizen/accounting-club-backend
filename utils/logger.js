// utils/logger.js
// Centralized logging using Winston
// Logs to console (always) and to files (in production)

const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format: [2024-01-15 14:30:00] ERROR: Something went wrong
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
});

// Transports = where logs go
const transports = [
  // Always log to console
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  }),
];

// In production, also write logs to files
if (process.env.NODE_ENV === 'production') {
  transports.push(
    // All logs go here
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    // Only errors go here (easier to monitor)
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/errors.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    })
  );
}

const logger = winston.createLogger({
  // Log level: in development show everything, in production only warnings+
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  transports,
});

module.exports = logger;
