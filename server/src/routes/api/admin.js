const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../../controllers/admin');
const { protect, authorize } = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validation');

// Protect all admin routes - Admin only
router.use(protect, authorize('admin'));

// Guide verification routes
router.get('/guide-verifications', adminController.getPendingGuideVerifications);
router.put('/guide-verifications/:id/approve', adminController.approveGuideVerification);
router.put(
  '/guide-verifications/:id/reject',
  [
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    validationMiddleware
  ],
  adminController.rejectGuideVerification
);

// Vehicle owner verification routes
router.get('/vehicle-owner-verifications', adminController.getPendingVehicleOwnerVerifications);
router.put('/vehicle-owner-verifications/:id/approve', adminController.approveVehicleOwnerVerification);
router.put(
  '/vehicle-owner-verifications/:id/reject',
  [
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    validationMiddleware
  ],
  adminController.rejectVehicleOwnerVerification
);

// Vehicle verification routes
router.get('/vehicle-verifications', adminController.getPendingVehicleVerifications);
router.put('/vehicle-verifications/:id/approve', adminController.approveVehicleVerification);
router.put(
  '/vehicle-verifications/:id/reject',
  [
    body('reason').notEmpty().withMessage('Rejection reason is required'),
    validationMiddleware
  ],
  adminController.rejectVehicleVerification
);

module.exports = router;