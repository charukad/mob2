const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    enum: ['guide', 'vehicle', 'location', 'event', 'activity'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  rating: {
    type: Number,
    required: true,
    min: 0.5,
    max: 5
  },
  detailedRatings: {
    type: Map,
    of: Number
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  photos: [{
    type: String
  }],
  anonymous: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  helpfulVotes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  reports: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  response: {
    text: {
      type: String,
      trim: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  status: {
    type: String,
    enum: ['published', 'hidden', 'deleted', 'flagged'],
    default: 'published'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure a user can only review an entity once
ReviewSchema.index({ user: 1, entityType: 1, entityId: 1 }, { unique: true });

// Indexes for frequent queries
ReviewSchema.index({ entityType: 1, entityId: 1, status: 1 });
ReviewSchema.index({ user: 1, status: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);