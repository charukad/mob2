const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerEmail: {
      type: String,
      trim: true,
      index: true, // Add index for faster queries by email
    },
    type: {
      type: String,
      enum: ['car', 'van', 'suv', 'bus', 'motorcycle', 'tuk-tuk', 'bicycle', 'other'],
      required: [true, 'Vehicle type is required'],
    },
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Vehicle year is required'],
    },
    registrationNumber: {
      type: String,
      required: [true, 'Vehicle registration number is required'],
      trim: true,
      unique: true,
    },
    capacity: {
      passengers: {
        type: Number,
        required: [true, 'Passenger capacity is required'],
        min: [1, 'Passenger capacity must be at least 1'],
      },
      luggage: {
        type: String,
        trim: true,
      },
    },
    features: [String], // ['AC', 'WiFi', 'GPS', etc.]
    description: {
      type: String,
      trim: true,
    },
    photos: [String], // Array of photo URLs
    isAvailable: {
      type: Boolean,
      default: true,
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
    rates: {
      hourly: Number,
      daily: Number,
      weekly: Number,
      currency: {
        type: String,
        default: 'LKR', // Sri Lankan Rupee
      },
    },
    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      unavailableDates: [Date],
    },
    includesDriver: {
      type: Boolean,
      default: true,
    },
    driverDetails: {
      name: String,
      licenseNumber: String,
      experience: Number, // Years of experience
      languages: [String],
      photo: String, // URL to driver's photo
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0], // [longitude, latitude]
      },
      address: {
        city: String,
        state: String,
      },
    },
    maintenanceStatus: {
      lastService: Date,
      nextService: Date,
      condition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'needs maintenance'],
        default: 'good',
      },
    },
    averageRating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
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

// Add geospatial index for location-based queries
VehicleSchema.index({ location: '2dsphere' });

// Virtual populate with reviews
VehicleSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'vehicleId',
  justOne: false,
});

// Virtual populate with bookings
VehicleSchema.virtual('bookings', {
  ref: 'VehicleBooking',
  localField: '_id',
  foreignField: 'vehicleId',
  justOne: false,
});

module.exports = mongoose.model('Vehicle', VehicleSchema);