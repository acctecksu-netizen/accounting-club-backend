// middleware/rateLimiter.js
// Rate limiting to prevent brute force attacks
// Different limits for different endpoints

const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

// ─── SHARED ERROR HANDLER ─────────────────────────────────────────────────────
// Called when a user exceeds the rate limit
const rateLimitHandler = (req, res) => {
  sendError(
    res,
    429,
    'لقد تجاوزت الحد المسموح به من المحاولات. يرجى المحاولة لاحقاً.' // Too many attempts
  );
};

// ─── LOGIN RATE LIMITER ───────────────────────────────────────────────────────
// Max 5 login attempts per IP per 15 minutes
// This prevents brute-force password attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,  // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,    // Disable X-RateLimit-* headers
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

// ─── SIGNUP RATE LIMITER ──────────────────────────────────────────────────────
// Max 10 signups per IP per hour
// Prevents mass account creation
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// ─── GENERAL API LIMITER ──────────────────────────────────────────────────────
// Max 200 requests per IP per 15 minutes (for all other API routes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  // Skip rate limiting for admin users (they use the API more intensively)
  skip: (req) => req.session && req.session.role === 'admin',
});

// ─── FILE UPLOAD LIMITER ──────────────────────────────────────────────────────
// Max 20 file uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = {
  loginLimiter,
  signupLimiter,
  apiLimiter,
  uploadLimiter,
};
