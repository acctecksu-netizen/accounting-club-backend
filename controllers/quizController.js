// controllers/quizController.js
// Full CRUD for quizzes

const Quiz = require('../models/Quiz');
const { sendSuccess, sendError, buildPaginationMeta } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── GET ALL QUIZZES ──────────────────────────────────────────────────────────
/**
 * GET /api/quizzes
 * Public — with pagination, search, difficulty filter
 * NOTE: Correct answers are hidden from non-admins
 */
const getQuizzes = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, search = '', difficulty = '', course = '' } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Only show published quizzes to students
    if (!req.user || req.user.role !== 'admin') {
      filter.isPublished = true;
    }

    if (difficulty) filter.difficulty = difficulty;
    if (course) filter.course = course;
    if (search.trim()) filter.$text = { $search: search.trim() };

    // For non-admins, hide the correctAnswer field to prevent cheating
    const isAdmin = req.user && req.user.role === 'admin';
    const projection = isAdmin ? {} : { 'questions.correctAnswer': 0, 'questions.explanation': 0 };

    const [quizzes, total] = await Promise.all([
      Quiz.find(filter)
        .select(projection)
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .populate('course', 'title')
        .populate('createdBy', 'name'),
      Quiz.countDocuments(filter),
    ]);

    return sendSuccess(
      res,
      200,
      'قائمة الاختبارات',
      quizzes,
      buildPaginationMeta(total, pageNum, limitNum)
    );
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE QUIZ ──────────────────────────────────────────────────────────
/**
 * GET /api/quizzes/:quizId
 * Returns quiz — hides correct answers for students
 */
const getQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const isAdmin = req.user && req.user.role === 'admin';

    let query = Quiz.findById(quizId)
      .populate('course', 'title')
      .populate('createdBy', 'name');

    if (!isAdmin) {
      query = query.select('-questions.correctAnswer -questions.explanation');
    }

    const quiz = await query;

    if (!quiz) return sendError(res, 404, 'الاختبار غير موجود');

    if (!quiz.isPublished && !isAdmin) {
      return sendError(res, 404, 'الاختبار غير موجود');
    }

    return sendSuccess(res, 200, 'تفاصيل الاختبار', quiz);
  } catch (error) {
    next(error);
  }
};

// ─── GET QUIZ ANSWERS (Admin only) ───────────────────────────────────────────
/**
 * GET /api/quizzes/:quizId/answers — Admin only
 * Returns quiz with correct answers for grading/editing
 */
const getQuizWithAnswers = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
      .populate('course', 'title')
      .populate('createdBy', 'name');

    if (!quiz) return sendError(res, 404, 'الاختبار غير موجود');

    return sendSuccess(res, 200, 'الاختبار مع الإجابات', quiz);
  } catch (error) {
    next(error);
  }
};

// ─── SUBMIT QUIZ ANSWERS ──────────────────────────────────────────────────────
/**
 * POST /api/quizzes/:quizId/submit
 * Students submit their answers and get a score back
 */
const submitQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // Array of selected answer indices

    if (!Array.isArray(answers)) {
      return sendError(res, 400, 'الإجابات يجب أن تكون قائمة');
    }

    // Fetch quiz WITH answers for grading
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return sendError(res, 404, 'الاختبار غير موجود');
    if (!quiz.isPublished) return sendError(res, 404, 'الاختبار غير موجود');

    // Grade the answers
    let correct = 0;
    const results = quiz.questions.map((q, i) => {
      const userAnswer = answers[i] !== undefined ? parseInt(answers[i]) : -1;
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correct++;

      return {
        questionId: q._id,
        question: q.question,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || '',
      };
    });

    const score = Math.round((correct / quiz.questions.length) * 100);

    logger.info(`Quiz submitted: "${quiz.title}" by user ${req.user?._id}, score: ${score}%`);

    return sendSuccess(res, 200, 'نتيجة الاختبار', {
      score,
      correct,
      total: quiz.questions.length,
      results,
    });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE QUIZ ──────────────────────────────────────────────────────────────
/**
 * POST /api/quizzes — Admin only
 */
const createQuiz = async (req, res, next) => {
  try {
    const { title, description, course, difficulty, timeLimit, isPublished, questions } = req.body;

    const quiz = await Quiz.create({
      title,
      description: description || '',
      course: course || null,
      difficulty: difficulty || 'متوسط',
      timeLimit: timeLimit || 0,
      isPublished: isPublished === true || isPublished === 'true',
      questions: questions || [],
      createdBy: req.user._id,
    });

    logger.info(`Quiz created: "${title}" by admin ${req.user.email}`);

    return sendSuccess(res, 201, 'تم إنشاء الاختبار بنجاح', quiz);
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE QUIZ ──────────────────────────────────────────────────────────────
/**
 * PUT /api/quizzes/:quizId — Admin only
 */
const updateQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const updates = req.body;

    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!quiz) return sendError(res, 404, 'الاختبار غير موجود');

    logger.info(`Quiz updated: "${quiz.title}" by admin ${req.user.email}`);

    return sendSuccess(res, 200, 'تم تحديث الاختبار بنجاح', quiz);
  } catch (error) {
    next(error);
  }
};

// ─── DELETE QUIZ ──────────────────────────────────────────────────────────────
/**
 * DELETE /api/quizzes/:quizId — Admin only
 */
const deleteQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findByIdAndDelete(quizId);
    if (!quiz) return sendError(res, 404, 'الاختبار غير موجود');

    logger.info(`Quiz deleted: "${quiz.title}" by admin ${req.user.email}`);

    return sendSuccess(res, 200, 'تم حذف الاختبار بنجاح');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuizzes,
  getQuiz,
  getQuizWithAnswers,
  submitQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
};
