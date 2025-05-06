const mongoose = require('mongoose');

const ItineraryItemSchema = new mongoose.Schema(
  {
    itineraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Itinerary',
      required: true,
    },
    type: {
      type: String,
      enum: ['activity', 'transport', 'accommodation', 'meal', 'rest', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    day: {
      type: Number, // Day index of the trip (1-based)
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // In minutes
      min: 0,
    },
    location: {
      locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
      },
      name: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: [Number], // [longitude, latitude]
      },
      address: String,
    },
    cost: {
      amount: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    bookingInfo: {
      isBooked: {
        type: Boolean,
        default: false,
      },
      bookingReference: String,
      bookingDate: Date,
      bookingNotes: String,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    photos: [String], // Array of photo URLs
    notes: String,
    // For transport type
    transport: {
      method: {
        type: String,
        enum: ['walk', 'car', 'bus', 'train', 'taxi', 'flight', 'ferry', 'bicycle', 'other'],
      },
      from: {
        name: String,
        coordinates: [Number], // [longitude, latitude]
      },
      to: {
        name: String,
        coordinates: [Number], // [longitude, latitude]
      },
      distance: Number, // In kilometers
      duration: Number, // In minutes
      route: {
        // GeoJSON LineString for route visualization
        type: {
          type: String,
          enum: ['LineString'],
          default: 'LineString',
        },
        coordinates: [[Number]], // Array of [longitude, latitude] points
      },
    },
    // For accommodation type
    accommodation: {
      checkIn: Date,
      checkOut: Date,
      propertyType: {
        type: String,
        enum: ['hotel', 'hostel', 'apartment', 'guesthouse', 'resort', 'villa', 'campsite', 'other'],
      },
    },
    // For meal type
    meal: {
      mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'],
      },
      cuisine: String,
    },
    // Weather forecast for this time
    weather: {
      condition: String,
      temperature: Number,
      precipitation: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate duration
ItineraryItemSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    const startTime = new Date(this.startTime);
    const endTime = new Date(this.endTime);
    
    // Calculate duration in minutes
    const durationMs = endTime - startTime;
    this.duration = Math.round(durationMs / 60000); // Convert ms to minutes
  }
  
  next();
});

// Pre-save hook to ensure endTime is not before startTime
ItineraryItemSchema.pre('save', function (next) {
  if (this.endTime < this.startTime) {
    const error = new Error('End time cannot be before start time');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('ItineraryItem', ItineraryItemSchema);