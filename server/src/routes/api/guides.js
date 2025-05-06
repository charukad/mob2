const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const guidesController = require('../../controllers/guides');
const { protect, authorize } = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validation');
const { uploadMultipleDocuments } = require('../../middleware/upload');
const {
  getGuideDetails,
  updateGuideDetails,
  getGuideDetailsById,
  getAllGuides
} = require('../../controllers/guideDetailsController');

// Public routes
router.get('/', getAllGuides);
router.get('/:id', getGuideDetailsById);

// Protected routes - Guide only
router.use(protect);

// Guide profile
router.get('/profile', getGuideDetails);

router.put(
  '/profile',
  [
    authorize('guide'),
    body('nic').optional().trim(),
    body('licenseNumber').optional().trim(),
    body('licenseExpiry').optional().isISO8601().toDate().withMessage('License expiry must be a valid date'),
    body('expertise').optional().isArray().withMessage('Expertise must be an array'),
    body('languages').optional().isArray().withMessage('Languages must be an array'),
    body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a non-negative integer'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot be more than 500 characters'),
    body('serviceAreas').optional().isArray().withMessage('Service areas must be an array'),
    body('rates.hourly').optional().isNumeric().withMessage('Hourly rate must be a number'),
    body('rates.daily').optional().isNumeric().withMessage('Daily rate must be a number'),
    body('rates.currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    validationMiddleware
  ],
  guidesController.updateGuideProfile
);

// Upload verification documents
router.post(
  '/verification-documents',
  authorize('guide'),
  uploadMultipleDocuments('documents', 5),
  guidesController.uploadVerificationDocuments
);

// Update availability
router.put(
  '/availability',
  [
    authorize('guide'),
    body('monday').optional().isBoolean(),
    body('tuesday').optional().isBoolean(),
    body('wednesday').optional().isBoolean(),
    body('thursday').optional().isBoolean(),
    body('friday').optional().isBoolean(),
    body('saturday').optional().isBoolean(),
    body('sunday').optional().isBoolean(),
    body('unavailableDates').optional().isArray(),
    body('unavailableDates.*').optional().isISO8601().toDate().withMessage('Unavailable dates must be valid dates'),
    validationMiddleware
  ],
  guidesController.updateAvailability
);

// Submit profile for verification
router.post(
  '/submit-verification',
  authorize('guide'),
  guidesController.submitForVerification
);

module.exports = router;