// models/Course.js
// Course schema with nested chapters and videos
// Uses embedded documents for chapters/videos (good for small/medium data)

const mongoose = require('mongoose');

// ─── VIDEO SCHEMA (embedded inside Chapter) ───────────────────────────────────
const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Video title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    // URL to the video (YouTube embed, direct mp4, etc.)
    url: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true,
    },

    // Duration label like "12:34" — stored as string for flexibility
    duration: {
      type: String,
      default: '',
    },

    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },

    // Order within the chapter (for sorting)
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true, timestamps: true }
);

// ─── CHAPTER SCHEMA (embedded inside Course) ─────────────────────────────────
const chapterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Chapter title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Order within the course
    order: {
      type: Number,
      default: 0,
    },

    videos: [videoSchema],
  },
  { _id: true, timestamps: true }
);

// ─── COURSE SCHEMA ────────────────────────────────────────────────────────────
const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'Course description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // Category for filtering (matches frontend filter tabs)
    category: {
      type: String,
      enum: ['محاسبة', 'تدقيق', 'ضرائب', 'تكاليف', 'مالية', 'أخرى'],
      default: 'أخرى',
    },

    // Path to uploaded thumbnail image
    thumbnail: {
      type: String,
      default: null,
    },

    // Path to uploaded PDF resource
    pdfResource: {
      type: String,
      default: null,
    },

    // Difficulty level
    level: {
      type: String,
      enum: ['مبتدئ', 'متوسط', 'متقدم'],
      default: 'مبتدئ',
    },

    // Whether the course is visible to students
    isPublished: {
      type: Boolean,
      default: false,
    },

    // Tags for search (array of strings)
    tags: [{ type: String, trim: true }],

    // Who created this course
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    chapters: [chapterSchema],
  },
  {
    timestamps: true,
    // Add virtual fields when converting to JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ──────────────────────────────────────────────────────────────────
courseSchema.index({ title: 'text', description: 'text', tags: 'text' }); // Full-text search
courseSchema.index({ category: 1, isPublished: 1 });
courseSchema.index({ createdAt: -1 });

// ─── VIRTUAL FIELDS ───────────────────────────────────────────────────────────

// Total number of videos across all chapters
courseSchema.virtual('totalVideos').get(function () {
  return this.chapters.reduce((total, chapter) => total + chapter.videos.length, 0);
});

// Total number of chapters
courseSchema.virtual('totalChapters').get(function () {
  return this.chapters.length;
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
