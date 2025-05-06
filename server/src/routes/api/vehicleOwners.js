const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const vehicleOwnersController = require('../../controllers/vehicleOwners');
const { protect, authorize } = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validation');
const { uploadMultipleDocuments } = require('../../middleware/upload');

// Public routes
router.get('/', vehicleOwnersController.getVehicleOwners);
router.get('/:id', vehicleOwnersController.getVehicleOwnerById);

// Protected routes - Vehicle Owner only
router.use(protect);

// Vehicle owner profile
router.get('/profile', authorize('vehicleOwner'), vehicleOwnersController.getVehicleOwnerProfile);

router.put(
  '/profile',
  [
    authorize('vehicleOwner'),
    body('nic').optional().trim(),
    body('businessName').optional().trim(),
    body('businessRegistrationNumber').optional().trim(),
    body('address.street').optional().trim(),
    body('address.city').optional().trim(),
    body('address.state').optional().trim(),
    body('address.postalCode').optional().trim(),
    body('address.country').optional().trim(),
    body('operatingAreas').optional().isArray().withMessage('Operating areas must be an array'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot be more than 500 characters'),
    validationMiddleware
  ],
  vehicleOwnersController.updateVehicleOwnerProfile
);

// Upload verification documents
router.post(
  '/verification-documents',
  authorize('vehicleOwner'),
  uploadMultipleDocuments('documents', 5),
  vehicleOwnersController.uploadVerificationDocuments
);

// Submit profile for verification
router.post(
  '/submit-verification',
  authorize('vehicleOwner'),
  vehicleOwnersController.submitForVerification
);

module.exports = router;