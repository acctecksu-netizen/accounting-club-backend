// routes/authRoutes.js
// Auth endpoints: signup, login, logout, me, csrf

const express = require('express');
const router = express.Router();
const csrf = require('csurf');

const { signup, login, logout, getMe, getCsrfToken } = require('../controllers/authController');
const { signupValidation, loginValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiter');

// CSRF protection middleware
// Uses cookies to store the CSRF secret, token sent in request headers/body
const csrfProtection = csrf({ cookie: false }); // Use session-based CSRF

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Get a CSRF token (must be called before any POST/PUT/DELETE)
router.get('/csrf', csrfProtection, getCsrfToken);

// Register a new account (rate limited to 10/hour per IP)
router.post('/signup', signupLimiter, csrfProtection, signupValidation, signup);

// Login (rate limited to 5 attempts / 15 min per IP)
router.post('/login', loginLimiter, csrfProtection, loginValidation, login);

// ─── PROTECTED ROUTES (require login) ────────────────────────────────────────

// Logout — destroys session
router.post('/logout', requireAuth, csrfProtection, logout);

// Get current user info
router.get('/me', requireAuth, getMe);

module.exports = router;
