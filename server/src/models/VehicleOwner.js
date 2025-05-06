const mongoose = require('mongoose');

const VehicleOwnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    nic: {
      // National Identity Card
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    businessRegistrationNumber: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['unsubmitted', 'pending', 'approved', 'rejected'],
      default: 'unsubmitted',
    },
    verificationDocuments: [
      {
        type: String, // URL to stored document
        description: String,
      },
    ],
    verificationNotes: {
      type: String, // Admin notes for rejected verification
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Sri Lanka',
      },
    },
    operatingAreas: [String], // Regions/cities where vehicles operate
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters'],
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate with vehicles
VehicleOwnerSchema.virtual('vehicles', {
  ref: 'Vehicle',
  localField: 'userId',
  foreignField: 'ownerId',
  justOne: false,
});

// Virtual populate with reviews
VehicleOwnerSchema.virtual('reviews', {
  ref: 'Review',
  localField: 'userId',
  foreignField: 'vehicleOwnerId',
  justOne: false,
});

module.exports = mongoose.model('VehicleOwner', VehicleOwnerSchema);