// routes/courseRoutes.js
// Course, Chapter, and Video CRUD endpoints

const express = require('express');
const router = express.Router();
const csrf = require('csurf');

const {
  getCourses, getCourse, createCourse, updateCourse, deleteCourse,
  addChapter, updateChapter, deleteChapter,
  addVideo, updateVideo, deleteVideo,
} = require('../controllers/courseController');

const { courseValidation, chapterValidation, videoValidation } = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { uploadThumbnail, handleUpload } = require('../utils/fileUpload');
const { uploadLimiter } = require('../middleware/rateLimiter');

const csrfProtection = csrf({ cookie: false });

// ─── COURSE ROUTES ────────────────────────────────────────────────────────────

// GET all courses — public, with search/filter/pagination
router.get('/', optionalAuth, getCourses);

// GET single course — public
router.get('/:courseId', optionalAuth, getCourse);

// POST create course — admin only
router.post(
  '/',
  requireAuth, requireAdmin, csrfProtection,
  uploadLimiter,
  handleUpload(uploadThumbnail, 'thumbnail'),
  courseValidation,
  createCourse
);

// PUT update course — admin only
router.put(
  '/:courseId',
  requireAuth, requireAdmin, csrfProtection,
  handleUpload(uploadThumbnail, 'thumbnail'),
  courseValidation,
  updateCourse
);

// DELETE course — admin only
router.delete('/:courseId', requireAuth, requireAdmin, csrfProtection, deleteCourse);

// ─── CHAPTER ROUTES ───────────────────────────────────────────────────────────

// POST add chapter to course
router.post(
  '/:courseId/chapters',
  requireAuth, requireAdmin, csrfProtection,
  chapterValidation,
  addChapter
);

// PUT update chapter
router.put(
  '/:courseId/chapters/:chapterId',
  requireAuth, requireAdmin, csrfProtection,
  chapterValidation,
  updateChapter
);

// DELETE chapter
router.delete(
  '/:courseId/chapters/:chapterId',
  requireAuth, requireAdmin, csrfProtection,
  deleteChapter
);

// ─── VIDEO ROUTES ─────────────────────────────────────────────────────────────

// POST add video to chapter
router.post(
  '/:courseId/chapters/:chapterId/videos',
  requireAuth, requireAdmin, csrfProtection,
  videoValidation,
  addVideo
);

// PUT update video
router.put(
  '/:courseId/chapters/:chapterId/videos/:videoId',
  requireAuth, requireAdmin, csrfProtection,
  videoValidation,
  updateVideo
);

// DELETE video
router.delete(
  '/:courseId/chapters/:chapterId/videos/:videoId',
  requireAuth, requireAdmin, csrfProtection,
  deleteVideo
);

module.exports = router;
