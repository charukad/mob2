const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

/**
 * Set up message-related socket event handlers
 * @param {object} io - Socket.io server instance
 * @param {object} socket - Socket instance for the connected client
 */
module.exports = (io, socket) => {
  // Join a conversation room
  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.info(`User ${socket.user._id} joined conversation: ${conversationId}`);
  });
  
  // Leave a conversation room
  socket.on('leaveConversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.info(`User ${socket.user._id} left conversation: ${conversationId}`);
  });
  
  // Send a new message
  socket.on('sendMessage', async (data) => {
    try {
      const { conversationId, content } = data;
      console.log(`[Socket] User ${socket.user._id} sending message to conversation ${conversationId}: ${content}`);
      
      // For development, we'll just echo the message back without saving to DB
      const mockMessage = {
        _id: `msg_${Date.now()}`,
        conversationId,
        senderId: socket.user._id,
        content,
        createdAt: new Date(),
        isRead: false
      };
      
      // Broadcast the message to all users in the conversation
      io.to(`conversation:${conversationId}`).emit('newMessage', mockMessage);
      
      // Also emit to sender's room for confirmation
      socket.emit('messageSent', { 
        success: true, 
        messageId: mockMessage._id,
        conversationId
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('messageError', 'Error sending message');
    }
  });
  
  // Mark messages as read
  socket.on('markMessagesRead', async (conversationId) => {
    try {
      console.log(`[Socket] User ${socket.user._id} marking messages as read in conversation ${conversationId}`);
      
      // Notify other participants
      io.to(`conversation:${conversationId}`).emit('messagesRead', {
        conversationId,
        userId: socket.user._id,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });
  
  // User is typing notification
  socket.on('typing', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('userTyping', {
      conversationId,
      userId: socket.user._id,
    });
  });
  
  // User stopped typing notification
  socket.on('stopTyping', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('userStoppedTyping', {
      conversationId,
      userId: socket.user._id,
    });
  });
};