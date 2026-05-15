// controllers/progressController.js
// Tracks user progress through courses (which videos they've watched)

const Progress = require('../models/Progress');
const Course = require('../models/Course');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// ─── GET PROGRESS FOR A COURSE ────────────────────────────────────────────────
/**
 * GET /api/progress/:courseId
 * Returns the logged-in user's progress for a specific course
 */
const getProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Check the course exists
    const course = await Course.findById(courseId).select('chapters');
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    // Find or return empty progress
    let progress = await Progress.findOne({
      userId: req.user._id,
      courseId,
    });

    // Calculate total videos for completion percentage
    const totalVideos = course.chapters.reduce(
      (total, ch) => total + ch.videos.length,
      0
    );

    const watchedCount = progress ? progress.watchedVideos.length : 0;
    const completionPercent =
      totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;

    return sendSuccess(res, 200, 'تقدم المستخدم', {
      courseId,
      watchedVideos: progress ? progress.watchedVideos : [],
      lastWatchedVideo: progress ? progress.lastWatchedVideo : null,
      completionPercent,
      totalVideos,
      watchedCount,
      startedAt: progress ? progress.startedAt : null,
      completedAt: progress ? progress.completedAt : null,
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE PROGRESS (mark video as watched) ──────────────────────────────────
/**
 * POST /api/progress/:courseId
 * Marks a video as watched (or unwatched if already watched)
 * Body: { videoId: "...", action: "watch" | "unwatch" }
 */
const updateProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { videoId, action = 'watch' } = req.body;

    // Verify the course and video exist
    const course = await Course.findById(courseId).select('chapters');
    if (!course) return sendError(res, 404, 'الدورة غير موجودة');

    // Check that the videoId belongs to this course
    const videoExists = course.chapters.some((ch) =>
      ch.videos.some((v) => v._id.toString() === videoId)
    );

    if (!videoExists) {
      return sendError(res, 404, 'الفيديو غير موجود في هذه الدورة');
    }

    // Total videos for completion check
    const totalVideos = course.chapters.reduce(
      (total, ch) => total + ch.videos.length,
      0
    );

    // Upsert: create progress doc if it doesn't exist
    let progress = await Progress.findOne({ userId: req.user._id, courseId });

    if (!progress) {
      progress = new Progress({
        userId: req.user._id,
        courseId,
        watchedVideos: [],
      });
    }

    const videoObjectId = videoId;
    const alreadyWatched = progress.watchedVideos.some(
      (id) => id.toString() === videoObjectId
    );

    if (action === 'watch' && !alreadyWatched) {
      progress.watchedVideos.push(videoObjectId);
    } else if (action === 'unwatch' && alreadyWatched) {
      progress.watchedVideos = progress.watchedVideos.filter(
        (id) => id.toString() !== videoObjectId
      );
    }

    // Update last watched video
    if (action === 'watch') {
      progress.lastWatchedVideo = videoObjectId;
    }

    // Check if course is completed
    if (progress.watchedVideos.length >= totalVideos && !progress.completedAt) {
      progress.completedAt = new Date();
    } else if (progress.watchedVideos.length < totalVideos) {
      progress.completedAt = null;
    }

    await progress.save();

    const completionPercent =
      totalVideos > 0
        ? Math.round((progress.watchedVideos.length / totalVideos) * 100)
        : 0;

    return sendSuccess(res, 200, 'تم تحديث التقدم', {
      watchedVideos: progress.watchedVideos,
      completionPercent,
      completedAt: progress.completedAt,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL USER PROGRESS ────────────────────────────────────────────────────
/**
 * GET /api/progress
 * Returns progress for ALL courses the user has started
 */
const getAllProgress = async (req, res, next) => {
  try {
    const progressList = await Progress.find({ userId: req.user._id })
      .populate('courseId', 'title thumbnail chapters')
      .sort('-updatedAt');

    // Calculate completion % for each
    const enriched = progressList.map((p) => {
      const course = p.courseId;
      if (!course) return p;

      const totalVideos = course.chapters
        ? course.chapters.reduce((total, ch) => total + ch.videos.length, 0)
        : 0;

      const completionPercent =
        totalVideos > 0
          ? Math.round((p.watchedVideos.length / totalVideos) * 100)
          : 0;

      return {
        courseId: course._id,
        courseTitle: course.title,
        courseThumbnail: course.thumbnail,
        watchedCount: p.watchedVideos.length,
        totalVideos,
        completionPercent,
        lastWatchedVideo: p.lastWatchedVideo,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
      };
    });

    return sendSuccess(res, 200, 'تقدم المستخدم في جميع الدورات', enriched);
  } catch (error) {
    next(error);
  }
};

module.exports = { getProgress, updateProgress, getAllProgress };
