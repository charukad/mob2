const mongoose = require('mongoose');

const GuideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      index: true, // Add index for email-based lookups
    },
    nic: {
      // National Identity Card
      type: String,
      trim: true,
    },
    licenseNumber: {
      // Guide license number
      type: String,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
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
    expertise: [String], // E.g., ['wildlife', 'history', 'cultural']
    languages: [String], // Languages spoken
    experience: {
      type: Number, // Years of experience
      default: 0,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters'],
    },
    portfolio: [
      {
        title: String,
        description: String,
        imageUrl: String,
      },
    ],
    serviceAreas: [String], // Regions/cities where guide operates
    rates: {
      hourly: Number,
      daily: Number,
      currency: {
        type: String,
        default: 'LKR', // Sri Lankan Rupee
      },
    },
    availability: {
      // Days of week available
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: true },
      sunday: { type: Boolean, default: true },
      // Specific dates unavailable
      unavailableDates: [Date],
    },
    averageRating: {
      type: Number,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot be more than 5'],
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

// Virtual populate with reviews
GuideSchema.virtual('reviews', {
  ref: 'Review',
  localField: 'userId',
  foreignField: 'guideId',
  justOne: false,
});

// Virtual populate with bookings
GuideSchema.virtual('bookings', {
  ref: 'GuideBooking',
  localField: 'userId',
  foreignField: 'guideId',
  justOne: false,
});

module.exports = mongoose.model('Guide', GuideSchema);