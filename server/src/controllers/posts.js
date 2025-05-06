const Post = require('../models/Post');
const Interaction = require('../models/Interaction');
const cloudinaryService = require('../services/cloudinary');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
 * Create a new post
 * @route POST /api/posts
 */
exports.createPost = async (req, res) => {
  try {
    // Get post data from request body
    const { content, location } = req.body;
    const userId = req.user.id; // Assuming auth middleware adds user to req

    // Validate required fields
    if (!content && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Post must contain content or at least one image' 
      });
    }

    // Initialize post data
    const postData = {
      content,
      user: userId,
      images: []
    };

    // Parse location if provided
    if (location) {
      try {
        postData.location = JSON.parse(location);
      } catch (error) {
        console.error('Error parsing location data:', error);
      }
    }

    // Handle image uploads if any
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} images for upload`);
      
      // Get temporary file paths
      const filePaths = req.files.map(file => file.path);
      
      // Upload images to Cloudinary
      const uploadResults = await cloudinaryService.uploadMultipleFiles(
        filePaths, 
        'sri-lanka-tourism/posts'
      );
      
      // Save image URLs to post data
      postData.images = uploadResults.map(result => result.secure_url);
      
      console.log(`Successfully uploaded ${postData.images.length} images`);
    }

    // Create post in database
    const post = new Post(postData);
    
    // Generate a unique postId
    const timestamp = new Date().getTime().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    post.postId = `${timestamp}-${randomStr}`;
    
    await post.save();

    // Populate user data
    await post.populate({
      path: 'user',
      select: 'firstName lastName email profileImage'
    });

    // Format user data before sending response
    const responsePost = post.toObject();
    responsePost.user = {
      ...responsePost.user,
      name: `${responsePost.user.firstName} ${responsePost.user.lastName}`,
      profileImage: responsePost.user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(responsePost.user.firstName)}+${encodeURIComponent(responsePost.user.lastName)}&background=random`
    };

    res.status(201).json({
      success: true,
      data: responsePost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
};

/**
 * Get all posts with pagination
 * @route GET /api/posts
 */
exports.getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, filter = 'all' } = req.query;
    const userId = req.user ? req.user.id : null;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query based on filter
    let query = {};
    
    // Create aggregation pipeline for complex queries
    const aggregationPipeline = [
      // Look up user details
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      // Unwind the user array (convert from array to object)
      {
        $unwind: '$userDetails'
      },
      // Project the fields we want to return
      {
        $project: {
          _id: 1,
          content: 1,
          images: 1,
          location: 1,
          likesCount: 1,
          commentsCount: 1,
          sharesCount: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: '$userDetails._id',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            name: { $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'] },
            email: '$userDetails.email',
            profileImage: { 
              $cond: { 
                if: { $or: [{ $eq: ['$userDetails.profileImage', ''] }, { $eq: ['$userDetails.profileImage', null] }] }, 
                then: { $concat: ['https://ui-avatars.com/api/?name=', '$userDetails.firstName', '+', '$userDetails.lastName', '&background=random'] }, 
                else: '$userDetails.profileImage' 
              } 
            }
          }
        }
      },
      // Sort by creation date, newest first
      {
        $sort: { createdAt: -1 }
      },
      // Skip and limit for pagination
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      }
    ];

    // Execute the aggregation
    const posts = await Post.aggregate(aggregationPipeline);

    // Check if the current user has liked each post
    if (userId) {
      // Fetch all post likes by this user
      const postIds = posts.map(post => post._id);
      const userLikes = await Interaction.find({
        post: { $in: postIds },
        user: userId,
        type: 'like',
        parent: null // Ensure we're getting post likes, not comment likes
      });

      // Create a set of liked post IDs for quick lookup
      const likedPostIds = new Set(userLikes.map(like => like.post.toString()));

      // Add isLiked property to each post
      posts.forEach(post => {
        post.isLiked = likedPostIds.has(post._id.toString());
      });
    } else {
      // If no user is logged in, mark all posts as not liked
      posts.forEach(post => {
        post.isLiked = false;
      });
    }

    // Count total posts matching the query
    const totalPosts = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total: totalPosts,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalPosts / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

/**
 * Get a single post by ID
 * @route GET /api/posts/:id
 */
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user ? req.user.id : null;

    const post = await Post.findById(postId)
      .populate('user', 'firstName lastName email profileImage');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Format user data before sending response
    const responsePost = post.toObject();
    responsePost.user = {
      ...responsePost.user,
      name: `${responsePost.user.firstName} ${responsePost.user.lastName}`,
      profileImage: responsePost.user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(responsePost.user.firstName)}+${encodeURIComponent(responsePost.user.lastName)}&background=random`
    };

    // Check if the current user has liked this post
    if (userId) {
      const userLiked = await Interaction.findOne({
        post: postId,
        user: userId,
        type: 'like',
        parent: null // Make sure it's a post like, not a comment like
      });
      responsePost.isLiked = !!userLiked;
    } else {
      responsePost.isLiked = false;
    }

    res.status(200).json({
      success: true,
      data: responsePost
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

/**
 * Update a post
 * @route PUT /api/posts/:id
 */
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this post'
      });
    }

    // Update post fields
    if (req.body.content) {
      post.content = req.body.content;
    }

    if (req.body.location) {
      try {
        post.location = JSON.parse(req.body.location);
      } catch (error) {
        console.error('Error parsing location data:', error);
      }
    }

    // Handle image uploads if any
    if (req.files && req.files.length > 0) {
      // Get temporary file paths
      const filePaths = req.files.map(file => file.path);
      
      // Upload images to Cloudinary
      const uploadResults = await cloudinaryService.uploadMultipleFiles(
        filePaths, 
        'sri-lanka-tourism/posts'
      );
      
      // Add new image URLs to post data
      post.images = [...post.images, ...uploadResults.map(result => result.secure_url)];
    }

    // Save updated post
    await post.save();

    // Populate user data
    await post.populate({
      path: 'user',
      select: 'firstName lastName email profileImage'
    });

    // Format user data before sending response
    const responsePost = post.toObject();
    responsePost.user = {
      ...responsePost.user,
      name: `${responsePost.user.firstName} ${responsePost.user.lastName}`,
      profileImage: responsePost.user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(responsePost.user.firstName)}+${encodeURIComponent(responsePost.user.lastName)}&background=random`
    };

    res.status(200).json({
      success: true,
      data: responsePost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
};

/**
 * Delete a post
 * @route DELETE /api/posts/:id
 */
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post or is an admin
    if (post.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post'
      });
    }

    // Delete the post
    await post.remove();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

/**
 * Like/unlike a post
 * @route POST /api/posts/:id/like
 */
exports.likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user already liked this post
    const existingLike = await Interaction.findOne({
      post: postId,
      user: userId,
      type: 'like'
    });

    if (existingLike) {
      // User already liked the post, so unlike it
      await existingLike.remove();
      
      // Decrement like count on the post
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
      
      return res.status(200).json({
        success: true,
        data: { 
          liked: false,
          likesCount: post.likesCount
        }
      });
    } else {
      // User hasn't liked the post yet, so like it
      const newLike = new Interaction({
        post: postId,
        user: userId,
        type: 'like'
      });
      
      await newLike.save();
      
      // Increment like count on the post
      post.likesCount += 1;
      await post.save();
      
      return res.status(200).json({
        success: true,
        data: { 
          liked: true,
          likesCount: post.likesCount
        }
      });
    }
  } catch (error) {
    console.error('Error processing like/unlike:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process like/unlike',
      error: error.message
    });
  }
};

/**
 * Save/unsave a post
 * @route POST /api/posts/:id/save
 */
exports.savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // This would require a separate model for saved posts
    // For simplicity, we'll just return success
    res.status(200).json({
      success: true,
      data: { saved: true }
    });
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save post',
      error: error.message
    });
  }
};

/**
 * Get all comments for a post
 * @route GET /api/posts/:id/comments
 */
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user ? req.user.id : null;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Create aggregation pipeline to get comments with user details
    const comments = await Interaction.aggregate([
      // Match only comments for this post
      {
        $match: {
          post: new mongoose.Types.ObjectId(postId),
          type: 'comment'
        }
      },
      // Look up user details
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      // Unwind the user array
      {
        $unwind: '$userDetails'
      },
      // Project the fields we want
      {
        $project: {
          _id: 1,
          content: 1,
          createdAt: 1,
          likesCount: 1,
          user: {
            _id: '$userDetails._id',
            name: { $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'] },
            email: '$userDetails.email',
            profileImage: { 
              $cond: { 
                if: { $or: [{ $eq: ['$userDetails.profileImage', ''] }, { $eq: ['$userDetails.profileImage', null] }] }, 
                then: { $concat: ['https://ui-avatars.com/api/?name=', '$userDetails.firstName', '+', '$userDetails.lastName', '&background=random'] }, 
                else: '$userDetails.profileImage' 
              } 
            }
          }
        }
      },
      // Sort by date (newest first)
      {
        $sort: { createdAt: -1 }
      },
      // Pagination
      {
        $skip: skip
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Check if the current user has liked each comment
    if (userId) {
      // Fetch all comment likes by this user for these comments
      const commentIds = comments.map(comment => comment._id);
      const userLikes = await Interaction.find({
        parent: { $in: commentIds },
        user: userId,
        type: 'like'
      });

      // Create a set of liked comment IDs for quick lookup
      const likedCommentIds = new Set(userLikes.map(like => like.parent.toString()));

      // Add isLiked property to each comment
      comments.forEach(comment => {
        comment.isLiked = likedCommentIds.has(comment._id.toString());
      });
    } else {
      // If no user is logged in, mark all comments as not liked
      comments.forEach(comment => {
        comment.isLiked = false;
      });
    }

    // Count total comments
    const total = await Interaction.countDocuments({
      post: postId,
      type: 'comment'
    });

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

/**
 * Create a comment
 * @route POST /api/posts/:id/comments
 */
exports.createComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;

    console.log('Create Comment Request:', {
      postId,
      userId,
      content,
      requestBody: req.body,
    });

    // Validate content
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Create the comment
    const comment = new Interaction({
      post: postId,
      user: userId,
      type: 'comment',
      content: content.trim()
    });
    
    // Save the comment
    await comment.save();

    // Increment comment count on the post
    post.commentsCount += 1;
    await post.save();

    // Populate user data for the response
    await comment.populate({
      path: 'user',
      select: 'firstName lastName email profileImage'
    });

    // Format user data before sending response
    const responseComment = comment.toObject();
    responseComment.user = {
      ...responseComment.user,
      name: `${responseComment.user.firstName} ${responseComment.user.lastName}`,
      profileImage: responseComment.user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(responseComment.user.firstName)}+${encodeURIComponent(responseComment.user.lastName)}&background=random`
    };

    // Add isLiked property for consistency with other comment responses
    responseComment.isLiked = false;

    // Return a well-formed response
    return res.status(201).json({
      success: true,
      data: responseComment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: error.message
    });
  }
};

/**
 * Delete a comment
 * @route DELETE /api/posts/:postId/comments/:commentId
 */
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    // Find the comment
    const comment = await Interaction.findOne({
      _id: commentId,
      post: postId,
      type: 'comment'
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check authorization (comment author or admin)
    if (comment.user.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Delete the comment
    await comment.remove();

    // Decrement comment count on the post
    const post = await Post.findById(postId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};

/**
 * Like/unlike a comment
 * @route POST /api/posts/:postId/comments/:commentId/like
 */
exports.likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user.id;

    // Find the comment
    const comment = await Interaction.findOne({
      _id: commentId,
      post: postId,
      type: 'comment'
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user already liked this comment
    const existingLike = await Interaction.findOne({
      parent: commentId,
      user: userId,
      type: 'like'
    });

    if (existingLike) {
      // User already liked the comment, so unlike it
      await existingLike.remove();
      
      // Decrement like count on the comment
      comment.likesCount = Math.max(0, comment.likesCount - 1);
      await comment.save();
      
      return res.status(200).json({
        success: true,
        data: { 
          liked: false,
          likesCount: comment.likesCount
        }
      });
    } else {
      // User hasn't liked the comment yet, so like it
      const newLike = new Interaction({
        post: postId,
        user: userId,
        type: 'like',
        parent: commentId
      });
      
      await newLike.save();
      
      // Increment like count on the comment
      comment.likesCount += 1;
      await comment.save();
      
      return res.status(200).json({
        success: true,
        data: { 
          liked: true,
          likesCount: comment.likesCount
        }
      });
    }
  } catch (error) {
    console.error('Error processing comment like/unlike:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process comment like/unlike',
      error: error.message
    });
  }
}; 