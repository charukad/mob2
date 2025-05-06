// models/Interaction.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InteractionSchema = new Schema({
  post: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['comment', 'like', 'share'],
    required: true
  },
  content: {
    type: String, // Only used for comments
    required: function() {
      return this.type === 'comment';
    }
  },
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Interaction', // For replies to comments
    default: null
  },
  likesCount: {
    type: Number, // For comment likes
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
InteractionSchema.index({ post: 1, type: 1 });
InteractionSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Interaction', InteractionSchema);