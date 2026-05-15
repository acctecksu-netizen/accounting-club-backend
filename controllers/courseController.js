// controllers/courseController.js
// Full CRUD for courses, chapters, and videos

const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { sendSuccess, sendError, buildPaginationMeta } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// ─── GET ALL COURSES ──────────────────────────────────────────────────────────
/**
 * GET /api/courses
 * Public — with pagination, search, and category filter
 */
const getCourses = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      level = '',
      sort = '-createdAt',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 per page
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    // Only show published courses to non-admins
    if (!req.user || req.user.role !== 'admin') {
      filter.isPublished = true;
    }

    // Category filter
    if (category) filter.category = category;

    // Level filter
    if (level) filter.level = level;

    // Full-text search (uses the text index we created in the model)
    if (search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // Execute query with pagination
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select('-chapters.videos.url') // Don't expose video URLs in list view
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email'),
      Course.countDocuments(filter),
    ]);

    return sendSuccess(
      res,
      200,
      'قائمة الدورات',
      courses,
      buildPaginationMeta(total, pageNum, limitNum)
    );
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE COURSE ────────────────────────────────────────────────────────
/**
 * GET /api/courses/:courseId
 * Returns full course details including chapters and videos
 * Adds user's progress if logged in
 */
const getCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).populate('createdBy', 'name email');

    if (!course) {
      return sendError(res, 404, 'الدورة غير موجودة');
    }

    // Block non-admins from seeing unpublished courses
    if (!course.isPublished && (!req.user || req.user.role !== 'admin')) {
      return sendError(res, 404, 'الدورة غير موجودة');
    }

    // Attach user progress if logged in
    let userProgress = null;
    if (req.user) {
      userProgress = await Progress.findOne({
        userId: req.user._id,
        courseId: course._id,
      });
    }

    return sendSuccess(res, 200, 'تفاصيل الدورة', {
      course,
      progress: userProgress,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE COURSE ────────────────────────────────────────────────────────────
/**
 * POST /api/courses — Admin only
 */
const createCourse = async (req, res, next) => {
  try {
    const { title, description, category, level, isPublished, tags } = req.body;

    const courseData = {
      title,
      description,
      category: category || 'أخرى',
      level: level || 'مبتدئ',
      isPublished: isPublished === 'true' || isPublished === true,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
      createdBy: req.user._id,
    };

    // Handle thumbnail upload
    if (req.file) {
      courseData.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    const course = await Course.create(courseData);

    logger.info(`Course created: "${title}" by admin ${req.user.email}`);

    return sendSuccess(res, 201, 'تم إنشاء الدورة بنجاح', course);
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE COURSE ────────────────────────────────────────────────────────────
/**
 * PUT /api/courses/:courseId — Admin only
 */
const updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { title, description, category, level, isPublished, tags } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    // Update only provided fields
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (category !== undefined) course.category = category;
    if (level !== undefined) course.level = level;
    if (isPublished !== undefined) course.isPublished = isPublished === 'true' || isPublished === true;
    if (tags !== undefined) {
      course.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    }

    // Handle new thumbnail upload
    if (req.file) {
      // Delete old thumbnail file
      if (course.thumbnail) {
        const oldPath = path.join(__dirname, '..', course.thumbnail);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      course.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    await course.save();

    logger.info(`Course updated: "${course.title}" by admin ${req.user.email}`);

    return sendSuccess(res, 200, 'تم تحديث الدورة بنجاح', course);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE COURSE ────────────────────────────────────────────────────────────
/**
 * DELETE /api/courses/:courseId — Admin only
 */
const deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    // Delete thumbnail file if it exists
    if (course.thumbnail) {
      const thumbPath = path.join(__dirname, '..', course.thumbnail);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }

    // Delete all progress records for this course
    await Progress.deleteMany({ courseId });

    await course.deleteOne();

    logger.info(`Course deleted: "${course.title}" by admin ${req.user.email}`);

    return sendSuccess(res, 200, 'تم حذف الدورة بنجاح');
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/courses/:courseId/chapters — Admin only
 */
const addChapter = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { title, description, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    const newChapter = {
      title,
      description: description || '',
      order: order !== undefined ? parseInt(order) : course.chapters.length,
      videos: [],
    };

    course.chapters.push(newChapter);
    await course.save();

    const addedChapter = course.chapters[course.chapters.length - 1];

    logger.info(`Chapter added to course "${course.title}": "${title}"`);

    return sendSuccess(res, 201, 'تم إضافة الفصل بنجاح', addedChapter);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/courses/:courseId/chapters/:chapterId — Admin only
 */
const updateChapter = async (req, res, next) => {
  try {
    const { courseId, chapterId } = req.params;
    const { title, description, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    const chapter = course.chapters.id(chapterId);
    if (!chapter) return sendError(res, 404, 'الفصل غير موجود');

    if (title !== undefined) chapter.title = title;
    if (description !== undefined) chapter.description = description;
    if (order !== undefined) chapter.order = parseInt(order);

    await course.save();

    return sendSuccess(res, 200, 'تم تحديث الفصل بنجاح', chapter);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/courses/:courseId/chapters/:chapterId — Admin only
 */
const deleteChapter = async (req, res, next) => {
  try {
    const { courseId, chapterId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    const chapter = course.chapters.id(chapterId);
    if (!chapter) return sendError(res, 404, 'الفصل غير موجود');

    chapter.deleteOne();
    await course.save();

    logger.info(`Chapter deleted from course "${course.title}": "${chapter.title}"`);

    return sendSuccess(res, 200, 'تم حذف الفصل بنجاح');
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/courses/:courseId/chapters/:chapterId/videos — Admin only
 */
const addVideo = async (req, res, next) => {
  try {
    const { courseId, chapterId } = req.params;
    const { title, url, duration, description, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    const chapter = course.chapters.id(chapterId);
    if (!chapter) return sendError(res, 404, 'الفصل غير موجود');

    const newVideo = {
      title,
      url,
      duration: duration || '',
      description: description || '',
      order: order !== undefined ? parseInt(order) : chapter.videos.length,
    };

    chapter.videos.push(newVideo);
    await course.save();

    const addedVideo = chapter.videos[chapter.videos.length - 1];

    logger.info(`Video added to chapter "${chapter.title}": "${title}"`);

    return sendSuccess(res, 201, 'تم إضافة الفيديو بنجاح', addedVideo);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/courses/:courseId/chapters/:chapterId/videos/:videoId — Admin only
 */
const updateVideo = async (req, res, next) => {
  try {
    const { courseId, chapterId, videoId } = req.params;
    const { title, url, duration, description, order } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    const chapter = course.chapters.id(chapterId);
    if (!chapter) return sendError(res, 404, 'الفصل غير موجود');

    const video = chapter.videos.id(videoId);
    if (!video) return sendError(res, 404, 'الفيديو غير موجود');

    if (title !== undefined) video.title = title;
    if (url !== undefined) video.url = url;
    if (duration !== undefined) video.duration = duration;
    if (description !== undefined) video.description = description;
    if (order !== undefined) video.order = parseInt(order);

    await course.save();

    return sendSuccess(res, 200, 'تم تحديث الفيديو بنجاح', video);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/courses/:courseId/chapters/:chapterId/videos/:videoId — Admin only
 */
const deleteVideo = async (req, res, next) => {
  try {
    const { courseId, chapterId, videoId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    const chapter = course.chapters.id(chapterId);
    if (!chapter) return sendError(res, 404, 'الفصل غير موجود');

    const video = chapter.videos.id(videoId);
    if (!video) return sendError(res, 404, 'الفيديو غير موجود');

    video.deleteOne();
    await course.save();

    return sendSuccess(res, 200, 'تم حذف الفيديو بنجاح');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  addChapter,
  updateChapter,
  deleteChapter,
  addVideo,
  updateVideo,
  deleteVideo,
};
