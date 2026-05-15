// routes/adminRoutes.js
// Admin-only dashboard statistics endpoint

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Progress = require('../models/Progress');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendSuccess } = require('../utils/apiResponse');

// All admin routes require auth + admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/stats
 * Dashboard statistics — counts for admin overview cards
 */
router.get('/stats', async (req, res, next) => {
  try {
    // Run all count queries in parallel for speed
    const [
      totalUsers,
      totalCourses,
      publishedCourses,
      totalQuizzes,
      totalProgress,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Quiz.countDocuments(),
      Progress.countDocuments(),
    ]);

    // Recent registrations (last 7 days)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo },
      role: 'user',
    });

    return sendSuccess(res, 200, 'إحصائيات لوحة التحكم', {
      totalUsers,
      totalCourses,
      publishedCourses,
      draftCourses: totalCourses - publishedCourses,
      totalQuizzes,
      totalEnrollments: totalProgress,
      newUsersThisWeek,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * List all users (admin view)
 */
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find({ role: 'user' })
        .select('-password')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments({ role: 'user' }),
    ]);

    return sendSuccess(res, 200, 'قائمة المستخدمين', users, {
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
