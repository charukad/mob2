const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Message controller
const messageController = {
  // Get all conversations for the current user
  getConversations: async (req, res) => {
    try {
      console.log('User requested conversations');
      
      // Find all conversations that the current user is a part of
      const conversations = await Conversation.find({
        participants: { $in: [req.user.id] }
      })
      .populate({
        path: 'participants',
        select: 'firstName lastName profileImage email'
      })
      .populate({
        path: 'lastMessage',
        select: 'content createdAt isRead senderId'
      })
      .sort({ updatedAt: -1 });
      
      console.log(`Found ${conversations.length} conversations for user ${req.user.id}`);
      
      return res.status(200).json({
        status: 'success',
        data: {
          conversations
        }
      });
    } catch (error) {
      console.error('Error in getConversations:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve conversations'
      });
    }
  },
  
  // Get messages for a specific conversation
  getMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      // Check if conversationId is valid
      if (!conversationId || conversationId === 'undefined') {
        console.log(`Invalid conversation ID received: ${conversationId}`);
        return res.status(400).json({
          status: 'error',
          message: 'Valid conversation ID is required'
        });
      }
      
      // Verify this user is part of the conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          status: 'error',
          message: 'Conversation not found'
        });
      }
      
      // Check if user is participant
      if (!conversation.participants.includes(req.user.id)) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to view this conversation'
        });
      }
      
      console.log(`User ${req.user.id} requested messages for conversation: ${conversationId}`);
      
      // Get messages for the conversation
      const messages = await Message.find({ conversationId })
        .populate({
          path: 'senderId',
          select: 'firstName lastName profileImage'
        })
        .sort({ createdAt: 1 });
      
      console.log(`Retrieved ${messages.length} messages for conversation ${conversationId}`);
      
      // Also mark messages as read
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: req.user.id },
          isRead: false
        },
        { isRead: true }
      );
      
      return res.status(200).json({
        status: 'success',
        data: {
          messages
        }
      });
    } catch (error) {
      console.error('Error in getMessages:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve messages'
      });
    }
  },
  
  // Send a new message
  sendMessage: async (req, res) => {
    try {
      const { recipientId, text, conversationId, vehicleId } = req.body;
      
      if (!recipientId && !conversationId) {
        return res.status(400).json({
          status: 'error',
          message: 'Either recipientId or conversationId is required'
        });
      }
      
      if (!text) {
        return res.status(400).json({
          status: 'error',
          message: 'Message text is required'
        });
      }
      
      let conversation;
      
      // If conversationId is provided, verify it exists and user is participant
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
          return res.status(404).json({
            status: 'error',
            message: 'Conversation not found'
          });
        }
        
        if (!conversation.participants.includes(req.user.id)) {
          return res.status(403).json({
            status: 'error',
            message: 'You are not authorized to send messages to this conversation'
          });
        }
      } 
      // If no conversationId but recipientId, create or get conversation
      else if (recipientId) {
        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return res.status(404).json({
            status: 'error',
            message: 'Recipient not found'
          });
        }
        
        // Check for existing conversation between these users
        conversation = await Conversation.findOne({
          participants: { $all: [req.user.id, recipientId] },
          isGroup: false
        });
        
        // Create new conversation if doesn't exist
        if (!conversation) {
          conversation = new Conversation({
            participants: [req.user.id, recipientId],
            createdBy: req.user.id,
            activeParticipants: [req.user.id, recipientId],
            isGroup: false
          });
          
          await conversation.save();
          console.log(`Created new conversation ${conversation._id} between ${req.user.id} and ${recipientId}`);
        }
      }
      
      // Create and save the message
      const message = new Message({
        conversationId: conversation._id,
        senderId: req.user.id,
        content: text,
        isRead: false
      });
      
      await message.save();
      console.log(`Saved new message ${message._id} to conversation ${conversation._id}`);
      
      // Update conversation's last message
      conversation.lastMessage = message._id;
      conversation.updatedAt = Date.now();
      if (vehicleId) {
        conversation.vehicleId = vehicleId;
      }
      await conversation.save();
      
      // Populate sender info
      const populatedMessage = await Message.findById(message._id).populate({
        path: 'senderId',
        select: 'firstName lastName profileImage'
      });
      
      // Emit socket event if needed
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation:${conversation._id}`).emit('newMessage', populatedMessage);
        
        // Notify other participants
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== req.user.id.toString()) {
            io.to(participantId.toString()).emit('messageNotification', {
              messageId: message._id,
              conversationId: conversation._id,
              senderId: req.user.id,
              senderName: `${req.user.firstName} ${req.user.lastName}`,
              content: text.substring(0, 50) + (text.length > 50 ? '...' : '')
            });
          }
        });
      }
      
      return res.status(201).json({
        status: 'success',
        data: {
          message: populatedMessage,
          conversation: {
            _id: conversation._id,
            participants: conversation.participants
          }
        }
      });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send message'
      });
    }
  },
  
  // Mark messages as read
  markAsRead: async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      // Verify conversation exists and user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          status: 'error',
          message: 'Conversation not found'
        });
      }
      
      if (!conversation.participants.includes(req.user.id)) {
        return res.status(403).json({
          status: 'error',
          message: 'You are not authorized to access this conversation'
        });
      }
      
      // Update all unread messages from others to read
      const result = await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: req.user.id },
          isRead: false
        },
        { isRead: true }
      );
      
      console.log(`Marked ${result.modifiedCount} messages as read in conversation ${conversationId}`);
      
      // Emit socket event if needed
      const io = req.app.get('io');
      if (io) {
        io.to(`conversation:${conversationId}`).emit('messagesRead', {
          conversationId,
          userId: req.user.id
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          markedCount: result.modifiedCount
        }
      });
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to mark messages as read'
      });
    }
  },
  
  // Create or get a conversation with a user
  getOrCreateConversation: async (req, res) => {
    try {
      const { recipientId, vehicleId } = req.body;
      
      if (!recipientId) {
        return res.status(400).json({
          status: 'error',
          message: 'Recipient ID is required'
        });
      }
      
      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({
          status: 'error',
          message: 'Recipient not found'
        });
      }
      
      // Check for existing conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [req.user.id, recipientId] },
        isGroup: false
      });
      
      // Create new conversation if doesn't exist
      if (!conversation) {
        conversation = new Conversation({
          participants: [req.user.id, recipientId],
          createdBy: req.user.id,
          activeParticipants: [req.user.id, recipientId],
          isGroup: false
        });
        
        if (vehicleId) {
          conversation.vehicleId = vehicleId;
        }
        
        await conversation.save();
        console.log(`Created new conversation ${conversation._id} between ${req.user.id} and ${recipientId}`);
      }
      
      // Populate participant details
      const populatedConversation = await Conversation.findById(conversation._id)
        .populate({
          path: 'participants',
          select: 'firstName lastName profileImage email'
        })
        .populate({
          path: 'lastMessage',
          select: 'content createdAt isRead senderId'
        });
      
      return res.status(200).json({
        status: 'success',
        data: {
          conversation: populatedConversation
        }
      });
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create or get conversation'
      });
    }
  }
};

// All routes require authentication
router.use(protect);

// Conversations routes
router.get('/conversations', messageController.getConversations);
router.get('/conversations/:conversationId', messageController.getMessages);
router.post('/send', messageController.sendMessage);
router.post('/conversations', messageController.getOrCreateConversation);
router.patch('/conversations/:conversationId/read', messageController.markAsRead);

// Endpoint route alias (for better mobile client compatibility)
router.get('/messages/conversations', messageController.getConversations);
router.get('/messages/conversations/:conversationId', messageController.getMessages);
router.post('/messages/send', messageController.sendMessage);
router.post('/messages', messageController.sendMessage);
router.post('/messages/conversations/:conversationId/read', messageController.markAsRead);

module.exports = router; 