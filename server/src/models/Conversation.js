const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  title: {
    type: String,
    // For group conversations
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // For tracking when users leave group conversations
  // but conversation history should remain
  activeParticipants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
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

// Create indexes for participants to quickly find conversations
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);