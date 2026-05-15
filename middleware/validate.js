// middleware/validate.js
// Input validation rules using express-validator
// Returns 422 with field-level errors if validation fails

const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

/**
 * checkValidation — call this at the end of any validation chain
 * Reads express-validator errors and returns them in our standard format
 */
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors as { field: 'email', message: 'Invalid email' }
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return sendError(res, 422, 'بيانات غير صالحة', formatted); // Invalid data
  }
  next();
};

// ─── AUTH VALIDATORS ──────────────────────────────────────────────────────────

const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('الاسم مطلوب')
    .isLength({ min: 2, max: 60 }).withMessage('الاسم يجب أن يكون بين 2 و 60 حرف'),

  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صالح')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isLength({ min: 8 }).withMessage('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم'),

  checkValidation,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صالح')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة'),

  checkValidation,
];

// ─── COURSE VALIDATORS ────────────────────────────────────────────────────────

const courseValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('عنوان الدورة مطلوب')
    .isLength({ max: 200 }).withMessage('العنوان لا يمكن أن يتجاوز 200 حرف'),

  body('description')
    .trim()
    .notEmpty().withMessage('وصف الدورة مطلوب')
    .isLength({ max: 2000 }).withMessage('الوصف لا يمكن أن يتجاوز 2000 حرف'),

  body('category')
    .optional()
    .isIn(['محاسبة', 'تدقيق', 'ضرائب', 'تكاليف', 'مالية', 'أخرى'])
    .withMessage('الفئة غير صالحة'),

  body('level')
    .optional()
    .isIn(['مبتدئ', 'متوسط', 'متقدم'])
    .withMessage('المستوى غير صالح'),

  body('isPublished')
    .optional()
    .isBoolean().withMessage('قيمة النشر يجب أن تكون true أو false'),

  checkValidation,
];

// ─── CHAPTER VALIDATORS ───────────────────────────────────────────────────────

const chapterValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('عنوان الفصل مطلوب')
    .isLength({ max: 200 }).withMessage('العنوان لا يمكن أن يتجاوز 200 حرف'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('الوصف لا يمكن أن يتجاوز 500 حرف'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('الترتيب يجب أن يكون رقماً موجباً'),

  checkValidation,
];

// ─── VIDEO VALIDATORS ─────────────────────────────────────────────────────────

const videoValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('عنوان الفيديو مطلوب')
    .isLength({ max: 200 }).withMessage('العنوان لا يمكن أن يتجاوز 200 حرف'),

  body('url')
    .trim()
    .notEmpty().withMessage('رابط الفيديو مطلوب')
    .isURL({ require_protocol: true }).withMessage('رابط الفيديو غير صالح'),

  body('duration')
    .optional()
    .trim()
    .matches(/^\d+:\d{2}$/).withMessage('مدة الفيديو يجب أن تكون بصيغة دقيقة:ثانية مثل 12:34'),

  body('order')
    .optional()
    .isInt({ min: 0 }).withMessage('الترتيب يجب أن يكون رقماً موجباً'),

  checkValidation,
];

// ─── QUIZ VALIDATORS ──────────────────────────────────────────────────────────

const quizValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('عنوان الاختبار مطلوب')
    .isLength({ max: 200 }).withMessage('العنوان لا يمكن أن يتجاوز 200 حرف'),

  body('difficulty')
    .optional()
    .isIn(['سهل', 'متوسط', 'صعب'])
    .withMessage('مستوى الصعوبة غير صالح'),

  body('timeLimit')
    .optional()
    .isInt({ min: 0 }).withMessage('وقت الاختبار يجب أن يكون رقماً موجباً'),

  body('questions')
    .optional()
    .isArray().withMessage('الأسئلة يجب أن تكون قائمة'),

  body('questions.*.question')
    .if(body('questions').exists())
    .trim()
    .notEmpty().withMessage('نص السؤال مطلوب'),

  body('questions.*.options')
    .if(body('questions').exists())
    .isArray({ min: 2, max: 6 }).withMessage('يجب توفير من 2 إلى 6 خيارات'),

  body('questions.*.correctAnswer')
    .if(body('questions').exists())
    .isInt({ min: 0 }).withMessage('الجواب الصحيح يجب أن يكون رقماً صحيحاً'),

  checkValidation,
];

// ─── PROGRESS VALIDATORS ──────────────────────────────────────────────────────

const progressValidation = [
  body('videoId')
    .notEmpty().withMessage('معرف الفيديو مطلوب')
    .isMongoId().withMessage('معرف الفيديو غير صالح'),

  checkValidation,
];

// ─── PARAM VALIDATORS ─────────────────────────────────────────────────────────

const mongoIdParam = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`${paramName} غير صالح`),
  checkValidation,
];

module.exports = {
  signupValidation,
  loginValidation,
  courseValidation,
  chapterValidation,
  videoValidation,
  quizValidation,
  progressValidation,
  mongoIdParam,
  checkValidation,
};
