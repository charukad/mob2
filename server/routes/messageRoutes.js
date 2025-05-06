const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../src/middleware/auth');

// Development test middleware - inject a test user for development
const testAuthMiddleware = (req, res, next) => {
  // Only use in development mode
  if (process.env.NODE_ENV !== 'production') {
    console.log('Using test auth middleware');
    // Inject a test user
    req.user = {
      _id: '12345',
      id: '12345',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'tourist'
    };
    return next();
  }
  // In production, use the real auth middleware
  return protect(req, res, next);
};

/**
 * All message routes require authentication
 */
router.use(testAuthMiddleware);

/**
 * Get all conversations for the current user
 * GET /api/conversations
 */
router.get('/conversations', messageController.getConversations);

/**
 * Get messages for a specific conversation
 * GET /api/conversations/:conversationId
 */
router.get('/conversations/:conversationId', messageController.getMessages);

/**
 * Send a new message
 * POST /api/send
 * Body: { recipientId, text, conversationId, vehicleId }
 */
router.post('/send', messageController.sendMessage);

/**
 * Mark messages as read
 * PATCH /api/conversations/:conversationId/read
 * Body: { messageIds }
 */
router.patch('/conversations/:conversationId/read', messageController.markMessagesAsRead);

/**
 * Delete a message (soft delete)
 * DELETE /api/messages/:messageId
 */
router.delete('/messages/:messageId', messageController.deleteMessage);

// Endpoint route alias (for better mobile client compatibility)
router.get('/messages/conversations', messageController.getConversations);
router.get('/messages/conversations/:conversationId', messageController.getMessages);
router.post('/messages/send', messageController.sendMessage);
router.post('/messages', messageController.sendMessage);
router.post('/messages/conversations/:conversationId/read', messageController.markMessagesAsRead);

module.exports = router; 