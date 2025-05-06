const User = require('../models/User');
const Tourist = require('../models/Tourist');
const Guide = require('../models/Guide');
const VehicleOwner = require('../models/VehicleOwner');
const cloudinaryService = require('../services/cloudinary');
const errorResponse = require('../utils/errorResponse');

/**
 * @desc    Get current user's profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch role-specific profile data
    let profileData = null;
    
    if (user.role === 'tourist') {
      profileData = await Tourist.findOne({ userId: user._id });
    } else if (user.role === 'guide') {
      profileData = await Guide.findOne({ userId: user._id });
    } else if (user.role === 'vehicleOwner') {
      profileData = await VehicleOwner.findOne({ userId: user._id });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage,
          phoneNumber: user.phoneNumber,
          preferredLanguage: user.preferredLanguage,
          notificationSettings: user.notificationSettings,
          createdAt: user.createdAt,
        },
        profile: profileData
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json(
      errorResponse('Server error retrieving user profile', 500)
    );
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, preferredLanguage } = req.body;
    
    // Fields to update
    const updateFields = {};
    
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (phoneNumber) updateFields.phoneNumber = phoneNumber;
    if (preferredLanguage) updateFields.preferredLanguage = preferredLanguage;
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
          profileImage: updatedUser.profileImage,
          phoneNumber: updatedUser.phoneNumber,
          preferredLanguage: updatedUser.preferredLanguage,
          notificationSettings: updatedUser.notificationSettings,
        }
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json(
      errorResponse('Server error updating user profile', 500)
    );
  }
};

/**
 * @desc    Upload profile image
 * @route   POST /api/users/profile/image
 * @access  Private
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json(
        errorResponse('Please upload an image', 400)
      );
    }
    
    // Upload image to Cloudinary
    const result = await cloudinaryService.uploadFile(
      req.file.path,
      'sri-lanka-tourism/users/profile-images',
      { public_id: `user_${req.user._id}` }
    );
    
    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: result.secure_url },
      { new: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        profileImage: updatedUser.profileImage
      }
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json(
      errorResponse('Server error uploading profile image', 500)
    );
  }
};

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/notification-settings
 * @access  Private
 */
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { email, push, sms } = req.body;
    
    // Update notification settings
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        'notificationSettings.email': email !== undefined ? email : req.user.notificationSettings.email,
        'notificationSettings.push': push !== undefined ? push : req.user.notificationSettings.push,
        'notificationSettings.sms': sms !== undefined ? sms : req.user.notificationSettings.sms,
      },
      { new: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        notificationSettings: updatedUser.notificationSettings
      }
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json(
      errorResponse('Server error updating notification settings', 500)
    );
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Check if current password matches
    const isMatch = await user.matchPassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json(
        errorResponse('Current password is incorrect', 401)
      );
    }
    
    // Set new password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json(
      errorResponse('Server error changing password', 500)
    );
  }
};

/**
 * @desc    Update tourist profile
 * @route   PUT /api/users/tourist-profile
 * @access  Private (Tourist only)
 */
exports.updateTouristProfile = async (req, res) => {
  try {
    // Check if user is a tourist
    if (req.user.role !== 'tourist') {
      return res.status(403).json(
        errorResponse('Not authorized to update tourist profile', 403)
      );
    }
    
    const { 
      nationality, 
      passportNumber, 
      interests, 
      accommodationType, 
      budgetRange, 
      travelStyle,
      emergencyContact
    } = req.body;
    
    // Fields to update
    const updateFields = {};
    
    if (nationality) updateFields.nationality = nationality;
    if (passportNumber) updateFields.passportNumber = passportNumber;
    if (interests) updateFields['preferences.interests'] = interests;
    if (accommodationType) updateFields['preferences.accommodationType'] = accommodationType;
    if (budgetRange) updateFields['preferences.budgetRange'] = budgetRange;
    if (travelStyle) updateFields['preferences.travelStyle'] = travelStyle;
    if (emergencyContact) updateFields.emergencyContact = emergencyContact;
    
    // Update tourist profile
    const updatedProfile = await Tourist.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        profile: updatedProfile
      }
    });
  } catch (error) {
    console.error('Error updating tourist profile:', error);
    res.status(500).json(
      errorResponse('Server error updating tourist profile', 500)
    );
  }
};

/**
 * @desc    Get user profile image by email
 * @route   GET /api/users/profile-image/:email
 * @access  Public
 */
exports.getUserProfileImageByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json(
        errorResponse('Email is required', 400)
      );
    }
    
    const user = await User.findOne({ email }).select('firstName lastName profileImage');
    
    if (!user) {
      return res.status(404).json(
        errorResponse('User not found', 404)
      );
    }
    
    // If profile image doesn't exist, generate a default avatar
    const profileImage = user.profileImage || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}+${encodeURIComponent(user.lastName)}&background=random`;
    
    res.status(200).json({
      status: 'success',
      data: {
        profileImage
      }
    });
  } catch (error) {
    console.error('Error getting user profile image:', error);
    res.status(500).json(
      errorResponse('Server error getting user profile image', 500)
    );
  }
};