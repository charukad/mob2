const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const usersController = require('../../controllers/users');
const { protect, authorize } = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validation');
const { uploadSingleImage } = require('../../middleware/upload');

// @route   GET /api/users/profile-image/:email
// @desc    Get user profile image by email
// @access  Public
router.get('/profile-image/:email', usersController.getUserProfileImageByEmail);

// Protect all routes below this middleware
router.use(protect);

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', usersController.getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phoneNumber')
      .optional()
      .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
      .withMessage('Please enter a valid phone number'),
    body('preferredLanguage').optional().isIn(['en', 'si', 'ta']).withMessage('Preferred language must be English, Sinhala, or Tamil'),
    validationMiddleware
  ],
  usersController.updateProfile
);

// @route   POST /api/users/profile/image
// @desc    Upload profile image
// @access  Private
router.post(
  '/profile/image',
  uploadSingleImage('profileImage'),
  usersController.uploadProfileImage
);

// @route   PUT /api/users/notification-settings
// @desc    Update notification settings
// @access  Private
router.put(
  '/notification-settings',
  [
    body('email').optional().isBoolean().withMessage('Email notification setting must be a boolean'),
    body('push').optional().isBoolean().withMessage('Push notification setting must be a boolean'),
    body('sms').optional().isBoolean().withMessage('SMS notification setting must be a boolean'),
    validationMiddleware
  ],
  usersController.updateNotificationSettings
);

// @route   PUT /api/users/change-password
// @desc    Change password
// @access  Private
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
    validationMiddleware
  ],
  usersController.changePassword
);

// @route   PUT /api/users/tourist-profile
// @desc    Update tourist profile
// @access  Private (Tourist only)
router.put(
  '/tourist-profile',
  [
    authorize('tourist'),
    body('nationality').optional().trim(),
    body('passportNumber').optional().trim(),
    body('interests').optional().isArray().withMessage('Interests must be an array'),
    body('accommodationType').optional().isArray().withMessage('Accommodation types must be an array'),
    body('budgetRange').optional().isIn(['budget', 'moderate', 'luxury']).withMessage('Budget range must be budget, moderate, or luxury'),
    body('travelStyle').optional().isArray().withMessage('Travel styles must be an array'),
    body('emergencyContact.name').optional().trim(),
    body('emergencyContact.relationship').optional().trim(),
    body('emergencyContact.phoneNumber').optional().trim(),
    validationMiddleware
  ],
  usersController.updateTouristProfile
);

module.exports = router;