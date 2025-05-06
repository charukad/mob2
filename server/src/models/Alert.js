const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AlertSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['weather', 'safety', 'traffic', 'health', 'transportation'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  location: {
    type: String
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  affectedAreas: {
    type: String
  },
  recommendations: {
    type: String
  },
  source: {
    type: String
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  condition: {
    type: String
  },
  actionable: {
    type: Boolean,
    default: false
  },
  actionRoute: {
    type: String
  },
  actionParams: {
    type: Object
  },
  actionText: {
    type: String
  },
  // For weather-specific alerts
  weatherData: {
    type: Object
  },
  // For areas affected
  affectedLocations: [{
    type: Schema.Types.ObjectId,
    ref: 'Location'
  }],
  // For tracking alert dismissals by users
  dismissedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  // For tracking which users should see this alert
  targetUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  active: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
AlertSchema.index({ type: 1, active: 1 });
AlertSchema.index({ affectedLocations: 1 });
AlertSchema.index({ expiresAt: 1 });
AlertSchema.index({ 
  location: 'text', 
  title: 'text', 
  description: 'text' 
});

module.exports = mongoose.model('Alert', AlertSchema);