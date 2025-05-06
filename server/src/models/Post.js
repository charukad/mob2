const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  postId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  content: {
    type: String,
    trim: true,
  },
  images: [{
    type: String, // Cloudinary URLs
    required: false
  }],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
  },
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  sharesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Pre-save hook to generate a unique postId if not provided
PostSchema.pre('save', async function(next) {
  if (!this.postId) {
    // Generate a unique ID combining timestamp and random string
    const timestamp = new Date().getTime().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    this.postId = `${timestamp}-${randomStr}`;
  }
  next();
});

module.exports = mongoose.model('Post', PostSchema);
