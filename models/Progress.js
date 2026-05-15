// models/Progress.js
// Tracks which videos a user has watched in each course
// One document per (user, course) pair

const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },

    // Array of video IDs the user has marked as watched
    watchedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    // Optional: track quiz results per course
    quizResults: [
      {
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
        score: { type: Number, min: 0, max: 100 },
        completedAt: { type: Date, default: Date.now },
      },
    ],

    // Last video the user was watching (for "continue watching" feature)
    lastWatchedVideo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // When the user started this course
    startedAt: {
      type: Date,
      default: Date.now,
    },

    // When the user completed the course (all videos watched)
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ──────────────────────────────────────────────────────────────────
// Compound unique index: one progress doc per (user, course) pair
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
progressSchema.index({ userId: 1 });

// ─── VIRTUAL ──────────────────────────────────────────────────────────────────
progressSchema.virtual('completionPercent').get(function () {
  // This virtual requires course data to be populated
  return this._completionPercent || 0;
});

const Progress = mongoose.model('Progress', progressSchema);
module.exports = Progress;
