// routes/quizRoutes.js

const express = require('express');
const router = express.Router();
const csrf = require('csurf');

const {
  getQuizzes, getQuiz, getQuizWithAnswers, submitQuiz,
  createQuiz, updateQuiz, deleteQuiz,
} = require('../controllers/quizController');

const { quizValidation } = require('../middleware/validate');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

const csrfProtection = csrf({ cookie: false });

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// GET all quizzes (correct answers hidden for students)
router.get('/', optionalAuth, getQuizzes);

// GET single quiz (correct answers hidden for students)
router.get('/:quizId', optionalAuth, getQuiz);

// ─── AUTH REQUIRED ────────────────────────────────────────────────────────────

// POST submit quiz answers
router.post('/:quizId/submit', requireAuth, csrfProtection, submitQuiz);

// ─── ADMIN ONLY ───────────────────────────────────────────────────────────────

// GET quiz WITH answers (for admin editing)
router.get('/:quizId/answers', requireAuth, requireAdmin, getQuizWithAnswers);

// POST create quiz
router.post('/', requireAuth, requireAdmin, csrfProtection, quizValidation, createQuiz);

// PUT update quiz
router.put('/:quizId', requireAuth, requireAdmin, csrfProtection, updateQuiz);

// DELETE quiz
router.delete('/:quizId', requireAuth, requireAdmin, csrfProtection, deleteQuiz);

module.exports = router;
