// utils/logger.js
// Centralized logging using Winston
// Logs to console only (compatible with Vercel serverless)

const winston = require('winston');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format: [2024-01-15 14:30:00] ERROR: Something went wrong
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
});

const transports = [
  // Always log to console (Vercel captures this)
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      logFormat
    ),
  }),
];

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  transports,
});

module.exports = logger;
