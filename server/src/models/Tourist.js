const mongoose = require('mongoose');

const TouristSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    nationality: {
      type: String,
      trim: true,
    },
    passportNumber: {
      type: String,
      trim: true,
    },
    preferences: {
      interests: [String], // E.g., ['beaches', 'wildlife', 'culture']
      accommodationType: [String], // E.g., ['hotel', 'hostel', 'resort']
      budgetRange: {
        type: String,
        enum: ['budget', 'moderate', 'luxury'],
      },
      travelStyle: [String], // E.g., ['adventure', 'relaxation', 'cultural']
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phoneNumber: String,
    },
    visitHistory: [
      {
        startDate: Date,
        endDate: Date,
        purpose: String,
      },
    ],
    // Virtual field: itineraries will be populated from Itinerary model
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate with itineraries
TouristSchema.virtual('itineraries', {
  ref: 'Itinerary',
  localField: 'userId',
  foreignField: 'touristId',
  justOne: false,
});

module.exports = mongoose.model('Tourist', TouristSchema);