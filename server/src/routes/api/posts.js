const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');

// Controllers
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  savePost,
  getComments,
  createComment,
  deleteComment,
  likeComment
} = require('../../controllers/posts');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../../../uploads/'));
  },
  filename: function(req, file, cb) {
    cb(null, `post-${Date.now()}-${file.originalname}`);
  }
});

// File filter to only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Routes
// @route   GET /api/posts
// @desc    Get all posts
// @access  Public
router.get('/', getPosts);

// @route   GET /api/posts/:id
// @desc    Get single post
// @access  Public
router.get('/:id', getPostById);

// @route   POST /api/posts
// @desc    Create a post
// @access  Private
router.post('/', protect, upload.array('images', 10), createPost);

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put('/:id', protect, upload.array('images', 10), updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, deletePost);

// @route   POST /api/posts/:id/like
// @desc    Like a post
// @access  Private
router.post('/:id/like', protect, likePost);

// @route   POST /api/posts/:id/save
// @desc    Save a post
// @access  Private
router.post('/:id/save', protect, savePost);

// Comments Routes
// @route   GET /api/posts/:id/comments
// @desc    Get comments for a post
// @access  Public
router.get('/:id/comments', getComments);

// @route   POST /api/posts/:id/comments
// @desc    Create a comment
// @access  Private
router.post('/:id/comments', protect, createComment);

// @route   DELETE /api/posts/:postId/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/:postId/comments/:commentId', protect, deleteComment);

// @route   POST /api/posts/:postId/comments/:commentId/like
// @desc    Like a comment
// @access  Private
router.post('/:postId/comments/:commentId/like', protect, likeComment);

module.exports = router; 