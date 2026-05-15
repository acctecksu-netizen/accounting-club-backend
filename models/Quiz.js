// models/Quiz.js
// Quiz schema with multiple-choice questions

const mongoose = require('mongoose');

// ─── QUESTION SCHEMA (embedded in Quiz) ──────────────────────────────────────
const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [1000, 'Question cannot exceed 1000 characters'],
    },

    // Array of possible answers (2-6 options)
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: function (opts) {
          return opts.length >= 2 && opts.length <= 6;
        },
        message: 'A question must have between 2 and 6 options',
      },
    },

    // Index into the options array (0-based)
    // e.g., correctAnswer: 2 means options[2] is correct
    correctAnswer: {
      type: Number,
      required: [true, 'Correct answer index is required'],
      min: 0,
    },

    // Explanation shown after answering (optional but helpful)
    explanation: {
      type: String,
      default: '',
      maxlength: [500, 'Explanation cannot exceed 500 characters'],
    },

    // Order within the quiz
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

// ─── QUIZ SCHEMA ──────────────────────────────────────────────────────────────
const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Optional: link quiz to a specific course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },

    // Difficulty (used for frontend badge color)
    difficulty: {
      type: String,
      enum: ['سهل', 'متوسط', 'صعب'],
      default: 'متوسط',
    },

    // Time limit in minutes (0 = no limit)
    timeLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    questions: [questionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── INDEXES ──────────────────────────────────────────────────────────────────
quizSchema.index({ title: 'text', description: 'text' });
quizSchema.index({ course: 1 });
quizSchema.index({ isPublished: 1 });

// ─── VIRTUAL ──────────────────────────────────────────────────────────────────
quizSchema.virtual('totalQuestions').get(function () {
  return this.questions.length;
});

// ─── VALIDATION ───────────────────────────────────────────────────────────────
// Ensure correctAnswer is within the options array bounds
questionSchema.pre('validate', function (next) {
  if (this.correctAnswer >= this.options.length) {
    this.invalidate('correctAnswer', 'correctAnswer must be a valid index into options array');
  }
  next();
});

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
