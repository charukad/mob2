const mongoose = require('mongoose');

const GuideDetailsSchema = new mongoose.Schema(
  {
    // Email is used as the primary key for lookup
    email: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Professional information
    serviceAreas: {
      type: [String],
      default: []
    },
    languages: {
      type: [String],
      default: []
    },
    expertise: {
      type: [String],
      default: []
    },
    experience: {
      type: Number,
      default: 0
    },
    bio: {
      type: String,
      default: ''
    },
    // Availability and rates
    availability: {
      type: [Date],
      default: []
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    dailyRate: {
      type: Number,
      default: 0
    },
    // Verification status
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationDocuments: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GuideDetails', GuideDetailsSchema); 