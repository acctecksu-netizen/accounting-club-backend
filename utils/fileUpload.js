// utils/fileUpload.js
// Multer configuration for handling thumbnail and PDF uploads
// Files are stored locally — for production, swap to S3/Cloudinary

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { sendError } = require('./apiResponse');

// ─── STORAGE ENGINES ───────────────────────────────────────────────────────────

// Thumbnails: images only, stored in uploads/thumbnails/
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/thumbnails'));
  },
  filename: (req, file, cb) => {
    // Use UUID to prevent filename collisions and directory traversal
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `thumb_${uuidv4()}${ext}`);
  },
});

// PDFs: PDF only, stored in uploads/pdfs/
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/pdfs'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc_${uuidv4()}${ext}`);
  },
});

// ─── FILE FILTERS ──────────────────────────────────────────────────────────────

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'), false);
  }
};

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// ─── MULTER INSTANCES ──────────────────────────────────────────────────────────

// Thumbnail uploader — max 5MB
const uploadThumbnail = multer({
  storage: thumbnailStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// PDF uploader — max 20MB
const uploadPDF = multer({
  storage: pdfStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ─── ERROR HANDLER WRAPPER ─────────────────────────────────────────────────────
// Wraps multer to handle its errors in our standard format

const handleUpload = (uploadMiddleware, fieldName) => (req, res, next) => {
  uploadMiddleware.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 400, 'File is too large. Maximum size exceeded.');
      }
      return sendError(res, 400, `Upload error: ${err.message}`);
    }

    return sendError(res, 400, err.message || 'File upload failed');
  });
};

module.exports = {
  uploadThumbnail,
  uploadPDF,
  handleUpload,
};
