const User = require('../models/User');
const Guide = require('../models/Guide');
const VehicleOwner = require('../models/VehicleOwner');
const Vehicle = require('../models/Vehicle');
const errorResponse = require('../utils/errorResponse');
const notificationService = require('../services/notifications');

/**
 * @desc    Get pending guide verifications
 * @route   GET /api/admin/guide-verifications
 * @access  Private (Admin only)
 */
exports.getPendingGuideVerifications = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skipIndex = (page - 1) * limit;
    
    // Get pending verifications
    const pendingVerifications = await Guide.find({ verificationStatus: 'pending' })
      .sort({ createdAt: 1 })
      .skip(skipIndex)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'firstName lastName email profileImage phoneNumber',
        model: User
      });
    
    // Get total count
    const total = await Guide.countDocuments({ verificationStatus: 'pending' });
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      status: 'success',
      data: {
        count: pendingVerifications.length,
        total,
        pagination: {
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        verifications: pendingVerifications
      }
    });
  } catch (error) {
    console.error('Error getting pending guide verifications:', error);
    res.status(500).json(
      errorResponse('Server error retrieving pending guide verifications', 500)
    );
  }
};

/**
 * @desc    Approve guide verification
 * @route   PUT /api/admin/guide-verifications/:id/approve
 * @access  Private (Admin only)
 */
exports.approveGuideVerification = async (req, res) => {
  try {
    // Find guide
    const guide = await Guide.findById(req.params.id).populate({
      path: 'userId',
      select: 'email firstName',
      model: User
    });
    
    if (!guide) {
      return res.status(404).json(
        errorResponse('Guide not found', 404)
      );
    }
    
    // Check if guide is pending verification
    if (guide.verificationStatus !== 'pending') {
      return res.status(400).json(
        errorResponse('This guide is not pending verification', 400)
      );
    }
    
    // Update verification status
    guide.verificationStatus = 'approved';
    guide.isVerified = true;
    await guide.save();
    
    // Send notification to guide
    await notificationService.sendNotification({
      userId: guide.userId._id,
      type: 'guide_verification',
      title: 'Verification Approved',
      message: 'Your guide profile has been verified. You can now receive bookings from tourists.',
      priority: 'high',
      sendEmail: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { guide }
    });
  } catch (error) {
    console.error('Error approving guide verification:', error);
    res.status(500).json(
      errorResponse('Server error approving guide verification', 500)
    );
  }
};

/**
 * @desc    Reject guide verification
 * @route   PUT /api/admin/guide-verifications/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectGuideVerification = async (req, res) => {
  try {
    // Validate request
    if (!req.body.reason) {
      return res.status(400).json(
        errorResponse('Please provide a reason for rejection', 400)
      );
    }
    
    // Find guide
    const guide = await Guide.findById(req.params.id).populate({
      path: 'userId',
      select: 'email firstName',
      model: User
    });
    
    if (!guide) {
      return res.status(404).json(
        errorResponse('Guide not found', 404)
      );
    }
    
    // Check if guide is pending verification
    if (guide.verificationStatus !== 'pending') {
      return res.status(400).json(
        errorResponse('This guide is not pending verification', 400)
      );
    }
    
    // Update verification status
    guide.verificationStatus = 'rejected';
    guide.verificationNotes = req.body.reason;
    await guide.save();
    
    // Send notification to guide
    await notificationService.sendNotification({
      userId: guide.userId._id,
      type: 'guide_verification',
      title: 'Verification Rejected',
      message: `Your guide profile verification was rejected. Reason: ${req.body.reason}`,
      priority: 'high',
      sendEmail: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { guide }
    });
  } catch (error) {
    console.error('Error rejecting guide verification:', error);
    res.status(500).json(
      errorResponse('Server error rejecting guide verification', 500)
    );
  }
};

/**
 * @desc    Get pending vehicle owner verifications
 * @route   GET /api/admin/vehicle-owner-verifications
 * @access  Private (Admin only)
 */
exports.getPendingVehicleOwnerVerifications = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skipIndex = (page - 1) * limit;
    
    // Get pending verifications
    const pendingVerifications = await VehicleOwner.find({ verificationStatus: 'pending' })
      .sort({ createdAt: 1 })
      .skip(skipIndex)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'firstName lastName email profileImage phoneNumber',
        model: User
      });
    
    // Get total count
    const total = await VehicleOwner.countDocuments({ verificationStatus: 'pending' });
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      status: 'success',
      data: {
        count: pendingVerifications.length,
        total,
        pagination: {
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        verifications: pendingVerifications
      }
    });
  } catch (error) {
    console.error('Error getting pending vehicle owner verifications:', error);
    res.status(500).json(
      errorResponse('Server error retrieving pending vehicle owner verifications', 500)
    );
  }
};

/**
 * @desc    Approve vehicle owner verification
 * @route   PUT /api/admin/vehicle-owner-verifications/:id/approve
 * @access  Private (Admin only)
 */
exports.approveVehicleOwnerVerification = async (req, res) => {
  try {
    // Find vehicle owner
    const vehicleOwner = await VehicleOwner.findById(req.params.id).populate({
      path: 'userId',
      select: 'email firstName',
      model: User
    });
    
    if (!vehicleOwner) {
      return res.status(404).json(
        errorResponse('Vehicle owner not found', 404)
      );
    }
    
    // Check if vehicle owner is pending verification
    if (vehicleOwner.verificationStatus !== 'pending') {
      return res.status(400).json(
        errorResponse('This vehicle owner is not pending verification', 400)
      );
    }
    
    // Update verification status
    vehicleOwner.verificationStatus = 'approved';
    vehicleOwner.isVerified = true;
    await vehicleOwner.save();
    
    // Send notification to vehicle owner
    await notificationService.sendNotification({
      userId: vehicleOwner.userId._id,
      type: 'vehicle_owner_verification',
      title: 'Verification Approved',
      message: 'Your vehicle owner profile has been verified. You can now register vehicles and receive bookings.',
      priority: 'high',
      sendEmail: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { vehicleOwner }
    });
  } catch (error) {
    console.error('Error approving vehicle owner verification:', error);
    res.status(500).json(
      errorResponse('Server error approving vehicle owner verification', 500)
    );
  }
};

/**
 * @desc    Reject vehicle owner verification
 * @route   PUT /api/admin/vehicle-owner-verifications/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectVehicleOwnerVerification = async (req, res) => {
  try {
    // Validate request
    if (!req.body.reason) {
      return res.status(400).json(
        errorResponse('Please provide a reason for rejection', 400)
      );
    }
    
    // Find vehicle owner
    const vehicleOwner = await VehicleOwner.findById(req.params.id).populate({
      path: 'userId',
      select: 'email firstName',
      model: User
    });
    
    if (!vehicleOwner) {
      return res.status(404).json(
        errorResponse('Vehicle owner not found', 404)
      );
    }
    
    // Check if vehicle owner is pending verification
    if (vehicleOwner.verificationStatus !== 'pending') {
      return res.status(400).json(
        errorResponse('This vehicle owner is not pending verification', 400)
      );
    }
    
    // Update verification status
    vehicleOwner.verificationStatus = 'rejected';
    vehicleOwner.verificationNotes = req.body.reason;
    await vehicleOwner.save();
    
    // Send notification to vehicle owner
    await notificationService.sendNotification({
      userId: vehicleOwner.userId._id,
      type: 'vehicle_owner_verification',
      title: 'Verification Rejected',
      message: `Your vehicle owner profile verification was rejected. Reason: ${req.body.reason}`,
      priority: 'high',
      sendEmail: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { vehicleOwner }
    });
  } catch (error) {
    console.error('Error rejecting vehicle owner verification:', error);
    res.status(500).json(
      errorResponse('Server error rejecting vehicle owner verification', 500)
    );
  }
};

/**
 * @desc    Get pending vehicle verifications
 * @route   GET /api/admin/vehicle-verifications
 * @access  Private (Admin only)
 */
exports.getPendingVehicleVerifications = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skipIndex = (page - 1) * limit;
    
    // Get pending verifications
    const pendingVerifications = await Vehicle.find({ verificationStatus: 'pending' })
      .sort({ createdAt: 1 })
      .skip(skipIndex)
      .limit(limit)
      .populate({
        path: 'ownerId',
        select: 'firstName lastName email profileImage',
        model: User
      });
    
    // Get total count
    const total = await Vehicle.countDocuments({ verificationStatus: 'pending' });
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      status: 'success',
      data: {
        count: pendingVerifications.length,
        total,
        pagination: {
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        verifications: pendingVerifications
      }
    });
  } catch (error) {
    console.error('Error getting pending vehicle verifications:', error);
    res.status(500).json(
      errorResponse('Server error retrieving pending vehicle verifications', 500)
    );
  }
};

/**
 * @desc    Approve vehicle verification
 * @route   PUT /api/admin/vehicle-verifications/:id/approve
 * @access  Private (Admin only)
 */
exports.approveVehicleVerification = async (req, res) => {
  try {
    // Find vehicle
    const vehicle = await Vehicle.findById(req.params.id).populate({
      path: 'ownerId',
      select: 'email firstName',
      model: User
    });
    
    if (!vehicle) {
      return res.status(404).json(
        errorResponse('Vehicle not found', 404)
      );
    }
    
    // Check if vehicle is pending verification
    if (vehicle.verificationStatus !== 'pending') {
      return res.status(400).json(
        errorResponse('This vehicle is not pending verification', 400)
      );
    }
    
    // Update verification status
    vehicle.verificationStatus = 'approved';
    vehicle.isVerified = true;
    await vehicle.save();
    
    // Send notification to vehicle owner
    await notificationService.sendNotification({
      userId: vehicle.ownerId._id,
      type: 'vehicle_verification',
      title: 'Vehicle Verification Approved',
      message: `Your vehicle (${vehicle.make} ${vehicle.model}) has been verified. It is now available for bookings.`,
      priority: 'high',
      sendEmail: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { vehicle }
    });
  } catch (error) {
    console.error('Error approving vehicle verification:', error);
    res.status(500).json(
      errorResponse('Server error approving vehicle verification', 500)
    );
  }
};

/**
 * @desc    Reject vehicle verification
 * @route   PUT /api/admin/vehicle-verifications/:id/reject
 * @access  Private (Admin only)
 */
exports.rejectVehicleVerification = async (req, res) => {
  try {
    // Validate request
    if (!req.body.reason) {
      return res.status(400).json(
        errorResponse('Please provide a reason for rejection', 400)
      );
    }
    
    // Find vehicle
    const vehicle = await Vehicle.findById(req.params.id).populate({
      path: 'ownerId',
      select: 'email firstName',
      model: User
    });
    
    if (!vehicle) {
      return res.status(404).json(
        errorResponse('Vehicle not found', 404)
      );
    }
    
    // Check if vehicle is pending verification
    if (vehicle.verificationStatus !== 'pending') {
      return res.status(400).json(
        errorResponse('This vehicle is not pending verification', 400)
      );
    }
    
    // Update verification status
    vehicle.verificationStatus = 'rejected';
    vehicle.verificationNotes = req.body.reason;
    await vehicle.save();
    
    // Send notification to vehicle owner
    await notificationService.sendNotification({
      userId: vehicle.ownerId._id,
      type: 'vehicle_verification',
      title: 'Vehicle Verification Rejected',
      message: `Your vehicle (${vehicle.make} ${vehicle.model}) verification was rejected. Reason: ${req.body.reason}`,
      priority: 'high',
      sendEmail: true
    });
    
    res.status(200).json({
      status: 'success',
      data: { vehicle }
    });
  } catch (error) {
    console.error('Error rejecting vehicle verification:', error);
    res.status(500).json(
      errorResponse('Server error rejecting vehicle verification', 500)
    );
  }
};