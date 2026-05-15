// middleware/auth.js
// Authentication and authorization middleware
// Used to protect routes and check roles

const { sendError } = require('../utils/apiResponse');
const User = require('../models/User');

/**
 * requireAuth — checks that the user is logged in
 * Attach this to any route that requires authentication
 */
const requireAuth = async (req, res, next) => {
  try {
    // Session-based auth: check if userId is in the session
    if (!req.session || !req.session.userId) {
      return sendError(res, 401, 'يرجى تسجيل الدخول للمتابعة'); // Please login to continue
    }

    // Fetch fresh user data from DB (ensures account is still active)
    const user = await User.findById(req.session.userId);

    if (!user) {
      // Session exists but user was deleted — clear the session
      req.session.destroy();
      return sendError(res, 401, 'الجلسة غير صالحة، يرجى تسجيل الدخول مجدداً');
    }

    // Check if account is locked
    if (user.isLocked) {
      return sendError(res, 403, 'الحساب مقفل مؤقتاً. يرجى المحاولة لاحقاً');
    }

    // Attach user to request so controllers can access it
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * requireAdmin — checks that the logged-in user is an admin
 * Always stack AFTER requireAuth
 *
 * Usage: router.post('/courses', requireAuth, requireAdmin, createCourse)
 */
const requireAdmin = (req, res, next) => {
  // req.user is set by requireAuth above
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, 403, 'غير مصرح لك بهذه العملية'); // Not authorized
  }
  next();
};

/**
 * optionalAuth — attaches user to req if logged in, but doesn't block
 * Useful for routes that work for both guests and logged-in users
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && !user.isLocked) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Don't block the request if optional auth fails
    next();
  }
};

module.exports = { requireAuth, requireAdmin, optionalAuth };
