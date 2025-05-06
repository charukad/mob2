const multer = require('multer');
const path = require('path');
const fs = require('fs');
const errorResponse = require('../utils/errorResponse');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  // Accept images and PDF files
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image and PDF files are allowed!'), false);
  }
};

// Multer upload configurations
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Error handling middleware for multer
const handleUploadError = (req, res, next) => {
  return (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error (e.g., file too large)
      return res.status(400).json(
        errorResponse(err.message, 400)
      );
    } else if (err) {
      // Other errors
      return res.status(400).json(
        errorResponse(err.message, 400)
      );
    }
    // No error
    next();
  };
};

// Middleware for single image upload
exports.uploadSingleImage = (fieldName) => (req, res, next) => {
  uploadImage.single(fieldName)(req, res, handleUploadError(req, res, next));
};

// Middleware for multiple image upload
exports.uploadMultipleImages = (fieldName, maxCount = 10) => (req, res, next) => {
  uploadImage.array(fieldName, maxCount)(req, res, handleUploadError(req, res, next));
};

// Middleware for single document upload
exports.uploadSingleDocument = (fieldName) => (req, res, next) => {
  uploadDocument.single(fieldName)(req, res, handleUploadError(req, res, next));
};

// Middleware for multiple document upload
exports.uploadMultipleDocuments = (fieldName, maxCount = 5) => (req, res, next) => {
  uploadDocument.array(fieldName, maxCount)(req, res, handleUploadError(req, res, next));
};