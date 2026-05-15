// controllers/authController.js
// Handles signup, login, logout, and current user retrieval

const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/signup
 * Creates a new user account
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if email already exists
    // SECURITY: We return the same error regardless of whether email exists
    // This prevents user enumeration attacks
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Don't say "email already exists" — just say invalid data
      return sendError(res, 400, 'تعذر إنشاء الحساب. تحقق من البيانات المدخلة.');
    }

    // Create the user — password is hashed automatically by the pre-save hook
    const user = await User.create({ name, email, password });

    logger.info(`New user registered: ${email}`);

    // After signup, log the user in automatically
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user._id.toString();
      req.session.role = user.role;

      return sendSuccess(res, 201, 'تم إنشاء الحساب بنجاح', user.toSafeObject());
    });
  } catch (error) {
    next(error);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Authenticates a user and creates a session
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // SECURITY: Use the same generic error message for all failures
    // This prevents attackers from knowing whether the email exists
    const GENERIC_ERROR = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';

    // Fetch user with password (password is select: false by default)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // User doesn't exist — still show generic error
      logger.warn(`Failed login attempt for non-existent email: ${email}`);
      return sendError(res, 401, GENERIC_ERROR);
    }

    // Check if account is currently locked
    if (user.isLocked) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      logger.warn(`Login attempt on locked account: ${email}`);
      return sendError(
        res,
        423, // 423 = Locked
        `الحساب مقفل مؤقتاً. حاول مجدداً بعد ${minutesLeft} دقيقة`
      );
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      // Record failed attempt (will lock account after 5 failures)
      await user.recordFailedLogin();
      logger.warn(`Failed login attempt for: ${email} (attempt ${user.loginAttempts})`);
      return sendError(res, 401, GENERIC_ERROR);
    }

    // ─── Success ───────────────────────────────────────────────────────────
    // Reset login attempts counter
    await user.resetLoginAttempts();

    // SECURITY: Regenerate session ID after login
    // This prevents session fixation attacks
    req.session.regenerate((err) => {
      if (err) return next(err);

      // Store user info in session
      req.session.userId = user._id.toString();
      req.session.role = user.role;

      logger.info(`User logged in: ${email}`);

      return sendSuccess(res, 200, 'تم تسجيل الدخول بنجاح', user.toSafeObject());
    });
  } catch (error) {
    next(error);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/logout
 * Destroys the session and clears the cookie
 */
const logout = (req, res, next) => {
  const userId = req.session?.userId;

  req.session.destroy((err) => {
    if (err) {
      logger.error(`Session destroy error for user ${userId}: ${err.message}`);
      return next(err);
    }

    // Clear the session cookie from the browser
    res.clearCookie('ksu.sid');

    logger.info(`User logged out: ${userId}`);
    return sendSuccess(res, 200, 'تم تسجيل الخروج بنجاح');
  });
};

// ─── GET ME ───────────────────────────────────────────────────────────────────
/**
 * GET /api/auth/me
 * Returns the currently logged-in user's data
 */
const getMe = async (req, res, next) => {
  try {
    // req.user is set by the requireAuth middleware
    return sendSuccess(res, 200, 'بيانات المستخدم', req.user.toSafeObject());
  } catch (error) {
    next(error);
  }
};

// ─── GET CSRF TOKEN ───────────────────────────────────────────────────────────
/**
 * GET /api/auth/csrf
 * Returns a CSRF token for the frontend to use in state-changing requests
 * The csurf middleware automatically sets the token
 */
const getCsrfToken = (req, res) => {
  return sendSuccess(res, 200, 'CSRF token', { csrfToken: req.csrfToken() });
};

module.exports = { signup, login, logout, getMe, getCsrfToken };
