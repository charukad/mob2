const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewAsHelpful,
  reportReview,
  replyToReview
} = require('../../controllers/reviews');

// Base route: /api/reviews

// User reviews
router.get('/my-reviews', protect, getMyReviews);

// Entity reviews
router.get('/:entityType/:entityId', getReviews);
router.post('/:entityType/:entityId', protect, createReview);

// Individual review actions
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/:id/helpful', protect, markReviewAsHelpful);
router.post('/:id/report', protect, reportReview);
router.post('/:id/reply', protect, replyToReview);

module.exports = router;