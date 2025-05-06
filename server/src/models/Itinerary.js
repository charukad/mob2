const mongoose = require('mongoose');

const ItinerarySchema = new mongoose.Schema(
  {
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Itinerary title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    budget: {
      amount: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    coverImage: {
      type: String, // URL to itinerary cover image
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    collaborators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        permissions: {
          type: String,
          enum: ['view', 'edit'],
          default: 'view',
        },
      },
    ],
    tags: [String],
    totalDistance: {
      type: Number, // In kilometers
      default: 0,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'cancelled'],
      default: 'planning',
    },
    accommodations: [
      {
        name: String,
        location: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: [Number], // [longitude, latitude]
        },
        address: String,
        checkIn: Date,
        checkOut: Date,
        bookingReference: String,
        price: {
          amount: Number,
          currency: {
            type: String,
            default: 'USD',
          },
        },
        notes: String,
      },
    ],
    transportation: [
      {
        type: {
          type: String,
          enum: ['flight', 'train', 'bus', 'ferry', 'car', 'taxi', 'other'],
        },
        from: String,
        to: String,
        departureTime: Date,
        arrivalTime: Date,
        bookingReference: String,
        price: {
          amount: Number,
          currency: {
            type: String,
            default: 'USD',
          },
        },
        notes: String,
      },
    ],
    totalExpenses: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    weatherForecast: [
      {
        date: Date,
        condition: String,
        highTemp: Number,
        lowTemp: Number,
        precipitation: Number,
      },
    ],
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate with itinerary items
ItinerarySchema.virtual('items', {
  ref: 'ItineraryItem',
  localField: '_id',
  foreignField: 'itineraryId',
  options: { sort: { startTime: 1 } },
});

// Calculate duration in days
ItinerarySchema.virtual('durationDays').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  
  // Calculate the difference in milliseconds
  const differenceMs = end - start;
  
  // Convert milliseconds to days and add 1 (inclusive of start and end days)
  return Math.floor(differenceMs / (1000 * 60 * 60 * 24)) + 1;
});

// Calculate days that make up the itinerary
ItinerarySchema.virtual('days').get(function () {
  if (!this.startDate || !this.endDate) return [];
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const days = [];
  
  // Create an array of dates
  const currentDate = new Date(start);
  while (currentDate <= end) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
});

// Method to calculate daily budget
ItinerarySchema.methods.getDailyBudget = function () {
  if (!this.budget || !this.budget.amount || !this.durationDays) return 0;
  return this.budget.amount / this.durationDays;
};

// Pre-save hook to ensure endDate is not before startDate
ItinerarySchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    const error = new Error('End date cannot be before start date');
    return next(error);
  }
  next();
});

module.exports = mongoose.model('Itinerary', ItinerarySchema);