// middleware/errorHandler.js
// Central error handling middleware — catches ALL unhandled errors
// Must be registered LAST in app.js (after all routes)

const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');

/**
 * 404 Handler — catches requests that don't match any route
 * Register this BEFORE the error handler but AFTER all routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`المسار غير موجود: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error); // Pass to the error handler below
};

/**
 * Central Error Handler
 * Express recognizes this as an error handler because it has 4 parameters
 *
 * SECURITY: Never expose stack traces or internal errors to clients in production
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code was set
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'خطأ في الخادم الداخلي'; // Internal server error

  // ─── Handle Specific Error Types ──────────────────────────────────────────

  // Mongoose validation error (e.g., required field missing)
  if (err.name === 'ValidationError') {
    statusCode = 422;
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    logger.warn(`Validation error: ${JSON.stringify(errors)}`);
    return sendError(res, statusCode, 'بيانات غير صالحة', errors);
  }

  // MongoDB duplicate key error (e.g., email already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} مستخدم بالفعل`; // Already in use
    logger.warn(`Duplicate key: ${field}`);
    return sendError(res, statusCode, message);
  }

  // Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `معرف غير صالح: ${err.value}`;
    return sendError(res, statusCode, message);
  }

  // JWT errors (if you add JWT later)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'رمز التوثيق غير صالح';
    return sendError(res, statusCode, message);
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'انتهت صلاحية رمز التوثيق';
    return sendError(res, statusCode, message);
  }

  // CSRF token error
  if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'طلب غير صالح - CSRF token missing or invalid';
    logger.warn(`CSRF error from IP: ${req.ip}`);
    return sendError(res, statusCode, message);
  }

  // ─── Log the Error ─────────────────────────────────────────────────────────

  if (statusCode >= 500) {
    // Log full error details for server errors
    logger.error(`Server Error [${statusCode}] ${req.method} ${req.path}: ${err.message}`, {
      stack: err.stack,
      ip: req.ip,
      userId: req.session?.userId,
    });
  } else {
    // Log 4xx errors as warnings
    logger.warn(`Client Error [${statusCode}] ${req.method} ${req.path}: ${err.message}`);
  }

  // ─── Send Response ─────────────────────────────────────────────────────────

  // In production, hide internal error details for 5xx errors
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    return sendError(res, 500, 'خطأ في الخادم الداخلي');
  }

  return sendError(res, statusCode, message);
};

module.exports = { notFoundHandler, errorHandler };
