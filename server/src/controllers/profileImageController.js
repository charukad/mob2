const cloudinary = require('../config/cloudinary');
const ProfileImage = require('../models/ProfileImage');
const User = require('../models/User');
const errorResponse = require('../utils/errorResponse');

// @desc    Upload profile image
// @route   POST /api/profile/image
// @access  Private
exports.uploadProfileImage = async (req, res) => {
  try {
    // Check if file exists in the request
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please upload an image',
          code: 400
        }
      });
    }

    const file = req.files.image;

    // Validate file type
    if (!file.mimetype.startsWith('image')) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please upload an image file',
          code: 400
        }
      });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Image size should be less than 5MB',
          code: 400
        }
      });
    }

    // Log Cloudinary configuration for debugging
    console.log('Cloudinary Config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: '***' // Don't log the actual secret
    });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'profile_images',
      width: 500,
      height: 500,
      crop: 'fill',
      quality: 'auto',
    });

    console.log('Cloudinary upload result:', {
      public_id: result.public_id,
      secure_url: result.secure_url
    });

    // Check if a record already exists for this user's email
    let profileImage = await ProfileImage.findOne({ email: req.user.email });

    if (profileImage) {
      // If we found an existing record, update it
      console.log('Found existing profile image record for email:', req.user.email);
      
      // If the previous image exists in Cloudinary, delete it
      if (profileImage.cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(profileImage.cloudinaryId);
          console.log('Deleted previous Cloudinary image:', profileImage.cloudinaryId);
        } catch (err) {
          console.error('Error deleting previous Cloudinary image:', err);
          // Continue anyway even if deletion fails
        }
      }
      
      // Update the existing record
      profileImage.cloudinaryId = result.public_id;
      profileImage.imageUrl = result.secure_url;
      profileImage.isActive = true;
      await profileImage.save();
      
      console.log('Updated existing profile image record');
    } else {
      // Create a new profile image record if none exists
      console.log('Creating new profile image record for email:', req.user.email);
      profileImage = await ProfileImage.create({
        userId: req.user.id,
        email: req.user.email,
        cloudinaryId: result.public_id,
        imageUrl: result.secure_url,
        isActive: true,
      });
    }

    // Update user's avatar field
    await User.findByIdAndUpdate(req.user.id, {
      avatar: result.secure_url,
    });

    // Get the updated user to return in the response
    const updatedUser = await User.findById(req.user.id).select('-password');

    res.status(201).json({
      success: true,
      data: {
        profileImage,
        imageUrl: result.secure_url,
        user: updatedUser
      },
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    
    // Check if it's a Cloudinary error
    if (error.http_code) {
      return res.status(error.http_code).json({
        success: false,
        error: {
          message: error.message,
          code: error.http_code,
          details: error
        }
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Error uploading image',
        code: 500,
        details: error
      }
    });
  }
};

// @desc    Get user's profile images
// @route   GET /api/profile/images
// @access  Private
exports.getProfileImages = async (req, res) => {
  try {
    const images = await ProfileImage.find({ userId: req.user.id })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('Get profile images error:', error);
    res.status(500).json(errorResponse('Error fetching images', 500));
  }
};

// @desc    Delete profile image
// @route   DELETE /api/profile/image/:id
// @access  Private
exports.deleteProfileImage = async (req, res) => {
  try {
    const image = await ProfileImage.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!image) {
      return res.status(404).json(errorResponse('Image not found', 404));
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(image.cloudinaryId);

    // Delete from database
    await image.remove();

    // If it was the active image, update user's avatar
    if (image.isActive) {
      const latestImage = await ProfileImage.findOne({ userId: req.user.id })
        .sort('-createdAt');

      await User.findByIdAndUpdate(req.user.id, {
        avatar: latestImage ? latestImage.imageUrl : null,
      });
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json(errorResponse('Error deleting image', 500));
  }
};

/**
 * @desc    Clean up duplicate profile images
 * @route   GET /api/profile/cleanup
 * @access  Admin
 */
exports.cleanupDuplicateImages = async (req, res) => {
  try {
    // Only allow admins to run this
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Unauthorized: Admin access required',
          code: 403
        }
      });
    }

    // Get all emails with profile images
    const emails = await ProfileImage.distinct('email');
    console.log(`Found ${emails.length} unique emails with profile images`);

    let deletedCount = 0;
    let errorCount = 0;

    // For each email, keep only the most recent record
    for (const email of emails) {
      // Get all profile images for this email sorted by creation date (newest first)
      const images = await ProfileImage.find({ email }).sort('-createdAt');
      
      if (images.length > 1) {
        console.log(`Found ${images.length} profile images for email: ${email}`);
        
        // Keep the first one (newest), delete the rest
        const toDelete = images.slice(1);
        
        for (const image of toDelete) {
          try {
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(image.cloudinaryId);
            
            // Delete from database
            await ProfileImage.findByIdAndDelete(image._id);
            
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting image ${image._id}:`, error);
            errorCount++;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Cleanup completed',
        totalEmails: emails.length,
        deletedCount,
        errorCount
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Server error during cleanup',
        code: 500
      }
    });
  }
};

// @desc    Get profile image by email
// @route   GET /api/profile-images/by-email/:email
// @access  Public
exports.getProfileImageByEmail = async (req, res) => {
  try {
    const email = req.params.email;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          code: 400
        }
      });
    }

    // Find the most recent profile image for this email
    const profileImage = await ProfileImage.findOne({ email })
      .sort({ createdAt: -1 });

    if (!profileImage) {
      // Try to find user by email to get their profile image
      const user = await User.findOne({ email }).select('firstName lastName profileImage');
      
      if (user && user.profileImage) {
        return res.status(200).json({
          success: true,
          data: {
            profileImage: user.profileImage
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        error: {
          message: 'No profile image found for this email',
          code: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        profileImage: profileImage.imageUrl
      }
    });
  } catch (error) {
    console.error('Error retrieving profile image by email:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Server error while retrieving profile image',
        code: 500
      }
    });
  }
}; 