const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Location description is required'],
    },
    shortDescription: {
      type: String,
      maxlength: [200, 'Short description cannot be more than 200 characters'],
    },
    type: {
      type: String,
      required: [true, 'Location type is required'],
      enum: [
        'beach',
        'mountain',
        'temple',
        'historical',
        'museum',
        'park',
        'wildlife',
        'waterfall',
        'viewpoint',
        'hotel',
        'restaurant',
        'shopping',
        'entertainment',
        'other'
      ],
    },
    category: {
      type: String,
      enum: [
        'nature',
        'culture',
        'adventure',
        'relaxation',
        'food',
        'accommodation',
        'shopping',
        'entertainment',
        'other'
      ],
      required: [true, 'Location category is required'],
    },
    tags: [String],
    address: {
      street: String,
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: String,
      postalCode: String,
      country: {
        type: String,
        default: 'Sri Lanka',
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates are required'],
      },
      elevation: Number, // In meters
    },
    images: [
      {
        url: String,
        caption: String,
        isMain: {
          type: Boolean,
          default: false,
        },
      },
    ],
    panoramicImages: [
      {
        url: String,
        caption: String,
      },
    ],
    openingHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        open: String,
        close: String,
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        open: String,
        close: String,
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        open: String,
        close: String,
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        open: String,
        close: String,
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        open: String,
        close: String,
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        open: String,
        close: String,
      },
      sunday: {
        isOpen: { type: Boolean, default: true },
        open: String,
        close: String,
      },
      notes: String,
    },
    contactInfo: {
      phone: String,
      email: String,
      website: String,
    },
    entranceFee: {
      localPrice: Number,
      foreignerPrice: Number,
      currency: {
        type: String,
        default: 'LKR',
      },
      notes: String,
    },
    estimatedTimeToVisit: {
      min: Number, // In minutes
      max: Number, // In minutes
    },
    bestTimeToVisit: {
      seasons: [
        {
          type: String,
          enum: ['spring', 'summer', 'autumn', 'winter', 'rainy', 'dry'],
        },
      ],
      months: [
        {
          type: String,
          enum: [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december',
          ],
        },
      ],
      timeOfDay: [
        {
          type: String,
          enum: ['morning', 'afternoon', 'evening', 'night'],
        },
      ],
      notes: String,
    },
    accessibility: {
      wheelchairAccessible: Boolean,
      publicTransportAccess: Boolean,
      roadConditions: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      notes: String,
    },
    facilities: [
      {
        type: String,
        enum: [
          'parking',
          'restrooms',
          'food',
          'drinkingWater',
          'shops',
          'guides',
          'firstAid',
          'wifi',
        ],
      },
    ],
    culturalSignificance: String,
    historicalInfo: String,
    naturalFeatures: String,
    activities: [String],
    nearbyAttractions: [
      {
        name: String,
        distance: Number, // In kilometers
        locationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Location',
        },
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    averageRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    visitsCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add geospatial index for location-based queries
LocationSchema.index({ location: '2dsphere' });

// Add text index for search functionality
LocationSchema.index(
  {
    name: 'text',
    description: 'text',
    'address.city': 'text',
    tags: 'text',
  },
  {
    weights: {
      name: 10,
      tags: 5,
      'address.city': 3,
      description: 1,
    },
  }
);

// Virtual populate with reviews
LocationSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'locationId',
  justOne: false,
});

// Method to get main image
LocationSchema.methods.getMainImage = function () {
  const mainImage = this.images.find((img) => img.isMain);
  if (mainImage) {
    return mainImage.url;
  } else if (this.images.length > 0) {
    return this.images[0].url;
  }
  return null;
};

// Update the timestamp before saving
LocationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Location', LocationSchema);