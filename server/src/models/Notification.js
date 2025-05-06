const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['booking', 'message', 'review', 'like', 'comment', 'itinerary', 'system', 'payment', 'guide', 'vehicle', 'follow', 'event'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  senderAvatar: {
    type: String
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedModel: {
    type: String,
    enum: ['Booking', 'Message', 'Review', 'Post', 'Comment', 'Itinerary', 'Guide', 'Vehicle', 'Event', null]
  },
  relatedId: {
    type: Schema.Types.ObjectId
  },
  navigationRoute: {
    type: String
  },
  navigationParams: {
    type: Object
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
NotificationSchema.index({ user: 1, timestamp: -1 });
NotificationSchema.index({ user: 1, read: 1 });
NotificationSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);