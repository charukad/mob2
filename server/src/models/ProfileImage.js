const mongoose = require('mongoose');

const ProfileImageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true // Add an index for faster email-based lookups
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// We no longer need the pre-save hook since we're now maintaining only one record per email
// Instead, we'll handle the Cloudinary deletion in the controller

module.exports = mongoose.model('ProfileImage', ProfileImageSchema); 