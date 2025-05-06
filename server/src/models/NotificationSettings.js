const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSettingsSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  pushEnabled: {
    type: Boolean,
    default: true
  },
  emailEnabled: {
    type: Boolean,
    default: false
  },
  quietHoursEnabled: {
    type: Boolean,
    default: false
  },
  quietHours: {
    start: {
      type: String,
      default: '22:00'
    },
    end: {
      type: String,
      default: '07:00'
    }
  },
  categories: {
    alerts: {
      weather: {
        type: Boolean,
        default: true
      },
      safety: {
        type: Boolean,
        default: true
      },
      traffic: {
        type: Boolean,
        default: true
      },
      health: {
        type: Boolean,
        default: true
      }
    },
    social: {
      likes: {
        type: Boolean,
        default: true
      },
      comments: {
        type: Boolean,
        default: true
      },
      mentions: {
        type: Boolean,
        default: true
      },
      follows: {
        type: Boolean,
        default: true
      }
    },
    bookings: {
      confirmations: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: true
      },
      changes: {
        type: Boolean,
        default: true
      },
      cancellations: {
        type: Boolean,
        default: true
      }
    },
    messages: {
      newMessages: {
        type: Boolean,
        default: true
      },
      groupMessages: {
        type: Boolean,
        default: true
      }
    }
  },
  deviceTokens: [{
    token: {
      type: String
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema);