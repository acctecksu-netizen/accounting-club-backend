// routes/progressRoutes.js

const express = require('express');
const router = express.Router();
const csrf = require('csurf');

const { getProgress, updateProgress, getAllProgress } = require('../controllers/progressController');
const { progressValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const csrfProtection = csrf({ cookie: false });

// All progress routes require authentication
router.use(requireAuth);

// GET all progress for the logged-in user
router.get('/', getAllProgress);

// GET progress for a specific course
router.get('/:courseId', getProgress);

// POST mark a video as watched/unwatched
router.post('/:courseId', csrfProtection, progressValidation, updateProgress);

module.exports = router;
