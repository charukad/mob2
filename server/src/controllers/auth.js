const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Tourist = require('../models/Tourist');
const Guide = require('../models/Guide');
const VehicleOwner = require('../models/VehicleOwner');
const emailService = require('../services/email');
const errorResponse = require('../utils/errorResponse');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json(
        errorResponse('User with this email already exists', 400)
      );
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      phoneNumber,
      verificationToken,
      verificationTokenExpires,
    });

    // Create role-specific profile
    let profileData = {
      userId: user._id,
    };

    switch (role) {
      case 'tourist':
        await Tourist.create(profileData);
        break;
      case 'guide':
        await Guide.create(profileData);
        break;
      case 'vehicleOwner':
        await VehicleOwner.create(profileData);
        break;
      default:
        break;
    }

    // Send verification email
    try {
      await emailService.sendVerificationEmail(
        user.email,
        user.firstName,
        verificationToken
      );
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Continue with the registration process even if email fails
    }

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please verify your email.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(
      errorResponse('Server error during registration.', 500)
    );
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json(
        errorResponse('Invalid credentials', 401)
      );
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json(
        errorResponse('Invalid credentials', 401)
      );
    }

    // DEVELOPMENT MODIFICATION: Email verification check commented out
    // In production, uncomment this block to enforce email verification
    /*
    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json(
        errorResponse('Please verify your email before logging in', 401)
      );
    }
    */

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      refreshToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(
      errorResponse('Server error during login.', 500)
    );
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    // Find user with this verification token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json(
        errorResponse('Invalid or expired verification token', 400)
      );
    }

    // Update user verification status
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json(
      errorResponse('Server error during email verification', 500)
    );
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json(
        errorResponse('User not found with this email', 404)
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetToken
      );

      res.status(200).json({
        status: 'success',
        message: 'Password reset email sent',
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return res.status(500).json(
        errorResponse('Error sending password reset email', 500)
      );
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(
      errorResponse('Server error during password reset request', 500)
    );
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Find user by reset token and check if it's expired
    const user = await User.findOne({
      resetPasswordToken: req.body.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json(
        errorResponse('Invalid or expired reset token', 400)
      );
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Send confirmation email
    try {
      await emailService.sendPasswordChangeConfirmation(
        user.email,
        user.firstName
      );
    } catch (error) {
      console.error('Error sending password change confirmation:', error);
      // Continue with password reset even if email fails
    }

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(
      errorResponse('Server error during password reset', 500)
    );
  }
};

// @desc    Refresh authentication token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json(
        errorResponse('Refresh token is required', 401)
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      return res.status(401).json(
        errorResponse('Invalid refresh token', 401)
      );
    }

    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: refreshToken,
    });

    if (!user) {
      return res.status(401).json(
        errorResponse('Refresh token not found or user not found', 401)
      );
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      status: 'success',
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json(
      errorResponse('Server error during token refresh', 500)
    );
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // Find user by id
    const user = await User.findById(req.user.id).select('-password');
    
    // If user is a guide, fetch guide profile
    let guideProfile = null;
    if (user.role === 'guide') {
      // Find guide profile by user id
      guideProfile = await Guide.findOne({ userId: user._id });
      // If not found by userId, try email
      if (!guideProfile) {
        guideProfile = await Guide.findOne({ email: user.email });
      }
      
      console.log('Guide profile found for /auth/me:', guideProfile ? guideProfile._id : 'Not found');
    }
    
    // If user is a vehicle owner, fetch vehicle owner profile
    let vehicleOwnerProfile = null;
    if (user.role === 'vehicleOwner') {
      // Find vehicle owner profile by user id
      vehicleOwnerProfile = await VehicleOwner.findOne({ userId: user._id });
      
      console.log('Vehicle Owner profile found for /auth/me:', vehicleOwnerProfile ? vehicleOwnerProfile._id : 'Not found');
    }
    
    // Prepare response
    const responseData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    
    // Add guide profile if exists
    if (guideProfile) {
      responseData.guide = {
        bio: guideProfile.bio || '',
        experience: guideProfile.experience || 0,
        languages: guideProfile.languages || [],
        expertise: guideProfile.expertise || [],
        serviceAreas: guideProfile.serviceAreas || [],
        rates: guideProfile.rates || { hourly: 0, daily: 0 },
        isVerified: guideProfile.isVerified || false,
        verificationStatus: guideProfile.verificationStatus || 'unsubmitted',
      };
    }
    
    // Add vehicle owner profile if exists
    if (vehicleOwnerProfile) {
      responseData.vehicleOwner = {
        licenseNumber: vehicleOwnerProfile.nic || '',
        businessName: vehicleOwnerProfile.businessName || '',
        businessRegistrationNumber: vehicleOwnerProfile.businessRegistrationNumber || '',
        address: vehicleOwnerProfile.address || {},
        serviceAreas: vehicleOwnerProfile.operatingAreas || [],
        bio: vehicleOwnerProfile.bio || '',
        isVerified: vehicleOwnerProfile.isVerified || false,
        verificationStatus: vehicleOwnerProfile.verificationStatus || 'unsubmitted',
      };
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: responseData
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
    });
  }
};

/**
 * @desc    Verify if a token is valid
 * @route   GET /api/auth/verify-token
 * @access  Private
 */
exports.verifyToken = async (req, res) => {
  try {
    // If the request reaches here through the auth middleware, token is valid
    const user = req.user;
    
    // Return minimal information for verification purposes
    res.status(200).json({
      status: 'success',
      data: {
        valid: true,
        userId: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error verifying token'
    });
  }
};

/**
 * @desc    Get auth status
 * @route   GET /api/auth/status
 * @access  Public
 */
exports.getAuthStatus = async (req, res) => {
  try {
    // Check if auth middleware populated req.user
    const isAuthenticated = !!req.user;
    
    res.status(200).json({
      status: 'success',
      data: {
        isAuthenticated,
        user: isAuthenticated ? {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role
        } : null
      }
    });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error checking auth status'
    });
  }
};