const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AlertSubscriptionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  alertTypes: [{
    type: String,
    enum: ['weather', 'safety', 'traffic', 'health', 'transportation'],
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
AlertSubscriptionSchema.index({ user: 1, location: 1 }, { unique: true });
AlertSubscriptionSchema.index({ location: 1 });

module.exports = mongoose.model('AlertSubscription', AlertSubscriptionSchema);