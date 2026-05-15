// server.js
// Main application entry point
// Configures Express with all middleware, connects to DB, and starts the server

// ─── Load Environment Variables ───────────────────────────────────────────────
// Must be the first thing — loads .env variables into process.env
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const session = require('express-session');
const path = require('path');

const connectDB = require('./config/database');
const sessionConfig = require('./config/session');
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const quizRoutes = require('./routes/quizRoutes');
const progressRoutes = require('./routes/progressRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ─── Connect to Database ──────────────────────────────────────────────────────
connectDB();

// ─── Create Express App ───────────────────────────────────────────────────────
const app = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Needed if running behind Nginx/load balancer — enables correct IP detection
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helmet — sets security-related HTTP headers
 * Protects against: clickjacking, MIME sniffing, XSS (via CSP), etc.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        // Allow YouTube embeds
        frameSrc: ["'self'", 'https://www.youtube.com', 'https://player.vimeo.com'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    // HSTS — tells browsers to always use HTTPS (production only)
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  })
);

/**
 * CORS — controls which domains can make requests to this API
 * In production, only allow your frontend's domain
 */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,   // Allow cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'CSRF-Token', 'X-CSRF-Token'],
  })
);

/**
 * express-mongo-sanitize — removes $ and . from user input
 * Prevents NoSQL injection attacks like: { email: { $gt: "" } }
 */
app.use(mongoSanitize());

/**
 * xss-clean — sanitizes user input to prevent XSS attacks
 * Strips HTML tags and dangerous characters from req.body, req.params, req.query
 */
app.use(xssClean());

// ═══════════════════════════════════════════════════════════════════════════════
// GENERAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compression — gzip compress all responses
 * Significantly reduces response size (especially for large JSON payloads)
 */
app.use(compression());

/**
 * Body parsers — parse incoming request bodies
 * Limit size to prevent large payload attacks (DDoS)
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/**
 * Session middleware — must be BEFORE routes that use sessions
 */
app.use(session(sessionConfig));

/**
 * Morgan — HTTP request logger
 * In development: colorful detailed logs
 * In production: write to a stream (you'd redirect this to a log file)
 */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // In production, log to winston
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

// ─── Serve Uploaded Files ─────────────────────────────────────────────────────
// This makes uploaded thumbnails accessible at /uploads/thumbnails/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING (applied to all API routes)
// ═══════════════════════════════════════════════════════════════════════════════
app.use('/api', apiLimiter);

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint — useful for monitoring/deployment checks
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'الخادم يعمل بشكل طبيعي',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING (must be LAST)
// ═══════════════════════════════════════════════════════════════════════════════

// 404 handler — catches requests to undefined routes
app.use(notFoundHandler);

// Central error handler — catches all errors thrown in routes/middleware
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📡 API available at: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections (e.g., DB connection failure after start)
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
  // Gracefully close the server before exiting
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
